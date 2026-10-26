import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SequenceTimingMode } from 'lwp-shared/enums';
import moment from 'moment';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Connection, Repository } from 'typeorm';

import { CreateTopicSequenceInput } from '../dtos/CreateTopicSequenceInput';
import { LwpClassSequenceAssignment } from '../entities/class_sequence_assignment';
import { StaticLwpPeriod } from '../entities/static_period';
import { StaticLwpTopic } from '../entities/static_topic';
import { StaticLwpTopicDomainYearGroup } from '../entities/static_topic_domain_year_group';
import { StaticLwpTopicSequence } from '../entities/static_topic_sequence';
import { StaticLwpTopicSequenceItem } from '../entities/static_topic_sequence_item';
import {
    assertIntervalMatchesTimingMode,
    assertItemDatesWithinPeriod,
    assertPeriodMatchesTimingMode,
    type DatedSequenceItem,
    resolveSequenceItemDates,
    TopicSequenceService
} from './topic_sequence.service';

const asDate = (value: string): Date => new Date(`${value}T00:00:00`);
const format = (value: Date): string => moment(value).format('YYYY-MM-DD');

/** A query builder mock where every chained call returns itself and the terminals are stubs. */
const chainableQueryBuilder = (): Record<string, jest.Mock> => {
    const builder = {
        innerJoin: jest.fn(),
        innerJoinAndSelect: jest.fn(),
        leftJoin: jest.fn(),
        leftJoinAndSelect: jest.fn(),
        where: jest.fn(),
        andWhere: jest.fn(),
        select: jest.fn(),
        addSelect: jest.fn(),
        groupBy: jest.fn(),
        addGroupBy: jest.fn(),
        orderBy: jest.fn(),
        addOrderBy: jest.fn(),
        getOne: jest.fn(),
        getMany: jest.fn(),
        getRawMany: jest.fn(),
        count: jest.fn()
    };

    builder.innerJoin.mockReturnValue(builder);
    builder.innerJoinAndSelect.mockReturnValue(builder);
    builder.leftJoin.mockReturnValue(builder);
    builder.leftJoinAndSelect.mockReturnValue(builder);
    builder.where.mockReturnValue(builder);
    builder.andWhere.mockReturnValue(builder);
    builder.select.mockReturnValue(builder);
    builder.addSelect.mockReturnValue(builder);
    builder.groupBy.mockReturnValue(builder);
    builder.addGroupBy.mockReturnValue(builder);
    builder.orderBy.mockReturnValue(builder);
    builder.addOrderBy.mockReturnValue(builder);

    return builder;
};

