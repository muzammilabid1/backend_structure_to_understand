// GraphQL validation functions
export function checkGraphqlError(response) {

    // Handle OPTIONS requests (CORS preflight)
    if (response.request.method === 'OPTIONS') {
        return response.status === 204 || response.status === 200;
    }

    const contentType = response.headers['Content-Type'] || '';
    const isLikelyJson = contentType.includes('application/json') ||
                        response.request.url.includes('/graphql') ||
                        response.request.url.includes('/api');

    if (isLikelyJson) {
        try {
            const responseData = JSON.parse(response.body);

            // Check for GraphQL errors (same logic as handleGraphQLErrors)
            if (responseData.errors && responseData.errors.length > 0) {
                return false;
            }

            // For GraphQL, also ensure we have data
            if (responseData.data === null || responseData.data === undefined) {
                return false;
            }

            return true;
        } catch (e) {
            return false;
        }
    }

    return true;
}

export function isGraphqlSuccessful(res) {
    return {
        'GraphQL request successful': (res) => checkGraphqlError(res),
        'response time < 2000ms': (res) => res.timings.duration < 2000,
    };
}

// for CORS preflight requests
export function isHttpSuccessful(res) {
    return {
        'HTTP request successful': (res) => res.status < 300 && res.status >= 200,
    };
}


// Helper function to build query string from object (k6 doesn't support URLSearchParams)
export function buildQueryString(params) {
    const searchParams = [];
    for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined && value !== '') {
            searchParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
    }
    return searchParams.join('&');
}

// Function to log failed requests in a format that can be filtered
function logFailedRequest(requestResult) {
    const timestamp = new Date().toISOString();

    // Extract user details from additionalInfo if available
    const userDetails = {};
    if (requestResult.additionalInfo) {
        if (requestResult.additionalInfo.userEmail)
            userDetails.userEmail = requestResult.additionalInfo.userEmail;
        if (requestResult.additionalInfo.parentId)
            userDetails.parentId = requestResult.additionalInfo.parentId;
        if (requestResult.additionalInfo.pupilId)
            userDetails.pupilId = requestResult.additionalInfo.pupilId;
        if (requestResult.additionalInfo.topicId)
            userDetails.topicId = requestResult.additionalInfo.topicId;
        if (requestResult.additionalInfo.userId)
            userDetails.userId = requestResult.additionalInfo.userId;
    }

    const logEntry = {
        timestamp: timestamp,
        userDetails: userDetails,
        ...requestResult,
    };

    // Prefix helps to filter the logs for grep
    console.log(`[FAILED_REQUEST] ${JSON.stringify(logEntry)}`);
}

