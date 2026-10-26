import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readingModeObjectLinks, readingModePhrases, readingModes, teacherRole } from './Constant';
import { behaviour, constants, PageAnnouncementUserOption, ReadingMode } from 'lwp-shared';
import { Linter } from 'eslint';
import { constants, PageAnnouncementUserOption, ReadingMode } from 'lwp-shared';
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import pageTypePlugin from '../eslint-rules/eslint-plugin-page-type.mjs';
import { PageType } from '../types/enums/PageType';
import { readingModeObjectLinks, readingModePhrases, readingModes } from './Constant';

describe('teacherRole', () => {
    // CommonSelectField renders `value` as the option label and submits `key`. If these were the
    // other way round, the dropdown would list "CLASS_TEACHER" and submit "Class teacher", which is
    // not a value the backend TeacherRole enum accepts.
    //
    // The order is pinned too, because AddTeacher and AccountSettings both index in as
    // teacherRole[1] for school leader and teacherRole[0] for class teacher. Reordering the array
    // would silently swap which role each user gets.
    test('submits the role codes and shows human labels, in the order callers index by', () => {
        expect(teacherRole).toEqual([
            { key: 'CLASS_TEACHER', value: 'Class teacher' },
            { key: 'SCHOOL_LEADER', value: 'School leader' }
        ]);
    });
});

describe('readingModes', () => {
    // A mode added to the enum without a row here would compile and store perfectly well, then
    // render with no card, no definition and the fallback verb "read".
    test('describes every way of reading, and only those', () => {
        expect(readingModes.map((mode) => mode.value).sort()).toEqual(Object.values(ReadingMode).sort());
    });

    test.each(readingModes)('$value carries what every surface needs', (mode) => {
        expect(mode.cardLabel).toBeTruthy();
        expect(mode.historyPhrase).toBeTruthy();
        expect(mode.definitionTitle).toBeTruthy();
        expect(mode.definitionBody).toBeTruthy();
        expect(mode.image).toBeTruthy();
        expect(mode.dataTest).toBeTruthy();
        expect(mode.img).toEqual({
            width: expect.any(Number),
            height: expect.any(Number),
            top: expect.any(Number)
        });
    });

    test.each(Object.values(ReadingMode))('%s has a phrase and a link word', (mode) => {
        expect(readingModePhrases[mode]).toBeTruthy();
        expect(readingModeObjectLinks[mode]).toBeDefined();
    });

    test('only asks for a preposition where the phrase needs one', () => {
        expect(readingModeObjectLinks[ReadingMode.LISTENED_TOGETHER]).toBe('to');
        expect(readingModeObjectLinks[ReadingMode.READ_INDEPENDENTLY]).toBe('');
        expect(readingModeObjectLinks[ReadingMode.READ_ALOUD]).toBe('');
        expect(readingModeObjectLinks[ReadingMode.READ_IN_REAL_WORLD]).toBe('');
    });
});

type Scanner = {
    findTargetPages: (pagesFolder: string) => { route: string; label: string; audience: string }[];
    readAllPages: (pagesFolder: string) => { route: string; pageType?: string; pageTitle?: string }[];
    generateAnnouncementPages: (pagesFolder: string, outputFile: string) => void;
    isRouteOrSubRoute: (baseRoute: string, route: string) => boolean;
    ROUTES_TO_LEAVE_OUT: string[];
    SINGLE_ROUTES_TO_LEAVE_OUT: string[];
    AUDIENCE_BY_PAGE_TYPE: Record<string, string>;
};

