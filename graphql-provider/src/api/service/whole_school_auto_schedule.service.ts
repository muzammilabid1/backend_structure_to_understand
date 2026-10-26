import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    SequenceAssignmentStatus,
    SubjectProgrammeType,
    WholeSchoolSequenceStatus,
    WholeSchoolYearGroupSkipReason
} from 'lwp-shared/enums';
import moment from 'moment';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Connection, Repository } from 'typeorm';

import { AssignSequenceToClassInput } from '../dtos/AssignSequenceToClassInput';
import { WholeSchoolAssignmentResult } from '../dtos/WholeSchoolAssignmentResult';
import { WholeSchoolAutoScheduleProgramme } from '../dtos/WholeSchoolAutoScheduleProgramme';
import { WholeSchoolAssignmentRecord, WholeSchoolSequencePreview, WholeSchoolSequencePreviewRow } from '../dtos/WholeSchoolSequencePreview';
import { LwpClassSequenceAssignment } from '../entities/class_sequence_assignment';
import { LwpClassTopic } from '../entities/class_topic';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { StaticLwpTopicSequence } from '../entities/static_topic_sequence';
import { StaticLwpTopicSequenceItem } from '../entities/static_topic_sequence_item';
import { StaticLwpWholeSchoolSequence } from '../entities/static_whole_school_sequence';
import { LwpUser } from '../entities/user';
import { LwpWholeSchoolSequenceAssignment } from '../entities/whole_school_sequence_assignment';
import { ErrorStatusCodeEnum, OperationStatus, SchoolClassStatus } from '../model';
import { ClassSequenceAssignmentService, isReleaseDateInPast, PlannedClassTopicDates } from './class_sequence_assignment.service';
import { ClassTopicService, ClassTopicWriteEffects, StoredFile } from './class_topic.service';
import { allowedProgrammeTypesForClass } from './topic.service';

/**
 * One member sequence's **effective** totals: what a school scheduling it today would actually get.
 *
 * Effective rather than nominal. A topic whose release date has gone is skipped rather than
 * refused, so it is left out of `topicIds` and out of the span, and counted in
 * `skippedTopicCount` instead. One that is unpublished or hidden is left out the same way, and
 * counted in `unavailableTopicCount`. A school arriving in March against a January sequence sees
 * March to June and "2 topics skipped", not January to June.
 */
interface MemberSequenceTotals {
    /**
     * The topics a class would be given, as ids rather than a count.
     *
     * Ids because the count is no longer the same for every class: what a class already holds is
     * subtracted per class, and that can only be done by comparing the actual topics.
     */
    topicIds: string[];
    /** Topics left out because their release date has passed. */
    skippedTopicCount: number;
    /** Topics left out because they are unpublished or hidden, so they must not reach pupils. */
    unavailableTopicCount: number;
    /** The span of the topics that will be created, so the dates shown are ones that will happen. */
    startDate: Date | null;
    endDate: Date | null;
}

/**
 * The leader-facing half of whole-school auto-scheduling (LEA-6504): what a published whole-school
 * sequence would give one school, and later the action that gives it to them.
 *
 * **Separate from `WholeSchoolSequenceService` on purpose.** That one builds whole-school sequences
 * and every endpoint on its resolver is admin only. Hanging a leader-facing query off it would leave
 * one resolver whose class comment no longer describes it, which is the kind of drift that ends with
 * an admin mutation reachable by a leader. The two halves of the feature get two surfaces.
 *
 * Slice 4 (LEA-6697) is read-only and writes nothing at all. Slice 5 (LEA-6698) adds the assign
 * mutation here, which is why the class sweep below is a method of its own rather than inlined.
 */
@Injectable()
export class WholeSchoolAutoScheduleService {
    constructor(
        @InjectRepository(LwpSchool)
        private schoolRepository: Repository<LwpSchool>,
        @InjectRepository(LwpSchoolClass)
        private schoolClassRepository: Repository<LwpSchoolClass>,
        @InjectRepository(StaticLwpSubject)
        private subjectRepository: Repository<StaticLwpSubject>,
        @InjectRepository(StaticLwpWholeSchoolSequence)
        private wholeSchoolSequenceRepository: Repository<StaticLwpWholeSchoolSequence>,
        @InjectRepository(StaticLwpTopicSequenceItem)
        private sequenceItemRepository: Repository<StaticLwpTopicSequenceItem>,
        /*
         * Read only, and only to ask which of a member's topics a class already holds. The writing
         * of class topics stays with ClassTopicService, through the class-level assignment.
         */
        @InjectRepository(LwpClassTopic)
        private classTopicRepository: Repository<LwpClassTopic>,
        /*
         * A school's own record of having run (LEA-6700). Read to decide whether this school is
         * being offered the action or shown what it already has, and written by the removal that
         * frees the year again.
         */
        @InjectRepository(LwpWholeSchoolSequenceAssignment)
        private wholeSchoolAssignmentRepository: Repository<LwpWholeSchoolSequenceAssignment>,
        /*
         * The class assignments a run created, reached through `wholeSchoolAssignmentId`. They are
         * what the already-scheduled page is built from, because they are what the school actually
         * has; the whole-school sequence only says what it was offered.
         */
        @InjectRepository(LwpClassSequenceAssignment)
        private classAssignmentRepository: Repository<LwpClassSequenceAssignment>,
        /* When each leader last saw the Money Skills welcome modal (LEA-6505). */
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        /*
         * The class-level service is reused rather than reimplemented. Every class in a whole-school
         * run is scheduled by exactly the code that schedules one class on its own, which is what
         * LEA-6681's transaction hoist was for: two paths would drift, and this one would be the one
         * without the years of fixes.
         */
        private classSequenceAssignmentService: ClassSequenceAssignmentService,
        private classTopicService: ClassTopicService,
        private connection: Connection,
        private shallowUserService: ShallowUserService
    ) {}

