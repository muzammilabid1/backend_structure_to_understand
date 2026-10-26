/**
 * The state of a sequence assigned to a class.
 *
 * ASSIGNED - the assignment is live and its class topics are scheduled.
 * REMOVED - the assignment was withdrawn. Its future, unreleased class topics
 * were deleted, but the row is kept so already released topics retain their provenance.
 */
export enum SequenceAssignmentStatus {
    ASSIGNED = 'ASSIGNED',
    REMOVED = 'REMOVED',
}
