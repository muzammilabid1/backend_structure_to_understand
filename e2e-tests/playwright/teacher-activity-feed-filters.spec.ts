import { test, expect, type Page } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import {
    englishDomainId,
    englishSubjectId,
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateTopicName,
    generateUPN,
    generateUserEmail,
    moneySkillsDomainId,
    moneySkillsSubjectId,
    password,
    readyTeddyDomainId,
    readyTeddySubjectId
} from './constants';
import { adminOrTeacherSignOut, createSchoolAndDummyWondeData, formatDate, login, waitForLoading } from './utils';
import { UserStatus, UserType } from 'lwp-shared';

// Reading is not a real subject; the activity feed subject filter uses this sentinel id for it.
const readingAsASubjectId = '0';
const YEAR_GROUP_ID = '0';
const VIDEO = '605069004';

/**
 * End-to-end coverage of the reworked TEACHER ACTIVITY FEED FILTER
 * (see `docs/plans/teacher-activity-feed-filter-rework.md`).
 *
 * Instead of seeding a finished school up front, this builds the school up INCREMENTALLY with direct
 * DB calls and re-checks the real filter UI after each step, so every filter row can be watched
 * appearing and behaving as the underlying data grows (reading-only -> + Money Skills -> + English
 * -> + Ready Teddy -> more classes/groups -> other academic years), finishing on the assigned
 * teacher's own feed. It all runs inside ONE test so the seeded data is never shared across
 * Playwright test blocks (a failing block resets the worker DB).
 *
 * Feed cards expose a text marker we assert on: reading -> book name, activity -> topic name,
 * scrapbook -> the fixed phrase "added a scrapbook entry" (not unique, so scrapbook date filtering is
 * asserted via the "N items found" count). Each content type carries two feedbacks (this week + last
 * week) so the time filters are genuinely exercised.
 *
 * ------------------------------------------------------------------------------------------------
 * 31 SCENARIOS COVERED (numbered here and inline against each block below):
 *
 *   Stage 0 - single reading-only class
 *      1. Class row hidden (one class) AND Activity row hidden (one content type); When row present.
 *      2. When chips: This week / Last week / This year.
 *      3. Subject row hidden when only reading exists.
 *      4. Book-name search.
 *      5. Media filter: Has audio.
 *      6. Sharing switch ("Only show entries with sharing permitted").
 *   Stage 1 - + Money Skills activity topic
 *      7. Activity (content-type) row appears once >=2 content types exist.
 *      8. Filtering by Reading vs Topics.
 *   Stage 2 - + English activity topic
 *      9. Subject row appears below the (still-visible) Activity row.
 *     10. Subject filtering (English, Money skills) - Activity row stays visible (waterfall).
 *     11. Reading pseudo-subject filtering (reading logs only).
 *     12. "Reset and hide extra options" collapses and clears every filter.
 *     13. Media filter: Has photo.
 *   Stage 3 - + Ready Teddy (scrapbook AND activity feedback)
 *     14. Activity row gains Scrapbook; filtering by Scrapbook.
 *     15. Scrapbook date filtering via the item count.
 *     16. Ready Teddy subject shows both its scrapbook and its activity feedback; Activity row stays.
 *     17. Topics + Ready Teddy returns the Ready Teddy activity feedback.
 *     18. Waterfall reset: changing the Activity type clears the subject below it.
 *   Stage 4 - When date pickers
 *     19. From date.
 *     20. To date.
 *     21. From + To together, bracketing a middle window.
 *   Stage 5 - multiple classes / class groups / group across classes
 *     22. Class dropdown appears (2nd class) and the group-across-classes dropdown appears.
 *     23. Selecting a class surfaces its two class groups.
 *     24. Class-group filtering narrows to only that group's member.
 *     25. Group-across-classes filtering narrows to only that class's pupil.
 *   Stage 6 - academic year
 *     26. Default "current year onwards" includes future-period feedback.
 *     27. Selecting the previous year shows only that year (excludes current + future).
 *   Stage 7 - loading filters straight from the URL (bookmarks / back-compat)
 *     28. week= restores the This-week filter.
 *     29. Legacy activity=ALL_READING maps onto the Reading content type.
 *     30. feedbackType= rehydrates the content-type filter.
 *   Teacher account
 *     31. The assigned teacher sees the class feed on their own /feed page.
 *
 * Deliberately OUT OF SCOPE for the feed filter (not tested here): the "unticked entries / mark all
 * as seen" flow, the September-only previous-period chip, and the real group-across-classes setup /
 * cross-class pupil-aggregation flow (group membership + feedback are seeded directly - the feed
 * FILTER is what this test verifies, not the class-management setup path).
 * ------------------------------------------------------------------------------------------------
 */