describe('resolveSequenceItemDates', () => {
    describe('INTERVAL', () => {
        /*
         * An interval sequence's items carry no dates (LEA-6594). The anchor belongs to the class it
         * is given to, and the teacher supplies it at assignment time.
         *
         * The sequence does still carry a cadence, and this function deliberately does not read it:
         * the cadence says how far apart a class runs the topics, which is applied when the class is
         * given the sequence rather than when the template is saved. So `SequenceTiming` is the mode
         * and nothing else, and there is nothing here for a caller to get wrong.
         */
        const timing = { timingMode: SequenceTimingMode.INTERVAL };

        it('stores the order and no dates at all', () => {
            const resolved = resolveSequenceItemDates(timing, [
                { topicId: '1', order: 1 },
                { topicId: '2', order: 2 },
                { topicId: '3', order: 3 }
            ]);

            expect(resolved).toEqual([
                { topicId: '1', order: 1, startDate: null, endDate: null },
                { topicId: '2', order: 2, startDate: null, endDate: null },
                { topicId: '3', order: 3, startDate: null, endDate: null }
            ]);
        });

        it('respects the order the admin set rather than the order the items arrived in', () => {
            const resolved = resolveSequenceItemDates(timing, [
                { topicId: 'third', order: 3 },
                { topicId: 'first', order: 1 },
                { topicId: 'second', order: 2 }
            ]);

            expect(resolved.map((item) => item.topicId)).toEqual(['first', 'second', 'third']);
            expect(resolved.map((item) => item.order)).toEqual([1, 2, 3]);
        });

        it('renumbers from 1 so a removed topic leaves no gap', () => {
            const resolved = resolveSequenceItemDates(timing, [
                { topicId: '1', order: 1 },
                { topicId: '3', order: 3 }
            ]);

            expect(resolved.map((item) => item.order)).toEqual([1, 2]);
        });

        it('ignores any dates sent for an interval sequence', () => {
            // The admin form does not send these, but the API must not store them if anything does:
            // a dated interval item would be read as meaningful by whatever came looking.
            const resolved = resolveSequenceItemDates(timing, [
                { topicId: '1', order: 1, startDate: asDate('2020-01-01'), endDate: asDate('2020-02-01') }
            ]);

            expect(resolved[0].startDate).toBeNull();
            expect(resolved[0].endDate).toBeNull();
        });

        /**
         * The mode is the whole of what settling the item dates depends on.
         *
         * An interval and an anchor used to be required here, purely so the item dates could be
         * generated from them. LEA-6594 stopped generating them, so neither is read: the cadence is
         * applied at assignment time and the anchor is the class's.
         */
        it('needs nothing but the timing mode', () => {
            expect(resolveSequenceItemDates({ timingMode: SequenceTimingMode.INTERVAL }, [{ topicId: '1', order: 1 }])).toEqual([
                { topicId: '1', order: 1, startDate: null, endDate: null }
            ]);
        });
    });

    describe('FIXED', () => {
        const timing = { timingMode: SequenceTimingMode.FIXED };

        it('derives the order from the dates, chronologically', () => {
            const resolved = resolveSequenceItemDates(timing, [
                { topicId: 'october', startDate: asDate('2026-10-01'), endDate: asDate('2026-10-10') },
                { topicId: 'september', startDate: asDate('2026-09-01'), endDate: asDate('2026-09-05') },
                { topicId: 'november', startDate: asDate('2026-11-01'), endDate: asDate('2026-11-30') }
            ]);

            expect(resolved.map((item) => item.topicId)).toEqual(['september', 'october', 'november']);
            expect(resolved.map((item) => item.order)).toEqual([1, 2, 3]);
        });

        it('keeps the dates the admin entered, gaps and irregular lengths included', () => {
            const resolved = resolveSequenceItemDates(timing, [
                { topicId: '1', startDate: asDate('2026-09-01'), endDate: asDate('2026-09-02') },
                { topicId: '2', startDate: asDate('2026-12-01'), endDate: asDate('2027-01-15') }
            ]);

            expect(resolved.map((item) => ({ startDate: format(item.startDate), endDate: format(item.endDate) }))).toEqual([
                { startDate: '2026-09-01', endDate: '2026-09-02' },
                { startDate: '2026-12-01', endDate: '2027-01-15' }
            ]);
        });

        it('ignores any order sent for a fixed sequence', () => {
            const resolved = resolveSequenceItemDates(timing, [
                { topicId: 'later', order: 1, startDate: asDate('2026-10-01'), endDate: asDate('2026-10-02') },
                { topicId: 'earlier', order: 2, startDate: asDate('2026-09-01'), endDate: asDate('2026-09-02') }
            ]);

            expect(resolved.map((item) => item.topicId)).toEqual(['earlier', 'later']);
        });

        it('allows a single day window', () => {
            const resolved = resolveSequenceItemDates(timing, [
                { topicId: '1', startDate: asDate('2026-09-01'), endDate: asDate('2026-09-01') }
            ]);

            expect(resolved).toHaveLength(1);
        });

        it('rejects a missing start date', () => {
            expect(() => resolveSequenceItemDates(timing, [{ topicId: '1', endDate: asDate('2026-09-02') }])).toThrow(
                'Every topic in a fixed sequence needs a start date'
            );
        });

        it.each([
            ['omitted', { topicId: '1', startDate: asDate('2026-09-01') }],
            ['explicitly null', { topicId: '1', startDate: asDate('2026-09-01'), endDate: null }]
        ])('allows an end date that is %s, as a manually scheduled topic may leave it open', (_label, item) => {
            const resolved = resolveSequenceItemDates(timing, [item]);

            expect(resolved).toEqual([{ topicId: '1', order: 1, startDate: expect.any(Date), endDate: null }]);
        });

        it('still orders by start date when some topics have no end date', () => {
            const resolved = resolveSequenceItemDates(timing, [
                { topicId: 'later', startDate: asDate('2026-10-01') },
                { topicId: 'earlier', startDate: asDate('2026-09-01'), endDate: asDate('2026-09-05') }
            ]);

            expect(resolved.map((item) => item.topicId)).toEqual(['earlier', 'later']);
        });

        it('rejects a topic that ends before it starts', () => {
            expect(() =>
                resolveSequenceItemDates(timing, [{ topicId: '1', startDate: asDate('2026-09-10'), endDate: asDate('2026-09-01') }])
            ).toThrow('A topic cannot end before it starts');
        });
    });

    describe('rules that apply to both modes', () => {
        it.each([SequenceTimingMode.FIXED, SequenceTimingMode.INTERVAL])('rejects a %s sequence with no topics', (timingMode) => {
            expect(() => resolveSequenceItemDates({ timingMode }, [])).toThrow('A sequence needs at least one topic');
        });

        it('rejects the same topic appearing twice', () => {
            expect(() =>
                resolveSequenceItemDates({ timingMode: SequenceTimingMode.INTERVAL }, [
                    { topicId: '5', order: 1 },
                    { topicId: '5', order: 2 }
                ])
            ).toThrow('A sequence cannot contain the same topic twice');
        });

        it('throws HttpExceptions, so the failures surface as GraphQL errors', () => {
            expect(() => resolveSequenceItemDates({ timingMode: SequenceTimingMode.FIXED }, [])).toThrow(HttpException);
        });
    });
});

