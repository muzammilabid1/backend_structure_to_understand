// WHAT THIS FILE DOES
// An admin can aim a page announcement at chosen pages. To offer those pages in a list, the app has to know which pages exist
// and who each one is for. This file works that out by reading the page files in frontend/pages. It writes the result into a
// generated file inside shared/, so the website and the backend both use exactly the same list.
//
// WHEN IT RUNS
// shared/buildReferences.mjs runs it every time shared is built (yarn references:build). Nobody keeps the list by hand:
// add a page, and it appears in the list on the next build. More detail: docs/frontend/page-inventory.md.
//
// WORDS USED IN THIS FILE
// - route: the address pattern of a page, such as /school/[school_id]/feed. The [school_id] part stands for any school.
// - page type: what a page file says about who the page is for (admin, teacher, parent, and so on).
// - page title: the readable name a page file gives itself (`Page.pageTitle = 'Class: Pupils';`). It is the name shown in the picker.
// - audience: the group of users a page is listed under in the picker.
const fs = require('fs');
const path = require('path');

// Pages that should NOT be offered in the picker, because a banner makes no sense there.
// Each entry covers that page and every page under it: '/signup' also covers '/signup/[token]', but not '/signup-help'.
// ('/' covers only the home page itself.)
// When you add a new page of one of these kinds, add its route here.
const ROUTES_TO_LEAVE_OUT = [
    // Pages that send the user somewhere else straight away, or only show one short message
    '/',
    '/logout',
    '/auth',
    '/magic',
    // Teachers always get sent to the school version of these pages (/school/[school_id]/...), so that is the one to pick instead
    '/log-reading',
    '/topic-library',
    '/set-topic',
    // The announcement banner never shows on this page
    '/welcome',
    // Previews and demos: a banner would get in the way of what is being shown
    '/previewtopic',
    '/previewactivity',
    '/topicdemo',
    '/activitydemo',
    // Error and dead-end pages: a banner would distract from the one message on the page
    '/403',
    '/404',
    '/unauthorized',
    '/account-not-found',
    '/account-not-linked',
    '/cannot-link-account',
    '/wrong-account',
    '/child-rejected',
    // One-off sign-up and password steps, which people reach before they are logged in
    '/signup',
    '/signup-success',
    '/forgot-password',
    '/reset-password',
    '/registeremail',
    '/reject-invitation',
    '/check-your-email-or-phone'
];

// Pages to leave out one by one. Here the pages next to them (such as /child/[child_id]/history) must stay in the picker,
// so we cannot leave out the whole group like above.
const SINGLE_ROUTES_TO_LEAVE_OUT = [
    // A parent with one child is sent straight to that child, so few parents ever see this page
    '/parent/[user_id]',
    // Computers are sent on to the reading or topics page. Only phones stay on this one
    '/child/[child_id]'
];

// Who each page type is for, written as the name of a choice in the announcement picker (PageAnnouncementUserOption).
// The order here is also the order of the list.
// These are plain text because this file is JavaScript and cannot load the TypeScript enum. The generated file uses the real
// enum, so the compiler complains if a name here is wrong.
const AUDIENCE_BY_PAGE_TYPE = {
    SCHOOL_LEADER: 'SCHOOL_LEADER',
    TEACHER: 'TEACHER',
    PARENT: 'PARENT',
    GENERAL: 'ALL_USERS',
    ADMIN: 'ADMIN'
};

// The folder with the page files, and the file the list is written into
const PAGES_FOLDER = path.join(__dirname, 'pages');
const GENERATED_LIST_FILE = path.join(__dirname, '..', 'shared', 'constants', 'announcementPages.gen.ts');

// True when `route` is `baseRoute` itself or sits under it. '/signup/[token]' sits under '/signup', but '/signup-help' does not.
const isRouteOrSubRoute = (baseRoute, route) => route === baseRoute || route.startsWith(`${baseRoute}/`);

// True when a page should not be offered in the picker
const isLeftOut = (route) =>
    SINGLE_ROUTES_TO_LEAVE_OUT.includes(route) || ROUTES_TO_LEAVE_OUT.some((leftOutRoute) => isRouteOrSubRoute(leftOutRoute, route));

// Turns the path of a page file into its route, the way Next.js does.
// Example: `school/[school_id]/feed/index.js` becomes `/school/[school_id]/feed`
const routeFromFilePath = (filePath) =>
    ('/' + filePath.replace(/\.(js|jsx|ts|tsx)$/, '').replace(/(^|\/)index$/, '')).replace(/\/$/, '') || '/';

