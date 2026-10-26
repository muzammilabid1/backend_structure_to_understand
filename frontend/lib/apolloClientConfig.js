import { ApolloClient, from, gql, InMemoryCache } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { createUploadLink } from 'apollo-upload-client';
import { Router } from 'next/router';

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../shared/Constant';
import { getMsalInstance } from '../shared/Services/MSAL';
import { clearCookiesOnly, getCookie, getJwtDecoded, isTokenExpired, setCookie } from './manageCookies';

const isServerSide = typeof window === 'undefined';

/** @type {import('@apollo/client').DefaultOptions} */
const serverSideOptions = {
    query: {
        fetchPolicy: 'no-cache'
    }
};

/** @type {import('@apollo/client').DefaultOptions} */
const clientSideOptions = {
    watchQuery: {
        fetchPolicy: 'network-only'
    },
    query: {
        fetchPolicy: 'network-only'
    }
};

const refreshQuery = gql`
    mutation refreshSession($refreshToken: String!) {
        refreshSession(refreshToken: $refreshToken) {
            accessToken
            refreshToken
        }
    }
`;

const loginMicrosoftSilentReauth = gql`
    mutation login($emailOrPhone: String!, $token: String!) {
        login(emailOrPhone: $emailOrPhone, authToken: $token, provider: Microsoft) {
            accessToken
            refreshToken
        }
    }
`;

let apolloClient;
let currentTokenPromise;

const createApolloClient = (resolvedUrl) => {
    const apolloCache = new InMemoryCache({
        typePolicies: {
            LwpUser: {
                fields: {
                    showInterstitial: {
                        merge: true
                    }
                }
            }
        }
    });

    const asPath = resolvedUrl ? resolvedUrl.asPath : Router.asPath || Router.pathname;

    const uploadLink = createUploadLink({
        uri: process.env.NEXT_PUBLIC_GRAPHQL_END_POINT,
        headers: {
            // 'keep-alive': 'true',
            requestedurl: asPath,
            'Apollo-Require-Preflight': 'true'
        }
    });

    let client;

    const tokenLink = setContext(async (_, ctx) => {
        let accessToken = getCookie(ACCESS_TOKEN_COOKIE);

        if (accessToken && isTokenExpired(getJwtDecoded(accessToken)?.exp)) {
            const refreshToken = getCookie(REFRESH_TOKEN_COOKIE);

            if (!refreshToken || isTokenExpired(getJwtDecoded(refreshToken)?.exp)) {
                throw new Error('TokenExpiredError');
            } else {
                accessToken = await getNewToken(uploadLink);
            }
        }

        const headers = ctx.headers ?? {};

        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

        return {
            ...ctx,
            headers
        };
    });

    const refreshTokenOnErrorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
        if (graphQLErrors && graphQLErrors.some((e) => e.extensions.code === 'UNAUTHENTICATED' && e.message === 'token expired')) {
            // allow a retry for these
            return forward(operation);
        }

        if (networkError && networkError.statusCode >= 500 && networkError.statusCode < 600) {
            window.newrelic?.noticeError(networkError, { caught: false, handled: false, operationName: operation.operationName });
        }
    });

    client = new ApolloClient({
        cache: apolloCache,
        link: from([refreshTokenOnErrorLink, tokenLink, uploadLink]),
        defaultOptions: isServerSide ? serverSideOptions : clientSideOptions,
        defaultContext: {
            // currentTokenPromise operates both as a shared token-acquisition queue, and as a mutex,
            // to prevent other calls from repeating requests to get a token.
            currentTokenPromise: null
        }
    });

    return client;
};

/**
 * Attempts to fetch a new token for refreshing the currently logged-in session.
 *
 * @param {UploadLink} uploadLink the Apollo upload link for this session
 * @param ctx the Apollo context containing token promises etc
 * @return {Promise<string>} A promise of a new access token.
 */
async function getNewToken(uploadLink) {
    if (currentTokenPromise) return currentTokenPromise;

    const tokenPromise = new Promise((res, rej) => {
        const client = new ApolloClient({
            cache: new InMemoryCache(),
            link: uploadLink
        });

        const currentRefreshToken = getCookie(REFRESH_TOKEN_COOKIE);
        const currentLogin = getCookie('currentLogin');

        let mutationPromise;
        let mutationKey;

        if (currentRefreshToken) {
            mutationKey = 'refreshSession';
            mutationPromise = client.mutate({
                mutation: refreshQuery,
                variables: { refreshToken: currentRefreshToken }
            });
        } else {
            mutationKey = 'login';
            mutationPromise = getMsalInstance().then((msalInstance) => {
                try {
                    return msalInstance.ssoSilent({ scopes: ['User.Read'], loginHint: currentLogin }).then((login) => {
                        return client.mutate({
                            mutation: loginMicrosoftSilentReauth,
                            variables: { emailOrPhone: currentLogin, token: login.idToken }
                        });
                    });
                } catch {
                    // giving up and bailing out
                    rej();
                }
            });
        }

        mutationPromise.then(
            ({ data }) => {
                const accessToken = data[mutationKey]?.accessToken;

                if (accessToken) {
                    setCookie(ACCESS_TOKEN_COOKIE, accessToken);
                    const refreshToken = data[mutationKey]?.refreshToken;

                    if (refreshToken) setCookie(REFRESH_TOKEN_COOKIE, refreshToken);
                } else {
                    clearCookiesOnly();
                }

                currentTokenPromise = null;

                res(accessToken);
            },
            (e) => {
                currentTokenPromise = null;

                const currentAccessToken = getCookie(ACCESS_TOKEN_COOKIE);

                if (!currentAccessToken || isTokenExpired(getJwtDecoded(currentAccessToken)?.exp)) {
                    Object.defineProperty(e, 'lwpTokenRefreshError', { value: true });
                    rej(e);

                    return;
                }

                // Refresh must have been successful in another tab or thread
                res(currentAccessToken);
            }
        );
    });

    currentTokenPromise = tokenPromise;

    return tokenPromise;
}

export function getApolloClient() {
    if (!apolloClient) {
        apolloClient = createApolloClient();
    }

    return apolloClient;
}