// Enhanced GraphQL error handling
function handleGraphQLErrors(requestResult, responseData) {
    if (
        responseData.errors &&
        Array.isArray(responseData.errors) &&
        responseData.errors.length > 0
    ) {
        console.log(
            '❌ GraphQL errors found:',
            JSON.stringify(responseData.errors, null, 2),
        );
        requestResult.error = `GraphQL errors: ${JSON.stringify(responseData.errors)}`;
        requestResult.success = false;
        logFailedRequest(requestResult);
    } else if (responseData.error) {
        console.log(
            '❌ GraphQL error found:',
            JSON.stringify(responseData.error, null, 2),
        );
        requestResult.error = `GraphQL error: ${JSON.stringify(responseData.error)}`;
        requestResult.success = false;
        logFailedRequest(requestResult);
    } else {
        console.log('✅ GraphQL request successful (no errors found)');
        requestResult.success = true;
    }
}
export function logResponse(
    response,
    requestName = '',
    additionalInfo = {}, // if we want to add additional info to the log
) {
    const requestResult = {
        name: requestName,
        timestamp: new Date(),
        status: response.status,
        url: response.request.url,
        method: response.request.method,
        additionalInfo: additionalInfo,
        success: false,
        error: null,
        data: null,
    };

    console.log(`\n--- ${requestName} ---`);
    console.log(`Status: ${response.status}`);
    console.log(`Request URL: ${response.request.url}`);
    console.log(`Request method: ${response.request.method}`);

    if (Object.keys(additionalInfo).length > 0) {
        console.log(
            'Additional info:',
            JSON.stringify(additionalInfo, null, 2),
        );
    }

    if (response.request.method === 'OPTIONS') {
        if (response.status === 204 || response.status === 200) {
            console.log('✅ CORS preflight successful');
            requestResult.success = true;
        } else {
            console.log(
                `❌ CORS preflight failed with status: ${response.status}`,
            );
            requestResult.error = `CORS preflight failed: HTTP ${response.status}`;
            requestResult.success = false;
            logFailedRequest(requestResult);
        }
    } else if (response.status === 200) {
        const contentType = response.headers['Content-Type'] || '';
        const isLikelyJson =
            contentType.includes('application/json') ||
            response.request.url.includes('/graphql') ||
            response.request.url.includes('/api');

        if (isLikelyJson) {
            try {
                const responseData = JSON.parse(response.body);
                console.log(
                    'Response data:',
                    JSON.stringify(responseData, null, 2),
                );

                handleGraphQLErrors(requestResult, responseData);

                requestResult.data = responseData;
            } catch (parseError) {
                console.log(
                    '⚠️  Expected JSON but got:',
                    response.body.substring(0, 500),
                );
                requestResult.error = `Parse error: ${parseError.message}`;
                requestResult.success = false;
                // Log failed parse request
                logFailedRequest(requestResult);
            }
        } else {
            const responseLength = response.body.length;
            const responsePreview = response.body.substring(0, 200);
            console.log(
                `📄 Response (${responseLength} chars): ${responsePreview}...`,
            );
            // For non-JSON responses with 200 status, consider it successful
            requestResult.success = true;
            requestResult.data = { type: 'non-json', length: responseLength };
        }
    } else {
        console.log(`❌ Request failed with status: ${response.status}`);
        console.log(`Error response: ${response.body}`);
        requestResult.error = `HTTP ${response.status}: ${response.body}`;
        requestResult.success = false;
        logFailedRequest(requestResult);
    }

    return requestResult.data;
}

// URL validation for production environments
export function validateUrlForEnvironment(baseUrl) {
    if (!baseUrl) {
        throw new Error('Base URL is required');
    }

    const isProduction = __ENV.NODE_ENV === 'production' ||
                        baseUrl.includes('staging');

    if (isProduction && !baseUrl.startsWith('https://')) {
        throw new Error(`HTTPS is required for production environments. Current URL: ${baseUrl}`);
    }

    console.log(`Environment validation passed for: ${baseUrl}`);
    return true;
}

/**
 * Selects a random slice of items from an array
 * @param {Array} array - The source array to slice from
 * @param {Object} options - Configuration options
 * @param {number} options.maxSize - Maximum number of items to select (default: 4)
 * @param {number} options.minSize - Minimum number of items to select (default: 1)
 * @returns {Array} Random slice of the array
 */
export function selectRandomSlice(array, options = {}) {
    const { maxSize = 4, minSize = 1 } = options;

    if (!Array.isArray(array) || array.length === 0) {
        return [];
    }

    if (minSize > maxSize) {
        throw new Error('minSize cannot be greater than maxSize');
    }

    const startIndex = Math.floor(Math.random() * array.length);
    const remainingItems = array.length - startIndex;
    const maxAllowed = Math.min(maxSize, remainingItems);
    const minAllowed = Math.min(minSize, maxAllowed);
    const sliceLength = Math.floor(Math.random() * (maxAllowed - minAllowed + 1)) + minAllowed;

    return array.slice(startIndex, startIndex + sliceLength);
}
export function pickRandomDateOneWeekInPast() {
    const now = new Date();
    const oneWeekAgoInMilliseconds = new Date(
        now.getTime() - 7 * 24 * 60 * 1000,
    );

    const randomTimeWithinAPastWeek =
        oneWeekAgoInMilliseconds.getTime() +
        Math.random() * (now.getTime() - oneWeekAgoInMilliseconds.getTime());

    return new Date(randomTimeWithinAPastWeek);
}