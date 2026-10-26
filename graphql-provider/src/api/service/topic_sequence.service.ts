import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SequenceTimingMode } from 'lwp-shared/enums';
import moment from 'moment';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Connection, EntityManager, Repository } from 'typeorm';

import { CreateTopicSequenceInput } from '../dtos/CreateTopicSequenceInput';
import { SequenceCandidateTopicGroup } from '../dtos/SequenceCandidateTopicGroup';
import { TopicSequenceFilterInput } from '../dtos/TopicSequenceFilterInput';
import { TopicSequenceItemInput } from '../dtos/TopicSequenceItemInput';
import { UpdateTopicSequenceInput } from '../dtos/UpdateTopicSequenceInput';
import { LwpClassSequenceAssignment } from '../entities/class_sequence_assignment';
import { StaticLwpPeriod } from '../entities/static_period';
import { StaticLwpTopic } from '../entities/static_topic';
import { StaticLwpTopicDomainYearGroup } from '../entities/static_topic_domain_year_group';
import { StaticLwpTopicSequence } from '../entities/static_topic_sequence';
import { StaticLwpTopicSequenceItem } from '../entities/static_topic_sequence_item';
import { ActivityStepType, ErrorStatusCodeEnum, OperationStatus } from '../model';

const DATE_FORMAT = 'YYYY-MM-DD';

/** A sequence item with its position and dates settled, ready to persist. */
export interface DatedSequenceItem {
    topicId: string;
    order: number;
    /** Null for INTERVAL, which carries no dates at all. Required for FIXED. */
    startDate: Date | null;
    /** Null for INTERVAL. Optional in FIXED mode, as a manually scheduled topic's due date is. */
    endDate: Date | null;
}

/**
 * What settling a sequence's item dates depends on, which is the mode and nothing else.
 *
 * FIXED carries its dates on the items. INTERVAL carries none at all (LEA-6594), so nothing here
 * needs the cadence: `intervalDays` is deliberately absent, because this shape exists only for
 * {@link resolveSequenceItemDates} and giving it a field that function cannot use would suggest the
 * cadence dates items. It is read at assignment time instead, by `planClassTopicDates`, which
 * declares its own timing shape for exactly that reason.
 */
export interface SequenceTiming {
    timingMode: SequenceTimingMode;
}

function toDateOnly(value: Date | string): Date {
    return new Date(moment(value).format(DATE_FORMAT));
}

/**
 * Settles the position and dates of every item in a sequence.
 *
 * INTERVAL: the admin owns the order and **nothing else**. The items carry no dates, because an
 * interval sequence is an ordered list of topics and the anchor and interval belong to the class it
 * is given to rather than to the template (LEA-6594). The teacher supplies both at assignment time.
 *
 * FIXED: the admin owns the dates, and the order is derived from them chronologically. Only the
 * start date is required; the end date may be left open, as it may for a manually scheduled topic.
 *
 * Exported so the date arithmetic and input validation can be unit tested without a database.
 */
export function resolveSequenceItemDates(timing: SequenceTiming, items: TopicSequenceItemInput[]): DatedSequenceItem[] {
    if (!items?.length) throw new HttpException('A sequence needs at least one topic', ErrorStatusCodeEnum._535);

    const topicIds = items.map((item) => item.topicId);

    if (new Set(topicIds).size !== topicIds.length) {
        throw new HttpException('A sequence cannot contain the same topic twice', ErrorStatusCodeEnum._535);
    }

    if (timing.timingMode === SequenceTimingMode.INTERVAL) {
        /*
         * An interval sequence stores its order and nothing else (LEA-6594).
         *
         * It used to generate a start and end date onto every item here, from the sequence's
         * `defaultStartDate` plus its `intervalDays`. Those dates were then thrown away at every
         * use: `planClassTopicDates` re-anchors an interval assignment from the class's own start
         * date and never reads the template's. So this wrote something nothing read.
         *
         * The sequence does still carry `intervalDays`, and it is deliberately not read here. The
         * cadence says how far apart a class runs the topics, which is a question about an
         * assignment rather than about the template, so it is applied by `planClassTopicDates` when
         * a class is given the sequence. `defaultStartDate` is gone altogether (LEA-6595): the
         * anchor is the class's to choose, so the sequence had nothing to say about it.
         */
        // Items without an explicit order keep the order they arrived in, as the sort is stable.
        const ordered = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        return ordered.map((item, index) => ({
            topicId: item.topicId,
            order: index + 1,
            startDate: null,
            endDate: null
        }));
    }

    items.forEach((item) => {
        // The end date is optional, as a manually scheduled topic's due date is, so only the
        // start date is required here. The order is derived from the start dates in any case.
        if (!item.startDate) {
            throw new HttpException('Every topic in a fixed sequence needs a start date', ErrorStatusCodeEnum._535);
        }

        if (item.endDate && moment(item.endDate).isBefore(moment(item.startDate), 'day')) {
            throw new HttpException('A topic cannot end before it starts', ErrorStatusCodeEnum._535);
        }
    });

    return [...items]
        .sort((a, b) => moment(a.startDate).valueOf() - moment(b.startDate).valueOf())
        .map((item, index) => ({
            topicId: item.topicId,
            order: index + 1,
            startDate: toDateOnly(item.startDate),
            endDate: item.endDate ? toDateOnly(item.endDate) : null
        }));
}

