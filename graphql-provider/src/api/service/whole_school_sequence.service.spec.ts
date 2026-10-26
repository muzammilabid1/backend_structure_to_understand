import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SequenceTimingMode, WholeSchoolSequenceStatus } from 'lwp-shared/enums';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Connection } from 'typeorm';

import { StaticLwpPeriod } from '../entities/static_period';
import { StaticLwpTopicSequence } from '../entities/static_topic_sequence';
import { StaticLwpWholeSchoolSequence } from '../entities/static_whole_school_sequence';
import { StaticLwpWholeSchoolSequenceMember } from '../entities/static_whole_school_sequence_member';
import { LwpWholeSchoolSequenceAssignment } from '../entities/whole_school_sequence_assignment';
import { StaticLwpYearGroup } from '../entities/year_group';
import { WholeSchoolSequenceService } from './whole_school_sequence.service';

/** A query builder mock where every chained call returns itself and the terminals are stubs. */
const chainableQueryBuilder = (): Record<string, jest.Mock> => {
    const builder = {
        innerJoin: jest.fn(),
        leftJoin: jest.fn(),
        leftJoinAndSelect: jest.fn(),
        where: jest.fn(),
        andWhere: jest.fn(),
        select: jest.fn(),
        addSelect: jest.fn(),
        groupBy: jest.fn(),
        orderBy: jest.fn(),
        addOrderBy: jest.fn(),
        getOne: jest.fn(),
        getMany: jest.fn(),
        getRawMany: jest.fn().mockResolvedValue([])
    };

    builder.innerJoin.mockReturnValue(builder);
    builder.leftJoin.mockReturnValue(builder);
    builder.leftJoinAndSelect.mockReturnValue(builder);
    builder.where.mockReturnValue(builder);
    builder.andWhere.mockReturnValue(builder);
    builder.select.mockReturnValue(builder);
    builder.addSelect.mockReturnValue(builder);
    builder.groupBy.mockReturnValue(builder);
    builder.orderBy.mockReturnValue(builder);
    builder.addOrderBy.mockReturnValue(builder);

    return builder;
};

/** A fixed Reception sequence for the subject and year the tests use, so it is always a candidate. */
const receptionCandidate = {
    id: '100',
    name: 'Money Skills Reception',
    yearGroupId: '0',
    yearGroupName: 'Reception',
    timingMode: SequenceTimingMode.FIXED,
    subjectId: '4',
    periodIndex: 12
};

/** A second candidate for the same year group, so "one sequence per year group" can be exercised. */
const secondReceptionCandidate = { ...receptionCandidate, id: '101', name: 'Money Skills Reception Spring' };

const yearOneCandidate = { ...receptionCandidate, id: '200', name: 'Money Skills Year 1', yearGroupId: '1', yearGroupName: 'Year 1' };