test.describe('Teacher activity feed filter', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    const schoolName = `${generateSchoolName()} School`;
    const leaderFirstName = generateFirstName();
    const leaderLastName = generateLastName();
    const leaderEmail = generateUserEmail(leaderFirstName, leaderLastName);
    const teacherFirstName = generateFirstName();
    const teacherLastName = generateLastName();
    const teacherEmail = generateUserEmail(teacherFirstName, teacherLastName);

    // Distinct markers per feedback (topic name / book name shown on the card).
    const readingThisWeekBook = `Reading TW ${schoolName}`;
    const readingLastWeekBook = `Reading LW ${schoolName}`;
    const moneyThisWeekTopic = `Money TW ${generateTopicName()}`;
    const moneyLastWeekTopic = `Money LW ${generateTopicName()}`;
    const englishThisWeekTopic = `English TW ${generateTopicName()}`;
    const englishLastWeekTopic = `English LW ${generateTopicName()}`;
    // Ready Teddy carries BOTH a scrapbook entry and activity ("Topics") feedback.
    const readyTeddyThisWeekTopic = `Ready Teddy TW ${generateTopicName()}`;
    const readyTeddyLastWeekTopic = `Ready Teddy LW ${generateTopicName()}`;
    const scrapbookMarker = 'added a scrapbook entry';

    // Phase 2 fixtures.
    const classBName = `Class B ${generateTopicName()}`;
    const groupAlphaName = `Group Alpha ${generateTopicName()}`;
    const groupBetaName = `Group Beta ${generateTopicName()}`;
    const previousYearBook = `PrevYear ${schoolName}`;

    // Gap-coverage fixtures.
    const notSharedBook = `NotShared ${schoolName}`; // a reading log with sharing NOT permitted
    const groupAlphaBook = `GroupAlpha ${schoolName}`; // a reading log on a pupil inside Group Alpha
    const groupAcrossName = `Group Across ${generateTopicName()}`;
    const groupAcrossBook = `GroupAcross ${schoolName}`; // a reading log on a pupil in the group-across-classes class
    const futureYearBook = `FutureYear ${schoolName}`; // a reading log in the next academic period

    // Seeded context shared by the incremental-seed helpers.
    const ctx = {
        schoolId: '',
        teacherId: '',
        classId: '',
        className: '',
        pupilId: '',
        parentId: '',
        leaderId: '',
        currentPeriodIndex: 0
    };

    let today: Date;
    let lastWeek: Date;
    let releaseDate: string;
    let currentPeriodShortName: string;
    let previousPeriodIndex: number;
    let previousPeriodShortName: string;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);

        today = new Date();
        lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        releaseDate = formatDate(today, '-');

        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select(['index', 'shortName'])
            .executeTakeFirstOrThrow();
        const previousPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isPreviousPeriod', '=', true)
            // Every past period carries this flag (7 rows currently), so take the newest: without the
            // ordering this resolved to the oldest year on record rather than the year just gone.
            .orderBy('index', 'desc')
            .select(['index', 'shortName'])
            .executeTakeFirstOrThrow();
        currentPeriodShortName = currentPeriod.shortName;
        previousPeriodIndex = previousPeriod.index;
        previousPeriodShortName = previousPeriod.shortName;

        // Stage 0 seed: a single ACTIVE, reading-only class with its reading class/pupil topic
        // (no activity or scrapbook topics yet, and Ready Teddy disabled on the class).
        const seed = await createSchoolAndDummyWondeData(
            db,
            utils,
            {
                school: {
                    name: schoolName,
                    numOfFullProgrammeClassesAllowed: 10,
                    numOfTotalClassesAllowed: 30,
                    enableAddClasses: true,
                    isMoneySkillsAvailable: true,
                    isReadyTeddyAvailable: true,
                    isFutureAcademicYear: false
                },
                leader: {
                    firstname: leaderFirstName,
                    lastname: leaderLastName,
                    email: leaderEmail,
                    userStatus: UserStatus.ACTIVE,
                    addTooltip: true
                },
                teacher: {
                    firstname: teacherFirstName,
                    lastname: teacherLastName,
                    email: teacherEmail,
                    userStatus: UserStatus.ACTIVE,
                    addTooltip: true
                }
            },
            {
                active: true,
                classLicences: { IsReadingLogsEnabled: true, isFullProgramme: false, isReadyTeddyEnabled: false },
                addReadingTopic: { releaseDate }
            }
        );

        if (!seed.parent || !seed.pupil || !seed.class || !seed.teacher)
            throw new Error('Expected an active class, pupil, parent and teacher to be seeded');

        ctx.schoolId = seed.school.id;
        ctx.teacherId = seed.teacher.id;
        ctx.classId = seed.class.id;
        ctx.className = seed.class.name ?? '';
        ctx.pupilId = seed.pupil.id;
        ctx.parentId = seed.parent.id;
        ctx.leaderId = seed.leader.id;
        ctx.currentPeriodIndex = currentPeriod.index;

        // Reading logs on the active pupil: this week (with audio) and last week (both shared), plus one
        // this-week log with sharing NOT permitted (for the sharing switch test).
        await seedReadingFeedback({ bookName: readingThisWeekBook, logCreatedAt: today, withAudio: true });
        await seedReadingFeedback({ bookName: readingLastWeekBook, logCreatedAt: lastWeek });
        await seedReadingFeedback({ bookName: notSharedBook, logCreatedAt: today, sharingAllowed: false });

        // The seeded teacher is added to the class so their personal feed shows its entries.
        await utils.addClassTeacher(seed.teacher.id, seed.class.id);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    // ---- incremental seed helpers -------------------------------------------------------------

    // Seeds a reading log. Defaults to the active pupil/parent in the current period, but any of those can
    // be overridden to place a log on another pupil, in another period, authored by a teacher, or unshared.
    const seedReadingFeedback = async (opts: {
        bookName: string;
        logCreatedAt: Date;
        withAudio?: boolean;
        pupilId?: string;
        userType?: UserType;
        userId?: string;
        periodIndex?: number;
        sharingAllowed?: boolean;
    }): Promise<void> => {
        const feedback = await utils.createPupilFeedback(opts.pupilId ?? ctx.pupilId, {
            type: 'READING',
            userType: opts.userType ?? UserType.PARENT,
            userId: opts.userId ?? ctx.parentId,
            userName: 'Reader',
            periodIndex: opts.periodIndex ?? ctx.currentPeriodIndex,
            sharingAllowed: opts.sharingAllowed ?? true,
            readingType: 'SCHOOL_BOOK',
            includeInReadingTarget: true,
            isBookFinished: true,
            comment: `${opts.bookName} comment`,
            bookName: opts.bookName,
            logCreatedAt: opts.logCreatedAt
        });

        if (opts.withAudio)
            await db
                .insertInto('lwp_pupil_feedback_media')
                .values({ feedbackId: feedback.id, type: 'AUDIO', filename: `${opts.bookName}-audio.mp3` })
                .execute();
    };

    // Creates an active class and one pupil in it (linked via lwp_class_pupil), returning both ids.
    const seedClassWithPupil = async (opts: {
        name: string;
        periodIndex?: number;
        isGroupAcrossClasses?: boolean;
    }): Promise<{ classId: string; pupilId: string }> => {
        const schoolClass = await utils.createClass(ctx.schoolId, {
            name: opts.name,
            isRegistrationClass: true,
            isFullProgramme: false,
            isGroupAcrossClasses: opts.isGroupAcrossClasses ?? false,
            mainTeacherId: ctx.leaderId,
            yearGroup: 1,
            periodIndex: opts.periodIndex ?? ctx.currentPeriodIndex,
            IsReadingLogsEnabled: true,
            isReadyTeddyEnabled: false,
            readingStartDay: today.getDay(),
            readingTarget: 1,
            status: 'ACTIVE',
            logCreatedById: ctx.leaderId,
            logUpdatedById: ctx.leaderId
        });
        const pupil = await utils.createPupil(ctx.schoolId, {
            firstname: generateFirstName(),
            lastname: generateLastName(),
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: ctx.leaderId,
            logUpdatedById: ctx.leaderId
        });
        await utils.addPupilToClass(pupil.id, schoolClass.id);
        return { classId: schoolClass.id, pupilId: pupil.id };
    };

    // Creates one released non-reading topic (of the given subject domain) on the class, plus one
    // activity feedback on the active pupil dated `logCreatedAt`. The card shows `name`, so use a
    // distinct name per feedback to get a distinct marker.
    const seedActivityTopic = async (opts: {
        name: string;
        domainId: string;
        logCreatedAt: Date;
        withPhoto?: boolean;
    }): Promise<void> => {
        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: opts.name,
            parentTopicName: opts.name,
            isPublished: true,
            video: VIDEO,
            logCreatedById: ctx.leaderId,
            logUpdatedById: ctx.leaderId
        });
        const staticActivity = await utils.createStaticActivity({
            name: `${opts.name} activity`,
            activityType: 'LEGACY',
            order: 1,
            topicId: staticTopic.id,
            logCreatedById: ctx.leaderId,
            logUpdatedById: ctx.leaderId
        });
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({ domainId: opts.domainId, topicId: staticTopic.id, yearGroupId: YEAR_GROUP_ID })
            .execute();
        const classTopic = await utils.createClassTopic(ctx.classId, { topicId: staticTopic.id, releaseDate, released: true });
        const pupilTopic = await utils.createPupilTopic({
            releaseDate,
            pupilId: ctx.pupilId,
            classTopicId: classTopic.id,
            topicId: staticTopic.id,
            watchedVideo: false,
            periodIndex: ctx.currentPeriodIndex,
            silverStars: 0,
            earnedGoldStar: false
        });
        const pupilActivity = await utils.createPupilActivity({
            pupilId: ctx.pupilId,
            topicId: pupilTopic.id,
            activityId: staticActivity.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        const feedback = await utils.createPupilFeedback(ctx.pupilId, {
            type: 'ACTIVITY',
            userType: UserType.PARENT,
            userId: ctx.parentId,
            activityId: pupilActivity.id,
            periodIndex: ctx.currentPeriodIndex,
            sharingAllowed: true,
            pupilComment: `${opts.name} pupil comment`,
            parentComment: `${opts.name} parent comment`,
            logCreatedAt: opts.logCreatedAt
        });
        if (opts.withPhoto)
            await db
                .insertInto('lwp_pupil_feedback_media')
                .values({ feedbackId: feedback.id, type: 'PHOTO', filename: `${opts.name}-photo.jpg` })
                .execute();
    };

    const seedScrapbookTopic = async (opts: { name: string; logCreatedAt: Date }): Promise<void> => {
        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: opts.name,
            parentTopicName: opts.name,
            scrapbookPrompt: `${opts.name} prompt`,
            isPublished: true,
            video: VIDEO,
            logCreatedById: ctx.leaderId,
            logUpdatedById: ctx.leaderId
        });
        const staticActivity = await utils.createStaticActivity({
            name: `${opts.name} activity`,
            activityType: 'LEGACY',
            order: 1,
            topicId: staticTopic.id,
            logCreatedById: ctx.leaderId,
            logUpdatedById: ctx.leaderId
        });
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({ domainId: readyTeddyDomainId, topicId: staticTopic.id, yearGroupId: YEAR_GROUP_ID })
            .execute();
        const classTopic = await utils.createClassTopic(ctx.classId, { topicId: staticTopic.id, releaseDate, released: true });
        const pupilTopic = await utils.createPupilTopic({
            releaseDate,
            pupilId: ctx.pupilId,
            classTopicId: classTopic.id,
            topicId: staticTopic.id,
            watchedVideo: false,
            periodIndex: ctx.currentPeriodIndex,
            silverStars: 0,
            earnedGoldStar: false
        });
        await utils.createPupilActivity({
            pupilId: ctx.pupilId,
            topicId: pupilTopic.id,
            activityId: staticActivity.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        await utils.createPupilFeedback(ctx.pupilId, {
            type: 'SCRAPBOOK',
            userType: UserType.PARENT,
            userId: ctx.parentId,
            periodIndex: ctx.currentPeriodIndex,
            sharingAllowed: true,
            comment: `${opts.name} comment`,
            scrapbookPrompt: `${opts.name} prompt`,
            logCreatedAt: opts.logCreatedAt
        });
    };

    // ---- assertion helpers --------------------------------------------------------------------

    // Marker assertions poll until the (debounced, ~1s) filter query resolves, so give them headroom.
    const ASSERT_TIMEOUT = 20_000;

    const expectVisible = async (page: Page, marker: string) => {
        await expect(page.getByText(marker).first()).toBeVisible({ timeout: ASSERT_TIMEOUT });
    };
    const expectAbsent = async (page: Page, marker: string) => {
        await expect(page.getByText(marker)).toHaveCount(0, { timeout: ASSERT_TIMEOUT });
    };
    const expectItemCount = async (page: Page, n: number) => {
        await expect(page.getByText(`${n} ${n === 1 ? 'item' : 'items'} found`)).toBeVisible({ timeout: ASSERT_TIMEOUT });
    };

    // Navigate to a clean feed URL (clears any filter query params) and wait for it to load.
    const openFeed = async (page: Page) => {
        await page.goto(`/school/${ctx.schoolId}/feed`);
        await waitForLoading(page);
    };

    test('covers every filter row and combination, built up incrementally from a reading-only class', async ({ page }) => {
        await login(page, leaderEmail, password);

        // =========================================================================================
        // STAGE 0 - a single reading-only class
        // =========================================================================================
        await openFeed(page);

        // [1] With one class and only reading feedback: the class row is hidden (single class), the
        //     Activity row is hidden (single content type), and the When row is present.
        await expectVisible(page, readingThisWeekBook);
        await expectVisible(page, readingLastWeekBook);

        // Single class -> the class row is hidden (no "Select class" control).
        await expect(page.getByText('Select class')).toHaveCount(0);
        // Single relevant content type (reading only) -> the Activity row is hidden.
        await expect(page.getByTestId('activity-filter-row')).toHaveCount(0);
        // The When row is always available.
        await expect(page.getByTestId('when-filter-row')).toBeVisible();

        // [2] When chips: This week vs Last week vs This year (reading logs are dated a week apart).
        await page.getByTestId('when-filter-THIS_WEEK').click();
        await expectVisible(page, readingThisWeekBook);
        await expectAbsent(page, readingLastWeekBook);

        await page.getByTestId('when-filter-LAST_WEEK').click();
        await expectVisible(page, readingLastWeekBook);
        await expectAbsent(page, readingThisWeekBook);

        await page.getByTestId('when-filter-THIS_ACADEMIC_YEAR').click();
        await expectVisible(page, readingThisWeekBook);
        await expectVisible(page, readingLastWeekBook);

        // [3] Expanded: the subject row is hidden while only reading exists.
        await page.getByText('Show extra options').click();
        await expect(page.getByTestId('subject-filter-row')).toHaveCount(0);

        // [4] Book-name search narrows to the matching reading log.
        await page.getByPlaceholder('Book name').fill(readingThisWeekBook);
        await page.getByRole('button', { name: 'Search' }).click();
        await expectVisible(page, readingThisWeekBook);
        await expectAbsent(page, readingLastWeekBook);

        // [5] Media filter: Has audio -> the this-week reading log (which has an audio attachment).
        await openFeed(page);
        await page.getByText('Show extra options').click();
        await page.getByTestId('media-filter-HAS_AUDIO').click();
        await expectVisible(page, readingThisWeekBook);
        await expectAbsent(page, readingLastWeekBook); // last-week log has no audio

        // [6] Sharing switch ("Only show entries with sharing permitted").
        await openFeed(page);
        await page.getByText('Show extra options').click();
        await expectVisible(page, notSharedBook); // off by default -> the non-shared log shows
        await page.getByTestId('sharing-filter-switch').click(); // on -> only sharing-permitted entries
        await expectVisible(page, readingThisWeekBook);
        await expectAbsent(page, notSharedBook);
        await page.getByTestId('sharing-filter-switch').click(); // off -> the non-shared log returns
        await expectVisible(page, notSharedBook);

        // =========================================================================================
        // STAGE 1 - add a Money Skills activity topic (this week + last week)
        // =========================================================================================
        await seedActivityTopic({ name: moneyThisWeekTopic, domainId: moneySkillsDomainId, logCreatedAt: today });
        await seedActivityTopic({ name: moneyLastWeekTopic, domainId: moneySkillsDomainId, logCreatedAt: lastWeek });
        await openFeed(page);

        // [7] Two content types now (Reading + Topics) -> the Activity row appears.
        await expect(page.getByTestId('activity-filter-row')).toBeVisible();
        await expect(page.getByTestId('activity-filter-READING')).toBeVisible();
        await expect(page.getByTestId('activity-filter-ACTIVITY')).toBeVisible();
        await expect(page.getByTestId('activity-filter-SCRAPBOOK')).toHaveCount(0); // no Ready Teddy yet

        // [8] Filtering by content type: Reading -> only reading logs; Topics -> only activity feedback.
        await page.getByTestId('activity-filter-READING').click();
        await expectVisible(page, readingThisWeekBook);
        await expectAbsent(page, moneyThisWeekTopic);

        // Topics content type -> only the Money Skills activity feedbacks.
        await page.getByTestId('activity-filter-ACTIVITY').click();
        await expectVisible(page, moneyThisWeekTopic);
        await expectVisible(page, moneyLastWeekTopic);
        await expectAbsent(page, readingThisWeekBook);

        // =========================================================================================
        // STAGE 2 - add an English activity topic (this week + last week), one with a photo
        // =========================================================================================
        await db.updateTable('lwp_school_class').set({ isFullProgramme: true }).where('id', '=', ctx.classId).execute();
        await seedActivityTopic({ name: englishThisWeekTopic, domainId: englishDomainId, logCreatedAt: today, withPhoto: true });
        await seedActivityTopic({ name: englishLastWeekTopic, domainId: englishDomainId, logCreatedAt: lastWeek });
        await openFeed(page);
        await page.getByText('Show extra options').click();

        // [9] Subject row now offers All / English / Money skills / Reading, and the Activity row remains
        //     visible above it (waterfall: a lower row never hides an upper one).
        await expect(page.getByTestId('subject-filter-row')).toBeVisible();
        await expect(page.getByTestId(`subject-filter-${englishSubjectId}`)).toBeVisible();
        await expect(page.getByTestId(`subject-filter-${moneySkillsSubjectId}`)).toBeVisible();
        await expect(page.getByTestId(`subject-filter-${readingAsASubjectId}`)).toBeVisible();
        await expect(page.getByTestId('activity-filter-row')).toBeVisible();

        // [10] Subject filtering (English, then Money skills) -> only that subject's activity feedback;
        //      the Activity row STAYS visible with its options intact (selecting a subject never resets
        //      or hides the Activity row above it - the waterfall only cascades downward).
        await page.getByTestId(`subject-filter-${englishSubjectId}`).click();
        await expectVisible(page, englishThisWeekTopic);
        await expectVisible(page, englishLastWeekTopic);
        await expectAbsent(page, moneyThisWeekTopic);
        await expectAbsent(page, readingThisWeekBook);
        await expect(page.getByTestId('activity-filter-row')).toBeVisible();
        await expect(page.getByTestId('activity-filter-READING')).toBeVisible();

        // Money Skills subject -> only the Money Skills activity feedbacks.
        await page.getByTestId(`subject-filter-${moneySkillsSubjectId}`).click();
        await expectVisible(page, moneyThisWeekTopic);
        await expectAbsent(page, englishThisWeekTopic);

        // [11] Reading pseudo-subject -> only reading logs (activity feedback of every subject excluded).
        await page.getByTestId(`subject-filter-${readingAsASubjectId}`).click();
        await expectVisible(page, readingThisWeekBook);
        await expectAbsent(page, englishThisWeekTopic);
        await expectAbsent(page, moneyThisWeekTopic);

        // [12] "Reset and hide extra options" collapses the panel and clears every filter.
        await page.getByText('Reset and hide extra options').click();
        await expect(page.getByText('Show extra options')).toBeVisible();
        await expect(page.getByTestId('subject-filter-row')).toHaveCount(0);
        await expectVisible(page, englishThisWeekTopic); // filters reset -> all content shows again
        await expectVisible(page, readingThisWeekBook);

        // [13] Media filter: Has photo -> the English (this-week) activity feedback only.
        await openFeed(page);
        await page.getByText('Show extra options').click();
        await page.getByTestId('media-filter-HAS_PHOTO').click();
        await expectVisible(page, englishThisWeekTopic);
        await expectAbsent(page, readingThisWeekBook);
        await expectAbsent(page, moneyThisWeekTopic);

        // =========================================================================================
        // STAGE 3 - enable Ready Teddy on the class and add a scrapbook topic (this week + last week)
        // =========================================================================================
        await db.updateTable('lwp_school_class').set({ isReadyTeddyEnabled: true }).where('id', '=', ctx.classId).execute();
        await seedScrapbookTopic({ name: `Scrapbook TW ${generateTopicName()}`, logCreatedAt: today });
        await seedScrapbookTopic({ name: `Scrapbook LW ${generateTopicName()}`, logCreatedAt: lastWeek });
        // Ready Teddy also carries activity ("Topics") feedback, not just scrapbook entries.
        await seedActivityTopic({ name: readyTeddyThisWeekTopic, domainId: readyTeddyDomainId, logCreatedAt: today });
        await seedActivityTopic({ name: readyTeddyLastWeekTopic, domainId: readyTeddyDomainId, logCreatedAt: lastWeek });
        await openFeed(page);

        // [14] Activity row now includes Scrapbook; filtering by Scrapbook shows only scrapbook entries.
        await expect(page.getByTestId('activity-filter-SCRAPBOOK')).toBeVisible();
        await page.getByTestId('activity-filter-SCRAPBOOK').click();
        await expectVisible(page, scrapbookMarker);
        await expectAbsent(page, readingThisWeekBook);
        await expectAbsent(page, englishThisWeekTopic);

        // [15] Scrapbook cards share one phrase, so date filtering is asserted via the item count.
        await expectItemCount(page, 2); // both scrapbook entries (this year)
        await page.getByTestId('when-filter-THIS_WEEK').click();
        await expectItemCount(page, 1);
        await page.getByTestId('when-filter-LAST_WEEK').click();
        await expectItemCount(page, 1);

        // [16] Subject interplay (waterfall): selecting the Ready Teddy subject includes BOTH its scrapbook
        // entries and its activity ("Topics") feedback; other subjects (English/Money) and reading logs
        // are excluded. The Activity row stays fully visible (the Reading chip remains - the Activity row
        // is class-driven, not narrowed by the subject below it).
        await openFeed(page);
        await page.getByText('Show extra options').click();
        await expect(page.getByTestId(`subject-filter-${readyTeddySubjectId}`)).toBeVisible();
        await page.getByTestId(`subject-filter-${readyTeddySubjectId}`).click();
        await expectVisible(page, scrapbookMarker);
        await expectVisible(page, readyTeddyThisWeekTopic);
        await expectAbsent(page, readingThisWeekBook);
        await expectAbsent(page, englishThisWeekTopic);
        await expect(page.getByTestId('activity-filter-row')).toBeVisible();
        await expect(page.getByTestId('activity-filter-READING')).toBeVisible();
        await expect(page.getByTestId('activity-filter-ACTIVITY')).toBeVisible();
        await expect(page.getByTestId('activity-filter-SCRAPBOOK')).toBeVisible();

        // [17] Topics (Activity) THEN Ready Teddy (Subject) -> feedbackTypes=[ACTIVITY] + subjects=[Ready Teddy]:
        // the Ready Teddy activity feedback only (scrapbook excluded by the Topics type; English/Money by
        // the subject). Activity is chosen first because it sits above Subject - picking it afterwards
        // would reset the subject (see below).
        await openFeed(page);
        await page.getByText('Show extra options').click();
        await page.getByTestId('activity-filter-ACTIVITY').click();
        await page.getByTestId(`subject-filter-${readyTeddySubjectId}`).click();
        await expectVisible(page, readyTeddyThisWeekTopic);
        await expectVisible(page, readyTeddyLastWeekTopic);
        await expectAbsent(page, scrapbookMarker);
        await expectAbsent(page, englishThisWeekTopic);

        // [18] Waterfall reset: changing the Activity type (upper) clears the Subject (lower). Picking Reading
        // now shows reading logs and the subject row disappears (reading feedback carries no subject),
        // so "Reading activity + a subject" can never occur.
        await page.getByTestId('activity-filter-READING').click();
        await expectVisible(page, readingThisWeekBook);
        await expectAbsent(page, scrapbookMarker);
        await expect(page.getByTestId('subject-filter-row')).toHaveCount(0);

        // =========================================================================================
        // STAGE 4 - From / To date pickers (expanded "When" section)
        // =========================================================================================
        // [19] From = today -> only feedback posted this week (last week's log excluded).
        await openFeed(page);
        await page.getByText('Show extra options').click();
        await page.getByText('From:').click();
        await page.locator('.drop_down_date_picker .Mui-selected').click();
        await expectVisible(page, readingThisWeekBook);
        await expectAbsent(page, readingLastWeekBook);

        // [20] To = last week -> only feedback posted on/before last week (this week's log excluded).
        await openFeed(page);
        await page.getByText('Show extra options').click();
        await page.getByText('To:').click();
        if (lastWeek.getMonth() !== today.getMonth()) {
            await page.getByRole('button', { name: /previous month/i }).click();
        }
        await page.locator('.drop_down_date_picker').getByText(String(lastWeek.getDate()), { exact: true }).click();
        await expectVisible(page, readingLastWeekBook);
        await expectAbsent(page, readingThisWeekBook);

        // [21] From + To together, bracketing only last week: From ~10 days ago and To ~3 days ago, so the
        // last-week log (7 days ago) falls inside the window while this-week logs (after To) are excluded.
        const tenDaysAgo = new Date(today);
        tenDaysAgo.setDate(today.getDate() - 10);
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(today.getDate() - 3);

        await openFeed(page);
        await page.getByText('Show extra options').click();
        await page.getByText('From:').click();
        if (tenDaysAgo.getMonth() !== today.getMonth()) await page.getByRole('button', { name: /previous month/i }).click();
        await page.locator('.drop_down_date_picker').getByText(String(tenDaysAgo.getDate()), { exact: true }).click();
        await page.getByText('To:').click();
        if (threeDaysAgo.getMonth() !== today.getMonth()) await page.getByRole('button', { name: /previous month/i }).click();
        await page.locator('.drop_down_date_picker').getByText(String(threeDaysAgo.getDate()), { exact: true }).click();
        await expectVisible(page, readingLastWeekBook);
        await expectAbsent(page, readingThisWeekBook);

        // =========================================================================================
        // STAGE 5 - a second class (class row appears) + two class groups (class-groups row appears)
        // =========================================================================================
        await utils.createClass(ctx.schoolId, {
            name: classBName,
            isRegistrationClass: true,
            isFullProgramme: false,
            mainTeacherId: ctx.leaderId,
            yearGroup: 1,
            periodIndex: ctx.currentPeriodIndex,
            IsReadingLogsEnabled: true,
            isReadyTeddyEnabled: false,
            readingStartDay: today.getDay(),
            readingTarget: 1,
            status: 'ACTIVE',
            logCreatedById: ctx.leaderId,
            logUpdatedById: ctx.leaderId
        });
        // Two class groups under Class A. skipGroupPupils: true = the group is scheduled its own topics
        // rather than inheriting the class's (that flag only affects topic release, not the feed filter,
        // which matches by pupil membership - so we add the group's member explicitly below).
        const createdGroups: Record<string, string> = {};
        for (const groupName of [groupAlphaName, groupBetaName]) {
            const group = await utils.createClass(ctx.schoolId, {
                name: groupName,
                isRegistrationClass: false,
                isFullProgramme: false,
                parentClassId: ctx.classId,
                skipGroupPupils: true,
                mainTeacherId: ctx.leaderId,
                yearGroup: 1,
                periodIndex: ctx.currentPeriodIndex,
                IsReadingLogsEnabled: true,
                isReadyTeddyEnabled: false,
                status: 'ACTIVE',
                logCreatedById: ctx.leaderId,
                logUpdatedById: ctx.leaderId
            });
            createdGroups[groupName] = group.id;
        }

        // A pupil that belongs to Class A AND Group Alpha, with its own reading log - to prove that
        // selecting the group narrows the feed to just that group's members.
        const groupPupil = await utils.createPupil(ctx.schoolId, {
            firstname: generateFirstName(),
            lastname: generateLastName(),
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: ctx.leaderId,
            logUpdatedById: ctx.leaderId
        });
        await utils.addPupilToClass(groupPupil.id, ctx.classId);
        await utils.addPupilToClass(groupPupil.id, createdGroups[groupAlphaName]);
        await seedReadingFeedback({
            bookName: groupAlphaBook,
            logCreatedAt: today,
            pupilId: groupPupil.id,
            userType: UserType.TEACHER,
            userId: ctx.leaderId
        });

        // A group-across-classes class with its own pupil + reading log.
        const groupAcross = await seedClassWithPupil({ name: groupAcrossName, isGroupAcrossClasses: true });
        await seedReadingFeedback({
            bookName: groupAcrossBook,
            logCreatedAt: today,
            pupilId: groupAcross.pupilId,
            userType: UserType.TEACHER,
            userId: ctx.leaderId
        });

        await openFeed(page);

        // [22] With multiple classes, the class dropdown row appears; the group-across-classes dropdown too.
        await expect(page.getByText('Select class')).toBeVisible();
        await expect(page.getByText('Select group across classes')).toBeVisible();

        // [23] Selecting Class A surfaces its two class groups.
        await page.getByText('Select class').click();
        await page.locator('.common-popover').getByText(ctx.className, { exact: true }).click();
        await expect(page.getByText(groupAlphaName)).toBeVisible();
        await expect(page.getByText(groupBetaName)).toBeVisible();

        // [24] Selecting Group Alpha narrows the feed to ONLY its member's log; Class A's own-pupil logs vanish.
        await page.getByText(groupAlphaName).click();
        await expectVisible(page, groupAlphaBook);
        await expectAbsent(page, readingThisWeekBook);
        await expectAbsent(page, englishThisWeekTopic);

        // [25] Selecting the group-across-classes class shows only its log; Class A's logs are excluded.
        await openFeed(page);
        await page.getByText('Select group across classes').click();
        await page.locator('.common-popover').getByText(groupAcrossName, { exact: true }).click();
        await expectVisible(page, groupAcrossBook);
        await expectAbsent(page, readingThisWeekBook);
        await expectAbsent(page, groupAlphaBook);

        // =========================================================================================
        // STAGE 6 - academic-year scope: previous year (dropdown) and the default "onwards" including future
        // =========================================================================================
        // A previous-period class + reading log, and a future-period one, to exercise the academic-year
        // dropdown and the default "current year onwards" scope (periodIndex >= current, so it includes future).
        const prevClass = await seedClassWithPupil({ name: `Class Prev ${generateTopicName()}`, periodIndex: previousPeriodIndex });
        await seedReadingFeedback({
            bookName: previousYearBook,
            logCreatedAt: today,
            pupilId: prevClass.pupilId,
            userType: UserType.TEACHER,
            userId: ctx.leaderId,
            periodIndex: previousPeriodIndex
        });
        const futureClass = await seedClassWithPupil({
            name: `Class Future ${generateTopicName()}`,
            periodIndex: ctx.currentPeriodIndex + 1
        });
        await seedReadingFeedback({
            bookName: futureYearBook,
            logCreatedAt: today,
            pupilId: futureClass.pupilId,
            userType: UserType.TEACHER,
            userId: ctx.leaderId,
            periodIndex: ctx.currentPeriodIndex + 1
        });
        await openFeed(page);

        // [26] Default is "current year onwards" (periodIndex >= current): the FUTURE-period log is included,
        // the previous-period log is not.
        await expectVisible(page, futureYearBook);
        await expectAbsent(page, previousYearBook);

        // [27] Pick the previous year from the expanded academic-year dropdown -> only that year's log; the
        // current-year and future-period entries drop away.
        await page.getByText('Show extra options').click();
        await page.getByText(`${currentPeriodShortName} onwards`).click();
        await page.getByText(previousPeriodShortName, { exact: true }).click();
        await waitForLoading(page);
        await expectVisible(page, previousYearBook);
        await expectAbsent(page, readingThisWeekBook);
        await expectAbsent(page, futureYearBook);

        // =========================================================================================
        // STAGE 7 - loading filters straight from the URL (bookmarks / back-compat)
        // =========================================================================================
        // [28] week= restores the "This week" filter on load.
        await page.goto(`/school/${ctx.schoolId}/feed?week=THIS_WEEK&isFilter=true`);
        await waitForLoading(page);
        await expectVisible(page, readingThisWeekBook);
        await expectAbsent(page, readingLastWeekBook);

        // [29] The retired legacy activity=ALL_READING param still maps onto the Reading content type.
        await page.goto(`/school/${ctx.schoolId}/feed?activity=ALL_READING&isFilter=true`);
        await waitForLoading(page);
        await expectVisible(page, readingThisWeekBook);
        await expectAbsent(page, englishThisWeekTopic);
        await expectAbsent(page, scrapbookMarker);

        // [30] A bookmarked feedbackType= link rehydrates the content-type filter.
        await page.goto(`/school/${ctx.schoolId}/feed?feedbackType=SCRAPBOOK&isFilter=true`);
        await waitForLoading(page);
        await expectVisible(page, scrapbookMarker);
        await expectAbsent(page, readingThisWeekBook);
        await expectAbsent(page, englishThisWeekTopic);

        // =========================================================================================
        // [31] Assigned teacher sees the class feed on their own account
        // =========================================================================================
        await adminOrTeacherSignOut(page);
        await login(page, teacherEmail, password);
        await page.goto(`/feed/${ctx.teacherId}`);
        await waitForLoading(page);
        await expectVisible(page, readingThisWeekBook);
        await expectVisible(page, englishThisWeekTopic);
        await expectVisible(page, scrapbookMarker);

        await adminOrTeacherSignOut(page);
    });
});