/**
 * The academic year belongs to FIXED sequences and only to them (LEA-6581, as corrected by the team
 * on 2026-08-27).
 *
 * A FIXED sequence carries concrete dates, so it belongs to exactly one year and must declare it.
 * An INTERVAL sequence carries no dates, belongs to no year, and is offered in every academic year
 * forever, so a period on one is refused rather than quietly dropped: the only way to send one is a
 * form that changed timing mode without clearing its state, and silently accepting that would store
 * a year that every later read has to remember to ignore.
 *
 * Exported so the pairing can be unit tested without a database.
 */
export function assertPeriodMatchesTimingMode(timingMode: SequenceTimingMode, periodIndex: number | null): void {
    if (timingMode === SequenceTimingMode.FIXED) {
        if (periodIndex === null || periodIndex === undefined) {
            throw new HttpException('A fixed sequence needs the academic year it is for', ErrorStatusCodeEnum._535);
        }

        return;
    }

    if (periodIndex !== null && periodIndex !== undefined) {
        throw new HttpException(
            'An interval sequence is not tied to an academic year, so it cannot be given one',
            ErrorStatusCodeEnum._535
        );
    }
}

/**
 * The cadence belongs to INTERVAL sequences and only to them.
 *
 * An INTERVAL sequence must declare one: it is the whole of its timing, and without it the sequence
 * cannot be assigned to anything. Since a teacher is never offered a cadence of their own
 * (LEA-6624), a sequence saved without one would be permanently unusable with no way for a school
 * to rescue it, so this is refused at the point it can still be fixed.
 *
 * A FIXED sequence is refused one rather than having it quietly nulled, for the same reason
 * {@link assertPeriodMatchesTimingMode} refuses a period on an interval sequence: the only way to
 * send it is a form that changed timing mode without clearing its state, and accepting that stores
 * a value every later read has to remember to ignore.
 *
 * Whole days only. The GraphQL scalar for a number here is Float, so a fractional cadence is
 * expressible, and it is rejected rather than rounded: 7.5 days is not something a schedule can
 * express, and silently choosing 7 or 8 for the admin would be worse than saying so.
 *
 * Exported so the pairing can be unit tested without a database.
 */
export function assertIntervalMatchesTimingMode(timingMode: SequenceTimingMode, intervalDays?: number | null): void {
    if (timingMode === SequenceTimingMode.INTERVAL) {
        if (intervalDays === null || intervalDays === undefined) {
            throw new HttpException('An interval sequence needs the number of days between its topics', ErrorStatusCodeEnum._535);
        }

        if (!Number.isInteger(intervalDays) || intervalDays < 1) {
            throw new HttpException('The days between topics must be a whole number of at least 1', ErrorStatusCodeEnum._535);
        }

        return;
    }

    if (intervalDays !== null && intervalDays !== undefined) {
        throw new HttpException('A fixed sequence sets a date on each topic, so it cannot be given an interval', ErrorStatusCodeEnum._535);
    }
}

/**
 * Every date a FIXED sequence carries must fall inside the academic year it declares (LEA-6581).
 *
 * INTERVAL sequences never reach this. They have no declared year and, once they stop carrying item
 * dates at all, nothing to check against one. Callers gate on the timing mode rather than this
 * function testing it, so that a caller which forgets the gate fails on a missing period rather than
 * passing silently.
 *
 * The resolved items are checked rather than the raw input. That was originally what made INTERVAL
 * work, and it still matters for FIXED: the ordering pass rewrites the item list, so it is the
 * settled dates that have to fit the year rather than whatever arrived.
 *
 * The period's own dates are required for this to mean anything. They are nullable on
 * `static_lwp_period` and were, until this feature, read nowhere in application code, so a period
 * that has never been given them is refused by name rather than silently skipping the check. An
 * end date at or before the start date is refused for the same reason: the academic year form does
 * not require either date and defaults both to today, so a period created without touching those
 * pickers has a zero-length year, which is not a year we can validate against.
 *
 * Exported so it can be unit tested without a database.
 */
