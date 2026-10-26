const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? '';

// The two apps share one host locally and differ by port, so this one case cannot be derived.
const LOCAL_SPM_DASHBOARD_ORIGIN = 'http://localhost:3002';

/**
 * Derives the dashboard's origin from the session cookie domain rather than from its own variable.
 *
 * The dashboard has no login: it reads the access-token cookie this platform set. A browser sends
 * that cookie only to a host inside `NEXT_PUBLIC_COOKIE_DOMAIN`, so `spm.<cookie domain>` is the
 * only shape a working dashboard host can take. A host that broke the rule could not read the
 * session at all, which is what makes this safe to derive instead of configure.
 *
 * The path is /dashboard, not /: the admin has a live session here, so the dashboard's gate passes
 * and they land where they meant to. A stale session is the dashboard's problem — it redirects
 * them to its own landing page.
 */
export const toSpmDashboardUrl = (cookieDomain = COOKIE_DOMAIN): string => {
    // An unset cookie domain means localhost, exactly as frontend/lib/manageCookies.js:8 reads it.
    // A cookie domain is also sometimes written with a leading dot; the hostname implies none.
    const domain = cookieDomain.trim().replace(/^\.+/, '') || 'localhost';

    const origin = domain === 'localhost' ? LOCAL_SPM_DASHBOARD_ORIGIN : `https://spm.${domain}`;

    return `${origin}/dashboard`;
};
