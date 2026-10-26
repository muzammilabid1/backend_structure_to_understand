// Creator: Grafana k6 Browser Recorder 1.0.8
// NOTE: this reading is logged using the quick action button
import { sleep, group, check } from 'k6';
import http from 'k6/http';
import {
    randomIntBetween
  } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import * as queries from './queries.js';
import { isGraphqlSuccessful, validateUrlForEnvironment, isHttpSuccessful, selectRandomSlice } from './utils.js';
import {
    getBaseHeaders,
    getPostHeaders,
    getPreflightHeaders,
} from './requestHeaders.js';
import { options } from './options/teacher-add-reading-log-options.js';

export { options }; // k6 needs this




const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
const api = `${baseUrl}/graphql`;

// Validate URL for production environments
validateUrlForEnvironment(baseUrl);

console.log(`Running tests using: ${baseUrl}`);

const dataFolder = 'temp-data';
let testData;
let tempPassword;


if (api.includes('localhost')) {
    testData = JSON.parse(
        open(`../${dataFolder}/teacher-add-reading-log-data-dev.json`),
    );
    tempPassword = testData.password || "password";
} else {
    testData = JSON.parse(
        open(`../${dataFolder}/teacher-add-reading-log-data.json`),
    );
    tempPassword = __ENV.TEST_USER_PASSWORD;
}

testData.bookName = 'To Kill a Mockingbird';
testData.comment = 'This was a wonderful book. The children enjoyed it a lot';


const postHeaders = (authToken) => ({
    ...getBaseHeaders(),
    ...getPostHeaders(authToken),
});

