import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SequenceTimingMode, WholeSchoolSequenceStatus } from 'lwp-shared/enums';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Connection, EntityManager, Not, Repository } from 'typeorm';

import { CreateWholeSchoolSequenceInput } from '../dtos/CreateWholeSchoolSequenceInput';
import { UpdateWholeSchoolSequenceInput } from '../dtos/UpdateWholeSchoolSequenceInput';
import { WholeSchoolSequenceCandidate } from '../dtos/WholeSchoolSequenceCandidate';
import { WholeSchoolSequenceFilterInput } from '../dtos/WholeSchoolSequenceFilterInput';
import { WholeSchoolSequenceMemberInput } from '../dtos/WholeSchoolSequenceMemberInput';
import { WholeSchoolSequencePublishResult } from '../dtos/WholeSchoolSequencePublishResult';
import { StaticLwpPeriod } from '../entities/static_period';
import { StaticLwpTopicSequence } from '../entities/static_topic_sequence';
import { StaticLwpWholeSchoolSequence } from '../entities/static_whole_school_sequence';
import { StaticLwpWholeSchoolSequenceMember } from '../entities/static_whole_school_sequence_member';
import { LwpWholeSchoolSequenceAssignment } from '../entities/whole_school_sequence_assignment';
import { StaticLwpYearGroup } from '../entities/year_group';
import { ErrorStatusCodeEnum, OperationStatus } from '../model';

/** The year group the Wonde import assigns to a class it cannot map. Never offered to an admin. */
const UNKNOWN_YEAR_GROUP = 'Unknown';

/**
 * Whether a submitted member list says the same thing as the stored one (LEA-6700).
 *
 * Compared as a **set of sequence ids**, which is the whole of what a caller sends: the year group
 * is never submitted, because the service reads it off the sequence so the two cannot disagree. One
 * sequence belongs to one year group, so the set of sequences determines the set of rows.
 *
 * Order carries no meaning and the stored rows arrive in whatever order the join produced, so a set
 * rather than a list. Ids are stringified on both sides, because they come off the entity as bigints
 * and arrive from GraphQL as strings; comparing them raw would report every save as a change and
 * lock an admin out of publishing.
 *
 * A year group cleared to no sequence is submitted with an empty `sequenceId` and is not a stored
 * row either, so both sides reduce to nothing and match.
 */
function sameMembers(submitted: WholeSchoolSequenceMemberInput[], stored: StaticLwpWholeSchoolSequenceMember[]): boolean {
    const submittedIds = new Set(submitted.filter((member) => member.sequenceId).map((member) => String(member.sequenceId)));

    const storedIds = new Set(stored.filter((member) => member.sequence).map((member) => String(member.sequence.id)));

    if (submittedIds.size !== storedIds.size) return false;

    return [...submittedIds].every((id) => storedIds.has(id));
}

/**
 * A sequence resolved far enough to decide whether it may be a member, and to file it under a year
 * group. Internal: the query that loads it is shared by the picker and by the save validation, so
 * neither can accept a sequence the other would have refused.
 */
interface CandidateSequence {
    id: string;
    name: string;
    yearGroupId: string;
    yearGroupName: string;
    timingMode: SequenceTimingMode;
    subjectId: string;
    periodIndex: number | null;
}

/**
 * Admin management of whole-school sequences: the object a school leader later schedules their
 * whole school from (LEA-6504).
 *
 * The header is subject and academic year; the members are one existing class sequence per year
 * group; publishing is what makes it visible to schools.
 *
 * Saving and publishing check different things on purpose. Saving refuses what is **wrong**, which
 * is a member that could never legally be one. Publishing refuses what is **not ready**, which is
 * having no members at all, and warns about what is merely incomplete.
 */
@Injectable()
export class WholeSchoolSequenceService {
    constructor(
        @InjectRepository(StaticLwpWholeSchoolSequence)
        private wholeSchoolSequenceRepository: Repository<StaticLwpWholeSchoolSequence>,
        @InjectRepository(StaticLwpWholeSchoolSequenceMember)
        private memberRepository: Repository<StaticLwpWholeSchoolSequenceMember>,
        @InjectRepository(StaticLwpTopicSequence)
        private sequenceRepository: Repository<StaticLwpTopicSequence>,
        @InjectRepository(StaticLwpPeriod)
        private periodRepository: Repository<StaticLwpPeriod>,
        @InjectRepository(StaticLwpYearGroup)
        private yearGroupRepository: Repository<StaticLwpYearGroup>,
        /*
         * Whether any school has scheduled a whole-school sequence, which is what locks it for
         * admins (LEA-6700). Read only; the row itself belongs to the leader-facing service.
         */
        @InjectRepository(LwpWholeSchoolSequenceAssignment)
        private wholeSchoolAssignmentRepository: Repository<LwpWholeSchoolSequenceAssignment>,
        private connection: Connection,
        private shallowUserService: ShallowUserService
    ) {}

