import { PageAnnouncementUserOption } from '../enums/PageAnnouncementUserOption';
import { GENERATED_ANNOUNCEMENT_TARGET_PAGES } from './announcementPages.gen';

/**
 * Every page an admin can aim a page announcement at, keyed on the Next.js route template
 * (what `router.pathname` reports, e.g. `/school/[school_id]/feed`), not the URL with real ids.
 *
 * Nobody keeps this list by hand. `./announcementPages.gen` is written from `frontend/pages` every time
 * shared is built (`yarn references:build`), by `frontend/generate-announcement-pages.js`.
 *
 * `audience` follows the page's `pageType`: SCHOOL_LEADER, TEACHER and PARENT map to the option of
 * the same name, and GENERAL pages map to ALL_USERS.
 */
export interface AnnouncementTargetPage {
    route: string;
    label: string;
    audience: PageAnnouncementUserOption;
}

/**
 * The route the login screen reports to `<Announcements />`. AuthProvider renders the login screen in
 * place of a protected page, so `router.pathname` there is the protected page's route, not the login screen.
 * Only logged-out users see it, so only ALL_USERS announcements can be aimed at it.
 */
export const LOGIN_SCREEN_ROUTE = '/__login';

/** Targets that are screens rather than files under `frontend/pages`. */
export const ANNOUNCEMENT_PSEUDO_ROUTES: readonly string[] = [
    LOGIN_SCREEN_ROUTE,
];

export const ANNOUNCEMENT_TARGET_PAGES: readonly AnnouncementTargetPage[] = [
    ...GENERATED_ANNOUNCEMENT_TARGET_PAGES,
    // Screens, not page files
    {
        route: LOGIN_SCREEN_ROUTE,
        label: 'Login screen',
        audience: PageAnnouncementUserOption.ALL_USERS,
    },
];
