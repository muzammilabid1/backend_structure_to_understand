import { HttpException, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SequenceTimingMode, SubjectProgrammeType, WholeSchoolYearGroupSkipReason } from 'lwp-shared/enums';
import moment from 'moment';
import { ClassSequenceAssignmentService } from 'src/api/service/class_sequence_assignment.service';
import { TopicSequenceService } from 'src/api/service/topic_sequence.service';
import { WholeSchoolAutoScheduleService } from 'src/api/service/whole_school_auto_schedule.service';
import { WholeSchoolSequenceService } from 'src/api/service/whole_school_sequence.service';
import { BaseModule } from 'src/base.module';
import { Connection } from 'typeorm';

/*
 * **Both halves of the leader-facing service live in one file, and must.**
 *
 * Jest runs suites in parallel workers against the one database they share, and a whole-school
 * sequence is global static content keyed on (subject, academic year). Two suites both creating one
 * for the same pair collide, and the failures then land on whichever got there second rather than on
 * the code that is wrong. Splitting these two broke a full functional run once already. One file is
 * one worker, and that is the only lock available here.
 */
/**
 * The leader's preview against a real database (LEA-6697). Run with `yarn test:functional`.
 *
 * Three things here cannot be mocked and are the reason this file exists:
 *   - the **class sweep** is four SQL conditions, and a unit test with a mocked query builder can
 *     only prove they were asked for, never that they select the classes an admin would expect;
 *   - the **draft is invisible** rule, which is the security boundary of the whole slice: a leader
 *     must not be shown content the team has not published, and that turns on a real status filter
 *     against a real row;
 *   - the page **writes nothing**, which is asserted here by counting rows either side rather than
 *     by reading the code and believing it.
 *
 * Fixtures are discovered from whatever content the database holds rather than from seed ids, so
 * this survives a reseed. Everything it creates is removed again in afterAll.
 */
// Booting the full Nest app + DB round-trips is well over Jest's 5s default.
jest.setTimeout(120000);

/*
 * One Nest app for the whole file, shared by both suites below.
 *
 * Booting a second one alongside the first exhausted the worker and the suite failed to run at all,
 * with nothing to say which test was at fault. Neither suite needs its own: they exercise the same
 * service, and the app is stateless between them. Only the data each creates is its own, which is
 * what the per-suite hooks clean up.
 */
let app: INestApplication;
let connection: Connection;
let service: WholeSchoolAutoScheduleService;
let wholeSchoolSequenceService: WholeSchoolSequenceService;
let classSequenceAssignmentService: ClassSequenceAssignmentService;
let sequenceService: TopicSequenceService;

beforeAll(async () => {
    app = await NestFactory.create(BaseModule);
    connection = app.get(Connection);
    service = app.get(WholeSchoolAutoScheduleService);
    wholeSchoolSequenceService = app.get(WholeSchoolSequenceService);
    classSequenceAssignmentService = app.get(ClassSequenceAssignmentService);
    sequenceService = app.get(TopicSequenceService);
});

afterAll(async () => {
    await app?.close();
});

