import { HttpException } from '@nestjs/common';
import { SequenceTimingMode, SubjectProgrammeType } from 'lwp-shared/enums';
import moment from 'moment';

import {
    ClassSequenceAssignmentService,
    findPastDatedTopicIds,
    isCurrentAcademicYearClass,
    isReleaseDateInPast,
    isSequenceForCurrentAcademicYear,
    planClassTopicDates,
    SequenceAssignmentWrite
} from './class_sequence_assignment.service';
import { ClassTopicWriteEffects, StoredFile } from './class_topic.service';

const asDate = (value: string): Date => new Date(`${value}T00:00:00`);
const format = (value: Date): string => moment(value).format('YYYY-MM-DD');
/** An absent due date reads as "open", since a fixed sequence item may have no end date. */
const windows = (planned: { releaseDate: Date; dueDate: Date | null; topicId: string }[]): string[] =>
    planned.map((item) => `${item.topicId}:${format(item.releaseDate)}..${item.dueDate ? format(item.dueDate) : 'open'}`);

describe('planClassTopicDates', () => {
    const intervalItems = [
        { topicId: 'a', order: 1, startDate: asDate('2026-01-01'), endDate: asDate('2026-01-07') },
        { topicId: 'b', order: 2, startDate: asDate('2026-01-08'), endDate: asDate('2026-01-14') },
        { topicId: 'c', order: 3, startDate: asDate('2026-01-15'), endDate: asDate('2026-01-21') }
    ];

    describe('INTERVAL', () => {
        const timing = { timingMode: SequenceTimingMode.INTERVAL, intervalDays: 7 };

        it('re-anchors the whole sequence to the class start date, ignoring the template dates', () => {
            const planned = planClassTopicDates(timing, intervalItems, asDate('2026-09-07'));

            expect(windows(planned)).toEqual(['a:2026-09-07..2026-09-13', 'b:2026-09-14..2026-09-20', 'c:2026-09-21..2026-09-27']);
        });

        it('gives two classes different dates from the same sequence', () => {
            const autumn = planClassTopicDates(timing, intervalItems, asDate('2026-09-07'));
            const spring = planClassTopicDates(timing, intervalItems, asDate('2027-01-11'));

            expect(format(autumn[0].releaseDate)).toEqual('2026-09-07');
            expect(format(spring[0].releaseDate)).toEqual('2027-01-11');
        });

        it('orders by the sequence order rather than the order the items arrive in', () => {
            const shuffled = [intervalItems[2], intervalItems[0], intervalItems[1]];

            expect(planClassTopicDates(timing, shuffled, asDate('2026-09-07')).map((item) => item.topicId)).toEqual(['a', 'b', 'c']);
        });

        it('requires a start date, because there is nothing to count from without one', () => {
            expect(() => planClassTopicDates(timing, intervalItems)).toThrow('Choose a start date for this class');
        });

        it('reports a sequence whose interval is missing rather than producing wrong dates', () => {
            // Addressed to an admin, not to the teacher reading it: the cadence lives on the
            // sequence (LEA-6624), so a missing one is not something a school can supply.
            expect(() => planClassTopicDates({ timingMode: SequenceTimingMode.INTERVAL }, intervalItems, asDate('2026-09-07'))).toThrow(
                'This sequence is missing its interval'
            );
        });

        /**
         * The leader's own interval is passed in by buildPlan in place of the sequence's, so a class
         * can run at its own pace without an admin building a second sequence for it.
         */
        it('spaces the topics by whatever interval it is given', () => {
            const fortnightly = planClassTopicDates(
                { timingMode: SequenceTimingMode.INTERVAL, intervalDays: 14 },
                intervalItems,
                asDate('2026-09-07')
            );

            expect(windows(fortnightly)).toEqual(['a:2026-09-07..2026-09-20', 'b:2026-09-21..2026-10-04', 'c:2026-10-05..2026-10-18']);
        });

        it('keeps the windows back to back whatever the interval, so there are no gaps', () => {
            const planned = planClassTopicDates(
                { timingMode: SequenceTimingMode.INTERVAL, intervalDays: 3 },
                intervalItems,
                asDate('2026-09-07')
            );

            expect(windows(planned)).toEqual(['a:2026-09-07..2026-09-09', 'b:2026-09-10..2026-09-12', 'c:2026-09-13..2026-09-15']);
        });

        it('accepts an interval of one day, the shortest that means anything', () => {
            const planned = planClassTopicDates(
                { timingMode: SequenceTimingMode.INTERVAL, intervalDays: 1 },
                intervalItems,
                asDate('2026-09-07')
            );

            expect(windows(planned)).toEqual(['a:2026-09-07..2026-09-07', 'b:2026-09-08..2026-09-08', 'c:2026-09-09..2026-09-09']);
        });

        it('refuses an interval below a day, whatever supplied it', () => {
            expect(() =>
                planClassTopicDates({ timingMode: SequenceTimingMode.INTERVAL, intervalDays: 0 }, intervalItems, asDate('2026-09-07'))
            ).toThrow('This sequence is missing its interval');

            expect(() =>
                planClassTopicDates({ timingMode: SequenceTimingMode.INTERVAL, intervalDays: -7 }, intervalItems, asDate('2026-09-07'))
            ).toThrow('This sequence is missing its interval');
        });
    });

    describe('FIXED', () => {
        const timing = { timingMode: SequenceTimingMode.FIXED };

        it('uses the template dates as they stand, keeping gaps and irregular lengths', () => {
            const planned = planClassTopicDates(timing, [
                { topicId: 'a', order: 1, startDate: asDate('2026-09-01'), endDate: asDate('2026-09-04') },
                { topicId: 'b', order: 2, startDate: asDate('2026-11-01'), endDate: asDate('2026-11-30') }
            ]);

            expect(windows(planned)).toEqual(['a:2026-09-01..2026-09-04', 'b:2026-11-01..2026-11-30']);
        });

        it('ignores a start date, since a fixed sequence has no anchor', () => {
            const planned = planClassTopicDates(timing, intervalItems, asDate('2030-01-01'));

            expect(format(planned[0].releaseDate)).toEqual('2026-01-01');
        });

        it.each([
            ['omitted', { topicId: 'open', order: 1, startDate: asDate('2026-09-01') }],
            ['explicitly null', { topicId: 'open', order: 1, startDate: asDate('2026-09-01'), endDate: null }]
        ])('leaves the due date unset when the template end date is %s', (_label, item) => {
            const planned = planClassTopicDates(timing, [item]);

            expect(planned[0].dueDate).toBeNull();
            expect(windows(planned)).toEqual(['open:2026-09-01..open']);
        });

        it('lets a leader supply a due date for a topic the template left open', () => {
            const planned = planClassTopicDates(timing, [{ topicId: 'open', order: 1, startDate: asDate('2026-09-01') }], undefined, [
                { topicId: 'open', releaseDate: asDate('2026-09-01'), dueDate: asDate('2026-09-10') }
            ]);

            expect(windows(planned)).toEqual(['open:2026-09-01..2026-09-10']);
        });

        it('does not reject an open-ended topic when a leader nudges only its release date', () => {
            const planned = planClassTopicDates(timing, [{ topicId: 'open', order: 1, startDate: asDate('2026-09-01') }], undefined, [
                { topicId: 'open', releaseDate: asDate('2026-09-05') }
            ]);

            expect(windows(planned)).toEqual(['open:2026-09-05..open']);
        });
    });

    describe('per-topic overrides', () => {
        const timing = { timingMode: SequenceTimingMode.INTERVAL, intervalDays: 7 };

        it('applies a leader nudge to one topic and leaves the rest alone', () => {
            const planned = planClassTopicDates(timing, intervalItems, asDate('2026-09-07'), [
                { topicId: 'b', releaseDate: asDate('2026-09-16'), dueDate: asDate('2026-09-22') }
            ]);

            expect(windows(planned)).toEqual(['a:2026-09-07..2026-09-13', 'b:2026-09-16..2026-09-22', 'c:2026-09-21..2026-09-27']);
        });

        it('keeps the computed dueDate when only a release date is nudged', () => {
            const planned = planClassTopicDates(timing, intervalItems, asDate('2026-09-07'), [
                { topicId: 'a', releaseDate: asDate('2026-09-08') }
            ]);

            expect(windows(planned)[0]).toEqual('a:2026-09-08..2026-09-13');
        });

        it('ignores an override for a topic that is not in the sequence', () => {
            const planned = planClassTopicDates(timing, intervalItems, asDate('2026-09-07'), [
                { topicId: 'not-in-sequence', releaseDate: asDate('2026-12-01') }
            ]);

            expect(windows(planned)).toEqual(['a:2026-09-07..2026-09-13', 'b:2026-09-14..2026-09-20', 'c:2026-09-21..2026-09-27']);
        });

        it('rejects an override whose due date precedes its release date', () => {
            expect(() =>
                planClassTopicDates(timing, intervalItems, asDate('2026-09-07'), [
                    { topicId: 'a', releaseDate: asDate('2026-09-10'), dueDate: asDate('2026-09-01') }
                ])
            ).toThrow('A topic cannot be due before it is released');
        });
    });

    it('reports an empty sequence as an HttpException', () => {
        expect(() => planClassTopicDates({ timingMode: SequenceTimingMode.FIXED }, [])).toThrow(HttpException);
        expect(() => planClassTopicDates({ timingMode: SequenceTimingMode.FIXED }, [])).toThrow('has no topics to assign');
    });
});

