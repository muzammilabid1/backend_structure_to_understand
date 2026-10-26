// Creator: Grafana k6 Browser Recorder 1.0.8
import { sleep, check } from 'k6';
import http from 'k6/http';
import * as queries from './queries.js';
import jsonpath from 'https://jslib.k6.io/jsonpath/1.0.2/index.js';
import { isGraphqlSuccessful } from './utils.js';
import { getPostHeaders } from './requestHeaders.js';     

const dataFolder = 'temp-data';

const testUsers = JSON.parse(open(`${dataFolder}/devData.json`));

export const options = {
    scenarios: {
        // Background users running continuously
        background_load: {
            executor: 'constant-arrival-rate',
            rate: 2, // 5 requests per second background load
            timeUnit: '1s',
            duration: '60s', // Run for full test duration
            preAllocatedVUs: 5,
            maxVUs: 15,
            tags: { scenario: 'background_load' },
        },
        // Peak burst on top of background
        peak_burst: {
            executor: 'constant-arrival-rate',
            rate: 14, // Additional 14 RPS during peak (total ~19 RPS)
            timeUnit: '1s',
            duration: '1s', // 1 second burst
            startTime: '30s', // Start peak at 30 seconds when background is established
            preAllocatedVUs: 5,
            maxVUs: 10,
            tags: { scenario: 'peak_burst' },
        },
    },
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
const api = `${baseUrl}/graphql`;

export default function main() {
    // Select user based on VU ID (round-robin distribution)
    const userIndex = (__VU - 1) % testUsers.length;
    const currentUser = testUsers[userIndex];

    // Extract user credentials for this VU
    const userEmail = currentUser.parentEmail;
    const userPassword = currentUser.parentPassword;
    const pupilId = currentUser.pupilId;

    let response;

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

    // Make the main API call for both scenarios
    response = http.post(
        api,
        JSON.stringify(queries.getReadingTopicsQuery(pupilId)),
        {
            headers: getPostHeaders(vars['accessToken1']),
        },
    );

    check(response, isGraphqlSuccessful(response));

    // Add scenario-specific behavior
    if (__ENV.K6_SCENARIO === 'background_load') {
        // Background users have a small sleep to simulate realistic usage
        sleep(0.5);
    }
}
