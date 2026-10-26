import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SequenceAssignmentStatus, SequenceItemSkipReason, SequenceTimingMode, SubjectProgrammeType } from 'lwp-shared/enums';
import moment from 'moment';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Connection, EntityManager, Repository } from 'typeorm';

import { AssignSequenceToClassInput, SequenceItemDateOverrideInput } from '../dtos/AssignSequenceToClassInput';
import { AutoSchedulableClassOutput } from '../dtos/AutoSchedulableClass';
import { SequenceAssignmentPlan, SequenceAssignmentPlanItem } from '../dtos/SequenceAssignmentPlan';
import { LwpClassSequenceAssignment } from '../entities/class_sequence_assignment';
import { LwpClassTopic } from '../entities/class_topic';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpTopicSequence } from '../entities/static_topic_sequence';
import { StaticLwpTopicSequenceItem } from '../entities/static_topic_sequence_item';
import { LwpUser } from '../entities/user';
import { LwpWholeSchoolSequenceAssignment } from '../entities/whole_school_sequence_assignment';
import { ErrorStatusCodeEnum, OperationStatus, SchoolClassStatus } from '../model';
import { ClassTopicService, ClassTopicWriteEffects, StoredFile } from './class_topic.service';
import { allowedProgrammeTypesForClass } from './topic.service';

const DATE_FORMAT = 'YYYY-MM-DD';

/** Surfaced to the leader verbatim, as every other refusal in this service is. */
const CURRENT_ACADEMIC_YEAR_ONLY = 'Auto-scheduling is only available for classes in the current academic year';

/**
 * Whether a class is in the year its school is currently teaching.
 *
 * Equality rather than "not in the future": a class from a finished year is no more schedulable than
 * a pre-admission one, and its topics would be released into a year nobody opens again. The same
 * comparison defines a pre-admission class, at SchoolClassService.isPreAdmissionClass.
 *
 * Both sides come from the joined periods rather than from the @RelationId properties, which are only
 * populated when the relation itself is loaded. Anything missing reads as not current, so a class
 * with no period cannot slip through.
 */
export function isCurrentAcademicYearClass(schoolClass: {
    period?: { index?: number } | null;
    school?: { curentPeriod?: { index?: number } | null } | null;
}): boolean {
    const classPeriod = schoolClass?.period?.index;
    const currentPeriod = schoolClass?.school?.curentPeriod?.index;

    if (classPeriod === undefined || classPeriod === null || currentPeriod === undefined || currentPeriod === null) return false;

    return Number(classPeriod) === Number(currentPeriod);
}

/**
 * Whether a sequence may be offered in the year the class's school is currently teaching (LEA-6584).
 *
 * The sibling of {@link isCurrentAcademicYearClass}, and the two are checked together everywhere:
 * that one asks whether the class is in the current year, this one whether the sequence is.
 *
 * **INTERVAL sequences pass unconditionally.** They carry no dates, so they belong to no academic
 * year and are offered in every one of them, forever. Their `periodIndex` is null by design.
 *
 * **FIXED sequences are tested on the year they declare.** One dated for next September is real and
 * correct, and still must not be offered to a class whose year ends in July, or that class receives
 * topics released after nobody opens it again.
 *
 * Equality for the same reason as the class rule. Both sides come from joined relations rather than
 * the @RelationId properties, which are only populated by a relation load, so a FIXED sequence whose
 * caller forgot to join gets `false` and an empty list rather than an accidental pass.
 *
 * ⚠️ Wherever this rule is applied in SQL rather than here, it needs an explicit interval arm beside
 * the period equality. A bare `period.index = :current` is null for an interval sequence and so
 * silently drops every one of them, and an inner join on the period does the same thing earlier.
 */
export function isSequenceForCurrentAcademicYear(
    sequence: { timingMode?: SequenceTimingMode; period?: { index?: number } | null },
    schoolClass: { school?: { curentPeriod?: { index?: number } | null } | null }
): boolean {
    if (sequence?.timingMode === SequenceTimingMode.INTERVAL) return true;

    const sequencePeriod = sequence?.period?.index;
    const currentPeriod = schoolClass?.school?.curentPeriod?.index;

    if (sequencePeriod === undefined || sequencePeriod === null || currentPeriod === undefined || currentPeriod === null) return false;

    return Number(sequencePeriod) === Number(currentPeriod);
}

export interface PlannedClassTopicDates {
    topicId: string;
    order: number;
    releaseDate: Date;
    /** Optional, as it is on a manually scheduled class topic. Always set for an INTERVAL sequence. */
    dueDate: Date | null;
}

/**
 * How {@link ClassSequenceAssignmentService.buildPlan} should treat a topic whose date has passed.
 *
 * An options bag of one, so that the whole-school caller reads as having asked for something rather
 * than having passed a bare `true` nobody can interpret at the call site, and so LEA-6700 can add to
 * it without changing every caller.
 */
export interface BuildPlanOptions {
    /**
     * Skip past-dated topics and report them as {@link SequenceItemSkipReason.DATE_IN_PAST}, instead
     * of throwing and refusing the whole assignment (LEA-6699).
     *
     * **Off by default, and only the whole-school path turns it on.** At class level the refusal is
     * the right answer: a teacher can move a row's dates or drop it, so blocking costs them a moment
     * and keeps them in control of what their class receives. A leader scheduling a whole school can
     * fix nothing, because nothing on that page is editable, so refusing would leave them no route at
     * all. The difference is the design, not an oversight.
     */
    skipPastDatedTopics?: boolean;
}

/**
 * One class's share of a sequence assignment, resolved outside the transaction and ready to be written.
 *
 * `storedFiles` and `effects` belong to the caller and are appended to as work proceeds, never
 * returned, so one array spans every class in a whole-school run (LEA-6681).
 */
export interface SequenceAssignmentWrite {
    input: AssignSequenceToClassInput;
    schoolClass: LwpSchoolClass;
    sequence: StaticLwpTopicSequence;
    toCreate: PlannedClassTopicDates[];
    userId: string;
    /** Files put into storage for the whole operation. Discarded together if it rolls back. */
    storedFiles: StoredFile[];
    /** Work that is only safe once the caller's transaction has committed. */
    effects: ClassTopicWriteEffects[];
    /**
     * The whole-school run this class is part of, when there is one (LEA-6698).
     *
     * Absent for every class-level assignment, which is every row that exists today. It is what makes
     * a run traceable back to the single decision a leader made, and what lets LEA-6700's removal find
     * the assignments that run created rather than infer them.
     */
    wholeSchoolAssignment?: LwpWholeSchoolSequenceAssignment;
}

function toDateOnly(value: Date | string): Date {
    return new Date(moment(value).format(DATE_FORMAT));
}

/**
 * Works out the dates a class's topics would get, without touching the database.
 *
 * INTERVAL re-anchors: the class's own start date drives everything, so the same sequence can be
 * assigned to different classes at different times. The template's own item dates are only ever
 * defaults for the picker. FIXED carries concrete dates, so those are used as they stand and the
 * assignment has no anchor.
 *
 * Exported so the arithmetic and the override handling can be unit tested without a database.
 */