    /**
     * Whether each whole-school sequence has ever been scheduled by any school, in the id order
     * asked for (LEA-6700).
     *
     * **This is the lock.** Once a school has taken a copy, the subject, the academic year and the
     * member list are statements about class topics that already exist in real schools, so editing
     * them would make the record disagree with what those schools were actually given. The admin
     * form disables those fields rather than hiding them, and says why, so an admin can still read
     * what the sequence is.
     *
     * **Every status counts, `REMOVED` included**, exactly as the class-level sequence lock counts
     * them. A removal keeps the released class topics, so schools out there are still holding
     * content this sequence handed them, and the year still describes real data. Counting only live
     * runs would unlock a sequence whose topics are sitting in front of children.
     *
     * One query for the whole batch, because the admin list asks this of every row it renders. The
     * key is the whole-school sequence relation rather than the snapshotted subject and period,
     * because the question is about this specific sequence rather than about the year as a whole.
     */
    public async getWholeSchoolAssignmentUsage(wholeSchoolSequenceIds: readonly string[]): Promise<boolean[]> {
        if (!wholeSchoolSequenceIds.length) return [];

        const scheduled = await this.wholeSchoolAssignmentRepository
            .createQueryBuilder('assignment')
            .innerJoin('assignment.wholeSchoolSequence', 'wholeSchoolSequence')
            .where('wholeSchoolSequence.id IN (:...wholeSchoolSequenceIds)', { wholeSchoolSequenceIds })
            .select('wholeSchoolSequence.id', 'wholeSchoolSequenceId')
            .groupBy('wholeSchoolSequence.id')
            .getRawMany<{ wholeSchoolSequenceId: string }>();

        const scheduledIds = new Set(scheduled.map((row) => String(row.wholeSchoolSequenceId)));

        return wholeSchoolSequenceIds.map((id) => scheduledIds.has(String(id)));
    }

    public async getWholeSchoolSequences(filter?: WholeSchoolSequenceFilterInput): Promise<StaticLwpWholeSchoolSequence[]> {
        const query = this.wholeSchoolSequenceRepository
            .createQueryBuilder('wholeSchoolSequence')
            .leftJoinAndSelect('wholeSchoolSequence.subject', 'subject')
            .leftJoinAndSelect('wholeSchoolSequence.period', 'period');

        if (filter?.subjectId) query.andWhere('subject.id = :subjectId', { subjectId: filter.subjectId });

        if (filter?.periodIndex !== undefined && filter?.periodIndex !== null) {
            query.andWhere('period.index = :periodIndex', { periodIndex: filter.periodIndex });
        }

        if (filter?.status) query.andWhere('wholeSchoolSequence.status = :status', { status: filter.status });

        /*
         * Newest academic year first, then by subject.
         *
         * Deliberately simpler than the topic sequence list's ranking around the current year. There
         * is at most one row per subject per year here, so the list is a handful of rows an admin
         * reads whole, and next year's draft is the one they are working on.
         */
        return query.orderBy('period.index', 'DESC').addOrderBy('subject.name', 'ASC').getMany();
    }

    public async getWholeSchoolSequence(id: string): Promise<StaticLwpWholeSchoolSequence> {
        const wholeSchoolSequence = await this.wholeSchoolSequenceRepository
            .createQueryBuilder('wholeSchoolSequence')
            .leftJoinAndSelect('wholeSchoolSequence.subject', 'subject')
            .leftJoinAndSelect('wholeSchoolSequence.period', 'period')
            .leftJoinAndSelect('wholeSchoolSequence.members', 'members')
            .leftJoinAndSelect('members.sequence', 'memberSequence')
            .leftJoinAndSelect('members.yearGroup', 'memberYearGroup')
            .where('wholeSchoolSequence.id = :id', { id })
            // The leader's table is one row per year group, so the form is too. Ordered by year group
            // rather than by insertion, or the rows would shuffle every time a member was replaced.
            .orderBy('memberYearGroup.year', 'ASC')
            .getOne();

        if (!wholeSchoolSequence) throw new HttpException('Whole-school sequence does not exist', ErrorStatusCodeEnum._535);

        return wholeSchoolSequence;
    }

