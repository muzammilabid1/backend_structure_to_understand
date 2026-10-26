import { SubjectProgrammeType, WholeSchoolYearGroupSkipReason } from 'lwp-shared/enums';

/** One row of the leader's table: what a single year group in this school would receive. */
export interface IWholeSchoolSequencePreviewRow {
    yearGroupId: string;
    yearGroup: string;
    /** Absent when this year group has no member, which is the NO_SEQUENCE_FOR_YEAR_GROUP skip. */
    sequenceId?: string | null;
    sequenceName?: string | null;
    /** The **effective** span: the topics that will actually be created, past-dated ones excluded. */
    startDate?: string | null;
    endDate?: string | null;
    classCount: number;
    /*
     * activityCount and classesReceiving are deliberately absent. The server carries both on the row
     * and sums them into activitiesToCreate, classesCovered and classesSkipped, which is what the
     * page reads. Nothing here renders the per-row values, so nothing here asks for them.
     */
    /** Topics left out because their dates have passed. Topics, not activities, so not per class. */
    topicsSkipped: number;
    skipped: boolean;
    skipReason?: WholeSchoolYearGroupSkipReason | null;
}

/**
 * What this school was actually given, for a school that has already scheduled (LEA-6700).
 *
 * A record of what happened rather than a forecast of what would. It reuses the preview's row so the
 * leader reads one table in both states, and no row on it is ever skipped.
 */
export interface IWholeSchoolAssignmentRecord {
    assignmentId: string;
    scheduledOn: string;
    rows: IWholeSchoolSequencePreviewRow[];
    activitiesCreated: number;
    classesScheduled: number;
}

/**
 * What scheduling a published whole-school sequence would give this school (LEA-6697).
 *
 * `wholeSchoolSequenceId` is null when nothing is published for this subject and the school's
 * academic year, which is an ordinary outcome rather than a failure. The subject name and academic
 * year are still populated in that case, so the page can say what it found nothing for.
 */
export interface IWholeSchoolSequencePreview {
    wholeSchoolSequenceId?: string | null;
    subjectId: string;
    subjectName: string;
    academicYear: string;
    rows: IWholeSchoolSequencePreviewRow[];
    activitiesToCreate: number;
    /** The sum of the rows' own counts, so the callout and the table cannot disagree. */
    topicsSkipped: number;
    classesCovered: number;
    classesSkipped: number;
    /**
     * Set once this school has scheduled this subject for this year (LEA-6700).
     *
     * Checked **before** `activitiesToCreate` and before the rows, never beside them. A school that
     * has just scheduled holds every topic, so its activity count is zero and it would otherwise be
     * told there is nothing for it; and a teacher deleting one class's topics lifts that count back
     * above zero, which would otherwise offer the action to a school that has already run.
     */
    assignment?: IWholeSchoolAssignmentRecord | null;
}

/** The part of a school's record the Auto schedule tab's summary row is built from, and all its query fetches. */
export interface IWholeSchoolAssignmentSummary {
    rows: Pick<IWholeSchoolSequencePreviewRow, 'yearGroupId' | 'yearGroup' | 'startDate' | 'endDate'>[];
}

/** One programme on the Auto schedule tab of Set a topic (LEA-6687). */
export interface IWholeSchoolAutoScheduleProgramme {
    subjectId: string;
    subjectName: string;
    programmeType: SubjectProgrammeType;
    /** A whole-school sequence is published for this subject and the school's year. */
    isAvailable: boolean;
    /** Set once the school has scheduled it this year, when the tab shows a summary row instead of a banner. */
    assignment?: IWholeSchoolAssignmentSummary | null;
}