    /**
     * Every programme this school could auto-schedule as a whole school, for the Auto schedule tab on
     * Set a topic (LEA-6687): whether each one can be scheduled yet, and what the school already holds
     * where it has.
     *
     * **Entitlement is read from the school's classes**, exactly as the preview does it: a programme
     * is listed when at least one class in the current year is entitled to it. A programme the school
     * has already scheduled is listed even if that has since lapsed, so the leader can still find it
     * to review or cancel.
     *
     * **Only what can be scheduled is listed.** A programme appears once the content team has
     * published a whole-school sequence for that subject and this school's year, which keeps the rule
     * free of any programme's name. Nothing else is shown, not even as coming soon: only Money Skills
     * can be published today, and any other programme appears by itself once the admin form allows it.
     *
     * The full programme is left out because the design draws no banner for it. Whether it should
     * ever appear is a question for design.
     *
     * Five queries, none of them per class, plus one per programme already scheduled, which is two
     * at most today.
     */
    public async getWholeSchoolAutoScheduleProgrammes(schoolId: string): Promise<WholeSchoolAutoScheduleProgramme[]> {
        const school = await this.loadSchoolWithCurrentPeriod(schoolId);

        if (!school?.curentPeriod) throw new HttpException('School does not exist', ErrorStatusCodeEnum._535);

        const periodIndex = school.curentPeriod.index;

        const [schoolClasses, subjects, publishedSequences, liveAssignments] = await Promise.all([
            this.loadCurrentYearClasses(schoolId),
            this.loadSchedulableSubjects(),
            this.loadPublishedSequences(periodIndex),
            this.loadLiveAssignments(schoolId, periodIndex)
        ]);

        const entitledProgrammes = new Set(schoolClasses.flatMap((schoolClass) => allowedProgrammeTypesForClass(schoolClass)));
        const publishedSubjectIds = new Set(publishedSequences.map((sequence) => String(sequence.subject.id)));
        const liveAssignmentBySubjectId = new Map(liveAssignments.map((assignment) => [String(assignment.subject.id), assignment]));

        const programmes = await Promise.all(
            subjects
                .filter(
                    (subject) =>
                        (entitledProgrammes.has(subject.programmeType) && publishedSubjectIds.has(String(subject.id))) ||
                        liveAssignmentBySubjectId.has(String(subject.id))
                )
                .map(async (subject) => {
                    const liveAssignment = liveAssignmentBySubjectId.get(String(subject.id));

                    return {
                        subjectId: String(subject.id),
                        subjectName: subject.name,
                        programmeType: subject.programmeType,
                        isAvailable: publishedSubjectIds.has(String(subject.id)),
                        assignment: liveAssignment ? await this.buildAssignmentRecord(liveAssignment) : undefined
                    };
                })
        );

        return programmes.sort((first, second) => first.subjectName.localeCompare(second.subjectName));
    }

    /**
     * The programmes the school overview should prompt this school to schedule (LEA-6688): entitled,
     * published for the school's current academic year, and not already scheduled for it.
     *
     * **Stores nothing.** Once the school schedules, the third condition stops holding and the
     * prompt goes by itself; a removal brings it back. There is no dismissal to record.
     *
     * Narrow because it runs on every load of a busy page. The first query answers the published and
     * not-yet-scheduled conditions together, selecting only the subject. It finds nothing on every
     * school until the content team publishes, and then the classes are never read. Only when it
     * finds something is entitlement checked, by the same rule as everywhere else rather than a copy
     * of it in SQL. Nothing is hydrated either way.
     */
    public async getWholeSchoolAutoSchedulePrompts(schoolId: string): Promise<WholeSchoolAutoScheduleProgramme[]> {
        const unscheduled = await this.wholeSchoolSequenceRepository
            .createQueryBuilder('wholeSchoolSequence')
            .innerJoin('wholeSchoolSequence.subject', 'subject')
            .innerJoin('wholeSchoolSequence.period', 'period')
            .innerJoin(LwpSchool, 'school', 'school.id = :schoolId AND school.curentPeriod = period.index', { schoolId })
            .leftJoin(
                LwpWholeSchoolSequenceAssignment,
                'assignment',
                'assignment.school = school.id AND assignment.subject = subject.id AND assignment.period = period.index AND assignment.status = :assigned',
                { assigned: SequenceAssignmentStatus.ASSIGNED }
            )
            .where('wholeSchoolSequence.status = :status', { status: WholeSchoolSequenceStatus.PUBLISHED })
            .andWhere('assignment.id IS NULL')
            // Left out for the same reason the Auto schedule tab leaves it out: the design draws no banner for it.
            .andWhere('subject.programmeType != :fullProgramme', { fullProgramme: SubjectProgrammeType.FULL_PROGRAMME })
            .select(['wholeSchoolSequence.id', 'subject.id', 'subject.name', 'subject.programmeType'])
            // A stable order when more than one programme prompts, the same the Auto schedule tab uses.
            .orderBy('subject.name')
            .getMany();

        if (!unscheduled.length) return [];

        const schoolClasses = await this.loadCurrentYearClasses(schoolId);
        const entitledProgrammes = new Set(schoolClasses.flatMap((schoolClass) => allowedProgrammeTypesForClass(schoolClass)));

        return unscheduled
            .filter(({ subject }) => entitledProgrammes.has(subject.programmeType))
            .map(({ subject }) => ({
                subjectId: String(subject.id),
                subjectName: subject.name,
                programmeType: subject.programmeType,
                isAvailable: true
            }));
    }

    /**
     * Records that this leader has seen the Money Skills welcome modal (LEA-6505), now. Whether to show it
     * is decided on the school overview from what it already loads: the auto-schedule prompts above include
     * Money Skills, and this date is from before the school's current academic year. Pressing twice just
     * moves the date.
     *
     * The time is Node's rather than the database's `now()`, because the column has no time zone: written
     * and read by the same driver it round-trips exactly, which the overview's year comparison relies on.
     */
    public async markMoneySkillsWelcomeSeen(userId: string): Promise<boolean> {
        await this.userRepository.update(userId, { lastMoneySkillsAutoScheduleWelcomeSeen: moment().toDate() });

        return true;
    }

