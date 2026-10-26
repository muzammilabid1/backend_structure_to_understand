// Creator: Grafana k6 Browser Recorder 1.0.8 - Updated to follow project patterns
import { sleep, group, check } from 'k6';
import http from 'k6/http';
import * as queries from '../add-reading-log-scenario/queries.js';
import jsonpath from 'https://jslib.k6.io/jsonpath/1.0.2/index.js';
import {
    isGraphqlSuccessful,
    validateUrlForEnvironment,
} from '../add-reading-log-scenario/utils.js';
import {
    getBaseHeaders,
    getPostHeaders,
    getPreflightHeaders,
} from '../add-reading-log-scenario/requestHeaders.js';
import {
    randomItem,
    randomIntBetween,
} from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { options } from '../add-reading-log-scenario/options/teacherSchedulingTopic.js';

export { options };

const dataFolder = 'temp-data';

let testData;
let tempPassword;

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
const api = `${baseUrl}/graphql`;

// Validate URL for production environments
validateUrlForEnvironment(baseUrl);

if (baseUrl.includes('localhost')) {
    testData = JSON.parse(
        open(`../${dataFolder}/teacher-topic-scheduling-data-dev.json`),
    );
    tempPassword = testData.password || 'password';
} else {
    testData = JSON.parse(
        open(`../${dataFolder}/teacher-topic-scheduling-data.json`),
    );
    tempPassword = __ENV.TEST_USER_PASSWORD;
}

const postHeaders = (authToken) => ({
    ...getBaseHeaders(),
    ...getPostHeaders(authToken),
});

