export const getBaseHeaders = () => {
    return {
        'upgrade-insecure-requests': '1',
        'sec-ch-ua':
            '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'x-lwp-skip-recaptcha': __ENV.SKIP_RECAPTCHA_SECRET_TOKEN
    };
};

export const getPostHeaders = (accessToken) => {
    const headers = {
        accept: '*/*',
        'apollo-require-preflight': 'true',
        'content-type': 'application/json',
        requestedurl: 'undefined',
        'sec-ch-ua':
            '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'x-lwp-skip-recaptcha': __ENV.SKIP_RECAPTCHA_SECRET_TOKEN
    };

    if (accessToken) {
        headers.authorization = `Bearer ${accessToken}`;
    }

    return headers;
};

export const getPreflightHeaders = (origin, auth) => {
    return {
        accept: '*/*',
        'access-control-request-headers': `apollo-require-preflight,content-type,requestedurl${auth ? ',authorization' : ''}`,
        'access-control-request-method': 'POST',
        origin: origin,
        'sec-fetch-mode': 'cors',
        'x-lwp-skip-recaptcha': __ENV.SKIP_RECAPTCHA_SECRET_TOKEN
    };
};
