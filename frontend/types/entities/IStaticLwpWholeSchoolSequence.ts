import { WholeSchoolSequenceStatus } from 'lwp-shared';

import { IStaticLwpSubject } from './IStaticLwpSubject';
import { ISequencePeriod } from './IStaticLwpTopicSequence';
import { IStaticLwpYearGroup } from './IStaticLwpYearGroup';

/**
 * One year group's place in a whole-school sequence: the class sequence every class in that year
 * group receives. Holds no dates of its own; the sequence it points at carries them.
 */
export interface IWholeSchoolSequenceMember {
    id: string;
    sequence: { id: string; name: string };
    yearGroup: IStaticLwpYearGroup;
}

/**
 * A class sequence an admin may put against a year group, with the span it would give them.
 *
 * `startDate` and `endDate` are DateOnly, YYYY-MM-DD strings, and either may be null: a sequence
 * with no topics yet has neither, and a fixed sequence may leave its last topic's window open.
 */
export interface IWholeSchoolSequenceCandidate {
    id: string;
    name: string;
    yearGroupId: string;
    yearGroupName: string;
    startDate: string | null;
    endDate: string | null;
}

/**
 * A set of existing fixed topic sequences, at most one per year group, that an admin builds for one
 * subject and one academic year and every entitled school is then offered (LEA-6504).
 *
 * There is deliberately no name: subject plus academic year identifies it, and the list shows both
 * as their own columns. No school leader ever sees this object's label.
 *
 * The members join this shape in slice 2 (LEA-6695).
 */
export interface IStaticLwpWholeSchoolSequence {
    id: string;
    subject: IStaticLwpSubject;
    /** Never null, unlike a topic sequence's: every member is fixed, so this always has a year. */
    period: ISequencePeriod;
    status: WholeSchoolSequenceStatus;
    /**
     * One per year group at most, and absent from the list queries, which do not select it. A
     * partially covered whole-school sequence is valid, so this is often shorter than the year group
     * list the form renders.
     */
    members?: IWholeSchoolSequenceMember[] | null;
    logUpdatedAt: string;
}