export function planClassTopicDates(
    timing: { timingMode: SequenceTimingMode; intervalDays?: number },
    items: { topicId: string; order: number; startDate: Date | string; endDate?: Date | string | null }[],
    startDate?: Date,
    overrides: SequenceItemDateOverrideInput[] = []
): PlannedClassTopicDates[] {
    if (!items?.length) throw new HttpException('This sequence has no topics to assign', ErrorStatusCodeEnum._535);

    const ordered = [...items].sort((a, b) => a.order - b.order);

    let planned: PlannedClassTopicDates[];

    if (timing.timingMode === SequenceTimingMode.INTERVAL) {
        if (!timing.intervalDays || timing.intervalDays < 1) {
            // Addressed to whoever can fix it, which is an admin rather than the teacher reading it.
            // The cadence is the sequence's (LEA-6624), so a missing one means the template is
            // incomplete and there is nothing a school can do about it from here.
            throw new HttpException('This sequence is missing its interval, so its dates cannot be worked out', ErrorStatusCodeEnum._535);
        }

        if (!startDate) {
            throw new HttpException('Choose a start date for this class', ErrorStatusCodeEnum._535);
        }

        const intervalDays = timing.intervalDays;
        const anchor = moment(startDate);

        planned = ordered.map((item, index) => {
            const release = anchor.clone().add(index * intervalDays, 'days');

            return {
                topicId: item.topicId,
                order: item.order,
                releaseDate: new Date(release.format(DATE_FORMAT)),
                dueDate: new Date(
                    release
                        .clone()
                        .add(intervalDays - 1, 'days')
                        .format(DATE_FORMAT)
                )
            };
        });
    } else {
        // A fixed sequence item may have no end date, in which case the class topic is created
        // with no due date, exactly as a teacher scheduling it by hand could leave it.
        planned = ordered.map((item) => ({
            topicId: item.topicId,
            order: item.order,
            releaseDate: toDateOnly(item.startDate),
            dueDate: item.endDate ? toDateOnly(item.endDate) : null
        }));
    }

    if (!overrides.length) return planned;

    const overrideByTopic = new Map(overrides.map((override) => [override.topicId, override]));

    return planned.map((item) => {
        const override = overrideByTopic.get(item.topicId);

        if (!override) return item;

        const releaseDate = toDateOnly(override.releaseDate);
        const dueDate = override.dueDate ? toDateOnly(override.dueDate) : item.dueDate;

        if (dueDate && moment(dueDate).isBefore(moment(releaseDate), 'day')) {
            throw new HttpException('A topic cannot be due before it is released', ErrorStatusCodeEnum._535);
        }

        return { ...item, releaseDate, dueDate };
    });
}

/**
 * Whether a release date has already gone, which is the single rule behind both the class-level
 * refusal and the whole-school skip (LEA-6699).
 *
 * **Exported so the two cannot drift.** The leader's preview decides this from a member sequence's
 * own item dates, without building a plan per class, while the assign path decides it inside
 * `buildPlan` from the planned dates. Those are two different inputs reaching the same answer, and
 * they have to agree or the page promises a topic the run then skips. One function, one rule.
 *
 * A missing date is not in the past. It cannot be proven to be, and a FIXED sequence should never
 * have one.
 */
export function isReleaseDateInPast(releaseDate: Date | null | undefined, today: Date = new Date()): boolean {
    if (!releaseDate) return false;

    return moment(releaseDate).isBefore(moment(today).startOf('day'), 'day');
}

/**
 * Nothing may be scheduled in the past, so a sequence can never create an already-released topic
 * (plan decision 10). Only topics that will actually be created are checked, so a stale template
 * whose topics the class already has does not block the rest.
 */
export function findPastDatedTopicIds(planned: PlannedClassTopicDates[], today: Date = new Date()): string[] {
    return planned.filter((item) => isReleaseDateInPast(item.releaseDate, today)).map((item) => item.topicId);
}

@Injectable()
export class ClassSequenceAssignmentService {
    constructor(
        @InjectRepository(LwpClassSequenceAssignment)
        private assignmentRepository: Repository<LwpClassSequenceAssignment>,
        @InjectRepository(LwpClassTopic)
        private classTopicRepository: Repository<LwpClassTopic>,
        @InjectRepository(LwpSchoolClass)
        private schoolClassRepository: Repository<LwpSchoolClass>,
        @InjectRepository(StaticLwpTopicSequence)
        private sequenceRepository: Repository<StaticLwpTopicSequence>,
        private classTopicService: ClassTopicService,
        private shallowUserService: ShallowUserService,
        private connection: Connection
    ) {}