export function assertItemDatesWithinPeriod(items: DatedSequenceItem[], period: StaticLwpPeriod): void {
    const label = period.shortName ?? `period ${period.index}`;

    if (!period.startDate || !period.endDate) {
        throw new HttpException(
            `The academic year ${label} has no start and end dates set, so a sequence cannot be dated against it. Set them on the academic year first.`,
            ErrorStatusCodeEnum._535
        );
    }

    const periodStart = moment(period.startDate).startOf('day');
    const periodEnd = moment(period.endDate).startOf('day');

    if (!periodEnd.isAfter(periodStart, 'day')) {
        throw new HttpException(
            `The academic year ${label} starts on ${periodStart.format(DATE_FORMAT)} and ends on ${periodEnd.format(
                DATE_FORMAT
            )}, which is not a usable range. Correct the academic year first.`,
            ErrorStatusCodeEnum._535
        );
    }

    const outside = items.filter((item) => {
        // The end date is optional in FIXED mode, so only check it when there is one.
        const startsOutside = moment(item.startDate).isBefore(periodStart, 'day') || moment(item.startDate).isAfter(periodEnd, 'day');
        const endsOutside = item.endDate ? moment(item.endDate).isAfter(periodEnd, 'day') : false;

        return startsOutside || endsOutside;
    });

    if (outside.length) {
        throw new HttpException(
            `${outside.length === 1 ? 'One topic falls' : `${outside.length} topics fall`} outside ${label}, which runs from ${periodStart.format(
                DATE_FORMAT
            )} to ${periodEnd.format(DATE_FORMAT)}. Adjust the dates or pick a different academic year.`,
            ErrorStatusCodeEnum._535
        );
    }
}

@Injectable()
export class TopicSequenceService {
    constructor(
        @InjectRepository(StaticLwpTopicSequence)
        private sequenceRepository: Repository<StaticLwpTopicSequence>,
        @InjectRepository(StaticLwpTopicSequenceItem)
        private sequenceItemRepository: Repository<StaticLwpTopicSequenceItem>,
        @InjectRepository(StaticLwpTopicDomainYearGroup)
        private topicDomainYearGroupRepository: Repository<StaticLwpTopicDomainYearGroup>,
        @InjectRepository(StaticLwpTopic)
        private topicRepository: Repository<StaticLwpTopic>,
        @InjectRepository(StaticLwpPeriod)
        private periodRepository: Repository<StaticLwpPeriod>,
        @InjectRepository(LwpClassSequenceAssignment)
        private assignmentRepository: Repository<LwpClassSequenceAssignment>,
        private shallowUserService: ShallowUserService,
        private connection: Connection
    ) {}

    /** Loads the academic year a sequence is being dated against, refusing an unknown one. */
    private async loadPeriodForSequence(periodIndex: number): Promise<StaticLwpPeriod> {
        const period = await this.periodRepository.findOne({
            where: { index: periodIndex },
            select: ['index', 'shortName', 'startDate', 'endDate']
        });

        if (!period) throw new HttpException('That academic year does not exist', ErrorStatusCodeEnum._535);

        return period;
    }

    /**
     * Checks a sequence's dates against the year it declares, for the one timing mode that has both.
     *
     * The gate lives here rather than inside `assertItemDatesWithinPeriod` so that the query to load
     * the period is not run for an interval sequence either. A no-op for INTERVAL therefore costs
     * nothing rather than costing a round trip whose answer is discarded.
     */
    private async assertDatesFitDeclaredYear(
        timing: { timingMode: SequenceTimingMode; periodIndex?: number | null },
        datedItems: DatedSequenceItem[]
    ): Promise<void> {
        if (timing.timingMode !== SequenceTimingMode.FIXED) return;

        assertItemDatesWithinPeriod(datedItems, await this.loadPeriodForSequence(timing.periodIndex));
    }

