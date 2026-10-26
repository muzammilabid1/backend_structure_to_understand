import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { LeaderOnly } from 'src/auth/authorizers/LeaderOnly';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';

import { WholeSchoolAssignmentResult } from '../dtos/WholeSchoolAssignmentResult';
import { WholeSchoolAutoScheduleProgramme } from '../dtos/WholeSchoolAutoScheduleProgramme';
import { WholeSchoolSequencePreview } from '../dtos/WholeSchoolSequencePreview';
import { LwpSchool } from '../entities/school';
import { OperationStatus } from '../model';
import { WholeSchoolAutoScheduleService } from '../service/whole_school_auto_schedule.service';

/**
 * The leader-facing half of whole-school auto-scheduling (LEA-6504): a school leader looking at what
 * a published whole-school sequence would give their school, and from slice 5 giving it to them.
 *
 * **Separate from `WholeSchoolSequenceResolver`, which is admin only.** Building whole-school
 * sequences and being offered one are two different surfaces with two different audiences, and
 * keeping them apart means neither resolver has a class comment that has stopped being true.
 */
@Resolver(() => WholeSchoolSequencePreview)
export class WholeSchoolAutoScheduleResolver {
    constructor(private wholeSchoolAutoScheduleService: WholeSchoolAutoScheduleService) {}

    /**
     * The programmes on the Auto schedule tab of Set a topic (LEA-6687), with what the school has
     * already scheduled. Leaders only, on the same reasoning and the same anchor as the preview below.
     */
    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [WholeSchoolAutoScheduleProgramme])
    async wholeSchoolAutoScheduleProgrammes(@Args('schoolId') schoolId: string): Promise<WholeSchoolAutoScheduleProgramme[]> {
        return this.wholeSchoolAutoScheduleService.getWholeSchoolAutoScheduleProgrammes(schoolId);
    }

    /**
     * The programmes the school overview prompts this school to schedule (LEA-6688). Leaders only,
     * like the tab above, so a teacher cannot ask even by calling the API directly.
     */
    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [WholeSchoolAutoScheduleProgramme])
    async wholeSchoolAutoSchedulePrompts(@Args('schoolId') schoolId: string): Promise<WholeSchoolAutoScheduleProgramme[]> {
        return this.wholeSchoolAutoScheduleService.getWholeSchoolAutoSchedulePrompts(schoolId);
    }

    /**
     * Records that the caller has seen the Money Skills welcome modal (LEA-6505). Always the caller, taken
     * from their own token, so nobody can mark it for someone else. Leaders only, on the same anchor as the
     * rest of this resolver.
     *
     * **An admin records nothing.** An admin viewing a school sees the leader's pages, but the modal is a
     * welcome to the leader themselves; the overview never shows it to an admin, and this backs that up.
     */
    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Mutation(() => Boolean)
    async markMoneySkillsWelcomeSeen(
        @Args('schoolId') _schoolId: string,
        @AuthInfo('sub') userId: string,
        @AuthInfo('userType') userType: UserType
    ): Promise<boolean> {
        if (userType === UserType.ADMIN) return false;

        return this.wholeSchoolAutoScheduleService.markMoneySkillsWelcomeSeen(userId);
    }

    /**
     * What this school would be given, computed and never written.
     *
     * **Leaders only.** The class-level flow lets a teacher auto-schedule their own class, but this
     * one spans every class in the school and slice 5's action commits all of them at once, so there
     * is no narrower view to offer a teacher. That is the standing assumption recorded as U1 on the
     * plan; if the team widens it, the authorizer is the one place it changes.
     *
     * Authorized on the **school** named in the arguments, which is the same anchor every other
     * school-wide list in this codebase uses, and the only one available here: a whole-school sequence
     * belongs to no school and so cannot be authorized against. That is also why this takes a subject
     * rather than a sequence id. See the service for the argument.
     */
    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => WholeSchoolSequencePreview)
    async previewWholeSchoolSequence(
        @Args('schoolId') schoolId: string,
        @Args('subjectId') subjectId: string
    ): Promise<WholeSchoolSequencePreview> {
        return this.wholeSchoolAutoScheduleService.previewWholeSchoolSequence(schoolId, subjectId);
    }

    /**
     * Schedules every eligible class in the school, in one transaction (LEA-6698).
     *
     * **Authorized for writing on the school**, not merely reading it, which is the difference between
     * this and the preview above. `LwpSchool`'s own authorizer already says a teacher may read their
     * school but only a school leader may write to it, so `OpType.Write` is what makes this
     * leaders-only at the object level as well as at the endpoint.
     *
     * Takes the whole-school sequence id rather than a subject, unlike the preview. The leader is
     * committing to the exact thing they were shown, so the id is the point. The service re-checks
     * everything the preview's resolution made unreachable, because an id from a caller proves
     * nothing on its own.
     */
    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Write, 'schoolId'])
    @Mutation(() => WholeSchoolAssignmentResult)
    async assignWholeSchoolSequence(
        @Args('schoolId') schoolId: string,
        @Args('wholeSchoolSequenceId') wholeSchoolSequenceId: string,
        @AuthInfo('sub') userId: string
    ): Promise<WholeSchoolAssignmentResult> {
        return this.wholeSchoolAutoScheduleService.assignWholeSchoolSequence(schoolId, wholeSchoolSequenceId, userId);
    }

    /**
     * Withdraws a school's whole-school schedule, and frees that year to be scheduled again
     * (LEA-6700).
     *
     * **Takes the school as well as the assignment**, unlike the signature on the ticket. The
     * authorizer anchors on `schoolId`, so an assignment id on its own would let a leader of one
     * school pair their own school with another school's assignment id and withdraw it. The service
     * checks the pair rather than trusting it.
     *
     * Written on the school for the same reason the assign mutation is: `LwpSchool`'s own authorizer
     * is what makes writing leaders-only at the object level, beyond the endpoint's own gate.
     */
    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Write, 'schoolId'])
    @Mutation(() => OperationStatus)
    async removeWholeSchoolSequenceAssignment(
        @Args('schoolId') schoolId: string,
        @Args('assignmentId') assignmentId: string,
        @AuthInfo('sub') userId: string
    ): Promise<OperationStatus> {
        return this.wholeSchoolAutoScheduleService.removeWholeSchoolSequenceAssignment(schoolId, assignmentId, userId);
    }
}
