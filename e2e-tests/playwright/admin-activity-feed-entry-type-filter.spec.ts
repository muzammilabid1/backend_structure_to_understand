import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import {
    admin,
    generateFirstName,
    generateLastName,
    generateSchoolName,
    generateTopicName,
    generateUserEmail,
    password,
    readyTeddySubjectId
} from './constants';
import { createSchoolAndDummyWondeData, formatDate, login, waitForLoading } from './utils';
import { UserStatus } from 'lwp-shared';

/**
 * LEA-6262: the admin activity feed has an "Entry type" filter (Reading / Activity / Scrapbook).
 * LEA-6292: scrapbook entries are included when filtering by the Ready Teddy subject.
 *
 * The test seeds one shared feedback of each type (reading / activity / scrapbook) for a single freshly
 * created school, then drives the admin activity feed filters and asserts the matching entries are shown.
 *
 * Filters are applied by navigating with the same query-string params the filter form writes
 * (`schoolIds`, `feedbackTypes`, `subjects`, `sharedStatus`). The page reads these directly from the URL,
 * so this verifies the real backend filtering + feed rendering deterministically, without depending on the
 * filter form's Formik `enableReinitialize` behaviour (which re-renders from each feed response and makes
 * clicking the multi-selects in automation racy).
 */
test.describe('Admin activity feed entry type filter', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Admin can filter the activity feed by reading, activity and scrapbook entries', async ({ page }) => {
        const schoolName = `${generateSchoolName()} School`;
        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();
        const leaderEmail = generateUserEmail(leaderFirstName, leaderLastName);
        const activityTopicName = generateTopicName();
        const scrapbookTopicName = generateTopicName();
        const today = new Date();
        const dateToday = formatDate(today, '-');

        // Data carries the (unique) school name so the entries are easy to assert on in the feed.
        const readingBookName = `Reading book for ${schoolName}`;
        const readingComment = `Reading entry for ${schoolName}`;
        const activityParentComment = `Activity entry for ${schoolName}`;
        const activityPupilComment = `Pupil activity comment for ${schoolName}`;
        const scrapbookComment = `Scrapbook entry for ${schoolName}`;
        const scrapbookPrompt = `Scrapbook prompt for ${schoolName}`;

        // Always-visible markers in each feed card (independent of any collapsed comment sections):
        // reading shows the book name, activity shows the topic name, scrapbook shows a fixed phrase.
        const readingMarker = readingBookName;
        const activityMarker = activityTopicName;
        const scrapbookMarker = 'added a scrapbook entry';

        // -------------------------------------------------------------------------
        // Seed: an active class with a reading, activity and scrapbook topic, each
        // carrying one shared feedback created inside the helper.
        // -------------------------------------------------------------------------

        const { school, readingTopic, activityTopic, scrapbookTopic } = await createSchoolAndDummyWondeData(
            db,
            utils,
            {
                school: {
                    name: schoolName,
                    numOfFullProgrammeClassesAllowed: 10,
                    numOfTotalClassesAllowed: 30,
                    enableAddClasses: true,
                    isMoneySkillsAvailable: false,
                    isReadyTeddyAvailable: true,
                    isFutureAcademicYear: false
                },
                leader: {
                    firstname: leaderFirstName,
                    lastname: leaderLastName,
                    email: leaderEmail,
                    userStatus: UserStatus.ACTIVE,
                    addTooltip: true
                }
            },
            {
                active: true,
                classLicences: { IsReadingLogsEnabled: true, isFullProgramme: true, isReadyTeddyEnabled: true },
                addReadingTopic: {
                    releaseDate: dateToday,
                    feedback: {
                        comment: readingComment,
                        bookName: readingBookName,
                        readingType: 'SCHOOL_BOOK',
                        isBookFinished: true,
                        includeInReadingTarget: true,
                        bookReadAt: today,
                        logCreatedAt: today,
                        logUpdatedAt: today
                    }
                },
                addActivityTopic: {
                    name: activityTopicName,
                    releaseDate: dateToday,
                    feedback: {
                        pupilComment: activityPupilComment,
                        parentComment: activityParentComment,
                        logCreatedAt: today,
                        logUpdatedAt: today
                    }
                },
                addScrapbookTopic: {
                    name: scrapbookTopicName,
                    releaseDate: dateToday,
                    scrapbookPrompt,
                    feedback: {
                        comment: scrapbookComment,
                        logCreatedAt: today,
                        logUpdatedAt: today
                    }
                }
            }
        );

        if (!readingTopic?.feedbackId || !activityTopic?.feedbackId || !scrapbookTopic?.feedbackId)
            throw new Error('Expected reading, activity and scrapbook feedback to be seeded by createSchoolAndDummyWondeData');

        // -------------------------------------------------------------------------
        // Admin: filter the activity feed
        // -------------------------------------------------------------------------

        await login(page, admin, password);
        await page.waitForURL(/\/admin\/all-feeds/);
        await waitForLoading(page);
        await expect(page.getByTestId('all-feeds-page')).toBeVisible();

        // Apply a filter by navigating with the same query params the filter form writes. `filtered=true`
        // suppresses the default-date behaviour and `sharedStatus=SHAREDONLY` matches the seeded (shared)
        // feedback. Always scope to this freshly created school so exactly the seeded entries are in play.
        const filterFeed = async (params: Record<string, string>) => {
            const query = new URLSearchParams({
                filtered: 'true',
                sharedStatus: 'SHAREDONLY',
                schoolIds: JSON.stringify([school.id]),
                ...params
            }).toString();
            await page.goto(`/admin/all-feeds?${query}`);
            await waitForLoading(page);
            await expect(page.getByTestId('all-feeds-page')).toBeVisible();
        };

        const expectMarkers = async (present: string[], absent: string[]) => {
            for (const marker of present) {
                await expect(page.getByText(marker).first()).toBeVisible();
            }
            for (const marker of absent) {
                await expect(page.getByText(marker)).toHaveCount(0);
            }
        };

        // Scoping to this freshly created school surfaces exactly the three seeded entries, so the
        // "N item(s) found" count is the authoritative proof that the filter restricts correctly
        // (a broken type filter would return all 3). The markers confirm which entry shows.

        // 1. Reading entries only
        await filterFeed({ feedbackTypes: JSON.stringify(['READING']) });
        await expect(page.getByText('1 item found')).toBeVisible();
        await expectMarkers([readingMarker], [activityMarker, scrapbookMarker]);

        // 2. Activity entries only
        await filterFeed({ feedbackTypes: JSON.stringify(['ACTIVITY']) });
        await expect(page.getByText('1 item found')).toBeVisible();
        await expectMarkers([activityMarker], [readingMarker, scrapbookMarker]);

        // 3. Scrapbook entries only
        await filterFeed({ feedbackTypes: JSON.stringify(['SCRAPBOOK']) });
        await expect(page.getByText('1 item found')).toBeVisible();
        await expectMarkers([scrapbookMarker], [readingMarker, activityMarker]);
        await expect(page.locator('[data-test="feedback-scrapbook-comment"]').first()).toContainText(scrapbookComment);

        // 4. LEA-6292: filtering by the Ready Teddy subject surfaces scrapbook entries.
        // Scrapbook entries are not linked to a topic/subject, so they only appear under a subject filter
        // because the Ready Teddy programme explicitly includes them. The reading and (English) activity
        // entries are not part of Ready Teddy, so they must not appear.
        await filterFeed({ subjects: JSON.stringify([readyTeddySubjectId]) });
        await expect(page.getByText('1 item found')).toBeVisible();
        await expectMarkers([scrapbookMarker], [readingMarker, activityMarker]);
        await expect(page.locator('[data-test="feedback-scrapbook-comment"]').first()).toContainText(scrapbookComment);
    });
});
