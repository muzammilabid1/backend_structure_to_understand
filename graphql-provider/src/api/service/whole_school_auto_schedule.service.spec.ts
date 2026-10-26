import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
    SequenceAssignmentStatus,
    SubjectProgrammeType,
    WholeSchoolSequenceStatus,
    WholeSchoolYearGroupSkipReason
} from 'lwp-shared/enums';
import moment from 'moment';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Connection } from 'typeorm';

import { LwpClassSequenceAssignment } from '../entities/class_sequence_assignment';
import { LwpClassTopic } from '../entities/class_topic';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { StaticLwpTopicSequenceItem } from '../entities/static_topic_sequence_item';
import { StaticLwpWholeSchoolSequence } from '../entities/static_whole_school_sequence';
import { LwpUser } from '../entities/user';
import { LwpWholeSchoolSequenceAssignment } from '../entities/whole_school_sequence_assignment';
import { ClassSequenceAssignmentService } from './class_sequence_assignment.service';
import { ClassTopicService } from './class_topic.service';
import { WholeSchoolAutoScheduleService } from './whole_school_auto_schedule.service';

/** A query builder mock where every chained call returns itself and the terminals are stubs. */
const chainableQueryBuilder = (): Record<string, jest.Mock> => {
    const builder = {
        innerJoin: jest.fn(),
        leftJoin: jest.fn(),
        leftJoinAndSelect: jest.fn(),
        where: jest.fn(),
        andWhere: jest.fn(),
        select: jest.fn(),
        orderBy: jest.fn(),
        addOrderBy: jest.fn(),
        getOne: jest.fn().mockResolvedValue(null),
        getMany: jest.fn().mockResolvedValue([])
    };

    builder.innerJoin.mockReturnValue(builder);
    builder.leftJoin.mockReturnValue(builder);
    builder.leftJoinAndSelect.mockReturnValue(builder);
    builder.where.mockReturnValue(builder);
    builder.andWhere.mockReturnValue(builder);
    builder.select.mockReturnValue(builder);
    builder.orderBy.mockReturnValue(builder);
    builder.addOrderBy.mockReturnValue(builder);

    return builder;
};

const SCHOOL_ID = 'school-1';
const SUBJECT_ID = '4';
const CURRENT_PERIOD_INDEX = 12;

/** Entitled to Money Skills: the school holds the flag and the class is a reading-logs registration class. */
const entitledClass = (id: string, yearGroupId: string, yearGroupName: string): Partial<LwpSchoolClass> =>
    ({
        id,
        isFullProgramme: false,
        isReadyTeddyEnabled: false,
        IsReadingLogsEnabled: true,
        isRegistrationClass: true,
        isGroupAcrossClasses: false,
        school: { isMoneySkillsAvailable: true },
        yearGroup: { id: yearGroupId, year: yearGroupName }
    }) as unknown as Partial<LwpSchoolClass>;

/** A member of the whole-school sequence: one year group's class sequence. */
const member = (sequenceId: string, sequenceName: string, yearGroupId: string, yearGroupName: string) => ({
    id: `member-${sequenceId}`,
    sequence: { id: sequenceId, name: sequenceName },
    yearGroup: { id: yearGroupId, year: yearGroupName }
});

/**
 * A date a fixed number of days either side of the day the suite runs.
 *
 * **Every date in this file is relative, and has to be.** The preview now decides what to
 * skip by comparing a topic's date with today, so a fixture pinned to a calendar date silently
 * changes meaning as that date goes by: the suite would pass until the morning it did not. A
 * negative offset means the topic has been released and will be skipped, a positive one means it is
 * still to come.
 */
const daysAway = (days: number): string => moment().add(days, 'days').format('YYYY-MM-DD');

/**
 * One sequence item, as the aggregation reads it.
 *
 * The topic comes back on the same query, because whether it may reach pupils is a property of the
 * topic and so the same answer for every class. Published and visible unless a test says otherwise,
 * which is the ordinary case and keeps the unavailable one visible where it is the point.
 */
let nextTopicId = 1;

const item = (
    sequenceId: string,
    startDate: string | null,
    endDate: string | null,
    topic: { id?: string; isPublished?: boolean; isHidden?: boolean } = {}
) => ({
    id: `item-${sequenceId}-${startDate ?? 'none'}`,
    sequence: { id: sequenceId },
    topic: {
        id: topic.id ?? String(nextTopicId++),
        isPublished: topic.isPublished ?? true,
        isHidden: topic.isHidden ?? false
    },
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null
});