// Reads one page file and returns what it says about itself:
// - its page type (who the page is for), and
// - its page title (the `pageTitle` line), which is the name shown in the picker.
// If the file cannot be read it returns nothing instead of crashing, so one odd file cannot break the build.
function readPageFile(filePath) {
    try {
        const pageSource = fs.readFileSync(filePath, 'utf8');

        return {
            pageType: /pageType\s*=\s*PageType\.([A-Z_]+)/.exec(pageSource)?.[1],
            pageTitle: /pageTitle\s*=\s*(['"])(.+?)\1/.exec(pageSource)?.[2]
        };
    } catch {
        return {};
    }
}

// Finds every page file in the pages folder and reads each one.
// Files in api/ and _app / _document are not pages, so they are skipped. If the folder does not exist, the result is empty.
function readAllPages(pagesFolder = PAGES_FOLDER) {
    if (!fs.existsSync(pagesFolder)) return [];

    return fs
        .readdirSync(pagesFolder, { recursive: true, encoding: 'utf8' })
        .map((filePath) => filePath.replaceAll('\\', '/')) // Windows writes paths with \, routes always use /
        .filter((filePath) => /\.(js|jsx|ts|tsx)$/.test(filePath) && !filePath.startsWith('api/') && !/^_(app|document)\./.test(filePath))
        .map((filePath) => ({ route: routeFromFilePath(filePath), ...readPageFile(path.join(pagesFolder, filePath)) }));
}

// From all the pages, picks the ones an announcement can be aimed at, and puts them in order: first by audience, then by route.
// A page is dropped when:
// - its page type cannot be read (the app treats such a page as an admin page, but we cannot be sure it is one), or
// - it is on the leave-out lists above.
// The picker shows each page's page title. The name is only for display: the database stores the route, so changing a title never
// breaks a saved announcement. Lint and a test make sure every page has a title; if one slips through, the route is shown instead.
// Text is compared with < instead of localeCompare, so every computer gives the same order.
function pickTargetPages(pages) {
    const audienceOrder = Object.values(AUDIENCE_BY_PAGE_TYPE);

    return pages
        .filter(({ route, pageType }) => AUDIENCE_BY_PAGE_TYPE[pageType] && !isLeftOut(route))
        .map(({ route, pageType, pageTitle }) => ({
            route,
            label: pageTitle || route,
            audience: AUDIENCE_BY_PAGE_TYPE[pageType]
        }))
        .sort(
            (first, second) =>
                audienceOrder.indexOf(first.audience) - audienceOrder.indexOf(second.audience) || (first.route < second.route ? -1 : 1)
        );
}

// Reads the pages folder and returns the pages an announcement can be aimed at
const findTargetPages = (pagesFolder = PAGES_FOLDER) => pickTargetPages(readAllPages(pagesFolder));

// Builds the text of the generated file
const buildGeneratedFileText = (targetPages) =>
    [
        '// This file is generated by frontend/generate-announcement-pages.js from frontend/pages, every time shared is built (yarn references:build).',
        '// It is not committed. Do not edit it by hand: the next build overwrites it.',
        "import { PageAnnouncementUserOption } from '../enums/PageAnnouncementUserOption';",
        '',
        'export const GENERATED_ANNOUNCEMENT_TARGET_PAGES = [',
        ...targetPages.map(
            ({ route, label, audience }) =>
                `    { route: ${JSON.stringify(route)}, label: ${JSON.stringify(label)}, audience: PageAnnouncementUserOption.${audience} },`
        ),
        '];',
        ''
    ].join('\n');

// The main step. Writes the generated file that shared/constants/announcementPages.ts imports.
function generateAnnouncementPages(pagesFolder = PAGES_FOLDER, outputFile = GENERATED_LIST_FILE) {
    const pages = readAllPages(pagesFolder);

    // No page files means no list, so stop the build. An empty list would quietly stop every page-specific announcement from showing.
    if (!pages.length) throw new Error(`announcement pages: no page files in ${pagesFolder}, so there is no list to build`);

    const routesWithUnreadablePageType = pages.filter(({ pageType }) => !AUDIENCE_BY_PAGE_TYPE[pageType]).map(({ route }) => route);

    if (routesWithUnreadablePageType.length) {
        console.warn(`announcement pages: left out because their pageType can't be read: ${routesWithUnreadablePageType.join(', ')}`);
    }

    const targetPages = pickTargetPages(pages);
    const targetRoutes = new Set(targetPages.map(({ route }) => route));
    const routesWithoutTitle = pages.filter(({ route, pageTitle }) => targetRoutes.has(route) && !pageTitle).map(({ route }) => route);

    if (routesWithoutTitle.length) {
        console.warn(
            `announcement pages: no pageTitle can be read, so the route is shown in the picker instead: ${routesWithoutTitle.join(', ')}`
        );
    }

    const newFileText = buildGeneratedFileText(targetPages);

    // Only write when something changed, so an unchanged list leaves the file (and anything watching it) alone
    if (!fs.existsSync(outputFile) || fs.readFileSync(outputFile, 'utf8') !== newFileText) fs.writeFileSync(outputFile, newFileText);

    // This goes to the error output on purpose. The "Schema diff" workflow compares everything the build prints to normal output
    // with the base branch's, so a new line there would show up as a false change on every pull request.
    console.error(
        `announcement pages: ${targetPages.length} of ${pages.length} pages can take an announcement (${path.basename(outputFile)})`
    );
}

module.exports = {
    generateAnnouncementPages,
    findTargetPages,
    pickTargetPages,
    readAllPages,
    buildGeneratedFileText,
    isRouteOrSubRoute,
    ROUTES_TO_LEAVE_OUT,
    SINGLE_ROUTES_TO_LEAVE_OUT,
    AUDIENCE_BY_PAGE_TYPE
};