describe('assertPeriodMatchesTimingMode', () => {
    // The academic year belongs to FIXED sequences and only to them. INTERVAL sequences carry no
    // dates, belong to no year, and are offered in every academic year forever.

    it('accepts a fixed sequence that declares its year', () => {
        expect(() => assertPeriodMatchesTimingMode(SequenceTimingMode.FIXED, 12)).not.toThrow();
    });

    it.each([
        ['undefined', undefined],
        ['null', null]
    ])('rejects a fixed sequence with a %s year', (_label, periodIndex) => {
        expect(() => assertPeriodMatchesTimingMode(SequenceTimingMode.FIXED, periodIndex)).toThrow(
            'A fixed sequence needs the academic year it is for'
        );
    });

    it.each([
        ['undefined', undefined],
        ['null', null]
    ])('accepts an interval sequence with a %s year', (_label, periodIndex) => {
        expect(() => assertPeriodMatchesTimingMode(SequenceTimingMode.INTERVAL, periodIndex)).not.toThrow();
    });

    it('rejects an interval sequence that was given a year rather than ignoring it', () => {
        // The only way to send one is a form that switched timing mode without clearing its state.
        // Storing it would leave a year every later read has to remember to ignore.
        expect(() => assertPeriodMatchesTimingMode(SequenceTimingMode.INTERVAL, 12)).toThrow(
            'An interval sequence is not tied to an academic year'
        );
    });

    it('treats period index 0 as a real year rather than as absent', () => {
        // Guards against a falsy check: index 0 is a valid period, and a `!periodIndex` test would
        // reject a fixed sequence declaring it and accept an interval sequence carrying it.
        expect(() => assertPeriodMatchesTimingMode(SequenceTimingMode.FIXED, 0)).not.toThrow();
        expect(() => assertPeriodMatchesTimingMode(SequenceTimingMode.INTERVAL, 0)).toThrow(
            'An interval sequence is not tied to an academic year'
        );
    });

    it('throws HttpExceptions, so the failures surface as GraphQL errors', () => {
        expect(() => assertPeriodMatchesTimingMode(SequenceTimingMode.FIXED, null)).toThrow(HttpException);
    });
});

describe('assertIntervalMatchesTimingMode', () => {
    // The cadence belongs to INTERVAL sequences and only to them. It is a Learning with Parents
    // decision rather than a school's, so it lives on the template and no teacher is asked for it.

    it('accepts an interval sequence that declares its cadence', () => {
        expect(() => assertIntervalMatchesTimingMode(SequenceTimingMode.INTERVAL, 7)).not.toThrow();
    });

    it.each([
        ['undefined', undefined],
        ['null', null]
    ])('rejects an interval sequence with a %s cadence', (_label, intervalDays) => {
        // Without one the sequence can never be assigned, and since a teacher is not offered a
        // cadence of their own there would be no way for a school to rescue it.
        expect(() => assertIntervalMatchesTimingMode(SequenceTimingMode.INTERVAL, intervalDays)).toThrow(
            'An interval sequence needs the number of days between its topics'
        );
    });

    it.each([
        ['zero', 0],
        ['negative', -7]
    ])('rejects a %s cadence, which describes no schedule', (_label, intervalDays) => {
        expect(() => assertIntervalMatchesTimingMode(SequenceTimingMode.INTERVAL, intervalDays)).toThrow(
            'The days between topics must be a whole number of at least 1'
        );
    });

    it('rejects a fractional cadence rather than rounding it', () => {
        // The GraphQL scalar for a number here is Float, so this is expressible. Half a day is not
        // something a schedule can express, and choosing 7 or 8 for the admin would be worse.
        expect(() => assertIntervalMatchesTimingMode(SequenceTimingMode.INTERVAL, 7.5)).toThrow(
            'The days between topics must be a whole number of at least 1'
        );
    });

    it('accepts a cadence of a single day, which is the smallest real schedule', () => {
        expect(() => assertIntervalMatchesTimingMode(SequenceTimingMode.INTERVAL, 1)).not.toThrow();
    });

    it.each([
        ['undefined', undefined],
        ['null', null]
    ])('accepts a fixed sequence with a %s cadence', (_label, intervalDays) => {
        expect(() => assertIntervalMatchesTimingMode(SequenceTimingMode.FIXED, intervalDays)).not.toThrow();
    });

    it('rejects a fixed sequence that was given a cadence rather than ignoring it', () => {
        // Mirrors the academic year rule: the only way to send one is a form that switched timing
        // mode without clearing its state, and storing it would leave a value every later read has
        // to remember to ignore.
        expect(() => assertIntervalMatchesTimingMode(SequenceTimingMode.FIXED, 7)).toThrow(
            'A fixed sequence sets a date on each topic, so it cannot be given an interval'
        );
    });

    it('treats a zero cadence on a fixed sequence as present rather than as absent', () => {
        // Guards against a falsy check, as the period rule does for index 0: 0 is not a valid
        // cadence, but it is a value that was sent, and a `!intervalDays` test would wave it through.
        expect(() => assertIntervalMatchesTimingMode(SequenceTimingMode.FIXED, 0)).toThrow(
            'A fixed sequence sets a date on each topic, so it cannot be given an interval'
        );
    });

    it('throws HttpExceptions, so the failures surface as GraphQL errors', () => {
        expect(() => assertIntervalMatchesTimingMode(SequenceTimingMode.INTERVAL, null)).toThrow(HttpException);
    });
});