describe('findPastDatedTopicIds', () => {
    const today = asDate('2026-09-10');

    it('finds nothing when everything starts today or later', () => {
        const planned = [
            { topicId: 'today', order: 1, releaseDate: asDate('2026-09-10'), dueDate: asDate('2026-09-16') },
            { topicId: 'future', order: 2, releaseDate: asDate('2026-09-17'), dueDate: asDate('2026-09-23') }
        ];

        expect(findPastDatedTopicIds(planned, today)).toEqual([]);
    });

    it('treats today as allowed, so a leader can start a sequence immediately', () => {
        const planned = [{ topicId: 'today', order: 1, releaseDate: asDate('2026-09-10'), dueDate: asDate('2026-09-16') }];

        expect(findPastDatedTopicIds(planned, today)).toEqual([]);
    });

    it('names every topic that would land in the past, so all of them can be fixed at once', () => {
        const planned = [
            { topicId: 'stale-1', order: 1, releaseDate: asDate('2026-09-01'), dueDate: asDate('2026-09-07') },
            { topicId: 'ok', order: 2, releaseDate: asDate('2026-09-12'), dueDate: asDate('2026-09-18') },
            { topicId: 'stale-2', order: 3, releaseDate: asDate('2026-09-09'), dueDate: asDate('2026-09-15') }
        ];

        expect(findPastDatedTopicIds(planned, today)).toEqual(['stale-1', 'stale-2']);
    });
});

/**
 * The rule behind both the class-level refusal and the whole-school skip.
 *
 * Tested on its own because the leader's preview asks it directly, off a member sequence's items,
 * without building a plan per class. Two callers, two different inputs, one answer: if this drifted
 * the page would promise a topic the run then skipped, or skip one it had promised.
 */
describe('isReleaseDateInPast', () => {
    const today = asDate('2026-09-10');

    it('is false for today, so a sequence starting this morning is still allowed', () => {
        expect(isReleaseDateInPast(asDate('2026-09-10'), today)).toBe(false);
    });

    it('is false for a date still to come', () => {
        expect(isReleaseDateInPast(asDate('2026-09-11'), today)).toBe(false);
    });

    it('is true for yesterday, which is the whole point of the rule', () => {
        expect(isReleaseDateInPast(asDate('2026-09-09'), today)).toBe(true);
    });

    it('compares whole days, so a date later today is not in the past', () => {
        expect(isReleaseDateInPast(new Date('2026-09-10T23:00:00Z'), new Date('2026-09-10T01:00:00Z'))).toBe(false);
    });

    it('treats a missing date as not in the past, because it cannot be shown to be', () => {
        expect(isReleaseDateInPast(null, today)).toBe(false);
        expect(isReleaseDateInPast(undefined, today)).toBe(false);
    });
});

/**
 * Sequenced topics are created through the same shared write as the teacher-facing routes, so the
 * two paths cannot drift. These tests pin that they really go through it, and that the storage rules
 * are wired even though a sequenced topic carries no media yet: LEA-6500 adds photos to this flow.
 */
