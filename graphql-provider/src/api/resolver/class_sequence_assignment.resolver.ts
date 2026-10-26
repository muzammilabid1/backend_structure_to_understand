import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SubjectProgrammeType } from 'lwp-shared/enums';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';

import { AssignSequenceToClassInput } from '../dtos/AssignSequenceToClassInput';
import { AutoSchedulableClassOutput } from '../dtos/AutoSchedulableClass';
import { SequenceAssignmentPlan } from '../dtos/SequenceAssignmentPlan';
import { LwpClassSequenceAssignment } from '../entities/class_sequence_assignment';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpTopicSequence } from '../entities/static_topic_sequence';
import { OperationStatus } from '../model';
import { ClassSequenceAssignmentService } from '../service/class_sequence_assignment.service';

/**
 * Assigning a sequence to a class. Leaders and teachers with write access to the class may assign,
 * which the entity authorizer enforces by delegating to LwpSchoolClass, the same route
 * addClassTopic takes.
 */
@Resolver(() => LwpClassSequenceAssignment)
export class ClassSequenceAssignmentResolver {
    constructor(private classSequenceAssignmentService: ClassSequenceAssignmentService) {}

    /**
     * Only sequences the class is entitled to and whose year group matches.
     *
     * `programmeType` is optional and narrows that answer to one programme, for the Money Skills page
     * reached from class activation. It is intersected with the entitlement rather than replacing it,
     * so it can only ever return fewer sequences than omitting it.
     */
    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'])
    @Query(() => [StaticLwpTopicSequence])
    async getAssignableSequencesForClass(
        @Args('classId') classId: string,
        @Args('programmeType', { type: () => SubjectProgrammeType, nullable: true }) programmeType?: SubjectProgrammeType
    ): Promise<StaticLwpTopicSequence[]> {
        return this.classSequenceAssignmentService.getAssignableSequencesForClass(classId, programmeType);
    }

    /**
     * The classes this user may auto-schedule onto, for the picker the Topic library page opens.
     *
     * Scoped from the token rather than from an argument: a teacher gets the classes they are attached
     * to, a school leader or admin gets every eligible class in the school. That is a correctness rule
     * and not a convenience, because a teacher may read any class in their school but may only write
     * to their own, so a wider list would preview and then fail on assign.
     *
     * Authorized on the school rather than on a class, as the other school-wide class lists are, since
     * the answer spans classes rather than concerning one.
     */
    @AuthorizeEndpoint(TeacherOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [AutoSchedulableClassOutput])
    async getAutoSchedulableClassesForSchool(
        @Args('schoolId') schoolId: string,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<AutoSchedulableClassOutput[]> {
        const isSchoolLeaderOrAdmin = authInfo?.isSchoolLeader || authInfo?.userType === UserType.ADMIN;

        return this.classSequenceAssignmentService.getAutoSchedulableClassesForSchool(schoolId, authInfo?.sub, isSchoolLeaderOrAdmin);
    }

    /** The dates the class would get, computed without persisting anything. */
    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'input.classId'])
    @Query(() => SequenceAssignmentPlan)
    async previewSequenceForClass(
        @Args({ name: 'input', type: () => AssignSequenceToClassInput }) input: AssignSequenceToClassInput
    ): Promise<SequenceAssignmentPlan> {
        return this.classSequenceAssignmentService.previewSequenceForClass(input);
    }

    @AuthorizeEndpoint([LwpClassSequenceAssignment, OpType.Write, null, { parentId: 'input.classId' }])
    @Mutation(() => SequenceAssignmentPlan)
    async assignSequenceToClass(
        @Args({ name: 'input', type: () => AssignSequenceToClassInput }) input: AssignSequenceToClassInput,
        @AuthInfo('sub') userId: string
    ): Promise<SequenceAssignmentPlan> {
        return this.classSequenceAssignmentService.assignSequenceToClass(input, userId);
    }

    /** Removes the assignment's unreleased topics. Released ones are kept. */
    @AuthorizeEndpoint([LwpClassSequenceAssignment, OpType.Write, 'assignmentId'])
    @Mutation(() => OperationStatus)
    async removeSequenceAssignment(@Args('assignmentId') assignmentId: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        return this.classSequenceAssignmentService.removeAssignment(assignmentId, userId);
    }
}
