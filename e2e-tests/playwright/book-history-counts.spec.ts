import type { Schema } from '@lwp/postgres-client';
import { expect, test } from '@playwright/test';
import { type Kysely } from 'kysely';
import { UserStatus, UserType } from 'lwp-shared';

import { generateClassName, generateFirstName, generateLastName, generateSchoolName, generateUPN, generateUserEmail, password } from './constants';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import { formatDate, login, waitForLoading } from './utils';

/**
 * LEA-5989: the parent "Books" tab surfaces two counts:
 *   - a "Books logged" badge = distinct book TITLES logged in the current academic year
 *   - per tile, "Read: N times" = the ALL-TIME number of times that book has been logged
 * The tile list itself stays all-time (books logged only in a prior year still appear).
 *
 * LEA-6510: both the badge and the tile list cover books only, so reading logged as
 * SOMETHING_ELSE is excluded from each of them.
 */
test.describe('Book History counts (LEA-5989)', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;
    const today: Date = new Date();
    const todayDate: string = formatDate();

    test.beforeAll(() => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('parent Books tab shows distinct-title year count and all-time per-book counts', { tag: '@sanity' }, async ({ page }) => {
        test.setTimeout(150000);
        const parentFirstName = generateFirstName();
        const parentLastName = generateLastName();
        const parentEmail = generateUserEmail(parentFirstName, parentLastName);
        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();

        const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
        const currentPeriod = await db.selectFrom('static_lwp_period').where('isCurrentPeriod', '=', true).select('index').executeTakeFirstOrThrow();
        const previousPeriod = await db.selectFrom('static_lwp_period').where('isPreviousPeriod', '=', true).select('index').executeTakeFirstOrThrow();

        const school = await utils.createSchool({
            schoolName: `${generateSchoolName()} School`,
            curentPeriodIndex: currentPeriod.index,
            numOfFullProgrammeClassesAllowed: 10,
            numOfTotalClassesAllowed: 30,
            enableAddClasses: true,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const leader = await utils.createUser({
            firstname: leaderFirstName,
            lastname: leaderLastName,
            email: generateUserEmail(leaderFirstName, leaderLastName),
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        const schoolClass = await utils.createClass(school.id, {
            name: generateClassName(),
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            IsReadingLogsEnabled: true,
            readingLaunchDate: todayDate,
            readingStartDay: today.getDay(),
            readingTarget: 1,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const pupil = await utils.createPupil(school.id, {
            firstname: generateFirstName(),
            lastname: generateLastName(),
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const parent = await utils.createUser({
            firstname: parentFirstName,
            lastname: parentLastName,
            email: parentEmail,
            type: UserType.PARENT,
            userStatus: UserStatus.ACTIVE,
            // Reuse the seed user's password hash (id=1, the `password` constant) so login works
            // regardless of the running DB seed, same pattern as the leader above and other specs.
            password: user.password
        });
        await utils.addParentToPupil(pupil.id, parent.id, false);
        await utils.addPupilToClass(pupil.id, schoolClass.id);

        // Give the pupil a released reading topic so the child reading page renders cleanly.
        const staticReadingTopic = await db.selectFrom('static_lwp_topic').where('isReading', '=', true).select(['id']).executeTakeFirstOrThrow();
        const readingClassTopic = await utils.createClassTopic(schoolClass.id, {
            topicId: staticReadingTopic.id,
            releaseDate: todayDate,
            released: true,
            readingTarget: 1
        });
        await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: pupil.id,
            classTopicId: readingClassTopic.id,
            topicId: staticReadingTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false,
            readingTarget: 1
        });

        // Seed reading logs directly: parents can't log "at school" or in a prior year via the UI.
        const seedReading = async (bookName: string, readingType: string, userType: string, periodIndex: number): Promise<void> => {
            const feedback = await db
                .insertInto('lwp_pupil_feedback')
                .values({
                    type: 'READING',
                    bookName,
                    readingType,
                    userType,
                    periodIndex,
                    logOnReadingAsGroupTab: false,
                    logCreatedById: user.id
                })
                .returning('id')
                .executeTakeFirstOrThrow();
            await db.insertInto('lwp_pupil_feedback_history').values({ lwpPupilId: pupil.id, lwpPupilFeedbackId: feedback.id }).executeTakeFirstOrThrow();
        };

        // "The Snail and the Whale": read at home twice + at school once, this year (same title, two reading types)
        await seedReading('The Snail and the Whale', 'OWN_BOOK', UserType.PARENT, currentPeriod.index);
        await seedReading('The Snail and the Whale', 'OWN_BOOK', UserType.PARENT, currentPeriod.index);
        await seedReading('The Snail and the Whale', 'SCHOOL_BOOK', UserType.TEACHER, currentPeriod.index);
        // "James and the Giant Peach": read at home once, this year
        await seedReading('James and the Giant Peach', 'OWN_BOOK', UserType.PARENT, currentPeriod.index);
        // "Old Book": read at home three times LAST year only (still an all-time tile, but excluded from this year's badge)
        await seedReading('Old Book', 'OWN_BOOK', UserType.PARENT, previousPeriod.index);
        await seedReading('Old Book', 'OWN_BOOK', UserType.PARENT, previousPeriod.index);
        await seedReading('Old Book', 'OWN_BOOK', UserType.PARENT, previousPeriod.index);
        // "Museum Trip": logged at home this year as SOMETHING_ELSE, so it is reading but not a book
        await seedReading('Museum Trip', 'SOMETHING_ELSE', UserType.PARENT, currentPeriod.index);

        await login(page, parentEmail, password);
        await waitForLoading(page);
        // Fast-fail if login didn't authenticate (lands on the child reading page when it did).
        await expect(page.getByTestId('child-reading-log-page')).toBeVisible({ timeout: 45000 });
        await expect(page.getByTestId('books-tab')).toBeVisible({ timeout: 30000 });
        await page.getByTestId('books-tab').click();
        await waitForLoading(page);
        await expect(page.getByTestId('child-books-page')).toBeVisible({ timeout: 30000 });

        // Badge = distinct TITLES this academic year: Snail + James = 2.
        // (Snail counts once despite home + school; Old Book excluded as it was only logged last year;
        // Museum Trip excluded as it is not a book.)
        await expect(page.getByTestId('books-logged-count')).toHaveText('2');

        // Books only: the list is Snail/own, Snail/school, James, Old Book. Count the cards first so the
        // something-else check below runs against a rendered list rather than an empty one.
        await expect(page.getByTestId('book-read-count')).toHaveCount(4);
        await expect(page.getByText('Museum Trip')).toHaveCount(0);

        // Per-book "Read: N times" is ALL-TIME.
        await expect(page.getByTestId('book-read-count').filter({ hasText: 'Read: 2 times' }).first()).toBeVisible(); // Snail at home
        await expect(page.getByTestId('book-read-count').filter({ hasText: 'Read: 1 time' }).first()).toBeVisible(); // James (singular)

        // Tile list stays all-time: a book logged only last year still appears with its all-time count.
        await expect(page.getByTestId('book-read-count').filter({ hasText: 'Read: 3 times' }).first()).toBeVisible(); // Old Book
    });
});