    /**
     * What scheduling would give this school, computed without persisting anything.
     *
     * **Addressed by subject, and the whole-school sequence is resolved here rather than accepted
     * from the caller.** A whole-school sequence belongs to no school, so an id passed in carries no
     * authorization signal: the endpoint would have to separately prove it is published, that it is
     * for this school's academic year, and that this school is entitled to its subject. Deriving it
     * from the school's own current period makes a draft and another year's sequence unreachable
     * instead of merely refused, and there is at most one to find because `(subjectId, periodIndex)`
     * is unique.
     *
     * Four queries, none of them per class:
     *   1. the subject, for its name and the programme type entitlement turns on;
     *   2. the school, for the academic year everything else is scoped to;
     *   3. the published whole-school sequence with its members;
     *   4. the school's classes, swept once.
     * Plus one for the members' items, skipped when there are no members.
     */
    public async previewWholeSchoolSequence(schoolId: string, subjectId: string): Promise<WholeSchoolSequencePreview> {
        /*
         * Neither depends on the other, and one of them has to happen before anything else can: the
         * subject decides which classes are entitled, and the school decides which academic year the
         * whole answer is scoped to.
         *
         * The school's year is read from the school rather than from `StaticLwpPeriod.isCurrentPeriod`,
         * because a school can sit on a different year from the platform's and the class-level flow
         * already compares against the school's.
         */
        const [subject, school] = await Promise.all([
            this.subjectRepository
                .createQueryBuilder('subject')
                .where('subject.id = :subjectId', { subjectId })
                .select(['subject.id', 'subject.name', 'subject.programmeType'])
                .getOne(),
            this.loadSchoolWithCurrentPeriod(schoolId)
        ]);

        if (!subject) throw new HttpException('Subject does not exist', ErrorStatusCodeEnum._535);
        if (!school?.curentPeriod) throw new HttpException('School does not exist', ErrorStatusCodeEnum._535);

        const header = {
            subjectId: String(subject.id),
            subjectName: subject.name,
            academicYear: school.curentPeriod.shortName
        };

        /*
         * Asked before anything else, because a school that has already run is not being offered
         * anything and every other branch below would mislead it (LEA-6700).
         *
         * The empty state is the one that actually catches it. Since LEA-6699 the activity count is
         * exact, so a school holding every topic it would be given has nothing left to create and
         * falls through to "there is nothing to auto-schedule yet" moments after succeeding. The
         * action branch catches it too, the moment a teacher deletes one of their class's topics.
         *
         * Returned here rather than carried alongside a forecast, which would be a second sweep of
         * every class in the school to produce rows the page will not draw.
         */
        const liveAssignment = await this.loadLiveAssignment(schoolId, subjectId, school.curentPeriod.index);

        if (liveAssignment) {
            return {
                ...header,
                /*
                 * Deliberately not the run's own `wholeSchoolSequenceId`. This field is what the
                 * assign mutation is given, and a school in this state has nothing to assign; the
                 * run also outlives the sequence it ran, so it can be null on a perfectly good
                 * record.
                 */
                wholeSchoolSequenceId: undefined,
                rows: [],
                activitiesToCreate: 0,
                topicsSkipped: 0,
                classesCovered: 0,
                classesSkipped: 0,
                assignment: await this.buildAssignmentRecord(liveAssignment)
            };
        }

        const wholeSchoolSequence = await this.loadPublishedWholeSchoolSequence(subjectId, school.curentPeriod.index);

        /*
         * Nothing published for this subject and this school's year, so there is nothing to sweep the
         * school's classes for and no rows to build. Returned here rather than falling through, which
         * also keeps a school that opens the page before the content team has published from paying
         * for a class query whose answer could not be used.
         *
         * No rows at all, rather than every year group listed as having no sequence. A skip on a row
         * says the content team published something that leaves that year group out, and saying that
         * about every year group when nothing was published would be a different claim, and untrue.
         */
        if (!wholeSchoolSequence) {
            return {
                ...header,
                wholeSchoolSequenceId: undefined,
                rows: [],
                activitiesToCreate: 0,
                topicsSkipped: 0,
                classesCovered: 0,
                classesSkipped: 0
            };
        }

        const members = wholeSchoolSequence.members ?? [];

        const [eligibleClasses, memberTotalsBySequenceId] = await Promise.all([
            this.getEligibleClassesForSubject(schoolId, subject.programmeType),
            this.loadMemberSequenceTotals(members.map((member) => String(member.sequence.id)))
        ]);

        /*
         * Classes counted per year group once, so the table and the callout are two readings of the
         * same sweep rather than two counts that have to be kept in step.
         */
        const classesByYearGroupId = new Map<string, LwpSchoolClass[]>();
        /*
         * Taken off the classes rather than looked up again. A year group only reaches a row without a
         * member by having a class in it, so the sweep has already carried its name back and a second
         * query for it would be a round trip for something in hand.
         */
        const yearGroupNameById = new Map<string, string>();

        eligibleClasses.forEach((schoolClass) => {
            const yearGroupId = String(schoolClass.yearGroup.id);

            if (!classesByYearGroupId.has(yearGroupId)) classesByYearGroupId.set(yearGroupId, []);
            classesByYearGroupId.get(yearGroupId).push(schoolClass);
            yearGroupNameById.set(yearGroupId, schoolClass.yearGroup.year);
        });

        /*
         * The one query that is genuinely per class, asked once for the whole school rather than
         * once per class. Without it `activityCount` is an upper bound, and worse, a school whose
         * classes already hold everything is offered an action that creates nothing and then errors.
         */
        const alreadyHeldByClassId = await this.loadTopicsAlreadyHeld(
            schoolId,
            eligibleClasses.map((schoolClass) => String(schoolClass.id)),
            [...new Set([...memberTotalsBySequenceId.values()].flatMap((totals) => totals.topicIds))]
        );

        const rows = this.buildRows(members, classesByYearGroupId, yearGroupNameById, memberTotalsBySequenceId, alreadyHeldByClassId);

        return {
            ...header,
            wholeSchoolSequenceId: String(wholeSchoolSequence.id),
            rows,
            activitiesToCreate: rows.reduce((total, row) => total + row.activityCount, 0),
            /*
             * Topics, not activities, and therefore not multiplied by classes: it is the same figure
             * the rows state, summed, so the callout and the table are one count read twice.
             * Multiplying here would produce a number no row could be checked against.
             *
             * **Only from rows where a date is actually the story**: one still being scheduled, or
             * one whose topics have all passed. A row skipped because its classes already hold
             * everything can still contain a past-dated topic, and counting it would offer a date as
             * the explanation for something dates had nothing to do with.
             *
             * Decided here rather than by the page. The page would have to name the reasons that
             * qualify, which means a list to keep in step with this enum, in a file that has no
             * other reason to know about it. That list has already gone stale once: the sentence
             * below kept blaming missing content after three more reasons were added.
             */
            topicsSkipped: rows
                .filter((row) => !row.skipReason || row.skipReason === WholeSchoolYearGroupSkipReason.ALL_TOPICS_IN_PAST)
                .reduce((total, row) => total + row.topicsSkipped, 0),
            /*
             * Classes that will actually receive something, which is no longer every class on an
             * unskipped row: one class in a year group can already hold everything while its
             * neighbour does not. Counted from the same per-class working the rows were built from.
             */
            classesCovered: rows.reduce((total, row) => total + row.classesReceiving, 0),
            /*
             * Every eligible class that would receive nothing, whatever the reason: its year group has
             * no member, its member has nothing left to give, or it already holds all of it.
             *
             * Derived by subtraction rather than by listing the reasons that qualify, which is what it
             * used to do. Each new reason had to be remembered there, and forgetting one would leave
             * covered plus skipped quietly failing to add up to the school's eligible class count.
             * A NO_ELIGIBLE_CLASSES row contributes nothing either way, having no classes.
             */
            classesSkipped: rows.reduce((total, row) => total + (row.classCount - row.classesReceiving), 0)
        };
    }

