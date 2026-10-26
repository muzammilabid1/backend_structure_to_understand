import type { Schema } from '@lwp/postgres-client';
import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type Insertable, type Kysely, type Selectable, sql } from 'kysely';
import { UserType } from 'lwp-shared';
import { PupilBookHistoryOutput } from 'src/api/dtos/PupilBookHistoryOutput';
import { FeedbackType, PupilBookHistoryFilter, ReadingType } from 'src/api/model';
import { createUtils } from 'src/api/service/functional-tests/utils';
import { PupilService } from 'src/api/service/pupil.service';
import { BaseModule } from 'src/base.module';
import { createDb } from 'src/data-import/functional-tests/utils';

/**
 * LEA-5989: the parent "Books" tab surfaces:
 *   - a "Books logged" badge = distinct book TITLES logged in the current academic year
 *   - per tile, "Read: N times" = the ALL-TIME number of times that book has been logged
 *
 * The tile list itself stays all-time (books from prior years still appear).
 *
 * LEA-6510: both the badge and the tile list cover books only, so reading logged as
 * SOMETHING_ELSE is excluded from each of them.
 */
// Booting the full Nest app + DB round-trips is well over Jest's 5s default.
jest.setTimeout(120000);

describe('PupilService#getPupilBookHistoryForParent (LEA-5989 book counts)', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;
    let app: INestApplication;
    let pupilService: PupilService;

    let parent: Selectable<Schema.LwpUser>;
    let school: Selectable<Schema.LwpSchool>;
    let pupil: Selectable<Schema.LwpPupil>;

    let currentPeriodIndex: number;
    let previousPeriodIndex: number;
    const feedbackIds: string[] = [];

    const SNAIL = 'the snail and the whale'; // normalisedBookName = trim(lower(bookName))
    const JAMES = 'james and the giant peach';
    const OLD_BOOK = 'old book';
    const MUSEUM_TRIP = 'museum trip';

    beforeAll(async () => {
        db = await createDb();
        utils = createUtils(db);
        app = await NestFactory.create(BaseModule);
        pupilService = app.get(PupilService);

        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();
        const previousPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isPreviousPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();

        currentPeriodIndex = currentPeriod.index;
        previousPeriodIndex = previousPeriod.index;

        parent = await utils.createParent({ firstname: 'Book', lastname: 'Parent' });
        school = await utils.createSchool({ schoolName: 'Book History School', curentPeriodIndex: currentPeriodIndex });
        pupil = await utils.createPupil(school.id, {
            UPN: 'B000000000001',
            firstname: 'Booky',
            lastname: 'Pupil',
            dateOfBirth: new Date('2015-01-01')
        });
        await utils.addParentToPupil(pupil.id, parent.id);

        const seedReading = async (fields: Partial<Insertable<Schema.LwpPupilFeedback>>): Promise<void> => {
            const feedback = await utils.createFeedbackEntry({
                logCreatedById: parent.id,
                type: FeedbackType.READING,
                ...fields
            });

            await utils.linkPupilToFeedbackEntry(pupil.id, feedback.id);
            feedbackIds.push(feedback.id);
        };

        // "The Snail and the Whale": read at home, this year, twice (OWN_BOOK)
        await seedReading({
            bookName: 'The Snail and the Whale',
            readingType: ReadingType.OWN_BOOK,
            userType: UserType.PARENT,
            periodIndex: currentPeriodIndex
        });
        await seedReading({
            bookName: 'The Snail and the Whale',
            readingType: ReadingType.OWN_BOOK,
            userType: UserType.PARENT,
            periodIndex: currentPeriodIndex
        });
        // "The Snail and the Whale": read at school, this year, once (SCHOOL_BOOK), same title, different reading type
        await seedReading({
            bookName: 'The Snail and the Whale',
            readingType: ReadingType.SCHOOL_BOOK,
            userType: UserType.TEACHER,
            logOnReadingAsGroupTab: false,
            periodIndex: currentPeriodIndex
        });
        // "James and the Giant Peach": read at home, this year, once
        await seedReading({
            bookName: 'James and the Giant Peach',
            readingType: ReadingType.OWN_BOOK,
            userType: UserType.PARENT,
            periodIndex: currentPeriodIndex
        });
        // "Old Book": read at home LAST year only, three times (must still appear as an all-time tile, but not in this year's badge)
        await seedReading({
            bookName: 'Old Book',
            readingType: ReadingType.OWN_BOOK,
            userType: UserType.PARENT,
            periodIndex: previousPeriodIndex
        });
        await seedReading({
            bookName: 'Old Book',
            readingType: ReadingType.OWN_BOOK,
            userType: UserType.PARENT,
            periodIndex: previousPeriodIndex
        });
        await seedReading({
            bookName: 'Old Book',
            readingType: ReadingType.OWN_BOOK,
            userType: UserType.PARENT,
            periodIndex: previousPeriodIndex
        });
        // "Museum Trip": logged this year as SOMETHING_ELSE, so it is reading but not a book
        await seedReading({
            bookName: 'Museum Trip',
            readingType: ReadingType.SOMETHING_ELSE,
            userType: UserType.PARENT,
            periodIndex: currentPeriodIndex
        });
    });

    afterAll(async () => {
        for (const id of feedbackIds) {
            await utils.deleteFeedbackEntry(id);
        }

        await utils.removeParentFromPupil(pupil.id, parent.id);
        await utils.deletePupil(pupil.id);
        await utils.deleteSchool(school.id);
        await utils.deleteUser(parent.id);

        await app.close();
        await sql`vacuum`.execute(db);
        await db.destroy();
    });

    const findTile = (results: PupilBookHistoryOutput[], bookName: string, readingType: ReadingType): PupilBookHistoryOutput => {
        const tile = results.find((row) => row.bookName === bookName && row.readingType === readingType);

        if (!tile) {
            throw new Error(`No tile found for "${bookName}" (${readingType})`);
        }

        return tile;
    };

    describe('the current-academic-year "Books logged" summary', () => {
        it('counts distinct book TITLES logged this year (a title read at home and at school counts once)', async () => {
            const result = await pupilService.getPupilBookHistoryForParent(pupil.id, PupilBookHistoryFilter.All, 50, 0);

            // Snail (read at home AND at school) -> 1 title; James -> 1 title; Old Book is last year -> excluded.
            // Museum Trip was logged this year but is not a book -> excluded.
            expect(result.currentAcademicYearSummary.distinctBooks).toBe(2);
        });

        it('does not expose a totalLogs reading-sessions count', async () => {
            const result = await pupilService.getPupilBookHistoryForParent(pupil.id, PupilBookHistoryFilter.All, 50, 0);

            expect((result.currentAcademicYearSummary as unknown as Record<string, unknown>).totalLogs).toBeUndefined();
        });
    });

    describe('the per-book "Read: N times" count', () => {
        it('reports the ALL-TIME number of times each book/reading-type was logged', async () => {
            const result = await pupilService.getPupilBookHistoryForParent(pupil.id, PupilBookHistoryFilter.All, 50, 0);

            expect(Number(findTile(result.results, SNAIL, ReadingType.OWN_BOOK).logCount)).toBe(2);
            expect(Number(findTile(result.results, SNAIL, ReadingType.SCHOOL_BOOK).logCount)).toBe(1);
            expect(Number(findTile(result.results, JAMES, ReadingType.OWN_BOOK).logCount)).toBe(1);
        });
    });

    describe('the tile list', () => {
        it('stays all-time: books logged only in a prior year still appear with their all-time count', async () => {
            const result = await pupilService.getPupilBookHistoryForParent(pupil.id, PupilBookHistoryFilter.All, 50, 0);

            const oldBookTile = findTile(result.results, OLD_BOOK, ReadingType.OWN_BOOK);

            expect(Number(oldBookTile.logCount)).toBe(3);

            // 4 distinct (title, readingType) tiles all-time: Snail/own, Snail/school, James/own, Old Book/own
            expect(result.total).toBe(4);
        });
    });

    describe('reading logged as something else', () => {
        it('is left out of the tile list', async () => {
            const result = await pupilService.getPupilBookHistoryForParent(pupil.id, PupilBookHistoryFilter.All, 50, 0);

            expect(result.results.some((row) => row.bookName === MUSEUM_TRIP)).toBe(false);
        });

        it('is left out of the current-academic-year book count', async () => {
            const result = await pupilService.getPupilBookHistoryForParent(pupil.id, PupilBookHistoryFilter.All, 50, 0);

            // Snail and James only, even though Museum Trip was also logged this year.
            expect(result.currentAcademicYearSummary.distinctBooks).toBe(2);
        });

        it('is left out of the teacher view, which reads the same book history', async () => {
            const results = await pupilService.getPupilBookHistoryForTeacher({
                pupilId: pupil.id,
                bookName: undefined,
                isSchoolBooksOnly: false,
                isCurrentYearOnly: false,
                readAt: undefined
            });

            expect(results.some((row) => row.bookName === MUSEUM_TRIP)).toBe(false);
            expect(results).toHaveLength(4);
        });
    });
});