describe('assertItemDatesWithinPeriod', () => {
    const period = (overrides: Partial<StaticLwpPeriod> = {}): StaticLwpPeriod =>
        ({
            index: 12,
            shortName: '2026-27',
            startDate: asDate('2026-09-01'),
            endDate: asDate('2027-07-31'),
            ...overrides
        }) as StaticLwpPeriod;

    const item = (startDate: string, endDate?: string): DatedSequenceItem => ({
        topicId: '1',
        order: 1,
        startDate: asDate(startDate),
        endDate: endDate ? asDate(endDate) : null
    });

    it('accepts items wholly inside the academic year', () => {
        expect(() => assertItemDatesWithinPeriod([item('2026-09-08', '2026-09-14'), item('2027-01-12')], period())).not.toThrow();
    });

    it('accepts an item that starts on the first day and one that ends on the last', () => {
        // Inclusive bounds: the first and last day of the year are inside it.
        expect(() => assertItemDatesWithinPeriod([item('2026-09-01'), item('2027-07-01', '2027-07-31')], period())).not.toThrow();
    });

    it('rejects an item starting before the year does', () => {
        expect(() => assertItemDatesWithinPeriod([item('2026-08-31')], period())).toThrow(
            'One topic falls outside 2026-27, which runs from 2026-09-01 to 2027-07-31'
        );
    });

    it('rejects an item starting after the year ends', () => {
        expect(() => assertItemDatesWithinPeriod([item('2027-09-01')], period())).toThrow('One topic falls outside 2026-27');
    });

    it('rejects an item whose window runs past the year end, even though it starts inside', () => {
        // A topic given a long window late in the year. This used to be the INTERVAL case, where a
        // fortnightly run anchored in late July generated a window past the year end; interval
        // sequences no longer reach this function at all, but the rule still holds for a fixed
        // sequence whose last topic has an explicit end date.
        expect(() => assertItemDatesWithinPeriod([item('2027-07-30', '2027-08-12')], period())).toThrow('One topic falls outside 2026-27');
    });

    it('counts every offending item, so the admin does not fix them one at a time', () => {
        expect(() => assertItemDatesWithinPeriod([item('2026-08-01'), item('2027-09-01'), item('2026-10-01')], period())).toThrow(
            '2 topics fall outside 2026-27'
        );
    });

    it('ignores a missing end date, which is optional in FIXED mode', () => {
        expect(() => assertItemDatesWithinPeriod([item('2027-07-31')], period())).not.toThrow();
    });

    it.each([
        ['no start date', { startDate: null }],
        ['no end date', { endDate: null }]
    ])('refuses to validate against a period with %s, naming the period', (_label, overrides) => {
        expect(() => assertItemDatesWithinPeriod([item('2026-09-08')], period(overrides as Partial<StaticLwpPeriod>))).toThrow(
            'The academic year 2026-27 has no start and end dates set'
        );
    });

    it('refuses a zero-length period, which is what the academic year form defaults to', () => {
        // AddAcademicYear.jsx seeds both pickers with today and Yup does not require either, so a
        // period created without touching them has start === end. That is not a year.
        const sameDay = period({ startDate: asDate('2026-09-01'), endDate: asDate('2026-09-01') });

        expect(() => assertItemDatesWithinPeriod([item('2026-09-01')], sameDay)).toThrow('which is not a usable range');
    });

    it('falls back to the period index when the period has no short name', () => {
        expect(() => assertItemDatesWithinPeriod([item('2026-08-01')], period({ shortName: null }))).toThrow('falls outside period 12');
    });

    it('throws HttpExceptions, so the failures surface as GraphQL errors', () => {
        expect(() => assertItemDatesWithinPeriod([item('2020-01-01')], period())).toThrow(HttpException);
    });
});