    /**
     * One row per year group that has a member **or** that this school has an eligible class in.
     *
     * A year group with neither is left out: there is nothing to give and nobody to give it to, so a
     * row would be noise. Both of the other cases are shown with their reason, because each is
     * something a leader would otherwise have to notice by its absence.
     */
    private buildRows(
        members: StaticLwpWholeSchoolSequence['members'],
        classesByYearGroupId: Map<string, LwpSchoolClass[]>,
        yearGroupNameById: Map<string, string>,
        memberTotalsBySequenceId: Map<string, MemberSequenceTotals>,
        alreadyHeldByClassId: Map<string, Set<string>>
    ): WholeSchoolSequencePreviewRow[] {
        const rows: WholeSchoolSequencePreviewRow[] = [];

        const yearGroupIdsWithMember = new Set(members.map((member) => String(member.yearGroup.id)));

        members.forEach((member) => {
            const yearGroupId = String(member.yearGroup.id);
            const classes = classesByYearGroupId.get(yearGroupId) ?? [];
            const classCount = classes.length;
            const totals = memberTotalsBySequenceId.get(String(member.sequence.id));
            const topicIds = totals?.topicIds ?? [];

            /*
             * What each class in this year group would actually be given, which is the member's
             * remaining topics less whatever that class already holds. One class can be full while
             * its neighbour is empty, so this is counted per class rather than multiplied.
             */
            const createdPerClass = classes.map(
                (schoolClass) => topicIds.filter((topicId) => !alreadyHeldByClassId.get(String(schoolClass.id))?.has(topicId)).length
            );

            const activityCount = createdPerClass.reduce((total, count) => total + count, 0);
            const classesReceiving = createdPerClass.filter((count) => count > 0).length;

            /*
             * Every topic gone, rather than merely none left, which is why the counts have to be
             * positive too. A member with no items at all also creates nothing, but saying its dates
             * have passed, or that the content is unavailable, would be untrue: that case is the
             * admin form's to prevent.
             */
            const allTopicsInPast = topicIds.length === 0 && (totals?.skippedTopicCount ?? 0) > 0;
            const noAvailableTopics =
                topicIds.length === 0 && (totals?.skippedTopicCount ?? 0) === 0 && (totals?.unavailableTopicCount ?? 0) > 0;
            const alreadyHasThese = topicIds.length > 0 && classCount > 0 && activityCount === 0;
            const skippedForAnyReason = classCount === 0 || allTopicsInPast || noAvailableTopics || alreadyHasThese;

            rows.push({
                yearGroupId,
                yearGroup: member.yearGroup.year,
                sequenceId: String(member.sequence.id),
                sequenceName: member.sequence.name,
                /*
                 * Dropped on a skipped row, because the field is defined as the span of what will
                 * actually be created and a skipped row creates nothing. The page happens to hide
                 * them either way, so this is about the answer being true rather than about what is
                 * drawn: the next screen to read this data should not be told a span for topics
                 * that were never made.
                 */
                startDate: skippedForAnyReason ? undefined : (totals?.startDate ?? undefined),
                endDate: skippedForAnyReason ? undefined : (totals?.endDate ?? undefined),
                classCount,
                /*
                 * **Exact, not an upper bound.** Summed from `createdPerClass` rather than
                 * multiplied, because the three things that reduce it do not all apply evenly.
                 *
                 * Past-dated topics, and unpublished or hidden ones, are properties of the topic, so
                 * they are the same answer for every class and are already out of `topicIds`. What
                 * a class already holds is the one genuinely per-class fact, and one class in a year
                 * group can be full while its neighbour is empty, which is the case a single
                 * multiplication can never describe.
                 *
                 * Answering that last one cost one batched lookup for the whole school, not the plan
                 * per class an earlier version of this comment assumed.
                 */
                activityCount,
                classesReceiving,
                topicsSkipped: totals?.skippedTopicCount ?? 0,
                skipped: skippedForAnyReason,
                /*
                 * No eligible classes comes first when more than one is true. With nothing to receive
                 * it, what the member's dates would have been is not the reason this school gets
                 * nothing, and naming the dates would send the leader after the wrong thing.
                 *
                 * The rest are mutually exclusive by construction: the first two need the member to
                 * have nothing left, and the last needs it to have something.
                 */
                skipReason:
                    classCount === 0
                        ? WholeSchoolYearGroupSkipReason.NO_ELIGIBLE_CLASSES
                        : allTopicsInPast
                          ? WholeSchoolYearGroupSkipReason.ALL_TOPICS_IN_PAST
                          : noAvailableTopics
                            ? WholeSchoolYearGroupSkipReason.NO_AVAILABLE_TOPICS
                            : alreadyHasThese
                              ? WholeSchoolYearGroupSkipReason.ALREADY_HAS_THESE_TOPICS
                              : undefined
            });
        });

        classesByYearGroupId.forEach((classes, yearGroupId) => {
            if (yearGroupIdsWithMember.has(yearGroupId)) return;

            rows.push({
                yearGroupId,
                yearGroup: yearGroupNameById.get(yearGroupId) ?? '',
                classCount: classes.length,
                activityCount: 0,
                // Nothing to give, so no class here receives anything.
                classesReceiving: 0,
                // No member, so no topics to have passed. The row's reason is the absence itself.
                topicsSkipped: 0,
                skipped: true,
                skipReason: WholeSchoolYearGroupSkipReason.NO_SEQUENCE_FOR_YEAR_GROUP
            });
        });

        /*
         * By year group name, which is how the admin form that built this lists its own rows. The two
         * screens describe the same object, so a leader and an admin comparing them should not have to
         * translate between two orders.
         */
        return rows.sort((first, second) => first.yearGroup.localeCompare(second.yearGroup));
    }

    /**
     * Withdraws a whole school's run, and frees the school to schedule that year again (LEA-6700).
     *
     * **Released topics stay, unreleased ones go**, which is exactly the rule a teacher's own removal
     * follows and is applied here by the same code: LEA-6700 hoisted the transaction out of
     * `removeAssignment` the way LEA-6681 hoisted it out of the assign path, so there is one
     * implementation rather than two. A child who has already done an activity never loses it because
     * a leader corrected a scheduling mistake weeks later.
     *
     * **One transaction across every class.** A half-removed school is the mirror of the half-scheduled
     * one LEA-6698 went to such lengths to make unreachable, and it is worse, because the leader has
     * been told the schedule is gone.
     *
     * Marking the run `REMOVED` is what frees the year: the unique index behind the once-a-year rule
     * is partial on `ASSIGNED`, so a removed run keeps its history without occupying the slot. That is
     * the whole reason the index is partial rather than plain, and a plain one would make a single
     * mis-click permanent until the next September.
     *
     * **Scoped to the school, and that is a real check rather than a formality.** The endpoint is
     * authorized on `schoolId`, so an assignment id alone would let a leader of one school withdraw
     * another school's run by pairing their own school with someone else's id.
     */
    public async removeWholeSchoolSequenceAssignment(schoolId: string, assignmentId: string, userId: string): Promise<OperationStatus> {
        const run = await this.wholeSchoolAssignmentRepository
            .createQueryBuilder('assignment')
            .innerJoin('assignment.school', 'school')
            .innerJoin('assignment.subject', 'subject')
            .where('assignment.id = :assignmentId', { assignmentId })
            .andWhere('school.id = :schoolId', { schoolId })
            .select(['assignment.id', 'assignment.status', 'subject.name'])
            .getOne();

        if (!run) throw new HttpException('That schedule does not exist for your school', ErrorStatusCodeEnum._535);

        /*
         * Already withdrawn. Refused rather than treated as done, because a second removal would
         * report a count of zero and read as though there had been nothing there.
         */
        if (run.status !== SequenceAssignmentStatus.ASSIGNED) {
            throw new HttpException(`This ${run.subject.name} schedule has already been removed`, ErrorStatusCodeEnum._535);
        }

        /*
         * Every class this run scheduled, with its topics, loaded before the transaction opens. The
         * decision about which topics may go is taken here for the same reason the assign path builds
         * its plans first: reads inside a transaction hold it open across the whole school.
         */
        const classAssignments = await this.classAssignmentRepository
            .createQueryBuilder('classAssignment')
            .leftJoinAndSelect('classAssignment.classTopics', 'classTopic')
            .where('classAssignment.wholeSchoolAssignment = :assignmentId', { assignmentId })
            .andWhere('classAssignment.status = :status', { status: SequenceAssignmentStatus.ASSIGNED })
            .getMany();

        const removals = classAssignments.map((classAssignment) => ({
            assignmentId: String(classAssignment.id),
            /*
             * The one rule this whole mutation exists to protect. `released` is set when a topic has
             * actually gone out to families, so anything true here is work a child may already have
             * done, and it is kept.
             */
            removableClassTopicIds: (classAssignment.classTopics ?? [])
                .filter((classTopic) => !classTopic.released)
                .map((classTopic) => classTopic.id),
            classTopicCount: (classAssignment.classTopics ?? []).length
        }));

        const user = this.shallowUserService.newShallowUser(userId);

        await this.connection.transaction(async (manager) => {
            for (const removal of removals) {
                await this.classSequenceAssignmentService.persistAssignmentRemoval(
                    manager,
                    removal.assignmentId,
                    removal.removableClassTopicIds,
                    user
                );
            }

            /*
             * The run last, so the school's slot is only freed once every class it created has been
             * dealt with. If anything above fails, the whole thing rolls back and the school is still
             * scheduled, which is the truthful state.
             */
            await manager.update(LwpWholeSchoolSequenceAssignment, assignmentId, {
                status: SequenceAssignmentStatus.REMOVED,
                logUpdatedBy: user
            });
        });

        const removed = removals.reduce((total, removal) => total + removal.removableClassTopicIds.length, 0);
        const retained = removals.reduce((total, removal) => total + removal.classTopicCount, 0) - removed;

        /*
         * The retained count is stated even when it is zero, because "and 0 already released" is the
         * answer to the question a leader is actually asking, which is whether anything survived.
         */
        return {
            status: 'ok',
            msg: `${removed} scheduled topics removed across ${removals.length} classes, ${retained} already released and kept`
        } as OperationStatus;
    }