    /**
     * The class sequences an admin may put against a year group, for one subject and academic year.
     *
     * Only `FIXED` ones. An interval sequence carries no dates at all, so it has nothing to show in
     * the leader's table and no answer to when a school would run it.
     *
     * The `Unknown` year group is excluded. That is what the Wonde import assigns to a class it
     * cannot map, and the rest of the platform already skips it; offering it here would let an admin
     * build content for a year group that exists only as an import failure.
     */
    public async getCandidateSequencesForWholeSchool(subjectId: string, periodIndex: number): Promise<WholeSchoolSequenceCandidate[]> {
        const candidates = await this.loadCandidateSequences(subjectId, periodIndex);

        if (!candidates.length) return [];

        /*
         * The span comes from the items rather than from the sequence, which holds no dates of its
         * own. One grouped query for every candidate, not one per row: this feeds a picker that
         * renders the whole list at once.
         */
        const spans = await this.sequenceRepository
            .createQueryBuilder('sequence')
            .leftJoin('sequence.items', 'item')
            .where('sequence.id IN (:...ids)', { ids: candidates.map((candidate) => candidate.id) })
            .select('sequence.id', 'sequenceId')
            .addSelect('MIN(item.startDate)', 'startDate')
            .addSelect('MAX(item.endDate)', 'endDate')
            .groupBy('sequence.id')
            .getRawMany<{ sequenceId: string; startDate: Date | null; endDate: Date | null }>();

        const spanBySequenceId = new Map(spans.map((span) => [String(span.sequenceId), span]));

        return candidates.map((candidate) => ({
            id: candidate.id,
            name: candidate.name,
            yearGroupId: candidate.yearGroupId,
            yearGroupName: candidate.yearGroupName,
            startDate: spanBySequenceId.get(candidate.id)?.startDate ?? null,
            endDate: spanBySequenceId.get(candidate.id)?.endDate ?? null
        }));
    }

    /**
     * Every sequence eligible to be a member of a whole-school sequence for this subject and year.
     *
     * Shared by the picker and by the save validation deliberately. The four rules below are then
     * expressed once: anything this query returns is a legal member, and anything it does not is
     * refused on save, so the two cannot drift apart into a picker that offers what saving rejects.
     */
    private async loadCandidateSequences(subjectId: string, periodIndex: number): Promise<CandidateSequence[]> {
        const rows = await this.sequenceRepository
            .createQueryBuilder('sequence')
            .innerJoin('sequence.yearGroup', 'yearGroup')
            .innerJoin('sequence.subject', 'subject')
            .where('subject.id = :subjectId', { subjectId })
            .andWhere('sequence.periodIndex = :periodIndex', { periodIndex })
            .andWhere('sequence.timingMode = :timingMode', { timingMode: SequenceTimingMode.FIXED })
            .andWhere('yearGroup.year != :unknown', { unknown: UNKNOWN_YEAR_GROUP })
            .select('sequence.id', 'id')
            .addSelect('sequence.name', 'name')
            .addSelect('sequence.timingMode', 'timingMode')
            .addSelect('yearGroup.id', 'yearGroupId')
            .addSelect('yearGroup.year', 'yearGroupName')
            .addSelect('subject.id', 'subjectId')
            .addSelect('sequence.periodIndex', 'periodIndex')
            .orderBy('yearGroup.year', 'ASC')
            .addOrderBy('sequence.name', 'ASC')
            .getRawMany<CandidateSequence>();

        return rows.map((row) => ({ ...row, id: String(row.id), yearGroupId: String(row.yearGroupId), subjectId: String(row.subjectId) }));
    }