describe('ClassSequenceAssignmentService#assignSequenceToClass', () => {
    const subject = { id: 'subj-1' };
    const schoolClass = { id: 'class-1', subjects: [], isRegistrationClass: true };
    const topicOne = { id: 'topic-1' };
    const topicTwo = { id: 'topic-2' };

    const sequence = {
        id: 'seq-1',
        name: 'Money Skills Year 1',
        timingMode: SequenceTimingMode.INTERVAL,
        intervalDays: 7,
        subject,
        items: [
            { topic: topicOne, order: 1 },
            { topic: topicTwo, order: 2 }
        ]
    };

    const toCreate = [
        { topicId: 'topic-1', order: 1, releaseDate: asDate('2026-09-07'), dueDate: asDate('2026-09-13') },
        { topicId: 'topic-2', order: 2, releaseDate: asDate('2026-09-14'), dueDate: asDate('2026-09-20') }
    ];

    let service: ClassSequenceAssignmentService;
    let persistClassTopic: jest.Mock;
    let applyEffects: jest.Mock;
    let discardStoredFiles: jest.Mock;
    let transaction: jest.Mock;
    let managerSave: jest.Mock;

    beforeEach(() => {
        persistClassTopic = jest.fn().mockImplementation(() =>
            Promise.resolve({
                classTopic: { id: 'class-topic-1' },
                effects: { supersededFiles: [] }
            })
        );
        applyEffects = jest.fn().mockResolvedValue(undefined);
        discardStoredFiles = jest.fn().mockResolvedValue(undefined);
        managerSave = jest.fn().mockImplementation((row) => Promise.resolve(Object.assign(row, { id: 'assignment-1' })));

        const manager = { create: jest.fn((_entity, values) => values), save: managerSave };

        transaction = jest.fn(async (runInTransaction: (m: unknown) => Promise<unknown>) => runInTransaction(manager));

        const classTopicService = {
            beginClassTopicWrite: jest.fn((_manager, storedFiles) =>
                Promise.resolve({
                    manager,
                    storedFiles,
                    linkedSubjects: new Set(),
                    releaseTime: '4'
                })
            ),
            persistClassTopic,
            applyClassTopicWriteEffects: applyEffects,
            discardStoredFiles
        };

        service = new ClassSequenceAssignmentService(
            {
                createQueryBuilder: () => ({
                    leftJoinAndSelect: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    orderBy: jest.fn().mockReturnThis(),
                    getOne: jest.fn().mockResolvedValue({ id: 'assignment-1' })
                })
            } as never,
            null,
            null,
            null,
            classTopicService as never,
            { newShallowUser: (id: string) => ({ id }) } as never,
            { transaction } as never
        );

        // buildPlan needs a database; the planning arithmetic it performs is covered above.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'buildPlan').mockResolvedValue({
            plan: { sequence, items: [], scheduledCount: 2, skippedCount: 0 },
            schoolClass,
            sequence,
            toCreate
        });
    });

    it('creates every topic through the shared class topic write', async () => {
        await service.assignSequenceToClass({ classId: 'class-1', sequenceId: 'seq-1' } as never, 'user-1');

        expect(persistClassTopic).toHaveBeenCalledTimes(2);
        expect(transaction).toHaveBeenCalledTimes(1);
    });

    it('passes the assignment and the sequence subject so the shared write links it once', async () => {
        await service.assignSequenceToClass({ classId: 'class-1', sequenceId: 'seq-1' } as never, 'user-1');

        expect(persistClassTopic).toHaveBeenCalledWith(
            expect.objectContaining({ linkedSubjects: expect.any(Set) }),
            expect.objectContaining({
                schoolClass,
                topic: topicOne,
                releaseDate: toCreate[0].releaseDate,
                dueDate: toCreate[0].dueDate,
                createdBy: 'user-1',
                classSequenceAssignment: expect.objectContaining({ id: 'assignment-1' }),
                subjectsToLink: [subject]
            })
        );
    });

    it('applies the deferred effects after the commit', async () => {
        await service.assignSequenceToClass({ classId: 'class-1', sequenceId: 'seq-1' } as never, 'user-1');

        expect(applyEffects).toHaveBeenCalledWith([{ supersededFiles: [] }, { supersededFiles: [] }]);
        expect(discardStoredFiles).not.toHaveBeenCalled();
    });

    it('discards anything it stored when the transaction fails', async () => {
        persistClassTopic.mockImplementation((context: { storedFiles: unknown[] }) => {
            context.storedFiles.push({ folder: 'images', filename: 'sequenced.jpg' });

            return Promise.reject(new Error('insert failed'));
        });

        await expect(service.assignSequenceToClass({ classId: 'class-1', sequenceId: 'seq-1' } as never, 'user-1')).rejects.toThrow(
            'insert failed'
        );

        expect(discardStoredFiles).toHaveBeenCalledWith([{ folder: 'images', filename: 'sequenced.jpg' }]);
        expect(applyEffects).not.toHaveBeenCalled();
    });
});

/**
 * The half whole-school auto-scheduling calls once per class (LEA-6681). What matters here is not what
 * it writes, which the suite above already covers through the public method, but the two promises that
 * let a caller wrap several classes in one transaction: it uses the manager it is handed, and it leaves
 * the effects that cannot be rolled back on the caller's arrays rather than acting on them itself.
 */
describe('ClassSequenceAssignmentService#persistSequenceAssignmentForClass', () => {
    const subject = { id: 'subj-1' };
    const topicOne = { id: 'topic-1' };
    const topicTwo = { id: 'topic-2' };

    const sequence = {
        id: 'seq-1',
        name: 'Money Skills Year 1',
        timingMode: SequenceTimingMode.INTERVAL,
        intervalDays: 7,
        subject,
        items: [
            { topic: topicOne, order: 1 },
            { topic: topicTwo, order: 2 }
        ]
    };

    const toCreate = [
        { topicId: 'topic-1', order: 1, releaseDate: asDate('2026-09-07'), dueDate: asDate('2026-09-13') },
        { topicId: 'topic-2', order: 2, releaseDate: asDate('2026-09-14'), dueDate: asDate('2026-09-20') }
    ];

    let service: ClassSequenceAssignmentService;
    let persistClassTopic: jest.Mock;
    let applyEffects: jest.Mock;
    let discardStoredFiles: jest.Mock;
    let transaction: jest.Mock;
    let beginClassTopicWrite: jest.Mock;
    let manager: { create: jest.Mock; save: jest.Mock };

    /** One class's parcel of work, as the caller assembles it from `buildPlan`. */
    const workFor = (classId: string, storedFiles: StoredFile[], effects: ClassTopicWriteEffects[]): SequenceAssignmentWrite => ({
        input: { classId, sequenceId: 'seq-1' } as never,
        schoolClass: { id: classId, subjects: [], isRegistrationClass: true } as never,
        sequence: sequence as never,
        toCreate,
        userId: 'user-1',
        storedFiles,
        effects
    });

    beforeEach(() => {
        persistClassTopic = jest.fn().mockImplementation(() =>
            Promise.resolve({
                classTopic: { id: 'class-topic-1' },
                effects: { supersededFiles: [] }
            })
        );
        applyEffects = jest.fn().mockResolvedValue(undefined);
        discardStoredFiles = jest.fn().mockResolvedValue(undefined);

        let savedCount = 0;

        manager = {
            create: jest.fn((_entity, values) => values),
            save: jest.fn((row) => {
                savedCount += 1;

                return Promise.resolve(Object.assign(row, { id: `assignment-${savedCount}` }));
            })
        };

        beginClassTopicWrite = jest.fn((givenManager, storedFiles) =>
            Promise.resolve({ manager: givenManager, storedFiles, linkedSubjects: new Set(), releaseTime: '4' })
        );

        // Fails the test rather than recording it: the whole point of this half is that it cannot
        // open a transaction, so a caller wrapping several classes gets all of them or none.
        transaction = jest.fn(() => {
            throw new Error('the inner half must not open a transaction');
        });

        const classTopicService = {
            beginClassTopicWrite,
            persistClassTopic,
            applyClassTopicWriteEffects: applyEffects,
            discardStoredFiles
        };

        service = new ClassSequenceAssignmentService(
            null,
            null,
            null,
            null,
            classTopicService as never,
            { newShallowUser: (id: string) => ({ id }) } as never,
            { transaction } as never
        );
    });

    it('writes through the manager it is handed, opening no transaction of its own', async () => {
        await service.persistSequenceAssignmentForClass(manager as never, workFor('class-1', [], []));

        expect(transaction).not.toHaveBeenCalled();
        expect(manager.save).toHaveBeenCalledTimes(1);
        expect(beginClassTopicWrite).toHaveBeenCalledWith(manager, expect.any(Array));
        expect(persistClassTopic).toHaveBeenCalledTimes(2);
    });

    it('returns the saved assignment, so a caller can relate it to the run it belongs to', async () => {
        const assignment = await service.persistSequenceAssignmentForClass(manager as never, workFor('class-1', [], []));

        expect(assignment).toEqual(expect.objectContaining({ id: 'assignment-1' }));
    });

    it('leaves the post-commit effects to the caller rather than applying them itself', async () => {
        const effects: ClassTopicWriteEffects[] = [];

        await service.persistSequenceAssignmentForClass(manager as never, workFor('class-1', [], effects));

        expect(effects).toEqual([{ supersededFiles: [] }, { supersededFiles: [] }]);
        expect(applyEffects).not.toHaveBeenCalled();
        expect(discardStoredFiles).not.toHaveBeenCalled();
    });

    it('appends each class to the same undo lists, so one run can be undone together', async () => {
        const storedFiles: StoredFile[] = [];
        const effects: ClassTopicWriteEffects[] = [];

        persistClassTopic.mockImplementation((context: { storedFiles: StoredFile[] }) => {
            context.storedFiles.push({ folder: 'images', filename: `sequenced-${context.storedFiles.length}.jpg` });

            return Promise.resolve({ classTopic: { id: 'class-topic-1' }, effects: { supersededFiles: [] } });
        });

        await service.persistSequenceAssignmentForClass(manager as never, workFor('class-1', storedFiles, effects));
        await service.persistSequenceAssignmentForClass(manager as never, workFor('class-2', storedFiles, effects));

        // Four topics across two classes, and one list holding all of it: a failure on the second
        // class still knows about the files the first one stored.
        expect(storedFiles).toHaveLength(4);
        expect(effects).toHaveLength(4);
    });

    it('stops at the class that failed, leaving the caller holding everything stored up to that point', async () => {
        const storedFiles: StoredFile[] = [];
        const effects: ClassTopicWriteEffects[] = [];

        await service.persistSequenceAssignmentForClass(manager as never, workFor('class-1', storedFiles, effects));

        persistClassTopic.mockImplementation((context: { storedFiles: StoredFile[] }) => {
            context.storedFiles.push({ folder: 'images', filename: 'half-written.jpg' });

            return Promise.reject(new Error('insert failed'));
        });

        await expect(service.persistSequenceAssignmentForClass(manager as never, workFor('class-2', storedFiles, effects))).rejects.toThrow(
            'insert failed'
        );

        expect(storedFiles).toEqual([{ folder: 'images', filename: 'half-written.jpg' }]);
        expect(effects).toHaveLength(2);
        expect(discardStoredFiles).not.toHaveBeenCalled();
    });
});

