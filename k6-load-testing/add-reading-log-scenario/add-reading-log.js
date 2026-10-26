// Creator: Grafana k6 Browser Recorder 1.0.8
import { sleep, group, check } from 'k6';
import http from 'k6/http';
import * as queries from './queries.js';
import jsonpath from 'https://jslib.k6.io/jsonpath/1.0.2/index.js';
import {
    isHttpSuccessful,
    isGraphqlSuccessful,
    validateUrlForEnvironment,
    pickRandomDateOneWeekInPast,
} from './utils.js';
import {
    getBaseHeaders,
    getPostHeaders,
    getPreflightHeaders,
} from './requestHeaders.js';
import { options } from './options/parent-add-reading-log-options.js';

export { options }; // k6 needs this

const dataFolder = 'temp-data';

const testUsers = JSON.parse(open(`../${dataFolder}/reading-log-data.json`));
const tempPassword = __ENV.TEST_USER_PASSWORD;


const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
const api = `${baseUrl}/graphql`;

// Validate URL for production environments
validateUrlForEnvironment(baseUrl);

console.log(`Running tests using: ${baseUrl}`);

export default function main() {
    // Select user based on VU ID (round-robin distribution)
    const userIndex = (__VU - 1) % testUsers.length;
    const currentUser = testUsers[userIndex];

    // Extract user credentials for this VU
    const userEmail = currentUser.parentEmail;
    const userPassword = tempPassword;
    const parentId = currentUser.parentId;
    const pupilId = currentUser.pupilId;
    const topicId = currentUser.topicId;

    let response;

    group('Test preLogin API', function () {
        console.log('Testing preLogin API');

        // CORS preflight request

        response = http.options(api, null, {
            headers: getPreflightHeaders(baseUrl),
        });

        check(response, isHttpSuccessful('CORS preflight'));
        sleep(6.7);

        const graphqlQuery = queries.preLoginQuery(userEmail);

        response = http.post(api, JSON.stringify(graphqlQuery), {
            headers: getPostHeaders(null),
        });

        // Add k6 checks for automated testing
        check(response, {
            ...isGraphqlSuccessful(response),
            'preLogin email matches': (r) => {
                try {
                    const data = JSON.parse(r.body);
                    return data.data?.preLogin?.emailOrPhone === userEmail;
                } catch (e) {
                    return false;
                }
            },
        });
    });

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

    const vars = {};
    vars['accessToken1'] = jsonpath.query(
        response.json(),
        '$.data.login.accessToken',
    )[0];

    response = http.options(api, null, {
        headers: getPreflightHeaders(baseUrl),
    });

    check(response, isHttpSuccessful(response));

    console.log('Testing GET request to home page');
    response = http.get(baseUrl, {
        headers: getBaseHeaders(),
    });
    sleep(0.5);

    console.log('Testing getServerUptime API');
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

    console.log('Testing final CORS preflight request');
    response = http.options(api, null, {
        headers: getPreflightHeaders(baseUrl, true),
    });

    check(response, isHttpSuccessful(response));

    const getUnseenFeatureTooltipsQuery = {
        operationName: 'getUnseenFeatureTooltips',
        variables: {},
        query: `query getUnseenFeatureTooltips {
            getUnseenFeatureTooltips {
                id
                targetId
                message
                order
                imageUrl
                __typename
            }
        }`,
    };

    response = http.post(api, JSON.stringify(getUnseenFeatureTooltipsQuery), {
        headers: getPostHeaders(vars['accessToken1']),
    });

    check(response, isGraphqlSuccessful(response));
    sleep(0.6);

    console.log('Testing addReadingLog Scenario');

    group('Parent Dashboard - ' + baseUrl + '/parent/<parentId>', function () {
        console.log('Testing getPupilInvitations API');

        response = http.post(
            api,
            JSON.stringify(queries.getPupilInvitationsQuery(parentId)),
            {
                headers: getPostHeaders(vars['accessToken1']),
            },
        );

        check(response, isGraphqlSuccessful(response));

        response = http.post(
            api,
            JSON.stringify(queries.getPupilsQuery(parentId)),
            {
                headers: getPostHeaders(vars['accessToken1']),
            },
        );

        check(response, isGraphqlSuccessful(response));
        sleep(2.6);
    });

    group(
        'Add Reading Log - /child/<pupilId>/reading?topicId=<topicId>',
        function () {
            /// TODO are we making back to back requests to the same endpoint? double check with the original script
            response = http.post(
                api,
                JSON.stringify(queries.pupilQuery(pupilId)),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );

            check(response, isGraphqlSuccessful(response));

            response = http.post(
                api,
                JSON.stringify(queries.pupilQuery(pupilId)),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );

            check(response, isGraphqlSuccessful(response));

            response = http.post(
                api,
                JSON.stringify(queries.getUserQuery(parentId)),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );

            check(response, isGraphqlSuccessful(response));

            console.log('Testing getRecommendedPupilTopics API');
            response = http.post(
                api,
                JSON.stringify(queries.getRecommendedPupilTopicsQuery(pupilId)),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );

            check(response, isGraphqlSuccessful(response));

            console.log('Testing allPupilReadingLogs API');
            response = http.post(
                api,
                JSON.stringify(queries.allPupilReadingLogsQuery(pupilId)),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );

            check(response, isGraphqlSuccessful(response));

            console.log('Testing getPupilReadingNote API');
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

            console.log('Testing getParameterByKey API');
            response = http.post(
                api,
                JSON.stringify(
                    queries.getParameterByKeyQuery('COMMENT_PHOTO_PERMISSIONS'),
                ),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );

            check(response, isGraphqlSuccessful(response));

            console.log('Testing getPupilReadingTopic API');
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

            response = http.post(
                api,
                JSON.stringify(queries.getUserQuery(parentId)),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );

            check(response, isGraphqlSuccessful(response));

            console.log('Testing pupilQuery API');
            response = http.post(
                api,
                JSON.stringify(queries.pupilQuery(pupilId)),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );

            check(response, isGraphqlSuccessful(response));

            console.log('Testing getReadingTopics API');
            response = http.post(
                api,
                JSON.stringify(queries.getReadingTopicsQuery(pupilId)),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );

            check(response, isGraphqlSuccessful(response));
            sleep(4.7);

            console.log('Testing getPupilRecentBookLogs API');
            response = http.post(
                api,
                JSON.stringify(queries.getPupilRecentBookLogsQuery(pupilId)),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );

            check(response, isGraphqlSuccessful(response));

            response = http.options(api, null, {
                headers: getPreflightHeaders(baseUrl, true),
            });

            check(response, isHttpSuccessful(response));
            sleep(9);


            /// TODO query params should be varying to send different types of logs
            console.log('Testing addReadingLogMutation API');
            response = http.post(
                api,
                JSON.stringify(
                    queries.addReadingLogMutation({
                        pupilId: pupilId,
                        pupilTopicId: topicId,
                        bookName: 'The Three Musketeers',
                        includeInReadingTarget: false,
                        userName: null,
                        userType: 'PARENT',
                        comment: 'test',
                        isBookFinished: true,
                        pageNumber: '',
                        bookReadAt: pickRandomDateOneWeekInPast(),
                        sharingAllowedGlobal: true,
                        sharingAllowed: true,
                        photo: null,
                        audio: null,
                    }),
                ),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );

            check(response, isGraphqlSuccessful(response));

            response = http.options(api, null, {
                headers: getPreflightHeaders(baseUrl, true),
            });

            check(response, isHttpSuccessful(response));

            /// TODO query params should be varying to send different types of logs
            console.log('Testing allPupilReadingLogs API');
            response = http.post(
                api,
                JSON.stringify(queries.allPupilReadingLogsQuery(pupilId, 0, 5)),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );

            check(response, isGraphqlSuccessful(response));

            console.log('Testing getReadingTopics API');
            response = http.post(
                api,
                JSON.stringify(queries.getReadingTopicsQuery(pupilId)),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );

            check(response, isGraphqlSuccessful(response));

            console.log('Testing getPupilReadingNote API');
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

            response = http.post(
                api,
                JSON.stringify(queries.getUserQuery(parentId)),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );

            check(response, isGraphqlSuccessful(response));

            console.log('Testing getRecommendedPupilTopics API');
            response = http.post(
                api,
                JSON.stringify(queries.getRecommendedPupilTopicsQuery(pupilId)),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );

            check(response, isGraphqlSuccessful(response));
            sleep(0.9);

            response = http.post(
                api,
                JSON.stringify(queries.getUserQuery(parentId)),
                {
                    headers: getPostHeaders(vars['accessToken1']),
                },
            );

            check(response, isGraphqlSuccessful(response));
        },
    );
}