    /**
     * Sequences a class may be assigned: the class must be in the school's current academic year, be
     * entitled to the sequence's subject, and match its year group. Entitlement reuses
     * {@link allowedProgrammeTypesForClass}, the same rule behind the teacher-facing topic pickers,
     * so this list can never offer a sequence whose topics the class cannot be given.
     *
     * Deliberately not filtered by date. A fixed sequence dated last term is still the right
     * sequence for the class within the same academic year: the leader re-dates it for their class
     * at assignment time rather than being denied it.
     *
     * The items come with it because of that. A fixed sequence whose own dates have passed is
     * refused by {@link previewSequenceForClass}, and the leader can only move those dates forward
     * if the UI has them to show, which the plan cannot supply when it has just been refused.
     *
     * `programmeType` narrows the answer to one programme, for a page that only offers that one: the
     * Money Skills page reached from class activation. It is **intersected** with the class's
     * entitlement rather than replacing it, so asking for a programme the class cannot have returns
     * nothing rather than everything of that programme built for its year group. Filtering in the
     * browser instead would mean fetching sequences to discard, and would leave a page whose empty
     * state has to be decided from one programme alone unable to tell empty from filtered-empty.
     */
    public async getAssignableSequencesForClass(classId: string, programmeType?: SubjectProgrammeType): Promise<StaticLwpTopicSequence[]> {
        const schoolClass = await this.loadClass(classId);

        const entitledProgrammes = allowedProgrammeTypesForClass(schoolClass);

        // The intersection, which is also what makes the guard below cover a programme the class is
        // not entitled to: it empties the list, so no query is run for an answer that can only be
        // empty.
        const allowedProgrammes = programmeType ? entitledProgrammes.filter((entitled) => entitled === programmeType) : entitledProgrammes;

        // Empty rather than an error, so the page shows its "nothing available" state and the schedule
        // page simply does not offer the action. The write path refuses outright instead: see
        // assertClassMayBeAssigned.
        if (!isCurrentAcademicYearClass(schoolClass)) return [];

        if (!allowedProgrammes.length || !schoolClass.yearGroup) return [];

        const query = this.sequenceRepository
            .createQueryBuilder('sequence')
            .innerJoinAndSelect('sequence.subject', 'subject')
            .innerJoinAndSelect('sequence.yearGroup', 'yearGroup')
            // LEFT, not INNER: an interval sequence has no period, and an inner join would drop
            // every one of them before the where clause below was even reached.
            .leftJoinAndSelect('sequence.period', 'period')
            .leftJoinAndSelect('sequence.items', 'items')
            .leftJoinAndSelect('items.topic', 'itemTopic')
            .where('yearGroup.id = :yearGroupId', { yearGroupId: schoolClass.yearGroup.id })
            .andWhere('subject.programmeType IN (:...allowedProgrammes)', { allowedProgrammes })
            // Fixed sequences only from the year this school is currently teaching; interval
            // sequences always, since they carry no dates and belong to no year (LEA-6584).
            //
            // The interval arm is load bearing rather than defensive: period.index is null for
            // those, so the equality alone yields null and excludes them all.
            //
            // Note this is deliberately not a filter on whether the item dates have passed: a
            // sequence whose dates are behind is still offered, so the UI can render
            // templatePlanItems and let the leader re-date it. Filtering on the declared year narrows
            // what is offered; filtering on the dates would take that escape hatch away.
            //
            // The hatch is per-row editing, or dropping the past-dated rows (LEA-6596). It used to be
            // a single "Move all the dates" action, which LEA-6625 removed: moving every topic by one
            // offset preserved the gaps while dragging a holiday-dodging set onto a holiday.
            .andWhere('(sequence.timingMode = :intervalMode OR period.index = :currentPeriodIndex)', {
                intervalMode: SequenceTimingMode.INTERVAL,
                currentPeriodIndex: schoolClass.school.curentPeriod.index
            });

        // A group takes its subjects from its own licence rather than the whole programme, matching
        // how allSubjectsWithTopics narrows the teacher's topic list for groups.
        if (schoolClass.parentClass) {
            const subjectIds = (schoolClass.subjects ?? []).map((subject) => subject.id);

            if (!subjectIds.length) return [];

            query.andWhere('subject.id IN (:...subjectIds)', { subjectIds });
        }

        return query.orderBy('sequence.name', 'ASC').addOrderBy('items.order', 'ASC').getMany();
    }

    /**
     * Whether each class should be offered Money Skills auto-scheduling, in the key order the loader
     * asked for. Batched because the school overview asks it of every class it lists.
     *
     * A class qualifies when all three hold:
     *
     * 1. the school has Money Skills and the class's own licence allows it, which is exactly what
     *    {@link allowedProgrammeTypesForClass} answers, the same rule the assign flow applies. With
     *    Money Skills licensed per school and switched on everywhere, that is every class except a
     *    Ready Teddy one;
     * 2. a Money Skills sequence exists for the class's year group, so the action leads somewhere;
     * 3. the class is in the school's current academic year, so a Ready Teddy class waiting for next
     *    September is never offered it.
     *
     * Both decisions were taken with the team on 2026-08-17. An earlier version also required the
     * class to already have a Money Skills topic scheduled, as the only per-class evidence that it
     * does Money Skills at all. That was dropped: leaders are meant to auto-schedule in the first term
     * before any Money Skills topic exists, so waiting for one would have shut the door on the very
     * journey the feature is for.
     *
     * Two small queries rather than one join across both, because the second is per year group rather
     * than per class.
     */
    public async getMoneySkillsAutoScheduleAvailability(classIds: readonly string[]): Promise<boolean[]> {
        if (!classIds.length) return [];

        const classes = await this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoin('schoolClass.school', 'school')
            .leftJoin('schoolClass.yearGroup', 'yearGroup')
            .leftJoin('schoolClass.period', 'period')
            .leftJoin('school.curentPeriod', 'currentPeriod')
            .where('schoolClass.id IN (:...classIds)', { classIds })
            .select([
                'schoolClass.id',
                'schoolClass.isFullProgramme',
                'schoolClass.isReadyTeddyEnabled',
                'schoolClass.IsReadingLogsEnabled',
                'schoolClass.isRegistrationClass',
                'schoolClass.isGroupAcrossClasses',
                'school.isMoneySkillsAvailable',
                'period.index',
                'currentPeriod.index',
                'yearGroup.id'
            ])
            .getMany();

        const entitled = classes.filter(
            (schoolClass) =>
                schoolClass.yearGroup &&
                isCurrentAcademicYearClass(schoolClass) &&
                allowedProgrammeTypesForClass(schoolClass).includes(SubjectProgrammeType.MONEY_SKILLS)
        );

        if (!entitled.length) return classIds.map(() => false);

        const yearGroupIds = [...new Set(entitled.map((schoolClass) => schoolClass.yearGroup.id))];
        const currentPeriodIndexes = [...new Set(entitled.map((schoolClass) => Number(schoolClass.school.curentPeriod.index)))];

        const sequences = await this.sequenceRepository
            .createQueryBuilder('sequence')
            .innerJoin('sequence.subject', 'subject')
            .innerJoin('sequence.yearGroup', 'yearGroup')
            // LEFT, not INNER: an interval sequence has no period and an inner join drops them all.
            .leftJoin('sequence.period', 'period')
            .where('yearGroup.id IN (:...yearGroupIds)', { yearGroupIds })
            .andWhere('subject.programmeType = :programmeType', { programmeType: SubjectProgrammeType.MONEY_SKILLS })
            // Fixed sequences narrowed to the academic years actually represented in this batch, so
            // the query stays as small as the question; interval sequences always, since they belong
            // to no year. LEA-6584.
            .andWhere('(sequence.timingMode = :intervalMode OR period.index IN (:...currentPeriodIndexes))', {
                intervalMode: SequenceTimingMode.INTERVAL,
                currentPeriodIndexes
            })
            .select('yearGroup.id', 'yearGroupId')
            .addSelect('period.index', 'periodIndex')
            .groupBy('yearGroup.id')
            .addGroupBy('period.index')
            .getRawMany<{ yearGroupId: string; periodIndex: number | null }>();

        // Two sets, because a sequence answers for a year group in one of two different ways.
        //
        // A FIXED sequence answers only for its own year, so it is keyed on the pair. The loader
        // batches by class id, so the classes in one batch are not guaranteed to share a school and
        // two schools can be on different academic years; each class must match a sequence for its
        // own year, not for any year present in the batch.
        //
        // An INTERVAL sequence has no year and answers for its year group in every one of them, so
        // it is keyed on the year group alone. Rolling it into the pair set with a null period would
        // make it match no class at all, which is the bug this shape exists to avoid.
        const sequenceKey = (yearGroupId: unknown, periodIndex: unknown): string => `${String(yearGroupId)}:${Number(periodIndex)}`;

        const datedYearGroups = new Set<string>();
        const undatedYearGroups = new Set<string>();

        sequences.forEach((row) => {
            if (row.periodIndex === null || row.periodIndex === undefined) {
                undatedYearGroups.add(String(row.yearGroupId));
            } else {
                datedYearGroups.add(sequenceKey(row.yearGroupId, row.periodIndex));
            }
        });

        const availableByClassId = new Map(
            entitled.map((schoolClass) => [
                String(schoolClass.id),
                undatedYearGroups.has(String(schoolClass.yearGroup.id)) ||
                    datedYearGroups.has(sequenceKey(schoolClass.yearGroup.id, schoolClass.school.curentPeriod.index))
            ])
        );

        return classIds.map((classId) => availableByClassId.get(String(classId)) ?? false);
    }

