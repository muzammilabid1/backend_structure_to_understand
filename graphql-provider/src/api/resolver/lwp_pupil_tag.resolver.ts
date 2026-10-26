import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { OpType } from 'src/auth/types/OpType';

import { LwpPupilTag } from '../entities/lwp_pupil_tag';
import { LwpPupil } from '../entities/pupil';
import { LwpSchool } from '../entities/school';
import { AddPupilTagsInPupilInput, CreateLwpSchoolPupilTagInput, OperationStatus, UpdateLwpSchoolPupilTagInput } from '../model';
import { LwpPupilTagService } from '../service/lwp_pupil_tag.service';
import { PupilService } from '../service/pupil.service';

@Resolver(() => LwpPupilTag)
export class LwpPupilTagResolver {
    constructor(
        private lwpSchoolPupilTagService: LwpPupilTagService,
        private pupilService: PupilService
    ) {}

    @AuthorizeEndpoint(
        TeacherOnly,
        [LwpSchool, OpType.Read, 'input.schoolId'],
        [LwpPupil, OpType.Write, 'input.pupilIds', { optional: true }]
    )
    @Mutation(() => LwpPupilTag)
    async createPupilTag(
        @Args({ name: 'input', type: () => CreateLwpSchoolPupilTagInput }) input: CreateLwpSchoolPupilTagInput,
        @AuthInfo('sub') userId: string
    ): Promise<LwpPupilTag> {
        return await this.lwpSchoolPupilTagService.createPupilTag(input, userId, input?.schoolId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupilTag, OpType.Write, 'input.id'], [LwpPupil, OpType.Write, 'input.pupilIds', { optional: true }])
    @Mutation(() => LwpPupilTag)
    async updatePupilTag(
        @Args({ name: 'input', type: () => UpdateLwpSchoolPupilTagInput }) input: UpdateLwpSchoolPupilTagInput,
        @AuthInfo('sub') userId: string
    ): Promise<LwpPupilTag> {
        return await this.lwpSchoolPupilTagService.updatePupilTag(input, userId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [LwpPupilTag])
    async getAllSchoolPupilTags(@Args('schoolId') schoolId: string): Promise<LwpPupilTag[]> {
        return await this.lwpSchoolPupilTagService.getAllSchoolPupilTags(schoolId);
    }

    @AuthorizeEndpoint(
        TeacherOnly,
        [LwpPupilTag, OpType.Write, 'input.tagIds', { optional: true }],
        [LwpSchool, OpType.Read, 'input.schoolId'],
        [LwpPupil, OpType.Write, 'input.pupilIds']
    )
    @Mutation(() => Boolean)
    async addPupilTagsInPupils(
        @Args({ name: 'input', type: () => AddPupilTagsInPupilInput }) input: AddPupilTagsInPupilInput,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        return await this.lwpSchoolPupilTagService.addPupilTagsInPupils(input, userId);
    }

    @AuthorizeEndpoint(
        TeacherOnly,
        [LwpPupilTag, OpType.Write, 'input.tagIds', { optional: true }],
        [LwpSchool, OpType.Read, 'input.schoolId'],
        [LwpPupil, OpType.Write, 'input.pupilIds']
    )
    @Mutation(() => Boolean)
    async updatePupilTagsInPupils(
        @Args({ name: 'input', type: () => AddPupilTagsInPupilInput }) input: AddPupilTagsInPupilInput,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        return await this.lwpSchoolPupilTagService.updatePupilTagsInPupils(input, userId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupilTag, OpType.Write, 'id'])
    @Mutation(() => OperationStatus)
    async removeSchoolPupilTag(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        return await this.lwpSchoolPupilTagService.removeSchoolPupilTag(id, userId);
    }

    @AuthorizeEndpoint(TeacherOnly)
    @ResolveField()
    async pupilCounts(@Parent() tag: LwpPupilTag): Promise<number> {
        return await this.pupilService.getPupilsCountByTagId(tag.id);
    }
}