describe('ClassSequenceAssignmentService.getMoneySkillsAutoScheduleAvailability', () => {
    /** A chainable query builder whose terminal call resolves to whatever the test supplies. */
    const builder = (terminal: 'getMany' | 'getRawMany', rows: unknown[]) => {
        const chain: Record<string, unknown> = {};

        ['leftJoin', 'innerJoin', 'where', 'andWhere', 'select', 'addSelect', 'groupBy', 'addGroupBy'].forEach((method) => {
            chain[method] = jest.fn(() => chain);
        });

        chain[terminal] = jest.fn().mockResolvedValue(rows);

        return chain;
    };

    /**
     * Entitled to Money Skills: a reading-logs registration class in a school that has it, sitting in
     * the year that school is currently teaching.
     */
    const entitledClass = (id: string, yearGroupId: string) => ({
        id,
        isFullProgramme: false,
        isReadyTeddyEnabled: false,
        IsReadingLogsEnabled: true,
        isRegistrationClass: true,
        isGroupAcrossClasses: false,
        school: { isMoneySkillsAvailable: true, curentPeriod: { index: 5 } },
        period: { index: 5 },
        yearGroup: { id: yearGroupId }
    });

    /**
     * The sequence rows are keyed on (year group, academic year) rather than year group alone, so a
     * sequence built for a different year does not answer for the current one. A plain string entry
     * means "a sequence for this year group in period 5", which is what `entitledClass` sits in.
     */
    const buildService = (classes: unknown[], sequencesFor: (string | { yearGroupId: string; periodIndex: number | null })[]) => {
        const sequenceBuilder = builder(
            'getRawMany',
            sequencesFor.map((entry) => (typeof entry === 'string' ? { yearGroupId: entry, periodIndex: 5 } : entry))
        );

        const service = new ClassSequenceAssignmentService(
            null,
            null,
            { createQueryBuilder: () => builder('getMany', classes) } as never,
            { createQueryBuilder: () => sequenceBuilder } as never,
            null,
            null,
            null
        );

        return { service, sequenceBuilder };
    };

    it('answers in the order the ids were asked for, which is what the loader relies on', async () => {
        const { service } = buildService([entitledClass('1', 'yg-1'), entitledClass('2', 'yg-1'), entitledClass('3', 'yg-2')], ['yg-1']);

        // Nothing distinguishes 1 from 2: the rule is about the class rather than about what it has
        // been given, so two identical classes answer the same. Only 3's year group has no sequence.
        expect(await service.getMoneySkillsAutoScheduleAvailability(['1', '2', '3'])).toEqual([true, true, false]);
    });

    /**
     * Deliberately not gated on the class already having a Money Skills topic. Leaders are meant to
     * auto-schedule in the first term before any exists, so waiting for one would shut the door on the
     * journey the feature is for. Team decision, 2026-08-17.
     */
    it('offers it to an entitled class that has never been given a Money Skills topic', async () => {
        const { service } = buildService([entitledClass('1', 'yg-1')], ['yg-1']);

        expect(await service.getMoneySkillsAutoScheduleAvailability(['1'])).toEqual([true]);
    });

    it('keeps a class out when no sequence exists for its year group', async () => {
        const { service } = buildService([entitledClass('1', 'yg-1')], []);

        expect(await service.getMoneySkillsAutoScheduleAvailability(['1'])).toEqual([false]);
    });

    /**
     * LEA-6584. The sequence exists for the right year group but was built for a different academic
     * year, so it can never be offered to this class. Without this the school overview button and the
     * activation redirect would both lead to a page whose own query correctly finds nothing, which is
     * exactly the dead end LEA-6560 was raised to remove.
     */
    it.each([
        ['next year', 6],
        ['last year', 4]
    ])('keeps a class out when the only sequence for its year group was built for %s', async (_label, sequencePeriodIndex) => {
        const { service } = buildService([entitledClass('1', 'yg-1')], [{ yearGroupId: 'yg-1', periodIndex: sequencePeriodIndex }]);

        expect(await service.getMoneySkillsAutoScheduleAvailability(['1'])).toEqual([false]);
    });

    /**
     * The reason the lookup is keyed on (year group, academic year) rather than year group alone.
     * The loader batches by class id, so one batch can hold classes from schools that have rolled
     * over at different times. Keying on the year group alone would let a sequence built for one
     * school's year answer for the other's.
     */
    it('matches each class against its own school year when a batch spans schools on different years', async () => {
        const onPeriodFive = entitledClass('1', 'yg-1');
        const onPeriodSix = {
            ...entitledClass('2', 'yg-1'),
            school: { isMoneySkillsAvailable: true, curentPeriod: { index: 6 } },
            period: { index: 6 }
        };

        // One sequence for yg-1, built for period 5 only.
        const { service } = buildService([onPeriodFive, onPeriodSix], [{ yearGroupId: 'yg-1', periodIndex: 5 }]);

        expect(await service.getMoneySkillsAutoScheduleAvailability(['1', '2'])).toEqual([true, false]);
    });

    /**
     * The third case the key has to carry, and the one a pair-only lookup gets wrong.
     *
     * An interval sequence has no period at all, so it answers for its year group in every academic
     * year. Rolling it into the (year group, period) set with a null period would key it as
     * `yg-1:NaN` and it would match no class anywhere, so a school would be told Money Skills is
     * unavailable while a perfectly good sequence sat there.
     */
    it('lets an undated interval sequence answer for schools on different years', async () => {
        const onPeriodFive = entitledClass('1', 'yg-1');
        const onPeriodSix = {
            ...entitledClass('2', 'yg-1'),
            school: { isMoneySkillsAvailable: true, curentPeriod: { index: 6 } },
            period: { index: 6 }
        };

        // One interval sequence for yg-1, belonging to no year.
        const { service } = buildService([onPeriodFive, onPeriodSix], [{ yearGroupId: 'yg-1', periodIndex: null }]);

        expect(await service.getMoneySkillsAutoScheduleAvailability(['1', '2'])).toEqual([true, true]);
    });

    it('still answers false for a year group no sequence covers, dated or not', async () => {
        // The interval sequence is for another year group, so it must not answer for this class.
        const { service } = buildService([entitledClass('1', 'yg-1')], [{ yearGroupId: 'yg-2', periodIndex: null }]);

        expect(await service.getMoneySkillsAutoScheduleAvailability(['1'])).toEqual([false]);
    });

    it('does not inner join the period away', async () => {
        // An inner join drops every interval sequence before the where clause is reached, which no
        // assertion on the result can distinguish from there being no sequence at all.
        const { service, sequenceBuilder } = buildService([entitledClass('1', 'yg-1')], ['yg-1']);

        await service.getMoneySkillsAutoScheduleAvailability(['1']);

        expect(sequenceBuilder.innerJoin).not.toHaveBeenCalledWith('sequence.period', expect.anything());
        expect(sequenceBuilder.leftJoin).toHaveBeenCalledWith('sequence.period', 'period');
    });

    /**
     * The school losing its Money Skills licence has to take the action away, or the button leads to
     * a page that can offer nothing.
     */
    it('keeps a class out when its school is not entitled to Money Skills, without asking anything else', async () => {
        const notEntitled = { ...entitledClass('1', 'yg-1'), school: { isMoneySkillsAvailable: false } };
        const { service, sequenceBuilder } = buildService([notEntitled], ['yg-1']);

        expect(await service.getMoneySkillsAutoScheduleAvailability(['1'])).toEqual([false]);
        expect(sequenceBuilder.getRawMany).not.toHaveBeenCalled();
    });

    /** A Ready Teddy class with neither reading logs nor full programme is not a Money Skills class. */
    it('keeps a class out when its own licence does not allow Money Skills', async () => {
        const readyTeddyOnly = { ...entitledClass('1', 'yg-1'), IsReadingLogsEnabled: false, isReadyTeddyEnabled: true };
        const { service } = buildService([readyTeddyOnly], ['yg-1']);

        expect(await service.getMoneySkillsAutoScheduleAvailability(['1'])).toEqual([false]);
    });

    /**
     * A Ready Teddy class waiting for next September is not offered it, and neither is one left
     * behind in a finished year. Team decision, 2026-08-17.
     */
    it.each([
        ['a future academic year', 6],
        ['a previous academic year', 4]
    ])('keeps a class out when it sits in %s', async (_label, classPeriodIndex) => {
        const outOfYear = { ...entitledClass('1', 'yg-1'), period: { index: classPeriodIndex } };
        const { service, sequenceBuilder } = buildService([outOfYear], ['yg-1']);

        expect(await service.getMoneySkillsAutoScheduleAvailability(['1'])).toEqual([false]);
        expect(sequenceBuilder.getRawMany).not.toHaveBeenCalled();
    });

    it('keeps a class out when it has no year group, so there is nothing to match a sequence on', async () => {
        const { service } = buildService([{ ...entitledClass('1', 'yg-1'), yearGroup: null }], ['yg-1']);

        expect(await service.getMoneySkillsAutoScheduleAvailability(['1'])).toEqual([false]);
    });

    it('answers false for an id the class query did not return, rather than dropping it', async () => {
        const { service } = buildService([entitledClass('1', 'yg-1')], ['yg-1']);

        expect(await service.getMoneySkillsAutoScheduleAvailability(['1', 'missing'])).toEqual([true, false]);
    });

    it('asks nothing at all when there are no classes to ask about', async () => {
        const { service } = buildService([], []);

        expect(await service.getMoneySkillsAutoScheduleAvailability([])).toEqual([]);
    });
});

