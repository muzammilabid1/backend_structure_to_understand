import {
    ANNOUNCEMENT_TARGET_PAGES,
    AnnouncementTargetPage,
    LOGIN_SCREEN_ROUTE,
} from '../constants/announcementPages';
import { PageAnnouncementUserOption } from '../enums/PageAnnouncementUserOption';
import { UserType } from '../enums/UserType';

const { ALL_USERS, ADMIN, SCHOOL_LEADER, TEACHER, PARENT } =
    PageAnnouncementUserOption;

export { LOGIN_SCREEN_ROUTE };

/**
 * Who is looking at a page, for deciding which page announcements they can ever see. Every rule below is
 * written per viewer, so the admin picker, the backend queries, the banner, the bell and the drawer all agree.
 */
export enum AnnouncementViewer {
    LOGGED_OUT = 'LOGGED_OUT',
    PARENT = 'PARENT',
    TEACHER = 'TEACHER',
    SCHOOL_LEADER = 'SCHOOL_LEADER',
    HELPER = 'HELPER',
    ADMIN = 'ADMIN',
}

/** The viewer for a token (or a user row). No user type means nobody is logged in. */
export const getAnnouncementViewer = (
    user:
        | { userType?: string | null; isSchoolLeader?: boolean | null }
        | null
        | undefined,
): AnnouncementViewer => {
    switch (user?.userType) {
        case undefined:
        case null:
        case '':
            return AnnouncementViewer.LOGGED_OUT;
        case UserType.ADMIN:
            return AnnouncementViewer.ADMIN;
        case UserType.TEACHER:
            return user.isSchoolLeader
                ? AnnouncementViewer.SCHOOL_LEADER
                : AnnouncementViewer.TEACHER;
        case UserType.PARENT:
        case UserType.MAGICPARENT:
        case UserType.TOPICACCESS:
            return AnnouncementViewer.PARENT;
        default:
            // Helpers, and any user type added later, only get pages open to everyone
            return AnnouncementViewer.HELPER;
    }
};

/**
 * The page audiences each logged-in viewer can open (see PageInfoContext). School leaders are teachers, so
 * they open teacher pages too. Teachers open parent pages only to view as a parent, where the banner is
 * hidden, so parent pages don't count for them. Admins open every page, but only admin pages and pages for
 * everyone count: announcements aimed at parents or teachers are not for them.
 */
const VIEWER_AUDIENCES: Record<
    AnnouncementViewer,
    PageAnnouncementUserOption[]
> = {
    [AnnouncementViewer.LOGGED_OUT]: [],
    [AnnouncementViewer.PARENT]: [ALL_USERS, PARENT],
    [AnnouncementViewer.TEACHER]: [ALL_USERS, TEACHER],
    [AnnouncementViewer.SCHOOL_LEADER]: [ALL_USERS, TEACHER, SCHOOL_LEADER],
    [AnnouncementViewer.HELPER]: [ALL_USERS],
    [AnnouncementViewer.ADMIN]: [ALL_USERS, ADMIN],
};

/**
 * Pages that always send a viewer somewhere else before the page renders, so that viewer never sees a
 * banner there. `/feed/[user_id]` sends school leaders to `/school/[school_id]/feed`.
 */
const REDIRECTED_AWAY: Partial<Record<AnnouncementViewer, string[]>> = {
    [AnnouncementViewer.SCHOOL_LEADER]: ['/feed/[user_id]'],
};

/**
 * What a logged-out user can see: the login screen, and the pages AuthProvider opens without logging in
 * (its `isUnAuthenticatedComponent` prefixes). Every other URL shows them the login screen instead.
 */
export const LOGGED_OUT_ROUTES: readonly string[] = [
    LOGIN_SCREEN_ROUTE,
    '/faqs',
    '/impact-report/[token]',
];

/** Every target route this viewer can ever see a banner on. */
export const getRoutesViewerCanSee = (viewer: AnnouncementViewer): string[] => {
    if (viewer === AnnouncementViewer.LOGGED_OUT) return [...LOGGED_OUT_ROUTES];

    const audiences = VIEWER_AUDIENCES[viewer];
    const redirectedAway = REDIRECTED_AWAY[viewer] || [];

    return ANNOUNCEMENT_TARGET_PAGES.filter(
        (page) =>
            page.route !== LOGIN_SCREEN_ROUTE &&
            audiences.includes(page.audience) &&
            !redirectedAway.includes(page.route),
    ).map((page) => page.route);
};

/**
 * The viewers each user option is offered pages for. TEACHER also reaches school leaders at runtime (they
 * are teachers), but the picker deliberately offers it teacher pages only: a school leader page aimed at
 * "Teacher" would reach leaders alone, which is what SCHOOL_LEADER is for. In the same way ALL_USERS reaches
 * admins at runtime but is not offered admin pages, which is what ADMIN is for. No user options means teachers,
 * school leaders and parents (see the visibility query in StaticLwpPageAnnouncementService).
 */
const VIEWERS_BY_OPTION: Record<
    PageAnnouncementUserOption,
    AnnouncementViewer[]
> = {
    [ALL_USERS]: [
        AnnouncementViewer.LOGGED_OUT,
        AnnouncementViewer.PARENT,
        AnnouncementViewer.TEACHER,
        AnnouncementViewer.SCHOOL_LEADER,
        AnnouncementViewer.HELPER,
    ],
    [SCHOOL_LEADER]: [AnnouncementViewer.SCHOOL_LEADER],
    [TEACHER]: [AnnouncementViewer.TEACHER],
    [PARENT]: [AnnouncementViewer.PARENT],
    [ADMIN]: [AnnouncementViewer.ADMIN],
};
const VIEWERS_FOR_NO_OPTIONS = [
    AnnouncementViewer.PARENT,
    AnnouncementViewer.TEACHER,
    AnnouncementViewer.SCHOOL_LEADER,
];

/** The pages an announcement aimed at these user options can appear on: what the admin picker offers. */
export const getPagesReachableBy = (
    userOptions: PageAnnouncementUserOption[],
): AnnouncementTargetPage[] => {
    const viewers = userOptions?.length
        ? userOptions.flatMap((option) => VIEWERS_BY_OPTION[option] || [])
        : VIEWERS_FOR_NO_OPTIONS;
    const routes = new Set(viewers.flatMap(getRoutesViewerCanSee));

    return ANNOUNCEMENT_TARGET_PAGES.filter((page) => routes.has(page.route));
};

/**
 * The labels for these target pages, in registry order. Empty means every page. With a viewer, only the
 * pages that viewer can see are named, so nobody is shown pages that aren't theirs.
 */
export const getTargetPageLabels = (
    targetPages: string[] | null | undefined,
    viewer?: AnnouncementViewer,
): string[] => {
    const viewerRoutes = viewer ? getRoutesViewerCanSee(viewer) : null;

    return ANNOUNCEMENT_TARGET_PAGES.filter(
        (page) =>
            targetPages?.includes(page.route) &&
            (!viewerRoutes || viewerRoutes.includes(page.route)),
    ).map((page) => page.label);
};

/**
 * Whether the banner can show this announcement to this viewer on this route: it is aimed at every page, or
 * at this route and this route is one the viewer can see.
 */
export const isAnnouncementShownOnRoute = (
    targetPages: string[] | null | undefined,
    route: string,
    viewer: AnnouncementViewer,
): boolean =>
    !targetPages?.length ||
    (targetPages.includes(route) &&
        getRoutesViewerCanSee(viewer).includes(route));
