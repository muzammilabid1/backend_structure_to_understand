/**
 * Why a year group receives nothing when a school schedules a whole-school sequence.
 *
 * A skip never fails the run: every other year group is still scheduled. That is the whole-school
 * rule and it is deliberately unlike the class-level flow, where a problem blocks. A teacher on one
 * class can fix what is wrong; a leader looking at every year group in their school cannot, because
 * nothing on that page is editable, so a skip has to be reported rather than refused.
 *
 * Kept apart from {@link SequenceItemSkipReason}, which is about one topic inside one class's plan.
 * This one is about a whole row of the leader's table.
 *
 * NO_SEQUENCE_FOR_YEAR_GROUP - the whole-school sequence has no member for this year group, because
 * the content for it was not ready when the admin published. The school has classes in it and they
 * will be given nothing.
 * NO_ELIGIBLE_CLASSES - there is a member, but this school has no class that can receive it: either
 * no class in that year group, or none that meets the auto-scheduling conditions.
 * ALL_TOPICS_IN_PAST - there is a member and this school has classes for it, but every one of its
 * topics is dated in the past, so there is nothing left to create. Unlike the two above, this row
 * has classes, and they count towards the school's skipped classes.
 * NO_AVAILABLE_TOPICS - every topic the member holds is unpublished or hidden, so none of them may
 * reach pupils. Nobody at the school can act on it; it is the content team's to fix.
 * ALREADY_HAS_THESE_TOPICS - every class in the year group already holds every topic it would be
 * given, so scheduling would duplicate work the school has already had.
 */
export enum WholeSchoolYearGroupSkipReason {
    NO_SEQUENCE_FOR_YEAR_GROUP = 'NO_SEQUENCE_FOR_YEAR_GROUP',
    NO_ELIGIBLE_CLASSES = 'NO_ELIGIBLE_CLASSES',
    ALL_TOPICS_IN_PAST = 'ALL_TOPICS_IN_PAST',
    NO_AVAILABLE_TOPICS = 'NO_AVAILABLE_TOPICS',
    ALREADY_HAS_THESE_TOPICS = 'ALREADY_HAS_THESE_TOPICS',
}