    public async createWholeSchoolSequence(input: CreateWholeSchoolSequenceInput, userId: string): Promise<StaticLwpWholeSchoolSequence> {
        await this.assertPeriodExists(input.periodIndex);
        await this.assertSubjectAndYearAreFree(input.subjectId, input.periodIndex);

        // Resolved before the transaction opens, so a bad member list is refused without having
        // created the parent it would have hung off.
        const members = input.members ? await this.resolveMembers(input.members, input.subjectId, input.periodIndex) : [];

        const user = this.shallowUserService.newShallowUser(userId);

        const savedId = await this.connection.transaction(async (manager) => {
            const saved = await manager.save(
                manager.create(StaticLwpWholeSchoolSequence, {
                    subject: { id: input.subjectId },
                    period: { index: input.periodIndex },
                    status: WholeSchoolSequenceStatus.DRAFT,
                    logCreatedBy: user
                })
            );

            await this.replaceMembers(manager, saved.id, members, user);

            return saved.id;
        });

        return this.getWholeSchoolSequence(savedId);
    }

    public async updateWholeSchoolSequence(input: UpdateWholeSchoolSequenceInput, userId: string): Promise<StaticLwpWholeSchoolSequence> {
        // Throws if it is gone, so an edit of something deleted underneath the form says so rather
        // than silently affecting no rows.
        const stored = await this.getWholeSchoolSequence(input.id);

        /*
         * The lock, enforced here rather than only in the form (LEA-6700).
         *
         * The admin form disables these fields, but a disabled field is a courtesy and not a rule:
         * the mutation is reachable without it, and the acceptance criterion is that an admin
         * **cannot** change one a school has scheduled, not that the form makes it awkward.
         *
         * Refused rather than silently ignored. An edit that reports success and changes nothing is
         * the worst of the three outcomes, because the admin walks away believing it took.
         */
        await this.assertNotScheduledBySchool(input, stored);

        await this.assertPeriodExists(input.periodIndex);
        await this.assertSubjectAndYearAreFree(input.subjectId, input.periodIndex, input.id);

        /*
         * Resolved against the subject and year being saved, not the ones currently stored. An admin
         * moving a whole-school sequence to another year has to bring members that belong to it, and
         * validating against the old year would let the two disagree the moment the write lands.
         */
        const members = input.members ? await this.resolveMembers(input.members, input.subjectId, input.periodIndex) : null;

        const user = this.shallowUserService.newShallowUser(userId);

        await this.connection.transaction(async (manager) => {
            await manager.update(StaticLwpWholeSchoolSequence, input.id, {
                subject: { id: input.subjectId },
                period: { index: input.periodIndex },
                logUpdatedBy: user
            });

            // Null means the caller did not mention members, so the stored ones stand. An empty array
            // is a caller clearing them, which is a valid state and must not be confused with silence.
            if (members) await this.replaceMembers(manager, input.id, members, user);
        });

        return this.getWholeSchoolSequence(input.id);
    }

    /**
     * Refuses an edit to the subject, academic year or members of one a school has scheduled
     * (LEA-6700).
     *
     * **Only refuses an actual change.** The form submits every field on every save, so an admin who
     * opens a locked sequence and presses Save draft sends the stored values back unaltered. Refusing
     * that would mean a locked sequence could never be saved at all, which matters because publishing
     * saves first: re-running the publish checks after a member sequence was edited elsewhere is a
     * legitimate thing to want, and it changes nothing here.
     *
     * Members are compared as a set of year group to sequence pairs, because order is not meaningful
     * and the stored rows come back in whatever order the join produced.
     */
    private async assertNotScheduledBySchool(input: UpdateWholeSchoolSequenceInput, stored: StaticLwpWholeSchoolSequence): Promise<void> {
        const [scheduled] = await this.getWholeSchoolAssignmentUsage([String(stored.id)]);

        if (!scheduled) return;

        const subjectChanged = String(input.subjectId) !== String(stored.subject?.id);
        const periodChanged = Number(input.periodIndex) !== Number(stored.period?.index);

        /*
         * Null members means the caller did not mention them, which is silence rather than a change.
         * An empty array is a caller clearing every year group, which is very much a change.
         */
        const membersChanged = input.members ? !sameMembers(input.members, stored.members ?? []) : false;

        if (!subjectChanged && !periodChanged && !membersChanged) return;

        throw new HttpException(
            'A school has already scheduled this, so its subject, academic year and year groups can no longer be changed',
            ErrorStatusCodeEnum._535
        );
    }