    public async getSequences(filter?: TopicSequenceFilterInput): Promise<StaticLwpTopicSequence[]> {
        const query = this.sequenceRepository
            .createQueryBuilder('sequence')
            .leftJoinAndSelect('sequence.subject', 'subject')
            .leftJoinAndSelect('sequence.yearGroup', 'yearGroup')
            .leftJoinAndSelect('sequence.period', 'period');

        if (filter?.subjectId) query.andWhere('subject.id = :subjectId', { subjectId: filter.subjectId });

        if (filter?.yearGroupId) query.andWhere('yearGroup.id = :yearGroupId', { yearGroupId: filter.yearGroupId });

        if (filter?.search?.trim()) query.andWhere('sequence.name ILIKE :search', { search: `%${filter.search.trim()}%` });

        /*
         * Every academic year is listed, finished ones included (LEA-6586).
         *
         * They used to be filtered out, on the reasoning that a finished year's sequence can never be
         * offered to a school so listing it would only invite an admin to edit something with no
         * effect. That was right about editing and exactly backwards for deleting: clearing out last
         * year's sets is the admin's job now, and the rows they most need to reach were the hidden
         * ones. The edit page locks a finished sequence on its own account, so nothing here has to.
         *
         * Safe to widen because this is the admin list and nothing else: a class is offered sequences
         * through getAssignableSequencesForClass, which keeps its own academic year rule.
         */
        const currentPeriodIndex = await this.currentPeriodIndex();

        /*
         * No period flagged current, which should not happen but is survivable. There is no year to
         * rank the others against, so the plain chronological order stands rather than a ranking
         * built around a year we cannot identify.
         */
        if (currentPeriodIndex === null) {
            return query.orderBy('period.index', 'ASC').addOrderBy('sequence.name', 'ASC').getMany();
        }

        /*
         * Ordered by how useful a sequence is rather than by its year alone, so an admin opens the
         * page on the ones they are working with and finds the stale ones where stale things belong.
         *
         * Interval sequences rank with the current year rather than trailing the list. They carry no
         * academic year at all, but they are offered in every one of them, so they are exactly as
         * usable this year as a sequence built for it. Sorting them by their missing year would have
         * put the sequences that never go stale below the ones that already have.
         *
         * The index is interpolated rather than bound. TypeORM appends ORDER BY fragments to the SQL
         * more or less verbatim and does not reliably substitute parameters inside them, and this is
         * a smallint this service has just read out of our own period table, so there is nothing here
         * that could carry an injection.
         */
        const rank = `CASE
            WHEN period.index IS NULL OR period.index = ${currentPeriodIndex} THEN 0
            WHEN period.index > ${currentPeriodIndex} THEN 1
            ELSE 2
        END`;

        // Within a rank: future years nearest first, finished years most recent first. Negating the
        // finished ones reverses them without needing a second, conflicting sort direction. The
        // current-year rank is deliberately flat, so its dated and undated sequences interleave by
        // name rather than splitting into two groups that mean nothing to an admin.
        const withinRank = `CASE
            WHEN period.index > ${currentPeriodIndex} THEN period.index
            WHEN period.index < ${currentPeriodIndex} THEN -period.index
            ELSE 0
        END`;

        return query.orderBy(rank, 'ASC').addOrderBy(withinRank, 'ASC').addOrderBy('sequence.name', 'ASC').getMany();
    }

    /** The academic year the schools are currently teaching, or null if none is flagged. */
    private async currentPeriodIndex(): Promise<number | null> {
        const current = await this.periodRepository.findOne({ where: { isCurrentPeriod: true }, select: ['index'] });

        return current ? Number(current.index) : null;
    }

    public async getSequence(id: string): Promise<StaticLwpTopicSequence> {
        const sequence = await this.sequenceRepository
            .createQueryBuilder('sequence')
            .leftJoinAndSelect('sequence.subject', 'subject')
            .leftJoinAndSelect('sequence.yearGroup', 'yearGroup')
            .leftJoinAndSelect('sequence.period', 'period')
            .leftJoinAndSelect('sequence.items', 'items')
            .leftJoinAndSelect('items.topic', 'topic')
            .where('sequence.id = :id', { id })
            .orderBy('items.order', 'ASC')
            .getOne();

        if (!sequence) throw new HttpException('Sequence does not exist', ErrorStatusCodeEnum._535);

        return sequence;
    }

    public async getSequenceItemCount(sequenceId: string): Promise<number> {
        return this.sequenceItemRepository.count({ where: { sequence: { id: sequenceId } } });
    }