export default function main() {
    // Select user based on VU ID (round-robin distribution)
    const userIndex = (__VU - 1) % testData.length;
    const currentUser = testData[userIndex];

    // Extract user credentials for this VU
    const userEmail = currentUser.teacherEmail;
    const userPassword = tempPassword;
    const teacherId = currentUser.teacherId.toString();
    const schoolId = currentUser.schoolId.toString();

    let classIds = [];
    let topicIds = [];
    let yearGroupIds = [];
    let subjectIds = [];
    let classId;
    let topicId;

    let response;
    let accessToken;

    group('Teacher Authentication', function () {
        // CORS preflight request
        response = http.options(api, null, {
            headers: getPreflightHeaders(baseUrl),
        });

        check(response, isGraphqlSuccessful('CORS preflight'));

        // Login request to get access token
        response = http.post(
            api,
            JSON.stringify(queries.loginQuery(userEmail, userPassword)),
            {
                headers: postHeaders(null),
            },
        );

        check(response, {
            ...isGraphqlSuccessful(response),
            'login successful': (r) => {
                try {
                    const data = JSON.parse(r.body);
                    return data.data?.login?.accessToken !== undefined;
                } catch (e) {
                    return false;
                }
            },
        });

        // Extract access token
        accessToken = jsonpath.query(
            response.json(),
            '$.data.login.accessToken',
        )[0];

        sleep(randomIntBetween(1, 10));

        return { accessToken };
    });

    // Teacher logs in and this is a firt page to load which has the class list in the sidebar
    group('Get school class and groups', function (data) {
        response = http.post(
            api,
            JSON.stringify(queries.getSchoolClassAndGroupsQuery(schoolId)),
            {
                headers: postHeaders(accessToken),
            },
        );

        const responseData = JSON.parse(response.body);
        classIds = responseData.data.getSchoolClassesAndGroups.map((item) =>
            item.id.toString(),
        );

        // Select a random class now that classIds is populated
        if (classIds && classIds.length) {
            classId = randomItem(classIds);
        }

        check(response, isGraphqlSuccessful(response));

        sleep(randomIntBetween(1, 10));

        return { classIds };
    });

    // Teacher clicks on a class from the sidebar to get the class details
    group(
        `Class Reading Week - ${baseUrl}/class/<classId>/readingweek`,
        function () {
            response = http.post(
                api,
                JSON.stringify(queries.schoolClassQuery(classId)),
                {
                    headers: postHeaders(accessToken),
                },
            );

            check(response, {
                ...isGraphqlSuccessful(response),
                'school class data retrieved': (r) => {
                    try {
                        const data = JSON.parse(r.body);
                        return data.data?.schoolClass?.id === classId;
                    } catch (e) {
                        return false;
                    }
                },
            });

            response = http.post(
                api,
                JSON.stringify(
                    queries.getClassReadingTopicForWeekByWeekQuery(classId),
                ),
                {
                    headers: postHeaders(accessToken),
                },
            );

            check(response, isGraphqlSuccessful(response));
            sleep(randomIntBetween(1, 10));
        },
    );

    // Teacher clicks Schedule on the tabs
    group(`Class Schedule - ${baseUrl}/class/<classId>/schedule`, function () {
        response = http.post(
            api,
            JSON.stringify(queries.schoolClassDetailQuery(classId)),
            {
                headers: postHeaders(accessToken),
            },
        );

        check(response, isGraphqlSuccessful(response));

        response = http.post(
            api,
            JSON.stringify(queries.getClassTopicsQuery(classId)),
            {
                headers: postHeaders(accessToken),
            },
        );

        check(response, isGraphqlSuccessful(response));

        response = http.post(
            api,
            JSON.stringify(
                queries.allYearGroupsWithTopicsQuery(schoolId, classId),
            ),
            {
                headers: postHeaders(accessToken),
            },
        );

        // Extract yeargroup IDs from the response
        try {
            const yearGroupsData = JSON.parse(response.body);
            if (yearGroupsData.data?.allYearGroupsWithTopics) {
                yearGroupIds = yearGroupsData.data.allYearGroupsWithTopics.map(
                    (yg) => yg.id.toString(),
                );
                console.log('EXTRACTED_YEAR_GROUP_IDS', yearGroupIds);
            }
        } catch (e) {
            console.log('Error extracting year group IDs:', e);
            yearGroupIds = [];
        }

        check(response, isGraphqlSuccessful(response));

        console.log('YEAR_GROUP_IDS', yearGroupIds);

        response = http.post(
            api,
            JSON.stringify(
                queries.allTopicDomainsWithTopicsQuery(
                    yearGroupIds,
                    [],
                    schoolId,
                    classId,
                ),
            ),
            {
                headers: postHeaders(accessToken),
            },
        );

        check(response, isGraphqlSuccessful(response));

        response = http.post(
            api,
            JSON.stringify(
                queries.allSubjectsWithTopicsQuery(
                    yearGroupIds,
                    classId,
                    schoolId,
                ),
            ),
            {
                headers: postHeaders(accessToken),
            },
        );

        // Extract subject IDs from the response
        try {
            const subjectsData = JSON.parse(response.body);
            if (subjectsData.data?.allSubjectsWithTopics) {
                subjectIds = subjectsData.data.allSubjectsWithTopics.map(
                    (subject) => subject.id.toString(),
                );
                console.log('EXTRACTED_SUBJECT_IDS', subjectIds);
            }
        } catch (e) {
            console.log('Error extracting subject IDs:', e);
            subjectIds = [];
        }

        check(response, isGraphqlSuccessful(response));

        sleep(randomIntBetween(1, 10));
    });

    group(
        `Topic Library Browse - ${baseUrl}/class/${classId}/schedule?filtered`,
        function () {
            // user normally click the search button to get the topics
            response = http.post(
                api,
                JSON.stringify(
                    queries.allTopicsQuery(
                        {
                            year: yearGroupIds,
                            subjects: subjectIds,
                            domain: [],
                            isHidden: false,
                        },
                        schoolId,
                        classId,
                    ),
                ),
                {
                    headers: postHeaders(accessToken),
                },
            );

            check(response, {
                ...isGraphqlSuccessful(response),
                'topics retrieved': (r) => {
                    try {
                        const data = JSON.parse(r.body);
                        return Array.isArray(data.data?.allTopics);
                    } catch (e) {
                        return false;
                    }
                },
            });

            // Extract topic IDs from the response for potential scheduling
            try {
                const topicsData = JSON.parse(response.body);
                if (topicsData.data?.allTopics) {
                    topicIds = topicsData.data.allTopics.map((topic) =>
                        topic.id.toString(),
                    );
                    console.log(
                        'EXTRACTED_TOPIC_IDS',
                        topicIds.length,
                        'topics available',
                    );

                    // Select a random topic for scheduling
                    if (topicIds.length > 0) {
                        topicId =
                            topicIds[
                                Math.floor(Math.random() * topicIds.length)
                            ];
                        console.log('SELECTED_TOPIC_ID', topicId);
                    }
                }
            } catch (e) {
                console.log('Error extracting topic IDs:', e);
                topicIds = [];
            }

            sleep(randomIntBetween(1, 10));
        },
    );

    // Only schedule a topic if we have topics available
    if (topicId && classId) {
        group(
            `Schedule Topics - Add topic ${topicId} to class ${classId}`,
            function () {
                // Generate future release date (from 1 to 100 days from now)
                const releaseDate = new Date();
                releaseDate.setDate(
                    releaseDate.getDate() + randomIntBetween(1, 100),
                );
                const releaseDateString = releaseDate
                    .toISOString()
                    .split('T')[0];

                sleep(randomIntBetween(1, 10));

                // Add topic to class
                response = http.post(
                    api,
                    JSON.stringify(
                        queries.addClassTopicMutation({
                            releaseDate: releaseDateString,
                            dueDate: null,
                            teacherMessage: 'This would be great fun to learn',
                            createdBy: teacherId,
                            topicId: topicId,
                            classId: classId,
                        }),
                    ),
                    {
                        headers: postHeaders(accessToken),
                    },
                );

                check(response, {
                    ...isGraphqlSuccessful(response),
                    'topic added successfully': (r) => {
                        try {
                            const data = JSON.parse(r.body);
                            return data.data?.addClassTopic?.id !== undefined;
                        } catch (e) {
                            return false;
                        }
                    },
                });

                // Refresh class topics to see the addition
                response = http.post(
                    api,
                    JSON.stringify(queries.getClassTopicsQuery(classId)),
                    {
                        headers: postHeaders(accessToken),
                    },
                );

                check(response, isGraphqlSuccessful(response));

                // Refresh class information
                response = http.post(
                    api,
                    JSON.stringify(queries.schoolClassDetailQuery(classId)),
                    {
                        headers: postHeaders(accessToken),
                    },
                );

                check(response, isGraphqlSuccessful(response));

                sleep(randomIntBetween(1, 10));
            },
        );
    } else {
        console.log(
            'Skipping topic scheduling - no topics available or no class selected',
        );
        sleep(randomIntBetween(1, 10));
    }

    // teachers also add additional topics to the class
    group(`Add Additional Topic - ${topicId} variation`, function () {
        // Try to add another topic if available
        const alternativeTopicId = randomItem(topicIds);

        if (alternativeTopicId && alternativeTopicId !== topicId) {
            const releaseDate = new Date();
            releaseDate.setDate(
                releaseDate.getDate() + randomIntBetween(1, 100),
            );
            const releaseDateString = releaseDate.toISOString().split('T')[0];

            sleep(randomIntBetween(1, 10));

            response = http.post(
                api,
                JSON.stringify(
                    queries.addClassTopicMutation({
                        releaseDate: releaseDateString,
                        dueDate: null,
                        teacherMessage: 'This would be great fun to learn',
                        createdBy: teacherId,
                        topicId: alternativeTopicId,
                        classId: classId,
                    }),
                ),
                {
                    headers: postHeaders(accessToken),
                },
            );

            check(response, {
                ...isGraphqlSuccessful(response),
                'additional topic added successfully': (r) => {
                    try {
                        const data = JSON.parse(r.body);
                        return data.data?.addClassTopic?.id !== undefined;
                    } catch (e) {
                        return false;
                    }
                },
            });

            // Final refresh of class topics
            response = http.post(
                api,
                JSON.stringify(queries.getClassTopicsQuery(classId)),
                {
                    headers: postHeaders(accessToken),
                },
            );

            check(response, isGraphqlSuccessful(response));

            sleep(randomIntBetween(1, 10));
        } else {
            console.log(
                'Skipping additional topic - no alternative topic available',
            );
            sleep(randomIntBetween(1, 10));
        }
    });
}
