import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SequenceAssignmentStatus, SequenceTimingMode } from 'lwp-shared/enums';
import moment from 'moment';
import { ClassSequenceAssignmentService } from 'src/api/service/class_sequence_assignment.service';
import { ClassTopicService } from 'src/api/service/class_topic.service';
import { TopicSequenceService } from 'src/api/service/topic_sequence.service';
import { BaseModule } from 'src/base.module';
import { Connection } from 'typeorm';

/**
 * Drives the assignment API against a real database, so the eligibility SQL, the transaction, the
 * dedupe and the cascade are covered rather than mocked.
 *
 * Fixtures are discovered from whatever the database holds: a class whose entitlement genuinely
 * allows some subject's content for its year group. Everything created is removed in afterAll.
 */
jest.setTimeout(120000);

describe('ClassSequenceAssignmentService against the database', () => {
    let app: INestApplication;
    let connection: Connection;
    let service: ClassSequenceAssignmentService;
    let sequenceService: TopicSequenceService;
    let classTopicService: ClassTopicService;

    let classId: string;
    let subjectId: string;
    let yearGroupId: string;
    let userId: string;
    /**
     * The academic year the class's school is currently teaching.
     *
     * Declared by the FIXED sequences in this suite and by no others: an INTERVAL sequence carries no
     * dates, belongs to no year, and is refused outright if it is given one.
     */
    let periodIndex: number;
    /** The window a sequence's template dates may occupy: see {@link inTemplateWindow}. */
    let templateWindowStart: moment.Moment;
    let templateWindowEnd: moment.Moment;
    /**
     * The interval the template sequences use, sized so a two-topic sequence fits the window even in
     * the closing days of an academic year. Assertions read this rather than assuming a week.
     */
    let templateIntervalDays: number;
    /** Eligible topics the class does not already have, so they can actually be scheduled. */
    let freshTopicIds: string[];

    const createdSequenceIds: string[] = [];

    const format = (value: unknown): string => moment(value as string).format('YYYY-MM-DD');

    /**
     * A date relative to today, for the start dates a leader chooses at assignment time. Those are
     * deliberately not bounded by the academic year: `buildPlan` checks only that nothing lands in
     * the past, because re-dating for their own class is the leader's business.
     *
     * They do it per row now. `shiftPlanDates` used to re-date a whole set from one anchor and was
     * removed by LEA-6625, but the rule here is unchanged: the server has never cared which of those
     * produced an override, only that the result is not in the past.
     */
    const inDays = (days: number): Date => new Date(moment().add(days, 'days').format('YYYY-MM-DD'));

    /**
     * A sequence's own template dates are a different matter: they must sit inside the academic year
     * the sequence declares, and that year has to be the one the school is currently teaching or the
     * sequence is never offered to the class.
     *
     * So they are placed inside the usable window rather than counted from today: from today or the
     * year's start, whichever is later, to the year's end. Everything here is derived from the
     * period the fixture actually found, so the suite behaves the same in the first week of an
     * academic year, the last, or anywhere between, and whatever months that year runs over.
     */
    const inTemplateWindow = (dayOffset: number): Date =>
        new Date(moment.min(templateWindowStart.clone().add(dayOffset, 'days'), templateWindowEnd.clone()).format('YYYY-MM-DD'));

    /**
     * An interval sequence: an ordered list of topics and a cadence.
     *
     * It used to take an anchor as well, and LEA-6595 removed it: the start date belongs to the class
     * it is given to, so every test below supplies one at assignment time. The cadence stays on the
     * sequence, because the pace is a Learning with Parents decision (LEA-6624).
     */
    const createSequence = async (topicIds: string[], intervalDays = templateIntervalDays): Promise<string> => {
        const sequence = await sequenceService.createSequence(
            {
                name: `Assignment functional test ${createdSequenceIds.length + 1}`,
                subjectId,
                yearGroupId,
                timingMode: SequenceTimingMode.INTERVAL,
                intervalDays,
                items: topicIds.map((topicId, index) => ({ topicId, order: index + 1 }))
            },
            userId
        );

        createdSequenceIds.push(sequence.id);

        return sequence.id;
    };

    /** A fixed sequence whose first topic has no end date, to prove an open window survives assignment. */
    const createFixedSequenceWithOpenEnd = async (topicIds: string[]): Promise<string> => {
        const sequence = await sequenceService.createSequence(
            {
                name: `Assignment functional test open end ${createdSequenceIds.length + 1}`,
                subjectId,
                yearGroupId,
                periodIndex,
                timingMode: SequenceTimingMode.FIXED,
                // Spread across the window rather than counted from today, and clamped to its end, so
                // this still builds a valid two-topic sequence in the closing days of a year.
                items: [
                    { topicId: topicIds[0], startDate: inTemplateWindow(0) },
                    {
                        topicId: topicIds[1],
                        startDate: inTemplateWindow(templateIntervalDays),
                        endDate: inTemplateWindow(templateIntervalDays * 2 - 1)
                    }
                ]
            },
            userId
        );

        createdSequenceIds.push(sequence.id);

        return sequence.id;
    };

    beforeAll(async () => {
        app = await NestFactory.create(BaseModule);
        connection = app.get(Connection);
        service = app.get(ClassSequenceAssignmentService);
        sequenceService = app.get(TopicSequenceService);
        classTopicService = app.get(ClassTopicService);

        // A class whose flags genuinely entitle it to some subject's content for its year group,
        // mirroring allowedProgrammeTypesForClass. Groups are excluded to keep the fixture simple.
        // "Fresh" topics are computed here rather than filtered afterwards, so the pair chosen is
        // guaranteed to have enough topics the class does not already have to actually schedule.
        const [fixture] = await connection.query(`
            WITH eligible AS (
                SELECT c.id AS class_id, c."yearGroup" AS year_group_id, s.id AS subject_id, t.id AS topic_id,
                       p.index AS period_index, p."startDate" AS period_start, p."endDate" AS period_end,
                       EXISTS (SELECT 1 FROM lwp_class_topic ct WHERE ct."classId" = c.id AND ct."topicId" = t.id) AS scheduled
                FROM lwp_school_class c
                JOIN lwp_school sch ON sch.id = c."schoolId"
                -- The school's current academic year, not the class's. A sequence is only offered
                -- when it was built for the year the school is teaching, so that is the year these
                -- sequences must declare and the window their dates must sit in.
                JOIN static_lwp_period p ON p.index = sch."curentPeriodIndex"
                JOIN static_lwp_topic_domain_year_group tdyg ON tdyg."yearGroupId" = c."yearGroup"
                JOIN static_lwp_topic_domain d ON d.id = tdyg."domainId"
                JOIN static_lwp_subject s ON s.id = d."subjectId"
                JOIN static_lwp_topic t ON t.id = tdyg."topicId" AND t."isPublished" AND NOT t."isHidden"
                WHERE c."yearGroup" IS NOT NULL AND c."parentClassId" IS NULL
                  -- A topic needing a photo from the teacher cannot go in a sequence at all, so one
                  -- here would fail the fixture's own createSequence rather than the case under test.
                  -- The same rule as TopicSequenceService.findTopicIdsNeedingATeacherPhoto, down to
                  -- only counting steps on a non-hidden activity.
                  AND NOT EXISTS (
                      SELECT 1
                      FROM static_lwp_activity a
                      JOIN static_lwp_activity_steps st ON st."activityId" = a.id
                      WHERE a."topicId" = t.id AND NOT a."isHidden" AND st."stepType" = 'SET_BY_TEACHER'
                  )
                  AND c."periodIndex" = sch."curentPeriodIndex"
                  AND p."startDate" IS NOT NULL AND p."endDate" IS NOT NULL
                  -- Room left in the year for a sequence starting no earlier than today. Two days is
                  -- the floor: a two-topic sequence needs a one day interval and one day per topic.
                  AND p."endDate" >= greatest(CURRENT_DATE, p."startDate") + 1
                  AND ((s."programmeType" = 'FULL_PROGRAMME' AND c."isFullProgramme")
                    OR (s."programmeType" = 'READY_TEDDY' AND c."isReadyTeddyEnabled")
                    OR (s."programmeType" = 'MONEY_SKILLS' AND sch."isMoneySkillsAvailable"
                        AND (((c."isRegistrationClass" OR c."isGroupAcrossClasses") AND c."IsReadingLogsEnabled") OR c."isFullProgramme")))
            )
            SELECT class_id::text AS "classId", year_group_id::text AS "yearGroupId", subject_id::text AS "subjectId",
                   period_index AS "periodIndex", period_start::text AS "periodStart", period_end::text AS "periodEnd",
                   coalesce(array_agg(DISTINCT topic_id::text) FILTER (WHERE NOT scheduled), '{}') AS "freshTopicIds"
            FROM eligible
            GROUP BY 1, 2, 3, 4, 5, 6
            -- Three, not two: dropping a topic out of the *middle* of a sequence is a case of its
            -- own, and there is no middle in a pair.
            HAVING count(DISTINCT topic_id) FILTER (WHERE NOT scheduled) >= 3
            -- Most room left in the academic year first, then most spare topics, so the fixture
            -- chosen gives the widest window to date sequences in. Ordered by the output alias, not
            -- the CTE column, which Postgres would treat as a separate ungrouped reference.
            ORDER BY "periodEnd" DESC, count(DISTINCT topic_id) FILTER (WHERE NOT scheduled) DESC
            LIMIT 1
        `);

        if (!fixture) {
            throw new Error(
                'No entitled class with at least two unscheduled topics, in a school whose current academic year ' +
                    'has room left to date a sequence in. Seed the database, and check that static_lwp_period rows ' +
                    'have start and end dates.'
            );
        }

        classId = fixture.classId;
        yearGroupId = fixture.yearGroupId;
        subjectId = fixture.subjectId;
        freshTopicIds = fixture.freshTopicIds;
        periodIndex = Number(fixture.periodIndex);

        // Everything a sequence's template dates have to satisfy, derived rather than assumed:
        // inside the school's current academic year, and never in the past.
        templateWindowStart = moment.max(moment(), moment(fixture.periodStart)).startOf('day');
        templateWindowEnd = moment(fixture.periodEnd).startOf('day');

        // A two-topic INTERVAL sequence runs from its anchor to anchor + 2 * interval - 1, so the
        // interval has to be at most half the window. A week where there is room, less as the year
        // runs out, never less than a day. The fixture query guarantees at least two days.
        const usableDays = templateWindowEnd.diff(templateWindowStart, 'days') + 1;

        templateIntervalDays = Math.max(1, Math.min(7, Math.floor(usableDays / 2)));

        const [user] = await connection.query(`SELECT id::text AS id FROM lwp_user ORDER BY id LIMIT 1`);

        userId = user.id;
    });

    /**
     * Each assignment consumes its topics for the class, so without this a later test would find
     * everything already scheduled and skip it. Resetting also keeps the tests order-independent.
     */
    afterEach(async () => {
        await connection.query(
            `DELETE FROM lwp_class_topic WHERE "classSequenceAssignmentId" IN (
                 SELECT id FROM lwp_class_sequence_assignment WHERE "sequenceName" LIKE 'Assignment functional test%'
             )`
        );
        await connection.query(`DELETE FROM lwp_class_sequence_assignment WHERE "sequenceName" LIKE 'Assignment functional test%'`);
    });

    afterAll(async () => {
        // Class topics go first: they reference the assignments, which reference the sequences.
        if (createdSequenceIds.length) {
            await connection.query(
                `DELETE FROM lwp_class_topic WHERE "classSequenceAssignmentId" IN (
                     SELECT id FROM lwp_class_sequence_assignment WHERE "sequenceId" = ANY($1::bigint[])
                        OR "sequenceName" LIKE 'Assignment functional test%'
                 )`,
                [createdSequenceIds]
            );
            await connection.query(`DELETE FROM lwp_class_sequence_assignment WHERE "sequenceName" LIKE 'Assignment functional test%'`);
            await connection.query(`DELETE FROM static_lwp_topic_sequence WHERE id = ANY($1::bigint[])`, [createdSequenceIds]);
        }

        await app?.close();
    });

    describe('eligibility', () => {
        it('offers a sequence for the class year group and an entitled subject', async () => {
            const sequenceId = await createSequence(freshTopicIds.slice(0, 2));

            const offered = await service.getAssignableSequencesForClass(classId);

            expect(offered.map((sequence) => sequence.id)).toContain(sequenceId);
        });

        /**
         * Both sides of the academic year rule, against real SQL, which is the only place it can be
         * checked properly: the rule is a where clause and a join, and a mocked query builder cannot
         * express which rows the database would have withheld.
         *
         * The interval half is the fragile one. Those sequences have a null `periodIndex`, so an
         * inner join on the period drops every one of them before the where clause is reached, and a
         * bare `period.index = :current` drops them again. Either mistake makes interval sequences
         * disappear from every school with nothing erroring.
         *
         * The test above would already catch it, since it creates an interval sequence and expects it
         * offered. This says so on purpose, so the coverage is not lost to a later edit that changes
         * that test to use a fixed sequence.
         */
        it('offers an undated interval sequence and a fixed one built for this year, together', async () => {
            const intervalId = await createSequence(freshTopicIds.slice(0, 2));
            const fixedId = await createFixedSequenceWithOpenEnd(freshTopicIds.slice(0, 2));

            const offered = await service.getAssignableSequencesForClass(classId);
            const offeredIds = offered.map((sequence) => sequence.id);

            expect(offeredIds).toContain(intervalId);
            expect(offeredIds).toContain(fixedId);

            // The interval sequence really does carry no year, rather than having quietly acquired
            // the current one somewhere along the way.
            expect(offered.find((sequence) => sequence.id === intervalId).period).toBeNull();
            expect(Number(offered.find((sequence) => sequence.id === fixedId).period.index)).toEqual(periodIndex);
        });

        it('offers each sequence with its topics, in order', async () => {
            const sequenceId = await createSequence(freshTopicIds.slice(0, 2));

            const offered = await service.getAssignableSequencesForClass(classId);
            const sequence = offered.find((candidate) => candidate.id === sequenceId);

            expect(sequence.items).toHaveLength(2);
            expect(sequence.items.map((item) => item.order)).toEqual([1, 2]);
            expect(sequence.items.map((item) => item.topic.id)).toEqual(freshTopicIds.slice(0, 2));
            // The name is what the preview table renders, so an unresolved topic relation would be
            // invisible here and blank on screen.
            expect(sequence.items[0].topic.teacherTopicName).toBeTruthy();
        });

        /**
         * The template's own dates are what the assign UI falls back on to move a stale FIXED
         * sequence forward: its plan is refused once those dates have passed, so they are the only
         * ones left to show the leader. That is a fixed-mode concern and always was.
         *
         * An INTERVAL sequence carries no dates at all (LEA-6594), and needs none: the anchor and
         * the interval come from the teacher at assignment time, and `planClassTopicDates` has
         * always re-anchored from those rather than reading the template.
         */
        it('offers a fixed sequence with its dates and an interval one without', async () => {
            const intervalId = await createSequence(freshTopicIds.slice(0, 2));
            const fixedId = await createFixedSequenceWithOpenEnd(freshTopicIds.slice(0, 2));

            const offered = await service.getAssignableSequencesForClass(classId);
            const interval = offered.find((candidate) => candidate.id === intervalId);
            const fixed = offered.find((candidate) => candidate.id === fixedId);

            expect(interval.items.every((item) => item.startDate === null)).toBe(true);
            expect(fixed.items[0].startDate).toBeTruthy();
        });

        it('does not offer a sequence built for a different year group', async () => {
            const [otherYearGroup] = await connection.query(
                `SELECT yg.id::text AS id FROM static_lwp_year_group yg WHERE yg.id <> $1
                 AND EXISTS (
                     SELECT 1 FROM static_lwp_topic_domain_year_group tdyg
                     JOIN static_lwp_topic_domain d ON d.id = tdyg."domainId"
                     WHERE tdyg."yearGroupId" = yg.id AND d."subjectId" = $2
                 ) LIMIT 1`,
                [yearGroupId, subjectId]
            );

            if (!otherYearGroup) return; // only one year group has this subject's content here

            const [topic] = await connection.query(
                `SELECT t.id::text AS id FROM static_lwp_topic t
                 JOIN static_lwp_topic_domain_year_group tdyg ON tdyg."topicId" = t.id
                 JOIN static_lwp_topic_domain d ON d.id = tdyg."domainId"
                 WHERE tdyg."yearGroupId" = $1 AND d."subjectId" = $2 AND t."isPublished" AND NOT t."isHidden" LIMIT 1`,
                [otherYearGroup.id, subjectId]
            );

            const wrongYearGroup = await sequenceService.createSequence(
                {
                    name: `Assignment functional test wrong year group`,
                    subjectId,
                    yearGroupId: otherYearGroup.id,
                    timingMode: SequenceTimingMode.INTERVAL,
                    intervalDays: templateIntervalDays,
                    items: [{ topicId: topic.id, order: 1 }]
                },
                userId
            );

            createdSequenceIds.push(wrongYearGroup.id);

            const offered = await service.getAssignableSequencesForClass(classId);

            expect(offered.map((sequence) => sequence.id)).not.toContain(wrongYearGroup.id);
        });
    });

    describe('preview', () => {
        it('re-anchors the dates to the chosen start date without creating anything', async () => {
            const sequenceId = await createSequence(freshTopicIds.slice(0, 2));
            const startDate = inDays(10);

            const before = await connection.query(`SELECT count(*)::int AS count FROM lwp_class_topic WHERE "classId" = $1`, [classId]);

            const plan = await service.previewSequenceForClass({ classId, sequenceId, startDate });

            const after = await connection.query(`SELECT count(*)::int AS count FROM lwp_class_topic WHERE "classId" = $1`, [classId]);

            expect(after[0].count).toEqual(before[0].count);
            expect(plan.assignment).toBeUndefined();
            expect(plan.scheduledCount).toEqual(2);
            expect(plan.skippedCount).toEqual(0);
            expect(format(plan.items[0].releaseDate)).toEqual(moment(startDate).format('YYYY-MM-DD'));
            expect(format(plan.items[1].releaseDate)).toEqual(moment(startDate).add(templateIntervalDays, 'days').format('YYYY-MM-DD'));
        });

        /**
         * The cadence comes off the sequence, and this is the assertion that says so (LEA-6624).
         *
         * Built with **14** rather than the default, which is capped at 7, so the spacing asserted
         * below cannot be satisfied by a constant or by the template default: the only way to get 14
         * is to have read this sequence's own value.
         *
         * The caller has no way to ask for a different one. `AssignSequenceToClassInput` no longer
         * carries an interval at all, so this is not "the sequence's unless overridden" but simply
         * the only pace there is.
         */
        it("spaces the topics by the sequence's own cadence", async () => {
            const sequenceId = await createSequence(freshTopicIds.slice(0, 2), 14);
            const startDate = inDays(10);

            const plan = await service.previewSequenceForClass({ classId, sequenceId, startDate });

            expect(format(plan.items[0].releaseDate)).toEqual(moment(startDate).format('YYYY-MM-DD'));
            expect(format(plan.items[1].releaseDate)).toEqual(moment(startDate).add(14, 'days').format('YYYY-MM-DD'));
            // Back to back still, so the first topic runs right up to the second starting.
            expect(format(plan.items[0].dueDate)).toEqual(moment(startDate).add(13, 'days').format('YYYY-MM-DD'));
        });

        /**
         * The one way a cadence can still be missing, now that a teacher cannot supply one and the
         * admin form will not save an interval sequence without one: a row that predates that rule.
         *
         * Made by clearing the column directly, because the service refuses to create it. Worth
         * covering because the failure is otherwise silent in the wrong direction: without the guard
         * in `planClassTopicDates`, every topic would land on the anchor date.
         *
         * The below-a-day cases are unit tested against `planClassTopicDates` directly, in
         * class_sequence_assignment.service.spec.ts. They are unreachable through this path.
         */
        it('refuses a sequence whose cadence is missing, which a row predating the rule can be', async () => {
            const sequenceId = await createSequence(freshTopicIds.slice(0, 2));

            await connection.query(`UPDATE static_lwp_topic_sequence SET "intervalDays" = NULL WHERE id = $1`, [sequenceId]);

            await expect(service.previewSequenceForClass({ classId, sequenceId, startDate: inDays(10) })).rejects.toThrow(
                'This sequence is missing its interval'
            );
        });

        it('refuses a start date in the past, so nothing is created already released', async () => {
            const sequenceId = await createSequence(freshTopicIds.slice(0, 2));

            await expect(service.previewSequenceForClass({ classId, sequenceId, startDate: inDays(-1) })).rejects.toThrow(
                'would be scheduled in the past'
            );
        });
    });

    describe('assign', () => {
        it('creates the class topics on the computed dates, linked to the assignment', async () => {
            const sequenceId = await createSequence(freshTopicIds.slice(0, 2));
            const startDate = inDays(14);

            const plan = await service.assignSequenceToClass({ classId, sequenceId, startDate }, userId);

            expect(plan.assignment).toBeDefined();
            expect(plan.assignment.status).toEqual(SequenceAssignmentStatus.ASSIGNED);
            expect(format(plan.assignment.startDate)).toEqual(moment(startDate).format('YYYY-MM-DD'));

            const rows = await connection.query(
                `SELECT "topicId"::text AS "topicId", "releaseDate", "dueDate", released
                 FROM lwp_class_topic WHERE "classSequenceAssignmentId" = $1 ORDER BY "releaseDate"`,
                [plan.assignment.id]
            );

            expect(rows).toHaveLength(2);
            expect(rows.map((row: { topicId: string }) => row.topicId)).toEqual(freshTopicIds.slice(0, 2));
            expect(format(rows[0].releaseDate)).toEqual(moment(startDate).format('YYYY-MM-DD'));
            expect(format(rows[0].dueDate)).toEqual(
                moment(startDate)
                    .add(templateIntervalDays - 1, 'days')
                    .format('YYYY-MM-DD')
            );
            expect(rows[0].released).toBe(false);
        });

        it('creates a class topic with no due date when the sequence item has no end date', async () => {
            const sequenceId = await createFixedSequenceWithOpenEnd(freshTopicIds.slice(0, 2));

            const plan = await service.assignSequenceToClass({ classId, sequenceId }, userId);

            expect(plan.items[0].dueDate).toBeNull();

            // displayDate is deliberately not asserted here: it is a virtual field computed in
            // class_topic.service.ts, with no column to select. Its "Released on" fallback for a
            // topic with no due date is covered by the buildClassTopicRow unit tests.
            const rows = await connection.query(
                `SELECT "dueDate" FROM lwp_class_topic
                 WHERE "classSequenceAssignmentId" = $1 ORDER BY "releaseDate"`,
                [plan.assignment.id]
            );

            expect(rows[0].dueDate).toBeNull();
            expect(rows[1].dueDate).not.toBeNull();
        });

        /**
         * The cadence is copied onto the assignment, and this is why that column exists: the sequence
         * is mutable, and an admin editing it later does not touch assignments already made, so the
         * template's current value is no evidence of what this class was actually given.
         *
         * There used to be two tests here, one for a leader overriding the cadence and one for a
         * leader accepting it. LEA-6624 left only one path, so they collapse into this.
         *
         * Asserted against **21**, a value the sequence carries and nothing else could supply, and
         * then the template is changed underneath the assignment to prove the row does not follow it.
         * That second half is the whole point of the column.
         */
        it("records the cadence the class's dates were generated from, and does not follow the sequence afterwards", async () => {
            const sequenceId = await createSequence(freshTopicIds.slice(0, 2), 21);

            const assigned = await service.assignSequenceToClass({ classId, sequenceId, startDate: inDays(20) }, userId);

            const [row] = await connection.query(`SELECT "intervalDays" FROM lwp_class_sequence_assignment WHERE id = $1`, [
                assigned.assignment.id
            ]);

            expect(row.intervalDays).toEqual(21);

            // An admin re-paces the sequence. The class keeps the 21 day topics it was actually given.
            await connection.query(`UPDATE static_lwp_topic_sequence SET "intervalDays" = 7 WHERE id = $1`, [sequenceId]);

            const [unchanged] = await connection.query(`SELECT "intervalDays" FROM lwp_class_sequence_assignment WHERE id = $1`, [
                assigned.assignment.id
            ]);

            expect(unchanged.intervalDays).toEqual(21);
        });

        it('leaves the interval unset for a fixed sequence, which has none, exactly as the start date is', async () => {
            const sequenceId = await createFixedSequenceWithOpenEnd(freshTopicIds.slice(0, 2));

            const fixed = await service.assignSequenceToClass({ classId, sequenceId }, userId);

            const [row] = await connection.query(`SELECT "startDate", "intervalDays" FROM lwp_class_sequence_assignment WHERE id = $1`, [
                fixed.assignment.id
            ]);

            expect(row.intervalDays).toBeNull();
            expect(row.startDate).toBeNull();
        });

        /**
         * The schedule page's auto-scheduled label is driven by this relation being non-null, and
         * getClassTopics loads no relations by default: topic, class and statistics only arrive
         * because each has a field resolver. Without the explicit relation the label would be
         * silently absent on every row, which no other test here would notice.
         */
        it('returns the assignment on the created class topics, so the schedule can label them', async () => {
            const sequenceId = await createSequence(freshTopicIds.slice(0, 2));

            // Compared by class topic id, not by topic: getClassTopics resolves `topic` through a
            // field resolver rather than loading it, so it is undefined at this level. That is the
            // same gap this test exists to cover.
            const before = await classTopicService.getClassTopics(classId);
            const existingIds = new Set(before.map((classTopic) => classTopic.id));

            const plan = await service.assignSequenceToClass({ classId, sequenceId, startDate: inDays(10) }, userId);

            const after = await classTopicService.getClassTopics(classId);
            const sequenced = after.filter((classTopic) => classTopic.classSequenceAssignment);

            expect(sequenced).toHaveLength(2);
            expect(sequenced.every((classTopic) => classTopic.classSequenceAssignment.id === plan.assignment.id)).toBe(true);

            // Whatever the class already had was scheduled by hand, so it must stay unlabelled.
            expect(
                after.filter((classTopic) => existingIds.has(classTopic.id)).every((classTopic) => !classTopic.classSequenceAssignment)
            ).toBe(true);
        });

        it('applies a per-topic override the leader made', async () => {
            const sequenceId = await createSequence(freshTopicIds.slice(0, 2));
            const startDate = inDays(20);
            const nudged = inDays(25);

            const plan = await service.assignSequenceToClass(
                {
                    classId,
                    sequenceId,
                    startDate,
                    overrides: [{ topicId: freshTopicIds[1], releaseDate: nudged }]
                },
                userId
            );

            const nudgedItem = plan.items.find((item) => item.topic.id === freshTopicIds[1]);

            expect(format(nudgedItem.releaseDate)).toEqual(moment(nudged).format('YYYY-MM-DD'));
        });

        /**
         * The counterpart to the test below: a topic the class has because someone scheduled it by
         * hand is warned about but still created, so the class ends up with a second copy on the
         * sequence's dates. Agreed with the team: the sequence's dates are the intended ones.
         */
        it('warns about a hand-scheduled topic and schedules it again anyway', async () => {
            // Scheduled directly, with no assignment, which is what makes it a hand-scheduled topic.
            await connection.query(
                `INSERT INTO lwp_class_topic ("classId", "topicId", "releaseDate", "dueDate", "teacherMessage")
                 VALUES ($1, $2, $3, $4, 'Assignment functional test hand-scheduled')`,
                [classId, freshTopicIds[0], inDays(3), inDays(9)]
            );

            const sequenceId = await createSequence(freshTopicIds.slice(0, 2));

            const plan = await service.assignSequenceToClass({ classId, sequenceId, startDate: inDays(60) }, userId);

            const existing = plan.items.find((item) => item.topic.id === freshTopicIds[0]);

            expect(existing.skipped).toBe(false);
            expect(existing.alreadyScheduled).toBe(true);
            expect(plan.scheduledCount).toEqual(2);
            expect(plan.skippedCount).toEqual(0);

            // Both topics created under this assignment, including the one already on the schedule.
            const rows = await connection.query(
                `SELECT "topicId"::text AS "topicId" FROM lwp_class_topic WHERE "classSequenceAssignmentId" = $1 ORDER BY "releaseDate"`,
                [plan.assignment.id]
            );

            expect(rows.map((row: { topicId: string }) => row.topicId).sort()).toEqual([...freshTopicIds.slice(0, 2)].sort());

            // The hand-scheduled one survives untouched, so the class now has that topic twice.
            const copies = await connection.query(
                `SELECT count(*)::int AS count FROM lwp_class_topic WHERE "classId" = $1 AND "topicId" = $2`,
                [classId, freshTopicIds[0]]
            );

            expect(copies[0].count).toEqual(2);

            await connection.query(`DELETE FROM lwp_class_topic WHERE "teacherMessage" = 'Assignment functional test hand-scheduled'`);
        });

        it('skips a topic a previous auto-schedule created, rather than duplicating it', async () => {
            // Establish the precondition rather than relying on seed data: schedule one topic via a
            // single-topic sequence, then assign a sequence that includes it alongside a new one.
            const firstSequenceId = await createSequence([freshTopicIds[0]]);

            await service.assignSequenceToClass({ classId, sequenceId: firstSequenceId, startDate: inDays(30) }, userId);

            const secondSequenceId = await createSequence([freshTopicIds[0], freshTopicIds[1]]);

            const plan = await service.assignSequenceToClass({ classId, sequenceId: secondSequenceId, startDate: inDays(35) }, userId);

            const skipped = plan.items.find((item) => item.topic.id === freshTopicIds[0]);
            const scheduled = plan.items.find((item) => item.topic.id === freshTopicIds[1]);

            expect(skipped.skipped).toBe(true);
            expect(skipped.skipReason).toEqual('ALREADY_SCHEDULED');
            expect(scheduled.skipped).toBe(false);
            expect(plan.scheduledCount).toEqual(1);
            expect(plan.skippedCount).toEqual(1);

            // Only the one new topic was created under the second assignment.
            const rows = await connection.query(
                `SELECT "topicId"::text AS "topicId" FROM lwp_class_topic WHERE "classSequenceAssignmentId" = $1`,
                [plan.assignment.id]
            );

            expect(rows.map((row: { topicId: string }) => row.topicId)).toEqual([freshTopicIds[1]]);
        });

        /**
         * Re-running the same set still adds nothing, which is the rule this has always been about.
         * What changed is that it is now refused rather than written as an empty assignment.
         *
         * An assignment with no class topics is not a harmless no-op. `hasAssignments` counts rows
         * rather than topics, so one permanently locks the sequence's academic year in the admin form
         * with "This sequence has been scheduled for a class", about a class that was given nothing.
         * The record would also simply be untrue.
         *
         * The preview still answers, and is still where the reason lives: it is the screen a leader is
         * looking at, and it names every skip.
         */
        it('refuses a second assignment of the same sequence rather than writing an empty one', async () => {
            const sequenceId = await createSequence(freshTopicIds.slice(0, 2));

            await service.assignSequenceToClass({ classId, sequenceId, startDate: inDays(40) }, userId);

            const before = await connection.query(
                `SELECT count(*)::int AS count FROM lwp_class_sequence_assignment WHERE "classId" = $1 AND "sequenceId" = $2`,
                [classId, sequenceId]
            );

            await expect(service.assignSequenceToClass({ classId, sequenceId, startDate: inDays(50) }, userId)).rejects.toThrow(
                'nothing to add'
            );

            // No second row, which is the point: the refusal has to leave nothing behind.
            const after = await connection.query(
                `SELECT count(*)::int AS count FROM lwp_class_sequence_assignment WHERE "classId" = $1 AND "sequenceId" = $2`,
                [classId, sequenceId]
            );

            expect(after[0].count).toEqual(before[0].count);

            // And the preview still explains why, naming every topic it is withholding.
            const plan = await service.previewSequenceForClass({
                classId,
                sequenceId,
                startDate: inDays(50)
            });

            expect(plan.scheduledCount).toEqual(0);
            expect(plan.skippedCount).toEqual(2);
            expect(plan.items.every((item) => item.skipReason === 'ALREADY_SCHEDULED')).toBe(true);
        });

        it('does not duplicate the class subject link for a registration class', async () => {
            const sequenceId = await createSequence(freshTopicIds.slice(0, 2));

            const before = await connection.query(
                `SELECT count(*)::int AS count FROM lwp_class_subjects WHERE "lwpSchoolClassId" = $1 AND "staticLwpSubjectId" = $2`,
                [classId, subjectId]
            );

            await service.assignSequenceToClass({ classId, sequenceId, startDate: inDays(60) }, userId);

            const after = await connection.query(
                `SELECT count(*)::int AS count FROM lwp_class_subjects WHERE "lwpSchoolClassId" = $1 AND "staticLwpSubjectId" = $2`,
                [classId, subjectId]
            );

            expect(after[0].count).toEqual(before[0].count);
        });
    });

    /**
     * Dropping a topic before scheduling it (LEA-6596).
     *
     * The second way out of a fixed sequence whose dates have passed, beside moving them forward: a
     * teacher who has missed January and February takes the rest of the set instead of re-dating
     * topics they do not want.
     */
    describe('excluded topics', () => {
        it('does not create a topic the teacher dropped, and says so on the plan', async () => {
            const sequenceId = await createSequence(freshTopicIds.slice(0, 2));

            const plan = await service.assignSequenceToClass(
                {
                    classId,
                    sequenceId,
                    startDate: inDays(80),
                    excludedTopicIds: [freshTopicIds[1]]
                },
                userId
            );

            expect(plan.scheduledCount).toEqual(1);
            expect(plan.excludedCount).toEqual(1);
            expect(plan.skippedCount).toEqual(0);

            // Still on the plan, so the page can show it struck through and offer it back.
            const dropped = plan.items.find((item) => item.topic.id === freshTopicIds[1]);

            expect(dropped.excluded).toBe(true);
            expect(dropped.skipped).toBe(false);

            const rows = await connection.query(
                `SELECT "topicId"::text AS "topicId" FROM lwp_class_topic WHERE "classSequenceAssignmentId" = $1`,
                [plan.assignment.id]
            );

            expect(rows.map((row: { topicId: string }) => row.topicId)).toEqual([freshTopicIds[0]]);
        });

        /**
         * The reason this feature exists. A fixed sequence dated in the past cannot be assigned while
         * any of those rows remain, and dropping them is the alternative to re-dating them.
         *
         * Seeded directly rather than built through the service, which correctly refuses to create a
         * sequence dated outside its academic year. A stale sequence is data that already exists.
         */
        it('lets a past-dated fixed sequence be assigned once the past rows are dropped', async () => {
            const [seeded] = await connection.query(
                `INSERT INTO static_lwp_topic_sequence (name, "timingMode", "subjectId", "yearGroupId", "periodIndex")
                 VALUES ($1, 'FIXED', $2, $3, $4) RETURNING id::text AS id`,
                [`Assignment functional test past dated ${createdSequenceIds.length + 1}`, subjectId, yearGroupId, periodIndex]
            );

            createdSequenceIds.push(seeded.id);

            await connection.query(
                `INSERT INTO static_lwp_topic_sequence_item ("order", "startDate", "endDate", "sequenceId", "topicId")
                 VALUES (1, $1, $2, $3, $4), (2, $5, $6, $3, $7)`,
                [inDays(-30), inDays(-24), seeded.id, freshTopicIds[0], inDays(90), inDays(96), freshTopicIds[1]]
            );

            // Refused while the past-dated row is still in the plan.
            await expect(service.previewSequenceForClass({ classId, sequenceId: seeded.id })).rejects.toThrow(
                'would be scheduled in the past'
            );

            // Dropping it is enough on its own: the remaining row is in the future and untouched.
            const plan = await service.previewSequenceForClass({
                classId,
                sequenceId: seeded.id,
                excludedTopicIds: [freshTopicIds[0]]
            });

            expect(plan.scheduledCount).toEqual(1);
            expect(plan.excludedCount).toEqual(1);

            const dropped = plan.items.find((item) => item.topic.id === freshTopicIds[0]);
            const kept = plan.items.find((item) => item.topic.id === freshTopicIds[1]);

            expect(dropped.excluded).toBe(true);
            // No window on a row that is not being scheduled, whatever the timing mode.
            expect(dropped.releaseDate).toBeNull();
            expect(dropped.dueDate).toBeNull();

            // The counterpart to the interval case below: a fixed sequence's rows carry their own
            // dates, so nothing moves up to fill the gap and the survivor stays exactly where the
            // admin put it.
            expect(format(kept.releaseDate)).toEqual(moment(inDays(90)).format('YYYY-MM-DD'));
            expect(format(kept.dueDate)).toEqual(moment(inDays(96)).format('YYYY-MM-DD'));
        });

        /**
         * The interval counterpart, and the reason `buildPlan` dates the included topics rather than
         * dating everything and filtering afterwards.
         *
         * On an interval sequence a topic's position *is* its date, so a topic dropped out of the
         * middle cannot leave its slot standing empty: the class would get a topic, then a dead
         * stretch as long as the interval, then the next one, and the first topic's window would end
         * long before the next one began.
         */
        it('closes the gap when a topic is dropped from the middle of an interval sequence', async () => {
            const sequenceId = await createSequence(freshTopicIds.slice(0, 3));
            const startDate = inDays(10);

            const plan = await service.previewSequenceForClass({
                classId,
                sequenceId,
                startDate,
                excludedTopicIds: [freshTopicIds[1]]
            });

            const rowFor = (topicId: string) => plan.items.find((item) => item.topic.id === topicId);

            const onDay = (days: number): string => moment(startDate).add(days, 'days').format('YYYY-MM-DD');

            expect(plan.scheduledCount).toEqual(2);
            expect(plan.excludedCount).toEqual(1);

            // The third topic takes the second's place: one interval after the first, not two.
            expect(format(rowFor(freshTopicIds[0]).releaseDate)).toEqual(onDay(0));
            expect(format(rowFor(freshTopicIds[2]).releaseDate)).toEqual(onDay(templateIntervalDays));

            // Which keeps the promise the form makes to the teacher: each topic runs until the next
            // one begins, with no empty stretch between them.
            expect(format(rowFor(freshTopicIds[0]).dueDate)).toEqual(onDay(templateIntervalDays - 1));

            // The dropped topic holds no slot at all. It is not being scheduled, and the days it used
            // to occupy now belong to the topic below it.
            expect(rowFor(freshTopicIds[1]).releaseDate).toBeNull();
            expect(rowFor(freshTopicIds[1]).dueDate).toBeNull();

            // Still in the table, still in its own place in the sequence, so it can be put back.
            expect(plan.items.map((item) => item.topic.id)).toEqual(freshTopicIds.slice(0, 3));
        });

        /**
         * A skip closes the gap exactly as a drop does, and for the same reason: neither topic is
         * being created, so neither can hold a slot an interval sequence dates by position.
         *
         * Asserted on a skip at the *top* of the sequence, which is the case that made this worth
         * changing. The first topic the class actually gets now lands on the start date the teacher
         * chose, rather than a whole interval past it.
         */
        it('starts on the chosen date even when the sequence opens with a skipped topic', async () => {
            // The precondition is established rather than assumed: the first topic is given to the
            // class by one assignment, so the next one skips it as already scheduled.
            const firstSequenceId = await createSequence([freshTopicIds[0]]);

            await service.assignSequenceToClass({ classId, sequenceId: firstSequenceId, startDate: inDays(20) }, userId);

            const sequenceId = await createSequence(freshTopicIds.slice(0, 3));
            const startDate = inDays(40);

            const plan = await service.previewSequenceForClass({ classId, sequenceId, startDate });

            const rowFor = (topicId: string) => plan.items.find((item) => item.topic.id === topicId);

            const onDay = (days: number): string => moment(startDate).add(days, 'days').format('YYYY-MM-DD');

            expect(rowFor(freshTopicIds[0]).skipped).toBe(true);
            expect(rowFor(freshTopicIds[0]).skipReason).toEqual('ALREADY_SCHEDULED');

            // The whole point: the second topic opens the set on the day that was asked for.
            expect(format(rowFor(freshTopicIds[1]).releaseDate)).toEqual(onDay(0));
            expect(format(rowFor(freshTopicIds[2]).releaseDate)).toEqual(onDay(templateIntervalDays));

            // And the skipped row holds no dates, since nothing will ever exist on them.
            expect(rowFor(freshTopicIds[0]).releaseDate).toBeNull();
            expect(rowFor(freshTopicIds[0]).dueDate).toBeNull();

            expect(plan.scheduledCount).toEqual(2);
            expect(plan.skippedCount).toEqual(1);
        });

        /** And back again, since a teacher who drops a topic by mistake must be able to undo it. */
        it('pushes the dates back down when the drop is undone', async () => {
            const sequenceId = await createSequence(freshTopicIds.slice(0, 3));
            const startDate = inDays(10);
            const request = { classId, sequenceId, startDate };

            const onDay = (days: number): string => moment(startDate).add(days, 'days').format('YYYY-MM-DD');

            const withDrop = await service.previewSequenceForClass({ ...request, excludedTopicIds: [freshTopicIds[1]] });
            const undone = await service.previewSequenceForClass({ ...request, excludedTopicIds: [] });

            const releaseOn = (plan: typeof undone, topicId: string): string =>
                format(plan.items.find((item) => item.topic.id === topicId).releaseDate);

            // The restored topic is dated again, and the one below it moves back down to make room.
            expect(releaseOn(undone, freshTopicIds[1])).toEqual(onDay(templateIntervalDays));
            expect(releaseOn(undone, freshTopicIds[2])).toEqual(onDay(templateIntervalDays * 2));

            // Asserted against the dropped plan rather than only against the arithmetic, so this
            // fails if the two ever stop differing and the undo becomes a no-op.
            expect(releaseOn(withDrop, freshTopicIds[2])).toEqual(onDay(templateIntervalDays));

            expect(undone.scheduledCount).toEqual(3);
            expect(undone.excludedCount).toEqual(0);
        });

        it('still refuses when a past-dated row is left in the plan', async () => {
            const [seeded] = await connection.query(
                `INSERT INTO static_lwp_topic_sequence (name, "timingMode", "subjectId", "yearGroupId", "periodIndex")
                 VALUES ($1, 'FIXED', $2, $3, $4) RETURNING id::text AS id`,
                [`Assignment functional test two past ${createdSequenceIds.length + 1}`, subjectId, yearGroupId, periodIndex]
            );

            createdSequenceIds.push(seeded.id);

            await connection.query(
                `INSERT INTO static_lwp_topic_sequence_item ("order", "startDate", "endDate", "sequenceId", "topicId")
                 VALUES (1, $1, $2, $3, $4), (2, $5, $6, $3, $7)`,
                [inDays(-30), inDays(-24), seeded.id, freshTopicIds[0], inDays(-20), inDays(-14), freshTopicIds[1]]
            );

            // Dropping one of two past-dated rows is not enough. The rule is unchanged: what stays
            // in the plan still has to be movable into the future.
            await expect(
                service.previewSequenceForClass({ classId, sequenceId: seeded.id, excludedTopicIds: [freshTopicIds[0]] })
            ).rejects.toThrow('would be scheduled in the past');
        });

        /**
         * The hand-scheduled warning says the class will end up with the topic twice. That is untrue
         * once the teacher has dropped the row, since it is not being created at all, so the flag has
         * to come off with the exclusion rather than sitting beside a struck-through row.
         */
        it('stops warning that a hand-scheduled topic will be added twice, once it is dropped', async () => {
            const sequenceId = await createSequence(freshTopicIds.slice(0, 2));

            // Scheduled directly, with no assignment, which is what makes it hand-scheduled: one an
            // earlier auto-schedule created would be skipped instead, and never warned about.
            await connection.query(
                `INSERT INTO lwp_class_topic ("classId", "topicId", "releaseDate", "dueDate", "teacherMessage")
                 VALUES ($1, $2, $3, $4, 'Assignment functional test dropped hand-scheduled')`,
                [classId, freshTopicIds[0], inDays(5), inDays(9)]
            );

            const warned = await service.previewSequenceForClass({
                classId,
                sequenceId,
                startDate: inDays(120)
            });

            expect(warned.items.find((item) => item.topic.id === freshTopicIds[0]).alreadyScheduled).toBe(true);

            const dropped = await service.previewSequenceForClass({
                classId,
                sequenceId,
                startDate: inDays(120),
                excludedTopicIds: [freshTopicIds[0]]
            });

            const row = dropped.items.find((item) => item.topic.id === freshTopicIds[0]);

            expect(row.excluded).toBe(true);
            expect(row.alreadyScheduled).toBe(false);
        });

        it('counts a topic that is both skipped and excluded once, as a skip', async () => {
            const sequenceId = await createSequence(freshTopicIds.slice(0, 2));

            // Assigned once, so both topics are skipped on a second run whatever the teacher drops.
            await service.assignSequenceToClass({ classId, sequenceId, startDate: inDays(100) }, userId);

            const plan = await service.previewSequenceForClass({
                classId,
                sequenceId,
                startDate: inDays(110),
                excludedTopicIds: [freshTopicIds[0]]
            });

            // The server withheld it whatever the teacher chose, so saying they dropped it would be
            // untrue. Both are skips; neither is counted as an exclusion.
            expect(plan.scheduledCount).toEqual(0);
            expect(plan.skippedCount).toEqual(2);
            expect(plan.excludedCount).toEqual(0);
        });
    });

    describe('remove', () => {
        it('deletes the unreleased topics, keeps released ones and marks the assignment removed', async () => {
            const sequenceId = await createSequence(freshTopicIds.slice(0, 2));

            const plan = await service.assignSequenceToClass({ classId, sequenceId, startDate: inDays(70) }, userId);
            const assignmentId = plan.assignment.id;

            const [firstRow] = await connection.query(
                `SELECT id::text AS id FROM lwp_class_topic WHERE "classSequenceAssignmentId" = $1 ORDER BY "releaseDate" LIMIT 1`,
                [assignmentId]
            );

            // Stand in for a topic the cron has already released to pupils.
            await connection.query(`UPDATE lwp_class_topic SET released = true WHERE id = $1`, [firstRow.id]);

            const result = await service.removeAssignment(assignmentId, userId);

            expect(result.status).toEqual('ok');

            const remaining = await connection.query(
                `SELECT id::text AS id, released FROM lwp_class_topic WHERE "classSequenceAssignmentId" = $1`,
                [assignmentId]
            );

            expect(remaining).toHaveLength(1);
            expect(remaining[0].id).toEqual(firstRow.id);
            expect(remaining[0].released).toBe(true);

            const [assignment] = await connection.query(`SELECT status FROM lwp_class_sequence_assignment WHERE id = $1`, [assignmentId]);

            expect(assignment.status).toEqual(SequenceAssignmentStatus.REMOVED);
        });

        it('reports a missing assignment rather than failing silently', async () => {
            await expect(service.removeAssignment('999999999', userId)).rejects.toThrow('Sequence assignment does not exist');
        });
    });
});
