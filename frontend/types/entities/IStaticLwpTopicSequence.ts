import { SequenceTimingMode } from 'lwp-shared';

import { IStaticLwpSubject } from './IStaticLwpSubject';
import { IStaticLwpYearGroup } from './IStaticLwpYearGroup';

/**
 * The topic fields the sequence screens select. Deliberately narrow: the admin
 * sequence UI only ever needs to name a topic and group it under its domain,
 * so this is not an attempt to model the whole StaticLwpTopic.
 */
export interface ISequenceTopic {
    id: string;
    teacherTopicName: string;
    /** Only selected by the picker, which shows the most recently created topics first. */
    logCreatedAt?: string;
}

/**
 * A candidate topic group from getCandidateTopicsForSequence, already grouped by
 * domain and restricted to published, visible topics for one subject + year group.
 */
export interface ISequenceCandidateTopicGroup {
    domainId: string;
    domainTitle: string;
    topics: ISequenceTopic[];
}

/**
 * One topic's position in a sequence.
 *
 * Item ids change on every save, because the API replaces items rather than
 * diffing them. Render these from the latest read or mutation response and never
 * cache an id across a save.
 */
export interface IStaticLwpTopicSequenceItem {
    id: string;
    order: number;
    /** DateOnly, a YYYY-MM-DD string. */
    startDate: string;
    /**
     * DateOnly, a YYYY-MM-DD string, or null when the window is left open. Optional in FIXED mode,
     * as a manually scheduled topic's due date is. Always set in INTERVAL mode.
     */
    endDate: string | null;
    topic: ISequenceTopic;
}

/** The academic year fields the sequence screens select. Narrow, like {@link ISequenceTopic}. */
export interface ISequencePeriod {
    index: number;
    shortName: string;
}

export interface IStaticLwpTopicSequence {
    id: string;
    name: string;
    subject: IStaticLwpSubject;
    yearGroup: IStaticLwpYearGroup;
    /**
     * The academic year the sequence was built for. A sequence is only offered while a school is
     * teaching that year, and every topic date must fall inside it.
     */
    period: ISequencePeriod;
    timingMode: SequenceTimingMode;
    /**
     * The cadence, in days: how far apart the topics run. Set for INTERVAL, null for FIXED, whose
     * dates live on its items.
     *
     * A Learning with Parents decision rather than a school's, so it lives here on the template and
     * a teacher is not asked for it (LEA-6624). `describeTiming` reads it, and so does the assign
     * page when it seeds the class's dates.
     *
     * `defaultStartDate` used to sit beside this and was removed by LEA-6595: the anchor is the
     * class's to choose, so the sequence had nothing to say about it.
     */
    intervalDays: number | null;
    items?: IStaticLwpTopicSequenceItem[] | null;
    /** Virtual field, so the list needs no client-side counting. */
    itemCount: number;
    /**
     * Virtual field. True once the sequence has been assigned to a class, which locks its academic
     * year: the year then describes class topics that already exist. Counts removed assignments too,
     * because a removal keeps the released class topics.
     */
    hasAssignments: boolean;
    logUpdatedAt: string;
}
