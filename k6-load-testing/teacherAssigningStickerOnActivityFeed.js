// Creator: Grafana k6 Browser Recorder 1.0.8

import { sleep, group, check } from 'k6';
import http from 'k6/http';
import {
    getPostHeaders,
    getBaseHeaders,
    getPreflightHeaders,
} from './add-reading-log-scenario/requestHeaders.js';

import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

import * as queries from './add-reading-log-scenario/queries.js';
import {
    isGraphqlSuccessful, validateUrlForEnvironment} from './add-reading-log-scenario/utils.js';
import { options } from './add-reading-log-scenario/options/teacherAssigningStickerOnActivityFeedOptions.js';

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
        open(`${dataFolder}/teacher-assigning-sticker-on-activity-feed-data-dev.json`),
    );
    tempPassword = testData.password || 'password';
} else {
    testData = JSON.parse(
        open(`${dataFolder}/teacher-assigning-sticker-on-activity-feed-data.json`),
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

    if (!currentUser) {
        throw new Error(`No test user found at index ${userIndex}`);
    }
    // Extract user credentials for this VU
    const teacherEmail = currentUser.teacherEmail;
    const teacherPassword = tempPassword;
    const teacherId = currentUser.teacherId.toString();
    const schoolId = currentUser.schoolId.toString();



    let response;
    let authToken = null;

    group('User Authentication', function () {
        // Login to get auth token
        response = http.post(
            api,
            JSON.stringify(
                queries.loginQuery(teacherEmail, teacherPassword, false),
            ),
            {
                headers: getPostHeaders(null),
            },
        );

        check(response, {
            'login successful': (r) => r.status === 200,
            'login response has data': (r) => {
                const body = JSON.parse(r.body);
                return body.data && body.data.login;
            },
        });

        if (response.status === 200) {
            const body = JSON.parse(response.body);
            if (body.data && body.data.login && body.data.login.accessToken) {
                authToken = body.data.login.accessToken;
            }
        }

        sleep(randomIntBetween(1, 10));
    });

    group('Page Load and Server Setup', function () {
        response = http.post(
            api,
            JSON.stringify(queries.getServerUptimeQuery()),
            {
                headers: getPostHeaders(null),
            },
        );

        check(response, isGraphqlSuccessful('Server uptime'));
        sleep(randomIntBetween(1, 10));

        response = http.post(
            api,
            JSON.stringify(queries.getServerUptimeQuery()),
            {
                headers: getPostHeaders(null),
            },
        );

        check(response, isGraphqlSuccessful('Server uptime'));
    });

    group('User and School Data Loading', function () {
        response = http.post(
            api,
            JSON.stringify(queries.getUserQuery(teacherId)),
            {
                headers: postHeaders(authToken),
            },
        );

        check(response, isGraphqlSuccessful('Get user data'));
        sleep(randomIntBetween(1, 10));

        response = http.post(
            api,
            JSON.stringify(queries.getServerUptimeQuery()),
            {
                headers: getPostHeaders(null),
            },
        );

        response = http.post(
            api,
            JSON.stringify(queries.getUserQuery(teacherId)),
            {
                headers: postHeaders(authToken),
            },
        );

        check(response, isGraphqlSuccessful('Get user data'));
        sleep(randomIntBetween(1, 10));

        response = http.post(
            api,
            JSON.stringify(queries.getUnseenFeatureTooltipsQuery()),
            {
                headers: postHeaders(authToken),
            },
        );

        check(response, isGraphqlSuccessful('Get unseen tooltips'));
        sleep(randomIntBetween(1, 10));

        response = http.post(
            api,
            JSON.stringify(queries.getSchoolQuery(schoolId)),
            {
                headers: postHeaders(authToken),
            },
        );

        check(response, isGraphqlSuccessful('Get school data'));
        sleep(randomIntBetween(1, 10));

        response = http.post(
            api,
            JSON.stringify(queries.getReadyTeddyClassesQuery(schoolId)),
            {
                headers: postHeaders(authToken),
            },
        );

        response = http.post(
            api,
            JSON.stringify(
                queries.getSchoolClassesAndGroupsQuery(schoolId, true),
            ),
            {
                headers: postHeaders(authToken),
            },
        );
        sleep(randomIntBetween(1, 10));
    });

    group('Feedback System Data Loading', function () {
        response = http.post(
            api,
            JSON.stringify(queries.getClassesForFeedbackFilterQuery(teacherId)),
            {
                headers: postHeaders(authToken),
            },
        );

        check(response, isGraphqlSuccessful('Get classes for feedback filter'));

        response = http.post(
            api,
            JSON.stringify(queries.getUserQuery(teacherId)),
            {
                headers: postHeaders(authToken),
            },
        );

        check(response, isGraphqlSuccessful('Get user data'));

        response = http.post(
            api,
            JSON.stringify(
                queries.haveUnTickedFeedbacksQuery(teacherId, schoolId),
            ),
            {
                headers: postHeaders(authToken),
            },
        );

        check(response, isGraphqlSuccessful('Get unticked feedbacks'));

        sleep(randomIntBetween(1, 10));
    });

    group('Sticker Data Loading', function () {});

    group('Feedback Interactions', function () {
        response = http.options(api, null, {
            headers: getPreflightHeaders(api),
        });

        response = http.post(
            api,
            JSON.stringify(queries.getPupilActivityFeedsQuery(teacherId)),
            {
                headers: postHeaders(authToken),
            },
        );

        let feedbacks = JSON.parse(response.body)?.data?.getPupilActivityFeeds
            ?.results;

        feedbacks = feedbacks.filter((feedback) => feedback.userType !== 'TEACHER');

        if (feedbacks.length === 0) {
            console.log(`No feedbacks found for user: ${teacherId}`);
            return;
        }

        console.log("TOTAL FEEDBACKS", feedbacks.length);

        check(response, isGraphqlSuccessful('Get pupil activity feeds'));


        response = http.post(
            api,
            JSON.stringify(queries.getStickersForTeacherQuery(schoolId)),
            {
                headers: postHeaders(authToken),
            },
        );

        const stickers = JSON.parse(response.body).data.getStickersForTeacher;

        console.log("TOTAL STICKERS", stickers.length);

        check(response, isGraphqlSuccessful('Get stickers for teacher'));

        response = http.post(
            api,
            JSON.stringify(
                queries.createFeedbackReplyWithStickerQuery(
                    randomItem(feedbacks)?.id?.toString(),
                    randomItem(stickers)?.id?.toString(),
                ),
            ),
            {
                headers: postHeaders(authToken),
            },
        );


        check(response, isGraphqlSuccessful('Create feedback sticker reply 1'));
        sleep(randomIntBetween(1, 10));

        response = http.post(
            api,
            JSON.stringify(
                queries.createFeedbackReplyWithStickerQuery(
                    randomItem(feedbacks)?.id?.toString(),
                    randomItem(stickers)?.id?.toString(),
                ),
            ),
            {
                headers: postHeaders(authToken),
            },
        );

        check(response, isGraphqlSuccessful('Create feedback sticker reply 2'));
        sleep(randomIntBetween(1, 10));
        response = http.post(
            api,
            JSON.stringify(
                queries.createFeedbackReplyWithStickerQuery(
                    randomItem(feedbacks)?.id?.toString(),
                    randomItem(stickers)?.id?.toString(),
                ),
            ),
            {
                headers: postHeaders(authToken),
            },
        );

        check(response, isGraphqlSuccessful('Create feedback sticker reply 3'));

        sleep(randomIntBetween(1, 10));

        console.log(`user: ${teacherId}`);

    });



    sleep(randomIntBetween(1, 10));
}