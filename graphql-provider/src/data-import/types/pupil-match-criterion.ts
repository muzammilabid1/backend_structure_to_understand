/**
 * The pieces of evidence a pupil link can be built on, as bits of the link's "matchCriteria"
 * mask. Recorded so that two high-confidence candidates for the same pupil can be compared: one
 * whose evidence covers everything a rival's does and more is the better match, and the review can
 * take it without asking a leader. Only positive evidence belongs here - the absence of something
 * to compare (a temporary UPN, a MIS that holds no contact details) must never make a candidate
 * look stronger than the rival it is being weighed against.
 *
 * The values are persisted, so they are append-only: give a new criterion the next free bit rather
 * than renumbering the existing ones.
 */
export enum PupilMatchCriterion {
    MIS_ID = 1 << 0,
    UPN = 1 << 1,
    FIRST_NAME = 1 << 2,
    LAST_NAME = 1 << 3,
    DATE_OF_BIRTH = 1 << 4,
    PARENT_CONTACT = 1 << 5
}