describe('WholeSchoolAutoScheduleService against the database', () => {
    let schoolId: string;
    let subjectId: string;
    let yearGroupId: string;
    let yearGroupName: string;
    let topicId: string;
    let periodIndex: number;
    let periodStart: string;
    /** How many of this school's classes in that year group the sweep should find. */
    let eligibleClassCount: number;
    let userId: string;

    const createdWholeSchoolSequenceIds: string[] = [];
    const createdSequenceIds: string[] = [];

    beforeAll(async () => {
        /*
         * A school with at least one class the sweep will find, in a year group the chosen subject
         * has a usable topic for.
         *
         * The entitlement expression mirrors `allowedProgrammeTypesForClass` exactly, and the class
         * conditions mirror `getEligibleClassesForSubject`, so the count this computes is the count
         * the service is expected to reach by a different route. Getting that wrong here would make
         * the assertions agree with the implementation rather than with the rule.
         *
         * The topic rules mirror the sequence topic picker's, because the fixture builds a real
         * sequence and `createSequence` would otherwise refuse the topic and fail the fixture rather
         * than the case under test.
         *
         * The last condition keeps this off any (subject, year) a real whole-school sequence already
         * occupies. The unique key is plain, so creating a second one for the same pair would fail,
         * and deleting the real one to make room is not something a test may do.
         */
        const [fixture] = await connection.query(`
            WITH usable_topic AS (
                SELECT d."subjectId" AS subject_id,
                       tdyg."yearGroupId" AS year_group_id,
                       (array_agg(DISTINCT t.id))[1] AS topic_id
                FROM static_lwp_topic_domain d
                JOIN static_lwp_topic_domain_year_group tdyg ON tdyg."domainId" = d.id
                JOIN static_lwp_topic t ON t.id = tdyg."topicId"
                JOIN static_lwp_year_group yg ON yg.id = tdyg."yearGroupId"
                WHERE t."isPublished" AND NOT t."isHidden" AND NOT t."isReading"
                  AND yg.year != 'Unknown'
                  AND NOT EXISTS (
                      SELECT 1
                      FROM static_lwp_activity a
                      JOIN static_lwp_activity_steps st ON st."activityId" = a.id
                      WHERE a."topicId" = t.id AND NOT a."isHidden" AND st."stepType" = 'SET_BY_TEACHER'
                  )
                GROUP BY 1, 2
            )
            SELECT sch.id::text AS "schoolId",
                   s.id::text AS "subjectId",
                   yg.id::text AS "yearGroupId",
                   yg.year AS "yearGroupName",
                   ut.topic_id::text AS "topicId",
                   p.index AS "periodIndex",
                   p."startDate"::text AS "periodStart",
                   count(DISTINCT c.id)::int AS "eligibleClassCount"
            FROM lwp_school_class c
            JOIN lwp_school sch ON sch.id = c."schoolId"
            JOIN static_lwp_period p ON p.index = sch."curentPeriodIndex"
            JOIN static_lwp_year_group yg ON yg.id = c."yearGroup"
            JOIN usable_topic ut ON ut.year_group_id = c."yearGroup"
            JOIN static_lwp_subject s ON s.id = ut.subject_id
            -- The four conditions getEligibleClassesForSubject applies, in the same order.
            WHERE c."isRegistrationClass"
              AND NOT c."isGroupAcrossClasses"
              AND c.status = 'ACTIVE'
              AND c."periodIndex" = sch."curentPeriodIndex"
              AND ((s."programmeType" = 'FULL_PROGRAMME' AND c."isFullProgramme")
                OR (s."programmeType" = 'READY_TEDDY' AND c."isReadyTeddyEnabled")
                OR (s."programmeType" = 'MONEY_SKILLS' AND sch."isMoneySkillsAvailable"
                    AND (((c."isRegistrationClass" OR c."isGroupAcrossClasses") AND c."IsReadingLogsEnabled")
                         OR c."isFullProgramme")))
              -- A fixed sequence's topics have to be datable inside the year it declares.
              AND p."startDate" IS NOT NULL AND p."endDate" IS NOT NULL
              AND p."endDate" >= greatest(CURRENT_DATE, p."startDate") + 1
              /*
               * Already under way, so a topic can be dated before today and still sit inside the
               * academic year, which is what the past-dated cases need (LEA-6699). Every real
               * current year satisfies this; a year that starts tomorrow is not one a school is
               * teaching yet.
               */
              AND p."startDate" < CURRENT_DATE
              AND NOT EXISTS (
                  SELECT 1 FROM static_lwp_whole_school_sequence w
                  WHERE w."subjectId" = s.id AND w."periodIndex" = sch."curentPeriodIndex"
              )
            GROUP BY 1, 2, 3, 4, 5, 6, 7
            -- Most classes first, so the fan-out is exercised by more than one where the data allows.
            ORDER BY "eligibleClassCount" DESC
            LIMIT 1
        `);

        if (!fixture) {
            throw new Error(
                'No school with an eligible class in a year group that has a usable topic, for a subject and ' +
                    'academic year with no whole-school sequence already on it. Seed the database, and check that ' +
                    'static_lwp_period rows have start and end dates.'
            );
        }

        schoolId = fixture.schoolId;
        subjectId = fixture.subjectId;
        yearGroupId = fixture.yearGroupId;
        yearGroupName = fixture.yearGroupName;
        topicId = fixture.topicId;
        periodIndex = Number(fixture.periodIndex);
        periodStart = fixture.periodStart;
        eligibleClassCount = fixture.eligibleClassCount;

        const [user] = await connection.query(`SELECT id::text AS id FROM lwp_user ORDER BY id LIMIT 1`);

        if (!user) throw new Error('No users in the database; seed the database first');

        userId = user.id;
    });

    /*
     * Every case builds its own whole-school sequence for the same subject and year, because that
     * pair is what the service resolves by and so cannot vary between cases. The unique key is plain
     * and covers drafts as well as published ones, so the row has to go before the next case creates
     * its own. Deleting it cascades its members; the member sequences are left for afterAll.
     */
    afterEach(async () => {
        await connection.query(`DELETE FROM static_lwp_whole_school_sequence WHERE "subjectId" = $1 AND "periodIndex" = $2`, [
            subjectId,
            periodIndex
        ]);
    });

    afterAll(async () => {
        /*
         * Whole-school sequences first: a member's link to its sequence is RESTRICT, so the sequences
         * cannot go while any year group still receives one.
         *
         * Scoped to the subject and year this suite used rather than only to the ids it tracked, so a
         * run that dies between the insert and the push still leaves nothing behind. These are global
         * static content, and a leftover would be offered to every entitled school.
         */
        await connection.query(`DELETE FROM static_lwp_whole_school_sequence WHERE "subjectId" = $1 AND "periodIndex" = $2`, [
            subjectId,
            periodIndex
        ]);

        if (createdSequenceIds.length) {
            await connection.query(`DELETE FROM static_lwp_topic_sequence WHERE id = ANY($1::bigint[])`, [createdSequenceIds]);
        }
    });

    /** A real fixed sequence for the fixture's year group, dated inside the academic year it declares. */
    const createMemberSequence = async (): Promise<string> => {
        const sequence = await sequenceService.createSequence(
            {
                name: `Functional whole-school member ${Date.now().toString(36)}`,
                subjectId,
                yearGroupId,
                periodIndex,
                timingMode: SequenceTimingMode.FIXED,
                items: [
                    {
                        topicId,
                        order: 1,
                        startDate: new Date(moment.max(moment(), moment(periodStart)).format('YYYY-MM-DD'))
                    }
                ]
            },
            userId
        );

        createdSequenceIds.push(sequence.id);

        return sequence.id;
    };

    /** A whole-school sequence for the fixture's subject and year, holding one member, left as a draft. */
    const createDraftWithMember = async (): Promise<string> => {
        const sequenceId = await createMemberSequence();

        const created = await wholeSchoolSequenceService.createWholeSchoolSequence(
            { subjectId, periodIndex, members: [{ sequenceId }] },
            userId
        );

        createdWholeSchoolSequenceIds.push(created.id);

        return created.id;
    };

    it('does not offer a draft to a school, however complete it is', async () => {
        await createDraftWithMember();

        const preview = await service.previewWholeSchoolSequence(schoolId, subjectId);

        // The whole security boundary of this slice: unfinished content must not reach a school.
        expect(preview.wholeSchoolSequenceId).toBeUndefined();
        expect(preview.rows).toEqual([]);
        expect(preview.activitiesToCreate).toEqual(0);

        // The page can still say which subject and year it found nothing for.
        expect(preview.subjectName).toBeTruthy();
        expect(preview.academicYear).toBeTruthy();
    });

    it('offers it once published, with the year group row the school would receive', async () => {
        const wholeSchoolSequenceId = await createDraftWithMember();

        await wholeSchoolSequenceService.publishWholeSchoolSequence(wholeSchoolSequenceId, userId);

        const preview = await service.previewWholeSchoolSequence(schoolId, subjectId);

        expect(preview.wholeSchoolSequenceId).toEqual(wholeSchoolSequenceId);

        const row = preview.rows.find((candidate) => candidate.yearGroupId === yearGroupId);

        expect(row).toBeDefined();
        expect(row.yearGroup).toEqual(yearGroupName);
        expect(row.skipped).toBe(false);
        expect(row.sequenceId).toBeTruthy();
        expect(row.startDate).toBeTruthy();

        /*
         * The count the fixture derived straight from SQL, reached by the service through the entity
         * sweep and the in-memory entitlement filter. Two routes to one number is what makes this an
         * assertion about the rule rather than about the implementation.
         */
        expect(row.classCount).toEqual(eligibleClassCount);
        // One topic in the member sequence, so one activity per class.
        expect(row.activityCount).toEqual(eligibleClassCount);
        expect(preview.classesCovered).toEqual(eligibleClassCount);
    });

    /*
     * The school overview prompt, one case per way each of its three conditions can fail.
     *
     * **Self-contained rather than built on this file's fixture subject.** The fixture takes whichever
     * subject the database offers, which can be a full programme one, and the prompt deliberately never
     * names those. Ready Teddy is used instead because a class's entitlement to it is a single flag, so
     * each case can switch it on or off directly.
     *
     * The rows are inserted rather than built through the admin and scheduling services, because the
     * prompt reads nothing but those rows. Building and scheduling for real is covered above and in
     * the Playwright spec, which schedules and watches the prompt go.
     */
    describe('the school overview prompt', () => {
        let readyTeddySubjectId: string;
        let fullProgrammeSubjectId: string;
        let otherPeriodIndex: number;
        let currentYearClassId: string;
        /** Every class's own flags, so each case can put them back exactly as it found them. */
        let classFlags: { id: string; isReadyTeddyEnabled: boolean; isFullProgramme: boolean }[];

        const promptedSubjectIds = async (): Promise<string[]> =>
            (await service.getWholeSchoolAutoSchedulePrompts(schoolId)).map((prompt) => prompt.subjectId);

        const insertWholeSchoolSequence = async (forSubjectId: string, status: string, forPeriodIndex = periodIndex): Promise<string> => {
            const [row] = await connection.query(
                `INSERT INTO static_lwp_whole_school_sequence ("subjectId", "periodIndex", status) VALUES ($1, $2, $3) RETURNING id::text AS id`,
                [forSubjectId, forPeriodIndex, status]
            );

            return row.id;
        };

        const entitleOneClass = async (flag: 'isReadyTeddyEnabled' | 'isFullProgramme'): Promise<void> => {
            await connection.query(`UPDATE lwp_school_class SET "${flag}" = true WHERE id = $1`, [currentYearClassId]);
        };

        beforeAll(async () => {
            [{ id: readyTeddySubjectId }] = await connection.query(
                `SELECT id::text AS id FROM static_lwp_subject WHERE "programmeType" = 'READY_TEDDY' ORDER BY id LIMIT 1`
            );
            [{ id: fullProgrammeSubjectId }] = await connection.query(
                `SELECT id::text AS id FROM static_lwp_subject WHERE "programmeType" = 'FULL_PROGRAMME' AND id <> $1 ORDER BY id LIMIT 1`,
                [subjectId]
            );
            [{ index: otherPeriodIndex }] = await connection.query(
                `SELECT index FROM static_lwp_period WHERE index <> $1 ORDER BY abs(index - $1) LIMIT 1`,
                [periodIndex]
            );
            [{ id: currentYearClassId }] = await connection.query(
                `SELECT id::text AS id FROM lwp_school_class
                 WHERE "schoolId" = $1 AND "periodIndex" = $2 AND "isRegistrationClass" AND NOT "isGroupAcrossClasses" AND status = 'ACTIVE'
                 ORDER BY id LIMIT 1`,
                [schoolId, periodIndex]
            );
            classFlags = await connection.query(
                `SELECT id::text AS id, "isReadyTeddyEnabled", "isFullProgramme" FROM lwp_school_class WHERE "schoolId" = $1`,
                [schoolId]
            );
        });

        // No class takes Ready Teddy unless a case says so, whatever the database had.
        beforeEach(async () => {
            await connection.query(`UPDATE lwp_school_class SET "isReadyTeddyEnabled" = false WHERE "schoolId" = $1`, [schoolId]);
        });

        afterEach(async () => {
            await connection.query(`DELETE FROM lwp_whole_school_sequence_assignment WHERE "schoolId" = $1 AND "subjectId" = $2`, [
                schoolId,
                readyTeddySubjectId
            ]);
            await connection.query(
                `DELETE FROM static_lwp_whole_school_sequence
                 WHERE ("subjectId" = $1 AND "periodIndex" IN ($3, $4)) OR ("subjectId" = $2 AND "periodIndex" = $3)`,
                [readyTeddySubjectId, fullProgrammeSubjectId, periodIndex, otherPeriodIndex]
            );

            for (const { id, isReadyTeddyEnabled, isFullProgramme } of classFlags) {
                await connection.query(`UPDATE lwp_school_class SET "isReadyTeddyEnabled" = $2, "isFullProgramme" = $3 WHERE id = $1`, [
                    id,
                    isReadyTeddyEnabled,
                    isFullProgramme
                ]);
            }
        });

        it('prompts a school that is entitled, has one published for its year, and has not scheduled it', async () => {
            await insertWholeSchoolSequence(readyTeddySubjectId, 'PUBLISHED');
            await entitleOneClass('isReadyTeddyEnabled');

            expect(await promptedSubjectIds()).toContain(readyTeddySubjectId);
        });

        it('does not prompt a school with no class entitled to the subject', async () => {
            await insertWholeSchoolSequence(readyTeddySubjectId, 'PUBLISHED');

            expect(await promptedSubjectIds()).not.toContain(readyTeddySubjectId);
        });

        it('does not prompt for a draft', async () => {
            await insertWholeSchoolSequence(readyTeddySubjectId, 'DRAFT');
            await entitleOneClass('isReadyTeddyEnabled');

            expect(await promptedSubjectIds()).not.toContain(readyTeddySubjectId);
        });

        it('does not prompt for one published for another academic year', async () => {
            await insertWholeSchoolSequence(readyTeddySubjectId, 'PUBLISHED', otherPeriodIndex);
            await entitleOneClass('isReadyTeddyEnabled');

            expect(await promptedSubjectIds()).not.toContain(readyTeddySubjectId);
        });

        it('stops prompting once the school has a live run, and prompts again once it is removed', async () => {
            const wholeSchoolSequenceId = await insertWholeSchoolSequence(readyTeddySubjectId, 'PUBLISHED');

            await entitleOneClass('isReadyTeddyEnabled');

            const [run] = await connection.query(
                `INSERT INTO lwp_whole_school_sequence_assignment ("schoolId", "subjectId", "periodIndex", "wholeSchoolSequenceId", status)
                 VALUES ($1, $2, $3, $4, 'ASSIGNED') RETURNING id::text AS id`,
                [schoolId, readyTeddySubjectId, periodIndex, wholeSchoolSequenceId]
            );

            expect(await promptedSubjectIds()).not.toContain(readyTeddySubjectId);

            await connection.query(`UPDATE lwp_whole_school_sequence_assignment SET status = 'REMOVED' WHERE id = $1`, [run.id]);

            expect(await promptedSubjectIds()).toContain(readyTeddySubjectId);
        });

        // The admin form cannot publish one for a full programme subject, so this is the only route to it.
        it('does not prompt for a full programme subject, as the Auto schedule tab does not list one', async () => {
            await insertWholeSchoolSequence(fullProgrammeSubjectId, 'PUBLISHED');
            await entitleOneClass('isFullProgramme');

            expect(await promptedSubjectIds()).not.toContain(fullProgrammeSubjectId);
        });
    });

    it('reconciles its totals with its rows, whatever the school holds', async () => {
        const wholeSchoolSequenceId = await createDraftWithMember();

        await wholeSchoolSequenceService.publishWholeSchoolSequence(wholeSchoolSequenceId, userId);

        const preview = await service.previewWholeSchoolSequence(schoolId, subjectId);

        expect(preview.activitiesToCreate).toEqual(preview.rows.reduce((total, row) => total + row.activityCount, 0));

        /*
         * Every eligible class in the school is counted once and once only. A covered row's classes
         * are covered, a NO_SEQUENCE_FOR_YEAR_GROUP row's are skipped, and a NO_ELIGIBLE_CLASSES row
         * has none to contribute, so the two totals partition the sweep exactly.
         */
        const classesInRows = preview.rows.reduce((total, row) => total + row.classCount, 0);

        expect(preview.classesCovered + preview.classesSkipped).toEqual(classesInRows);
    });

    it('shows a year group the school has classes in but the sequence does not cover, as skipped', async () => {
        const wholeSchoolSequenceId = await createDraftWithMember();

        await wholeSchoolSequenceService.publishWholeSchoolSequence(wholeSchoolSequenceId, userId);

        const preview = await service.previewWholeSchoolSequence(schoolId, subjectId);

        /*
         * Only one year group has a member, so any other year group this school teaches must appear
         * as uncovered rather than be dropped. Schools with a single year group are legitimate, so
         * this asserts the shape of whatever uncovered rows exist rather than requiring one.
         */
        preview.rows
            .filter((row) => row.yearGroupId !== yearGroupId)
            .forEach((row) => {
                expect(row.skipped).toBe(true);
                expect(row.skipReason).toEqual(WholeSchoolYearGroupSkipReason.NO_SEQUENCE_FOR_YEAR_GROUP);
                expect(row.sequenceId).toBeUndefined();
                expect(row.activityCount).toEqual(0);
                // A row with no classes and no member would be noise and is not built at all.
                expect(row.classCount).toBeGreaterThan(0);
            });
    });

    it('writes nothing at all', async () => {
        const wholeSchoolSequenceId = await createDraftWithMember();

        await wholeSchoolSequenceService.publishWholeSchoolSequence(wholeSchoolSequenceId, userId);

        const countRows = async (): Promise<Record<string, number>> => {
            const [counts] = await connection.query(`
                SELECT (SELECT count(*) FROM lwp_class_topic)::int AS class_topics,
                       (SELECT count(*) FROM lwp_class_sequence_assignment)::int AS assignments
            `);

            return counts;
        };

        const before = await countRows();

        await service.previewWholeSchoolSequence(schoolId, subjectId);

        // The acceptance criterion of the whole slice, asserted rather than assumed: the button that
        // acts on this plan arrives in LEA-6698, and until then nothing on the page may persist.
        expect(await countRows()).toEqual(before);
    });

    it('refuses a school that does not exist, rather than previewing an empty one', async () => {
        await expect(service.previewWholeSchoolSequence('0', subjectId)).rejects.toThrow();
    });

    it('refuses a subject that does not exist', async () => {
        await expect(service.previewWholeSchoolSequence(schoolId, '0')).rejects.toThrow();
    });
});

