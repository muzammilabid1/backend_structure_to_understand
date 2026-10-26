/**
 * Where activating a class sends the leader.
 *
 * Lives with the rest of the auto-schedule feature rather than with the activate page, because it is
 * a fact about auto-scheduling, and because keeping it free of React and of the GraphQL layer is what
 * lets it be unit tested directly.
 *
 * Deliberately not a rule about which classes can be auto-scheduled. That question belongs to the
 * API, which answers it as `canAutoScheduleMoneySkills`, and mirroring it here is what the predicate
 * this replaces was deleted for. This takes that answer as an input and only decides a route.
 */

export interface ActivationDestinationInput {
    classId: string;
    schoolId: string;
    /**
     * Whether the activating user leads the school, which the Money Skills page requires.
     *
     * A teacher does not normally reach the activate page at all, and not because anything stops
     * them: the activate page is a teacher page and TeacherClassWrapper's "activate now" link is
     * gated on the class being inactive and nothing else. It is that a class awaiting activation
     * usually has no teachers to see it, since imported classes are created without any and a class
     * created by a leader is active from the start. The exception is an admin-created future class,
     * which is inactive and teacher-assigned at once, so the link is genuinely reachable there.
     *
     * That exception cannot reach the Money Skills page either way: it sits in a future academic year,
     * and canAutoScheduleMoneySkills requires the school's current one. So this check changes no
     * destination that is reachable today, and is kept because both of the reasons for that are
     * incidental. A class assigned its teachers before activation, or a relaxation of the academic
     * year rule, would each make it load-bearing, and the failure it prevents is silent: the page
     * would answer Unauthorized rather than anything a leader would think to look for.
     */
    isSchoolLeader?: boolean | null;
    /**
     * Whether to offer this class Money Skills. The API's `canAutoScheduleMoneySkills` when it answered,
     * asked after the write so it reflects what the class was just given, and `true` when that request
     * failed: not knowing should send the leader to a page that can report the failure rather than
     * silently cost them the step. Named for the decision rather than for the field, since in that last
     * case there is no fact to report.
     */
    shouldOfferMoneySkills?: boolean | null;
}

/**
 * The Money Skills page when the class can be offered it and the user is the one it is for, and the
 * school overview otherwise, which is where activation went before that page existed.
 *
 * Both conditions are required, and each is worth a test: dropping the first ships a dead end for
 * teachers, and dropping the second walks a leader into a page that can only say there is nothing
 * available for their class.
 */
export const activationDestination = ({ classId, schoolId, isSchoolLeader, shouldOfferMoneySkills }: ActivationDestinationInput): string =>
    isSchoolLeader && shouldOfferMoneySkills ? `/class/${classId}/money-skills-auto-schedule` : `/school/${schoolId}`;