    /** Every subject a whole-school run could apply to: all of them except the full programme. */
    private async loadSchedulableSubjects(): Promise<StaticLwpSubject[]> {
        return this.subjectRepository
            .createQueryBuilder('subject')
            .where('subject.programmeType != :fullProgramme', { fullProgramme: SubjectProgrammeType.FULL_PROGRAMME })
            .select(['subject.id', 'subject.name', 'subject.programmeType'])
            .getMany();
    }

    /** The whole-school sequences the content team has published for this academic year, with their subject. */
    private async loadPublishedSequences(periodIndex: number): Promise<StaticLwpWholeSchoolSequence[]> {
        return this.wholeSchoolSequenceRepository
            .createQueryBuilder('wholeSchoolSequence')
            .innerJoin('wholeSchoolSequence.subject', 'subject')
            .innerJoin('wholeSchoolSequence.period', 'period')
            .where('period.index = :periodIndex', { periodIndex })
            .andWhere('wholeSchoolSequence.status = :status', { status: WholeSchoolSequenceStatus.PUBLISHED })
            .select(['wholeSchoolSequence.id', 'subject.id'])
            .getMany();
    }

    /** This school's live runs for this academic year, one per subject. `loadLiveAssignment` is the single-subject version. */
    private async loadLiveAssignments(schoolId: string, periodIndex: number): Promise<LwpWholeSchoolSequenceAssignment[]> {
        return this.wholeSchoolAssignmentRepository
            .createQueryBuilder('assignment')
            .innerJoin('assignment.school', 'school')
            .innerJoin('assignment.subject', 'subject')
            .innerJoin('assignment.period', 'period')
            .where('school.id = :schoolId', { schoolId })
            .andWhere('period.index = :periodIndex', { periodIndex })
            .andWhere('assignment.status = :status', { status: SequenceAssignmentStatus.ASSIGNED })
            .select(['assignment.id', 'assignment.logCreatedAt', 'subject.id'])
            .getMany();
    }

    /**
     * This school's live run for this subject and academic year, or null (LEA-6700).
     *
     * "Live" means `ASSIGNED`. A `REMOVED` run is history: it keeps its released class topics and
     * its provenance, but it no longer occupies the school's slot for the year, which is the whole
     * point of removal and the reason the unique index behind it is partial rather than plain.
     *
     * Keyed on the run's own snapshotted subject and period rather than through its whole-school
     * sequence, because that relation is `SET NULL` and a run whose sequence has been deleted is
     * still a run this school did. The three columns here are exactly the partial unique index, so
     * there is never more than one row to find.
     */
    private async loadLiveAssignment(
        schoolId: string,
        subjectId: string,
        periodIndex: number
    ): Promise<LwpWholeSchoolSequenceAssignment | null> {
        return this.wholeSchoolAssignmentRepository
            .createQueryBuilder('assignment')
            .innerJoin('assignment.school', 'school')
            .innerJoin('assignment.subject', 'subject')
            .innerJoin('assignment.period', 'period')
            .where('school.id = :schoolId', { schoolId })
            .andWhere('subject.id = :subjectId', { subjectId })
            .andWhere('period.index = :periodIndex', { periodIndex })
            .andWhere('assignment.status = :status', { status: SequenceAssignmentStatus.ASSIGNED })
            .select(['assignment.id', 'assignment.logCreatedAt'])
            .getOne();
    }

    /**
     * What a school actually holds from a run, as one row per year group (LEA-6700).
     *
     * Built from the class assignments the run created rather than from the whole-school sequence it
     * ran, and that is the point rather than an implementation detail. The sequence says what was
     * offered; these rows say what arrived, and the two legitimately differ. A class already holding
     * everything was dropped from the run, a past-dated topic was skipped, a teacher may since have
     * removed their class's assignment, and the sequence itself may have been deleted outright.
     *
     * One query. Grouping is done here rather than in SQL because the rows need a count of distinct
     * classes **and** a count of class topics from the same join, which in one aggregate query would
     * multiply one by the other.
     */
    private async buildAssignmentRecord(run: LwpWholeSchoolSequenceAssignment): Promise<WholeSchoolAssignmentRecord> {
        const classAssignments = await this.classAssignmentRepository
            .createQueryBuilder('classAssignment')
            .innerJoin('classAssignment.class', 'schoolClass')
            .innerJoin('schoolClass.yearGroup', 'yearGroup')
            .leftJoin('classAssignment.sequence', 'sequence')
            .leftJoin('classAssignment.classTopics', 'classTopic')
            .where('classAssignment.wholeSchoolAssignment = :runId', { runId: run.id })
            /*
             * A teacher can withdraw their own class's assignment at any time, which leaves it
             * REMOVED with its released topics retained. Those topics are genuinely still there, but
             * the class is no longer following the sequence, so counting it would tell a leader
             * their year group is scheduled when it is not.
             */
            .andWhere('classAssignment.status = :status', { status: SequenceAssignmentStatus.ASSIGNED })
            .select([
                'classAssignment.id',
                'schoolClass.id',
                'yearGroup.id',
                'yearGroup.year',
                'sequence.id',
                'sequence.name',
                'classTopic.id',
                'classTopic.releaseDate',
                'classTopic.dueDate'
            ])
            .getMany();

        const rowsByYearGroupId = new Map<string, WholeSchoolSequencePreviewRow>();

        classAssignments.forEach((classAssignment) => {
            const yearGroup = classAssignment.class.yearGroup;
            const yearGroupId = String(yearGroup.id);
            const classTopics = classAssignment.classTopics ?? [];

            if (!rowsByYearGroupId.has(yearGroupId)) {
                rowsByYearGroupId.set(yearGroupId, {
                    yearGroupId,
                    yearGroup: yearGroup.year,
                    /*
                     * Null when the sequence has since been deleted, which `SET NULL` allows on
                     * purpose: the class keeps the topics it was given. The page falls back to the
                     * year group's own name, so a row never renders blank.
                     */
                    sequenceId: classAssignment.sequence ? String(classAssignment.sequence.id) : undefined,
                    sequenceName: classAssignment.sequence?.name,
                    startDate: undefined,
                    endDate: undefined,
                    classCount: 0,
                    activityCount: 0,
                    classesReceiving: 0,
                    // A record describes rows that exist, so nothing on one is skipped.
                    topicsSkipped: 0,
                    skipped: false
                });
            }

            const row = rowsByYearGroupId.get(yearGroupId);

            row.classCount += 1;
            row.classesReceiving += 1;
            row.activityCount += classTopics.length;

            /*
             * The span of what this year group actually holds, widened across every class in it.
             * Classes in one year group share a member sequence's dates, so in practice they agree;
             * taking the extremes rather than the first class's costs nothing and stays true if a
             * teacher has since moved one of their own topics.
             */
            classTopics.forEach((classTopic) => {
                const start = classTopic.releaseDate;
                const end = classTopic.dueDate ?? classTopic.releaseDate;

                if (start && (!row.startDate || start < row.startDate)) row.startDate = start;
                if (end && (!row.endDate || end > row.endDate)) row.endDate = end;
            });
        });

        const rows = [...rowsByYearGroupId.values()].sort((first, second) => first.yearGroup.localeCompare(second.yearGroup));

        return {
            assignmentId: String(run.id),
            scheduledOn: run.logCreatedAt,
            rows,
            activitiesCreated: rows.reduce((total, row) => total + row.activityCount, 0),
            classesScheduled: rows.reduce((total, row) => total + row.classCount, 0)
        };
    }