describe('isCurrentAcademicYearClass', () => {
    const withPeriods = (classPeriod: number | null | undefined, currentPeriod: number | null | undefined) => ({
        period: classPeriod === undefined ? undefined : { index: classPeriod },
        school: { curentPeriod: currentPeriod === undefined ? undefined : { index: currentPeriod } }
    });

    it('is true only when the class sits in the year its school is currently teaching', () => {
        expect(isCurrentAcademicYearClass(withPeriods(5, 5))).toBe(true);
    });

    /** A finished year is as unschedulable as a future one: nobody opens those classes again. */
    it.each([
        ['the class is pre-admission', 6, 5],
        ['the class is from a finished year', 4, 5]
    ])('is false when %s', (_label, classPeriod, currentPeriod) => {
        expect(isCurrentAcademicYearClass(withPeriods(classPeriod, currentPeriod))).toBe(false);
    });

    /** Anything missing reads as not current, so a half-loaded class cannot slip through. */
    it.each([
        ['the class has no period', withPeriods(undefined, 5)],
        ['the school has no current period', withPeriods(5, undefined)],
        ['neither is loaded', { period: null, school: null }],
        ['there is no class at all', null]
    ])('is false when %s', (_label, schoolClass) => {
        expect(isCurrentAcademicYearClass(schoolClass as never)).toBe(false);
    });
});