    /**
     * The classes this user may auto-schedule a sequence onto, for the picker the Topic library page
     * opens. Only classes that can actually be scheduled are returned, so the picker never offers a
     * class that would land on an empty auto-schedule page.
     *
     * A class qualifies when all four hold, which is {@link getAssignableSequencesForClass}'s own
     * rule asked of many classes at once rather than of one:
     *
     * 1. it is an active registration class, so groups, groups across classes and every non-active
     *    state are excluded, matching what the class schedule page offers the action for;
     * 2. it is in the school's current academic year, by equality, so a pre-admission class and one
     *    left behind in a finished year are both excluded;
     * 3. it is entitled to at least one programme, via {@link allowedProgrammeTypesForClass}; and
     * 4. a sequence exists for its year group **in a programme it is entitled to**.
     *
     * Condition 4 is why the second query keys on the pair rather than on the year group alone, which
     * is the one place the obvious implementation is wrong. {@link getMoneySkillsAutoScheduleAvailability}
     * can key on year group because its programme is fixed; here it is not, so a year group set would
     * let an English sequence answer for a class entitled only to Money Skills.
     *
     * **The scope is derived from the caller, never passed in.** A teacher may read any class in
     * their school but may only write to the classes they are attached to, so offering a leader's
     * view to a teacher would preview happily and then fail authorization on assign. Deliberately
     * unlike `getSchoolClassesAndGroups`, which takes a `myClasses` argument because a leader there
     * has a genuine choice of view; here there is none to offer, so accepting the argument would only
     * create something to police.
     *
     * Two queries whatever the class count, and the second is skipped when nothing is entitled.
     */
    public async getAutoSchedulableClassesForSchool(
        schoolId: string,
        teacherId: string,
        isSchoolLeaderOrAdmin: boolean
    ): Promise<AutoSchedulableClassOutput[]> {
        const query = this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .innerJoin('schoolClass.school', 'school', 'school.id = :schoolId', { schoolId })
            .innerJoin('schoolClass.yearGroup', 'yearGroup')
            .innerJoin('schoolClass.period', 'period')
            .innerJoin('school.curentPeriod', 'currentPeriod')
            .leftJoin('schoolClass.teachers', 'teachers')
            .where('schoolClass.isRegistrationClass = :isRegistrationClass', { isRegistrationClass: true })
            .andWhere('schoolClass.isGroupAcrossClasses = :isGroupAcrossClasses', { isGroupAcrossClasses: false })
            .andWhere('schoolClass.status = :status', { status: SchoolClassStatus.ACTIVE })
            // The current-academic-year rule, in SQL rather than in memory because this is a list.
            // Equality, exactly as isCurrentAcademicYearClass compares them for a single class.
            .andWhere('period.index = currentPeriod.index')
            .select([
                'schoolClass.id',
                'schoolClass.name',
                'schoolClass.isFullProgramme',
                'schoolClass.isReadyTeddyEnabled',
                'schoolClass.IsReadingLogsEnabled',
                'schoolClass.isRegistrationClass',
                'schoolClass.isGroupAcrossClasses',
                'school.isMoneySkillsAvailable',
                'yearGroup.id',
                'yearGroup.year',
                'period.index',
                'period.shortName',
                'currentPeriod.index',
                'teachers.id'
            ])
            .orderBy('yearGroup.year', 'ASC')
            .addOrderBy('schoolClass.name', 'ASC');

        // A teacher is only ever offered classes they may write to. Applied as a subquery rather than
        // as a condition on the joined `teachers` so that join can still report every teacher, which
        // is what `isMyClass` reads and what a filtered join would have thrown away.
        if (!isSchoolLeaderOrAdmin) {
            query.andWhere((qb) => {
                const mine = qb
                    .subQuery()
                    .select('myClass.id')
                    .from(LwpSchoolClass, 'myClass')
                    .innerJoin('myClass.teachers', 'myTeacher')
                    .where('myTeacher.id = :teacherId')
                    .getQuery();

                return `schoolClass.id IN ${mine}`;
            });
            query.setParameter('teacherId', teacherId);
        }

        const schoolClasses = await query.getMany();

        const entitlementByClassId = new Map<string, SubjectProgrammeType[]>();

        const entitled = schoolClasses.filter((schoolClass) => {
            const allowedProgrammes = allowedProgrammeTypesForClass(schoolClass);

            if (!allowedProgrammes.length) return false;

            entitlementByClassId.set(String(schoolClass.id), allowedProgrammes);

            return true;
        });

        if (!entitled.length) return [];

        const yearGroupIds = [...new Set(entitled.map((schoolClass) => schoolClass.yearGroup.id))];
        const programmeTypes = [...new Set(entitled.flatMap((schoolClass) => entitlementByClassId.get(String(schoolClass.id))))];

        /*
         * Entities rather than raw rows, and the pairs are derived here rather than by GROUP BY.
         *
         * A grouped raw query would return exactly the distinct pairs and nothing else, which is the
         * shape this wants, but its correctness depends on invariants a later edit can break silently:
         * both joins staying ManyToOne, and the grouping surviving. A joined collection or a dropped
         * GROUP BY makes raw rows fan out, and this reads them into a Set, so the fault would not look
         * like a fault. Hydrated entities cannot fan out.
         *
         * The cost is one row per sequence rather than per distinct pair. Sequences are global static
         * data narrowed to the year groups of one school's classes, so that is a handful of rows either
         * way, and the Set collapses the repeats.
         */
        /*
         * Every class above is in the school's current academic period, because the outer query
         * requires `period.index = currentPeriod.index`, so one period answers for all of them.
         */
        const currentPeriodIndex = entitled[0].school.curentPeriod.index;

        const sequences = await this.sequenceRepository
            .createQueryBuilder('sequence')
            .innerJoin('sequence.subject', 'subject')
            .innerJoin('sequence.yearGroup', 'yearGroup')
            // LEFT, not INNER: an interval sequence has no period and an inner join drops them all.
            .leftJoin('sequence.period', 'period')
            .where('yearGroup.id IN (:...yearGroupIds)', { yearGroupIds })
            .andWhere('subject.programmeType IN (:...programmeTypes)', { programmeTypes })
            // Fixed sequences only from the year this school is currently teaching; interval
            // sequences always (LEA-6584).
            //
            // This read is the fifth enforcement point, and it did not exist when the other four
            // were written: LEA-6533 added it afterwards. Without it the Topic library's class
            // picker offers a class whose only sequence is built for next year, the teacher picks
            // it, and the auto-schedule page they land on correctly finds nothing. That is exactly
            // the dead end LEA-6560 was raised to remove, reached by a different route.
            .andWhere('(sequence.timingMode = :intervalMode OR period.index = :currentPeriodIndex)', {
                intervalMode: SequenceTimingMode.INTERVAL,
                currentPeriodIndex
            })
            // The sequence's own id is selected because it is what TypeORM hydrates each entity from,
            // not because anything here reads it.
            .select(['sequence.id', 'yearGroup.id', 'subject.programmeType'])
            .getMany();

        /*
         * The key stays the (year group, programme) pair and does not need the period, unlike the
         * Money Skills loader's. That loader batches by class id and can hold classes from schools
         * on different years; this one is scoped to a single school, and the query above has already
         * narrowed to that school's year, so every sequence here is valid for every class here.
         */
        const covered = new Set(sequences.map((sequence) => `${String(sequence.yearGroup?.id)}::${sequence.subject?.programmeType}`));

        return entitled
            .filter((schoolClass) =>
                entitlementByClassId
                    .get(String(schoolClass.id))
                    .some((programmeType) => covered.has(`${String(schoolClass.yearGroup.id)}::${programmeType}`))
            )
            .map((schoolClass) => ({
                id: String(schoolClass.id),
                name:
                    schoolClass.period?.index < schoolClass.school?.curentPeriod?.index
                        ? `${schoolClass.period?.shortName}: ${schoolClass.name}`
                        : schoolClass.name,
                year: schoolClass.yearGroup.year,
                isMyClass: (schoolClass.teachers ?? []).some((teacher) => String(teacher.id) === String(teacherId))
            }));
    }