describe('WholeSchoolSequenceService', () => {
    let service: WholeSchoolSequenceService;
    let queryBuilder: Record<string, jest.Mock>;
    let sequenceQueryBuilder: Record<string, jest.Mock>;
    /** Whether any school has scheduled one. Nothing has, unless a lock test says otherwise. */
    let wholeSchoolAssignmentQueryBuilder: Record<string, jest.Mock>;
    let wholeSchoolSequenceRepository: Record<string, jest.Mock>;
    let sequenceRepository: Record<string, jest.Mock>;
    let memberRepository: Record<string, jest.Mock>;
    let periodRepository: Record<string, jest.Mock>;
    let yearGroupRepository: Record<string, jest.Mock>;
    let manager: Record<string, jest.Mock>;

    beforeEach(async () => {
        queryBuilder = chainableQueryBuilder();
        sequenceQueryBuilder = chainableQueryBuilder();
        wholeSchoolAssignmentQueryBuilder = chainableQueryBuilder();

        wholeSchoolSequenceRepository = {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
            findOne: jest.fn().mockResolvedValue(undefined),
            create: jest.fn().mockImplementation((values) => values),
            save: jest.fn().mockResolvedValue({ id: '7' }),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            delete: jest.fn().mockResolvedValue({ affected: 1 })
        };

        // Nothing is a candidate unless a test says so, so a member list is refused by default and a
        // case that means to accept one has to say which sequences exist.
        sequenceRepository = { createQueryBuilder: jest.fn().mockReturnValue(sequenceQueryBuilder) };
        memberRepository = {};

        manager = {
            create: jest.fn().mockImplementation((_entity, values) => values),
            save: jest.fn().mockImplementation((value) => (Array.isArray(value) ? value : { id: '7', ...value })),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            delete: jest.fn().mockResolvedValue({ affected: 1 })
        };

        // The academic year exists unless a test says otherwise.
        periodRepository = { findOne: jest.fn().mockResolvedValue({ index: 12 }) };
        yearGroupRepository = { find: jest.fn().mockResolvedValue([]) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WholeSchoolSequenceService,
                { provide: getRepositoryToken(StaticLwpWholeSchoolSequence), useValue: wholeSchoolSequenceRepository },
                { provide: getRepositoryToken(StaticLwpWholeSchoolSequenceMember), useValue: memberRepository },
                { provide: getRepositoryToken(StaticLwpTopicSequence), useValue: sequenceRepository },
                { provide: getRepositoryToken(StaticLwpPeriod), useValue: periodRepository },
                { provide: getRepositoryToken(StaticLwpYearGroup), useValue: yearGroupRepository },
                /*
                 * Read only, and only by the lock: whether any school has scheduled this, which is
                 * what makes an admin's form read-only. No test in this file touches it, but Nest
                 * resolves a provider's whole constructor before handing it back, so an unlisted
                 * dependency fails every test in the file rather than the one that needed it.
                 */
                {
                    provide: getRepositoryToken(LwpWholeSchoolSequenceAssignment),
                    useValue: { createQueryBuilder: jest.fn().mockReturnValue(wholeSchoolAssignmentQueryBuilder) }
                },
                { provide: Connection, useValue: { transaction: jest.fn().mockImplementation((work) => work(manager)) } },
                { provide: ShallowUserService, useValue: { newShallowUser: jest.fn().mockReturnValue({ id: '1' }) } }
            ]
        }).compile();

        service = module.get<WholeSchoolSequenceService>(WholeSchoolSequenceService);
    });

    /** Makes these sequences the only eligible members for the subject and year under test. */
    const givenCandidates = (...candidates: (typeof receptionCandidate)[]) => sequenceQueryBuilder.getRawMany.mockResolvedValue(candidates);

    describe('createWholeSchoolSequence', () => {
        it('saves a draft for the subject and academic year asked for', async () => {
            queryBuilder.getOne.mockResolvedValue({ id: '7' });

            await service.createWholeSchoolSequence({ subjectId: '4', periodIndex: 12 }, '1');

            expect(manager.create).toHaveBeenCalledWith(
                StaticLwpWholeSchoolSequence,
                expect.objectContaining({
                    subject: { id: '4' },
                    period: { index: 12 },
                    // Never PUBLISHED on creation, whatever a caller might want: publishing runs
                    // checks that saving does not, and is its own mutation (LEA-6696).
                    status: WholeSchoolSequenceStatus.DRAFT
                })
            );
            expect(manager.save).toHaveBeenCalledTimes(1);
        });

        /*
         * The unique index guarantees this, but an admin should read a sentence rather than a
         * constraint violation, so the check is made first and this is what proves it runs.
         */
        it('refuses a second one for the same subject and academic year', async () => {
            wholeSchoolSequenceRepository.findOne.mockResolvedValue({ id: '3' });

            await expect(service.createWholeSchoolSequence({ subjectId: '4', periodIndex: 12 }, '1')).rejects.toThrow(HttpException);

            expect(manager.save).not.toHaveBeenCalled();
        });

        it('allows the same subject in a different academic year', async () => {
            // The duplicate lookup is keyed on the pair, so a different year finds nothing.
            wholeSchoolSequenceRepository.findOne.mockResolvedValue(undefined);
            queryBuilder.getOne.mockResolvedValue({ id: '7' });

            await service.createWholeSchoolSequence({ subjectId: '4', periodIndex: 13 }, '1');

            expect(wholeSchoolSequenceRepository.findOne).toHaveBeenCalledWith(
                expect.objectContaining({ where: expect.objectContaining({ subject: { id: '4' }, period: { index: 13 } }) })
            );
            expect(manager.save).toHaveBeenCalledTimes(1);
        });

        it('refuses an academic year that does not exist', async () => {
            periodRepository.findOne.mockResolvedValue(undefined);

            await expect(service.createWholeSchoolSequence({ subjectId: '4', periodIndex: 99 }, '1')).rejects.toThrow(HttpException);

            expect(manager.save).not.toHaveBeenCalled();
        });
    });

    describe('updateWholeSchoolSequence', () => {
        beforeEach(() => queryBuilder.getOne.mockResolvedValue({ id: '7' }));

        it('moves it to another subject or year', async () => {
            await service.updateWholeSchoolSequence({ id: '7', subjectId: '5', periodIndex: 13 }, '1');

            expect(manager.update).toHaveBeenCalledWith(
                StaticLwpWholeSchoolSequence,
                '7',
                expect.objectContaining({ subject: { id: '5' }, period: { index: 13 } })
            );
        });

        /*
         * Saving a row onto its own subject and year is an ordinary no-change save, so the duplicate
         * check has to exclude the row being edited or every edit would refuse itself.
         */
        it('does not treat the row being edited as its own duplicate', async () => {
            await service.updateWholeSchoolSequence({ id: '7', subjectId: '4', periodIndex: 12 }, '1');

            expect(wholeSchoolSequenceRepository.findOne).toHaveBeenCalledWith(
                expect.objectContaining({ where: expect.objectContaining({ id: expect.anything() }) })
            );
            expect(manager.update).toHaveBeenCalledTimes(1);
        });

        it('refuses a move onto a subject and year another one already holds', async () => {
            wholeSchoolSequenceRepository.findOne.mockResolvedValue({ id: '3' });

            await expect(service.updateWholeSchoolSequence({ id: '7', subjectId: '4', periodIndex: 12 }, '1')).rejects.toThrow(
                HttpException
            );

            expect(manager.update).not.toHaveBeenCalled();
        });

        it('says so when it has been deleted underneath the form', async () => {
            queryBuilder.getOne.mockResolvedValue(undefined);

            await expect(service.updateWholeSchoolSequence({ id: '7', subjectId: '4', periodIndex: 12 }, '1')).rejects.toThrow(
                HttpException
            );

            expect(manager.update).not.toHaveBeenCalled();
        });
    });

    describe('getWholeSchoolSequences', () => {
        beforeEach(() => queryBuilder.getMany.mockResolvedValue([]));

        it('applies each filter it is given', async () => {
            await service.getWholeSchoolSequences({ subjectId: '4', periodIndex: 12, status: WholeSchoolSequenceStatus.PUBLISHED });

            expect(queryBuilder.andWhere).toHaveBeenCalledWith('subject.id = :subjectId', { subjectId: '4' });
            expect(queryBuilder.andWhere).toHaveBeenCalledWith('period.index = :periodIndex', { periodIndex: 12 });
            expect(queryBuilder.andWhere).toHaveBeenCalledWith('wholeSchoolSequence.status = :status', {
                status: WholeSchoolSequenceStatus.PUBLISHED
            });
        });

        it('filters on nothing when the filter is empty', async () => {
            await service.getWholeSchoolSequences({});

            expect(queryBuilder.andWhere).not.toHaveBeenCalled();
        });

        /*
         * Period indexes are numbers and the first academic year is index 0, which is falsy. A truthy
         * test would drop that filter silently and return every year instead of the one asked for.
         */
        it('filters on academic year zero rather than treating it as absent', async () => {
            await service.getWholeSchoolSequences({ periodIndex: 0 });

            expect(queryBuilder.andWhere).toHaveBeenCalledWith('period.index = :periodIndex', { periodIndex: 0 });
        });
    });

    describe('members', () => {
        beforeEach(() => queryBuilder.getOne.mockResolvedValue({ id: '7' }));

        const save = (sequenceIds: string[]) =>
            service.updateWholeSchoolSequence(
                { id: '7', subjectId: '4', periodIndex: 12, members: sequenceIds.map((sequenceId) => ({ sequenceId })) },
                '1'
            );

        /*
         * The four validation rules. Three of them are the candidate query rather than separate
         * checks: a sequence that is not FIXED, or belongs to another subject, or to another academic
         * year, is simply not returned, so it cannot be resolved into a member. These first two cases
         * are what pin that, one on the query's own conditions and one on the refusal.
         */
        it('asks only for fixed sequences in this subject and year, and never the Unknown year group', async () => {
            givenCandidates(receptionCandidate);

            await save(['100']);

            expect(sequenceQueryBuilder.where).toHaveBeenCalledWith('subject.id = :subjectId', { subjectId: '4' });
            expect(sequenceQueryBuilder.andWhere).toHaveBeenCalledWith('sequence.periodIndex = :periodIndex', { periodIndex: 12 });
            expect(sequenceQueryBuilder.andWhere).toHaveBeenCalledWith('sequence.timingMode = :timingMode', {
                timingMode: SequenceTimingMode.FIXED
            });
            expect(sequenceQueryBuilder.andWhere).toHaveBeenCalledWith('yearGroup.year != :unknown', { unknown: 'Unknown' });
        });

        it('refuses a sequence the candidate query does not return', async () => {
            givenCandidates(receptionCandidate);

            // '999' stands for every ineligible case at once: it does not exist, or is an interval
            // sequence, or belongs to another subject or year. They are the same fact from the
            // admin's side, which is that the form offered something it should not have.
            await expect(save(['999'])).rejects.toThrow(HttpException);

            expect(manager.save).not.toHaveBeenCalled();
        });

        it('refuses two sequences for the same year group, and names it', async () => {
            givenCandidates(receptionCandidate, secondReceptionCandidate);

            await expect(save(['100', '101'])).rejects.toThrow('Reception can only have one topic sequence in a whole-school sequence');

            expect(manager.save).not.toHaveBeenCalled();
        });

        it('refuses the same sequence twice', async () => {
            givenCandidates(receptionCandidate);

            await expect(save(['100', '100'])).rejects.toThrow('The same topic sequence cannot be used for two year groups');
        });

        /*
         * The year group is denormalised onto the row, and this is the only place it is decided.
         * Reading it off the candidate rather than from the caller is what stops a row whose own two
         * columns contradict each other, which the unique key would then be enforcing a lie about.
         */
        it('takes each year group from the sequence rather than from the caller', async () => {
            givenCandidates(receptionCandidate, yearOneCandidate);

            await save(['100', '200']);

            expect(manager.create).toHaveBeenCalledWith(
                StaticLwpWholeSchoolSequenceMember,
                expect.objectContaining({ sequence: { id: '100' }, yearGroup: { id: '0' } })
            );
            expect(manager.create).toHaveBeenCalledWith(
                StaticLwpWholeSchoolSequenceMember,
                expect.objectContaining({ sequence: { id: '200' }, yearGroup: { id: '1' } })
            );
        });

        it('replaces the whole list rather than diffing it', async () => {
            givenCandidates(receptionCandidate);

            await save(['100']);

            expect(manager.delete).toHaveBeenCalledWith(StaticLwpWholeSchoolSequenceMember, {
                wholeSchoolSequence: { id: '7' }
            });
        });

        /*
         * An empty list is a caller clearing every member, which is a valid state. Omitting the field
         * says nothing about members and must leave the stored ones alone; confusing the two would
         * wipe a whole-school sequence's content on any edit that only moved its year.
         */
        it('clears every member when sent an empty list', async () => {
            await save([]);

            expect(manager.delete).toHaveBeenCalledTimes(1);
            expect(manager.save).not.toHaveBeenCalled();
        });

        it('leaves the stored members alone when the field is omitted', async () => {
            await service.updateWholeSchoolSequence({ id: '7', subjectId: '4', periodIndex: 12 }, '1');

            expect(manager.delete).not.toHaveBeenCalled();
        });

        /*
         * Validated against the year being saved, not the stored one. An admin moving a whole-school
         * sequence to another year has to bring members that belong to it, and checking against the
         * old year would let the row and its members disagree the moment the write lands.
         */
        it('checks members against the academic year being saved', async () => {
            givenCandidates(receptionCandidate);

            await service.updateWholeSchoolSequence({ id: '7', subjectId: '4', periodIndex: 13, members: [{ sequenceId: '100' }] }, '1');

            expect(sequenceQueryBuilder.andWhere).toHaveBeenCalledWith('sequence.periodIndex = :periodIndex', { periodIndex: 13 });
        });

        it('accepts members on creation, so a filled-in create form is not silently dropped', async () => {
            givenCandidates(receptionCandidate);

            await service.createWholeSchoolSequence({ subjectId: '4', periodIndex: 12, members: [{ sequenceId: '100' }] }, '1');

            expect(manager.create).toHaveBeenCalledWith(
                StaticLwpWholeSchoolSequenceMember,
                expect.objectContaining({ sequence: { id: '100' } })
            );
        });

        it('refuses a bad member list before creating the parent it would hang off', async () => {
            givenCandidates(receptionCandidate);

            await expect(
                service.createWholeSchoolSequence({ subjectId: '4', periodIndex: 12, members: [{ sequenceId: '999' }] }, '1')
            ).rejects.toThrow(HttpException);

            expect(manager.save).not.toHaveBeenCalled();
        });
    });

    describe('getCandidateSequencesForWholeSchool', () => {
        it('returns nothing, and asks for no date spans, when there are no candidates', async () => {
            const spanQueryCallCount = sequenceRepository.createQueryBuilder.mock.calls.length;

            expect(await service.getCandidateSequencesForWholeSchool('4', 12)).toEqual([]);
            // One call for the candidates, and no second one for their spans.
            expect(sequenceRepository.createQueryBuilder.mock.calls.length).toEqual(spanQueryCallCount + 1);
        });

        it('carries each sequence date span, read off its own topics', async () => {
            sequenceQueryBuilder.getRawMany
                .mockResolvedValueOnce([receptionCandidate])
                .mockResolvedValueOnce([{ sequenceId: '100', startDate: new Date('2026-09-07'), endDate: new Date('2026-12-14') }]);

            const [candidate] = await service.getCandidateSequencesForWholeSchool('4', 12);

            expect(candidate).toEqual(
                expect.objectContaining({ id: '100', yearGroupId: '0', yearGroupName: 'Reception', startDate: expect.any(Date) })
            );
        });

        /*
         * A sequence with no topics yet has no span at all. It is still offered: an empty sequence is
         * a content problem for publishing to catch, not a reason to hide it from the admin choosing.
         */
        it('offers a sequence that has no topics yet, with no dates', async () => {
            sequenceQueryBuilder.getRawMany.mockResolvedValueOnce([receptionCandidate]).mockResolvedValueOnce([]);

            const [candidate] = await service.getCandidateSequencesForWholeSchool('4', 12);

            expect(candidate).toEqual(expect.objectContaining({ id: '100', startDate: null, endDate: null }));
        });
    });

    describe('publishWholeSchoolSequence', () => {
        /** A stored member, as `getWholeSchoolSequence` returns it: relations loaded, not ids. */
        const storedMember = (sequence: typeof receptionCandidate) => ({
            id: '1',
            sequence: { id: sequence.id, name: sequence.name },
            yearGroup: { id: sequence.yearGroupId, year: sequence.yearGroupName }
        });

        /** Every year group the form would render, so "uncovered" has something to be measured against. */
        const givenYearGroups = (...yearGroups: { id: string; year: string }[]) => yearGroupRepository.find.mockResolvedValue(yearGroups);

        beforeEach(() => givenYearGroups({ id: '0', year: 'Reception' }, { id: '1', year: 'Year 1' }, { id: '99', year: 'Unknown' }));

        it('publishes one that covers every year group, with nothing to warn about', async () => {
            queryBuilder.getOne.mockResolvedValue({
                id: '7',
                subject: { id: '4' },
                period: { index: 12 },
                members: [storedMember(receptionCandidate), storedMember(yearOneCandidate)]
            });
            givenCandidates(receptionCandidate, yearOneCandidate);

            const result = await service.publishWholeSchoolSequence('7', '1');

            expect(wholeSchoolSequenceRepository.update).toHaveBeenCalledWith(
                '7',
                expect.objectContaining({ status: WholeSchoolSequenceStatus.PUBLISHED })
            );
            expect(result.uncoveredYearGroups).toEqual([]);
        });

        /*
         * The whole point of the slice: a partial one publishes. Content for a year group is often
         * not ready, and blocking on that would hold up every other year group. The gaps come back
         * so the admin is told, not so they are stopped.
         */
        it('publishes a partial one and names the uncovered year groups', async () => {
            queryBuilder.getOne.mockResolvedValue({
                id: '7',
                subject: { id: '4' },
                period: { index: 12 },
                members: [storedMember(receptionCandidate)]
            });
            givenCandidates(receptionCandidate, yearOneCandidate);

            const result = await service.publishWholeSchoolSequence('7', '1');

            expect(wholeSchoolSequenceRepository.update).toHaveBeenCalledWith(
                '7',
                expect.objectContaining({ status: WholeSchoolSequenceStatus.PUBLISHED })
            );
            expect(result.uncoveredYearGroups.map((yearGroup) => yearGroup.year)).toEqual(['Year 1']);
        });

        /*
         * `Unknown` is what the Wonde import assigns to a class it could not map. It is offered to
         * nobody, so it cannot be a gap, and reporting it would send an admin looking for content to
         * build for a year group that only exists as an import failure.
         */
        it('never counts Unknown as an uncovered year group', async () => {
            queryBuilder.getOne.mockResolvedValue({
                id: '7',
                subject: { id: '4' },
                period: { index: 12 },
                members: [storedMember(receptionCandidate), storedMember(yearOneCandidate)]
            });
            givenCandidates(receptionCandidate, yearOneCandidate);

            const result = await service.publishWholeSchoolSequence('7', '1');

            expect(result.uncoveredYearGroups.map((yearGroup) => yearGroup.year)).not.toContain('Unknown');
        });

        it('refuses to publish one with no members at all', async () => {
            queryBuilder.getOne.mockResolvedValue({ id: '7', subject: { id: '4' }, period: { index: 12 }, members: [] });

            await expect(service.publishWholeSchoolSequence('7', '1')).rejects.toThrow(
                'Give at least one year group a topic sequence before publishing'
            );

            expect(wholeSchoolSequenceRepository.update).not.toHaveBeenCalled();
        });

        /*
         * The member rules are re-checked rather than trusted. They held when the member was saved,
         * but sequences stay editable: moving one to another academic year leaves a stored member
         * that is no longer legal, and publishing is the last point that can be caught before schools
         * are offered it.
         */
        it('refuses when a stored member is no longer a legal one, and names it', async () => {
            queryBuilder.getOne.mockResolvedValue({
                id: '7',
                subject: { id: '4' },
                period: { index: 12 },
                members: [storedMember(receptionCandidate)]
            });
            // The member's sequence is not in the candidate list any more, which is what happens when
            // its year, subject or timing mode has been changed underneath the whole-school sequence.
            givenCandidates(yearOneCandidate);

            await expect(service.publishWholeSchoolSequence('7', '1')).rejects.toThrow('Money Skills Reception can no longer be used here');

            expect(wholeSchoolSequenceRepository.update).not.toHaveBeenCalled();
        });

        /*
         * Re-publishing is how an admin re-runs the checks after an edit. Refusing it would mean the
         * only way to re-validate was to unpublish something schools may already be using.
         */
        it('allows an already published one to be published again', async () => {
            queryBuilder.getOne.mockResolvedValue({
                id: '7',
                subject: { id: '4' },
                period: { index: 12 },
                status: WholeSchoolSequenceStatus.PUBLISHED,
                members: [storedMember(receptionCandidate)]
            });
            givenCandidates(receptionCandidate);

            await expect(service.publishWholeSchoolSequence('7', '1')).resolves.toEqual(
                expect.objectContaining({ uncoveredYearGroups: expect.any(Array) })
            );
        });
    });

    describe('deleteWholeSchoolSequence', () => {
        it('reports ok when a row went', async () => {
            expect(await service.deleteWholeSchoolSequence('7')).toEqual(expect.objectContaining({ status: 'ok' }));
        });

        it('reports fail when nothing matched, rather than claiming a deletion', async () => {
            wholeSchoolSequenceRepository.delete.mockResolvedValue({ affected: 0 });

            expect(await service.deleteWholeSchoolSequence('7')).toEqual(expect.objectContaining({ status: 'fail' }));
        });
    });
    /**
     * The lock: once any school has scheduled a whole-school sequence, an admin may no longer change
     * its subject, its academic year or its members.
     *
     * Those three are what a school was given. Editing them afterwards would make our record
     * disagree with the topics already sitting in front of children, and there is no name field to
     * leave editable because this object deliberately has none.
     */
    describe('getWholeSchoolAssignmentUsage', () => {
        it('answers for each sequence in the order it was asked', async () => {
            wholeSchoolAssignmentQueryBuilder.getRawMany.mockResolvedValue([{ wholeSchoolSequenceId: '8' }]);

            expect(await service.getWholeSchoolAssignmentUsage(['7', '8', '9'])).toEqual([false, true, false]);
        });

        it('locks one that a school has scheduled', async () => {
            wholeSchoolAssignmentQueryBuilder.getRawMany.mockResolvedValue([{ wholeSchoolSequenceId: '7' }]);

            expect(await service.getWholeSchoolAssignmentUsage(['7'])).toEqual([true]);
        });

        it('leaves one no school has touched editable', async () => {
            wholeSchoolAssignmentQueryBuilder.getRawMany.mockResolvedValue([]);

            expect(await service.getWholeSchoolAssignmentUsage(['7'])).toEqual([false]);
        });

        /*
         * Ids come back from the database as bigints that stringify, and arrive from GraphQL as
         * strings. Comparing them as they are would unlock every sequence and nothing would notice.
         */
        it('matches ids whichever way round the types arrive', async () => {
            wholeSchoolAssignmentQueryBuilder.getRawMany.mockResolvedValue([{ wholeSchoolSequenceId: 7 as unknown as string }]);

            expect(await service.getWholeSchoolAssignmentUsage(['7'])).toEqual([true]);
        });

        /* One query for the page, because the admin list renders every whole-school sequence there is. */
        it('asks once for the whole batch rather than once per row', async () => {
            wholeSchoolAssignmentQueryBuilder.getRawMany.mockResolvedValue([]);

            await service.getWholeSchoolAssignmentUsage(['7', '8', '9']);

            expect(wholeSchoolAssignmentQueryBuilder.getRawMany).toHaveBeenCalledTimes(1);
        });

        it('asks nothing at all for an empty batch', async () => {
            expect(await service.getWholeSchoolAssignmentUsage([])).toEqual([]);
            expect(wholeSchoolAssignmentQueryBuilder.getRawMany).not.toHaveBeenCalled();
        });
    });
    /**
     * The lock as a rule rather than a courtesy: the mutation refuses the edit, not just the form.
     *
     * The form disables these fields, but a disabled field is reachable around, and the acceptance
     * criterion is that an admin cannot make the change.
     */
    describe('editing one a school has already scheduled', () => {
        /** The stored row, as `getWholeSchoolSequence` returns it, plus a school having taken it. */
        const givenScheduled = (): void => {
            queryBuilder.getOne.mockResolvedValue({
                id: '7',
                subject: { id: '4' },
                period: { index: 12 },
                members: [{ id: 'm-1', sequence: { id: '100' }, yearGroup: { id: '0' } }]
            });

            wholeSchoolAssignmentQueryBuilder.getRawMany.mockResolvedValue([{ wholeSchoolSequenceId: '7' }]);
        };

        it('refuses a change of subject', async () => {
            givenScheduled();

            await expect(service.updateWholeSchoolSequence({ id: '7', subjectId: '5', periodIndex: 12 }, '1')).rejects.toThrow(
                /A school has already scheduled this/
            );
        });

        it('refuses a change of academic year', async () => {
            givenScheduled();

            await expect(service.updateWholeSchoolSequence({ id: '7', subjectId: '4', periodIndex: 13 }, '1')).rejects.toThrow(
                /can no longer be changed/
            );
        });

        it('refuses a change to the year groups', async () => {
            givenScheduled();

            await expect(
                service.updateWholeSchoolSequence({ id: '7', subjectId: '4', periodIndex: 12, members: [{ sequenceId: '200' }] }, '1')
            ).rejects.toThrow(/A school has already scheduled this/);
        });

        it('refuses every year group being cleared', async () => {
            givenScheduled();

            await expect(service.updateWholeSchoolSequence({ id: '7', subjectId: '4', periodIndex: 12, members: [] }, '1')).rejects.toThrow(
                /A school has already scheduled this/
            );
        });

        it('writes nothing when it refuses', async () => {
            givenScheduled();

            await expect(service.updateWholeSchoolSequence({ id: '7', subjectId: '5', periodIndex: 12 }, '1')).rejects.toThrow(
                HttpException
            );

            expect(manager.update).not.toHaveBeenCalled();
        });

        /*
         * The form submits every field on every save, so an admin pressing Save on a locked one sends
         * the stored values straight back. Refusing that would make a locked sequence unsaveable, and
         * publishing saves first, so it would also make the publish checks un-rerunnable.
         */
        it('allows a save that changes nothing, so publish can still be re-run', async () => {
            givenScheduled();
            // The resubmitted member still has to resolve, exactly as any other save's would.
            givenCandidates(receptionCandidate);

            await service.updateWholeSchoolSequence({ id: '7', subjectId: '4', periodIndex: 12, members: [{ sequenceId: '100' }] }, '1');

            expect(manager.update).toHaveBeenCalled();
        });

        /* Silence about members is not a change to them. */
        it('allows a save that does not mention members at all', async () => {
            givenScheduled();

            await service.updateWholeSchoolSequence({ id: '7', subjectId: '4', periodIndex: 12 }, '1');

            expect(manager.update).toHaveBeenCalled();
        });

        it('leaves one no school has scheduled fully editable', async () => {
            queryBuilder.getOne.mockResolvedValue({
                id: '7',
                subject: { id: '4' },
                period: { index: 12 },
                members: []
            });
            wholeSchoolAssignmentQueryBuilder.getRawMany.mockResolvedValue([]);

            await service.updateWholeSchoolSequence({ id: '7', subjectId: '5', periodIndex: 13 }, '1');

            expect(manager.update).toHaveBeenCalled();
        });
    });
});
