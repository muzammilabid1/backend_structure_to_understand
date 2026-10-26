import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SubjectProgrammeType } from 'lwp-shared';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';

import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { OperationStatus, UpdateSubjectInput } from '../model';
import { StaticLwpSubjectService } from '../service/static_lwp_subject.service';

@Resolver(() => StaticLwpSubject)
export class StaticLwpSubjectResolver {
    constructor(private lwpSubjectService: StaticLwpSubjectService) {}

    @AuthorizeEndpoint(TeacherOnly)
    @Query(() => [StaticLwpSubject])
    async getSubjectsForAdmin(): Promise<StaticLwpSubject[]> {
        return this.lwpSubjectService.getSubjectsForAdmin();
    }

    @AuthorizeEndpoint(TeacherOnly)
    @Query(() => [StaticLwpSubject])
    async getAllSubjects(): Promise<StaticLwpSubject[]> {
        return this.lwpSubjectService.getAllSubjects();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpSubject)
    async addSubject(
        @Args('subjectName') subjectName: string,
        @Args('programmeType', { type: () => SubjectProgrammeType }) programmeType: SubjectProgrammeType,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpSubject> {
        return this.lwpSubjectService.addNewSubject(subjectName, programmeType, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpSubject)
    async updateSubject(
        @Args('input', { type: () => UpdateSubjectInput }) input: UpdateSubjectInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpSubject> {
        return this.lwpSubjectService.updateSubject(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async removeSubject(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        return this.lwpSubjectService.removeSubject(id, userId);
    }
}