    /** What assigning would do, without persisting anything, so the leader can confirm the dates. */
    public async previewSequenceForClass(input: AssignSequenceToClassInput): Promise<SequenceAssignmentPlan> {
        const { plan } = await this.buildPlan(input);

        return plan;
    }

    /**
     * Creates the class's topics from the sequence, in one transaction so a failure leaves nothing
     * behind. The unique (classSequenceAssignmentId, topicId) constraint guards a retry.
     */
    public async assignSequenceToClass(input: AssignSequenceToClassInput, userId: string): Promise<SequenceAssignmentPlan> {
        const { plan, schoolClass, sequence, toCreate } = await this.buildPlan(input);

        /*
         * Refused rather than written as an empty assignment.
         *
         * Reachable once a teacher can drop rows (LEA-6596) and once skips give up their slots: drop
         * or skip every topic and there is nothing left to create. The page disables its button in
         * that state, but the rule belongs here too, exactly as the past-date rule does.
         *
         * An empty assignment is not merely useless. `hasAssignments` counts rows rather than class
         * topics, so one would permanently lock the sequence's academic year in the admin form with
         * "This sequence has been scheduled for a class", about a class that was given nothing.
         */
        if (!toCreate.length) {
            throw new HttpException('There is nothing to add to this class', ErrorStatusCodeEnum._535);
        }

        /*
         * The transaction stays here rather than in ClassTopicService, because the assignment row has
         * to exist before the class topics that reference it. The rows themselves go through the same
         * shared write as the teacher-facing routes, so nothing can be handled by one path and missed
         * by the other. Sequenced topics carry no media today, so nothing is stored and no effects come
         * back, but the cleanup and the post-commit call are wired anyway: LEA-6500 adds photos to this
         * flow, and it must inherit the storage rules rather than reinvent them.
         *
         * Both undo lists are owned here rather than by the inner half, because they are operation-wide
         * and a whole-school run appends one class's work to the same pair (LEA-6681).
         */
        const storedFiles: StoredFile[] = [];
        const effects: ClassTopicWriteEffects[] = [];

        let assignment: LwpClassSequenceAssignment;

        try {
            assignment = await this.connection.transaction((manager) =>
                this.persistSequenceAssignmentForClass(manager, { input, schoolClass, sequence, toCreate, userId, storedFiles, effects })
            );
        } catch (err) {
            await this.classTopicService.discardStoredFiles(storedFiles);

            throw err;
        }

        await this.classTopicService.applyClassTopicWriteEffects(effects);

        plan.assignment = await this.assignmentRepository
            .createQueryBuilder('assignment')
            .leftJoinAndSelect('assignment.classTopics', 'classTopics')
            .leftJoinAndSelect('classTopics.topic', 'topic')
            .where('assignment.id = :assignmentId', { assignmentId: assignment.id })
            .orderBy('classTopics.releaseDate', 'ASC')
            .getOne();

        return plan;
    }

    /**
     * One class's assignment and its class topics, written through a transaction the caller owns.
     *
     * Split out of `assignSequenceToClass` for LEA-6681, so that whole-school auto-scheduling can call
     * it once per class inside a single transaction and get all or nothing. A half-scheduled school is
     * worse than an unscheduled one, because the leader cannot tell which half succeeded.
     *
     * **Database work only.** It must never open a transaction of its own and never reach object
     * storage, which is why the manager is a required argument rather than a comment: the two effects
     * that cannot be rolled back are recorded in `storedFiles` and `effects` for the caller to act on
     * at the only safe moments, after a rollback and after a commit respectively. That is LEA-6460's
     * rule, and looping over a method that owned its own transaction would have reintroduced exactly
     * the partial-commit defect it fixed.
     *
     * Both arrays are appended to rather than returned, so a caller that fails part way through a
     * multi-class run still holds the complete list of what the whole run stored.
     *
     * The empty-plan refusal is not here. It belongs to the class-level route, which has one class to
     * speak for; a whole-school caller needs its own answer per class, and that is LEA-6504's problem.
     */
    public async persistSequenceAssignmentForClass(
        manager: EntityManager,
        work: SequenceAssignmentWrite
    ): Promise<LwpClassSequenceAssignment> {
        const { input, schoolClass, sequence, toCreate, userId, storedFiles, effects, wholeSchoolAssignment } = work;

        const user = this.shallowUserService.newShallowUser(userId);

        const assignment = manager.create(LwpClassSequenceAssignment, {
            class: { id: schoolClass.id },
            sequence: { id: sequence.id },
            sequenceName: sequence.name,
            // The anchor is only meaningful for INTERVAL; FIXED items carry their own dates.
            // Null too where there is none to record, which means every topic was dropped and
            // nothing was dated from it.
            startDate: sequence.timingMode === SequenceTimingMode.INTERVAL && input.startDate ? toDateOnly(input.startDate) : null,
            /*
             * Recorded whether or not the leader changed it, so the row says what this class was
             * actually given. The sequence is mutable and editing it does not touch existing
             * assignments, so its current interval is no evidence of what was used here.
             */
            // Copied from the sequence, which is the only place a cadence exists now that a
            // teacher is not offered one (LEA-6624). Snapshotted rather than read through the
            // relation later, because the sequence is mutable: an admin editing it does not
            // touch this row, which is the whole reason the column is here.
            intervalDays: sequence.timingMode === SequenceTimingMode.INTERVAL ? sequence.intervalDays : null,
            status: SequenceAssignmentStatus.ASSIGNED,
            /*
             * Null for every class-level assignment, set for every class in a whole-school run
             * (LEA-6698). Written here rather than by the caller afterwards, so a row cannot exist
             * unlinked even briefly: LEA-6700's removal finds a run's rows through this column, and
             * one written in a second pass would be invisible to it if the pass never happened.
             */
            wholeSchoolAssignment: wholeSchoolAssignment ?? null,
            logCreatedBy: user
        });

        const savedAssignment = await manager.save(assignment);

        const context = await this.classTopicService.beginClassTopicWrite(manager, storedFiles);

        for (const planned of toCreate) {
            const topic = sequence.items.find((item) => item.topic.id === planned.topicId)?.topic;

            /*
             * The shared write, so a sequenced topic is created exactly as a hand-scheduled one
             * is. It also links the subject for a registration or group-across-classes class,
             * once per operation rather than once per topic, which is what the block that used
             * to sit below this loop did by hand.
             */
            const { effects: written } = await this.classTopicService.persistClassTopic(context, {
                schoolClass,
                topic,
                releaseDate: planned.releaseDate,
                dueDate: planned.dueDate,
                createdBy: userId,
                logCreatedBy: user,
                classSequenceAssignment: savedAssignment,
                subjectsToLink: [sequence.subject]
            });

            effects.push(written);
        }

        return savedAssignment;
    }

