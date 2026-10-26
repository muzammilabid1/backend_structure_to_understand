// Creator: Grafana k6 Browser Recorder 1.0.8
import { sleep, group, check } from 'k6';
import http from 'k6/http';
import * as queries from './queries.js';
import jsonpath from 'https://jslib.k6.io/jsonpath/1.0.2/index.js';
import { isGraphqlSuccessful } from './utils.js';
import { getBaseHeaders, getPostHeaders, getPreflightHeaders } from './requestHeaders.js';

const testUsers = JSON.parse(open('temp-data/readingLogUser.json'));

export const options = {
    stages: [
        { duration: '30s', target: 1 },
        { duration: '1m', target: 3 },
        { duration: '30s', target: 3 },
        { duration: '30s', target: 0 },
    ],
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
const api = `${baseUrl}/graphql`;
const origin = baseUrl; 

export default function main() {
    // Select user based on VU ID (round-robin distribution)
    const userIndex = (__VU - 1) % testUsers.length;
    const currentUser = testUsers[userIndex];

    // Extract user credentials for this VU
    const userEmail = currentUser.parentEmail;
    const userPassword = currentUser.parentPassword;
    const parentId = currentUser.parentId;
    const pupilId = currentUser.pupilId;
    const topicId = currentUser.topicId;



    let response;
    const vars = {};

    // ===== GROUP 1: Authentication and Initial Setup =====
    group('Authentication and Initial Setup', function () {
        console.log(`Testing preLogin API with email: ${userEmail}`);

        // CORS preflight request
        response = http.options(api, null, {
            headers: getPreflightHeaders(origin),
        });
        sleep(6.7);

        // preLogin API call
        const graphqlQuery = {
            operationName: 'preLogin',
            variables: {
                emailOrPhone: userEmail,
            },
            query: `query preLogin($emailOrPhone: String!) {
                preLogin(emailOrPhone: $emailOrPhone) {
                    emailOrPhone
                    status
                    methods
                    canSendEmail
                    canSendSms
                    __typename
                }
            }`,
        };

        response = http.post(api, JSON.stringify(graphqlQuery), {
            headers: getPostHeaders(null),
        });

        // Add k6 checks for automated testing
        check(response, isGraphqlSuccessful(response));

        sleep(6.5);

        // Login request to get access token
        response = http.post(
            api,
            JSON.stringify(queries.loginQuery(userEmail, userPassword)),
            {
                headers: getPostHeaders(null),
            },
        );
        check(response, isGraphqlSuccessful(response));
        (response, 'login API', { email: userEmail });

        vars['accessToken1'] = jsonpath.query(
            response.json(),
            '$.data.login.accessToken',
        )[0];

        // Final setup calls
        response = http.options(api, null, {
            headers: getPreflightHeaders(origin),
        });
        check(response, isGraphqlSuccessful(response));

        response = http.get('http://localhost:3000/', {
            headers: getBaseHeaders(),
        });

        sleep(0.5);

        // getServerUptime API
        const serverUptimeQuery = {
            operationName: 'getServerUptime',
            variables: {},
            query: `query getServerUptime {
                getServerUptime {
                    buildType
                    serverUptime
                    __typename
                }
            }`,
        };

        response = http.post(api, JSON.stringify(serverUptimeQuery), {
            headers: getPostHeaders(vars['accessToken1']),
        });
        check(response, isGraphqlSuccessful(response));
    

        response = http.options(api, null, {
            headers: getPreflightHeaders(origin, true),
        });
        check(response, isGraphqlSuccessful(response));

        response = http.post(
            api,
            JSON.stringify(queries.getUnseenFeatureTooltipsQuery()),
            {
                headers: getPostHeaders(vars['accessToken1']),
            },
        );
        check(response, isGraphqlSuccessful(response));
        sleep(0.6);
    });

    // ===== GROUP 2: Initial Page Load Burst (18:44:15.676Z - 18:44:16.189Z) =====
    group('Initial Page Load Burst - Real User Journey', function () {
        console.log('=== Starting Initial Page Load Burst ===');

        // 1. getPupilInvitation (18:44:15.676Z)
        console.log('1. getPupilInvitation');
        response = http.post(
            api,
            JSON.stringify(queries.getPupilInvitationQuery(parentId, pupilId)),
            {
                headers: getPostHeaders(vars['accessToken1']),
            },
        );
        check(response, isGraphqlSuccessful(response));
        sleep(0.089); // 89ms gap

        // 2. pupil (18:44:15.765Z)
        console.log('2. pupil');
        response = http.post(api, JSON.stringify(queries.pupilQuery(pupilId)), {
            headers: getPostHeaders(vars['accessToken1']),
        });
        check(response, isGraphqlSuccessful(response));
        sleep(0.023); // 23ms gap

        // 3. pupil (18:44:15.788Z)
        console.log('3. pupil');
        response = http.post(api, JSON.stringify(queries.pupilQuery(pupilId)), {
            headers: getPostHeaders(vars['accessToken1']),
        });
        check(response, isGraphqlSuccessful(response));
        sleep(0.026); // 26ms gap

        // 4. getReadingTopics (18:44:15.814Z)
        console.log('4. getReadingTopics');
        response = http.post(
            api,
            JSON.stringify(queries.getReadingTopicsQuery(pupilId)),
            {
                headers: getPostHeaders(vars['accessToken1']),
            },
        );
        check(response, isGraphqlSuccessful(response));
        sleep(0.084); // 84ms gap

        // 5. pupil (18:44:15.898Z)
        console.log('5. pupil');
        response = http.post(api, JSON.stringify(queries.pupilQuery(pupilId)), {
            headers: getPostHeaders(vars['accessToken1']),
        });
        check(response, isGraphqlSuccessful(response));
        sleep(0.025); // 25ms gap

        // 6. pupil (18:44:15.923Z)
        console.log('6. pupil');
        response = http.post(api, JSON.stringify(queries.pupilQuery(pupilId)), {
            headers: getPostHeaders(vars['accessToken1']),
        });
        check(response, isGraphqlSuccessful(response));
        sleep(0.031); // 31ms gap

        // 7. getReadingTopics (18:44:15.954Z)
        console.log('7. getReadingTopics');
        response = http.post(
            api,
            JSON.stringify(queries.getReadingTopicsQuery(pupilId)),
            {
                headers: getPostHeaders(vars['accessToken1']),
            },
        );
        check(response, isGraphqlSuccessful(response));
        sleep(0.137); // 137ms gap

        // 8. getPupils (18:44:16.091Z)
        console.log('8. getPupils');
        response = http.post(
            api,
            JSON.stringify(queries.getPupilsQuery(parentId)),
            {
                headers: getPostHeaders(vars['accessToken1']),
            },
        );
        check(response, isGraphqlSuccessful(response));
        sleep(0.002); // 2ms gap

        // 9. getUnseenFeatureTooltips (18:44:16.093Z)
        console.log('9. getUnseenFeatureTooltips');
        response = http.post(
            api,
            JSON.stringify(queries.getUnseenFeatureTooltipsQuery()),
            {
                headers: getPostHeaders(vars['accessToken1']),
            },
        );
        check(response, isGraphqlSuccessful(response));
        sleep(0.002); // 2ms gap

        // 10. pupil (18:44:16.095Z)
        console.log('10. pupil');
        response = http.post(api, JSON.stringify(queries.pupilQuery(pupilId)), {
            headers: getPostHeaders(vars['accessToken1']),
        });
        check(response, isGraphqlSuccessful(response));
        sleep(0.083); // 83ms gap

        // 11. haveMoreChildren (18:44:16.178Z)
        console.log('11. haveMoreChildren');
        response = http.post(
            api,
            JSON.stringify(queries.haveMoreChildrenQuery()),
            {
                headers: getPostHeaders(vars['accessToken1']),
            },
        );
        check(response, isGraphqlSuccessful(response));
        sleep(0.001); // 1ms gap

        // 12. getUser (18:44:16.179Z)
        console.log('12. getUser');
        response = http.post(
            api,
            JSON.stringify(queries.getUserQuery(parentId)),
            {
                headers: getPostHeaders(vars['accessToken1']),
            },
        );
        check(response, isGraphqlSuccessful(response));
        sleep(0.001); // 1ms gap

        // 13. getRecommendedPupilTopics (18:44:16.180Z)
        console.log('13. getRecommendedPupilTopics');
        response = http.post(
            api,
            JSON.stringify(queries.getRecommendedPupilTopicsQuery(pupilId)),
            {
                headers: getPostHeaders(vars['accessToken1']),
            },
        );
        check(response, isGraphqlSuccessful(response));
        try {
            const responseData = response.json();
            const topics = responseData?.data?.getRecommendedPupilTopics;
            if (topics && topics.length > 0) {
                vars['releaseDate1'] = topics[0].releaseDate;
                console.log(`Found releaseDate: ${vars['releaseDate1']}`);
            } else {
                console.log(
                    'No recommended topics found - some queries will be skipped',
                );
            }
        } catch (e) {
            console.log(
                `Error parsing getRecommendedPupilTopics response: ${e.message}`,
            );
        }
        sleep(0.001); // 1ms gap

        // 14. allPupilReadingLogs (18:44:16.181Z)
        console.log('14. allPupilReadingLogs');
        response = http.post(
            api,
            JSON.stringify(queries.allPupilReadingLogsQuery(pupilId)),
            {
                headers: getPostHeaders(vars['accessToken1']),
            },
        );
        check(response, isGraphqlSuccessful(response));
        sleep(0.003); // 3ms gap

        // 15. getPupilReadingNote (18:44:16.184Z) - Skip if no valid topicId
        console.log('15. getPupilReadingNote');
        if (vars['releaseDate1'] && topicId) {
            response = http.post(
                api,
                JSON.stringify(
                    queries.getPupilReadingNoteQuery(pupilId, topicId),
                ),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );
            check(response, isGraphqlSuccessful(response));
            if (response.status !== 200) {
                console.log(
                    `getPupilReadingNote skipped due to error - this is expected for load testing`,
                );
            }
        } else {
            console.log('15. getPupilReadingNote - Skipped (no valid topic)');
        }
        sleep(0.001); // 1ms gap

        // 16. getUser (18:44:16.185Z)
        console.log('16. getUser');
        response = http.post(
            api,
            JSON.stringify(queries.getUserQuery(parentId)),
            {
                headers: getPostHeaders(vars['accessToken1']),
            },
        );
        check(response, isGraphqlSuccessful(response));
        sleep(0.001); // 1ms gap

        // 17. getPupilReadingTopic (18:44:16.186Z) - Skip if no valid topicId
        console.log('17. getPupilReadingTopic');
        if (vars['releaseDate1'] && topicId) {
            response = http.post(
                api,
                JSON.stringify(
                    queries.getPupilReadingTopicQuery(pupilId, topicId),
                ),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );
            check(response, isGraphqlSuccessful(response));
            if (response.status !== 200) {
                console.log(
                    `getPupilReadingTopic skipped due to error - this is expected for load testing`,
                );
            }
        } else {
            console.log('17. getPupilReadingTopic - Skipped (no valid topic)');
        }
        sleep(0.002); // 2ms gap

        // 18. getReadingTopics (18:44:16.188Z)
        console.log('18. getReadingTopics');
        response = http.post(
            api,
            JSON.stringify(queries.getReadingTopicsQuery(pupilId)),
            {
                headers: getPostHeaders(vars['accessToken1']),
            },
        );
        check(response, isGraphqlSuccessful(response));
        sleep(0.001); // 1ms gap

        // 19. pupil (18:44:16.189Z)
        console.log('19. pupil');
        response = http.post(api, JSON.stringify(queries.pupilQuery(pupilId)), {
            headers: getPostHeaders(vars['accessToken1']),
        });
        check(response, isGraphqlSuccessful(response));

        console.log('=== Initial Page Load Burst Complete ===');
    });

    // ===== GROUP 3: Intensive User Interaction - getPupilRecentBookLogs (18:44:20.806Z - 18:45:05.325Z) =====
    group('Intensive User Interaction - Book Search', function () {
        console.log('=== Starting Intensive User Interaction Phase ===');

        // Gap before intensive interaction: 4.617 seconds
        sleep(4.617);

        // Array of book names to simulate different searches
        const bookNames = [
            'The Three Musketeers',
            'Animal Farm',
            'Pride and Prejudice',
            'Harry Potter',
            'The Great Gatsby',
            'To Kill a Mockingbird',
            'Lord of the Flies',
            'The Catcher in the Rye',
            "Charlotte's Web",
            'Matilda',
            'The Lion, the Witch and the Wardrobe',
            'Where the Red Fern Grows',
        ];

        // 24 getPupilRecentBookLogs calls with real timing intervals
        const timingIntervals = [
            0, 13.329, 0.69, 0.329, 0.575, 0.665, 1.859, 0.992, 3.692, 1.375,
            0.702, 0.626, 2.909, 1.125, 0.64, 0.866, 0.966, 2.693, 0.551, 1.183,
            0.961, 1.046, 0.66, 0.648,
        ];

        const numCallsToGetPupilRecentBookLogs = 24;

        for (let i = 0; i < numCallsToGetPupilRecentBookLogs; i++) {
            if (i > 0) {
                sleep(timingIntervals[i]);
            }

            const bookName = bookNames[i % bookNames.length];
            console.log(
                `${i + 1}. getPupilRecentBookLogs - searching for: ${bookName}`,
            );

            response = http.post(
                api,
                JSON.stringify(
                    queries.getPupilRecentBookLogsQuery(pupilId, bookName),
                ),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );
            check(response, isGraphqlSuccessful(response));
        }

        console.log('=== Intensive User Interaction Complete ===');
    });

    // ===== GROUP 4: Media Upload Preparation (18:45:35.607Z) =====
    group('Media Upload Preparation', function () {
        console.log('=== Starting Media Upload Preparation ===');

        // Gap before media upload: 30.282 seconds
        sleep(30.282);

        // presignedUrlForFeedbackMedia (18:45:35.607Z)
        console.log('1. presignedUrlForFeedbackMedia');
        response = http.post(
            api,
            JSON.stringify(queries.presignedUrlForFeedbackMediaMutation()),
            {
                headers: getPostHeaders(vars['accessToken1']),
            },
        );
        check(response, isGraphqlSuccessful(response));

        console.log('=== Media Upload Preparation Complete ===');
    });

    console.log('=== Full User Journey Complete ===');
}
