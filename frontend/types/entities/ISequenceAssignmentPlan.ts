import { SequenceItemSkipReason } from 'lwp-shared';

import { ISequenceTopic } from './IStaticLwpTopicSequence';

/**
 * One topic's computed dates for a class, and whether it will actually be scheduled.
 *
 * Mirrors SequenceAssignmentPlanItem in the graphql-provider. Preview and assign return the
 * same shape deliberately, so the leader confirms exactly the plan they were shown.
 */
export interface ISequenceAssignmentPlanItem {
    topic: ISequenceTopic;
    order: number;
    /**
     * DateOnly, a YYYY-MM-DD string, or null when the topic is not being scheduled at all.
     *
     * Null today means the teacher dropped it. A row that will not reach the class has no window to
     * show, and on an interval sequence the slot it used to hold no longer exists: the server closes
     * the gap underneath it, so the dates the row once had are nobody's.
     */
    releaseDate: string | null;
    /**
     * DateOnly, or null when the sequence item has no end date. A fixed sequence may leave the
     * window open, exactly as a manually scheduled topic may have no due date, so this must
     * never be assumed to be present.
     */
    dueDate: string | null;
    skipped: boolean;
    skipReason: SequenceItemSkipReason | null;
    /**
     * The class already has this topic from someone scheduling it by hand, so auto-scheduling adds a
     * second one on these dates. A warning, not a skip: the row stays schedulable and editable.
     *
     * Never true at the same time as `skipped`. A topic a previous auto-schedule created is skipped
     * instead, so re-running the same set does not silently double everything.
     */
    alreadyScheduled: boolean;
    /**
     * The teacher chose not to give this class this topic (LEA-6596).
     *
     * Kept apart from `skipped`, which is the server's decision rather than the teacher's. Both mean
     * the topic is not created, but a skip is something that happened to the plan and an exclusion is
     * something the teacher did to it and can undo, so they read differently on the row.
     *
     * Absent on the template fallback rows, which are built in the browser and have no plan behind
     * them, so the form tracks its own list rather than reading exclusions off here.
     */
    excluded?: boolean;
}

export interface ISequenceAssignmentPlan {
    /** The INTERVAL anchor the dates were computed from. Null for a fixed sequence. */
    startDate: string | null;
    items: ISequenceAssignmentPlanItem[];
    scheduledCount: number;
    /** Topics the server withheld: already scheduled by an earlier run, or unavailable. */
    skippedCount: number;
    /** Topics the teacher dropped. Counted apart from skips, since the two read differently. */
    excludedCount: number;
    /** Null until the sequence has actually been assigned. */
    assignment: { id: string } | null;
}

/** A leader's adjustment to one topic's dates for their class, before confirming. */
export interface ISequenceDateOverride {
    /** YYYY-MM-DD. Required: a class topic always has a release date. */
    releaseDate: string;
    /** YYYY-MM-DD, or '' to leave the window open. */
    dueDate: string;
}

/** Overrides being edited, keyed by topic id. Only topics the leader has touched appear. */
export type SequenceDateOverrides = Record<string, ISequenceDateOverride>;
