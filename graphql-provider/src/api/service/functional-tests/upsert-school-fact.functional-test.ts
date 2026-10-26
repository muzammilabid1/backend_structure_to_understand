import type { Schema } from '@lwp/postgres-client';
import { type Kysely, sql } from 'kysely';
import { createUtils } from 'src/api/service/functional-tests/utils';
import { createDb } from 'src/data-import/functional-tests/utils';

// Subject ids on the analytics fact rows: 0 is the reading log, -1 the row that aggregates every subject.
const READING_SUBJECT_ID = '0';
const ALL_SUBJECTS_ID = '-1';

// upsert_school_fact() works through every school in the database, which can run past Jest's 5s default.
jest.setTimeout(120000);

describe('upsert_school_fact() registered parents across academic years (LEA-6779)', () => {
    let db: Kysely<Schema.DB>;

    beforeAll(() => {
        db = createDb();
    });

    afterAll(async () => {
        await db.destroy();
    });

    it('counts only the parents of pupils active in the current academic year', async () => {
        // The fixtures and the function run are rolled back together, so nothing is left in the database
        // and the other schools' analytics_school_fact rows are not rewritten.
        const trx = await db.startTransaction().execute();

        try {
            const utils = createUtils(trx);

            const { index: currentPeriodIndex } = await trx
                .selectFrom('static_lwp_period')
                .where('isCurrentPeriod', '=', true)
                .orderBy('index', 'desc')
                .select('index')
                .executeTakeFirstOrThrow();

            const school = await utils.createSchool({ schoolName: 'School Fact Parents School', curentPeriodIndex: currentPeriodIndex });
            const lastYearPupil = await utils.createPupil(school.id, { firstname: 'Last Year', lastname: 'Pupil' });
            const thisYearPupil = await utils.createPupil(school.id, { firstname: 'This Year', lastname: 'Pupil' });

            // Two parents last year and one this year, so counting both years (3) or only last year (2) fails the test.
            const lastYearFirstParent = await utils.createParent({ firstname: 'Last Year', lastname: 'First Parent' });
            const lastYearSecondParent = await utils.createParent({ firstname: 'Last Year', lastname: 'Second Parent' });
            const thisYearParent = await utils.createParent({ firstname: 'This Year', lastname: 'Parent' });

            await utils.addParentToPupil(lastYearPupil.id, lastYearFirstParent.id);
            await utils.addParentToPupil(lastYearPupil.id, lastYearSecondParent.id);
            await utils.addParentToPupil(thisYearPupil.id, thisYearParent.id);

            // Each pupil has parent reading entries in one academic year only: last year or this year.
            await trx
                .insertInto('analytics_pupil_fact')
                .values([
                    {
                        pupilId: lastYearPupil.id,
                        schoolId: school.id,
                        timeKey: currentPeriodIndex - 1,
                        timeGrain: 'yearly',
                        subjectId: READING_SUBJECT_ID,
                        subject: 'Reading',
                        parentFeedbackEntries: 3
                    },
                    {
                        pupilId: thisYearPupil.id,
                        schoolId: school.id,
                        timeKey: currentPeriodIndex,
                        timeGrain: 'yearly',
                        subjectId: READING_SUBJECT_ID,
                        subject: 'Reading',
                        parentFeedbackEntries: 2
                    }
                ])
                .execute();

            await sql`SELECT upsert_school_fact()`.execute(trx);

            const rows = await trx
                .selectFrom('analytics_school_fact')
                .where('schoolId', '=', school.id)
                .where('timeKey', '=', currentPeriodIndex)
                .where('subjectId', 'in', [ALL_SUBJECTS_ID, READING_SUBJECT_ID])
                .orderBy('subjectId')
                .select(['subjectId', 'registeredParentsCount'])
                .execute();

            expect(rows).toEqual([
                { subjectId: ALL_SUBJECTS_ID, registeredParentsCount: 1 },
                { subjectId: READING_SUBJECT_ID, registeredParentsCount: 1 }
            ]);
        } finally {
            await trx.rollback().execute();
        }
    });
});