    /**
     * The published whole-school sequence for this subject and academic year, or null.
     *
     * Null is an ordinary outcome: the content team may not have published for this year yet, or may
     * still be holding a draft. `(subjectId, periodIndex)` is unique, so there is never more than one
     * to choose between, and the status filter is what keeps a draft out of every school's hands.
     */
    private async loadPublishedWholeSchoolSequence(subjectId: string, periodIndex: number): Promise<StaticLwpWholeSchoolSequence | null> {
        return this.wholeSchoolSequenceRepository
            .createQueryBuilder('wholeSchoolSequence')
            .innerJoin('wholeSchoolSequence.subject', 'subject')
            .innerJoin('wholeSchoolSequence.period', 'period')
            .leftJoin('wholeSchoolSequence.members', 'members')
            .leftJoin('members.sequence', 'memberSequence')
            .leftJoin('members.yearGroup', 'memberYearGroup')
            .where('subject.id = :subjectId', { subjectId })
            .andWhere('period.index = :periodIndex', { periodIndex })
            .andWhere('wholeSchoolSequence.status = :status', { status: WholeSchoolSequenceStatus.PUBLISHED })
            .select([
                'wholeSchoolSequence.id',
                'members.id',
                'memberSequence.id',
                'memberSequence.name',
                'memberYearGroup.id',
                'memberYearGroup.year'
            ])
            .getOne();
    }

    /**
     * The classes in this school that would receive content for one subject.
     *
     * The same four conditions `ClassSequenceAssignmentService.getAutoSchedulableClassesForSchool`
     * applies, narrowed to one programme instead of "any the class is entitled to", and without that
     * method's teacher narrowing because this page is leader-only.
     *
     * **There is deliberately no separate school-level entitlement check.** Money Skills is the only
     * programme with a school-level component and `allowedProgrammeTypesForClass` already reads
     * `school.isMoneySkillsAvailable` through the class, so a school without the flag has no entitled
     * class and this returns nothing. Checking it again here would mean naming `isMoneySkillsAvailable`
     * in code that is meant to be generic across subjects, which is the one thing the model forbids.
     */
    public async getEligibleClassesForSubject(schoolId: string, programmeType: SubjectProgrammeType): Promise<LwpSchoolClass[]> {
        const schoolClasses = await this.loadCurrentYearClasses(schoolId);

        return schoolClasses.filter((schoolClass) => allowedProgrammeTypesForClass(schoolClass).includes(programmeType));
    }

    /**
     * The school's active registration classes in its current academic year, carrying the fields
     * `allowedProgrammeTypesForClass` reads, before any one programme is picked out of them.
     */
    private async loadCurrentYearClasses(schoolId: string): Promise<LwpSchoolClass[]> {
        // The current-academic-year rule is in SQL rather than in memory, because this is a list: the
        // period equality below, exactly as isCurrentAcademicYearClass compares them for a single class.
        return this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .innerJoin('schoolClass.school', 'school', 'school.id = :schoolId', { schoolId })
            .innerJoin('schoolClass.yearGroup', 'yearGroup')
            .innerJoin('schoolClass.period', 'period')
            .innerJoin('school.curentPeriod', 'currentPeriod')
            .where('schoolClass.isRegistrationClass = :isRegistrationClass', { isRegistrationClass: true })
            .andWhere('schoolClass.isGroupAcrossClasses = :isGroupAcrossClasses', { isGroupAcrossClasses: false })
            .andWhere('schoolClass.status = :status', { status: SchoolClassStatus.ACTIVE })
            .andWhere('period.index = currentPeriod.index')
            .select([
                'schoolClass.id',
                'schoolClass.isFullProgramme',
                'schoolClass.isReadyTeddyEnabled',
                'schoolClass.IsReadingLogsEnabled',
                'schoolClass.isRegistrationClass',
                'schoolClass.isGroupAcrossClasses',
                'school.isMoneySkillsAvailable',
                'yearGroup.id',
                'yearGroup.year'
            ])
            .getMany();
    }

    /**
     * The school with the academic year everything on these pages is scoped to.
     *
     * Read from the school rather than from `StaticLwpPeriod.isCurrentPeriod`, because a school can
     * sit on a different year from the platform's and the class-level flow already compares against
     * the school's.
     */
    private async loadSchoolWithCurrentPeriod(schoolId: string): Promise<LwpSchool | null> {
        return this.schoolRepository
            .createQueryBuilder('school')
            .innerJoin('school.curentPeriod', 'currentPeriod')
            .where('school.id = :schoolId', { schoolId })
            .select(['school.id', 'currentPeriod.index', 'currentPeriod.shortName'])
            .getOne();
    }

