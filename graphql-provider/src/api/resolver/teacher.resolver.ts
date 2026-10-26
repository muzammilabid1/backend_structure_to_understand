import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { LeaderOnly } from 'src/auth/authorizers/LeaderOnly';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { UsersService } from 'src/auth/service/user.service';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import { Repository } from 'typeorm';

import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { LwpUser } from '../entities/user';
import { InviteTeacherInput, OperationStatus, TeacherInput, UpdateTeacherInput } from '../model';
import { LwpPupilFeedbackService } from '../service/lwp_pupil_feedback.service';
import { SchoolService } from '../service/school.service';
import { SchoolClassService } from '../service/school_class.service';
import { TeacherService } from './../service/teacher.service';

@Resolver(() => LwpUser)
export class TeacherResolver {
    constructor(
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        private teacherService: TeacherService,
        private schoolClassService: SchoolClassService,
        private schoolService: SchoolService,
        private userService: UsersService,
        private pupilFeedbackService: LwpPupilFeedbackService
    ) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpUser])
    async allTeacher(): Promise<LwpUser[]> {
        return await this.userRepository.find({ where: { type: UserType.TEACHER } });
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [LwpUser])
    async getSchoolTeachers(@Args('schoolId') schoolId: string): Promise<LwpUser[]> {
        return await this.userRepository.find({
            where: { type: UserType.TEACHER, school: { id: schoolId } },
            order: {
                lastname: 'ASC',
                firstname: 'ASC'
            }
        });
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpUser])
    async getSchoolTeachersForAdmin(@Args('schoolId') schoolId: string): Promise<LwpUser[]> {
        return await this.userRepository.find({
            where: { type: UserType.TEACHER, school: { id: schoolId } },
            order: {
                lastname: 'ASC',
                firstname: 'ASC'
            }
        });
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpUser, OpType.Read, 'id'])
    @Query(() => LwpUser)
    async teacher(@Args('id') id: string): Promise<LwpUser> {
        return await this.teacherService.getTeacher(id);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpUser, OpType.Read, 'id'])
    @Query(() => [LwpPupilFeedback])
    async getLikedActivityFeeds(@Args('id') id: string): Promise<LwpPupilFeedback[]> {
        return await this.pupilFeedbackService.getTeacherLikedActivityFeeds(id);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Write, 'input.schoolId'])
    @Mutation(() => LwpUser)
    async addTeacher(
        @Args({ name: 'input', type: () => TeacherInput }) input: TeacherInput,
        @AuthInfo('sub') userId: string
    ): Promise<LwpUser> {
        return await this.teacherService.addTeacher(input, userId);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpUser, OpType.Write, 'input.teacherId'])
    @Mutation(() => LwpUser)
    async inviteTeacher(
        @Args({ name: 'input', type: () => InviteTeacherInput }) input: InviteTeacherInput,
        @AuthInfo('sub') userId: string
    ): Promise<LwpUser> {
        return await this.teacherService.inviteTeacher(input, userId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpUser, OpType.Read, 'ids'], [LwpSchool, OpType.Read, 'schoolId'])
    @Mutation(() => Boolean)
    async inviteImportedTeachers(
        @Args({ name: 'ids', type: () => [String] }) ids: string[],
        @Args({ name: 'schoolId' }) schoolId: string,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        return await this.teacherService.inviteImportedTeachers(ids, schoolId, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async sendStaffInvites(
        @Args({ name: 'userIds', type: () => [String] }) userIds: string[],
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        return await this.teacherService.sendStaffInvites(userIds, userId);
    }

    @AuthorizeEndpoint([LwpUser, OpType.Write, 'input.id']) // assuming one teacher shouldn't be able to overwrite another?
    @Mutation(() => LwpUser)
    async updateTeacher(@Args({ name: 'input', type: () => UpdateTeacherInput }) input: UpdateTeacherInput): Promise<LwpUser> {
        return await this.teacherService.updateTeacher(input);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpUser, OpType.Write, 'id']) // assuming one teacher shouldn't be able to overwrite another?
    @Mutation(() => OperationStatus)
    async deleteTeacher(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        return await this.teacherService.deleteTeacher(id, userId);
    }

    @ResolveField(() => [LwpSchoolClass])
    async classes(@Parent() teacher: LwpUser): Promise<LwpSchoolClass[]> {
        return await this.schoolClassService.getTeacherClasses(teacher.id);
    }

    @ResolveField(() => [LwpSchoolClass])
    async mainClasses(@Parent() teacher: LwpUser): Promise<LwpSchoolClass[]> {
        return await this.schoolClassService.getTeacherMainClasses(teacher.id);
    }

    @ResolveField(() => [LwpPupilFeedback])
    async likedActivities(@Parent() teacher: LwpUser): Promise<LwpPupilFeedback[]> {
        return await this.pupilFeedbackService.getTeacherLikedActivityFeeds(teacher.id);
    }

    @ResolveField(() => LwpSchool)
    async school(@Parent() teacher: LwpUser): Promise<LwpSchool> {
        return await this.schoolService.getTeacherSchool(teacher.id);
    }
}
