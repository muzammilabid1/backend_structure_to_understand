/**
 * Why a topic in a sequence was not scheduled for a class.
 *
 * A skip never fails the whole assignment: the remaining topics are still created.
 *
 * ALREADY_SCHEDULED - the class already has a class topic for that topic, so a duplicate
 * would be created.
 * CONTENT_UNAVAILABLE - the topic is unpublished or hidden, so it should not reach pupils.
 * DATE_IN_PAST - the topic's release date has already passed, so creating it would schedule
 * something in the past. Only ever set on the whole-school path (LEA-6699): at class level the
 * same condition still throws, because a teacher can edit the dates or drop the row and a leader
 * cannot, nothing on the whole-school page being editable.
 */
export enum SequenceItemSkipReason {
    ALREADY_SCHEDULED = 'ALREADY_SCHEDULED',
    CONTENT_UNAVAILABLE = 'CONTENT_UNAVAILABLE',
    DATE_IN_PAST = 'DATE_IN_PAST',
}
