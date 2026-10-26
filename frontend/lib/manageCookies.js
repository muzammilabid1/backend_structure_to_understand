import cookie from 'cookie';
import JSCookie from 'js-cookie';
import jwt_decode from 'jwt-decode';

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../shared/Constant';

let cookies;
const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || 'localhost';

const isSecureCookie = () => process.env.NEXT_PUBLIC_LWP_ENV !== 'local';

/**
 * Sets a server-side cookie shim.
 * Used because JScookie does not work if we're serving content through Next's server.
 *
 * @param context the server context
 */
function setCookieShimFromContext(context) {
    cookies = {
        get: (key) => context.pendingCookies?.[key]?.value || context.req.cookies[key],
        set: (key, value) => {
            const date = new Date();

            date.setDate(date.getDate() + 90);

            return setCookieInContext(
                context,
                key,
                value,
                `Path=/; Expires=${date.toUTCString()}; SameSite=Lax${isSecureCookie() ? '; Secure' : ''}${domain ? `; Domain=${domain}` : ''}`
            );
        },
        delete: (key) => {
            return setCookieInContext(
                context,
                key,
                '',
                `Path=/; Max-Age=-1; SameSite=Lax${isSecureCookie() ? '; Secure' : ''}${domain ? `; Domain=${domain}` : ''}`
            );
        }
    };
}

/**
 * Adds a cookie to the list of cookies to set in this request context.
 *
 * @param context the request context
 * @param key the cookie key
 * @param value the cookie value
 * @param cookieOpts the options for the cookie, as encoded in a string
 * @return the result of the setHeader
 */
function setCookieInContext(context, key, value, cookieOpts) {
    context.pendingCookies = context.pendingCookies ?? {};

    context.pendingCookies[key] = { value, cookieOpts };

    return context.res.setHeader(
        'Set-Cookie',
        Object.entries(context.pendingCookies).map(([cookieKey, pendingCookie]) => {
            return `${cookieKey}="${pendingCookie.value}"${pendingCookie.cookieOpts ? '; ' + pendingCookie.cookieOpts : ''}`;
        })
    );
}

function parseCookies(req) {
    return cookie.parse(req ? req.headers.cookie || '' : document.cookie);
}

function setCookies(access_token, refresh_token) {
    if (access_token) setCookie(ACCESS_TOKEN_COOKIE, access_token);
    if (refresh_token) setCookie(REFRESH_TOKEN_COOKIE, refresh_token);
    setCookie('isInterstitial', true);
}

function setDemoActivityCookies(shareGlobal, shareWithParents, rememberSettings) {
    setCookie('share_with_parents', shareWithParents);
    setCookie('share_global', shareGlobal);
    setCookie('remember_settings', rememberSettings);
}

function clearDemoActivityCookies() {
    removeCookie('share_with_parents');
    removeCookie('share_global');
    removeCookie('remember_settings');
}

function getCookie(key) {
    if (!cookies) {
        return JSCookie.get(key);
    }

    return cookies.get(key);
}

// Use Lax so cookies are sent on top-level GET navigations (e.g., links from email clients).
const defaultCookieOptions = {
    expires: 90,
    sameSite: 'Lax',
    secure: isSecureCookie(),
    path: '/',
    domain
};

function setCookie(key, value, options) {
    const opts = { ...defaultCookieOptions, ...options };

    if (!cookies) {
        return JSCookie.set(key, value, opts);
    }

    return cookies.set(key, value, opts);
}

function removeCookie(key, options) {
    if (!cookies) {
        // When using JSCookie, calls to remove() must specify the same options
        // that were used to set the cookie
        return JSCookie.remove(key, { ...defaultCookieOptions, ...options });
    }

    return cookies.delete(key);
}

function clearCookies(push, setToken) {
    clearCookiesOnly();
    setToken(null);
    push('/');
}

function clearCookiesOnly() {
    removeCookie(ACCESS_TOKEN_COOKIE);
    removeCookie(REFRESH_TOKEN_COOKIE);
}

function getJwtDecoded(token) {
    return jwt_decode(token);
}

function isTokenExpired(expiration) {
    return Date.now() >= expiration * 1000;
}

export {
    clearCookies,
    clearCookiesOnly,
    clearDemoActivityCookies,
    getCookie,
    getJwtDecoded,
    isTokenExpired,
    parseCookies,
    removeCookie,
    setCookie,
    setCookies,
    setCookieShimFromContext,
    setDemoActivityCookies
};