describe('WholeSchoolAutoScheduleService', () => {
    let service: WholeSchoolAutoScheduleService;
    let subjectQueryBuilder: Record<string, jest.Mock>;
    let schoolQueryBuilder: Record<string, jest.Mock>;
    let wholeSchoolSequenceQueryBuilder: Record<string, jest.Mock>;
    let schoolClassQueryBuilder: Record<string, jest.Mock>;
    let sequenceItemQueryBuilder: Record<string, jest.Mock>;
    /** What the school's classes already hold. Empty by default, which is a school's first run. */
    let classTopicQueryBuilder: Record<string, jest.Mock>;
    /**
     * Whether this school has already scheduled. Null by default, which is the case every preview
     * test in this file is about: a school being offered the action rather than shown a record.
     */
    let wholeSchoolAssignmentQueryBuilder: Record<string, jest.Mock>;
    /** The class assignments a run created, read only when the school has already scheduled. */
    let classAssignmentQueryBuilder: Record<string, jest.Mock>;
    let userUpdate: jest.Mock;
    /**
     * The class-level service, whose removal half the whole-school removal calls once per class.
     * Held here so the removal tests can assert which class topics it was asked to delete, which is
     * where the released-topics rule is actually visible.
     */
    let classSequenceAssignmentService: { buildPlan: jest.Mock; persistAssignmentRemoval: jest.Mock };
    /** Runs the callback against one manager, so a test can see what a transaction would write. */
    let connection: { transaction: jest.Mock };
    let transactionManager: { delete: jest.Mock; update: jest.Mock };

    beforeEach(async () => {
        transactionManager = { delete: jest.fn(), update: jest.fn() };

        classSequenceAssignmentService = {
            buildPlan: jest.fn(),
            persistAssignmentRemoval: jest.fn().mockResolvedValue(undefined)
        };

        connection = {
            transaction: jest.fn().mockImplementation((callback) => callback(transactionManager))
        };

        subjectQueryBuilder = chainableQueryBuilder();
        schoolQueryBuilder = chainableQueryBuilder();
        wholeSchoolSequenceQueryBuilder = chainableQueryBuilder();
        schoolClassQueryBuilder = chainableQueryBuilder();
        sequenceItemQueryBuilder = chainableQueryBuilder();
        classTopicQueryBuilder = chainableQueryBuilder();
        wholeSchoolAssignmentQueryBuilder = chainableQueryBuilder();
        classAssignmentQueryBuilder = chainableQueryBuilder();
        userUpdate = jest.fn().mockResolvedValue({ affected: 1 });

        // The subject and the school exist unless a test says otherwise, because almost every case
        // is about what happens after both are found.
        subjectQueryBuilder.getOne.mockResolvedValue({
            id: SUBJECT_ID,
            name: 'Money Skills',
            programmeType: SubjectProgrammeType.MONEY_SKILLS
        });

        schoolQueryBuilder.getOne.mockResolvedValue({
            id: SCHOOL_ID,
            curentPeriod: { index: CURRENT_PERIOD_INDEX, shortName: '2026-27' }
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WholeSchoolAutoScheduleService,
                {
                    provide: getRepositoryToken(LwpSchool),
                    useValue: { createQueryBuilder: jest.fn().mockReturnValue(schoolQueryBuilder) }
                },
                {
                    provide: getRepositoryToken(LwpSchoolClass),
                    useValue: { createQueryBuilder: jest.fn().mockReturnValue(schoolClassQueryBuilder) }
                },
                {
                    provide: getRepositoryToken(StaticLwpSubject),
                    useValue: { createQueryBuilder: jest.fn().mockReturnValue(subjectQueryBuilder) }
                },
                {
                    provide: getRepositoryToken(StaticLwpWholeSchoolSequence),
                    useValue: { createQueryBuilder: jest.fn().mockReturnValue(wholeSchoolSequenceQueryBuilder) }
                },
                {
                    provide: getRepositoryToken(StaticLwpTopicSequenceItem),
                    useValue: { createQueryBuilder: jest.fn().mockReturnValue(sequenceItemQueryBuilder) }
                },
                {
                    provide: getRepositoryToken(LwpClassTopic),
                    useValue: { createQueryBuilder: jest.fn().mockReturnValue(classTopicQueryBuilder) }
                },
                {
                    provide: getRepositoryToken(LwpWholeSchoolSequenceAssignment),
                    useValue: { createQueryBuilder: jest.fn().mockReturnValue(wholeSchoolAssignmentQueryBuilder) }
                },
                {
                    provide: getRepositoryToken(LwpClassSequenceAssignment),
                    useValue: { createQueryBuilder: jest.fn().mockReturnValue(classAssignmentQueryBuilder) }
                },
                {
                    provide: getRepositoryToken(LwpUser),
                    useValue: { update: userUpdate }
                },
                /*
                 * The four the assign path needs. Every test in this file exercises the preview,
                 * which touches none of them, but Nest resolves a provider's whole constructor
                 * before it hands one back, so an unlisted dependency fails the suite at compile
                 * rather than at the call.
                 *
                 * They arrived with the whole-school assign mutation and this file was not updated
                 * with them, which left every test in it failing to construct on that branch.
                 */
                { provide: ClassSequenceAssignmentService, useValue: classSequenceAssignmentService },
                { provide: ClassTopicService, useValue: {} },
                { provide: Connection, useValue: connection },
                { provide: ShallowUserService, useValue: { newShallowUser: jest.fn().mockReturnValue({ id: 'user-1' }) } }
            ]
        }).compile();

        service = module.get<WholeSchoolAutoScheduleService>(WholeSchoolAutoScheduleService);
    });

    /** The shape most tests want: Reception covered with two classes, Year 1 with a class and no member. */
    const givenReceptionCoveredAndYearOneNot = () => {
        wholeSchoolSequenceQueryBuilder.getOne.mockResolvedValue({
            id: '7',
            members: [member('100', 'Money Skills Reception', '0', 'Reception')]
        });

        schoolClassQueryBuilder.getMany.mockResolvedValue([
            entitledClass('1', '0', 'Reception'),
            entitledClass('2', '0', 'Reception'),
            entitledClass('3', '1', 'Year 1')
        ]);

        sequenceItemQueryBuilder.getMany.mockResolvedValue([
            item('100', daysAway(7), daysAway(18)),
            item('100', daysAway(21), daysAway(32)),
            item('100', daysAway(35), daysAway(46))
        ]);
    };

    /** Reception's first topic has been and gone; the other two are still to come. */
    const givenReceptionPartlyInThePast = (): void => {
        givenReceptionCoveredAndYearOneNot();

        sequenceItemQueryBuilder.getMany.mockResolvedValue([
            item('100', daysAway(-14), daysAway(-3)),
            item('100', daysAway(21), daysAway(32)),
            item('100', daysAway(35), daysAway(46))
        ]);
    };

    it('gives a covered year group one row, with its sequence name, span and class count', async () => {
        givenReceptionCoveredAndYearOneNot();

        const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

        expect(preview.wholeSchoolSequenceId).toEqual('7');
        expect(preview.subjectName).toEqual('Money Skills');
        expect(preview.academicYear).toEqual('2026-27');

        const reception = preview.rows.find((row) => row.yearGroup === 'Reception');

        expect(reception).toEqual({
            yearGroupId: '0',
            yearGroup: 'Reception',
            sequenceId: '100',
            sequenceName: 'Money Skills Reception',
            startDate: new Date(daysAway(7)),
            endDate: new Date(daysAway(46)),
            classCount: 2,
            // Three topics, two classes, and neither class already holds any of them.
            activityCount: 6,
            classesReceiving: 2,
            // Nothing has passed, so the span is the member's whole one.
            topicsSkipped: 0,
            skipped: false,
            skipReason: undefined
        });
    });

    it('shows a year group with classes and no member as skipped, rather than leaving it out', async () => {
        givenReceptionCoveredAndYearOneNot();

        const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

        const yearOne = preview.rows.find((row) => row.yearGroup === 'Year 1');

        expect(yearOne).toEqual({
            yearGroupId: '1',
            yearGroup: 'Year 1',
            classCount: 1,
            // No member, so nothing to receive and no topics of its own to have passed.
            classesReceiving: 0,
            topicsSkipped: 0,
            activityCount: 0,
            skipped: true,
            skipReason: WholeSchoolYearGroupSkipReason.NO_SEQUENCE_FOR_YEAR_GROUP
        });
    });

    it('shows a member this school has no classes for as skipped, and counts no skipped classes for it', async () => {
        wholeSchoolSequenceQueryBuilder.getOne.mockResolvedValue({
            id: '7',
            members: [member('100', 'Money Skills Reception', '0', 'Reception'), member('200', 'Money Skills Year 6', '6', 'Year 6')]
        });

        schoolClassQueryBuilder.getMany.mockResolvedValue([entitledClass('1', '0', 'Reception')]);
        sequenceItemQueryBuilder.getMany.mockResolvedValue([item('100', daysAway(7), daysAway(18))]);

        const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

        const yearSix = preview.rows.find((row) => row.yearGroup === 'Year 6');

        expect(yearSix.skipped).toBe(true);
        expect(yearSix.skipReason).toEqual(WholeSchoolYearGroupSkipReason.NO_ELIGIBLE_CLASSES);
        expect(yearSix.classCount).toEqual(0);
        expect(yearSix.activityCount).toEqual(0);

        // There are no classes in Year 6 to be skipped, so the total counts only real classes.
        expect(preview.classesSkipped).toEqual(0);
        expect(preview.classesCovered).toEqual(1);
    });

    it('leaves out a year group with neither a member nor a class, so the table says nothing empty', async () => {
        givenReceptionCoveredAndYearOneNot();

        const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

        expect(preview.rows.map((row) => row.yearGroup)).toEqual(['Reception', 'Year 1']);
    });

    it('reconciles the callout totals with the table', async () => {
        givenReceptionCoveredAndYearOneNot();

        const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

        expect(preview.activitiesToCreate).toEqual(preview.rows.reduce((total, row) => total + row.activityCount, 0));

        // Every eligible class is either covered or skipped, never both and never neither.
        expect(preview.classesCovered + preview.classesSkipped).toEqual(3);
        expect(preview.classesCovered).toEqual(2);
        expect(preview.classesSkipped).toEqual(1);
    });

    it('excludes a class that is not entitled to the subject, so it is neither covered nor skipped', async () => {
        wholeSchoolSequenceQueryBuilder.getOne.mockResolvedValue({
            id: '7',
            members: [member('100', 'Money Skills Reception', '0', 'Reception')]
        });

        const notEntitled = {
            ...entitledClass('2', '0', 'Reception'),
            // No reading logs and not a full programme, so Money Skills is not among its programmes
            // even though its school holds the flag.
            IsReadingLogsEnabled: false
        } as unknown as LwpSchoolClass;

        schoolClassQueryBuilder.getMany.mockResolvedValue([entitledClass('1', '0', 'Reception'), notEntitled]);
        sequenceItemQueryBuilder.getMany.mockResolvedValue([item('100', daysAway(7), daysAway(18))]);

        const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

        expect(preview.rows[0].classCount).toEqual(1);
        expect(preview.classesCovered).toEqual(1);
        expect(preview.classesSkipped).toEqual(0);
    });

    it('closes a span on the start date of a topic that carries no end date', async () => {
        wholeSchoolSequenceQueryBuilder.getOne.mockResolvedValue({
            id: '7',
            members: [member('100', 'Money Skills Reception', '0', 'Reception')]
        });

        schoolClassQueryBuilder.getMany.mockResolvedValue([entitledClass('1', '0', 'Reception')]);

        sequenceItemQueryBuilder.getMany.mockResolvedValue([
            item('100', daysAway(7), daysAway(18)),
            // The last topic of the sequence, open-ended. Without it closing the span on its own start
            // date the school would be told the sequence finishes a fortnight early.
            item('100', daysAway(35), null)
        ]);

        const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

        expect(preview.rows[0].startDate).toEqual(new Date(daysAway(7)));
        expect(preview.rows[0].endDate).toEqual(new Date(daysAway(35)));
    });

    it('offers nothing when only a draft exists, and asks the database for a published one', async () => {
        // The query returns nothing because it filters on PUBLISHED; the assertion below is what
        // holds that filter in place, since it is the line that keeps unfinished content away from
        // every school.
        wholeSchoolSequenceQueryBuilder.getOne.mockResolvedValue(null);
        schoolClassQueryBuilder.getMany.mockResolvedValue([entitledClass('1', '0', 'Reception')]);

        const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

        expect(wholeSchoolSequenceQueryBuilder.andWhere).toHaveBeenCalledWith('wholeSchoolSequence.status = :status', {
            status: WholeSchoolSequenceStatus.PUBLISHED
        });

        expect(preview.wholeSchoolSequenceId).toBeUndefined();
        // No sequence means no rows, rather than every year group reported as uncovered by one.
        expect(preview.rows).toEqual([]);
        expect(preview.activitiesToCreate).toEqual(0);
        expect(preview.classesSkipped).toEqual(0);

        // The page still has what it needs to say which subject it found nothing for.
        expect(preview.subjectName).toEqual('Money Skills');
        expect(preview.academicYear).toEqual('2026-27');
    });

    it("scopes the sequence to the school's own academic year, not the platform's current one", async () => {
        givenReceptionCoveredAndYearOneNot();

        await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

        expect(wholeSchoolSequenceQueryBuilder.andWhere).toHaveBeenCalledWith('period.index = :periodIndex', {
            periodIndex: CURRENT_PERIOD_INDEX
        });
    });

    it('sweeps only active registration classes in the school current year', async () => {
        givenReceptionCoveredAndYearOneNot();

        await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

        expect(schoolClassQueryBuilder.where).toHaveBeenCalledWith('schoolClass.isRegistrationClass = :isRegistrationClass', {
            isRegistrationClass: true
        });
        expect(schoolClassQueryBuilder.andWhere).toHaveBeenCalledWith('schoolClass.isGroupAcrossClasses = :isGroupAcrossClasses', {
            isGroupAcrossClasses: false
        });
        expect(schoolClassQueryBuilder.andWhere).toHaveBeenCalledWith('period.index = currentPeriod.index');
    });

    it('refuses a subject that does not exist', async () => {
        subjectQueryBuilder.getOne.mockResolvedValue(null);

        await expect(service.previewWholeSchoolSequence(SCHOOL_ID, 'nope')).rejects.toThrow(HttpException);
    });

    it('refuses a school that does not exist', async () => {
        schoolQueryBuilder.getOne.mockResolvedValue(null);

        await expect(service.previewWholeSchoolSequence('nope', SUBJECT_ID)).rejects.toThrow(HttpException);
    });

    /**
     * A school meeting a sequence after it has started gets the rest of it, and is told what it
     * missed. Before this the whole run was refused and nobody at the school could fix it.
     */
    describe('past-dated topics', () => {
        it('drops a past-dated topic from the count and says how many went', async () => {
            givenReceptionPartlyInThePast();

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

            const reception = preview.rows.find((row) => row.yearGroup === 'Reception');

            // Two topics left of three, across two classes.
            expect(reception.activityCount).toEqual(4);
            expect(reception.topicsSkipped).toEqual(1);

            // Still being scheduled: a row only skips outright when nothing at all is left.
            expect(reception.skipped).toBe(false);
            expect(reception.skipReason).toBeUndefined();
        });

        it('shows the effective span, starting at the first topic that will actually be created', async () => {
            givenReceptionPartlyInThePast();

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

            const reception = preview.rows.find((row) => row.yearGroup === 'Reception');

            /*
             * Not `daysAway(-14)`, which is where the admin's sequence begins. Showing that beside
             * "1 topic skipped" would state a range this school is not being given.
             */
            expect(reception.startDate).toEqual(new Date(daysAway(21)));
            expect(reception.endDate).toEqual(new Date(daysAway(46)));
        });

        it('counts skipped topics in the callout as the sum of the rows, so the two reconcile', async () => {
            givenReceptionPartlyInThePast();

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

            expect(preview.topicsSkipped).toEqual(preview.rows.reduce((total, row) => total + row.topicsSkipped, 0));

            // Topics, not activities: every class in the year group drops the same one.
            expect(preview.topicsSkipped).toEqual(1);
            expect(preview.activitiesToCreate).toEqual(4);
        });

        it('renders a member whose topics have all passed, scheduling nothing and counting its classes as skipped', async () => {
            givenReceptionCoveredAndYearOneNot();

            sequenceItemQueryBuilder.getMany.mockResolvedValue([
                item('100', daysAway(-30), daysAway(-20)),
                item('100', daysAway(-14), daysAway(-3))
            ]);

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

            const reception = preview.rows.find((row) => row.yearGroup === 'Reception');

            expect(reception.skipped).toBe(true);
            expect(reception.skipReason).toEqual(WholeSchoolYearGroupSkipReason.ALL_TOPICS_IN_PAST);
            expect(reception.activityCount).toEqual(0);
            expect(reception.topicsSkipped).toEqual(2);

            // No span, because there is nothing left to span.
            expect(reception.startDate).toBeUndefined();
            expect(reception.endDate).toBeUndefined();

            /*
             * Its two classes are counted, unlike a NO_ELIGIBLE_CLASSES row which has none. Covered
             * plus skipped still adds up to the school's three eligible classes.
             */
            expect(preview.classesSkipped).toEqual(3);
            expect(preview.classesCovered).toEqual(0);
        });

        it('has nothing to create when every member is in the past, which is what hides the action', async () => {
            givenReceptionCoveredAndYearOneNot();

            sequenceItemQueryBuilder.getMany.mockResolvedValue([item('100', daysAway(-30), daysAway(-20))]);

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

            /*
             * The page hides its button on this number, so zero here is the empty state. Asserted on
             * the total rather than the rows because that is the value the page actually reads.
             */
            expect(preview.activitiesToCreate).toEqual(0);
            expect(preview.topicsSkipped).toEqual(1);
        });

        it('keeps a topic dated today, so a school scheduling on the morning it starts loses nothing', async () => {
            givenReceptionCoveredAndYearOneNot();

            sequenceItemQueryBuilder.getMany.mockResolvedValue([item('100', daysAway(0), daysAway(11))]);

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

            const reception = preview.rows.find((row) => row.yearGroup === 'Reception');

            expect(reception.topicsSkipped).toEqual(0);
            expect(reception.activityCount).toEqual(2);
        });

        it('says no classes rather than dates passed when the member has no classes either', async () => {
            wholeSchoolSequenceQueryBuilder.getOne.mockResolvedValue({
                id: '7',
                members: [member('200', 'Money Skills Year 6', '6', 'Year 6')]
            });

            schoolClassQueryBuilder.getMany.mockResolvedValue([entitledClass('1', '0', 'Reception')]);
            sequenceItemQueryBuilder.getMany.mockResolvedValue([item('200', daysAway(-30), daysAway(-20))]);

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

            const yearSix = preview.rows.find((row) => row.yearGroup === 'Year 6');

            /*
             * Both are true of this row. With nothing to receive it, what its dates would have been
             * is not why this school gets nothing, and naming them would send the leader after the
             * wrong thing.
             */
            expect(yearSix.skipReason).toEqual(WholeSchoolYearGroupSkipReason.NO_ELIGIBLE_CLASSES);
        });
    });

    /**
     * The activity count is what a leader reads before pressing anything, so it has to be what they
     * will actually get. Three things can make it smaller than topics times classes, and only one of
     * them differs from class to class.
     */
    describe('an exact activity count', () => {
        /** What the school's classes already hold, as the batched lookup returns it. */
        const alreadyHolds = (rows: { classId: string; topicId: string }[]): void => {
            classTopicQueryBuilder.getMany.mockResolvedValue(
                rows.map((row, index) => ({ id: `held-${index}`, class: { id: row.classId }, topic: { id: row.topicId } }))
            );
        };

        it('leaves out a topic that is unpublished, for every class at once', async () => {
            givenReceptionCoveredAndYearOneNot();

            sequenceItemQueryBuilder.getMany.mockResolvedValue([
                item('100', daysAway(7), daysAway(18), { id: '1' }),
                item('100', daysAway(21), daysAway(32), { id: '2', isPublished: false })
            ]);

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);
            const reception = preview.rows.find((row) => row.yearGroup === 'Reception');

            // One usable topic across two classes, not two.
            expect(reception.activityCount).toEqual(2);
            expect(reception.classesReceiving).toEqual(2);

            // Not counted as a date problem: it is the content team's to publish, not the year's.
            expect(reception.topicsSkipped).toEqual(0);
        });

        it('leaves out a hidden topic on the same footing as an unpublished one', async () => {
            givenReceptionCoveredAndYearOneNot();

            sequenceItemQueryBuilder.getMany.mockResolvedValue([
                item('100', daysAway(7), daysAway(18), { id: '1' }),
                item('100', daysAway(21), daysAway(32), { id: '2', isHidden: true })
            ]);

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

            expect(preview.rows.find((row) => row.yearGroup === 'Reception').activityCount).toEqual(2);
        });

        it('subtracts what one class already holds without touching its neighbour', async () => {
            givenReceptionCoveredAndYearOneNot();

            sequenceItemQueryBuilder.getMany.mockResolvedValue([
                item('100', daysAway(7), daysAway(18), { id: '1' }),
                item('100', daysAway(21), daysAway(32), { id: '2' })
            ]);

            // Class 1 has one of the two already. Class 2 has neither.
            alreadyHolds([{ classId: '1', topicId: '1' }]);

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);
            const reception = preview.rows.find((row) => row.yearGroup === 'Reception');

            /*
             * Three, not four. This is the number a single multiplication can never produce, and the
             * reason the count is worked out per class rather than per year group.
             */
            expect(reception.activityCount).toEqual(3);

            // Both still receive something, so both are covered.
            expect(reception.classesReceiving).toEqual(2);
            expect(preview.classesCovered).toEqual(2);
        });

        it('stops counting a class that already holds every topic, and counts it as skipped', async () => {
            givenReceptionCoveredAndYearOneNot();

            sequenceItemQueryBuilder.getMany.mockResolvedValue([item('100', daysAway(7), daysAway(18), { id: '1' })]);

            alreadyHolds([{ classId: '1', topicId: '1' }]);

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);
            const reception = preview.rows.find((row) => row.yearGroup === 'Reception');

            expect(reception.activityCount).toEqual(1);
            expect(reception.classesReceiving).toEqual(1);

            /*
             * Covered plus skipped still adds up to the school's three eligible classes: one
             * Reception class receiving, one Reception class full, one Year 1 class with no member.
             */
            expect(preview.classesCovered).toEqual(1);
            expect(preview.classesSkipped).toEqual(2);
        });

        it('skips the whole row when every class already holds everything, so nothing is offered', async () => {
            givenReceptionCoveredAndYearOneNot();

            sequenceItemQueryBuilder.getMany.mockResolvedValue([item('100', daysAway(7), daysAway(18), { id: '1' })]);

            alreadyHolds([
                { classId: '1', topicId: '1' },
                { classId: '2', topicId: '1' }
            ]);

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);
            const reception = preview.rows.find((row) => row.yearGroup === 'Reception');

            expect(reception.skipped).toBe(true);
            expect(reception.skipReason).toEqual(WholeSchoolYearGroupSkipReason.ALREADY_HAS_THESE_TOPICS);
            expect(reception.activityCount).toEqual(0);

            /*
             * Zero here is what hides the action. Before this the page offered a button that built an
             * empty plan for every class and then refused, which is the same defect past dates had.
             */
            expect(preview.activitiesToCreate).toEqual(0);
        });

        it('says the content is unavailable rather than blaming the dates when nothing is published', async () => {
            givenReceptionCoveredAndYearOneNot();

            sequenceItemQueryBuilder.getMany.mockResolvedValue([
                item('100', daysAway(7), daysAway(18), { id: '1', isPublished: false }),
                item('100', daysAway(21), daysAway(32), { id: '2', isHidden: true })
            ]);

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);
            const reception = preview.rows.find((row) => row.yearGroup === 'Reception');

            expect(reception.skipReason).toEqual(WholeSchoolYearGroupSkipReason.NO_AVAILABLE_TOPICS);
            expect(reception.topicsSkipped).toEqual(0);
        });

        it('leaves a skipped row out of the skipped-topic total above the table', async () => {
            givenReceptionCoveredAndYearOneNot();

            sequenceItemQueryBuilder.getMany.mockResolvedValue([
                item('100', daysAway(-14), daysAway(-3), { id: '1' }),
                item('100', daysAway(7), daysAway(18), { id: '2' })
            ]);

            // Both classes already hold the one topic still to come, so the row gives nothing.
            alreadyHolds([
                { classId: '1', topicId: '2' },
                { classId: '2', topicId: '2' }
            ]);

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);
            const reception = preview.rows.find((row) => row.yearGroup === 'Reception');

            expect(reception.skipReason).toEqual(WholeSchoolYearGroupSkipReason.ALREADY_HAS_THESE_TOPICS);

            /*
             * The row still has a past-dated topic, and still says so for anyone reading the row.
             * The total does not, because a date is not why this year group is getting nothing, and
             * offering one would send a leader to the calendar over something the calendar did not
             * cause.
             */
            expect(reception.topicsSkipped).toEqual(1);
            expect(preview.topicsSkipped).toEqual(0);
        });

        it('still counts an all-past row, where the date is exactly the story', async () => {
            givenReceptionCoveredAndYearOneNot();

            sequenceItemQueryBuilder.getMany.mockResolvedValue([item('100', daysAway(-30), daysAway(-20), { id: '1' })]);

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

            expect(preview.topicsSkipped).toEqual(1);
        });

        it('gives a skipped row no span, because nothing will be created on it', async () => {
            givenReceptionCoveredAndYearOneNot();

            sequenceItemQueryBuilder.getMany.mockResolvedValue([item('100', daysAway(7), daysAway(18), { id: '1' })]);

            alreadyHolds([
                { classId: '1', topicId: '1' },
                { classId: '2', topicId: '1' }
            ]);

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);
            const reception = preview.rows.find((row) => row.yearGroup === 'Reception');

            /*
             * The field is defined as the span of what will actually be created. The page hides it
             * on a skipped row either way, so this is about the answer being true for whoever reads
             * it next rather than about what is drawn today.
             */
            expect(reception.startDate).toBeUndefined();
            expect(reception.endDate).toBeUndefined();
        });

        it('asks about the classes it has, in one query rather than one per class', async () => {
            givenReceptionCoveredAndYearOneNot();

            await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

            /*
             * The point of the batched lookup. A plan per class would answer the same question and
             * cost a query each, on a page a leader only reads.
             */
            expect(classTopicQueryBuilder.getMany).toHaveBeenCalledTimes(1);
        });

        it('does not ask at all when no member has a usable topic left', async () => {
            givenReceptionCoveredAndYearOneNot();

            sequenceItemQueryBuilder.getMany.mockResolvedValue([item('100', daysAway(-30), daysAway(-20), { id: '1' })]);

            await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

            expect(classTopicQueryBuilder.getMany).not.toHaveBeenCalled();
        });
    });

    it('does not ask for sequence items when there are no members', async () => {
        wholeSchoolSequenceQueryBuilder.getOne.mockResolvedValue({ id: '7', members: [] });
        schoolClassQueryBuilder.getMany.mockResolvedValue([entitledClass('1', '0', 'Reception')]);

        const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

        expect(sequenceItemQueryBuilder.getMany).not.toHaveBeenCalled();
        expect(preview.rows).toEqual([
            {
                yearGroupId: '0',
                yearGroup: 'Reception',
                classCount: 1,
                activityCount: 0,
                classesReceiving: 0,
                topicsSkipped: 0,
                skipped: true,
                skipReason: WholeSchoolYearGroupSkipReason.NO_SEQUENCE_FOR_YEAR_GROUP
            }
        ]);
    });

    /**
     * A school that has already scheduled is shown what it was given rather than offered the action.
     *
     * The case these cover is not hypothetical. The activity count became exact, so a school holding
     * every topic it would be given has nothing left to create; without this branch it falls through
     * to the page's empty state and is told there is nothing for it seconds after it succeeded.
     */
    describe('a school that has already scheduled', () => {
        /** One live run, and the class assignments it created for two Reception classes. */
        const givenScheduled = (): void => {
            wholeSchoolAssignmentQueryBuilder.getOne.mockResolvedValue({
                id: '55',
                logCreatedAt: new Date('2026-09-14')
            });

            classAssignmentQueryBuilder.getMany.mockResolvedValue([
                {
                    id: 'ca-1',
                    class: { id: '1', yearGroup: { id: '0', year: 'Reception' } },
                    sequence: { id: '100', name: 'Money Skills Reception' },
                    classTopics: [
                        { id: 't-1', releaseDate: new Date('2026-09-21'), dueDate: new Date('2026-10-02') },
                        { id: 't-2', releaseDate: new Date('2026-10-05'), dueDate: new Date('2026-10-16') }
                    ]
                },
                {
                    id: 'ca-2',
                    class: { id: '2', yearGroup: { id: '0', year: 'Reception' } },
                    sequence: { id: '100', name: 'Money Skills Reception' },
                    classTopics: [{ id: 't-3', releaseDate: new Date('2026-09-21'), dueDate: new Date('2026-10-02') }]
                }
            ]);
        };

        it('returns what the school was given, and offers nothing', async () => {
            givenScheduled();

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

            expect(preview.assignment.assignmentId).toEqual('55');
            expect(preview.assignment.activitiesCreated).toEqual(3);
            expect(preview.assignment.classesScheduled).toEqual(2);

            // Nothing on the offer half of the object, so no branch below the record can claim it.
            expect(preview.wholeSchoolSequenceId).toBeUndefined();
            expect(preview.rows).toEqual([]);
            expect(preview.activitiesToCreate).toEqual(0);
        });

        it('groups the classes it scheduled into one row per year group', async () => {
            givenScheduled();

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

            expect(preview.assignment.rows).toEqual([
                {
                    yearGroupId: '0',
                    yearGroup: 'Reception',
                    sequenceId: '100',
                    sequenceName: 'Money Skills Reception',
                    startDate: new Date('2026-09-21'),
                    endDate: new Date('2026-10-16'),
                    classCount: 2,
                    activityCount: 3,
                    classesReceiving: 2,
                    topicsSkipped: 0,
                    skipped: false
                }
            ]);
        });

        /*
         * The span comes from the topics that exist rather than from the sequence that was run,
         * which is the whole reason a record is a different query from a forecast: the sequence can
         * since have been deleted, and a teacher can have moved a date.
         */
        it('spans the topics the classes actually hold', async () => {
            givenScheduled();

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

            expect(preview.assignment.rows[0].startDate).toEqual(new Date('2026-09-21'));
            expect(preview.assignment.rows[0].endDate).toEqual(new Date('2026-10-16'));
        });

        /* `SET NULL` on purpose: the classes keep the topics they were given. */
        it('still describes a row whose sequence has since been deleted', async () => {
            givenScheduled();

            classAssignmentQueryBuilder.getMany.mockResolvedValue([
                {
                    id: 'ca-1',
                    class: { id: '1', yearGroup: { id: '0', year: 'Reception' } },
                    sequence: null,
                    classTopics: [{ id: 't-1', releaseDate: new Date('2026-09-21'), dueDate: new Date('2026-10-02') }]
                }
            ]);

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

            expect(preview.assignment.rows[0].sequenceId).toBeUndefined();
            expect(preview.assignment.rows[0].sequenceName).toBeUndefined();
            expect(preview.assignment.rows[0].classCount).toEqual(1);
        });

        /*
         * Answered before the published sequence is even looked for, so a school in this state never
         * pays for a sweep of every class in it to build rows the page will not draw.
         */
        it('does not build a forecast for a school that has already scheduled', async () => {
            givenScheduled();

            await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

            expect(wholeSchoolSequenceQueryBuilder.getOne).not.toHaveBeenCalled();
            expect(schoolClassQueryBuilder.getMany).not.toHaveBeenCalled();
        });

        it('leaves a school that has not scheduled being offered the action', async () => {
            givenReceptionCoveredAndYearOneNot();

            const preview = await service.previewWholeSchoolSequence(SCHOOL_ID, SUBJECT_ID);

            expect(preview.assignment).toBeUndefined();
            expect(preview.wholeSchoolSequenceId).toEqual('7');
        });
    });
    /**
     * The once-a-year rule, checked in code so a leader reads a sentence.
     *
     * The database refuses a second live run on its own, through the partial unique index, and that
     * index is still what settles two leaders pressing at the same moment. These cover the ordinary
     * case, which is one leader pressing twice and needing to be told why not.
     */
    describe('refusing a second run in the same academic year', () => {
        const givenPublishedSequence = (): void => {
            wholeSchoolSequenceQueryBuilder.getOne.mockResolvedValue({
                id: '7',
                status: WholeSchoolSequenceStatus.PUBLISHED,
                subject: { id: SUBJECT_ID, name: 'Money Skills', programmeType: SubjectProgrammeType.MONEY_SKILLS },
                period: { index: CURRENT_PERIOD_INDEX },
                members: [member('100', 'Money Skills Reception', '0', 'Reception')]
            });
        };

        it('refuses in words a leader can act on, rather than as a constraint violation', async () => {
            givenPublishedSequence();
            wholeSchoolAssignmentQueryBuilder.getOne.mockResolvedValue({ id: '55' });

            await expect(service.assignWholeSchoolSequence(SCHOOL_ID, '7', 'user-1')).rejects.toThrow(
                /already been scheduled for Money Skills this academic year/
            );
        });

        it('names removal as the way out, because that is what frees the year', async () => {
            givenPublishedSequence();
            wholeSchoolAssignmentQueryBuilder.getOne.mockResolvedValue({ id: '55' });

            await expect(service.assignWholeSchoolSequence(SCHOOL_ID, '7', 'user-1')).rejects.toThrow(/Remove that schedule first/);
        });

        /* Refused before the school's classes are swept, so a second press costs nothing. */
        it('refuses before doing any of the work of a run', async () => {
            givenPublishedSequence();
            wholeSchoolAssignmentQueryBuilder.getOne.mockResolvedValue({ id: '55' });

            await expect(service.assignWholeSchoolSequence(SCHOOL_ID, '7', 'user-1')).rejects.toThrow(HttpException);

            expect(schoolClassQueryBuilder.getMany).not.toHaveBeenCalled();
        });

        /*
         * Null covers both a school that has never run and one whose run was removed, because the
         * query only ever looks for an ASSIGNED one. That is what makes removal free the year, and
         * the reason the index behind it is partial rather than plain.
         */
        it('lets a school with no live run through to the rest of the checks', async () => {
            givenPublishedSequence();
            wholeSchoolAssignmentQueryBuilder.getOne.mockResolvedValue(null);

            // No eligible classes, which is the next refusal along: the once-a-year rule let it past.
            await expect(service.assignWholeSchoolSequence(SCHOOL_ID, '7', 'user-1')).rejects.toThrow(
                /No classes in your school are set up for Money Skills/
            );
        });
    });

    /**
     * Withdrawing a run: unreleased topics go, released ones stay, and the year is freed.
     *
     * The keeping rule is the one that matters most in this ticket. A child who has already done an
     * activity must never lose it because a leader corrected a mistake weeks later.
     */
    describe('removing a whole-school schedule', () => {
        /** A live run whose two classes hold a mix of released and unreleased topics. */
        const givenRunToRemove = (): void => {
            wholeSchoolAssignmentQueryBuilder.getOne.mockResolvedValue({
                id: '55',
                status: SequenceAssignmentStatus.ASSIGNED,
                subject: { name: 'Money Skills' }
            });

            classAssignmentQueryBuilder.getMany.mockResolvedValue([
                {
                    id: 'ca-1',
                    classTopics: [
                        { id: 't-1', released: true },
                        { id: 't-2', released: false },
                        { id: 't-3', released: false }
                    ]
                },
                {
                    id: 'ca-2',
                    classTopics: [{ id: 't-4', released: false }]
                }
            ]);
        };

        it('deletes the topics that have not gone out and keeps the ones that have', async () => {
            givenRunToRemove();

            const result = await service.removeWholeSchoolSequenceAssignment(SCHOOL_ID, '55', 'user-1');

            // The released topic is absent from both lists, which is the rule this all exists for.
            expect(classSequenceAssignmentService.persistAssignmentRemoval).toHaveBeenCalledWith(
                transactionManager,
                'ca-1',
                ['t-2', 't-3'],
                expect.anything()
            );
            expect(classSequenceAssignmentService.persistAssignmentRemoval).toHaveBeenCalledWith(
                transactionManager,
                'ca-2',
                ['t-4'],
                expect.anything()
            );
            expect(result.msg).toEqual('3 scheduled topics removed across 2 classes, 1 already released and kept');
        });

        it('frees the school to schedule that year again', async () => {
            givenRunToRemove();

            await service.removeWholeSchoolSequenceAssignment(SCHOOL_ID, '55', 'user-1');

            expect(transactionManager.update).toHaveBeenCalledWith(
                LwpWholeSchoolSequenceAssignment,
                '55',
                expect.objectContaining({ status: SequenceAssignmentStatus.REMOVED })
            );
        });

        /* Every class in one transaction: a half-removed school is worse than a scheduled one. */
        it('withdraws every class in a single transaction', async () => {
            givenRunToRemove();

            await service.removeWholeSchoolSequenceAssignment(SCHOOL_ID, '55', 'user-1');

            expect(connection.transaction).toHaveBeenCalledTimes(1);
        });

        /*
         * The endpoint authorizes on the school, so an id from a caller has to be checked against it
         * or a leader could withdraw another school's run by pairing it with their own school.
         */
        it('refuses an assignment that belongs to another school', async () => {
            wholeSchoolAssignmentQueryBuilder.getOne.mockResolvedValue(null);

            await expect(service.removeWholeSchoolSequenceAssignment(SCHOOL_ID, '55', 'user-1')).rejects.toThrow(
                /does not exist for your school/
            );
        });

        it('refuses one that has already been removed, rather than reporting nothing to do', async () => {
            wholeSchoolAssignmentQueryBuilder.getOne.mockResolvedValue({
                id: '55',
                status: SequenceAssignmentStatus.REMOVED,
                subject: { name: 'Money Skills' }
            });

            await expect(service.removeWholeSchoolSequenceAssignment(SCHOOL_ID, '55', 'user-1')).rejects.toThrow(
                /Money Skills schedule has already been removed/
            );
        });

        /*
         * Every class having been withdrawn by its own teacher leaves a run with nothing under it.
         * The year still has to be freed, or the school is locked out by a schedule nobody holds.
         */
        it('still frees the year when a run has no classes left to withdraw', async () => {
            wholeSchoolAssignmentQueryBuilder.getOne.mockResolvedValue({
                id: '55',
                status: SequenceAssignmentStatus.ASSIGNED,
                subject: { name: 'Money Skills' }
            });
            classAssignmentQueryBuilder.getMany.mockResolvedValue([]);

            const result = await service.removeWholeSchoolSequenceAssignment(SCHOOL_ID, '55', 'user-1');

            expect(transactionManager.update).toHaveBeenCalledWith(
                LwpWholeSchoolSequenceAssignment,
                '55',
                expect.objectContaining({ status: SequenceAssignmentStatus.REMOVED })
            );
            expect(result.msg).toEqual('0 scheduled topics removed across 0 classes, 0 already released and kept');
        });
    });

    describe('listing the programmes on the Auto schedule tab', () => {
        const readyTeddyClass = (id: string): Partial<LwpSchoolClass> =>
            ({ ...entitledClass(id, '0', 'Reception'), IsReadingLogsEnabled: false, isReadyTeddyEnabled: true }) as Partial<LwpSchoolClass>;

        beforeEach(() => {
            subjectQueryBuilder.getMany.mockResolvedValue([
                { id: '3', name: 'Ready teddy', programmeType: SubjectProgrammeType.READY_TEDDY },
                { id: '4', name: 'Money skills', programmeType: SubjectProgrammeType.MONEY_SKILLS }
            ]);
            // Only Money Skills is published for this school's year.
            wholeSchoolSequenceQueryBuilder.getMany.mockResolvedValue([{ id: '9', subject: { id: '4' } }]);
        });

        it('lists only the entitled programmes that are published, never one as coming soon', async () => {
            schoolClassQueryBuilder.getMany.mockResolvedValue([entitledClass('1', '0', 'Reception'), readyTeddyClass('2')]);

            const programmes = await service.getWholeSchoolAutoScheduleProgrammes(SCHOOL_ID);

            expect(programmes.map(({ subjectName, isAvailable }) => ({ subjectName, isAvailable }))).toEqual([
                { subjectName: 'Money skills', isAvailable: true }
            ]);
        });

        it('lists nothing while the only entitled programme is unpublished', async () => {
            schoolClassQueryBuilder.getMany.mockResolvedValue([entitledClass('1', '0', 'Reception')]);
            wholeSchoolSequenceQueryBuilder.getMany.mockResolvedValue([]);

            const programmes = await service.getWholeSchoolAutoScheduleProgrammes(SCHOOL_ID);

            expect(programmes).toEqual([]);
        });

        it('leaves out a programme no class is entitled to', async () => {
            schoolClassQueryBuilder.getMany.mockResolvedValue([entitledClass('1', '0', 'Reception')]);

            const programmes = await service.getWholeSchoolAutoScheduleProgrammes(SCHOOL_ID);

            expect(programmes.map((programme) => programme.subjectName)).toEqual(['Money skills']);
        });

        it('carries what a scheduled programme holds, and still lists it once entitlement has lapsed', async () => {
            schoolClassQueryBuilder.getMany.mockResolvedValue([]);
            wholeSchoolAssignmentQueryBuilder.getMany.mockResolvedValue([
                { id: '55', logCreatedAt: new Date('2026-09-14'), subject: { id: '4' } }
            ]);
            classAssignmentQueryBuilder.getMany.mockResolvedValue([
                {
                    id: 'ca-1',
                    class: { id: '1', yearGroup: { id: '0', year: 'Reception' } },
                    sequence: { id: '100', name: 'Money Skills Reception' },
                    classTopics: [{ id: 't-1', releaseDate: new Date('2026-09-21'), dueDate: new Date('2026-10-02') }]
                }
            ]);

            const [programme, ...others] = await service.getWholeSchoolAutoScheduleProgrammes(SCHOOL_ID);

            expect(others).toEqual([]);
            expect(programme.subjectId).toEqual('4');
            expect(programme.assignment.assignmentId).toEqual('55');
            expect(programme.assignment.rows[0]).toEqual(
                expect.objectContaining({ yearGroup: 'Reception', startDate: new Date('2026-09-21'), endDate: new Date('2026-10-02') })
            );
        });

        it('refuses a school with no current academic year', async () => {
            schoolQueryBuilder.getOne.mockResolvedValue(null);

            await expect(service.getWholeSchoolAutoScheduleProgrammes(SCHOOL_ID)).rejects.toThrow(HttpException);
        });
    });

    /*
     * Published and not-yet-scheduled are decided in SQL, so a mock cannot prove them false; the
     * functional suite does that against a real database. What is decided here is entitlement, and
     * that the classes are never read when there is nothing to prompt for.
     */
    describe('the school overview prompt', () => {
        const unscheduledMoneySkills = {
            id: '9',
            subject: { id: SUBJECT_ID, name: 'Money Skills', programmeType: SubjectProgrammeType.MONEY_SKILLS }
        };

        it('prompts an entitled school for a published subject it has not scheduled', async () => {
            wholeSchoolSequenceQueryBuilder.getMany.mockResolvedValue([unscheduledMoneySkills]);
            schoolClassQueryBuilder.getMany.mockResolvedValue([entitledClass('1', '0', 'Reception')]);

            await expect(service.getWholeSchoolAutoSchedulePrompts(SCHOOL_ID)).resolves.toEqual([
                { subjectId: SUBJECT_ID, subjectName: 'Money Skills', programmeType: SubjectProgrammeType.MONEY_SKILLS, isAvailable: true }
            ]);
        });

        it('asks only for published sequences the school holds no live run of', async () => {
            await service.getWholeSchoolAutoSchedulePrompts(SCHOOL_ID);

            expect(wholeSchoolSequenceQueryBuilder.where).toHaveBeenCalledWith('wholeSchoolSequence.status = :status', {
                status: WholeSchoolSequenceStatus.PUBLISHED
            });
            expect(wholeSchoolSequenceQueryBuilder.leftJoin).toHaveBeenCalledWith(
                LwpWholeSchoolSequenceAssignment,
                'assignment',
                expect.stringContaining('assignment.status = :assigned'),
                { assigned: SequenceAssignmentStatus.ASSIGNED }
            );
            expect(wholeSchoolSequenceQueryBuilder.andWhere).toHaveBeenCalledWith('assignment.id IS NULL');
            expect(wholeSchoolSequenceQueryBuilder.andWhere).toHaveBeenCalledWith('subject.programmeType != :fullProgramme', {
                fullProgramme: SubjectProgrammeType.FULL_PROGRAMME
            });
        });

        it('prompts for nothing, and reads no classes, when nothing is published or everything is scheduled', async () => {
            wholeSchoolSequenceQueryBuilder.getMany.mockResolvedValue([]);

            await expect(service.getWholeSchoolAutoSchedulePrompts(SCHOOL_ID)).resolves.toEqual([]);
            expect(schoolClassQueryBuilder.getMany).not.toHaveBeenCalled();
        });

        it('prompts for nothing when the school does not hold the licence', async () => {
            wholeSchoolSequenceQueryBuilder.getMany.mockResolvedValue([unscheduledMoneySkills]);
            schoolClassQueryBuilder.getMany.mockResolvedValue([
                { ...entitledClass('1', '0', 'Reception'), school: { isMoneySkillsAvailable: false } }
            ]);

            await expect(service.getWholeSchoolAutoSchedulePrompts(SCHOOL_ID)).resolves.toEqual([]);
        });

        it('prompts for nothing when no class in the current year could take the subject', async () => {
            wholeSchoolSequenceQueryBuilder.getMany.mockResolvedValue([unscheduledMoneySkills]);
            schoolClassQueryBuilder.getMany.mockResolvedValue([]);

            await expect(service.getWholeSchoolAutoSchedulePrompts(SCHOOL_ID)).resolves.toEqual([]);
        });
    });

    /*
     * The Money Skills welcome modal. Whether to show it is decided on the school overview from the prompts
     * above and the leader's user; the service only records that they saw it.
     */
    describe('the Money Skills welcome modal', () => {
        it('records when the leader saw it, on their own user row', async () => {
            await expect(service.markMoneySkillsWelcomeSeen('user-1')).resolves.toBe(true);

            expect(userUpdate).toHaveBeenCalledWith('user-1', { lastMoneySkillsAutoScheduleWelcomeSeen: expect.any(Date) });
        });
    });
});
