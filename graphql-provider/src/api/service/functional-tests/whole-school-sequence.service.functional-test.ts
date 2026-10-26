import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SequenceTimingMode, WholeSchoolSequenceStatus } from 'lwp-shared/enums';
import moment from 'moment';
import { TopicSequenceService } from 'src/api/service/topic_sequence.service';
import { WholeSchoolSequenceService } from 'src/api/service/whole_school_sequence.service';
import { BaseModule } from 'src/base.module';
import { Connection } from 'typeorm';

/**
 * Exercises whole-school sequence CRUD against a real database, so the unique key, the foreign keys
 * and the readable duplicate message are covered rather than mocked. Run with `yarn test:functional`.
 *
 * The duplicate rule is the case that most needs a real database: a unit test can only prove the
 * service checked before inserting, not that the index would have stopped it if it had not.
 *
 * Fixtures are discovered from whatever content the database holds, so this does not depend on
 * specific seed ids. Everything it creates is removed again in afterAll.
 */
// Booting the full Nest app + DB round-trips is well over Jest's 5s default.
jest.setTimeout(120000);

describe('WholeSchoolSequenceService against the database', () => {
    let app: INestApplication;
    let connection: Connection;
    let service: WholeSchoolSequenceService;

    let sequenceService: TopicSequenceService;

    let subjectId: string;
    let otherSubjectId: string;
    let periodIndex: number;
    let otherPeriodIndex: number;
    /**
     * Each academic year's start date, keyed by its index.
     *
     * Per year rather than one date, because a fixed sequence's topics must fall inside the year it
     * declares: a sequence built for next year and dated from this year's start is refused by
     * `createSequence` itself, which fails the fixture rather than the case under test.
     */
    let periodStartByIndex: Map<number, string>;
    let userId: string;

    /** Two year groups of the same subject, each with a topic a sequence can legitimately contain. */
    let firstYearGroup: { yearGroupId: string; topicId: string };
    let secondYearGroup: { yearGroupId: string; topicId: string };

    const createdIds: string[] = [];
    const createdSequenceIds: string[] = [];

    /** A fixed sequence for one year group, dated inside the academic year it declares. */
    const createSequence = async (
        yearGroup: { yearGroupId: string; topicId: string },
        { period = periodIndex, timingMode = SequenceTimingMode.FIXED }: { period?: number; timingMode?: SequenceTimingMode } = {}
    ): Promise<string> => {
        const isFixed = timingMode === SequenceTimingMode.FIXED;
        // Dated inside the year this sequence declares, not inside the current one.
        const start = periodStartByIndex.get(period);

        const sequence = await sequenceService.createSequence(
            {
                name: `E2E whole-school member ${Date.now().toString(36)}-${createdSequenceIds.length}`,
                subjectId,
                yearGroupId: yearGroup.yearGroupId,
                // An interval sequence belongs to no academic year and the API refuses one on it.
                periodIndex: isFixed ? period : undefined,
                timingMode,
                intervalDays: isFixed ? undefined : 7,
                items: [
                    isFixed
                        ? { topicId: yearGroup.topicId, order: 1, startDate: new Date(moment(start).add(7, 'days').format('YYYY-MM-DD')) }
                        : { topicId: yearGroup.topicId, order: 1 }
                ]
            },
            userId
        );

        createdSequenceIds.push(sequence.id);

        return sequence.id;
    };

    /** Tracked so afterAll removes it even if the case that created it then failed. */
    const create = async (subject: string, period: number): Promise<string> => {
        const created = await service.createWholeSchoolSequence({ subjectId: subject, periodIndex: period }, userId);

        createdIds.push(created.id);

        return created.id;
    };

    beforeAll(async () => {
        app = await NestFactory.create(BaseModule);
        connection = app.get(Connection);
        service = app.get(WholeSchoolSequenceService);

        sequenceService = app.get(TopicSequenceService);

        /*
         * A subject with published topics in two different year groups.
         *
         * Discovered rather than taken as "the first two subjects", because the member cases build
         * real fixed sequences and a sequence needs a topic. Two year groups, so "one sequence per
         * year group" can be told apart from "one sequence per whole-school sequence".
         *
         * Every rule the sequence topic picker applies is mirrored, so a fixture this finds is one an
         * admin could really have built: unpublished, hidden, reading and set-by-teacher topics are
         * all refused by `createSequence` and would fail the fixture rather than the case under test.
         */
        const eligibleTopics = await connection.query(`
            SELECT d."subjectId"::text AS "subjectId",
                   tdyg."yearGroupId"::text AS "yearGroupId",
                   (array_agg(DISTINCT t.id::text))[1] AS "topicId"
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
        `);

        const bySubject = new Map<string, { yearGroupId: string; topicId: string }[]>();

        eligibleTopics.forEach((row: { subjectId: string; yearGroupId: string; topicId: string }) => {
            bySubject.set(row.subjectId, [...(bySubject.get(row.subjectId) || []), { yearGroupId: row.yearGroupId, topicId: row.topicId }]);
        });

        const usableSubject = [...bySubject.entries()].find(([, yearGroups]) => yearGroups.length >= 2);

        if (!usableSubject) {
            throw new Error('No subject with published topics in two different year groups; seed the database first');
        }

        subjectId = usableSubject[0];
        [firstYearGroup, secondYearGroup] = usableSubject[1];

        const [anotherSubject] = await connection.query(`SELECT id::text AS id FROM static_lwp_subject WHERE id != $1 LIMIT 1`, [
            subjectId
        ]);

        if (!anotherSubject) throw new Error('Only one subject exists; seed the database first');

        otherSubjectId = anotherSubject.id;

        /*
         * Two academic years, because "the same subject in a different year is allowed" is half of
         * what the unique key says and cannot be tested with one.
         *
         * The current year and the one after it, which is also the pair an admin would work with:
         * those are the only years the form offers.
         */
        const periods = await connection.query(`
            SELECT index, "startDate"::text AS "startDate", "endDate"::text AS "endDate"
            FROM static_lwp_period
            WHERE index >= (SELECT index FROM static_lwp_period WHERE "isCurrentPeriod" = true)
            ORDER BY index
            LIMIT 2
        `);

        if (periods.length < 2) {
            throw new Error(
                'Need the current academic year and at least one after it. Check static_lwp_period, including its ' +
                    'isCurrentPeriod flag.'
            );
        }

        periodIndex = periods[0].index;
        otherPeriodIndex = periods[1].index;

        /*
         * A fixed sequence's topic dates must fall inside the year it declares, so every member
         * fixture is dated from its own year rather than from literals or from today.
         *
         * Both years need a start date, because the member cases build sequences in both: one for
         * the year under test and one for the year after it, which is how "a sequence from another
         * academic year is refused" is exercised.
         */
        const datedPeriods = periods.filter((period: { startDate: string | null }) => period.startDate);

        if (datedPeriods.length < 2) {
            throw new Error(
                'The current academic year and the one after it must both have a start date, or a fixed sequence ' +
                    'cannot be dated inside them. Check static_lwp_period.'
            );
        }

        periodStartByIndex = new Map(
            periods.map((period: { index: number; startDate: string }) => [Number(period.index), period.startDate])
        );

        const [user] = await connection.query(`SELECT id::text AS id FROM lwp_user ORDER BY id LIMIT 1`);

        if (!user) throw new Error('No users in the database; seed the database first');

        userId = user.id;

        // Anything left behind by an interrupted earlier run would take the subject and year this
        // suite needs, and the unique key would then fail the first case rather than the right one.
        await connection.query(`DELETE FROM static_lwp_whole_school_sequence WHERE "subjectId" = ANY($1::bigint[])`, [
            [subjectId, otherSubjectId]
        ]);
    });

    afterAll(async () => {
        /*
         * Scoped to the subjects this suite uses rather than only to the ids it tracked.
         *
         * Tracking alone is not enough: a run that dies between the insert and the push leaves a row
         * behind, and these are global static data, so the leftover then shows up in every admin's
         * list and in the Playwright spec's. Deleting by subject is the same net the beforeAll casts,
         * and makes a crashed run self-healing rather than something to clear by hand.
         *
         * Whole-school sequences go first regardless: a member's link to its sequence is RESTRICT, so
         * the sequences cannot go while any year group still receives one.
         */
        await connection.query(`DELETE FROM static_lwp_whole_school_sequence WHERE "subjectId" = ANY($1::bigint[])`, [
            [subjectId, otherSubjectId]
        ]);

        if (createdSequenceIds.length) {
            await connection.query(`DELETE FROM static_lwp_topic_sequence WHERE id = ANY($1::bigint[])`, [createdSequenceIds]);
        }

        await app?.close();
    });

    it('creates a draft and reads it back with its subject and academic year', async () => {
        const id = await create(subjectId, periodIndex);

        const loaded = await service.getWholeSchoolSequence(id);

        expect(loaded.status).toEqual(WholeSchoolSequenceStatus.DRAFT);
        expect(loaded.subject.id).toEqual(subjectId);
        expect(Number(loaded.period.index)).toEqual(Number(periodIndex));
    });

    it('lists it, and filters by subject, academic year and status', async () => {
        const id = await create(subjectId, periodIndex);

        const ids = async (filter: Parameters<WholeSchoolSequenceService['getWholeSchoolSequences']>[0]): Promise<string[]> =>
            (await service.getWholeSchoolSequences(filter)).map((row) => row.id);

        expect(await ids({ subjectId })).toContain(id);
        expect(await ids({ periodIndex })).toContain(id);
        expect(await ids({ status: WholeSchoolSequenceStatus.DRAFT })).toContain(id);
        // Nothing is published until slice 3 (LEA-6696), so this filter is the one that must not
        // match, and it proves the status filter is applied rather than ignored.
        expect(await ids({ status: WholeSchoolSequenceStatus.PUBLISHED })).not.toContain(id);
        expect(await ids({ subjectId: otherSubjectId })).not.toContain(id);
    });

    it('refuses a second one for the same subject and academic year, by message rather than by constraint', async () => {
        await create(subjectId, periodIndex);

        /*
         * The message matters as much as the refusal. If the service check were removed the insert
         * would still fail, but on "duplicate key value violates unique constraint", which is not
         * something to put in front of an admin.
         */
        await expect(service.createWholeSchoolSequence({ subjectId, periodIndex }, userId)).rejects.toThrow(
            'There is already a whole-school sequence for that subject and academic year'
        );
    });

    it('allows the same subject in a different academic year', async () => {
        await create(subjectId, periodIndex);

        const second = await create(subjectId, otherPeriodIndex);

        expect(Number((await service.getWholeSchoolSequence(second)).period.index)).toEqual(Number(otherPeriodIndex));
    });

    it('allows a different subject in the same academic year', async () => {
        await create(subjectId, periodIndex);

        const second = await create(otherSubjectId, periodIndex);

        expect((await service.getWholeSchoolSequence(second)).subject.id).toEqual(otherSubjectId);
    });

    it('moves one to another academic year', async () => {
        const id = await create(subjectId, periodIndex);

        await service.updateWholeSchoolSequence({ id, subjectId, periodIndex: otherPeriodIndex }, userId);

        expect(Number((await service.getWholeSchoolSequence(id)).period.index)).toEqual(Number(otherPeriodIndex));
    });

    it('lets a row be saved onto its own subject and year without refusing itself', async () => {
        const id = await create(subjectId, periodIndex);

        await expect(service.updateWholeSchoolSequence({ id, subjectId, periodIndex }, userId)).resolves.toEqual(
            expect.objectContaining({ id })
        );
    });

    it('refuses a move onto a subject and year another one already holds', async () => {
        await create(subjectId, periodIndex);
        const second = await create(subjectId, otherPeriodIndex);

        await expect(service.updateWholeSchoolSequence({ id: second, subjectId, periodIndex }, userId)).rejects.toThrow(
            'There is already a whole-school sequence for that subject and academic year'
        );
    });

    it('deletes one, and says so when there was nothing to delete', async () => {
        const id = await create(subjectId, periodIndex);

        expect(await service.deleteWholeSchoolSequence(id)).toEqual(expect.objectContaining({ status: 'ok' }));

        await expect(service.getWholeSchoolSequence(id)).rejects.toThrow('Whole-school sequence does not exist');
        expect(await service.deleteWholeSchoolSequence(id)).toEqual(expect.objectContaining({ status: 'fail' }));
    });

    it('frees the subject and year again once one is deleted', async () => {
        const id = await create(subjectId, periodIndex);

        await service.deleteWholeSchoolSequence(id);

        await expect(create(subjectId, periodIndex)).resolves.toEqual(expect.any(String));
    });

    describe('members', () => {
        it('saves one sequence per year group and reads them back', async () => {
            const id = await create(subjectId, periodIndex);
            const first = await createSequence(firstYearGroup);
            const second = await createSequence(secondYearGroup);

            await service.updateWholeSchoolSequence(
                { id, subjectId, periodIndex, members: [{ sequenceId: first }, { sequenceId: second }] },
                userId
            );

            const loaded = await service.getWholeSchoolSequence(id);

            expect(loaded.members).toHaveLength(2);
            expect(loaded.members.map((member) => member.sequence.id).sort()).toEqual([first, second].sort());

            /*
             * The year group is denormalised onto the row and never taken from the caller, which sent
             * only sequence ids. This is what proves the service read it off the sequence: against a
             * real database, a wrong value here would be a row whose own columns contradict each
             * other and whose unique key is therefore enforcing a lie.
             */
            const byYearGroup = new Map(loaded.members.map((member) => [member.yearGroup.id, member.sequence.id]));

            expect(byYearGroup.get(firstYearGroup.yearGroupId)).toEqual(first);
            expect(byYearGroup.get(secondYearGroup.yearGroupId)).toEqual(second);
        });

        it('replaces the list wholesale rather than adding to it', async () => {
            const id = await create(subjectId, periodIndex);
            const first = await createSequence(firstYearGroup);
            const second = await createSequence(secondYearGroup);

            await service.updateWholeSchoolSequence(
                { id, subjectId, periodIndex, members: [{ sequenceId: first }, { sequenceId: second }] },
                userId
            );
            await service.updateWholeSchoolSequence({ id, subjectId, periodIndex, members: [{ sequenceId: second }] }, userId);

            const loaded = await service.getWholeSchoolSequence(id);

            expect(loaded.members).toHaveLength(1);
            expect(loaded.members[0].sequence.id).toEqual(second);
        });

        it('saves with no members at all, because a partial one is valid', async () => {
            const id = await create(subjectId, periodIndex);
            const first = await createSequence(firstYearGroup);

            await service.updateWholeSchoolSequence({ id, subjectId, periodIndex, members: [{ sequenceId: first }] }, userId);
            await service.updateWholeSchoolSequence({ id, subjectId, periodIndex, members: [] }, userId);

            expect((await service.getWholeSchoolSequence(id)).members).toHaveLength(0);
        });

        it('leaves the members alone when the field is omitted', async () => {
            const id = await create(subjectId, periodIndex);
            const first = await createSequence(firstYearGroup);

            await service.updateWholeSchoolSequence({ id, subjectId, periodIndex, members: [{ sequenceId: first }] }, userId);
            // Only the header is mentioned, so the members must survive untouched.
            await service.updateWholeSchoolSequence({ id, subjectId, periodIndex }, userId);

            expect((await service.getWholeSchoolSequence(id)).members).toHaveLength(1);
        });

        it('refuses two sequences for the same year group', async () => {
            const id = await create(subjectId, periodIndex);
            const first = await createSequence(firstYearGroup);
            const alsoFirst = await createSequence(firstYearGroup);

            await expect(
                service.updateWholeSchoolSequence(
                    { id, subjectId, periodIndex, members: [{ sequenceId: first }, { sequenceId: alsoFirst }] },
                    userId
                )
            ).rejects.toThrow('can only have one topic sequence in a whole-school sequence');

            expect((await service.getWholeSchoolSequence(id)).members).toHaveLength(0);
        });

        it('refuses an interval sequence', async () => {
            const id = await create(subjectId, periodIndex);
            const interval = await createSequence(firstYearGroup, { timingMode: SequenceTimingMode.INTERVAL });

            await expect(
                service.updateWholeSchoolSequence({ id, subjectId, periodIndex, members: [{ sequenceId: interval }] }, userId)
            ).rejects.toThrow('must be a fixed sequence for this subject and academic year');
        });

        it('refuses a sequence from another academic year', async () => {
            const id = await create(subjectId, periodIndex);
            const nextYear = await createSequence(firstYearGroup, { period: otherPeriodIndex });

            /*
             * The rule that stops last year's Year 3 sequence being pulled into this year's
             * whole-school sequence. It is the one an admin is most likely to hit by accident, by
             * changing the academic year on a form they had already filled in.
             */
            await expect(
                service.updateWholeSchoolSequence({ id, subjectId, periodIndex, members: [{ sequenceId: nextYear }] }, userId)
            ).rejects.toThrow('must be a fixed sequence for this subject and academic year');
        });

        it('accepts that same sequence once the whole-school sequence moves to its year', async () => {
            const id = await create(subjectId, periodIndex);
            const nextYear = await createSequence(firstYearGroup, { period: otherPeriodIndex });

            // Members are checked against the year being saved, not the stored one, so moving the
            // parent and setting the member in one call has to succeed.
            await service.updateWholeSchoolSequence(
                { id, subjectId, periodIndex: otherPeriodIndex, members: [{ sequenceId: nextYear }] },
                userId
            );

            expect((await service.getWholeSchoolSequence(id)).members).toHaveLength(1);
        });

        it('offers exactly the sequences that may be saved, with their own date spans', async () => {
            const first = await createSequence(firstYearGroup);
            const interval = await createSequence(firstYearGroup, { timingMode: SequenceTimingMode.INTERVAL });
            const nextYear = await createSequence(secondYearGroup, { period: otherPeriodIndex });

            const candidates = await service.getCandidateSequencesForWholeSchool(subjectId, periodIndex);
            const ids = candidates.map((candidate) => candidate.id);

            expect(ids).toContain(first);
            expect(ids).not.toContain(interval);
            expect(ids).not.toContain(nextYear);

            // The span is the sequence's own, read off its topics: a whole-school sequence holds no
            // dates and this column never invites an edit.
            expect(candidates.find((candidate) => candidate.id === first)?.startDate).toBeTruthy();
        });

        it('deletes its members with it', async () => {
            const id = await create(subjectId, periodIndex);
            const first = await createSequence(firstYearGroup);

            await service.updateWholeSchoolSequence({ id, subjectId, periodIndex, members: [{ sequenceId: first }] }, userId);
            await service.deleteWholeSchoolSequence(id);

            const remaining = await connection.query(
                `SELECT id FROM static_lwp_whole_school_sequence_member WHERE "wholeSchoolSequenceId" = $1::bigint`,
                [id]
            );

            expect(remaining).toHaveLength(0);
        });

        /*
         * RESTRICT rather than SET NULL, which differs from a class assignment's link to its
         * sequence. That one survives because the class already holds the topics it was given; a
         * member holds nothing, so a null would silently shrink what every school is offered.
         */
        it('refuses to let a sequence be deleted while a year group still receives it', async () => {
            const id = await create(subjectId, periodIndex);
            const first = await createSequence(firstYearGroup);

            await service.updateWholeSchoolSequence({ id, subjectId, periodIndex, members: [{ sequenceId: first }] }, userId);

            await expect(sequenceService.deleteSequence(first)).rejects.toThrow();
        });
    });

    describe('publishing', () => {
        it('publishes one that has a member, and the status is what changes', async () => {
            const id = await create(subjectId, periodIndex);
            const first = await createSequence(firstYearGroup);

            await service.updateWholeSchoolSequence({ id, subjectId, periodIndex, members: [{ sequenceId: first }] }, userId);

            const result = await service.publishWholeSchoolSequence(id, userId);

            expect(result.wholeSchoolSequence.status).toEqual(WholeSchoolSequenceStatus.PUBLISHED);
            // Read back separately rather than trusting the returned object, since the status is the
            // only thing a school will ever key off.
            expect((await service.getWholeSchoolSequence(id)).status).toEqual(WholeSchoolSequenceStatus.PUBLISHED);
        });

        it('names the year groups it does not cover, and publishes anyway', async () => {
            const id = await create(subjectId, periodIndex);
            const first = await createSequence(firstYearGroup);

            await service.updateWholeSchoolSequence({ id, subjectId, periodIndex, members: [{ sequenceId: first }] }, userId);

            const result = await service.publishWholeSchoolSequence(id, userId);
            const uncovered = result.uncoveredYearGroups.map((yearGroup) => yearGroup.id);

            /*
             * The second year group has a topic and could have had a sequence, and deliberately does
             * not. That is the case the warning exists for, and it must not stop the publication.
             */
            expect(uncovered).toContain(secondYearGroup.yearGroupId);
            expect(uncovered).not.toContain(firstYearGroup.yearGroupId);
            expect(result.wholeSchoolSequence.status).toEqual(WholeSchoolSequenceStatus.PUBLISHED);
        });

        it('warns about nothing once every year group is covered', async () => {
            const id = await create(subjectId, periodIndex);
            const first = await createSequence(firstYearGroup);
            const second = await createSequence(secondYearGroup);

            await service.updateWholeSchoolSequence(
                { id, subjectId, periodIndex, members: [{ sequenceId: first }, { sequenceId: second }] },
                userId
            );

            const { uncoveredYearGroups } = await service.publishWholeSchoolSequence(id, userId);

            // Only the two year groups this fixture covers can be asserted as absent: the database
            // may carry others that no sequence exists for, and those are genuine gaps.
            expect(uncoveredYearGroups.map((yearGroup) => yearGroup.id)).not.toContain(firstYearGroup.yearGroupId);
            expect(uncoveredYearGroups.map((yearGroup) => yearGroup.id)).not.toContain(secondYearGroup.yearGroupId);
        });

        it('never reports Unknown as a gap', async () => {
            const id = await create(subjectId, periodIndex);
            const first = await createSequence(firstYearGroup);

            await service.updateWholeSchoolSequence({ id, subjectId, periodIndex, members: [{ sequenceId: first }] }, userId);

            const { uncoveredYearGroups } = await service.publishWholeSchoolSequence(id, userId);

            expect(uncoveredYearGroups.map((yearGroup) => yearGroup.year)).not.toContain('Unknown');
        });

        it('refuses to publish one with no members, and leaves it a draft', async () => {
            const id = await create(subjectId, periodIndex);

            await expect(service.publishWholeSchoolSequence(id, userId)).rejects.toThrow(
                'Give at least one year group a topic sequence before publishing'
            );

            expect((await service.getWholeSchoolSequence(id)).status).toEqual(WholeSchoolSequenceStatus.DRAFT);
        });

        /*
         * The reason publishing re-checks the members rather than trusting them. They were legal when
         * saved, but sequences stay editable, so a member can become illegal without the whole-school
         * sequence being touched. This is the last point it can be caught before schools see it.
         */
        it('refuses when a member has been moved to another academic year since it was saved', async () => {
            const id = await create(subjectId, periodIndex);
            const first = await createSequence(firstYearGroup);

            await service.updateWholeSchoolSequence({ id, subjectId, periodIndex, members: [{ sequenceId: first }] }, userId);

            // The sequence is moved out from under the whole-school sequence, exactly as an admin
            // editing it on the class sequences tab would do.
            await connection.query(`UPDATE static_lwp_topic_sequence SET "periodIndex" = $1 WHERE id = $2::bigint`, [
                otherPeriodIndex,
                first
            ]);

            await expect(service.publishWholeSchoolSequence(id, userId)).rejects.toThrow('can no longer be used here');

            expect((await service.getWholeSchoolSequence(id)).status).toEqual(WholeSchoolSequenceStatus.DRAFT);
        });

        it('can be published again, which is how the checks are re-run after an edit', async () => {
            const id = await create(subjectId, periodIndex);
            const first = await createSequence(firstYearGroup);

            await service.updateWholeSchoolSequence({ id, subjectId, periodIndex, members: [{ sequenceId: first }] }, userId);
            await service.publishWholeSchoolSequence(id, userId);

            await expect(service.publishWholeSchoolSequence(id, userId)).resolves.toEqual(
                expect.objectContaining({ uncoveredYearGroups: expect.any(Array) })
            );
        });

        it('is found by the published filter once it is published', async () => {
            const id = await create(subjectId, periodIndex);
            const first = await createSequence(firstYearGroup);

            await service.updateWholeSchoolSequence({ id, subjectId, periodIndex, members: [{ sequenceId: first }] }, userId);
            await service.publishWholeSchoolSequence(id, userId);

            const published = await service.getWholeSchoolSequences({ status: WholeSchoolSequenceStatus.PUBLISHED });
            const drafts = await service.getWholeSchoolSequences({ status: WholeSchoolSequenceStatus.DRAFT });

            // Slice 4 finds a school's offer through exactly this filter, so it has to move.
            expect(published.map((row) => row.id)).toContain(id);
            expect(drafts.map((row) => row.id)).not.toContain(id);
        });
    });

    it('refuses an academic year that does not exist', async () => {
        // Far beyond anything seeded, so the foreign key has nothing to point at.
        await expect(service.createWholeSchoolSequence({ subjectId, periodIndex: 99999 }, userId)).rejects.toThrow(
            'That academic year does not exist'
        );
    });

    // Each case creates its own rows, so they must not survive into the next one.
    /*
     * Each case creates its own rows, so they must not survive into the next one.
     *
     * Order matters: the whole-school sequences go first, because a member's link to its sequence is
     * RESTRICT and the sequences cannot be deleted while any year group still receives them. Members
     * themselves need no line of their own; they cascade with their parent.
     */
    afterEach(async () => {
        if (createdIds.length) {
            await connection.query(`DELETE FROM static_lwp_whole_school_sequence WHERE id = ANY($1::bigint[])`, [createdIds]);
            createdIds.length = 0;
        }

        if (createdSequenceIds.length) {
            await connection.query(`DELETE FROM static_lwp_topic_sequence WHERE id = ANY($1::bigint[])`, [createdSequenceIds]);
            createdSequenceIds.length = 0;
        }
    });
});