    /**
     * Whether each sequence has ever been assigned, in the id order asked for.
     *
     * Drives the admin form's lock on the academic year: once a sequence has been given to a class,
     * its year is a statement about class topics that already exist, so changing it would make the
     * record disagree with the data. The form disables the field rather than hiding it, so an admin
     * can still see which year the sequence belongs to.
     *
     * Every status counts, `REMOVED` included. A removal keeps the released class topics and the
     * assignment row they point at for provenance, so the year still describes real data.
     *
     * One query for the whole batch, because the admin list asks this of every row it renders.
     */
    public async getSequenceAssignmentUsage(sequenceIds: readonly string[]): Promise<boolean[]> {
        if (!sequenceIds.length) return [];

        const assigned = await this.assignmentRepository
            .createQueryBuilder('assignment')
            .innerJoin('assignment.sequence', 'sequence')
            .where('sequence.id IN (:...sequenceIds)', { sequenceIds })
            .select('sequence.id', 'sequenceId')
            .groupBy('sequence.id')
            .getRawMany<{ sequenceId: string }>();

        const assignedIds = new Set(assigned.map((row) => String(row.sequenceId)));

        return sequenceIds.map((sequenceId) => assignedIds.has(String(sequenceId)));
    }

    public async createSequence(input: CreateTopicSequenceInput, userId: string): Promise<StaticLwpTopicSequence> {
        assertPeriodMatchesTimingMode(input.timingMode, input.periodIndex);
        assertIntervalMatchesTimingMode(input.timingMode, input.intervalDays);

        const datedItems = resolveSequenceItemDates(input, input.items);

        await this.assertDatesFitDeclaredYear(input, datedItems);

        await this.assertTopicsMatchSequenceScope(
            datedItems.map((item) => item.topicId),
            input.subjectId,
            input.yearGroupId
        );

        const user = this.shallowUserService.newShallowUser(userId);

        const savedId = await this.connection.transaction(async (manager) => {
            const sequence = manager.create(StaticLwpTopicSequence, {
                name: input.name.trim(),
                subject: { id: input.subjectId },
                yearGroup: { id: input.yearGroupId },
                // Null for INTERVAL: those sequences belong to no year. The pairing was asserted above.
                period: input.timingMode === SequenceTimingMode.FIXED ? { index: input.periodIndex } : null,
                timingMode: input.timingMode,
                // Null for FIXED, whose dates live on its items. Both pairings were asserted above,
                // so the mode test here decides which column is written rather than what is valid.
                intervalDays: input.timingMode === SequenceTimingMode.INTERVAL ? input.intervalDays : null,
                logCreatedBy: user
            });

            const saved = await manager.save(sequence);

            await this.writeItems(manager, saved.id, datedItems, user);

            return saved.id;
        });

        return this.getSequence(savedId);
    }

    public async updateSequence(input: UpdateTopicSequenceInput, userId: string): Promise<StaticLwpTopicSequence> {
        assertPeriodMatchesTimingMode(input.timingMode, input.periodIndex);
        assertIntervalMatchesTimingMode(input.timingMode, input.intervalDays);

        const existing = await this.getSequence(input.id);

        // Items are only replaced when the caller sends a list. Otherwise the existing topics are
        // kept and re-settled, which matters when the timing mode changed: an interval sequence's
        // items give up their dates, and a fixed one's are reordered to match the dates they carry.
        // Changing the cadence re-dates nothing, because interval items have no dates (LEA-6594).
        const itemInputs: TopicSequenceItemInput[] =
            input.items ??
            existing.items.map((item) => ({
                topicId: item.topic.id,
                order: item.order,
                startDate: item.startDate,
                endDate: item.endDate
            }));

        const datedItems = resolveSequenceItemDates(input, itemInputs);

        await this.assertDatesFitDeclaredYear(input, datedItems);

        await this.assertTopicsMatchSequenceScope(
            datedItems.map((item) => item.topicId),
            input.subjectId,
            input.yearGroupId
        );

        const user = this.shallowUserService.newShallowUser(userId);

        await this.connection.transaction(async (manager) => {
            await manager.update(StaticLwpTopicSequence, input.id, {
                name: input.name.trim(),
                subject: { id: input.subjectId },
                yearGroup: { id: input.yearGroupId },
                // Null for INTERVAL, which also clears the year off a sequence switched from FIXED.
                period: input.timingMode === SequenceTimingMode.FIXED ? { index: input.periodIndex } : null,
                timingMode: input.timingMode,
                // And null for FIXED, which likewise clears the cadence off a sequence switched the
                // other way, so neither mode leaves the other's field behind to be read later.
                intervalDays: input.timingMode === SequenceTimingMode.INTERVAL ? input.intervalDays : null,
                logUpdatedBy: user
            });

            await this.replaceItems(manager, input.id, datedItems, user);
        });

        return this.getSequence(input.id);
    }

