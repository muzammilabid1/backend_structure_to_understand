import { behaviour, constants, PageAnnouncementUserOption, UserType } from 'lwp-shared';
import { describe, expect, test } from 'vitest';

const {
    AnnouncementViewer,
    LOGIN_SCREEN_ROUTE,
    LOGGED_OUT_ROUTES,
    getAnnouncementViewer,
    getPagesReachableBy,
    getRoutesViewerCanSee,
    getTargetPageLabels,
    isAnnouncementShownOnRoute
} = behaviour.announcementPages;
const { ALL_USERS, ADMIN, PARENT, SCHOOL_LEADER, TEACHER } = PageAnnouncementUserOption;
const {
    LOGGED_OUT,
    PARENT: PARENT_VIEWER,
    TEACHER: TEACHER_VIEWER,
    SCHOOL_LEADER: LEADER_VIEWER,
    HELPER,
    ADMIN: ADMIN_VIEWER
} = AnnouncementViewer;

const SCHOOL_FEED = '/school/[school_id]/feed';
const TEACHER_FEED = '/feed/[user_id]';
const CLASS_PUPILS = '/class/[class_id]/pupils';
const CHILD_HISTORY = '/child/[child_id]/history';
const FAQS = '/faqs';
const FEEDBACK = '/feedback';
const ADMIN_ANNOUNCEMENTS = '/admin/announcements';

const routesFor = (userOptions: PageAnnouncementUserOption[]) => getPagesReachableBy(userOptions).map((page) => page.route);

describe('getAnnouncementViewer', () => {
    test('maps every kind of token to a viewer', () => {
        expect(getAnnouncementViewer(null)).toBe(LOGGED_OUT);
        expect(getAnnouncementViewer(undefined)).toBe(LOGGED_OUT);
        expect(getAnnouncementViewer({})).toBe(LOGGED_OUT);
        expect(getAnnouncementViewer({ userType: UserType.ADMIN })).toBe(ADMIN_VIEWER);
        expect(getAnnouncementViewer({ userType: UserType.TEACHER, isSchoolLeader: false })).toBe(TEACHER_VIEWER);
        expect(getAnnouncementViewer({ userType: UserType.TEACHER, isSchoolLeader: true })).toBe(LEADER_VIEWER);
        expect(getAnnouncementViewer({ userType: UserType.PARENT })).toBe(PARENT_VIEWER);
        expect(getAnnouncementViewer({ userType: UserType.MAGICPARENT })).toBe(PARENT_VIEWER);
        expect(getAnnouncementViewer({ userType: UserType.TOPICACCESS })).toBe(PARENT_VIEWER);
        expect(getAnnouncementViewer({ userType: UserType.HELPER })).toBe(HELPER);
    });
});