describe('ClassSequenceAssignmentService, the current academic year rule', () => {
    const currentYearClass = {
        id: '1',
        isFullProgramme: false,
        isReadyTeddyEnabled: false,
        IsReadingLogsEnabled: true,
        isRegistrationClass: true,
        isGroupAcrossClasses: false,
        school: { isMoneySkillsAvailable: true, curentPeriod: { index: 5 } },
        period: { index: 5 },
        yearGroup: { id: 'yg-1' }
    };

    const outOfYearClass = { ...currentYearClass, period: { index: 6 } };

    const sequence = {
        id: 'seq-1',
        timingMode: SequenceTimingMode.FIXED,
        yearGroup: { id: 'yg-1' },
        period: { index: 5, shortName: '2026-27' },
        subject: { id: 'sub-1', name: 'Money skills', programmeType: SubjectProgrammeType.MONEY_SKILLS },
        items: [{ order: 1, topic: { id: '10' }, startDate: asDate('2030-01-01'), endDate: null }]
    };

    /** Same sequence, built for the year after the one the school is teaching. */
    const nextYearSequence = { ...sequence, period: { index: 6, shortName: '2027-28' } };

    const serviceFor = (schoolClass: unknown, forSequence: unknown = sequence) => {
        const sequenceQuery: Record<string, jest.Mock> = {};

        ['innerJoinAndSelect', 'leftJoinAndSelect', 'where', 'andWhere', 'orderBy', 'addOrderBy'].forEach((method) => {
            sequenceQuery[method] = jest.fn(() => sequenceQuery);
        });

        sequenceQuery.getMany = jest.fn().mockResolvedValue([sequence]);

        const service = new ClassSequenceAssignmentService(
            null,
            null,
            null,
            { createQueryBuilder: () => sequenceQuery } as never,
            null,
            null,
            null
        );

        /* eslint-disable @typescript-eslint/no-explicit-any */
        jest.spyOn(service as any, 'loadClass').mockResolvedValue(schoolClass);
        jest.spyOn(service as any, 'loadSequence').mockResolvedValue(forSequence);
        /* eslint-enable @typescript-eslint/no-explicit-any */

        return { service, sequenceQuery };
    };

    /**
     * Empty rather than an error, so the auto-schedule page shows its "nothing available" state and
     * the class schedule page simply does not offer the action.
     */
    it('offers no sequences to a class outside the current academic year, without asking for any', async () => {
        const { service, sequenceQuery } = serviceFor(outOfYearClass);

        expect(await service.getAssignableSequencesForClass('1')).toEqual([]);
        expect(sequenceQuery.getMany).not.toHaveBeenCalled();
    });

    it('still offers them to a class in the current academic year', async () => {
        const { service } = serviceFor(currentYearClass);

        expect(await service.getAssignableSequencesForClass('1')).toEqual([sequence]);
    });

    /** Hiding the action is not the same as refusing it: a leader can sit on the page across a rollover. */
    it('refuses to preview a plan for a class outside the current academic year', async () => {
        const { service } = serviceFor(outOfYearClass);

        await expect(service.previewSequenceForClass({ classId: '1', sequenceId: 'seq-1' } as never)).rejects.toThrow(
            'only available for classes in the current academic year'
        );
    });

    it('refuses to auto-schedule for a class outside the current academic year', async () => {
        const { service } = serviceFor(outOfYearClass);

        await expect(service.assignSequenceToClass({ classId: '1', sequenceId: 'seq-1' } as never, 'user-1')).rejects.toThrow(
            'only available for classes in the current academic year'
        );
    });

    /**
     * LEA-6584, the same rule from the sequence's side. The class is in its current year; the
     * sequence was built for a different one. Reachable by a leader who kept a page open across a
     * rollover, or by calling the API directly, so the write path refuses rather than relying on the
     * read path having hidden it.
     */
    it('refuses to preview a sequence built for another academic year', async () => {
        const { service } = serviceFor(currentYearClass, nextYearSequence);

        await expect(service.previewSequenceForClass({ classId: '1', sequenceId: 'seq-1' } as never)).rejects.toThrow(
            'This sequence was built for 2027-28, which is not the year this school is currently teaching'
        );
    });

    it('refuses to auto-schedule a sequence built for another academic year', async () => {
        const { service } = serviceFor(currentYearClass, nextYearSequence);

        await expect(service.assignSequenceToClass({ classId: '1', sequenceId: 'seq-1' } as never, 'user-1')).rejects.toThrow(
            'This sequence was built for 2027-28, which is not the year this school is currently teaching'
        );
    });

    it('names the year in the refusal, falling back when the period has no short name', async () => {
        const unnamed = { ...sequence, period: { index: 6 } };
        const { service } = serviceFor(currentYearClass, unnamed);

        await expect(service.previewSequenceForClass({ classId: '1', sequenceId: 'seq-1' } as never)).rejects.toThrow(
            'This sequence was built for another academic year'
        );
    });

    /** The class rule is checked first, so a class out of year reports that rather than the sequence. */
    it('reports the class rule first when both are wrong', async () => {
        const { service } = serviceFor(outOfYearClass, nextYearSequence);

        await expect(service.previewSequenceForClass({ classId: '1', sequenceId: 'seq-1' } as never)).rejects.toThrow(
            'only available for classes in the current academic year'
        );
    });

    it('filters the offered sequences by the school year rather than doing it in memory', async () => {
        const { service, sequenceQuery } = serviceFor(currentYearClass);

        await service.getAssignableSequencesForClass('1');

        // The year is applied in SQL so a class is never sent a sequence it cannot use, and the page
        // does not have to know the rule. Asserted on the parameter rather than the whole string, so
        // rewording the clause does not break this.
        expect(sequenceQuery.andWhere).toHaveBeenCalledWith(
            expect.stringContaining('period.index'),
            expect.objectContaining({ currentPeriodIndex: 5 })
        );
    });

    /**
     * Both halves of the SQL rule, and both are load bearing.
     *
     * An interval sequence has a null periodIndex, so an inner join on the period drops every one of
     * them before the where clause is reached, and a bare equality drops them again. Either mistake
     * makes interval sequences vanish from every school with nothing erroring, which is precisely
     * the kind of failure a passing test suite would otherwise hide.
     */
    it('offers interval sequences whatever year it is, and does not inner join them away', async () => {
        const { service, sequenceQuery } = serviceFor(currentYearClass);

        await service.getAssignableSequencesForClass('1');

        expect(sequenceQuery.andWhere).toHaveBeenCalledWith(
            expect.stringContaining('sequence.timingMode = :intervalMode'),
            expect.objectContaining({ intervalMode: SequenceTimingMode.INTERVAL })
        );

        expect(sequenceQuery.innerJoinAndSelect).not.toHaveBeenCalledWith('sequence.period', expect.anything());
        expect(sequenceQuery.leftJoinAndSelect).toHaveBeenCalledWith('sequence.period', 'period');
    });
});

describe('isSequenceForCurrentAcademicYear', () => {
    const forClass = (currentPeriodIndex: number | null | undefined): { school?: { curentPeriod: { index: number | null } } } => ({
        school: currentPeriodIndex === undefined ? undefined : { curentPeriod: { index: currentPeriodIndex } }
    });

    it('is true when the sequence was built for the year the school is teaching', () => {
        expect(isSequenceForCurrentAcademicYear({ period: { index: 5 } }, forClass(5))).toBe(true);
    });

    it.each([
        ['the sequence is for a later year', 6, 5],
        ['the sequence is for an earlier year', 4, 5]
    ])('is false when %s', (_label, sequencePeriod, currentPeriod) => {
        expect(isSequenceForCurrentAcademicYear({ period: { index: sequencePeriod } }, forClass(currentPeriod))).toBe(false);
    });

    /**
     * A caller that forgot to join the relation gets false and an empty list rather than an
     * accidental pass, which is the same way the class-side rule fails safe.
     */
    it.each([
        ['the sequence has no period loaded', {}, forClass(5)],
        ['the sequence period is null', { period: null }, forClass(5)],
        ['the school has no current period', { period: { index: 5 } }, forClass(null)],
        ['there is no school loaded', { period: { index: 5 } }, forClass(undefined)],
        ['there is no sequence at all', null, forClass(5)],
        ['there is no class at all', { period: { index: 5 } }, null]
    ])('is false when %s', (_label, sequence, schoolClass) => {
        expect(isSequenceForCurrentAcademicYear(sequence as never, schoolClass as never)).toBe(false);
    });

    /** Period indexes arrive as strings from some raw queries, so the comparison coerces. */
    it('compares numerically rather than by identity', () => {
        expect(isSequenceForCurrentAcademicYear({ period: { index: '5' as never } }, forClass('5' as never))).toBe(true);
    });

    /**
     * Interval sequences carry no dates, so they belong to no academic year and are offered in every
     * one of them, forever. Their period is null by design, which is why every case above that
     * treats a missing period as a failure has to stop short of them.
     */
    describe('INTERVAL sequences are never filtered by year', () => {
        const interval = (period: unknown = null): { timingMode: SequenceTimingMode; period?: unknown } => ({
            timingMode: SequenceTimingMode.INTERVAL,
            period
        });

        it('passes with no period at all, which is the ordinary case', () => {
            expect(isSequenceForCurrentAcademicYear(interval() as never, forClass(5))).toBe(true);
        });

        it('passes in a year it would have failed as a fixed sequence', () => {
            // The same shape returns false above when the timing mode is not interval.
            expect(isSequenceForCurrentAcademicYear({ period: { index: 6 } }, forClass(5))).toBe(false);
            expect(isSequenceForCurrentAcademicYear(interval({ index: 6 }) as never, forClass(5))).toBe(true);
        });

        it('passes even when the school has no current period loaded', () => {
            // Nothing about an interval sequence depends on the school's year, so a missing one
            // cannot make it unofferable.
            expect(isSequenceForCurrentAcademicYear(interval() as never, forClass(null))).toBe(true);
        });

        it('still tests the year for a fixed sequence, so the short-circuit is on the mode alone', () => {
            expect(isSequenceForCurrentAcademicYear({ timingMode: SequenceTimingMode.FIXED, period: { index: 5 } }, forClass(5))).toBe(
                true
            );
            expect(isSequenceForCurrentAcademicYear({ timingMode: SequenceTimingMode.FIXED, period: { index: 6 } }, forClass(5))).toBe(
                false
            );
            expect(isSequenceForCurrentAcademicYear({ timingMode: SequenceTimingMode.FIXED, period: null }, forClass(5))).toBe(false);
        });
    });
});