    /**
     * Withdraws an assignment: its future, unreleased topics are removed, and released ones are kept
     * so pupils never lose work. The row itself survives, marked REMOVED, because those retained
     * topics still point at it for provenance.
     */
    public async removeAssignment(assignmentId: string, userId: string): Promise<OperationStatus> {
        const assignment = await this.assignmentRepository
            .createQueryBuilder('assignment')
            .leftJoinAndSelect('assignment.classTopics', 'classTopics')
            .where('assignment.id = :assignmentId', { assignmentId })
            .getOne();

        if (!assignment) throw new HttpException('Sequence assignment does not exist', ErrorStatusCodeEnum._535);

        const removableIds = (assignment.classTopics ?? []).filter((classTopic) => !classTopic.released).map((classTopic) => classTopic.id);

        const user = this.shallowUserService.newShallowUser(userId);

        await this.connection.transaction(async (manager) => {
            await this.persistAssignmentRemoval(manager, assignmentId, removableIds, user);
        });

        const retained = (assignment.classTopics ?? []).length - removableIds.length;

        return {
            status: 'ok',
            msg: `${removableIds.length} scheduled topics removed, ${retained} already released and kept`
        } as OperationStatus;
    }

    /**
     * The writing half of a removal, taking a caller's `EntityManager` rather than opening one.
     *
     * **Public for the whole-school removal (LEA-6700)**, which withdraws every class a run
     * scheduled and has to do it in a single transaction: a half-removed school is exactly the state
     * LEA-6698 went to such lengths to make unreachable when scheduling. This is the same split
     * LEA-6681 made for the assign path, and for the same reason, so there is one implementation of
     * "unreleased topics go, released ones stay" rather than two that can drift.
     *
     * It deliberately takes the ids to delete rather than working them out, because the caller has
     * already loaded the class topics to count what it is about to keep, and reading them twice
     * inside the transaction would hold it open for no gain.
     */
    public async persistAssignmentRemoval(
        manager: EntityManager,
        assignmentId: string,
        removableClassTopicIds: string[],
        user: LwpUser
    ): Promise<void> {
        /*
         * Released topics are never in this list, which is the rule the whole removal exists to
         * protect: a child who has done the work must not lose it because a leader corrected a
         * scheduling mistake weeks later.
         */
        if (removableClassTopicIds.length) await manager.delete(LwpClassTopic, removableClassTopicIds);

        /*
         * The row survives rather than being deleted. Any released topic it kept still points at it,
         * and it is the only record of where those topics came from.
         */
        await manager.update(LwpClassSequenceAssignment, assignmentId, {
            status: SequenceAssignmentStatus.REMOVED,
            logUpdatedBy: user
        });
    }