describe('getRoutesViewerCanSee', () => {
    test('a parent sees parent and general pages only', () => {
        expect(getRoutesViewerCanSee(PARENT_VIEWER)).toEqual(expect.arrayContaining([CHILD_HISTORY, FAQS, FEEDBACK]));
        expect(getRoutesViewerCanSee(PARENT_VIEWER)).not.toContain(TEACHER_FEED);
        expect(getRoutesViewerCanSee(PARENT_VIEWER)).not.toContain(SCHOOL_FEED);
    });

    test('a teacher sees teacher and general pages, not school leader or parent pages', () => {
        expect(getRoutesViewerCanSee(TEACHER_VIEWER)).toEqual(expect.arrayContaining([TEACHER_FEED, CLASS_PUPILS, FAQS]));
        expect(getRoutesViewerCanSee(TEACHER_VIEWER)).not.toContain(SCHOOL_FEED);
        expect(getRoutesViewerCanSee(TEACHER_VIEWER)).not.toContain(CHILD_HISTORY);
    });

    test('a school leader sees school leader, teacher and general pages, but not the teacher feed they are always redirected from', () => {
        expect(getRoutesViewerCanSee(LEADER_VIEWER)).toEqual(expect.arrayContaining([SCHOOL_FEED, CLASS_PUPILS, FAQS]));
        expect(getRoutesViewerCanSee(LEADER_VIEWER)).not.toContain(TEACHER_FEED);
        expect(getRoutesViewerCanSee(LEADER_VIEWER)).not.toContain(CHILD_HISTORY);
    });

    test('a helper sees general pages only', () => {
        expect(getRoutesViewerCanSee(HELPER)).toEqual(expect.arrayContaining([FAQS, FEEDBACK]));
        expect(getRoutesViewerCanSee(HELPER)).not.toContain(CHILD_HISTORY);
        expect(getRoutesViewerCanSee(HELPER)).not.toContain(TEACHER_FEED);
        expect(getRoutesViewerCanSee(HELPER)).not.toContain(ADMIN_ANNOUNCEMENTS);
    });

    test('an admin sees admin and general pages, not parent, teacher or school leader pages', () => {
        expect(getRoutesViewerCanSee(ADMIN_VIEWER)).toEqual(expect.arrayContaining([ADMIN_ANNOUNCEMENTS, FAQS, FEEDBACK]));
        expect(getRoutesViewerCanSee(ADMIN_VIEWER)).not.toContain(CHILD_HISTORY);
        expect(getRoutesViewerCanSee(ADMIN_VIEWER)).not.toContain(TEACHER_FEED);
        expect(getRoutesViewerCanSee(ADMIN_VIEWER)).not.toContain(SCHOOL_FEED);
    });

    test('nobody but an admin sees an admin page', () => {
        for (const viewer of [LOGGED_OUT, PARENT_VIEWER, TEACHER_VIEWER, LEADER_VIEWER, HELPER]) {
            expect(getRoutesViewerCanSee(viewer).filter((route) => route.startsWith('/admin'))).toEqual([]);
        }
    });

    test('a logged-out user sees the login screen and the public pages only', () => {
        expect(getRoutesViewerCanSee(LOGGED_OUT).sort()).toEqual([...LOGGED_OUT_ROUTES].sort());
        expect(getRoutesViewerCanSee(LOGGED_OUT)).toContain(LOGIN_SCREEN_ROUTE);
        expect(getRoutesViewerCanSee(LOGGED_OUT)).not.toContain(FEEDBACK);
    });

    test('nobody logged in sees the login screen', () => {
        for (const viewer of [PARENT_VIEWER, TEACHER_VIEWER, LEADER_VIEWER, HELPER, ADMIN_VIEWER]) {
            expect(getRoutesViewerCanSee(viewer)).not.toContain(LOGIN_SCREEN_ROUTE);
        }
    });

    test('lists only registered target pages, so a page that left the registry reaches nobody', () => {
        const targetRoutes = constants.ANNOUNCEMENT_TARGET_PAGES.map((page) => page.route);

        for (const viewer of Object.values(AnnouncementViewer)) {
            expect(getRoutesViewerCanSee(viewer).filter((route) => !targetRoutes.includes(route))).toEqual([]);
        }
    });
});

describe('getPagesReachableBy (the admin picker)', () => {
    test('offers school leaders their pages and teacher pages, without the teacher feed they never see', () => {
        expect(routesFor([SCHOOL_LEADER])).toEqual(expect.arrayContaining([SCHOOL_FEED, CLASS_PUPILS, FAQS]));
        expect(routesFor([SCHOOL_LEADER])).not.toContain(TEACHER_FEED);
    });

    test('offers teachers teacher and general pages only', () => {
        expect(routesFor([TEACHER])).toEqual(expect.arrayContaining([TEACHER_FEED, CLASS_PUPILS, FAQS]));
        expect(routesFor([TEACHER])).not.toContain(SCHOOL_FEED);
        expect(routesFor([TEACHER])).not.toContain(CHILD_HISTORY);
    });

    test('offers parents parent and general pages only', () => {
        expect(routesFor([PARENT])).toEqual(expect.arrayContaining([CHILD_HISTORY, FAQS]));
        expect(routesFor([PARENT])).not.toContain(SCHOOL_FEED);
        expect(routesFor([PARENT])).not.toContain(TEACHER_FEED);
    });

    test('offers All users every page including the login screen, but no admin page', () => {
        expect(routesFor([ALL_USERS])).toEqual(
            expect.arrayContaining([SCHOOL_FEED, TEACHER_FEED, CHILD_HISTORY, FAQS, LOGIN_SCREEN_ROUTE])
        );
        expect(routesFor([ALL_USERS])).not.toContain(ADMIN_ANNOUNCEMENTS);
    });

    test('offers no user type, or parents, teachers and school leaders together, every page except the login screen and admin pages', () => {
        expect(routesFor([])).toEqual(expect.arrayContaining([SCHOOL_FEED, TEACHER_FEED, CHILD_HISTORY, FAQS]));
        for (const userOptions of [[], [TEACHER, SCHOOL_LEADER, PARENT]]) {
            expect(routesFor(userOptions)).not.toContain(LOGIN_SCREEN_ROUTE);
            expect(routesFor(userOptions)).not.toContain(ADMIN_ANNOUNCEMENTS);
        }
    });

    test('offers Admin admin and general pages only', () => {
        expect(routesFor([ADMIN])).toEqual(expect.arrayContaining([ADMIN_ANNOUNCEMENTS, FAQS]));
        expect(routesFor([ADMIN])).not.toContain(CHILD_HISTORY);
        expect(routesFor([ADMIN])).not.toContain(TEACHER_FEED);
        expect(routesFor([ADMIN])).not.toContain(SCHOOL_FEED);
    });

    test('combines the pages of every chosen user type', () => {
        expect(routesFor([PARENT, TEACHER])).toEqual(expect.arrayContaining([CHILD_HISTORY, TEACHER_FEED]));
    });

    test('never offers a page that none of the chosen user types could see', () => {
        const viewersByOption = {
            [SCHOOL_LEADER]: [LEADER_VIEWER],
            [TEACHER]: [TEACHER_VIEWER],
            [PARENT]: [PARENT_VIEWER],
            [ALL_USERS]: [LOGGED_OUT, PARENT_VIEWER, TEACHER_VIEWER, LEADER_VIEWER, HELPER],
            [ADMIN]: [ADMIN_VIEWER]
        };

        for (const [option, viewers] of Object.entries(viewersByOption)) {
            for (const route of routesFor([option as PageAnnouncementUserOption])) {
                expect(
                    viewers.some((viewer) => getRoutesViewerCanSee(viewer).includes(route)),
                    `${option} offers ${route}`
                ).toBe(true);
            }
        }
    });
});