    /**
     * Publishes a whole-school sequence, which is what makes it visible to schools.
     *
     * **Its own mutation rather than a status on `update`.** It runs checks that saving a draft does
     * not, and a status an unrelated edit can move in passing is a status nobody trusts.
     *
     * Refused when there are **no members at all**, because it would offer every entitled school
     * nothing. Allowed, and merely warned about, when **some** year groups are uncovered: content for
     * one year group is often not ready, and blocking publication on that would hold up every other
     * year group. A class in an uncovered year group is skipped later, with a reason.
     *
     * The member rules are re-checked here rather than trusted. They were enforced when the members
     * were saved, but the sequences themselves are editable afterwards: an admin who moves a member
     * sequence to another academic year leaves behind a whole-school sequence whose stored members
     * are no longer legal, and publishing is the last point at which that can be caught before
     * schools are offered it.
     *
     * Publishing an already published one is allowed and is a no-op on the status. It is how an admin
     * re-runs the checks after editing, and refusing it would mean the only way to re-validate was to
     * unpublish something schools may already be using.
     */
    public async publishWholeSchoolSequence(id: string, userId: string): Promise<WholeSchoolSequencePublishResult> {
        const wholeSchoolSequence = await this.getWholeSchoolSequence(id);
        const members = wholeSchoolSequence.members || [];

        if (!members.length) {
            throw new HttpException(
                'Give at least one year group a topic sequence before publishing. A whole-school sequence with none would offer schools nothing.',
                ErrorStatusCodeEnum._535
            );
        }

        await this.assertStoredMembersAreStillLegal(wholeSchoolSequence, members);

        await this.wholeSchoolSequenceRepository.update(id, {
            status: WholeSchoolSequenceStatus.PUBLISHED,
            logUpdatedBy: this.shallowUserService.newShallowUser(userId)
        });

        return {
            wholeSchoolSequence: await this.getWholeSchoolSequence(id),
            uncoveredYearGroups: await this.findUncoveredYearGroups(members)
        };
    }

    /**
     * Re-runs the member rules against what is stored, so publishing cannot offer schools something
     * that would be refused if it were being saved today.
     *
     * The same candidate query the picker and the save path use, so there is one definition of what
     * a legal member is and publishing cannot have its own, looser one.
     */
    private async assertStoredMembersAreStillLegal(
        wholeSchoolSequence: StaticLwpWholeSchoolSequence,
        members: StaticLwpWholeSchoolSequenceMember[]
    ): Promise<void> {
        const candidates = await this.loadCandidateSequences(wholeSchoolSequence.subject.id, Number(wholeSchoolSequence.period.index));
        const candidateIds = new Set(candidates.map((candidate) => candidate.id));

        const stale = members.filter((member) => !candidateIds.has(String(member.sequence.id)));

        if (stale.length) {
            /*
             * Named, unlike the save path's single message. Here the admin did not just choose the
             * offending sequence: it was legal when they chose it and something changed underneath,
             * so "one of these is wrong" would send them through every row to find out which.
             */
            throw new HttpException(
                `${stale.map((member) => member.sequence.name).join(', ')} can no longer be used here. ` +
                    'A topic sequence must still be a fixed one for this subject and academic year.',
                ErrorStatusCodeEnum._535
            );
        }
    }

    /**
     * The year groups this whole-school sequence does not cover, in the order the admin sees them.
     *
     * `Unknown` is excluded, as everywhere else: it is what the Wonde import assigns to a class it
     * could not map, is offered to nobody, and so cannot be a gap.
     */
    private async findUncoveredYearGroups(members: StaticLwpWholeSchoolSequenceMember[]): Promise<StaticLwpYearGroup[]> {
        const covered = new Set(members.map((member) => String(member.yearGroup.id)));

        const yearGroups = await this.yearGroupRepository.find({
            where: { hiddenFromLists: false },
            order: { year: 'ASC' }
        });

        return yearGroups.filter((yearGroup) => yearGroup.year !== UNKNOWN_YEAR_GROUP && !covered.has(String(yearGroup.id)));
    }