/**
 * The optional programme filter, which exists for the Money Skills page reached from class
 * activation. Asserted through the query builder rather than through its result, because what matters
 * is the programmes the filter narrows to before anything is fetched.
 */
describe('ClassSequenceAssignmentService.getAssignableSequencesForClass, the programme filter', () => {
    /** Full programme, so entitled to both FULL_PROGRAMME and MONEY_SKILLS. See allowedProgrammeTypesForClass. */
    const fullProgrammeClass = {
        id: '1',
        isFullProgramme: true,
        isReadyTeddyEnabled: false,
        IsReadingLogsEnabled: true,
        isRegistrationClass: true,
        isGroupAcrossClasses: false,
        school: { isMoneySkillsAvailable: true, curentPeriod: { index: 5 } },
        period: { index: 5 },
        yearGroup: { id: 'yg-1' }
    };

    /** Reception Ready Teddy, entitled to READY_TEDDY alone: no full programme and no reading logs. */
    const readyTeddyOnlyClass = {
        ...fullProgrammeClass,
        isFullProgramme: false,
        isReadyTeddyEnabled: true,
        IsReadingLogsEnabled: false,
        isRegistrationClass: false
    };

    const sequence = { id: 'seq-1', subject: { programmeType: SubjectProgrammeType.MONEY_SKILLS } };

    const serviceFor = (schoolClass: unknown) => {
        const sequenceQuery: Record<string, jest.Mock> = {};

        ['innerJoinAndSelect', 'leftJoinAndSelect', 'where', 'andWhere', 'orderBy', 'addOrderBy'].forEach((method) => {
            sequenceQuery[method] = jest.fn(() => sequenceQuery);
        });

        sequenceQuery.getMany = jest.fn().mockResolvedValue([sequence]);

        const service = new ClassSequenceAssignmentService(
            null,
            null,
            null,
            { createQueryBuilder: () => sequenceQuery } as never,
            null,
            null,
            null
        );

        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        jest.spyOn(service as any, 'loadClass').mockResolvedValue(schoolClass);

        return { service, sequenceQuery };
    };

    /** What the programme clause was actually given, which is the intersection this is all about. */
    const programmesAskedFor = (sequenceQuery: Record<string, jest.Mock>): SubjectProgrammeType[] | undefined =>
        sequenceQuery.andWhere.mock.calls.find(([clause]) => String(clause).includes('subject.programmeType'))?.[1]?.allowedProgrammes;

    it('narrows a full programme class to Money Skills alone', async () => {
        const { service, sequenceQuery } = serviceFor(fullProgrammeClass);

        await service.getAssignableSequencesForClass('1', SubjectProgrammeType.MONEY_SKILLS);

        expect(programmesAskedFor(sequenceQuery)).toEqual([SubjectProgrammeType.MONEY_SKILLS]);
    });

    it('asks for every programme the class is entitled to when no programme is given', async () => {
        const { service, sequenceQuery } = serviceFor(fullProgrammeClass);

        await service.getAssignableSequencesForClass('1');

        expect(programmesAskedFor(sequenceQuery)).toEqual([SubjectProgrammeType.FULL_PROGRAMME, SubjectProgrammeType.MONEY_SKILLS]);
    });

    /**
     * The intersection, rather than a replacement. Asking for Money Skills on a Ready Teddy class must
     * not hand it every Money Skills sequence built for its year group.
     */
    it('offers nothing when the class is not entitled to the programme asked for, without asking for any', async () => {
        const { service, sequenceQuery } = serviceFor(readyTeddyOnlyClass);

        expect(await service.getAssignableSequencesForClass('1', SubjectProgrammeType.MONEY_SKILLS)).toEqual([]);
        expect(sequenceQuery.getMany).not.toHaveBeenCalled();
    });

    it('still offers that class its own programme', async () => {
        const { service, sequenceQuery } = serviceFor(readyTeddyOnlyClass);

        expect(await service.getAssignableSequencesForClass('1', SubjectProgrammeType.READY_TEDDY)).toEqual([sequence]);
        expect(programmesAskedFor(sequenceQuery)).toEqual([SubjectProgrammeType.READY_TEDDY]);
    });
});