describe('getTargetPageLabels', () => {
    test('gives the registry label for each target page', () => {
        expect(getTargetPageLabels([TEACHER_FEED, SCHOOL_FEED])).toEqual(['School: Activity feed', 'Teacher: Activity feed']);
        expect(getTargetPageLabels([LOGIN_SCREEN_ROUTE])).toEqual(['Login screen']);
    });

    test('names only the viewer’s own pages when given a viewer', () => {
        expect(getTargetPageLabels([TEACHER_FEED, CHILD_HISTORY], PARENT_VIEWER)).toEqual(['Child: History']);
        expect(getTargetPageLabels([TEACHER_FEED, CHILD_HISTORY], TEACHER_VIEWER)).toEqual(['Teacher: Activity feed']);
    });

    test('gives no labels for no pages, or for pages not in the registry', () => {
        expect(getTargetPageLabels([])).toEqual([]);
        expect(getTargetPageLabels(undefined)).toEqual([]);
        expect(getTargetPageLabels(['/not-a-page'])).toEqual([]);
    });
});

describe('isAnnouncementShownOnRoute (the banner)', () => {
    test('shows an announcement with no target pages on every route', () => {
        expect(isAnnouncementShownOnRoute([], SCHOOL_FEED, LEADER_VIEWER)).toBe(true);
        expect(isAnnouncementShownOnRoute(undefined, '/anything', TEACHER_VIEWER)).toBe(true);
    });

    test('shows a targeted announcement only on its routes', () => {
        expect(isAnnouncementShownOnRoute([SCHOOL_FEED, FAQS], SCHOOL_FEED, LEADER_VIEWER)).toBe(true);
        expect(isAnnouncementShownOnRoute([SCHOOL_FEED, FAQS], CLASS_PUPILS, LEADER_VIEWER)).toBe(false);
    });

    test('matches route templates, not real URLs', () => {
        expect(isAnnouncementShownOnRoute([SCHOOL_FEED], '/school/12/feed', LEADER_VIEWER)).toBe(false);
    });

    test('never shows on a route the viewer can’t see, even if the announcement names it', () => {
        expect(isAnnouncementShownOnRoute([LOGIN_SCREEN_ROUTE], LOGIN_SCREEN_ROUTE, TEACHER_VIEWER)).toBe(false);
        expect(isAnnouncementShownOnRoute([LOGIN_SCREEN_ROUTE], LOGIN_SCREEN_ROUTE, LOGGED_OUT)).toBe(true);
        expect(isAnnouncementShownOnRoute(['/not-a-page'], '/not-a-page', TEACHER_VIEWER)).toBe(false);
    });
});