    /**
     * Shared by preview and assign so the leader confirms exactly what they were shown: same
     * eligibility check, same dates, same skips.
     */
    /**
     * Everything one class's assignment needs, resolved without a transaction and without writing.
     *
     * **Public for the whole-school fan-out (LEA-6698)**, which builds every class's plan before it
     * opens anything, then passes each one straight to {@link persistSequenceAssignmentForClass}.
     * That split is LEA-6460's rule: phase 1 resolves entities outside a transaction, phase 2 is pure
     * SQL inside one. Left private by LEA-6681 precisely so that widening it would be a deliberate
     * act rather than something a caller discovered.
     *
     * It still **throws** rather than reporting, which the whole-school caller has to allow for: a
     * class this refuses fails the entire run, which is what "all or nothing" means.
     *
     * The one exception is {@link BuildPlanOptions.skipPastDatedTopics}, which LEA-6699 added for the
     * whole-school path. It is **opt in, and off by default**, so the class-level flow keeps throwing
     * on a past-dated topic exactly as it always has. That difference is deliberate rather than an
     * inconsistency: a teacher can edit a row's date or drop it and recover, and a leader cannot,
     * because nothing on the whole-school page is editable.
     */
    public async buildPlan(
        input: AssignSequenceToClassInput,
        options: BuildPlanOptions = {}
    ): Promise<{
        plan: SequenceAssignmentPlan;
        schoolClass: LwpSchoolClass;
        sequence: StaticLwpTopicSequence;
        toCreate: PlannedClassTopicDates[];
    }> {
        const schoolClass = await this.loadClass(input.classId);
        const sequence = await this.loadSequence(input.sequenceId);

        this.assertClassMayBeAssigned(schoolClass, sequence);

        if (!sequence.items?.length) throw new HttpException('This sequence has no topics to assign', ErrorStatusCodeEnum._535);

        /*
         * Topics the teacher dropped (LEA-6596). Still returned below, so the page can show them
         * struck through and offer them back; simply never dated and never created.
         *
         * Ids are compared as strings, since they arrive from GraphQL as strings and off the entity
         * as bigints that stringify.
         */
        const excludedTopicIds = new Set((input.excludedTopicIds ?? []).map(String));

        const orderedItems = [...sequence.items].sort((first, second) => first.order - second.order);

        /*
         * Resolved before the dates rather than after, which it can be because skips turn on topic ids
         * and publication state and never on when anything is scheduled.
         */
        const { skips: skipReasons, alreadyScheduledByHand } = await this.resolveSkips(schoolClass.id, sequence.items);

        const includedItems = orderedItems.filter(
            (item) => !excludedTopicIds.has(String(item.topic.id)) && !skipReasons.has(item.topic.id)
        );

        /*
         * Dated from the topics the class will actually be given, not from the whole sequence.
         *
         * On an interval sequence a topic's position in this list *is* its date, so a topic that will
         * not be created cannot hold a slot: dropping one out of the middle of a weekly sequence has
         * to move everything below it up by a week. Planning the full list and filtering afterwards
         * left the class with a topic, then a dead week, then the next one, which also broke the
         * promise the form makes: each topic runs until the next one begins. Putting a dropped topic
         * back pushes them down again, because this list is rebuilt on every preview.
         *
         * Skips count as not created for exactly the same reason, and the team agreed they should.
         * A skipped row is already shown greyed out and unactionable, saying the class is not getting
         * this one, so the dates beside it were pure fiction: nothing would ever exist on them. The
         * sharpest case was a skip at the *top* of a sequence, which pushed the first real topic a
         * whole interval past the start date the teacher had chosen.
         *
         * Content that is unavailable was never in doubt. What the class already has is the arguable
         * one, since it does hold that topic somewhere; but nothing here knows when, because an
         * earlier assignment chose those dates, so holding the slot would be a guess rather than
         * knowledge.
         *
         * A fixed sequence is unaffected either way, since each of its items carries its own dates.
         * Only its skipped and dropped rows change, and only by no longer showing a window.
         */
        const planned = includedItems.length
            ? planClassTopicDates(
                  // The sequence's cadence, which is now the only one there is (LEA-6624). That
                  // retires a hazard: this and the value `assignSequenceToClass` records used to be
                  // two expressions that had to agree, and a divergence would have left a row
                  // claiming a cadence its own dates were not generated from. One source, no pair.
                  //
                  // planClassTopicDates rejects anything under a day, so no separate guard is needed.
                  { timingMode: sequence.timingMode, intervalDays: sequence.intervalDays },
                  includedItems.map((item) => ({
                      topicId: item.topic.id,
                      order: item.order,
                      startDate: item.startDate,
                      endDate: item.endDate
                  })),
                  input.startDate,
                  input.overrides ?? []
              )
            : // Nothing left to give this class, because every topic was dropped or skipped, so there
              // is nothing to date and no interval to validate against. The rows still come back
              // below, saying which it was and offering the dropped ones back.
              [];

        /*
         * Checked against what would actually be created, which is what makes dropping a row a real
         * second way out of a past-dated fixed sequence rather than a cosmetic one: an excluded topic
         * was never dated, so its date cannot block the assignment.
         *
         * The rule itself is unchanged either way. Nothing may be scheduled in the past. All that
         * differs is the remedy: at class level the caller is told to move the dates, and on the
         * whole-school path there is nobody who can, so the topic is skipped and reported instead.
         */
        const pastDated = findPastDatedTopicIds(planned);

        if (pastDated.length && !options.skipPastDatedTopics) {
            const names = sequence.items
                .filter((item) => pastDated.includes(item.topic.id))
                .map((item) => item.topic.teacherTopicName ?? item.topic.id);

            throw new HttpException(
                `These topics would be scheduled in the past, so adjust their dates first: ${names.join(', ')}`,
                ErrorStatusCodeEnum._535
            );
        }

        /*
         * Empty unless the caller opted in, because the throw above is otherwise the only way past a
         * non-empty `pastDated`. That is what keeps the class-level plan byte for byte what it was.
         */
        const pastDatedTopicIds = new Set(pastDated);

        /*
         * Recorded as a skip so the row says why, rather than the topic simply vanishing. Set after
         * the dates are planned rather than alongside the other skips, because unlike them this one
         * is not knowable until the dates exist: `resolveSkips` turns on topic ids and publication
         * state alone.
         *
         * That ordering has one consequence worth stating. The other skips are removed **before**
         * `planClassTopicDates`, so on an INTERVAL sequence they close the gap they leave and every
         * later topic moves up. These are removed after, so they do not. It cannot bite today, since
         * only FIXED sequences may be whole-school members and a FIXED topic carries its own dates,
         * so there is no reflow to miss. An INTERVAL sequence reaching here with this option on would
         * need that settled first.
         */
        pastDatedTopicIds.forEach((topicId) => skipReasons.set(topicId, SequenceItemSkipReason.DATE_IN_PAST));

        /*
         * Skipped and dropped topics were never dated, so past-dated ones are the only thing left to
         * filter out, and only when the caller asked for them to be skipped.
         */
        const toCreate = pastDatedTopicIds.size ? planned.filter((item) => !pastDatedTopicIds.has(item.topicId)) : planned;

        /*
         * Built from everything planned, including the past-dated rows, so a skipped row still shows
         * the date that passed. That is the evidence for its own reason, and unlike the other skips
         * the date is a real one the admin set rather than a slot that never existed.
         */
        const datesByTopicId = new Map(planned.map((item) => [item.topicId, item]));

        /*
         * Built from the whole sequence rather than from what was planned, so a dropped topic keeps a
         * row to strike through and a button to bring it back. It just has no dates: it is not being
         * scheduled, and on an interval sequence the slot it used to hold no longer exists.
         */
        const items: SequenceAssignmentPlanItem[] = orderedItems.map((sequenceItem) => {
            const topicId = sequenceItem.topic.id;
            const dates = datesByTopicId.get(topicId);

            return {
                topic: sequenceItem.topic,
                order: sequenceItem.order,
                releaseDate: dates?.releaseDate ?? null,
                dueDate: dates?.dueDate ?? null,
                skipped: skipReasons.has(topicId),
                skipReason: skipReasons.get(topicId),
                /*
                 * Only worth saying about a topic that is actually being created. A skipped one
                 * already carries its own reason, and two explanations on one row would contradict
                 * each other.
                 *
                 * A dropped one is excluded for the same reason and it matters more: this warning
                 * says the class will end up with the topic twice, which is simply untrue once the
                 * teacher has said not to give it to them at all.
                 */
                alreadyScheduled:
                    alreadyScheduledByHand.has(topicId) && !skipReasons.has(topicId) && !excludedTopicIds.has(String(topicId)),
                excluded: excludedTopicIds.has(String(topicId))
            };
        });

        const plan: SequenceAssignmentPlan = {
            sequence,
            /*
             * Null for a fixed sequence, which has no anchor, and null when there is no start date to
             * record. The second case is reachable only with every topic dropped: nothing is dated, so
             * there is no anchor anything was computed from, and moment() would quietly report today
             * as though there were.
             */
            startDate: sequence.timingMode === SequenceTimingMode.INTERVAL && input.startDate ? toDateOnly(input.startDate) : null,
            items,
            scheduledCount: toCreate.length,
            /*
             * Counted separately rather than as "everything not created", which is what this was
             * before exclusions existed. A skip is the server's decision and an exclusion is the
             * teacher's, and the summary line says different things about them.
             *
             * A topic that is both skipped and excluded counts once, as a skip: the server withheld
             * it whatever the teacher chose, so saying they dropped it would be untrue.
             */
            skippedCount: items.filter((item) => item.skipped).length,
            excludedCount: items.filter((item) => item.excluded && !item.skipped).length
        };

        return { plan, schoolClass, sequence, toCreate };
    }