describe('page announcement target pages', () => {
    // The scanner is plain JavaScript so that shared's build script can load it, so the test loads it the same way.
    const scanner: Scanner = createRequire(import.meta.url)('../generate-announcement-pages.js');
    const {
        findTargetPages,
        readAllPages,
        generateAnnouncementPages,
        isRouteOrSubRoute,
        ROUTES_TO_LEAVE_OUT,
        SINGLE_ROUTES_TO_LEAVE_OUT,
        AUDIENCE_BY_PAGE_TYPE
    } = scanner;
    const { ANNOUNCEMENT_TARGET_PAGES, ANNOUNCEMENT_PSEUDO_ROUTES } = constants;
    // Screens such as the login screen have no page file, so the checks on page files skip them.
    const pageTargets = ANNOUNCEMENT_TARGET_PAGES.filter((page) => !ANNOUNCEMENT_PSEUDO_ROUTES.includes(page.route));
    const realPagesDir = fileURLToPath(new URL('../pages', import.meta.url));
    const tempDirs: string[] = [];

    const tempDir = () => {
        const dir = mkdtempSync(join(tmpdir(), 'announcement-pages-'));

        tempDirs.push(dir);

        return dir;
    };

    // A pages folder in a temp directory, made from { 'path/to/file.tsx': 'what is in the file' }
    const makePages = (files: Record<string, string>) => {
        const dir = tempDir();

        Object.entries(files).forEach(([file, content]) => {
            mkdirSync(dirname(join(dir, file)), { recursive: true });
            writeFileSync(join(dir, file), content);
        });

        return dir;
    };

    const pageOfType = (pageType: string) => `Page.pageType = PageType.${pageType};`;
    const pageWithTitle = (pageType: string, title: string) => `${pageOfType(pageType)}\nPage.pageTitle = '${title}';`;
    const generatedFile = () => join(tempDir(), 'announcementPages.gen.ts');
    const labelsOf = (pagesDir: string) => Object.fromEntries(findTargetPages(pagesDir).map((page) => [page.route, page.label]));

    beforeEach(() => {
        // The writer reports what it did on the console, which would only clutter the test output
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    afterAll(() => {
        tempDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
    });

    test('a new page shows up with no other edit, grouped by who it is for', () => {
        const dir = makePages({
            'about.tsx': pageWithTitle('GENERAL', 'About'),
            'class/[class_id]/reading-report.tsx': pageWithTitle('TEACHER', 'Class: Reading report'),
            'children.tsx': pageWithTitle('PARENT', 'Children'),
            'school/[school_id]/billing.tsx': pageWithTitle('SCHOOL_LEADER', 'School: Billing'),
            'admin/schools.tsx': pageWithTitle('ADMIN', 'Admin: Schools')
        });

        expect(findTargetPages(dir)).toEqual([
            { route: '/school/[school_id]/billing', label: 'School: Billing', audience: 'SCHOOL_LEADER' },
            { route: '/class/[class_id]/reading-report', label: 'Class: Reading report', audience: 'TEACHER' },
            { route: '/children', label: 'Children', audience: 'PARENT' },
            { route: '/about', label: 'About', audience: 'ALL_USERS' },
            { route: '/admin/schools', label: 'Admin: Schools', audience: 'ADMIN' }
        ]);
    });

    test("the picker shows each page's own title, in single or double quotes", () => {
        const dir = makePages({
            'feed/[user_id].tsx': pageWithTitle('TEACHER', 'Teacher: Activity feed'),
            'history.tsx': `${pageOfType('PARENT')}\nPage.pageTitle = "Child: History";`,
            'reading.tsx': `${pageOfType('PARENT')}\nPage.pageTitle = "Child's reading";`
        });

        expect(labelsOf(dir)).toEqual({
            '/feed/[user_id]': 'Teacher: Activity feed',
            '/history': 'Child: History',
            '/reading': "Child's reading"
        });
    });

    // The lint rules only check that some assignment exists, so `Page.pageType = somethingElse` passes lint but not this.
    test('every real page has a page type and a page title the scanner can read', () => {
        const pages = readAllPages(realPagesDir);

        // A wrong folder would give an empty list, and the checks below would pass for the wrong reason
        expect(pages.length).toBeGreaterThan(0);
        expect(pages.filter((page) => !page.pageType).map((page) => page.route)).toEqual([]);
        expect(pages.filter((page) => !page.pageTitle).map((page) => page.route)).toEqual([]);
    });

    test('a page with no readable title is listed by its route, and the build says so', () => {
        const out = generatedFile();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const dir = makePages({ 'fine.tsx': pageWithTitle('TEACHER', 'Fine'), 'untitled.tsx': pageOfType('TEACHER') });

        expect(labelsOf(dir)).toEqual({ '/fine': 'Fine', '/untitled': '/untitled' });

        generateAnnouncementPages(dir, out);

        expect(warn).toHaveBeenCalledWith(expect.stringContaining('/untitled'));
        expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('/fine'));
    });

    // The scanner must never fail a build over one odd file. The test above is what notices a real page like this.
    test('a page whose page type cannot be read is left out, and nothing throws', () => {
        const dir = makePages({
            'fine.tsx': pageOfType('TEACHER'),
            'unreadable.tsx': 'Page.pageType = somethingElse;',
            'no-page-type.tsx': 'export default Page;'
        });

        mkdirSync(join(dir, 'a-folder.tsx'));

        expect(() => findTargetPages(dir)).not.toThrow();
        expect(findTargetPages(dir).map((page) => page.route)).toEqual(['/fine']);
    });

    // A renamed or deleted page would otherwise leave an entry that quietly hides nothing.
    test('every exclusion still matches a page', () => {
        const routes = readAllPages(realPagesDir).map((page) => page.route);

        expect(ROUTES_TO_LEAVE_OUT.filter((entry) => !routes.some((route) => isRouteOrSubRoute(entry, route)))).toEqual([]);
        expect(SINGLE_ROUTES_TO_LEAVE_OUT.filter((route) => !routes.includes(route))).toEqual([]);
    });

    // The list is built from whatever the page files and ROUTES_TO_LEAVE_OUT say, so nothing else would notice an exclusion being deleted.
    // This pins pages the team decided an admin cannot aim an announcement at, and the pages next to them that it can.
    test('the real list leaves out pages where a banner cannot show, and keeps the pages next to them', () => {
        const pages = readAllPages(realPagesDir).map((page) => page.route);
        const listed = findTargetPages(realPagesDir).map((page) => page.route);
        const leftOut = [
            '/logout',
            '/welcome/[pupilParentId]',
            '/log-reading',
            '/topic-library',
            '/set-topic/[topic_id]',
            '/parent/[user_id]',
            '/child/[child_id]',
            '/previewtopic/[topic_id]',
            '/404',
            '/signup/[token]'
        ];
        const kept = [
            '/child/[child_id]/history',
            '/school/[school_id]/log-reading',
            '/school/[school_id]/topic-library',
            '/school/[school_id]/set-topic/[topic_id]'
        ];

        // Every route named here has to be a real page, or the two checks below would pass for the wrong reason
        expect([...leftOut, ...kept].filter((route) => !pages.includes(route))).toEqual([]);
        expect(leftOut.filter((route) => listed.includes(route))).toEqual([]);
        expect(kept.filter((route) => !listed.includes(route))).toEqual([]);
    });

    test('an exclusion hides the route and everything under it, and nothing else', () => {
        const dir = makePages({
            'index.tsx': pageOfType('GENERAL'),
            'about.tsx': pageOfType('GENERAL'),
            'signup/index.tsx': pageOfType('GENERAL'),
            'signup/[token].tsx': pageOfType('GENERAL'),
            'signup-help.tsx': pageOfType('GENERAL'),
            'auth/two-factor.tsx': pageOfType('GENERAL'),
            'authors.tsx': pageOfType('GENERAL')
        });

        expect(findTargetPages(dir).map((page) => page.route)).toEqual(['/about', '/authors', '/signup-help']);
    });

    test('an exclusion for one page leaves the pages beside it', () => {
        const [route] = SINGLE_ROUTES_TO_LEAVE_OUT;
        const dir = makePages({
            [`${route.slice(1)}/index.tsx`]: pageOfType('PARENT'),
            [`${route.slice(1)}/beside-it.tsx`]: pageOfType('PARENT')
        });

        expect(findTargetPages(dir).map((page) => page.route)).toEqual([`${route}/beside-it`]);
    });

    // A new page type needs a decision: can an announcement be aimed at it?
    test('knows every page type, and aims each at a user option the picker offers', () => {
        expect(Object.keys(AUDIENCE_BY_PAGE_TYPE).sort()).toEqual(Object.values(PageType).sort());
        expect(
            Object.values(AUDIENCE_BY_PAGE_TYPE).filter((audience) => !Object.values<string>(PageAnnouncementUserOption).includes(audience))
        ).toEqual([]);
    });

    test('a missing pages folder gives an empty list', () => {
        expect(findTargetPages(join(tmpdir(), 'announcement-pages-that-does-not-exist'))).toEqual([]);
    });

    test('writes the list for shared to compile', () => {
        const out = generatedFile();

        generateAnnouncementPages(
            makePages({
                'class/[class_id]/pupils.tsx': pageWithTitle('TEACHER', 'Class: Pupils'),
                'about.tsx': pageWithTitle('GENERAL', 'About')
            }),
            out
        );

        const source = readFileSync(out, 'utf8');

        expect(source).toContain(
            '{ route: "/class/[class_id]/pupils", label: "Class: Pupils", audience: PageAnnouncementUserOption.TEACHER },'
        );
        expect(source).toContain('{ route: "/about", label: "About", audience: PageAnnouncementUserOption.ALL_USERS },');
    });

    // Rewriting an identical file would make every compiler and file watcher that sees it start again for nothing.
    test('leaves the file alone when nothing has changed', () => {
        const dir = makePages({ 'about.tsx': pageOfType('GENERAL') });
        const out = generatedFile();
        const longAgo = new Date(2020, 0, 1);

        generateAnnouncementPages(dir, out);
        utimesSync(out, longAgo, longAgo);
        generateAnnouncementPages(dir, out);

        expect(statSync(out).mtime).toEqual(longAgo);
    });

    // The schema diff workflow compares everything `yarn references:build` prints to stdout with the base branch's, so a line
    // there would show up as a schema change on every pull request.
    test('reports what it did on stderr and leaves stdout alone', () => {
        generateAnnouncementPages(makePages({ 'about.tsx': pageOfType('GENERAL') }), generatedFile());

        expect(console.log).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('1 of 1 pages'));
    });

    // An empty list would quietly stop every page-specific announcement from showing, so the build stops instead.
    test('stops the build rather than write an empty list', () => {
        const out = generatedFile();

        expect(() => generateAnnouncementPages(tempDir(), out)).toThrow('no page files');
        expect(existsSync(out)).toBe(false);
    });

    test('says so when a page type cannot be read, and still lists the other pages', () => {
        const out = generatedFile();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        generateAnnouncementPages(makePages({ 'fine.tsx': pageOfType('TEACHER'), 'odd.tsx': 'Page.pageType = somethingElse;' }), out);

        expect(warn).toHaveBeenCalledWith(expect.stringContaining('/odd'));
        expect(readFileSync(out, 'utf8')).toContain('"/fine"');
    });

    test('gives every screen a route no page file can have, and makes it a target', () => {
        const routes = readAllPages(realPagesDir).map((page) => page.route);
        const targetRoutes = ANNOUNCEMENT_TARGET_PAGES.map((page) => page.route);

        expect(ANNOUNCEMENT_PSEUDO_ROUTES.filter((route) => routes.includes(route) || !targetRoutes.includes(route))).toEqual([]);
    });

    // shared is built from the pages by `yarn references:build`. A build that skipped it would hand the app the list of an older build.
    test('the list shared was built with is the list the pages give now', () => {
        expect(pageTargets, 'shared was built from other pages than these. Run: yarn workspace graphql-provider references:build').toEqual(
            findTargetPages(realPagesDir)
        );
    });

    test('lists every route once, and gives each page a name of its own', () => {
        const routes = ANNOUNCEMENT_TARGET_PAGES.map((page) => page.route);
        const labels = ANNOUNCEMENT_TARGET_PAGES.map((page) => page.label);

        expect(routes.filter((route, i) => routes.indexOf(route) !== i)).toEqual([]);
        expect(labels.every((label) => label.trim())).toBe(true);
        // Two pages with one name can't be told apart in the picker. Give one of them a different `Page.pageTitle = '...'`.
        expect(labels.filter((label, i) => labels.indexOf(label) !== i)).toEqual([]);
    });

    // A logged-out user only sees the banner on the pages AuthProvider opens without logging in, so the two lists must agree.
    test('the logged-out pages are exactly the targets AuthProvider opens without logging in', () => {
        const authProvider = readFileSync(fileURLToPath(new URL('../components/AuthProvider/index.jsx', import.meta.url)), 'utf8');
        const publicPrefixes = [...authProvider.matchAll(/finalPath\.startsWith\('([^']+)'\)/g)].map((match) => match[1]);
        const isPublic = (route: string) => publicPrefixes.some((prefix) => route.startsWith(prefix));
        const { LOGGED_OUT_ROUTES, LOGIN_SCREEN_ROUTE } = behaviour.announcementPages;

        expect(publicPrefixes.length).toBeGreaterThan(0);
        expect(
            pageTargets
                .map((page) => page.route)
                .filter(isPublic)
                .sort()
        ).toEqual(LOGGED_OUT_ROUTES.filter((route) => route !== LOGIN_SCREEN_ROUTE).sort());
    });
});

// The scanner reads a title as plain text up to the next matching quote, so lint must refuse any title the scanner would misread.
describe('page title lint rule', () => {
    const lintTitle = (titleAsWritten: string) =>
        new Linter({ configType: 'flat' })
            .verify(
                `const Page = () => null;\nPage.pageType = PageType.PARENT;\nPage.pageTitle = ${titleAsWritten};\nexport default Page;`,
                [{ files: ['**/*.js'], plugins: { 'page-type': pageTypePlugin }, rules: { 'page-type/require-page-title': 'error' } }],
                { filename: join(process.cwd(), 'pages', 'reading.js') }
            )
            .map((message) => message.messageId ?? message.message);

    test('accepts a plain title, and an apostrophe inside double quotes', () => {
        expect(lintTitle(`'Child: Reading'`)).toEqual([]);
        expect(lintTitle(`"Child's reading"`)).toEqual([]);
    });

    test('refuses a title written with a backslash, which the scanner would misread', () => {
        // String.raw keeps the backslash, so the page file holds 'Child\'s reading' exactly as a developer would type it
        expect(lintTitle(String.raw`'Child\'s reading'`)).toEqual(['invalid']);
    });
});