    /**
     * Checks a submitted member list and works out each row's year group.
     *
     * All four rules live here, and three of them are enforced by the candidate query rather than by
     * separate checks: a sequence that is not `FIXED`, belongs to another subject, or belongs to
     * another academic year is simply not a candidate, so it cannot be resolved. The messages name
     * the sequence, because "one of your choices is wrong" is not something an admin can act on.
     *
     * The year group is read off the sequence here, which is the only place it is decided. Nothing
     * the caller sends can put a member under a year group its sequence does not belong to.
     */
    private async resolveMembers(
        memberInputs: WholeSchoolSequenceMemberInput[],
        subjectId: string,
        periodIndex: number
    ): Promise<{ sequenceId: string; yearGroupId: string }[]> {
        if (!memberInputs.length) return [];

        const sequenceIds = memberInputs.map((member) => member.sequenceId);
        const duplicateSequence = sequenceIds.find((id, index) => sequenceIds.indexOf(id) !== index);

        if (duplicateSequence) {
            throw new HttpException('The same topic sequence cannot be used for two year groups', ErrorStatusCodeEnum._535);
        }

        const candidates = await this.loadCandidateSequences(subjectId, periodIndex);
        const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));

        const resolved = memberInputs.map((member) => {
            const candidate = candidateById.get(String(member.sequenceId));

            /*
             * One message for four different reasons, deliberately. The sequence does not exist, is
             * an interval one, belongs to another subject, or belongs to another academic year: from
             * the admin's side these are the same fact, which is that this row's choice is no longer
             * one the form should have offered. Naming which of the four would mean telling them
             * about sequences they cannot see from this screen.
             */
            if (!candidate) {
                throw new HttpException(
                    `That topic sequence cannot be used here. It must be a fixed sequence for this subject and academic year.`,
                    ErrorStatusCodeEnum._535
                );
            }

            return { sequenceId: candidate.id, yearGroupId: candidate.yearGroupId };
        });

        const yearGroupIds = resolved.map((member) => member.yearGroupId);
        const duplicateYearGroup = yearGroupIds.find((id, index) => yearGroupIds.indexOf(id) !== index);

        if (duplicateYearGroup) {
            const yearGroupName = candidateById.get(
                resolved.find((member) => member.yearGroupId === duplicateYearGroup)?.sequenceId ?? ''
            )?.yearGroupName;

            throw new HttpException(
                `${yearGroupName ?? 'A year group'} can only have one topic sequence in a whole-school sequence`,
                ErrorStatusCodeEnum._535
            );
        }

        return resolved;
    }

    /**
     * Replaces the member list wholesale, in the caller's transaction.
     *
     * Deleted and rewritten rather than diffed, matching how a topic sequence's items are saved. A
     * member carries nothing of its own beyond the two links, so there is no history in these rows to
     * preserve and nothing downstream holds their ids.
     */
    private async replaceMembers(
        manager: EntityManager,
        wholeSchoolSequenceId: string,
        members: { sequenceId: string; yearGroupId: string }[],
        user: ReturnType<ShallowUserService['newShallowUser']>
    ): Promise<void> {
        await manager.delete(StaticLwpWholeSchoolSequenceMember, { wholeSchoolSequence: { id: wholeSchoolSequenceId } });

        if (!members.length) return;

        await manager.save(
            members.map((member) =>
                manager.create(StaticLwpWholeSchoolSequenceMember, {
                    wholeSchoolSequence: { id: wholeSchoolSequenceId },
                    sequence: { id: member.sequenceId },
                    yearGroup: { id: member.yearGroupId },
                    logCreatedBy: user
                })
            )
        );
    }

    /**
     * Removes the row. Nothing points at it yet in this slice; from slice 2 its members cascade with
     * it, and from slice 5 a school's assignment survives with its foreign key set to null, so no
     * school or class data is ever touched. Deleted rows are archived by the delete_auditing trigger.
     */
    public async deleteWholeSchoolSequence(id: string): Promise<OperationStatus> {
        const res = await this.wholeSchoolSequenceRepository.delete(id);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    /**
     * One whole-school sequence per subject per academic year, checked here so the admin reads a
     * sentence rather than a constraint violation. The unique index is still what guarantees it.
     *
     * `excludeId` is the row being edited, which must not collide with itself.
     */
    private async assertSubjectAndYearAreFree(subjectId: string, periodIndex: number, excludeId?: string): Promise<void> {
        const existing = await this.wholeSchoolSequenceRepository.findOne({
            where: {
                subject: { id: subjectId },
                period: { index: periodIndex },
                ...(excludeId ? { id: Not(excludeId) } : {})
            }
        });

        if (existing) {
            throw new HttpException(
                'There is already a whole-school sequence for that subject and academic year',
                ErrorStatusCodeEnum._535
            );
        }
    }

    private async assertPeriodExists(periodIndex: number): Promise<void> {
        const period = await this.periodRepository.findOne({ where: { index: periodIndex }, select: ['index'] });

        if (!period) throw new HttpException('That academic year does not exist', ErrorStatusCodeEnum._535);
    }
}