    /**
     * Safe-skip rather than fail, and warn rather than skip where the leader might reasonably want
     * the topic anyway.
     *
     * A topic the class already has is treated differently depending on how it got there:
     *
     * - Created by auto-scheduling before, so it is **skipped**. Scheduling it again would repeat an
     *   action already taken, and without this, re-running the same set would silently double every
     *   topic in it.
     * - Scheduled by hand, so it is **warned about and still created**, giving the class a second
     *   copy on the sequence's dates. Decided with the team: the sequence's dates are the intended
     *   ones, and a teacher's own ad hoc scheduling should not quietly veto them.
     *
     * Unavailable content is always skipped: it should not reach pupils however it got here.
     */
    private async resolveSkips(
        classId: string,
        sequenceItems: StaticLwpTopicSequenceItem[]
    ): Promise<{ skips: Map<string, SequenceItemSkipReason>; alreadyScheduledByHand: Set<string> }> {
        const skips = new Map<string, SequenceItemSkipReason>();
        const alreadyScheduledByHand = new Set<string>();

        /*
         * Resolved from the sequence itself rather than from the planned dates, which is what makes a
         * dropped topic still able to come back carrying its skip reason: it is never dated, so it
         * would not be here at all if this worked off the plan.
         */
        sequenceItems.forEach(({ topic }) => {
            if (!topic) return;

            if (!topic.isPublished || topic.isHidden) skips.set(topic.id, SequenceItemSkipReason.CONTENT_UNAVAILABLE);
        });

        const topicIds = sequenceItems.map((item) => item.topic.id);

        const existing = topicIds.length
            ? await this.classTopicRepository
                  .createQueryBuilder('classTopic')
                  .innerJoin('classTopic.topic', 'topic')
                  .innerJoin('classTopic.class', 'class')
                  .leftJoin('classTopic.classSequenceAssignment', 'assignment')
                  .where('class.id = :classId', { classId })
                  .andWhere('topic.id IN (:...topicIds)', { topicIds })
                  .select(['classTopic.id', 'topic.id', 'assignment.id'])
                  .getMany()
            : [];

        existing.forEach((classTopic) => {
            if (classTopic.classSequenceAssignment) {
                skips.set(classTopic.topic.id, SequenceItemSkipReason.ALREADY_SCHEDULED);
            } else {
                alreadyScheduledByHand.add(classTopic.topic.id);
            }
        });

        return { skips, alreadyScheduledByHand };
    }

    private assertClassMayBeAssigned(schoolClass: LwpSchoolClass, sequence: StaticLwpTopicSequence): void {
        // Checked before anything else, because it is true of the class rather than of this pairing:
        // no sequence is assignable to a class outside the year the school is currently teaching.
        if (!isCurrentAcademicYearClass(schoolClass)) {
            throw new HttpException(CURRENT_ACADEMIC_YEAR_ONLY, ErrorStatusCodeEnum._535);
        }

        // The same rule from the sequence's side. Refused outright rather than skipped, matching how
        // the class-side rule behaves: the read path returns an empty list, the write path errors.
        // Never fires for an interval sequence, which belongs to no year.
        if (!isSequenceForCurrentAcademicYear(sequence, schoolClass)) {
            throw new HttpException(
                `This sequence was built for ${sequence.period?.shortName ?? 'another academic year'}, which is not the year this school is currently teaching`,
                ErrorStatusCodeEnum._535
            );
        }

        if (schoolClass.yearGroup?.id !== sequence.yearGroup?.id) {
            throw new HttpException('This sequence is for a different year group to the class', ErrorStatusCodeEnum._535);
        }

        const allowedProgrammes = allowedProgrammeTypesForClass(schoolClass);

        if (!allowedProgrammes.includes(sequence.subject.programmeType)) {
            throw new HttpException(`This class is not set up for ${sequence.subject.name}`, ErrorStatusCodeEnum._535);
        }

        if (schoolClass.parentClass && !(schoolClass.subjects ?? []).some((subject) => subject.id === sequence.subject.id)) {
            throw new HttpException(`This group is not set up for ${sequence.subject.name}`, ErrorStatusCodeEnum._535);
        }
    }

    /** Loads only what entitlement, year group matching, the academic year and the subject link need. */
    private async loadClass(classId: string): Promise<LwpSchoolClass> {
        const schoolClass = await this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoin('schoolClass.school', 'school')
            .leftJoin('schoolClass.yearGroup', 'yearGroup')
            .leftJoin('schoolClass.parentClass', 'parentClass')
            .leftJoin('schoolClass.subjects', 'subjects')
            // Both academic years are joined rather than selected as ids: `schoolClass.periodIndex`
            // and `school.curentPeriodIndex` are @RelationId properties rather than columns, so they
            // are only populated by a relation load and cannot be asked for in a select list.
            .leftJoin('schoolClass.period', 'period')
            .leftJoin('school.curentPeriod', 'currentPeriod')
            .where('schoolClass.id = :classId', { classId })
            .select([
                'schoolClass.id',
                'schoolClass.isFullProgramme',
                'schoolClass.isReadyTeddyEnabled',
                'schoolClass.IsReadingLogsEnabled',
                'schoolClass.isRegistrationClass',
                'schoolClass.isGroupAcrossClasses',
                'school.isMoneySkillsAvailable',
                'period.index',
                'currentPeriod.index',
                'yearGroup.id',
                'parentClass.id',
                'subjects.id'
            ])
            .getOne();

        if (!schoolClass) throw new HttpException('Class does not exist', ErrorStatusCodeEnum._535);

        return schoolClass;
    }

    private async loadSequence(sequenceId: string): Promise<StaticLwpTopicSequence> {
        const sequence = await this.sequenceRepository
            .createQueryBuilder('sequence')
            .innerJoinAndSelect('sequence.subject', 'subject')
            .innerJoinAndSelect('sequence.yearGroup', 'yearGroup')
            // Joined rather than taken from sequence.periodIndex, which is a @RelationId and so is
            // only populated by a relation load. isSequenceForCurrentAcademicYear reads it.
            //
            // LEFT, not INNER. An interval sequence has no period, and an inner join here would not
            // merely skip the year check for it: the sequence would not load at all, and preview and
            // assign would both fail as though it did not exist.
            .leftJoinAndSelect('sequence.period', 'period')
            .leftJoinAndSelect('sequence.items', 'items')
            .leftJoinAndSelect('items.topic', 'topic')
            .where('sequence.id = :sequenceId', { sequenceId })
            .orderBy('items.order', 'ASC')
            .getOne();

        if (!sequence) throw new HttpException('Sequence does not exist', ErrorStatusCodeEnum._535);

        return sequence;
    }
}