    /**
     * Removes the sequence row. Its items cascade, and any class assignment keeps its class topics
     * with sequenceId set to NULL, so no class or pupil data is touched. The deleted rows are
     * archived automatically by the delete_auditing database trigger.
     */
    public async deleteSequence(id: string): Promise<OperationStatus> {
        const res = await this.sequenceRepository.delete(id);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async addSequenceItem(sequenceId: string, item: TopicSequenceItemInput, userId: string): Promise<StaticLwpTopicSequence> {
        const sequence = await this.getSequence(sequenceId);

        const itemInputs = [
            ...sequence.items.map((existing) => ({
                topicId: existing.topic.id,
                order: existing.order,
                startDate: existing.startDate,
                endDate: existing.endDate
            })),
            // A new topic goes on the end of an interval sequence; a fixed one is placed by its dates.
            { ...item, order: sequence.items.length + 1 }
        ];

        return this.rewriteItems(sequence, itemInputs, userId);
    }

    public async removeSequenceItem(itemId: string, userId: string): Promise<StaticLwpTopicSequence> {
        const item = await this.sequenceItemRepository
            .createQueryBuilder('item')
            .leftJoinAndSelect('item.sequence', 'sequence')
            .where('item.id = :itemId', { itemId })
            .getOne();

        if (!item) throw new HttpException('Sequence item does not exist', ErrorStatusCodeEnum._535);

        const sequence = await this.getSequence(item.sequence.id);

        const itemInputs = sequence.items
            .filter((existing) => existing.id !== itemId)
            .map((existing) => ({
                topicId: existing.topic.id,
                order: existing.order,
                startDate: existing.startDate,
                endDate: existing.endDate
            }));

        // Rewriting closes the gap the removed topic left, so interval dates stay back-to-back.
        return this.rewriteItems(sequence, itemInputs, userId);
    }

    public async reorderSequenceItems(sequenceId: string, orderedItemIds: string[], userId: string): Promise<StaticLwpTopicSequence> {
        const sequence = await this.getSequence(sequenceId);

        if (sequence.timingMode === SequenceTimingMode.FIXED) {
            throw new HttpException(
                'A fixed sequence is ordered by its topic dates, so change the dates instead of the order',
                ErrorStatusCodeEnum._535
            );
        }

        const existingIds = sequence.items.map((item) => item.id);

        if (orderedItemIds.length !== existingIds.length || existingIds.some((id) => !orderedItemIds.includes(id))) {
            throw new HttpException('The new order must list every topic in the sequence exactly once', ErrorStatusCodeEnum._535);
        }

        const itemsById = new Map(sequence.items.map((item) => [item.id, item]));

        const itemInputs = orderedItemIds.map((id, index) => ({
            topicId: itemsById.get(id).topic.id,
            order: index + 1
        }));

        return this.rewriteItems(sequence, itemInputs, userId);
    }

    /**
     * Candidate topics for a sequence's subject and year group, grouped by domain for browsing.
     *
     * Only published, visible topics are offered. Topics already in a sequence that are later
     * unpublished are left alone; they are skipped at assignment time instead.
     */
    public async getCandidateTopicsForSequence(
        subjectId: string,
        yearGroupId: string,
        search?: string
    ): Promise<SequenceCandidateTopicGroup[]> {
        const query = this.topicDomainYearGroupRepository
            .createQueryBuilder('topicAndYearGroup')
            .innerJoinAndSelect('topicAndYearGroup.domain', 'domain')
            .innerJoinAndSelect('topicAndYearGroup.topic', 'topic')
            .innerJoin('topicAndYearGroup.yearGroup', 'yearGroup')
            .innerJoin('domain.subject', 'subject')
            .where('subject.id = :subjectId', { subjectId })
            .andWhere('yearGroup.id = :yearGroupId', { yearGroupId })
            .andWhere('topic.isHidden = :isHidden AND topic.isPublished = :isPublished', { isHidden: false, isPublished: true })
            // A reading topic is scheduled through the reading log, on its own weekly cadence and with
            // a reading target, so it has no place in a dated sequence. Every teacher-facing picker
            // excludes them the same way, in TopicService.allTopics; this query is purpose-built
            // rather than shared with that one, which is how the condition came to be missing here.
            .andWhere('topic.isReading = :isReading', { isReading: false });

        if (search?.trim()) query.andWhere('topic.teacherTopicName ILIKE :search', { search: `%${search.trim()}%` });

        const rows = await query.orderBy('domain.title', 'ASC').addOrderBy('topic.teacherTopicName', 'ASC').getMany();

        // Topics needing a photo from the teacher are not offered at all: see
        // assertNoTopicNeedsATeacherPhoto for why they cannot be part of a sequence. Filtered after
        // the fetch rather than as an anti-join, so the picker and the save-time guard ask the same
        // question in the same way.
        const needPhotos = await this.findTopicIdsNeedingATeacherPhoto(rows.map((row) => row.topic.id));

        const groups = new Map<string, SequenceCandidateTopicGroup>();

        rows.forEach((row) => {
            if (needPhotos.has(String(row.topic.id))) return;

            if (!groups.has(row.domain.id)) {
                groups.set(row.domain.id, { domainId: row.domain.id, domainTitle: row.domain.title, topics: [] });
            }

            groups.get(row.domain.id).topics.push(row.topic);
        });

        return [...groups.values()];
    }

    /** Re-settles a sequence's items from a fresh set of inputs, keeping its own timing. */
    private async rewriteItems(
        sequence: StaticLwpTopicSequence,
        itemInputs: TopicSequenceItemInput[],
        userId: string
    ): Promise<StaticLwpTopicSequence> {
        const datedItems = resolveSequenceItemDates(sequence, itemInputs);

        // Adding or re-dating a topic on a FIXED sequence can push it past the end of its academic
        // year even though the year itself is not changing, so the check belongs on this path too.
        // INTERVAL sequences have no year to fall outside of. `getSequence` joins the period, so
        // this costs no extra query and does not go through `assertDatesFitDeclaredYear`.
        if (sequence.timingMode === SequenceTimingMode.FIXED) {
            assertItemDatesWithinPeriod(datedItems, sequence.period);
        }

        await this.assertTopicsMatchSequenceScope(
            datedItems.map((item) => item.topicId),
            sequence.subject.id,
            sequence.yearGroup.id
        );

        const user = this.shallowUserService.newShallowUser(userId);

        await this.connection.transaction(async (manager) => {
            await manager.update(StaticLwpTopicSequence, sequence.id, { logUpdatedBy: user });
            await this.replaceItems(manager, sequence.id, datedItems, user);
        });

        return this.getSequence(sequence.id);
    }

    /**
     * Swaps a sequence's items for a new set. Deleting the old rows first keeps the unique
     * (sequenceId, order) and (sequenceId, topicId) constraints satisfied mid-transaction: updating
     * rows in place cannot reorder them, because swapping two orders collides with the constraint
     * as each row is written, and Postgres checks it per row rather than at commit.
     *
     * Deliberately not a diff, so be aware of the trade-off before "optimising" this:
     * - item ids change on every save, so callers must render from the returned sequence rather
     *   than hold onto ids. Nothing persists an item id: no table has a foreign key to
     *   static_lwp_topic_sequence_item, and class topics link to the assignment instead.
     * - an item's logCreatedAt/logCreatedBy therefore describe the last save, not when the topic
     *   was first added, and each save archives the replaced rows to deleted_item.
     * Diffing in place would need the (sequenceId, order) constraint to be DEFERRABLE, which
     * TypeORM supports on @Unique but never reads back, so a later change to it would silently
     * generate no migration. Reviewed and kept as is: nothing consumes item ids or item-level
     * provenance today.
     *
     * This only ever touches the template. Classes already assigned the sequence keep the class
     * topics they were given, because those were materialized at assignment time.
     */
    private async replaceItems(
        manager: EntityManager,
        sequenceId: string,
        datedItems: DatedSequenceItem[],
        user: ReturnType<ShallowUserService['newShallowUser']>
    ): Promise<void> {
        const existingItems = await manager.find(StaticLwpTopicSequenceItem, {
            where: { sequence: { id: sequenceId } },
            select: ['id']
        });

        if (existingItems.length)
            await manager.delete(
                StaticLwpTopicSequenceItem,
                existingItems.map((item) => item.id)
            );

        await this.writeItems(manager, sequenceId, datedItems, user);
    }

    private async writeItems(
        manager: EntityManager,
        sequenceId: string,
        datedItems: DatedSequenceItem[],
        user: ReturnType<ShallowUserService['newShallowUser']>
    ): Promise<void> {
        const items = datedItems.map((item) =>
            manager.create(StaticLwpTopicSequenceItem, {
                sequence: { id: sequenceId },
                topic: { id: item.topicId },
                order: item.order,
                startDate: item.startDate,
                endDate: item.endDate,
                logCreatedBy: user
            })
        );

        await manager.save(items);
    }

    /**
     * A sequence is scoped to one subject and one year group, so every topic in it has to resolve
     * for that pair via its domain. Publication state is deliberately not checked here, so that
     * editing a sequence containing a since-unpublished topic is not blocked.
     */
    private async assertTopicsMatchSequenceScope(topicIds: string[], subjectId: string, yearGroupId: string): Promise<void> {
        if (!topicIds.length) return;

        const matches = await this.topicDomainYearGroupRepository
            .createQueryBuilder('topicAndYearGroup')
            .innerJoin('topicAndYearGroup.domain', 'domain')
            .innerJoin('topicAndYearGroup.topic', 'topic')
            .innerJoin('topicAndYearGroup.yearGroup', 'yearGroup')
            .innerJoin('domain.subject', 'subject')
            .where('topic.id IN (:...topicIds)', { topicIds })
            .andWhere('subject.id = :subjectId', { subjectId })
            .andWhere('yearGroup.id = :yearGroupId', { yearGroupId })
            .select('topic.id', 'topicId')
            .getRawMany<{ topicId: string }>();

        const matchedIds = new Set(matches.map((match) => String(match.topicId)));
        const mismatched = topicIds.filter((topicId) => !matchedIds.has(String(topicId)));

        if (mismatched.length) {
            throw new HttpException(
                `These topics do not belong to the sequence's subject and year group: ${mismatched.join(', ')}`,
                ErrorStatusCodeEnum._535
            );
        }

        await this.assertNoTopicNeedsATeacherPhoto(topicIds);
    }

    /**
     * Topics that need a photo from the teacher cannot go in a sequence.
     *
     * Scheduling one by hand requires at least one photo across its set-by-teacher steps before the
     * topic can be added, but that rule lives in the scheduling forms, and assigning a sequence does
     * not go through them. A sequenced one would be created with no photo at all, released on its
     * date by the cron, and reach pupils and parents as an empty step, with nothing failing anywhere.
     * Keeping them out of sequences is the fix the team chose.
     *
     * Enforced on save as well as hidden from the picker, so it holds for a direct API call and for a
     * sequence being re-saved after one of its topics gained such a step.
     */
    private async assertNoTopicNeedsATeacherPhoto(topicIds: string[]): Promise<void> {
        const needPhotos = await this.findTopicIdsNeedingATeacherPhoto(topicIds);

        if (needPhotos.size) {
            throw new HttpException(
                `These topics need a photo from the teacher, so they have to be scheduled by hand rather than in a sequence: ${[
                    ...needPhotos
                ].join(', ')}`,
                ErrorStatusCodeEnum._535
            );
        }
    }

    /**
     * Which of these topics carry a set-by-teacher step.
     *
     * The same rule as TopicService.topicsHaveSetByTeacherSteps, down to only counting steps on a
     * non-hidden activity, so the picker and the teacher-facing flag cannot disagree. Asked directly
     * of the topic repository rather than by injecting TopicService, which would pull a large service
     * graph in for one boolean.
     */
    private async findTopicIdsNeedingATeacherPhoto(topicIds: string[]): Promise<Set<string>> {
        if (!topicIds.length) return new Set();

        const rows = await this.topicRepository
            .createQueryBuilder('topic')
            .innerJoin('topic.activities', 'activity')
            .innerJoin('activity.steps', 'step')
            .where('topic.id IN (:...topicIds)', { topicIds })
            .andWhere('activity.isHidden = false')
            .andWhere('step.stepType = :stepType', { stepType: ActivityStepType.SET_BY_TEACHER })
            .select('topic.id', 'id')
            .getRawMany<{ id: string }>();

        // A topic with several such steps returns a row each, which the Set collapses, so the query
        // does not need to be distinct.
        return new Set(rows.map((row) => String(row.id)));
    }
}