    /**
     * Schedules every eligible class in one school, from one published whole-school sequence, in a
     * single transaction (LEA-6698).
     *
     * **All or nothing.** Every eligible class is scheduled or none is. A half-scheduled school is
     * worse than an unscheduled one, because the leader cannot tell which half succeeded and a retry
     * would then duplicate whatever had already committed.
     *
     * The shape is LEA-6460's, one level up: **phase 1 resolves every class's plan with no
     * transaction open**, phase 2 is pure SQL inside one. Building the plans first is not merely
     * tidy: `buildPlan` loads entities and can throw, and doing that inside the transaction would
     * hold it open across every read in the school.
     *
     * **The id is taken from the caller here, unlike the preview**, which resolves it from the
     * subject. That is deliberate: the leader is committing to the exact thing the preview showed
     * them. It is why every one of the preview's three rules is checked again below rather than
     * assumed, because an id that arrived from a browser is evidence of nothing.
     */
    public async assignWholeSchoolSequence(
        schoolId: string,
        wholeSchoolSequenceId: string,
        userId: string
    ): Promise<WholeSchoolAssignmentResult> {
        const school = await this.schoolRepository
            .createQueryBuilder('school')
            .innerJoin('school.curentPeriod', 'currentPeriod')
            .where('school.id = :schoolId', { schoolId })
            .select(['school.id', 'currentPeriod.index'])
            .getOne();

        if (!school?.curentPeriod) throw new HttpException('School does not exist', ErrorStatusCodeEnum._535);

        const wholeSchoolSequence = await this.wholeSchoolSequenceRepository
            .createQueryBuilder('wholeSchoolSequence')
            .innerJoin('wholeSchoolSequence.subject', 'subject')
            .innerJoin('wholeSchoolSequence.period', 'period')
            .leftJoin('wholeSchoolSequence.members', 'members')
            .leftJoin('members.sequence', 'memberSequence')
            .leftJoin('members.yearGroup', 'memberYearGroup')
            .where('wholeSchoolSequence.id = :wholeSchoolSequenceId', { wholeSchoolSequenceId })
            .select([
                'wholeSchoolSequence.id',
                'wholeSchoolSequence.status',
                'subject.id',
                'subject.name',
                'subject.programmeType',
                'period.index',
                'members.id',
                'memberSequence.id',
                'memberYearGroup.id'
            ])
            .getOne();

        if (!wholeSchoolSequence) throw new HttpException('Whole-school sequence does not exist', ErrorStatusCodeEnum._535);

        /*
         * The three rules the preview never has to state, because resolving by subject made them
         * unreachable. Here the id came from the caller, so each one is a real check.
         *
         * Refused rather than skipped, because the leader asked for this specific thing: silently
         * scheduling something else, or nothing, would be worse than saying no.
         */
        if (wholeSchoolSequence.status !== WholeSchoolSequenceStatus.PUBLISHED) {
            throw new HttpException('This has not been published yet, so it cannot be scheduled', ErrorStatusCodeEnum._535);
        }

        if (Number(wholeSchoolSequence.period.index) !== Number(school.curentPeriod.index)) {
            throw new HttpException(
                'This was built for a different academic year to the one your school is currently teaching',
                ErrorStatusCodeEnum._535
            );
        }

        /*
         * Once per school, per subject, per academic year (LEA-6700).
         *
         * **The database already refuses this**, through the partial unique index on
         * `(school, subject, period) WHERE status = 'ASSIGNED'`, and that index is what stops the one
         * race worth worrying about here: two leaders at the same school pressing the button at the
         * same moment. This check does not replace it and cannot, because anything asked before the
         * transaction opens can go stale before the insert.
         *
         * It exists so the ordinary case reads as a sentence rather than as a constraint violation.
         * A leader pressing twice is doing something reasonable on a page that, before this slice,
         * gave them no sign they had already succeeded.
         *
         * Checked against the run's own snapshotted subject and period rather than through its
         * whole-school sequence, because that relation is SET NULL: a school that ran a sequence an
         * admin has since deleted has still used up its year.
         */
        const liveAssignment = await this.loadLiveAssignment(
            schoolId,
            String(wholeSchoolSequence.subject.id),
            wholeSchoolSequence.period.index
        );

        if (liveAssignment) {
            throw new HttpException(
                `Your school has already been scheduled for ${wholeSchoolSequence.subject.name} this academic year. Remove that schedule first if you need to run it again.`,
                ErrorStatusCodeEnum._535
            );
        }

        const eligibleClasses = await this.getEligibleClassesForSubject(schoolId, wholeSchoolSequence.subject.programmeType);

        if (!eligibleClasses.length) {
            throw new HttpException(
                `No classes in your school are set up for ${wholeSchoolSequence.subject.name}`,
                ErrorStatusCodeEnum._535
            );
        }

        const sequenceIdByYearGroupId = new Map(
            (wholeSchoolSequence.members ?? []).map((member) => [String(member.yearGroup.id), String(member.sequence.id)])
        );

        /*
         * Phase 1. Every class's plan, resolved before anything is opened.
         *
         * A class whose year group has no member is simply not scheduled, which is the skip the
         * preview showed. A class whose plan comes back empty is dropped too rather than given an
         * empty assignment: `assignSequenceToClass` refuses one for the same reason, because
         * `hasAssignments` counts rows rather than topics and an empty one would permanently lock the
         * sequence's academic year in the admin form, about a class that was given nothing.
         *
         * `buildPlan` still throws, and a throw here fails the whole run before a transaction has
         * even opened. That is what all or nothing means. The past-dated case used to be the one
         * that reached it in practice, and LEA-6699 turns that single case into a skip through
         * `skipPastDatedTopics` below. Everything else it refuses still fails the run.
         */
        const work: {
            input: AssignSequenceToClassInput;
            schoolClass: LwpSchoolClass;
            sequence: StaticLwpTopicSequence;
            toCreate: PlannedClassTopicDates[];
        }[] = [];

        for (const eligibleClass of eligibleClasses) {
            const sequenceId = sequenceIdByYearGroupId.get(String(eligibleClass.yearGroup.id));

            if (!sequenceId) continue;

            const input: AssignSequenceToClassInput = { classId: String(eligibleClass.id), sequenceId };

            /*
             * **Skipped, not refused** (LEA-6699). A school arriving mid-year against a sequence that
             * started in September would otherwise have its whole run fail on the first past-dated
             * topic, and nobody at the school could do anything about it: the page is read-only by
             * design, because a row is a whole sequence and one date on it would mean nothing.
             *
             * The class-level flow keeps throwing, which is why this is a flag rather than a change
             * of rule. A teacher can move a row's dates or drop the topic, so refusing keeps them in
             * control; a leader can do neither, so refusing would leave them no route at all.
             */
            const { schoolClass, sequence, toCreate } = await this.classSequenceAssignmentService.buildPlan(input, {
                skipPastDatedTopics: true
            });

            /*
             * Nothing left for this class, which since LEA-6699 includes a member whose topics have
             * all passed. Dropped rather than given an empty assignment, exactly as before: an empty
             * one would permanently lock the sequence's academic year in the admin form, about a
             * class that received nothing. It is the same row the preview showed as skipped.
             */
            if (!toCreate.length) continue;

            work.push({ input, schoolClass, sequence, toCreate });
        }

        /*
         * Mirrors "There is nothing to add to this class" one level up. Reachable when every year
         * group is uncovered, when every class already holds everything it would be given, and since
         * LEA-6699 when every member's topics are in the past.
         *
         * The page should not reach this: its action is hidden when the preview has nothing to
         * create, which is the same condition read from the same numbers. It stays because the
         * mutation is reachable without the page, and because a preview read a moment before
         * midnight can be acted on a moment after it.
         */
        if (!work.length) {
            throw new HttpException('There is nothing to schedule for your school', ErrorStatusCodeEnum._535);
        }

        /*
         * Both undo lists are owned here and span the whole run, so a failure on the last class still
         * knows about every file the first one stored. Sequenced topics carry no media today, so
         * nothing is stored and no effects come back, but the wiring is inherited rather than
         * reinvented: LEA-6500 adds photos to this flow.
         */
        const storedFiles: StoredFile[] = [];
        const effects: ClassTopicWriteEffects[] = [];

        let run: LwpWholeSchoolSequenceAssignment;

        try {
            run = await this.connection.transaction(async (manager) => {
                /*
                 * The run row first, because every class assignment points at it. The partial unique
                 * index on (school, subject, period) WHERE status = 'ASSIGNED' is what refuses a
                 * second live run, including two leaders pressing the button at the same moment,
                 * which is the one race in this feature that is actually plausible.
                 */
                const created = manager.create(LwpWholeSchoolSequenceAssignment, {
                    school: { id: schoolId },
                    wholeSchoolSequence: { id: wholeSchoolSequence.id },
                    // Snapshotted, so this row still says what was run once the parent is deleted.
                    subject: { id: wholeSchoolSequence.subject.id },
                    period: { index: wholeSchoolSequence.period.index },
                    status: SequenceAssignmentStatus.ASSIGNED,
                    logCreatedBy: this.shallowUserService.newShallowUser(userId)
                });

                const savedRun = await manager.save(created);

                for (const perClass of work) {
                    await this.classSequenceAssignmentService.persistSequenceAssignmentForClass(manager, {
                        ...perClass,
                        userId,
                        storedFiles,
                        effects,
                        wholeSchoolAssignment: savedRun
                    });
                }

                return savedRun;
            });
        } catch (err) {
            /*
             * Outside the transaction and before the rethrow, so a rollback takes the stored files
             * with it. Nothing else may go here: this catch must not run for a failure that happened
             * after the commit, or it would delete files belonging to a committed write.
             */
            await this.classTopicService.discardStoredFiles(storedFiles);

            throw err;
        }

        // After the commit and outside the catch above, which is LEA-6460's rule and the reason this
        // is not simply the last line of the transaction callback.
        await this.classTopicService.applyClassTopicWriteEffects(effects);

        return {
            wholeSchoolAssignmentId: String(run.id),
            classesScheduled: work.length,
            activitiesCreated: work.reduce((total, perClass) => total + perClass.toCreate.length, 0)
        };
    }