describe('WholeSchoolAutoScheduleService.assignWholeSchoolSequence against the database', () => {
    let schoolId: string;
    let subjectId: string;
    let yearGroupId: string;
    let topicIds: string[];
    let periodIndex: number;
    let periodStart: string;
    /** At least two, which is what makes "one member serves many classes" a real assertion. */
    let classIdsInYearGroup: string[];
    let userId: string;

    const createdSequenceIds: string[] = [];

    beforeAll(async () => {
        /*
         * A school with **two or more** eligible classes in one year group, for a subject with two
         * usable topics in it, in a year with room left to date a sequence in.
         *
         * Two classes is the point of the fixture: with one, a fan-out bug that scheduled only the
         * first class would pass every assertion here. Two topics, because a failure part way through
         * a single-topic run is a weaker test of rollback than one with several rows per class.
         *
         * The class conditions mirror `getEligibleClassesForSubject` and the entitlement expression
         * mirrors `allowedProgrammeTypesForClass`, so the fixture computes the expected set by a
         * different route from the code under test.
         */
        const [fixture] = await connection.query(`
            WITH usable_topics AS (
                SELECT d."subjectId" AS subject_id,
                       tdyg."yearGroupId" AS year_group_id,
                       array_agg(DISTINCT t.id ORDER BY t.id) AS topic_ids
                FROM static_lwp_topic_domain d
                JOIN static_lwp_topic_domain_year_group tdyg ON tdyg."domainId" = d.id
                JOIN static_lwp_topic t ON t.id = tdyg."topicId"
                JOIN static_lwp_year_group yg ON yg.id = tdyg."yearGroupId"
                WHERE t."isPublished" AND NOT t."isHidden" AND NOT t."isReading"
                  AND yg.year != 'Unknown'
                  AND NOT EXISTS (
                      SELECT 1
                      FROM static_lwp_activity a
                      JOIN static_lwp_activity_steps st ON st."activityId" = a.id
                      WHERE a."topicId" = t.id AND NOT a."isHidden" AND st."stepType" = 'SET_BY_TEACHER'
                  )
                GROUP BY 1, 2
                HAVING count(DISTINCT t.id) >= 2
            )
            SELECT sch.id::text AS "schoolId",
                   s.id::text AS "subjectId",
                   yg.id::text AS "yearGroupId",
                   (free.free_topic_ids[1:2])::text[] AS "topicIds",
                   p.index AS "periodIndex",
                   p."startDate"::text AS "periodStart",
                   array_agg(DISTINCT c.id::text) AS "classIds"
            FROM lwp_school_class c
            JOIN lwp_school sch ON sch.id = c."schoolId"
            JOIN static_lwp_period p ON p.index = sch."curentPeriodIndex"
            JOIN static_lwp_year_group yg ON yg.id = c."yearGroup"
            JOIN usable_topics ut ON ut.year_group_id = c."yearGroup"
            JOIN static_lwp_subject s ON s.id = ut.subject_id
            /*
             * The usable topics **no class in this school and year group already holds**.
             *
             * Chosen rather than filtered: taking the first two and then demanding they be free
             * cannot resolve on a seeded database where a class happens to hold the lowest id, even
             * when other topics in the same subject are untouched. That is not a missing fixture, it
             * is this query declining to look past the first two, and it fails with a message that
             * sends the reader off to reseed a database that was fine.
             */
            JOIN LATERAL (
                SELECT array_agg(candidate ORDER BY candidate) AS free_topic_ids
                FROM unnest(ut.topic_ids) AS candidate
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM lwp_class_topic ct
                    JOIN lwp_school_class held ON held.id = ct."classId"
                    WHERE held."schoolId" = sch.id AND held."yearGroup" = c."yearGroup" AND ct."topicId" = candidate
                )
            ) free ON cardinality(free.free_topic_ids) >= 2
            WHERE c."isRegistrationClass"
              AND NOT c."isGroupAcrossClasses"
              AND c.status = 'ACTIVE'
              AND c."periodIndex" = sch."curentPeriodIndex"
              AND ((s."programmeType" = 'FULL_PROGRAMME' AND c."isFullProgramme")
                OR (s."programmeType" = 'READY_TEDDY' AND c."isReadyTeddyEnabled")
                OR (s."programmeType" = 'MONEY_SKILLS' AND sch."isMoneySkillsAvailable"
                    AND (((c."isRegistrationClass" OR c."isGroupAcrossClasses") AND c."IsReadingLogsEnabled")
                         OR c."isFullProgramme")))
              AND p."startDate" IS NOT NULL AND p."endDate" IS NOT NULL
              AND p."endDate" >= greatest(CURRENT_DATE, p."startDate") + 1
              AND NOT EXISTS (
                  SELECT 1 FROM static_lwp_whole_school_sequence w
                  WHERE w."subjectId" = s.id AND w."periodIndex" = sch."curentPeriodIndex"
              )
              /*
               * The clean slate the assertions assume is now guaranteed by the lateral above, which
               * only offers topics no class in this year group holds. It matters: a class that
               * already holds every topic it would be given gets an empty plan and is deliberately
               * left out of the run, and one holding some of them receives fewer. Both are correct,
               * and both have a case of their own below, so neither may reach the cases that are
               * about something else. Seeded databases really do carry these rows.
               */
            GROUP BY 1, 2, 3, 4, 5, 6
            HAVING count(DISTINCT c.id) >= 2
            ORDER BY count(DISTINCT c.id) DESC
            LIMIT 1
        `);

        if (!fixture) {
            throw new Error(
                'No school with two or more eligible classes in one year group, where at least two usable topics in ' +
                    'that subject and year group are held by none of them, for a subject with no whole-school ' +
                    'sequence on that subject and year. Seed the database, and check that the current ' +
                    'static_lwp_period row has start and end dates and has already begun.'
            );
        }

        schoolId = fixture.schoolId;
        subjectId = fixture.subjectId;
        yearGroupId = fixture.yearGroupId;
        topicIds = fixture.topicIds;
        periodIndex = Number(fixture.periodIndex);
        periodStart = fixture.periodStart;
        classIdsInYearGroup = fixture.classIds;

        const [user] = await connection.query(`SELECT id::text AS id FROM lwp_user ORDER BY id LIMIT 1`);

        if (!user) throw new Error('No users in the database; seed the database first');

        userId = user.id;
    });

    /*
     * Everything a case creates on the fixture school, in dependency order.
     *
     * Class topics are real rows on real classes, so leaving one behind would put a topic on a live
     * class's schedule.
     *
     * **Scoped to the fixture school rather than to the whole-school link**, which is wider than it
     * first looks and has to be. Two cases here schedule classes directly through
     * `assignSequenceToClass`, to set up "this class already holds everything", and those rows carry
     * no `wholeSchoolAssignmentId` at all. The narrower version left them behind, so every case that
     * ran afterwards met a school whose classes already held the sequence and was told, correctly,
     * that there was nothing left to give it. The suite passed only because the cases that minded
     * happened to run first.
     */
    const removeRunRows = async (): Promise<void> => {
        await connection.query(
            `DELETE FROM lwp_class_topic
             WHERE "classSequenceAssignmentId" IN (
                 SELECT a.id FROM lwp_class_sequence_assignment a
                 JOIN lwp_school_class c ON c.id = a."classId"
                 WHERE c."schoolId" = $1
             )`,
            [schoolId]
        );
        await connection.query(
            `DELETE FROM lwp_class_sequence_assignment a
             USING lwp_school_class c
             WHERE c.id = a."classId" AND c."schoolId" = $1`,
            [schoolId]
        );
        await connection.query(`DELETE FROM lwp_whole_school_sequence_assignment WHERE "schoolId" = $1`, [schoolId]);
    };

    afterEach(async () => {
        await removeRunRows();
        // The parent goes too, because the subject and year pair it occupies is what the next case
        // creates its own on, and the unique key is plain rather than partial.
        await connection.query(`DELETE FROM static_lwp_whole_school_sequence WHERE "subjectId" = $1 AND "periodIndex" = $2`, [
            subjectId,
            periodIndex
        ]);

        jest.restoreAllMocks();
    });

    afterAll(async () => {
        if (createdSequenceIds.length) {
            await connection.query(`DELETE FROM static_lwp_topic_sequence WHERE id = ANY($1::bigint[])`, [createdSequenceIds]);
        }
    });

    /** A published whole-school sequence with one member, covering the fixture's year group. */
    const publishedWholeSchoolSequence = async (): Promise<string> => {
        const start = moment.max(moment(), moment(periodStart));

        const sequence = await sequenceService.createSequence(
            {
                name: `Functional whole-school assign ${Date.now().toString(36)}-${createdSequenceIds.length}`,
                subjectId,
                yearGroupId,
                periodIndex,
                timingMode: SequenceTimingMode.FIXED,
                items: topicIds.map((topicId, index) => ({
                    topicId,
                    order: index + 1,
                    startDate: new Date(
                        start
                            .clone()
                            .add(index * 7, 'days')
                            .format('YYYY-MM-DD')
                    )
                }))
            },
            userId
        );

        createdSequenceIds.push(sequence.id);

        const created = await wholeSchoolSequenceService.createWholeSchoolSequence(
            { subjectId, periodIndex, members: [{ sequenceId: sequence.id }] },
            userId
        );

        await wholeSchoolSequenceService.publishWholeSchoolSequence(created.id, userId);

        return created.id;
    };

    /**
     * The same thing, with its **first topic already released** (LEA-6699).
     *
     * The date is the later of a fortnight ago and the start of the academic year, so it is always
     * in the past and always inside the period the sequence belongs to: assertItemDatesWithinPeriod
     * refuses an item outside it, and an admin genuinely cannot author one there.
     */
    const publishedWholeSchoolSequenceWithFirstTopicPast = async (): Promise<string> => {
        const pastStart = moment.max(moment(periodStart), moment().subtract(14, 'days'));
        const futureStart = moment.max(moment(), moment(periodStart)).add(7, 'days');

        const sequence = await sequenceService.createSequence(
            {
                name: `Functional whole-school past ${Date.now().toString(36)}-${createdSequenceIds.length}`,
                subjectId,
                yearGroupId,
                periodIndex,
                timingMode: SequenceTimingMode.FIXED,
                items: topicIds.map((topicId, index) => ({
                    topicId,
                    order: index + 1,
                    startDate: new Date((index === 0 ? pastStart : futureStart).format('YYYY-MM-DD'))
                }))
            },
            userId
        );

        createdSequenceIds.push(sequence.id);

        const created = await wholeSchoolSequenceService.createWholeSchoolSequence(
            { subjectId, periodIndex, members: [{ sequenceId: sequence.id }] },
            userId
        );

        await wholeSchoolSequenceService.publishWholeSchoolSequence(created.id, userId);

        return created.id;
    };

    /** The one member sequence a whole-school sequence created by this suite holds. */
    const memberSequenceIdFor = async (wholeSchoolSequenceId: string): Promise<string> => {
        const [member] = await connection.query(
            `SELECT "sequenceId"::text AS id FROM static_lwp_whole_school_sequence_member WHERE "wholeSchoolSequenceId" = $1`,
            [wholeSchoolSequenceId]
        );

        return member.id;
    };

    const countRows = async (): Promise<{ assignments: number; classTopics: number; runs: number }> => {
        const [counts] = await connection.query(
            `
            SELECT (SELECT count(*) FROM lwp_class_sequence_assignment WHERE "wholeSchoolAssignmentId" IS NOT NULL)::int AS assignments,
                   (SELECT count(*) FROM lwp_class_topic ct
                    JOIN lwp_class_sequence_assignment a ON a.id = ct."classSequenceAssignmentId"
                    WHERE a."wholeSchoolAssignmentId" IS NOT NULL)::int AS "classTopics",
                   (SELECT count(*) FROM lwp_whole_school_sequence_assignment WHERE "schoolId" = $1)::int AS runs
        `,
            [schoolId]
        );

        return counts;
    };

    it('schedules every class in the year group from one member, on the same dates', async () => {
        const wholeSchoolSequenceId = await publishedWholeSchoolSequence();

        const result = await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

        // One member served every class in its year group. With a single class in the fixture this
        // assertion would hold for a fan-out that stopped after the first one.
        expect(result.classesScheduled).toEqual(classIdsInYearGroup.length);
        expect(result.activitiesCreated).toEqual(classIdsInYearGroup.length * topicIds.length);

        const rows = await connection.query(
            `SELECT a."classId"::text AS "classId", ct."releaseDate"::text AS "releaseDate", ct."topicId"::text AS "topicId"
             FROM lwp_class_sequence_assignment a
             JOIN lwp_class_topic ct ON ct."classSequenceAssignmentId" = a.id
             WHERE a."wholeSchoolAssignmentId" = $1
             ORDER BY a."classId", ct."releaseDate"`,
            [result.wholeSchoolAssignmentId]
        );

        expect(rows).toHaveLength(classIdsInYearGroup.length * topicIds.length);
        expect([...new Set(rows.map((row) => row.classId))].sort()).toEqual([...classIdsInYearGroup].sort());

        /*
         * Identical dates across every class, which is the promise the whole feature makes: the
         * school works on the same theme at the same time. A per-class re-anchoring bug would give
         * each class its own dates and still produce the right row count.
         */
        const datesByClass = new Map<string, string[]>();

        rows.forEach((row: { classId: string; releaseDate: string }) => {
            datesByClass.set(row.classId, [...(datesByClass.get(row.classId) ?? []), row.releaseDate]);
        });

        const [firstClassDates, ...otherClassDates] = [...datesByClass.values()];

        otherClassDates.forEach((dates) => expect(dates).toEqual(firstClassDates));
    });

    it('links every class assignment it creates back to the run', async () => {
        const wholeSchoolSequenceId = await publishedWholeSchoolSequence();

        const result = await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

        const [linked] = await connection.query(
            `SELECT count(*)::int AS count FROM lwp_class_sequence_assignment WHERE "wholeSchoolAssignmentId" = $1`,
            [result.wholeSchoolAssignmentId]
        );

        // Without this link LEA-6700's removal cannot find what a run created, and would have to
        // infer it from dates and sequence ids.
        expect(linked.count).toEqual(classIdsInYearGroup.length);
    });

    it('leaves zero rows when a class part way through the run fails', async () => {
        const wholeSchoolSequenceId = await publishedWholeSchoolSequence();

        const before = await countRows();

        /*
         * The real method, allowed to write the first class in full and then made to throw on the
         * second. That is the shape of the defect this slice exists to prevent: the first class's
         * assignment and its topics are genuinely in the transaction when the failure happens, so
         * only a real rollback can satisfy the assertion below.
         */
        let calls = 0;
        const real = ClassSequenceAssignmentService.prototype.persistSequenceAssignmentForClass;

        jest.spyOn(classSequenceAssignmentService, 'persistSequenceAssignmentForClass').mockImplementation((manager, work) => {
            calls += 1;

            // Rejected rather than thrown, so the arrow needs no await and the mock still returns a
            // promise, which is what the caller is awaiting inside the transaction.
            if (calls > 1) return Promise.reject(new Error('Forced failure part way through the run'));

            return real.call(classSequenceAssignmentService, manager, work);
        });

        await expect(service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId)).rejects.toThrow();

        // The first class really was written before the failure, or this proves nothing.
        expect(calls).toBeGreaterThan(1);

        // Zero, for every class, including the one that was written before the failure.
        expect(await countRows()).toEqual(before);
    });

    it('can be retried safely after a failure, without duplicating', async () => {
        const wholeSchoolSequenceId = await publishedWholeSchoolSequence();

        let calls = 0;
        const spy = jest.spyOn(classSequenceAssignmentService, 'persistSequenceAssignmentForClass');
        const real = ClassSequenceAssignmentService.prototype.persistSequenceAssignmentForClass;

        spy.mockImplementation((manager, work) => {
            calls += 1;

            // Rejected rather than thrown, so the arrow needs no await and the mock still returns a
            // promise, which is what the caller is awaiting inside the transaction.
            if (calls > 1) return Promise.reject(new Error('Forced failure part way through the run'));

            return real.call(classSequenceAssignmentService, manager, work);
        });

        await expect(service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId)).rejects.toThrow();

        spy.mockRestore();

        // The retry is a clean run, not a resume: the failed attempt left nothing to collide with,
        // which is exactly what makes retrying safe.
        const result = await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

        expect(result.classesScheduled).toEqual(classIdsInYearGroup.length);

        const counts = await countRows();

        expect(counts.runs).toEqual(1);
        expect(counts.assignments).toEqual(classIdsInYearGroup.length);
        expect(counts.classTopics).toEqual(classIdsInYearGroup.length * topicIds.length);
    });

    it('refuses a second live run for the same subject and year', async () => {
        const wholeSchoolSequenceId = await publishedWholeSchoolSequence();

        await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

        /*
         * The partial unique index is what refuses this, which is why it is partial: LEA-6700 sets a
         * run to REMOVED and that frees the slot again. Two leaders pressing the button at the same
         * moment is the one race in this feature that is actually plausible, and only the database
         * can settle it.
         */
        await expect(service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId)).rejects.toThrow();

        const counts = await countRows();

        expect(counts.runs).toEqual(1);
        expect(counts.assignments).toEqual(classIdsInYearGroup.length);
    });

    it('leaves out a class that already holds everything it would be given, rather than writing it an empty assignment', async () => {
        const wholeSchoolSequenceId = await publishedWholeSchoolSequence();

        /*
         * One class scheduled on its own first, exactly as a teacher would have done it, so every
         * topic the whole-school run would give it is already there. Its plan then comes back empty.
         *
         * It is dropped rather than given an assignment with no topics, and that is not a nicety:
         * `hasAssignments` counts rows rather than class topics, so an empty one would permanently
         * lock that sequence's academic year in the admin form, about a class that was given nothing.
         * `assignSequenceToClass` refuses one for the same reason, one level down.
         */
        const [member] = await connection.query(
            `SELECT "sequenceId"::text AS "sequenceId" FROM static_lwp_whole_school_sequence_member WHERE "wholeSchoolSequenceId" = $1`,
            [wholeSchoolSequenceId]
        );

        const alreadyScheduledClassId = classIdsInYearGroup[0];

        await classSequenceAssignmentService.assignSequenceToClass(
            { classId: alreadyScheduledClassId, sequenceId: member.sequenceId },
            userId
        );

        const result = await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

        expect(result.classesScheduled).toEqual(classIdsInYearGroup.length - 1);

        const scheduled = await connection.query(
            `SELECT "classId"::text AS "classId" FROM lwp_class_sequence_assignment WHERE "wholeSchoolAssignmentId" = $1`,
            [result.wholeSchoolAssignmentId]
        );

        expect(scheduled.map((row: { classId: string }) => row.classId)).not.toContain(alreadyScheduledClassId);

        // The class-level assignment it already had is untouched, and carries no run of its own.
        const [standalone] = await connection.query(
            `SELECT count(*)::int AS count FROM lwp_class_sequence_assignment
             WHERE "classId" = $1 AND "wholeSchoolAssignmentId" IS NULL`,
            [alreadyScheduledClassId]
        );

        expect(standalone.count).toEqual(1);

        // Cleaned here rather than in afterEach, which only knows about rows a run created.
        await connection.query(
            `DELETE FROM lwp_class_topic WHERE "classSequenceAssignmentId" IN (
                 SELECT id FROM lwp_class_sequence_assignment WHERE "classId" = $1 AND "wholeSchoolAssignmentId" IS NULL
             )`,
            [alreadyScheduledClassId]
        );
        await connection.query(`DELETE FROM lwp_class_sequence_assignment WHERE "classId" = $1 AND "wholeSchoolAssignmentId" IS NULL`, [
            alreadyScheduledClassId
        ]);
    });

    it('refuses a draft, so unpublished content cannot be scheduled by anyone', async () => {
        const sequence = await sequenceService.createSequence(
            {
                name: `Functional whole-school draft ${Date.now().toString(36)}`,
                subjectId,
                yearGroupId,
                periodIndex,
                timingMode: SequenceTimingMode.FIXED,
                items: [
                    { topicId: topicIds[0], order: 1, startDate: new Date(moment.max(moment(), moment(periodStart)).format('YYYY-MM-DD')) }
                ]
            },
            userId
        );

        createdSequenceIds.push(sequence.id);

        const draft = await wholeSchoolSequenceService.createWholeSchoolSequence(
            { subjectId, periodIndex, members: [{ sequenceId: sequence.id }] },
            userId
        );

        await expect(service.assignWholeSchoolSequence(schoolId, draft.id, userId)).rejects.toThrow();

        expect((await countRows()).runs).toEqual(0);
    });

    /**
     * LEA-6699. Before this slice one past-dated topic refused the entire school, and nobody there
     * could fix it. These prove the skip against the database rather than against the plan: a plan
     * that says a topic was skipped and a row that was never written are different claims, and only
     * the second is the promise the page makes.
     */
    describe('past-dated topics', () => {
        it('creates only the topics still to come, and the skipped one exists nowhere', async () => {
            const wholeSchoolSequenceId = await publishedWholeSchoolSequenceWithFirstTopicPast();

            const result = await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

            const [pastTopicId, ...remainingTopicIds] = topicIds;

            // Every class is still scheduled. It is the topic that is dropped, not the class.
            expect(result.classesScheduled).toEqual(classIdsInYearGroup.length);
            expect(result.activitiesCreated).toEqual(classIdsInYearGroup.length * remainingTopicIds.length);

            const rows = await connection.query(
                `SELECT ct."topicId"::text AS "topicId"
                 FROM lwp_class_sequence_assignment a
                 JOIN lwp_class_topic ct ON ct."classSequenceAssignmentId" = a.id
                 WHERE a."wholeSchoolAssignmentId" = $1`,
                [result.wholeSchoolAssignmentId]
            );

            const createdTopicIds = rows.map((row: { topicId: string }) => row.topicId);

            /*
             * The point of the slice, asserted the only way that means anything: the row is absent.
             * activitiesCreated alone would pass for a run that wrote the past-dated topic and
             * miscounted.
             */
            expect(createdTopicIds).not.toContain(pastTopicId);
            expect([...new Set(createdTopicIds)].sort()).toEqual([...remainingTopicIds].sort());
        });

        it('creates nothing anywhere in the school when every topic has passed, rather than an empty run', async () => {
            const pastStart = moment.max(moment(periodStart), moment().subtract(14, 'days'));

            const sequence = await sequenceService.createSequence(
                {
                    name: `Functional whole-school all past ${Date.now().toString(36)}-${createdSequenceIds.length}`,
                    subjectId,
                    yearGroupId,
                    periodIndex,
                    timingMode: SequenceTimingMode.FIXED,
                    items: topicIds.map((topicId, index) => ({
                        topicId,
                        order: index + 1,
                        startDate: new Date(pastStart.clone().add(index, 'days').format('YYYY-MM-DD'))
                    }))
                },
                userId
            );

            createdSequenceIds.push(sequence.id);

            const created = await wholeSchoolSequenceService.createWholeSchoolSequence(
                { subjectId, periodIndex, members: [{ sequenceId: sequence.id }] },
                userId
            );

            await wholeSchoolSequenceService.publishWholeSchoolSequence(created.id, userId);

            /*
             * Refused, not an empty success. Every class's plan comes back empty, so there is no
             * class left to schedule and the same message a class-level assignment gives is the
             * honest one. The page hides its button on the preview's own zero, so a leader should
             * not reach this, but the mutation is callable without the page.
             */
            await expect(service.assignWholeSchoolSequence(schoolId, created.id, userId)).rejects.toThrow(HttpException);

            // And nothing was written on the way to refusing.
            expect(await countRows()).toEqual({ assignments: 0, classTopics: 0, runs: 0 });
        });

        it('reports an effective span and skip count the run then matches exactly', async () => {
            const wholeSchoolSequenceId = await publishedWholeSchoolSequenceWithFirstTopicPast();

            const preview = await service.previewWholeSchoolSequence(schoolId, subjectId);

            const row = preview.rows.find((previewRow) => previewRow.sequenceId);

            expect(row.topicsSkipped).toEqual(1);
            expect(preview.topicsSkipped).toEqual(1);

            // The span starts at a topic that will exist, not at the one that has gone.
            expect(moment(row.startDate).isSameOrAfter(moment().startOf('day'))).toBe(true);

            /*
             * The preview and the run are two different code paths reaching the same number: the
             * preview from the member's own items, the run from a plan per class. This is the
             * assertion that stops them drifting.
             */
            const result = await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

            expect(result.activitiesCreated).toEqual(preview.activitiesToCreate);
        });
    });

    /**
     * The count the leader reads before pressing anything has to be the count they get. The preview
     * works it out from the members and one batched lookup; the run works it out from a plan per
     * class. Two routes to one number, which is exactly how they drift.
     */
    describe('the preview count against what the run writes', () => {
        it('agrees with the run when one class already holds part of the sequence', async () => {
            const wholeSchoolSequenceId = await publishedWholeSchoolSequence();

            /*
             * One class is given the first topic by an ordinary class-level assignment first, so it
             * reaches the run already holding part of what it would be given. The second class is
             * left untouched, which is what makes the two differ.
             */
            const [firstClassId] = classIdsInYearGroup;

            await classSequenceAssignmentService.assignSequenceToClass(
                {
                    classId: firstClassId,
                    sequenceId: (await memberSequenceIdFor(wholeSchoolSequenceId)).toString(),
                    excludedTopicIds: [topicIds[1]]
                },
                userId
            );

            const preview = await service.previewWholeSchoolSequence(schoolId, subjectId);
            const result = await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

            /*
             * The assertion this suite exists for. Before the count was made exact the preview said
             * one more than the run created, every time a class already held something.
             */
            expect(result.activitiesCreated).toEqual(preview.activitiesToCreate);
            expect(result.classesScheduled).toEqual(preview.classesCovered);
        });

        it('offers nothing when every class already holds every topic, rather than a run that would fail', async () => {
            const wholeSchoolSequenceId = await publishedWholeSchoolSequence();
            const memberSequenceId = (await memberSequenceIdFor(wholeSchoolSequenceId)).toString();

            for (const classId of classIdsInYearGroup) {
                await classSequenceAssignmentService.assignSequenceToClass({ classId, sequenceId: memberSequenceId }, userId);
            }

            const preview = await service.previewWholeSchoolSequence(schoolId, subjectId);

            /*
             * Zero is what hides the action on the page. Without it a leader is handed a button that
             * builds an empty plan for every class and then refuses, which is the same defect the
             * past-dated case had.
             */
            expect(preview.activitiesToCreate).toEqual(0);
            expect(preview.classesCovered).toEqual(0);

            const row = preview.rows.find((previewRow) => previewRow.sequenceId);

            expect(row.skipped).toBe(true);
            expect(row.skipReason).toEqual(WholeSchoolYearGroupSkipReason.ALREADY_HAS_THESE_TOPICS);

            // And the mutation agrees, for a caller reaching it without the page.
            await expect(service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId)).rejects.toThrow(HttpException);
        });
    });

    it('refuses a whole-school sequence that does not exist', async () => {
        await expect(service.assignWholeSchoolSequence(schoolId, '0', userId)).rejects.toThrow();
    });

    it('refuses a school that does not exist', async () => {
        const wholeSchoolSequenceId = await publishedWholeSchoolSequence();

        await expect(service.assignWholeSchoolSequence('0', wholeSchoolSequenceId, userId)).rejects.toThrow();
    });
    /**
     * Once a year, and removal frees the year again (LEA-6700).
     *
     * Every one of these turns on a partial unique index and on which rows a delete actually reaches,
     * so a mocked query builder could only prove the right SQL was asked for. What matters here is
     * what is left in the database afterwards.
     */
    describe('scheduling once a year, and removing it', () => {
        /** The class topics a run created, released flag included, oldest first. */
        const classTopicsForRun = async (runId: string): Promise<{ id: string; released: boolean }[]> =>
            connection.query(
                `SELECT ct.id::text AS id, ct.released
                 FROM lwp_class_sequence_assignment a
                 JOIN lwp_class_topic ct ON ct."classSequenceAssignmentId" = a.id
                 WHERE a."wholeSchoolAssignmentId" = $1
                 ORDER BY ct."releaseDate", ct.id`,
                [runId]
            );

        it('refuses a second run in the same academic year, in words', async () => {
            const wholeSchoolSequenceId = await publishedWholeSchoolSequence();

            await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

            await expect(service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId)).rejects.toThrow(
                /already been scheduled/
            );
        });

        /*
         * The check in code runs before the index would, so the refusal is a sentence. The index is
         * still there underneath for two leaders pressing at the same moment, which no test can stage.
         */
        it('leaves exactly one live run behind when a second is refused', async () => {
            const wholeSchoolSequenceId = await publishedWholeSchoolSequence();

            await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);
            await expect(service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId)).rejects.toThrow(HttpException);

            const [live] = await connection.query(
                `SELECT count(*)::int AS count FROM lwp_whole_school_sequence_assignment
                 WHERE "schoolId" = $1 AND status = 'ASSIGNED'`,
                [schoolId]
            );

            expect(live.count).toEqual(1);
        });

        /**
         * The rule this whole ticket exists to protect.
         *
         * A child who has already done an activity must not lose it because a leader corrected a
         * scheduling mistake weeks later. One topic in the same assignment is marked released, the
         * way the nightly release job marks it, and the removal has to step around exactly that one.
         */
        it('deletes the unreleased topics and keeps the released one, in the same assignment', async () => {
            const wholeSchoolSequenceId = await publishedWholeSchoolSequence();
            const run = await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

            const created = await classTopicsForRun(run.wholeSchoolAssignmentId);

            expect(created.length).toBeGreaterThan(1);

            // The first topic has gone out to families; everything after it has not.
            const releasedId = created[0].id;

            await connection.query(`UPDATE lwp_class_topic SET released = true WHERE id = $1`, [releasedId]);

            await service.removeWholeSchoolSequenceAssignment(schoolId, run.wholeSchoolAssignmentId, userId);

            const surviving = await classTopicsForRun(run.wholeSchoolAssignmentId);

            expect(surviving.map((topic) => topic.id)).toEqual([releasedId]);
        });

        it('marks every class assignment it withdrew as removed, rather than deleting the rows', async () => {
            const wholeSchoolSequenceId = await publishedWholeSchoolSequence();
            const run = await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

            await service.removeWholeSchoolSequenceAssignment(schoolId, run.wholeSchoolAssignmentId, userId);

            const [assignments] = await connection.query(
                `SELECT count(*)::int AS total, count(*) FILTER (WHERE status = 'REMOVED')::int AS removed
                 FROM lwp_class_sequence_assignment WHERE "wholeSchoolAssignmentId" = $1`,
                [run.wholeSchoolAssignmentId]
            );

            // The rows survive: any retained topic still points at one, for provenance.
            expect(assignments.total).toEqual(classIdsInYearGroup.length);
            expect(assignments.removed).toEqual(classIdsInYearGroup.length);
        });

        /**
         * What the partial index is for. A plain unique key would make one mis-click permanent until
         * the next September, which is the reason the index was written the way it was in slice 5.
         */
        it('frees the school to schedule the same year again', async () => {
            const wholeSchoolSequenceId = await publishedWholeSchoolSequence();
            const first = await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

            await service.removeWholeSchoolSequenceAssignment(schoolId, first.wholeSchoolAssignmentId, userId);

            const second = await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

            expect(second.wholeSchoolAssignmentId).not.toEqual(first.wholeSchoolAssignmentId);
            expect(second.classesScheduled).toEqual(classIdsInYearGroup.length);
        });

        /*
         * The removed run keeps its history. Two rows for one school, one live and one not, is exactly
         * what the partial index permits and a plain one would not.
         */
        it('keeps the removed run alongside the new one', async () => {
            const wholeSchoolSequenceId = await publishedWholeSchoolSequence();
            const first = await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

            await service.removeWholeSchoolSequenceAssignment(schoolId, first.wholeSchoolAssignmentId, userId);
            await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

            const [counts] = await connection.query(
                `SELECT count(*)::int AS total,
                        count(*) FILTER (WHERE status = 'ASSIGNED')::int AS live
                 FROM lwp_whole_school_sequence_assignment WHERE "schoolId" = $1`,
                [schoolId]
            );

            expect(counts.total).toEqual(2);
            expect(counts.live).toEqual(1);
        });

        it('refuses to remove a run belonging to another school', async () => {
            const wholeSchoolSequenceId = await publishedWholeSchoolSequence();
            const run = await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

            const [other] = await connection.query(`SELECT id::text AS id FROM lwp_school WHERE id != $1 LIMIT 1`, [schoolId]);

            await expect(service.removeWholeSchoolSequenceAssignment(other.id, run.wholeSchoolAssignmentId, userId)).rejects.toThrow(
                /does not exist for your school/
            );

            // And the run is untouched, rather than half withdrawn by a caller with no right to it.
            const [still] = await connection.query(`SELECT status FROM lwp_whole_school_sequence_assignment WHERE id = $1`, [
                run.wholeSchoolAssignmentId
            ]);

            expect(still.status).toEqual('ASSIGNED');
        });

        it('refuses to remove the same run twice', async () => {
            const wholeSchoolSequenceId = await publishedWholeSchoolSequence();
            const run = await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

            await service.removeWholeSchoolSequenceAssignment(schoolId, run.wholeSchoolAssignmentId, userId);

            await expect(service.removeWholeSchoolSequenceAssignment(schoolId, run.wholeSchoolAssignmentId, userId)).rejects.toThrow(
                /already been removed/
            );
        });

        /**
         * What the leader's page shows a school that has already scheduled.
         *
         * Built from the class assignments a run created rather than from the sequence it ran, so it
         * says what the school holds rather than what it was offered.
         */
        it('shows a scheduled school its record instead of offering the action', async () => {
            const wholeSchoolSequenceId = await publishedWholeSchoolSequence();
            const run = await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

            const preview = await service.previewWholeSchoolSequence(schoolId, subjectId);

            expect(preview.assignment?.assignmentId).toEqual(run.wholeSchoolAssignmentId);
            expect(preview.assignment?.classesScheduled).toEqual(classIdsInYearGroup.length);
            expect(preview.assignment?.activitiesCreated).toEqual(classIdsInYearGroup.length * topicIds.length);

            // Nothing on the offer half, so no branch of the page below the record can claim it.
            expect(preview.wholeSchoolSequenceId).toBeUndefined();
            expect(preview.rows).toEqual([]);
        });

        it('offers the action again once the run is removed', async () => {
            const wholeSchoolSequenceId = await publishedWholeSchoolSequence();
            const run = await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

            await service.removeWholeSchoolSequenceAssignment(schoolId, run.wholeSchoolAssignmentId, userId);

            const preview = await service.previewWholeSchoolSequence(schoolId, subjectId);

            expect(preview.assignment).toBeUndefined();
            expect(preview.wholeSchoolSequenceId).toEqual(wholeSchoolSequenceId);
        });

        describe('listing the programmes on the Auto schedule tab', () => {
            /*
             * A live run for a subject other than the fixture's, of the programme types given.
             *
             * Inserted directly rather than scheduled, because only the listing is under test, and so
             * each case asserts the same thing whichever subject this database gave the fixture. A
             * different subject from the fixture's cannot collide with its runs on the partial unique
             * index, and afterEach removes every run for this school.
             */
            const insertLiveRun = async (programmeTypes: SubjectProgrammeType[]): Promise<{ runId: string; runSubjectId: string }> => {
                const [subject] = await connection.query(
                    `SELECT id::text AS id FROM static_lwp_subject WHERE "programmeType" = ANY($1) AND id <> $2 ORDER BY id LIMIT 1`,
                    [programmeTypes, subjectId]
                );
                const [run] = await connection.query(
                    `INSERT INTO lwp_whole_school_sequence_assignment ("schoolId", "subjectId", "periodIndex", status)
                     VALUES ($1, $2, $3, 'ASSIGNED') RETURNING id::text AS id`,
                    [schoolId, subject.id, periodIndex]
                );

                return { runId: run.id, runSubjectId: subject.id };
            };

            it('lists a programme the school has scheduled with its record, whether or not a class is still entitled to it', async () => {
                const { runId, runSubjectId } = await insertLiveRun([SubjectProgrammeType.MONEY_SKILLS, SubjectProgrammeType.READY_TEDDY]);

                const programme = (await service.getWholeSchoolAutoScheduleProgrammes(schoolId)).find(
                    (candidate) => candidate.subjectId === runSubjectId
                );

                expect(programme?.assignment?.assignmentId).toEqual(runId);
                // The run created no class assignments, so the record has nothing under it.
                expect(programme?.assignment?.rows).toEqual([]);

                const [{ published }] = await connection.query(
                    `SELECT count(*)::int AS published FROM static_lwp_whole_school_sequence
                     WHERE "subjectId" = $1 AND "periodIndex" = $2 AND status = 'PUBLISHED'`,
                    [runSubjectId, periodIndex]
                );

                expect(programme?.isAvailable).toEqual(published > 0);
            });

            it('leaves out a full programme subject, even one the school has scheduled', async () => {
                const { runSubjectId } = await insertLiveRun([SubjectProgrammeType.FULL_PROGRAMME]);

                const programmes = await service.getWholeSchoolAutoScheduleProgrammes(schoolId);

                expect(programmes.map((candidate) => candidate.subjectId)).not.toContain(runSubjectId);
                expect(programmes.map((candidate) => candidate.programmeType)).not.toContain(SubjectProgrammeType.FULL_PROGRAMME);
            });
        });

        /**
         * The admin lock, against a real row.
         *
         * Counts every status, `REMOVED` included: a removal keeps the released class topics, so
         * schools are still holding content this sequence handed them.
         */
        it('locks a whole-school sequence once a school has scheduled it, and after a removal', async () => {
            const wholeSchoolSequenceId = await publishedWholeSchoolSequence();

            expect(await wholeSchoolSequenceService.getWholeSchoolAssignmentUsage([wholeSchoolSequenceId])).toEqual([false]);

            const run = await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

            expect(await wholeSchoolSequenceService.getWholeSchoolAssignmentUsage([wholeSchoolSequenceId])).toEqual([true]);

            await service.removeWholeSchoolSequenceAssignment(schoolId, run.wholeSchoolAssignmentId, userId);

            // Still locked: topics this sequence handed out may still be in front of children.
            expect(await wholeSchoolSequenceService.getWholeSchoolAssignmentUsage([wholeSchoolSequenceId])).toEqual([true]);
        });

        it('refuses an admin edit to one a school has scheduled', async () => {
            const wholeSchoolSequenceId = await publishedWholeSchoolSequence();

            await service.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);

            await expect(
                wholeSchoolSequenceService.updateWholeSchoolSequence(
                    { id: wholeSchoolSequenceId, subjectId, periodIndex: periodIndex + 1 },
                    userId
                )
            ).rejects.toThrow(/A school has already scheduled this/);
        });
    });
});

