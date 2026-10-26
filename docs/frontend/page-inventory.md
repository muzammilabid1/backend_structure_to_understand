# Page inventory

How a page decides who can open it, how a page names itself, and how the list of pages a page announcement can be aimed at is made.

The page announcement banner is mounted once for the whole app, so aiming an announcement at particular pages means matching on the Next.js route template (what `router.pathname` reports, for example `/school/[school_id]/feed`) and not on the real URL. One entry covers that page for every school, class and child.

Nobody keeps the list of pages by hand. [generate-announcement-pages.js](../../frontend/generate-announcement-pages.js) builds it from `frontend/pages` every time `shared` is built (see [Where the list comes from](#where-the-list-comes-from) and [When you add a page](#when-you-add-a-page)).

## Contents

1. [How access is decided](#how-access-is-decided)
2. [Where the banner shows](#where-the-banner-shows)
3. [Who an aimed announcement reaches](#who-an-aimed-announcement-reaches)
4. [The login screen](#the-login-screen)
5. [Page title](#page-title)
6. [Where the list comes from](#where-the-list-comes-from)
7. [When you add a page](#when-you-add-a-page)

## How access is decided

Every page file sets a `pageType` (for example `ChildDetails.pageType = PageType.PARENT;`). The values are in [PageType.ts](../../frontend/types/enums/PageType.ts): `ADMIN`, `SCHOOL_LEADER`, `TEACHER`, `PARENT` and `GENERAL`.

Two checks run around every page:

1. **Logged-out check.** [AuthProvider](../../frontend/components/AuthProvider/index.jsx) (`isUnAuthenticatedComponent`) lets a logged-out user open a URL only if it starts with one of its public prefixes (`/signup`, `/forgot`, `/reset`, `/magic`, `/auth`, `/faqs` and others). Any other URL shows the login screen in place of the page.
2. **Page-type check.** [PageInfoContext.tsx](../../frontend/context/PageInfoContext.tsx) compares the page's `pageType` with the user's token. A user who doesn't match sees "You do not have access to this page".

| Page type       | Who passes                                                                        |
| --------------- | --------------------------------------------------------------------------------- |
| any             | `userType` is `ADMIN`                                                             |
| `SCHOOL_LEADER` | the token has `isSchoolLeader = true`                                             |
| `TEACHER`       | `userType` is `TEACHER`                                                           |
| `PARENT`        | `userType` is `PARENT`, `TEACHER`, `ADMIN`, `TOPICACCESS` or `MAGICPARENT`        |
| `GENERAL`       | everyone, including logged-out users (those also need a public prefix, see above) |

A page with no `pageType` is treated as `ADMIN`. Every page sets one today, and a test checks that the announcement list can read each one.

A school leader is a user with `userType = TEACHER` and `isSchoolLeader = true`, so they pass the `TEACHER` and `PARENT` pages as well.

## Where the banner shows

The banner is [Announcements](../../frontend/components/Shared/Announcements/index.tsx). It never shows on `/welcome/…`, and never on `/child/…`, `/topic/…` or `/activity/…` when a teacher or school leader opens them (`isViewAsMode`).

The list leaves out every page where the banner can't show, and the pages where one would make no sense. Leaving a page out only means an admin can't aim an announcement at it. An announcement aimed at every page still shows on an excluded page wherever the banner itself renders (for example on the sign-up steps, and on the error pages for logged-in users; a logged-out user gets the login screen there instead).

-   **`/welcome/[pupilParentId]`:** the banner hides itself there.
-   **Pages that only redirect:** `/`, `/logout`, `/auth/google`, `/auth/microsoft`, `/magic/[magiclink]`.
-   **Pages every teacher is sent away from:** `/log-reading`, `/topic-library`, `/set-topic/[topic_id]`. A teacher always has a school, so these redirect to the `/school/[school_id]/…` version of the page, which is the one to target.
-   **Parent pages most parents are sent away from:** `/parent/[user_id]` sends a parent with one child straight to that child, and `/child/[child_id]` only shows on phones (a computer goes on to the reading or topics page).
-   **Previews and demos:** `/previewtopic`, `/previewactivity`, `/topicdemo`, `/activitydemo`.
-   **Errors and dead ends:** `/403`, `/404`, `/unauthorized`, `/account-not-found`, `/account-not-linked`, `/cannot-link-account`, `/wrong-account`, `/child-rejected`.
-   **Sign-up and password steps:** `/signup…`, `/forgot-password`, `/reset-password/[token]`, `/registeremail/[token]`, `/reject-invitation/[token]`, `/check-your-email-or-phone/[type]`, `/auth/invited`.

Every page above is in `ROUTES_TO_LEAVE_OUT` and `SINGLE_ROUTES_TO_LEAVE_OUT` at the top of [generate-announcement-pages.js](../../frontend/generate-announcement-pages.js), with the reason written next to it. A `ROUTES_TO_LEAVE_OUT` entry covers that route and everything under it (`/signup` covers `/signup/[token]` but not `/signup-help`). The two pages in `SINGLE_ROUTES_TO_LEAVE_OUT` are left out one at a time, because a `/child/[child_id]` entry in `ROUTES_TO_LEAVE_OUT` would also hide pages such as `/child/[child_id]/history`.

## Who an aimed announcement reaches

[announcement-pages.ts](../../shared/behaviour/announcement-pages.ts) decides, for each kind of viewer, the pages they can ever see a banner on (`getRoutesViewerCanSee`). Everything else uses that one answer, so the picker, the backend, the banner, the bell and the drawer can't disagree:

| Viewer                                    | Pages they can see                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Logged out                                | the login screen, `/faqs`, `/impact-report/[token]` (`LOGGED_OUT_ROUTES`)               |
| Parent (also magic-link and topic access) | `PARENT` and `ALL_USERS` pages                                                          |
| Teacher                                   | `TEACHER` and `ALL_USERS` pages                                                         |
| School leader                             | `SCHOOL_LEADER`, `TEACHER` and `ALL_USERS` pages, except `/feed/[user_id]` (redirected) |
| Helper                                    | `ALL_USERS` pages                                                                       |
| Admin                                     | `ADMIN` and `ALL_USERS` pages                                                           |

-   **Backend:** the visibility queries keep an announcement for a user only if it has no pages, or at least one page that user can see. So nobody gets one in their drawer, or a bell for it, that could never show to them. For example, an announcement for parents and teachers aimed at the teacher feed reaches teachers only.
-   **Admins** get "All users" announcements and ones aimed at "Admin", never ones with no user type or aimed at parents or teachers. When an admin views a school's pages, only their announcements aimed at every page show there.
-   **Magic-link and topic-access parents** open the same pages as parents, but they only get "All users" announcements and announcements with no user type, never ones aimed at "Parent". It has always worked this way, and it is kept on purpose; check with the team before changing it.
-   **Banner:** shows an announcement on the current route only if the announcement names that route and the viewer can see it.
-   **Bell:** the list shows everything the user can see, whatever page they are on, and does not name the pages. The number counts only what the banner can show on the current page, so it never shows a number the user cannot clear there.
-   **Admin picker and validation:** offer, and accept, only pages one of the chosen user types can see. "Teacher" covers teacher pages only, although school leaders get teacher announcements too. To reach school leader pages, pick "School leader". In the same way "All users" reaches admins but offers no admin pages: to aim at admin pages, pick "Admin".

If a page starts redirecting a kind of user away, add it to `REDIRECTED_AWAY` there. If AuthProvider opens a new page to logged-out users, a test fails until `LOGGED_OUT_ROUTES` matches.

## The login screen

The login screen has no route of its own. When nobody is logged in and the URL isn't a public one, `AuthProvider` renders `LoginPage` in place of the page, so `router.pathname` is still the protected route (for example `/school/[school_id]`). It already renders the banner, with "All users" announcements only.

So the login screen has its own pseudo route, `LOGIN_SCREEN_ROUTE` (`/__login`), listed in the registry as "Login screen" and in `ANNOUNCEMENT_PSEUDO_ROUTES`. `AuthProvider` passes it to the banner it renders there (`<Announcements route={…} />`), so:

-   an announcement aimed at the login screen shows on it, whichever protected URL the user opened;
-   an announcement aimed at a real page, such as `/school/[school_id]/feed`, never shows on the login screen in front of that page.

A logged-out user is a viewer of their own (`AnnouncementViewer.LOGGED_OUT` in the table above). Two rules narrow what they get:

-   **Pages:** they only ever see the routes in `LOGGED_OUT_ROUTES`: the login screen, `/faqs` and `/impact-report/[token]`.
-   **User type:** the backend only sends them "All users" announcements (`getPageAnnouncementsForAllUsers`).

So an announcement reaches a logged-out user only if it is for "All users" and is either aimed at every page or names one of those three routes. An "All users" announcement aimed at, say, `/feedback` never reaches them. And since "All users" is the only user type that reaches them, the admin form offers the login screen only when "All users" is picked, and the backend rejects it with any other user type.

## Page title

Every page file sets a `pageTitle` next to its `pageType`, for example `Pupils.pageTitle = 'Class: Pupils';`. It is the readable name of the page. Today the announcement picker shows it, and anything else in the app that needs a page name can use it too.

-   **Style:** a plain quoted string, written as "Area: Page name" (`Class: Pupils`, `Child: Book history`, `Admin: Schools`). A page with no area is just its name (`FAQs`).
-   **Required, like `pageType`:** the lint rule `page-type/require-page-title` (in [eslint-plugin-page-type.mjs](../../frontend/eslint-rules/eslint-plugin-page-type.mjs)) fails when a page has no `pageTitle`, or when it is not a plain quoted string. Lint only checks that the line is there, so a test also checks that the scanner can read the title of every page.
-   **Different names in the picker:** two pages in the announcement list must not share a title, or an admin can't tell them apart. A test checks this.
-   **Display only:** the database keeps the route, so changing a title never breaks a saved announcement.

## Where the list comes from

`yarn references:build` runs [buildReferences.mjs](../../shared/buildReferences.mjs), which first runs [generate-announcement-pages.js](../../frontend/generate-announcement-pages.js) and then compiles `shared`. The scanner reads every file in `frontend/pages` and writes `shared/constants/announcementPages.gen.ts`. Each page is listed under its `pageType` audience and its `pageTitle`; the scanner makes up no names. [announcementPages.ts](../../shared/constants/announcementPages.ts) turns that into `ANNOUNCEMENT_TARGET_PAGES` (plus the login screen), and the frontend and the backend both read that one compiled list.

The generated file is not committed (it is in `shared/.gitignore`). Everything that builds the frontend or the backend already runs `references:build` first, so there is nothing to do by hand: `yarn frontend:build` (in its `prebuild`), `yarn graphql:build`, `yarn graphql:dev`, `yarn graphql:start` and `yarn test:jest`.

-   If the scanner finds no pages, or cannot write the list, it stops the build. It never writes an empty list.
-   If a page in the list has no readable `pageTitle`, the build goes on and warns, and the picker shows the route instead. Lint and the test catch this first.
-   `spm-dashboard` and `data-analytics-platform` read `shared` as source, so the generated file has to exist before they build. In the release build it does, because `yarn graphql:build` runs first. If either says it can't find `./announcementPages.gen` on your machine, run `yarn workspace graphql-provider references:build` once.

## When you add a page

Most pages need nothing beyond what every page already has:

1. Set `pageType` and `pageTitle` on the page, next to each other: `Page.pageType = PageType.TEACHER;` and `Page.pageTitle = 'Teacher: Activity feed';`. Lint fails without them. The scanner reads both and adds the page to the list.
2. Pick a title no other page in the list has. The database keeps the route, so renaming a title later never breaks a saved announcement.
3. If the page should never show an announcement (a sign-up step, an error page, a redirect), add its route to `ROUTES_TO_LEAVE_OUT` in `generate-announcement-pages.js`.
4. Run `yarn workspace graphql-provider references:build`, then `yarn test:vitest`. The block "page announcement target pages" in [Constant.test.ts](../../frontend/shared/Constant.test.ts) fails with the route name if a page has a `pageType` or `pageTitle` the scanner can't read, if a `ROUTES_TO_LEAVE_OUT` entry no longer matches any page, or if two pages share a name.

Routes are the file path under `frontend/pages` without the extension and without a trailing `/index`.