describe('TopicSequenceService', () => {
    let service: TopicSequenceService;
    let sequenceRepository: Partial<Repository<StaticLwpTopicSequence>>;
    let sequenceItemRepository: Partial<Repository<StaticLwpTopicSequenceItem>>;
    let topicDomainYearGroupRepository: Partial<Repository<StaticLwpTopicDomainYearGroup>>;
    let topicRepository: Partial<Repository<StaticLwpTopic>>;
    let periodRepository: Partial<Repository<StaticLwpPeriod>>;
    let assignmentRepository: Partial<Repository<LwpClassSequenceAssignment>>;

    let sequenceBuilder: ReturnType<typeof chainableQueryBuilder>;
    let sequenceItemBuilder: ReturnType<typeof chainableQueryBuilder>;
    let scopeBuilder: ReturnType<typeof chainableQueryBuilder>;
    /** Answers which candidate topics carry a set-by-teacher step. Empty unless a test says otherwise. */
    let setByTeacherBuilder: ReturnType<typeof chainableQueryBuilder>;
    /** Answers which sequences have ever been assigned. Empty unless a test says otherwise. */
    let assignmentBuilder: ReturnType<typeof chainableQueryBuilder>;

    beforeEach(async () => {
        sequenceBuilder = chainableQueryBuilder();
        sequenceItemBuilder = chainableQueryBuilder();
        scopeBuilder = chainableQueryBuilder();
        setByTeacherBuilder = chainableQueryBuilder();
        // No candidate needs a teacher photo unless a test says one does, which is the ordinary case.
        setByTeacherBuilder.getRawMany.mockResolvedValue([]);

        sequenceRepository = { createQueryBuilder: jest.fn().mockReturnValue(sequenceBuilder), delete: jest.fn() };
        sequenceItemRepository = { createQueryBuilder: jest.fn().mockReturnValue(sequenceItemBuilder), count: jest.fn() };
        topicDomainYearGroupRepository = { createQueryBuilder: jest.fn().mockReturnValue(scopeBuilder) };
        topicRepository = { createQueryBuilder: jest.fn().mockReturnValue(setByTeacherBuilder) };
        // No sequence has been assigned unless a test says otherwise, which is the ordinary case.
        assignmentBuilder = chainableQueryBuilder();
        assignmentBuilder.getRawMany.mockResolvedValue([]);
        assignmentRepository = { createQueryBuilder: jest.fn().mockReturnValue(assignmentBuilder) };
        // A whole academic year by default, so the period check passes unless a test narrows it.
        periodRepository = {
            findOne: jest.fn().mockResolvedValue({
                index: 12,
                shortName: '2026-27',
                startDate: asDate('2026-09-01'),
                endDate: asDate('2027-07-31')
            })
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TopicSequenceService,
                { provide: getRepositoryToken(StaticLwpTopicSequence), useValue: sequenceRepository },
                { provide: getRepositoryToken(StaticLwpTopicSequenceItem), useValue: sequenceItemRepository },
                { provide: getRepositoryToken(StaticLwpTopicDomainYearGroup), useValue: topicDomainYearGroupRepository },
                { provide: getRepositoryToken(StaticLwpTopic), useValue: topicRepository },
                { provide: getRepositoryToken(StaticLwpPeriod), useValue: periodRepository },
                { provide: getRepositoryToken(LwpClassSequenceAssignment), useValue: assignmentRepository },
                { provide: ShallowUserService, useValue: { newShallowUser: jest.fn().mockReturnValue({ id: '1' }) } },
                { provide: Connection, useValue: { transaction: jest.fn() } }
            ]
        }).compile();

        service = module.get<TopicSequenceService>(TopicSequenceService);
    });

    /** An interval sequence: no academic year, but a cadence, which the API requires of one. */
    const createInput = (): CreateTopicSequenceInput => ({
        name: 'Money Skills Reception Autumn',
        subjectId: '4',
        yearGroupId: '2',
        timingMode: SequenceTimingMode.INTERVAL,
        intervalDays: 7,
        items: [
            { topicId: '10', order: 1 },
            { topicId: '11', order: 2 }
        ]
    });

    /** A fixed sequence, which does declare one. Its items sit inside the default mocked period. */
    const createFixedInput = (): CreateTopicSequenceInput => ({
        name: 'Money Skills Reception Autumn',
        subjectId: '4',
        yearGroupId: '2',
        periodIndex: 12,
        timingMode: SequenceTimingMode.FIXED,
        items: [
            { topicId: '10', order: 1, startDate: asDate('2026-09-07') },
            { topicId: '11', order: 2, startDate: asDate('2026-09-14') }
        ]
    });

    describe('scope validation', () => {
        it('rejects a topic that does not resolve for the sequence subject and year group', async () => {
            // only topic 10 comes back for this (subject, year group), so topic 11 is out of scope
            scopeBuilder.getRawMany.mockResolvedValue([{ topicId: '10' }]);

            await expect(service.createSequence(createInput(), '1')).rejects.toThrow(
                "These topics do not belong to the sequence's subject and year group: 11"
            );
        });

        it('names every out-of-scope topic, not just the first', async () => {
            scopeBuilder.getRawMany.mockResolvedValue([]);

            await expect(service.createSequence(createInput(), '1')).rejects.toThrow(/10, 11/);
        });

        it('filters by both the subject and the year group', async () => {
            scopeBuilder.getRawMany.mockResolvedValue([{ topicId: '10' }, { topicId: '11' }]);

            await service.createSequence(createInput(), '1').catch(() => undefined);

            expect(scopeBuilder.andWhere).toHaveBeenCalledWith('subject.id = :subjectId', { subjectId: '4' });
            expect(scopeBuilder.andWhere).toHaveBeenCalledWith('yearGroup.id = :yearGroupId', { yearGroupId: '2' });
        });

        /**
         * The picker never offers these, so reaching here means a direct API call, or a sequence being
         * re-saved after one of its topics gained a set-by-teacher step. Refused either way: assigning
         * a sequence never collects a photo, so such a topic would reach pupils as an empty step.
         */
        it('rejects a topic that needs a photo from the teacher', async () => {
            scopeBuilder.getRawMany.mockResolvedValue([{ topicId: '10' }, { topicId: '11' }]);
            setByTeacherBuilder.getRawMany.mockResolvedValue([{ id: '11' }]);

            await expect(service.createSequence(createInput(), '1')).rejects.toThrow(
                'These topics need a photo from the teacher, so they have to be scheduled by hand rather than in a sequence: 11'
            );
        });

        it('checks the scope before the photos, so the more basic problem is reported first', async () => {
            scopeBuilder.getRawMany.mockResolvedValue([{ topicId: '10' }]);
            setByTeacherBuilder.getRawMany.mockResolvedValue([{ id: '10' }]);

            await expect(service.createSequence(createInput(), '1')).rejects.toThrow(/do not belong to the sequence/);
        });

        /**
         * The items are settled before anything is asked of the database, so a malformed sequence
         * costs no query at all.
         *
         * Proved with a duplicate topic rather than with a missing cadence. A missing cadence is
         * rejected too, and even earlier, but it is refused by `assertIntervalMatchesTimingMode`
         * before the items are looked at, so it would pass this test without saying anything about
         * the items. The duplicate is caught in the item pass itself, which is what is under test.
         */
        it('validates the items before going near the database', async () => {
            const duplicated = {
                ...createInput(),
                items: [
                    { topicId: '10', order: 1 },
                    { topicId: '10', order: 2 }
                ]
            };

            await expect(service.createSequence(duplicated, '1')).rejects.toThrow('A sequence cannot contain the same topic twice');

            expect(topicDomainYearGroupRepository.createQueryBuilder).not.toHaveBeenCalled();
        });
    });

    describe('the academic year is FIXED-only', () => {
        beforeEach(() => {
            scopeBuilder.getRawMany.mockResolvedValue([{ topicId: '10' }, { topicId: '11' }]);
        });

        it('never loads a period for an interval sequence, so the check costs no query', async () => {
            await service.createSequence(createInput(), '1').catch(() => undefined);

            expect(periodRepository.findOne).not.toHaveBeenCalled();
        });

        it('loads the declared period for a fixed sequence', async () => {
            await service.createSequence(createFixedInput(), '1').catch(() => undefined);

            expect(periodRepository.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { index: 12 } }));
        });

        it('rejects a fixed sequence with no academic year, before any query', async () => {
            await expect(service.createSequence({ ...createFixedInput(), periodIndex: undefined }, '1')).rejects.toThrow(
                'A fixed sequence needs the academic year it is for'
            );

            expect(periodRepository.findOne).not.toHaveBeenCalled();
            expect(topicDomainYearGroupRepository.createQueryBuilder).not.toHaveBeenCalled();
        });

        it('rejects an interval sequence that was given an academic year, before any query', async () => {
            // A form that switched timing mode without clearing its state is the only way to send this.
            await expect(service.createSequence({ ...createInput(), periodIndex: 12 }, '1')).rejects.toThrow(
                'An interval sequence is not tied to an academic year'
            );

            expect(periodRepository.findOne).not.toHaveBeenCalled();
            expect(topicDomainYearGroupRepository.createQueryBuilder).not.toHaveBeenCalled();
        });

        it('still refuses a fixed sequence whose topics fall outside the year it declares', async () => {
            const outside = { ...createFixedInput(), items: [{ topicId: '10', order: 1, startDate: asDate('2025-09-07') }] };

            await expect(service.createSequence(outside, '1')).rejects.toThrow('One topic falls outside 2026-27');
        });
    });

    /**
     * Drives the admin form's lock on the academic year. Once a sequence has been given to a class,
     * its year describes class topics that already exist, so it must not change.
     */
    describe('getSequenceAssignmentUsage', () => {
        it('answers in the order the ids were asked for, which is what the loader relies on', async () => {
            assignmentBuilder.getRawMany.mockResolvedValue([{ sequenceId: '2' }]);

            expect(await service.getSequenceAssignmentUsage(['1', '2', '3'])).toEqual([false, true, false]);
        });

        it('answers false for every sequence when none has been assigned', async () => {
            assignmentBuilder.getRawMany.mockResolvedValue([]);

            expect(await service.getSequenceAssignmentUsage(['1', '2'])).toEqual([false, false]);
        });

        it('asks nothing when there are no ids, so the IN clause is never built empty', async () => {
            expect(await service.getSequenceAssignmentUsage([])).toEqual([]);
            expect(assignmentBuilder.getRawMany).not.toHaveBeenCalled();
        });

        /** Ids arrive as strings from GraphQL and as numbers from raw rows, so both sides coerce. */
        it('matches ids whatever type they arrive as', async () => {
            assignmentBuilder.getRawMany.mockResolvedValue([{ sequenceId: 7 as never }]);

            expect(await service.getSequenceAssignmentUsage(['7'])).toEqual([true]);
        });

        /**
         * Deliberately not filtered by status. A removal keeps the released class topics and the
         * assignment row they point at, so the year still describes real data and stays locked.
         */
        it('does not filter the assignments by status', async () => {
            assignmentBuilder.getRawMany.mockResolvedValue([]);

            await service.getSequenceAssignmentUsage(['1']);

            expect(assignmentBuilder.andWhere).not.toHaveBeenCalled();
        });
    });

    describe('getSequences', () => {
        it('applies each filter that is supplied', async () => {
            sequenceBuilder.getMany.mockResolvedValue([]);

            await service.getSequences({ subjectId: '4', yearGroupId: '2', search: ' autumn ' });

            expect(sequenceBuilder.andWhere).toHaveBeenCalledWith('subject.id = :subjectId', { subjectId: '4' });
            expect(sequenceBuilder.andWhere).toHaveBeenCalledWith('yearGroup.id = :yearGroupId', { yearGroupId: '2' });
            expect(sequenceBuilder.andWhere).toHaveBeenCalledWith('sequence.name ILIKE :search', { search: '%autumn%' });
        });

        it('applies none of the caller filters when none are supplied', async () => {
            sequenceBuilder.getMany.mockResolvedValue([]);

            await service.getSequences(undefined);

            // The academic year narrowing below is not a caller filter and is always applied, so this
            // asserts the absence of each optional clause rather than of any clause at all.
            expect(sequenceBuilder.andWhere).not.toHaveBeenCalledWith('subject.id = :subjectId', expect.anything());
            expect(sequenceBuilder.andWhere).not.toHaveBeenCalledWith('yearGroup.id = :yearGroupId', expect.anything());
            expect(sequenceBuilder.andWhere).not.toHaveBeenCalledWith('sequence.name ILIKE :search', expect.anything());
        });

        /**
         * The reversal at the heart of LEA-6586. The list used to narrow to the current academic year
         * and later, which was right while an admin could only edit from here and exactly backwards
         * once they can delete: the rows they most need to reach were the hidden ones.
         *
         * Asserted as the absence of any year predicate at all rather than of one particular clause,
         * so it fails if the filter is ever reintroduced in a different shape.
         */
        it('narrows by no academic year at all, so finished years can be reached and deleted', async () => {
            sequenceBuilder.getMany.mockResolvedValue([]);

            await service.getSequences(undefined);

            const yearPredicates = sequenceBuilder.andWhere.mock.calls.filter((call) => String(call[0]).includes('period.index'));

            expect(yearPredicates).toEqual([]);
        });

        /**
         * Ordering is what carries the rule now that nothing is filtered out.
         *
         * Asserted by its parts rather than by matching the whole expression, which would only be a
         * copy of the implementation and would agree with any change made to it.
         */
        it('ranks the current academic year first and finished years last', async () => {
            sequenceBuilder.getMany.mockResolvedValue([]);

            await service.getSequences(undefined);

            const rank = String(sequenceBuilder.orderBy.mock.calls[0][0]);

            // 12 is the index the period repository is mocked as currently teaching.
            expect(rank).toContain('period.index = 12');
            expect(rank).toContain('period.index > 12');
            expect(sequenceBuilder.orderBy.mock.calls[0][1]).toEqual('ASC');
        });

        /**
         * Interval sequences carry no academic year, but they are offered in every one of them, so
         * they are exactly as usable this year as a sequence built for it. Ranking them by their
         * missing year would have put the sequences that never go stale below the ones that already
         * have.
         */
        it('ranks an interval sequence with the current year rather than trailing the list', async () => {
            sequenceBuilder.getMany.mockResolvedValue([]);

            await service.getSequences(undefined);

            const rank = String(sequenceBuilder.orderBy.mock.calls[0][0]);

            // The null arm shares the current year's rank rather than having one of its own.
            expect(rank).toContain('period.index IS NULL OR period.index = 12');
        });

        it('orders future years nearest first and finished years most recent first, then by name', async () => {
            sequenceBuilder.getMany.mockResolvedValue([]);

            await service.getSequences(undefined);

            const withinRank = String(sequenceBuilder.addOrderBy.mock.calls[0][0]);

            // Negating the finished ones reverses them without a second, conflicting sort direction.
            expect(withinRank).toContain('period.index < 12 THEN -period.index');
            expect(sequenceBuilder.addOrderBy).toHaveBeenCalledWith('sequence.name', 'ASC');
        });

        /**
         * No period flagged current should not happen, but a plain chronological list is a far better
         * failure than an error, or than a ranking built around a year we could not identify.
         */
        it('falls back to plain chronological order when no period is flagged current', async () => {
            sequenceBuilder.getMany.mockResolvedValue([]);
            (periodRepository.findOne as jest.Mock).mockResolvedValue(undefined);

            await service.getSequences(undefined);

            expect(sequenceBuilder.orderBy).toHaveBeenCalledWith('period.index', 'ASC');
            expect(sequenceBuilder.addOrderBy).toHaveBeenCalledWith('sequence.name', 'ASC');
        });
    });

    describe('getSequence', () => {
        it('throws when the sequence does not exist', async () => {
            sequenceBuilder.getOne.mockResolvedValue(undefined);

            await expect(service.getSequence('404')).rejects.toThrow('Sequence does not exist');
        });

        it('returns the items in sequence order', async () => {
            sequenceBuilder.getOne.mockResolvedValue({ id: '1', items: [] });

            await service.getSequence('1');

            expect(sequenceBuilder.orderBy).toHaveBeenCalledWith('items.order', 'ASC');
        });
    });

    describe('getCandidateTopicsForSequence', () => {
        it('groups the topics by domain', async () => {
            scopeBuilder.getMany.mockResolvedValue([
                { domain: { id: '1', title: 'Types of money' }, topic: { id: '10' } },
                { domain: { id: '1', title: 'Types of money' }, topic: { id: '11' } },
                { domain: { id: '2', title: 'Saving' }, topic: { id: '12' } }
            ]);

            const groups = await service.getCandidateTopicsForSequence('4', '2');

            expect(groups).toEqual([
                { domainId: '1', domainTitle: 'Types of money', topics: [{ id: '10' }, { id: '11' }] },
                { domainId: '2', domainTitle: 'Saving', topics: [{ id: '12' }] }
            ]);
        });

        it('offers only published, visible topics for the given subject and year group', async () => {
            scopeBuilder.getMany.mockResolvedValue([]);

            await service.getCandidateTopicsForSequence('4', '2');

            expect(scopeBuilder.where).toHaveBeenCalledWith('subject.id = :subjectId', { subjectId: '4' });
            expect(scopeBuilder.andWhere).toHaveBeenCalledWith('yearGroup.id = :yearGroupId', { yearGroupId: '2' });
            expect(scopeBuilder.andWhere).toHaveBeenCalledWith('topic.isHidden = :isHidden AND topic.isPublished = :isPublished', {
                isHidden: false,
                isPublished: true
            });
        });

        /**
         * A reading topic belongs to the reading log, which schedules it on its own weekly cadence,
         * so offering one here would let an admin build a sequence that dates it like an ordinary
         * topic. The teacher-facing pickers exclude them the same way.
         */
        it('does not offer reading topics', async () => {
            scopeBuilder.getMany.mockResolvedValue([]);

            await service.getCandidateTopicsForSequence('4', '2');

            expect(scopeBuilder.andWhere).toHaveBeenCalledWith('topic.isReading = :isReading', { isReading: false });
        });

        it('searches on the topic name only when a search term is given', async () => {
            scopeBuilder.getMany.mockResolvedValue([]);

            await service.getCandidateTopicsForSequence('4', '2', '  coins ');

            expect(scopeBuilder.andWhere).toHaveBeenCalledWith('topic.teacherTopicName ILIKE :search', { search: '%coins%' });
        });

        /**
         * A topic needing a photo from the teacher cannot be scheduled through a sequence, because
         * assignment never collects one, so it is not offered at all.
         */
        it('does not offer a topic that needs a photo from the teacher', async () => {
            scopeBuilder.getMany.mockResolvedValue([
                { domain: { id: '1', title: 'Types of money' }, topic: { id: '10' } },
                { domain: { id: '1', title: 'Types of money' }, topic: { id: '11' } }
            ]);
            setByTeacherBuilder.getRawMany.mockResolvedValue([{ id: '11' }]);

            const groups = await service.getCandidateTopicsForSequence('4', '2');

            expect(groups).toEqual([{ domainId: '1', domainTitle: 'Types of money', topics: [{ id: '10' }] }]);
        });

        it('drops a domain entirely when every one of its topics needs a photo', async () => {
            scopeBuilder.getMany.mockResolvedValue([
                { domain: { id: '1', title: 'Types of money' }, topic: { id: '10' } },
                { domain: { id: '2', title: 'Saving' }, topic: { id: '12' } }
            ]);
            setByTeacherBuilder.getRawMany.mockResolvedValue([{ id: '12' }]);

            const groups = await service.getCandidateTopicsForSequence('4', '2');

            expect(groups.map((group) => group.domainId)).toEqual(['1']);
        });

        it('counts only steps on a visible activity, matching the teacher-facing flag', async () => {
            scopeBuilder.getMany.mockResolvedValue([{ domain: { id: '1', title: 'Types of money' }, topic: { id: '10' } }]);

            await service.getCandidateTopicsForSequence('4', '2');

            expect(setByTeacherBuilder.andWhere).toHaveBeenCalledWith('activity.isHidden = false');
            expect(setByTeacherBuilder.andWhere).toHaveBeenCalledWith('step.stepType = :stepType', { stepType: 'SET_BY_TEACHER' });
        });

        it('asks nothing about photos when there are no candidates to ask about', async () => {
            scopeBuilder.getMany.mockResolvedValue([]);

            await service.getCandidateTopicsForSequence('4', '2');

            expect(topicRepository.createQueryBuilder).not.toHaveBeenCalled();
        });
    });

    describe('reorderSequenceItems', () => {
        const intervalSequence = {
            id: '1',
            timingMode: SequenceTimingMode.INTERVAL,
            subject: { id: '4' },
            yearGroup: { id: '2' },
            items: [
                { id: '100', order: 1, topic: { id: '10' } },
                { id: '101', order: 2, topic: { id: '11' } }
            ]
        };

        it('refuses to reorder a fixed sequence, which takes its order from the dates', async () => {
            sequenceBuilder.getOne.mockResolvedValue({ ...intervalSequence, timingMode: SequenceTimingMode.FIXED });

            await expect(service.reorderSequenceItems('1', ['101', '100'], '1')).rejects.toThrow(
                'A fixed sequence is ordered by its topic dates, so change the dates instead of the order'
            );
        });

        it.each([
            ['a topic is missing from the new order', ['100']],
            ['an unknown item is included', ['100', '999']],
            ['an item is listed twice', ['100', '100']]
        ])('rejects the new order when %s', async (_label, orderedItemIds) => {
            sequenceBuilder.getOne.mockResolvedValue(intervalSequence);

            await expect(service.reorderSequenceItems('1', orderedItemIds, '1')).rejects.toThrow(
                'The new order must list every topic in the sequence exactly once'
            );
        });
    });

    describe('removeSequenceItem', () => {
        it('refuses to remove the last topic, because a sequence needs at least one', async () => {
            sequenceItemBuilder.getOne.mockResolvedValue({ id: '100', sequence: { id: '1' } });
            sequenceBuilder.getOne.mockResolvedValue({
                id: '1',
                timingMode: SequenceTimingMode.INTERVAL,
                subject: { id: '4' },
                yearGroup: { id: '2' },
                items: [{ id: '100', order: 1, topic: { id: '10' } }]
            });

            await expect(service.removeSequenceItem('100', '1')).rejects.toThrow('A sequence needs at least one topic');
        });

        it('throws when the item does not exist', async () => {
            sequenceItemBuilder.getOne.mockResolvedValue(undefined);

            await expect(service.removeSequenceItem('404', '1')).rejects.toThrow('Sequence item does not exist');
        });
    });

    describe('deleteSequence', () => {
        it('reports success when a row was removed', async () => {
            (sequenceRepository.delete as jest.Mock).mockResolvedValue({ affected: 1 });

            expect(await service.deleteSequence('1')).toEqual({ status: 'ok', msg: '1 records deleted' });
        });

        it('reports failure when nothing matched', async () => {
            (sequenceRepository.delete as jest.Mock).mockResolvedValue({ affected: 0 });

            expect(await service.deleteSequence('404')).toEqual({ status: 'fail', msg: 'No records deleted' });
        });
    });
});