export default function main() {
        // Select user based on VU ID (round-robin distribution)
        const userIndex = (__VU - 1) % testData.length;
        const currentUser = testData[userIndex];

    // Extract user credentials for this VU
    const teacherEmail = currentUser.teacherEmail;
    const teacherPassword = tempPassword;
    const teacherId = currentUser.teacherId;
    const schoolId = currentUser.schoolId;
    const bookName = 'To Kill a Mockingbird';
    const comment = 'This was a wonderful book. The children enjoyed it a lot';


   // TODO: update with previous week date util function
    const readingDate = new Date().toISOString();

    let response;
    let authToken;
    let pupilIds = [];

    group('Teacher Login Flow', function () {
        // PreLogin API call
        response = http.post(
            api,
            JSON.stringify(queries.preLoginQuery(teacherEmail)),
            {
                headers: getPostHeaders(null),
            },
        );
        check(response, isHttpSuccessful(response));
        // Login to get access token
        response = http.post(
            api,
            JSON.stringify(queries.loginQuery(teacherEmail, teacherPassword)),
            {
                headers: getPostHeaders(null),
            },
        );

        try {
            if (response.status === 200 &&
                response.json().data?.login?.accessToken
            ) {
                authToken = response.json().data.login.accessToken;
            }
        } catch (e) {
            const errorMsg = `Login failed: ${response.status} - ${response.body}`;
            throw new Error(errorMsg);
        }

        check(response, isGraphqlSuccessful(response));


        sleep(randomIntBetween(1, 5));
    });

    group('Initial API Calls', function () {
        // CORS preflight
        response = http.options(api, null, {
            headers: getPreflightHeaders(api, true),
        });
        check(response, isHttpSuccessful(response));
        // Server uptime
        response = http.post(
            api,
            JSON.stringify(queries.getServerUptimeQuery()),
            {
                headers: getPostHeaders(authToken),
            },
        );
        check(response, isGraphqlSuccessful(response));

        // Get user with admin details
        response = http.post(
            api,
            JSON.stringify(queries.getUserQuery(teacherId)),
            {
                headers: getPostHeaders(authToken),
            },
        );
        check(response, isGraphqlSuccessful(response));
        // School details
        response = http.post(
            api,
            JSON.stringify(queries.getSchoolQuery(schoolId)),
            {
                headers: getPostHeaders(authToken),
            },
        );
        check(response, isGraphqlSuccessful(response));
        // Feature tooltips
        response = http.post(
            api,
            JSON.stringify(queries.getUnseenFeatureTooltipsQuery()),
            {
                headers: getPostHeaders(authToken),
            },
        );
        check(response, isGraphqlSuccessful(response));
        // Ready Teddy classes
        response = http.post(
            api,
            JSON.stringify(queries.getReadyTeddyClassesQuery(schoolId)),
            {
                headers: getPostHeaders(authToken),
            },
        );
        check(response, isGraphqlSuccessful(response));
        // School classes and groups
        response = http.post(
            api,
            JSON.stringify(
                queries.getSchoolClassesAndGroupsQuery(schoolId, true),
            ),
            {
                headers: getPostHeaders(authToken),
            },
        );
        check(response, isGraphqlSuccessful(response));
        sleep(randomIntBetween(1, 5));
    });

    // Navigation to feed page
    group('Feed Page Navigation', function () {

        // Feed-related API calls
        response = http.post(
            api,
            JSON.stringify(queries.getUserQuery(teacherId)),
            {
                headers: getPostHeaders(authToken),
            },
        );
        check(response, isGraphqlSuccessful(response));
        response = http.post(
            api,
            JSON.stringify(
                queries.getClassesForFeedbackFilterQuery(null, teacherId),
            ),
            {
                headers: getPostHeaders(authToken),
            },
        );
        check(response, isGraphqlSuccessful(response));
        // Multiple user detail calls
        response = http.post(
            api,
            JSON.stringify(queries.getUserQuery(teacherId)),
            {
                headers: getPostHeaders(authToken),
            },
        );
        check(response, isGraphqlSuccessful(response));
        // Check for unticked feedbacks
        const feedbackFilter = {
            postedBefore: null,
            postedAfter: null,
            classIds: [],
            activity: 'ALL',
            media: 'ALL',
            sharingPermitted: false,
            bookName: '',
            academicYear: null,
        };
        response = http.post(
            api,
            JSON.stringify(
                queries.haveUnTickedFeedbacksQuery(
                    schoolId,
                    teacherId,
                    feedbackFilter,
                ),
            ),
            {
                headers: getPostHeaders(authToken),
            },
        );
        check(response, isGraphqlSuccessful(response));
        // Get pupil activity feeds
        const feedFilter = {
            ...feedbackFilter,
            showOnlyUntickFeed: false,
        };
        response = http.post(
            api,
            JSON.stringify(
                queries.getPupilActivityFeedsQuery(teacherId, 0, 5, feedFilter),
            ),
            {
                headers: getPostHeaders(authToken),
            },
        );
        check(response, isGraphqlSuccessful(response));

        sleep(randomIntBetween(1, 5));
    });
    // CORS preflight for next page
    group('CORS Preflight', function () {
        response = http.options(api, null, {
            headers: getPreflightHeaders(api, true),
        });
        check(response, isHttpSuccessful(response));
    });
    // Reading log page
    group('Reading Log Page', function () {
        // Get classes and pupils info
        response = http.post(
            api,
            JSON.stringify(
                queries.getClassesAndGroupsInfoOfPupilsQuery(
                    schoolId,
                    true,
                    null,
                ),
            ),
            {
                headers: postHeaders(authToken),
            },
        );

        try {
            if (response.status === 200) {
                const responseData = response.json();
                if (responseData.data?.getClassesAndGroupsInfoOfPupils) {
                    pupilIds = responseData.data.getClassesAndGroupsInfoOfPupils.map(pupil => pupil.id);
                }
            }
        } catch (e) {
            console.error('Failed to extract pupil IDs:', e.message);
        }

        check(response, {
            ...isGraphqlSuccessful(response),
            'pupil ids available': () => {
                return Array.isArray(pupilIds) && pupilIds.length > 0;
            },
        });


        if (!Array.isArray(pupilIds) || pupilIds.length === 0) {
            throw new Error('No pupils available for this teacher - cannot proceed with reading log test');
        }

        // CORS preflight
        response = http.options(api, null, {
            headers: getPreflightHeaders(api, true),
        });
        check(response, isHttpSuccessful(response));


        const selectedPupilIds = selectRandomSlice(pupilIds)

        response = http.post(
            api,
            JSON.stringify(
                queries.getFeedbackForGroupReadingQuery(
                    schoolId,
                    0,
                    5,
                    selectedPupilIds,
                ),
            ),
            {
                headers: postHeaders(authToken),
            },
        );
        check(response, isGraphqlSuccessful(response));
        // Check reading target for single pupil
        response = http.post(
            api,
            JSON.stringify(
                queries.shouldCountTowardsWeeklyReadingTargetQuery(
                    selectedPupilIds,
                    readingDate,
                ),
            ),
            {
                headers: postHeaders(authToken),
            },
        );
        check(response, isGraphqlSuccessful(response));
        // Get recent book logs for each selected pupil
        for (const pupilId of selectedPupilIds) {
            response = http.post(
                api,
                JSON.stringify(
                    queries.getPupilRecentBookLogsQuery(
                        pupilId,
                        '',
                        'SCHOOL_BOOK',
                    ),
                ),
                {
                    headers: postHeaders(authToken),
                },
            );
            check(response, isGraphqlSuccessful(response));
        }
        // Get feedback for both pupils
        response = http.post(
            api,
            JSON.stringify(
                queries.getFeedbackForGroupReadingQuery(
                    schoolId,
                    0,
                    5,
                    selectedPupilIds,
                ),
            ),
            {
                headers: postHeaders(authToken),
            },
        );
        check(response, isGraphqlSuccessful(response));
        // Check reading target for both pupils
        response = http.post(
            api,
            JSON.stringify(
                queries.shouldCountTowardsWeeklyReadingTargetQuery(
                    selectedPupilIds,
                    readingDate,
                ),
            ),
            {
                headers: postHeaders(authToken),
            },
        );
        check(response, isGraphqlSuccessful(response));

        // Multiple CORS preflight requests
        for (let i = 0; i < 3; i++) {
            response = http.options(api, null, {
                headers: getPreflightHeaders(api, true),
            });
            check(response, isHttpSuccessful(response));
        }
        // Version check
        // response = http.get(`http://localhost:3000/api/version`, {
        //     headers: getBaseHeaders(),
        // });
        // check(response, {
        //     'version check successful': (r) => r.status === 200,
        // });
    });
    // Main action: Add reading log
    group('Add Reading Log', function () {
        if (!Array.isArray(pupilIds) || pupilIds.length === 0) {
            throw new Error('Cannot create reading log - no valid pupil IDs available');
        }

        const readingLogInput = {
            pupilIds: pupilIds,
            bookName: bookName,
            userName: null,
            userType: 'TEACHER',
            comment: comment,
            includeInReadingTarget: false,
            privateNote: '',
            isBookFinished: true,
            pageNumber: '',
            bookReadAt: readingDate,
            schoolId: schoolId,
            audio: null,
        };
        response = http.post(
            api,
            JSON.stringify(
                queries.addReadingLogAsGroupMutation(readingLogInput),
            ),
            {
                headers: getPostHeaders(authToken),
            },
        );
        check(response, {
            ...isGraphqlSuccessful(response),
            'reading log created successfully': (r) => {
                try {
                    const data = JSON.parse(r.body);
                    return data.data?.addReadingLogAsGroup?.id !== null;
                } catch (e) {
                    return false;
                }
            },
            'correct book name': (r) => {
                try {
                    const data = JSON.parse(r.body);
                    return (
                        data.data?.addReadingLogAsGroup?.bookName === bookName
                    );
                } catch (e) {
                    return false;
                }
            },
        });
        // CORS preflight
        response = http.options(api, null, {
            headers: getPreflightHeaders(api, true),
        });
        check(response, isHttpSuccessful(response));

        response = http.post(api, JSON.stringify(queries.getUserQuery(teacherId)), {
            headers: getPostHeaders(authToken),
        });
        check(response, isGraphqlSuccessful(response));
    });
    sleep(randomIntBetween(1, 5));
}