    /**
     * The topics each of these classes already holds from a previous auto-scheduled run.
     *
     * **One query for the whole school, not one per class.** The naive way to make the counts exact
     * is to build a plan per class, which is what `assignWholeSchoolSequence` does and what makes it
     * cost a query per class. A page a leader merely looks at should not pay that, and it does not
     * have to: the only per-class fact needed here is which of these topics a class already has.
     *
     * **Only rows created by a sequence assignment count.** A topic a teacher scheduled by hand is
     * warned about and still created, deliberately, so counting it here would under-report by
     * exactly the topics the school is about to receive a second copy of.
     *
     * **Scoped to the school in its own right**, rather than trusting the ids it is handed. Its one
     * caller builds them from this school's own class sweep, so the condition changes nothing today.
     * It is here because the question this asks reads as a general one, and a later caller passing a
     * wider list would quietly answer across schools with nothing to catch it. Every other query in
     * this service anchors on the school; this one should not be the exception.
     */
    private async loadTopicsAlreadyHeld(schoolId: string, classIds: string[], topicIds: string[]): Promise<Map<string, Set<string>>> {
        const held = new Map<string, Set<string>>();

        if (!classIds.length || !topicIds.length) return held;

        const rows = await this.classTopicRepository
            .createQueryBuilder('classTopic')
            .innerJoin('classTopic.class', 'class')
            .innerJoin('classTopic.topic', 'topic')
            .innerJoin('classTopic.classSequenceAssignment', 'assignment')
            .where('class.school = :schoolId', { schoolId })
            .andWhere('class.id IN (:...classIds)', { classIds })
            .andWhere('topic.id IN (:...topicIds)', { topicIds })
            .select(['classTopic.id', 'class.id', 'topic.id'])
            .getMany();

        rows.forEach((row) => {
            const classId = String(row.class.id);

            if (!held.has(classId)) held.set(classId, new Set());
            held.get(classId).add(String(row.topic.id));
        });

        return held;
    }

    /**
     * Each member sequence's topic count and the span its topics cover.
     *
     * Items are loaded and aggregated here rather than by a grouped SQL query. The grouped version
     * returns exactly this shape, but its correctness rests on invariants a later edit can break
     * silently, and a fanned-out row set would still reduce to a plausible-looking answer. The cost of
     * doing it this way is one row per topic across at most one sequence per year group, which is a
     * few dozen rows.
     */
    private async loadMemberSequenceTotals(sequenceIds: string[], today: Date = new Date()): Promise<Map<string, MemberSequenceTotals>> {
        const totals = new Map<string, MemberSequenceTotals>();

        if (!sequenceIds.length) return totals;

        /*
         * The topic is joined onto the query that was already being made, so unpublished and hidden
         * content costs nothing to exclude: it is a property of the topic and therefore the same
         * answer for every class in the school. Only what a class already holds differs per class,
         * and that is the one thing below that needs a query of its own.
         */
        const items = await this.sequenceItemRepository
            .createQueryBuilder('item')
            .innerJoin('item.sequence', 'sequence')
            .innerJoin('item.topic', 'topic')
            .where('sequence.id IN (:...sequenceIds)', { sequenceIds })
            .select(['item.id', 'item.startDate', 'item.endDate', 'sequence.id', 'topic.id', 'topic.isPublished', 'topic.isHidden'])
            .getMany();

        items.forEach((item) => {
            const sequenceId = String(item.sequence.id);
            const current = totals.get(sequenceId) ?? {
                topicIds: [],
                skippedTopicCount: 0,
                unavailableTopicCount: 0,
                startDate: null,
                endDate: null
            };

            /*
             * Checked before the date, because a topic that may not reach pupils is withheld whatever
             * its dates say, and counting it as past-dated would tell the leader to expect it back
             * next year when the real reason is that it was never published.
             */
            if (!item.topic?.isPublished || item.topic.isHidden) {
                current.unavailableTopicCount += 1;
                totals.set(sequenceId, current);

                return;
            }

            /*
             * A member's items are FIXED, so `startDate` is the release date the class-level plan
             * would be given verbatim: no overrides are passed on this path and no interval anchor
             * exists. That is what lets the same rule answer here, off the sequence's own items,
             * as it does inside `buildPlan` off the planned dates, without a plan per class.
             */
            if (isReleaseDateInPast(item.startDate, today)) {
                current.skippedTopicCount += 1;
                totals.set(sequenceId, current);

                return;
            }

            current.topicIds.push(String(item.topic.id));

            if (item.startDate && (!current.startDate || item.startDate < current.startDate)) current.startDate = item.startDate;

            /*
             * A topic with no end date still ends somewhere, so its start date closes the span. Without
             * this the last topic of a sequence whose final item is open-ended would shorten the span
             * to the one before it, which reads as the school finishing a week early.
             */
            const itemEnd = item.endDate ?? item.startDate;

            if (itemEnd && (!current.endDate || itemEnd > current.endDate)) current.endDate = itemEnd;

            totals.set(sequenceId, current);
        });

        return totals;
    }
}
