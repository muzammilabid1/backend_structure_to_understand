import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SequenceTimingMode } from 'lwp-shared/enums';
import moment from 'moment';
import { StaticLwpTopicSequence } from 'src/api/entities/static_topic_sequence';
import { TopicSequenceService } from 'src/api/service/topic_sequence.service';
import { BaseModule } from 'src/base.module';
import { Connection } from 'typeorm';

/**
 * Exercises the sequence CRUD against a real database, so the SQL, the transactions and the
 * cascade behaviour are covered rather than mocked. Run with `yarn test:functional`.
 *
 * Fixtures are discovered from whatever content the database holds, so this does not depend on
 * specific seed ids. Everything it creates is removed again in afterAll.
 */
// Booting the full Nest app + DB round-trips is well over Jest's 5s default.
jest.setTimeout(120000);

describe('TopicSequenceService against the database', () => {
    let app: INestApplication;
    let connection: Connection;
    let service: TopicSequenceService;

    /** A subject and year group with enough published topics to build a sequence from. */
    let subjectId: string;
    let yearGroupId: string;
    /**
     * The academic year the FIXED sequences in this suite declare, and the day it starts.
     *
     * Interval sequences declare no year at all, so this is only ever used by the fixed ones.
     */
    let periodIndex: number;
    let periodStart: moment.Moment;
    let topicIds: string[];
    let userId: string;

    const createdSequenceIds: string[] = [];

    /** An absent end date reads as "open", since a fixed sequence may leave one unset. */
    const format = (value: unknown): string => (value ? moment(value as string).format('YYYY-MM-DD') : 'open');
    const shape = (sequence: StaticLwpTopicSequence): string[] =>
        sequence.items.map((item) => `${item.order}:${item.topic.id}:${format(item.startDate)}..${format(item.endDate)}`);

    /**
     * A date `days` into the academic year the fixture found, for the template dates a FIXED sequence
     * carries. Those must sit inside the year the sequence declares, so they are derived from that
     * year rather than written as literals.
     *
     * Deliberately counted from the year's start rather than from today: nothing on the admin side
     * refuses a past date, unlike assignment, so the whole year is usable and the suite behaves the
     * same whenever in the year it runs.
     */
    const inPeriod = (days: number): Date => new Date(periodStart.clone().add(days, 'days').format('YYYY-MM-DD'));

    /** The same date as `inPeriod` renders it, for asserting against {@link shape}. */
    const inPeriodText = (days: number): string => periodStart.clone().add(days, 'days').format('YYYY-MM-DD');

    beforeAll(async () => {
        app = await NestFactory.create(BaseModule);
        connection = app.get(Connection);
        service = app.get(TopicSequenceService);

        const [fixture] = await connection.query(`
            SELECT d."subjectId"::text AS "subjectId",
                   tdyg."yearGroupId"::text AS "yearGroupId",
                   array_agg(DISTINCT t.id::text ORDER BY t.id::text) AS "topicIds"
            FROM static_lwp_topic_domain d
            JOIN static_lwp_topic_domain_year_group tdyg ON tdyg."domainId" = d.id
            JOIN static_lwp_topic t ON t.id = tdyg."topicId"
            -- Every rule the topic picker applies, mirrored. This fixture asserts that what it picked
            -- is what getCandidateTopicsForSequence offers, so anything it selects that the picker
            -- refuses fails the fixture rather than the case under test.
            WHERE t."isPublished" AND NOT t."isHidden"
              -- A reading topic is scheduled through the reading log on its own weekly cadence, so it
              -- has no place in a dated sequence and the picker excludes it.
              AND NOT t."isReading"
              -- A topic needing a photo from the teacher can go in no sequence at all, and the topic
              -- picker does not offer one, so a fixture built on one fails its own assertions rather
              -- than the case under test. The same rule as
              -- TopicSequenceService.findTopicIdsNeedingATeacherPhoto, down to only counting steps on
              -- a non-hidden activity. Its counterpart lives in the class-sequence-assignment fixture.
              AND NOT EXISTS (
                  SELECT 1
                  FROM static_lwp_activity a
                  JOIN static_lwp_activity_steps st ON st."activityId" = a.id
                  WHERE a."topicId" = t.id AND NOT a."isHidden" AND st."stepType" = 'SET_BY_TEACHER'
              )
            GROUP BY 1, 2
            HAVING count(DISTINCT t.id) >= 3
            ORDER BY count(DISTINCT t.id) DESC
            LIMIT 1
        `);

        if (!fixture) throw new Error('No subject and year group with at least three published topics; seed the database first');

        subjectId = fixture.subjectId;
        yearGroupId = fixture.yearGroupId;

        /*
         * A FIXED sequence's items must fall inside the academic year it declares (LEA-6581), so the
         * suite needs a real year to place its dates in.
         *
         * The **current** one, and every date is then derived from it by {@link inPeriod}. This used
         * to work the other way round, looking a period up by a hardcoded span of 2026 dates, which
         * was fragile in three ways: it depended on that particular year still existing in the
         * table, it pinned the fixtures to a year LEA-6586 is designed to eventually delete, and it
         * quietly assumed academic years run September to August.
         *
         * The current year is also the only one the admin list offers (LEA-6585), so building in it
         * is what an admin would actually do.
         */
        const [period] = await connection.query(`
            SELECT index, "startDate"::text AS "startDate", "endDate"::text AS "endDate"
            FROM static_lwp_period
            WHERE "isCurrentPeriod" = true AND "startDate" IS NOT NULL AND "endDate" IS NOT NULL
            LIMIT 1
        `);

        if (!period) {
            throw new Error(
                'No current academic year with a start and end date. A fixed sequence must declare one and its ' +
                    "topics must fall inside it, so check static_lwp_period's isCurrentPeriod flag and its dates."
            );
        }

        periodIndex = period.index;
        periodStart = moment(period.startDate);

        // The fixed sequences below place topics up to 90 days in, so a year shorter than that has
        // no room for them. Refused by name rather than failing later on a date that fell outside.
        const periodLengthInDays = moment(period.endDate).diff(periodStart, 'days');

        if (periodLengthInDays < 91) {
            throw new Error(
                `The current academic year runs ${period.startDate} to ${period.endDate}, which is ${periodLengthInDays} days ` +
                    'and too short for this suite to date a sequence in. It needs at least 91.'
            );
        }

        topicIds = fixture.topicIds.slice(0, 3);

        const [user] = await connection.query(`SELECT id::text AS id FROM lwp_user ORDER BY id LIMIT 1`);

        if (!user) throw new Error('No users in the database; seed the database first');

        userId = user.id;
    });

    afterAll(async () => {
        if (createdSequenceIds.length) {
            await connection.query(`DELETE FROM static_lwp_topic_sequence WHERE id = ANY($1::bigint[])`, [createdSequenceIds]);
        }

        await app?.close();
    });

    const createIntervalSequence = async (): Promise<StaticLwpTopicSequence> => {
        const sequence = await service.createSequence(
            {
                name: `Functional test sequence ${createdSequenceIds.length + 1}`,
                subjectId,
                yearGroupId,
                timingMode: SequenceTimingMode.INTERVAL,
                intervalDays: 7,
                items: [
                    { topicId: topicIds[0], order: 1 },
                    { topicId: topicIds[1], order: 2 }
                ]
            },
            userId
        );

        createdSequenceIds.push(sequence.id);

        return sequence;
    };

    describe('candidate topics', () => {
        it('offers the published topics for the subject and year group, grouped by domain', async () => {
            const groups = await service.getCandidateTopicsForSequence(subjectId, yearGroupId);

            expect(groups.length).toBeGreaterThan(0);

            groups.forEach((group) => {
                expect(group.domainId).toBeTruthy();
                expect(group.domainTitle).toBeTruthy();
                expect(group.topics.length).toBeGreaterThan(0);
            });

            const offered = groups.flatMap((group) => group.topics.map((topic) => topic.id));

            topicIds.forEach((topicId) => expect(offered).toContain(topicId));
        });

        it('excludes unpublished and hidden topics', async () => {
            const offered = (await service.getCandidateTopicsForSequence(subjectId, yearGroupId)).flatMap((group) => group.topics);

            offered.forEach((topic) => {
                expect(topic.isPublished).toBe(true);
                expect(topic.isHidden).toBe(false);
            });
        });
    });

    describe('create', () => {
        /**
         * An interval sequence stores its order and no dates at all (LEA-6594). It used to generate
         * a back-to-back window onto every item from the anchor plus the interval; those dates were
         * then thrown away at every use, because `planClassTopicDates` re-anchors from the class's
         * own start date and never reads the template's.
         *
         * Only a real database can show the nulls survived the write, which is why this assertion
         * lives here rather than in the unit spec.
         */
        it('persists an interval sequence with its order and no dates', async () => {
            const created = await createIntervalSequence();

            expect(created.timingMode).toEqual(SequenceTimingMode.INTERVAL);
            expect(created.subject.id).toEqual(subjectId);
            expect(created.yearGroup.id).toEqual(yearGroupId);
            expect(shape(created)).toEqual([`1:${topicIds[0]}:open..open`, `2:${topicIds[1]}:open..open`]);

            // Stored on the sequence, because the cadence is ours to set. It dates nothing here: the
            // items are open at both ends above, and this is read at assignment time instead.
            expect(created.intervalDays).toEqual(7);

            const rows = await connection.query(
                `SELECT "startDate", "endDate" FROM static_lwp_topic_sequence_item WHERE "sequenceId" = $1`,
                [created.id]
            );

            expect(rows).toHaveLength(2);
            rows.forEach((row: { startDate: unknown; endDate: unknown }) => {
                expect(row.startDate).toBeNull();
                expect(row.endDate).toBeNull();
            });
        });

        it('reads back the same sequence it returned', async () => {
            const created = await createIntervalSequence();
            const fetched = await service.getSequence(created.id);

            expect(shape(fetched)).toEqual(shape(created));
            expect(await service.getSequenceItemCount(created.id)).toEqual(2);
        });

        /**
         * The whole point of making the column nullable, and only a real database can prove the null
         * survives the write. An interval sequence belongs to no academic year and is offered in
         * every one of them, forever.
         */
        it('stores an interval sequence with no academic year at all', async () => {
            const created = await createIntervalSequence();

            expect(created.period).toBeNull();
            expect((await service.getSequence(created.id)).period).toBeNull();

            const [row] = await connection.query(`SELECT "periodIndex" FROM static_lwp_topic_sequence WHERE id = $1`, [created.id]);

            expect(row.periodIndex).toBeNull();
        });

        it('refuses an interval sequence that was given an academic year', async () => {
            await expect(
                service.createSequence(
                    {
                        name: 'Functional test interval with a year',
                        subjectId,
                        yearGroupId,
                        periodIndex,
                        timingMode: SequenceTimingMode.INTERVAL,
                        intervalDays: 7,
                        items: [{ topicId: topicIds[0], order: 1 }]
                    },
                    userId
                )
            ).rejects.toThrow('An interval sequence is not tied to an academic year');
        });

        /**
         * The mirror of the rule above, and the reason both exist: each mode is refused the other's
         * timing field rather than having it quietly nulled. The only way to send one is a form that
         * changed timing mode without clearing its state.
         */
        it('refuses a fixed sequence that was given a cadence', async () => {
            await expect(
                service.createSequence(
                    {
                        name: 'Functional test fixed with a cadence',
                        subjectId,
                        yearGroupId,
                        periodIndex,
                        timingMode: SequenceTimingMode.FIXED,
                        intervalDays: 7,
                        items: [{ topicId: topicIds[0], startDate: inPeriod(6) }]
                    },
                    userId
                )
            ).rejects.toThrow('A fixed sequence sets a date on each topic, so it cannot be given an interval');
        });

        it('refuses an interval sequence with no cadence, which could never be assigned', async () => {
            await expect(
                service.createSequence(
                    {
                        name: 'Functional test interval with no cadence',
                        subjectId,
                        yearGroupId,
                        timingMode: SequenceTimingMode.INTERVAL,
                        items: [{ topicId: topicIds[0], order: 1 }]
                    },
                    userId
                )
            ).rejects.toThrow('An interval sequence needs the number of days between its topics');
        });

        it('refuses a fixed sequence with no academic year', async () => {
            await expect(
                service.createSequence(
                    {
                        name: 'Functional test fixed with no year',
                        subjectId,
                        yearGroupId,
                        timingMode: SequenceTimingMode.FIXED,
                        items: [{ topicId: topicIds[0], startDate: inPeriod(6) }]
                    },
                    userId
                )
            ).rejects.toThrow('A fixed sequence needs the academic year it is for');
        });

        it('rejects a topic outside the subject and year group', async () => {
            const [outsider] = await connection.query(
                `
                SELECT t.id::text AS id
                FROM static_lwp_topic t
                WHERE t.id NOT IN (
                    SELECT tdyg."topicId"
                    FROM static_lwp_topic_domain_year_group tdyg
                    JOIN static_lwp_topic_domain d ON d.id = tdyg."domainId"
                    WHERE d."subjectId" = $1 AND tdyg."yearGroupId" = $2
                )
                LIMIT 1
            `,
                [subjectId, yearGroupId]
            );

            if (!outsider) return; // nothing out of scope in this database, so nothing to assert

            await expect(
                service.createSequence(
                    {
                        name: 'Functional test out of scope',
                        subjectId,
                        yearGroupId,
                        timingMode: SequenceTimingMode.INTERVAL,
                        intervalDays: 7,
                        items: [{ topicId: outsider.id, order: 1 }]
                    },
                    userId
                )
            ).rejects.toThrow("do not belong to the sequence's subject and year group");
        });
    });

    describe('item management', () => {
        it('appends a topic to the end of an interval sequence', async () => {
            const created = await createIntervalSequence();
            const appended = await service.addSequenceItem(created.id, { topicId: topicIds[2] }, userId);

            expect(shape(appended)).toEqual([`1:${topicIds[0]}:open..open`, `2:${topicIds[1]}:open..open`, `3:${topicIds[2]}:open..open`]);
        });

        it('renumbers the topics when they are reordered', async () => {
            const created = await createIntervalSequence();
            const reversed = [...created.items].reverse().map((item) => item.id);
            const reordered = await service.reorderSequenceItems(created.id, reversed, userId);

            // The order is the whole content of an interval sequence, so this is the only thing a
            // reorder can change. It used to hand each topic the window of the one it displaced.
            expect(shape(reordered)).toEqual([`1:${topicIds[1]}:open..open`, `2:${topicIds[0]}:open..open`]);
        });

        it('closes the gap when a topic is removed', async () => {
            const created = await createIntervalSequence();
            const appended = await service.addSequenceItem(created.id, { topicId: topicIds[2] }, userId);
            const removed = await service.removeSequenceItem(appended.items[1].id, userId);

            expect(shape(removed)).toEqual([`1:${topicIds[0]}:open..open`, `2:${topicIds[2]}:open..open`]);
        });
    });

    describe('update', () => {
        /**
         * Changing the cadence stores the new value and re-dates nothing, because there are no item
         * dates to re-flow: an interval sequence's items are open at both ends (LEA-6594) and the
         * dates are worked out per class at assignment time.
         *
         * This test used to assert the whole set re-flowed from the anchor onto fortnightly windows.
         * That is what stopped being true, not the cadence itself.
         */
        it('stores a changed cadence, and keeps the topics and their order undated', async () => {
            const created = await createIntervalSequence();

            const updated = await service.updateSequence(
                {
                    id: created.id,
                    name: created.name,
                    subjectId,
                    yearGroupId,
                    timingMode: SequenceTimingMode.INTERVAL,
                    intervalDays: 14
                },
                userId
            );

            expect(shape(updated)).toEqual([`1:${topicIds[0]}:open..open`, `2:${topicIds[1]}:open..open`]);
            expect(updated.intervalDays).toEqual(14);
        });

        it('switches to fixed dates, clearing the cadence and ordering chronologically', async () => {
            const created = await createIntervalSequence();

            const fixed = await service.updateSequence(
                {
                    id: created.id,
                    name: created.name,
                    subjectId,
                    yearGroupId,
                    periodIndex,
                    timingMode: SequenceTimingMode.FIXED,
                    items: [
                        { topicId: topicIds[0], startDate: inPeriod(61), endDate: inPeriod(90) },
                        { topicId: topicIds[1], startDate: inPeriod(0), endDate: inPeriod(3) }
                    ]
                },
                userId
            );

            expect(fixed.period.index).toEqual(periodIndex);
            expect(shape(fixed)).toEqual([
                `1:${topicIds[1]}:${inPeriodText(0)}..${inPeriodText(3)}`,
                `2:${topicIds[0]}:${inPeriodText(61)}..${inPeriodText(90)}`
            ]);
        });

        /**
         * A behaviour change worth pinning, because it is the one thing LEA-6594 makes stricter
         * rather than looser.
         *
         * Omitting the items keeps the existing topics and re-dates them, which is how changing the
         * timing re-flows a sequence. An interval sequence now has no dates to carry over, so
         * becoming fixed with no items supplied leaves every topic without a start date and is
         * refused. Before this change the generated dates came along and the switch quietly
         * succeeded, handing the admin a fixed sequence dated from an anchor they had not chosen.
         *
         * The admin form always sends items when switching, so this is an API-level guard rather
         * than a path the UI can reach.
         */
        it('refuses to become fixed without dates, when no items are supplied', async () => {
            const created = await createIntervalSequence();

            await expect(
                service.updateSequence(
                    {
                        id: created.id,
                        name: created.name,
                        subjectId,
                        yearGroupId,
                        periodIndex,
                        timingMode: SequenceTimingMode.FIXED
                    },
                    userId
                )
            ).rejects.toThrow('Every topic in a fixed sequence needs a start date');
        });

        /**
         * The other direction, which is where a stale year would be left behind. A sequence that was
         * fixed and becomes interval must lose its academic year in the same write, or it keeps one
         * that every later read has to remember to ignore.
         */
        it('clears the academic year when a fixed sequence becomes an interval one', async () => {
            const created = await createIntervalSequence();

            const fixed = await service.updateSequence(
                {
                    id: created.id,
                    name: created.name,
                    subjectId,
                    yearGroupId,
                    periodIndex,
                    timingMode: SequenceTimingMode.FIXED,
                    items: [
                        { topicId: topicIds[0], startDate: inPeriod(0) },
                        { topicId: topicIds[1], startDate: inPeriod(30) }
                    ]
                },
                userId
            );

            expect(fixed.period.index).toEqual(periodIndex);

            const backToInterval = await service.updateSequence(
                {
                    id: created.id,
                    name: created.name,
                    subjectId,
                    yearGroupId,
                    timingMode: SequenceTimingMode.INTERVAL,
                    intervalDays: 7
                },
                userId
            );

            expect(backToInterval.period).toBeNull();

            const [row] = await connection.query(`SELECT "periodIndex" FROM static_lwp_topic_sequence WHERE id = $1`, [created.id]);

            expect(row.periodIndex).toBeNull();
        });

        it('stores a fixed topic with no end date, as a manually scheduled topic may have none', async () => {
            const created = await createIntervalSequence();

            const fixed = await service.updateSequence(
                {
                    id: created.id,
                    name: created.name,
                    subjectId,
                    yearGroupId,
                    periodIndex,
                    timingMode: SequenceTimingMode.FIXED,
                    items: [
                        { topicId: topicIds[0], startDate: inPeriod(0) },
                        { topicId: topicIds[1], startDate: inPeriod(30), endDate: inPeriod(33) }
                    ]
                },
                userId
            );

            expect(shape(fixed)).toEqual([
                `1:${topicIds[0]}:${inPeriodText(0)}..open`,
                `2:${topicIds[1]}:${inPeriodText(30)}..${inPeriodText(33)}`
            ]);
            // Read back, so the null survived the round trip through the database.
            expect(shape(await service.getSequence(created.id))).toEqual(shape(fixed));
        });

        it('refuses to reorder a fixed sequence and leaves it untouched', async () => {
            const created = await createIntervalSequence();

            const fixed = await service.updateSequence(
                {
                    id: created.id,
                    name: created.name,
                    subjectId,
                    yearGroupId,
                    periodIndex,
                    timingMode: SequenceTimingMode.FIXED,
                    items: [
                        { topicId: topicIds[0], startDate: inPeriod(0), endDate: inPeriod(3) },
                        { topicId: topicIds[1], startDate: inPeriod(30), endDate: inPeriod(33) }
                    ]
                },
                userId
            );

            await expect(service.reorderSequenceItems(created.id, fixed.items.map((item) => item.id).reverse(), userId)).rejects.toThrow(
                'ordered by its topic dates'
            );

            expect(shape(await service.getSequence(created.id))).toEqual(shape(fixed));
        });
    });

    describe('list', () => {
        it('finds the sequence by subject and by name, and not under another subject', async () => {
            const created = await createIntervalSequence();

            const bySubject = await service.getSequences({ subjectId });
            const bySearch = await service.getSequences({ search: created.name.toLowerCase() });

            expect(bySubject.map((sequence) => sequence.id)).toContain(created.id);
            expect(bySearch.map((sequence) => sequence.id)).toContain(created.id);

            const [otherSubject] = await connection.query(`SELECT id::text AS id FROM static_lwp_subject WHERE id <> $1 LIMIT 1`, [
                subjectId
            ]);

            if (otherSubject) {
                const wrongSubject = await service.getSequences({ subjectId: otherSubject.id });

                expect(wrongSubject.map((sequence) => sequence.id)).not.toContain(created.id);
            }
        });
    });

    describe('delete', () => {
        it('removes the sequence and cascades its items, archiving both', async () => {
            const created = await createIntervalSequence();

            expect(await service.deleteSequence(created.id)).toEqual({ status: 'ok', msg: '1 records deleted' });

            const [items] = await connection.query(
                `SELECT count(*)::int AS count FROM static_lwp_topic_sequence_item WHERE "sequenceId" = $1`,
                [created.id]
            );

            expect(items.count).toEqual(0);

            const [archived] = await connection.query(
                `SELECT count(*)::int AS count FROM deleted_item WHERE source = 'static_lwp_topic_sequence' AND "recordId" = $1`,
                [created.id]
            );

            expect(archived.count).toBeGreaterThan(0);
        });

        it('reports failure when the sequence does not exist', async () => {
            expect(await service.deleteSequence('999999999')).toEqual({ status: 'fail', msg: 'No records deleted' });
        });
    });
});