describe('ClassSequenceAssignmentService.getAutoSchedulableClassesForSchool', () => {
    /**
     * A chainable query builder whose `getMany` resolves to whatever the test supplies. Both queries
     * here hydrate entities, so neither `getRawMany` nor a grouping call is stubbed: a change that
     * reached for either would fail loudly rather than quietly answering from a mock.
     */
    const builder = (rows: unknown[]) => {
        const chain: Record<string, unknown> = {};

        ['leftJoin', 'innerJoin', 'where', 'andWhere', 'select', 'orderBy', 'addOrderBy', 'setParameter'].forEach((method) => {
            chain[method] = jest.fn(() => chain);
        });

        chain.getMany = jest.fn().mockResolvedValue(rows);

        return chain;
    };

    const TEACHER_ID = 'teacher-1';

    /**
     * An active registration class in the year its school is currently teaching, entitled to whatever
     * the caller turns on. Full programme by default, which entitles it to FULL_PROGRAMME and, because
     * the school has the licence, MONEY_SKILLS.
     */
    const schoolClass = (id: string, yearGroupId: string, overrides: Record<string, unknown> = {}) => ({
        id,
        name: `Class ${id}`,
        isFullProgramme: true,
        isReadyTeddyEnabled: false,
        IsReadingLogsEnabled: false,
        isRegistrationClass: true,
        isGroupAcrossClasses: false,
        school: { isMoneySkillsAvailable: true, curentPeriod: { index: 5 } },
        period: { index: 5, shortName: '2025-26' },
        yearGroup: { id: yearGroupId, year: 'Year 3' },
        teachers: [],
        ...overrides
    });

    /**
     * `covered` is the (year group, programme) pairs an admin has actually built a sequence for, given
     * in that shape because it is what the tests are about. It is expanded into sequence entities here,
     * which is what the query returns: one row per sequence, related subject and year group hydrated.
     */
    const buildService = (classes: unknown[], covered: { yearGroupId: string; programmeType: SubjectProgrammeType }[]) => {
        const classQuery = builder(classes);
        const sequenceQuery = builder(
            covered.map((pair, index) => ({
                id: `sequence-${index}`,
                yearGroup: { id: pair.yearGroupId },
                subject: { programmeType: pair.programmeType }
            }))
        );

        const service = new ClassSequenceAssignmentService(
            null,
            null,
            { createQueryBuilder: () => classQuery } as never,
            { createQueryBuilder: () => sequenceQuery } as never,
            null,
            null,
            null
        );

        return { service, classQuery, sequenceQuery };
    };

    it('returns an entitled class whose year group has a sequence, with the fields the picker renders', async () => {
        const { service } = buildService(
            [schoolClass('1', 'yg-3')],
            [{ yearGroupId: 'yg-3', programmeType: SubjectProgrammeType.FULL_PROGRAMME }]
        );

        expect(await service.getAutoSchedulableClassesForSchool('school-1', TEACHER_ID, true)).toEqual([
            { id: '1', name: 'Class 1', year: 'Year 3', isMyClass: false }
        ]);
    });

    /**
     * The trap this method exists to avoid, and the reason the second query keys on the pair rather
     * than on the year group alone. Both classes are Year 3 and only a full programme sequence exists,
     * so the reading-logs class, which is entitled to Money Skills and nothing else, must not be
     * answered by its neighbour's sequence.
     */
    it('does not let a sequence in one programme answer for a class entitled only to another', async () => {
        const moneySkillsOnly = schoolClass('2', 'yg-3', { isFullProgramme: false, IsReadingLogsEnabled: true });

        const { service } = buildService(
            [schoolClass('1', 'yg-3'), moneySkillsOnly],
            [{ yearGroupId: 'yg-3', programmeType: SubjectProgrammeType.FULL_PROGRAMME }]
        );

        expect((await service.getAutoSchedulableClassesForSchool('school-1', TEACHER_ID, true)).map((row) => row.id)).toEqual(['1']);
    });

    it('keeps a class out when no sequence exists for its year group at all', async () => {
        const { service } = buildService(
            [schoolClass('1', 'yg-3')],
            [{ yearGroupId: 'yg-4', programmeType: SubjectProgrammeType.FULL_PROGRAMME }]
        );

        expect(await service.getAutoSchedulableClassesForSchool('school-1', TEACHER_ID, true)).toEqual([]);
    });

    /** Nothing is entitled, so there is no pair worth asking about and the second query never runs. */
    it('asks nothing further when no class is entitled to any programme', async () => {
        const entitledToNothing = schoolClass('1', 'yg-3', {
            isFullProgramme: false,
            school: { isMoneySkillsAvailable: false, curentPeriod: { index: 5 } }
        });

        const { service, sequenceQuery } = buildService(
            [entitledToNothing],
            [{ yearGroupId: 'yg-3', programmeType: SubjectProgrammeType.FULL_PROGRAMME }]
        );

        expect(await service.getAutoSchedulableClassesForSchool('school-1', TEACHER_ID, true)).toEqual([]);
        expect(sequenceQuery.getMany).not.toHaveBeenCalled();
    });

    it('marks the classes the person asking actually teaches, so a leader can find their own', async () => {
        const mine = schoolClass('1', 'yg-3', { teachers: [{ id: TEACHER_ID }] });
        const theirs = schoolClass('2', 'yg-3', { teachers: [{ id: 'teacher-2' }] });

        const { service } = buildService([mine, theirs], [{ yearGroupId: 'yg-3', programmeType: SubjectProgrammeType.FULL_PROGRAMME }]);

        expect((await service.getAutoSchedulableClassesForSchool('school-1', TEACHER_ID, true)).map((row) => row.isMyClass)).toEqual([
            true,
            false
        ]);
    });

    /**
     * The scoping is a correctness rule rather than a convenience: a teacher may read any class in
     * their school but may only write to their own, so a wider list would preview and then fail on
     * assign. Asserted by the extra condition being applied rather than by its SQL, which the e2e
     * covers end to end.
     */
    it('narrows the class query for a teacher and leaves it open for a leader', async () => {
        const covered = [{ yearGroupId: 'yg-3', programmeType: SubjectProgrammeType.FULL_PROGRAMME }];

        const asLeader = buildService([schoolClass('1', 'yg-3')], covered);
        const asTeacher = buildService([schoolClass('1', 'yg-3')], covered);

        await asLeader.service.getAutoSchedulableClassesForSchool('school-1', TEACHER_ID, true);
        await asTeacher.service.getAutoSchedulableClassesForSchool('school-1', TEACHER_ID, false);

        const subqueryConditions = (query: Record<string, unknown>) =>
            (query.andWhere as jest.Mock).mock.calls.filter(([condition]) => typeof condition === 'function').length;

        expect(subqueryConditions(asLeader.classQuery)).toEqual(0);
        expect(subqueryConditions(asTeacher.classQuery)).toEqual(1);
        expect(asTeacher.classQuery.setParameter).toHaveBeenCalledWith('teacherId', TEACHER_ID);
    });

    /**
     * Classes outside the school's current year are excluded in SQL, so this should never be reached.
     * The prefix is applied anyway so this label cannot disagree with `schoolClassName` on the page it
     * leads to, which prefixes a class from a finished year with its period.
     */
    it('prefixes the period on a class from a year the school has moved past', async () => {
        const lastYear = schoolClass('1', 'yg-3', {
            period: { index: 4, shortName: '2024-25' },
            school: { isMoneySkillsAvailable: true, curentPeriod: { index: 5 } }
        });

        const { service } = buildService([lastYear], [{ yearGroupId: 'yg-3', programmeType: SubjectProgrammeType.FULL_PROGRAMME }]);

        expect((await service.getAutoSchedulableClassesForSchool('school-1', TEACHER_ID, true))[0].name).toEqual('2024-25: Class 1');
    });

    /**
     * The academic year rule reaches this query too (LEA-6584), and it is the enforcement point most
     * easily missed because it did not exist when the other four were written: LEA-6533 added it
     * afterwards.
     *
     * Without it the picker lists a class whose only sequence is built for another year, the teacher
     * chooses it, and `getAssignableSequencesForClass` then correctly finds nothing on the page they
     * land on. That is the dead end LEA-6560 exists to prevent, reached by a different route.
     *
     * Asserted through the query builder rather than the result, because the filter is applied in
     * SQL and the mock cannot express which rows the database would have withheld.
     */
    describe('the academic year rule', () => {
        it('narrows sequences to the school year, and lets interval sequences through', async () => {
            const { service, sequenceQuery } = buildService(
                [schoolClass('1', 'yg-3')],
                [{ yearGroupId: 'yg-3', programmeType: SubjectProgrammeType.FULL_PROGRAMME }]
            );

            await service.getAutoSchedulableClassesForSchool('school-1', TEACHER_ID, true);

            expect(sequenceQuery.andWhere).toHaveBeenCalledWith(
                expect.stringContaining('period.index'),
                expect.objectContaining({ currentPeriodIndex: 5, intervalMode: SequenceTimingMode.INTERVAL })
            );
        });

        it('left joins the period rather than inner joining it', async () => {
            // An inner join drops every interval sequence before the where clause is reached, and no
            // assertion on the result could tell that apart from there being no sequence at all.
            const { service, sequenceQuery } = buildService(
                [schoolClass('1', 'yg-3')],
                [{ yearGroupId: 'yg-3', programmeType: SubjectProgrammeType.FULL_PROGRAMME }]
            );

            await service.getAutoSchedulableClassesForSchool('school-1', TEACHER_ID, true);

            expect(sequenceQuery.leftJoin).toHaveBeenCalledWith('sequence.period', 'period');
            expect(sequenceQuery.innerJoin).not.toHaveBeenCalledWith('sequence.period', expect.anything());
        });
    });
});