/*
 * The Money Skills welcome modal against a real database: marking it seen stamps the leader's user row.
 * Whether to show it is the school overview's decision, from the prompts above and that date.
 */
describe('WholeSchoolAutoScheduleService Money Skills welcome against the database', () => {
    let userId: string;

    const welcomeSeen = async (): Promise<Date | null> =>
        (await connection.query(`SELECT "lastMoneySkillsAutoScheduleWelcomeSeen" AS seen FROM lwp_user WHERE id = $1`, [userId]))[0].seen;

    beforeAll(async () => {
        [{ id: userId }] = await connection.query(
            `SELECT u.id::text AS id FROM lwp_user u WHERE u."lastMoneySkillsAutoScheduleWelcomeSeen" IS NULL ORDER BY u.id LIMIT 1`
        );
    });

    afterAll(async () => {
        await connection.query(`UPDATE lwp_user SET "lastMoneySkillsAutoScheduleWelcomeSeen" = NULL WHERE id = $1`, [userId]);
    });

    it('marking it seen stamps the leader’s user row with the current time', async () => {
        const before = new Date(Date.now() - 60_000);

        await service.markMoneySkillsWelcomeSeen(userId);

        expect(new Date((await welcomeSeen()) as Date).getTime()).toBeGreaterThan(before.getTime());
    });
});
