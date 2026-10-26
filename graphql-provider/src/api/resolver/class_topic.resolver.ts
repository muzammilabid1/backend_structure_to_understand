import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { Weekday } from 'src/api/types/weekday';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import { BaseEntity } from 'typeorm';

import { ClassTopicForClassDetailPageOutput } from '../dtos/ClassTopicForClassDetailPageOutput';
import { ReadingTopicOutput } from '../dtos/ReadingTopicOutput';
import { LwpClassTopic } from '../entities/class_topic';
import { LwpPupilTopic } from '../entities/pupil_topic';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpTopic } from '../entities/static_topic';
import {
    AddTopicToClassesInput,
    ClassTopicDeleteOptions,
    ClassTopicInput,
    ClassTopicStatistics,
    OperationStatus,
    ReadingNoteInput,
    UpdateClassTopicInput
} from '../model';
import { PupilTopicService } from '../service/pupil_topic.service';
import { SchoolClassService } from '../service/school_class.service';
import { ClassTopicService } from './../service/class_topic.service';
import { TopicService } from './../service/topic.service';
@Resolver(() => LwpClassTopic)
export class ClassTopicResolver {
    constructor(
        private classTopicService: ClassTopicService,
        private pupilTopicService: PupilTopicService,
        private topicService: TopicService,
        private schoolClassService: SchoolClassService
    ) {}

    @AuthorizeEndpoint([LwpClassTopic, OpType.Write, null, { parentId: 'input.classId' }])
    @Mutation(() => LwpClassTopic)
    async addClassTopic(
        @Args({ name: 'input', type: () => ClassTopicInput }) input: ClassTopicInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[],
        @AuthInfo('sub') userId: string
    ): Promise<LwpClassTopic> {
        return await this.classTopicService.addClassTopic({ ...input, createdBy: userId }, file);
    }

    @AuthorizeEndpoint([LwpClassTopic, OpType.Write, null, { parentId: 'input.classId' }])
    @Mutation(() => String)
    async addTopicToClasses(
        @Args({ name: 'input', type: () => AddTopicToClassesInput }) input: AddTopicToClassesInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[],
        @AuthInfo('sub') userId: string
    ): Promise<string> {
        await this.classTopicService.addTopicToClasses(input, file, userId);

        return 'Topic successfully added.';
    }

    @AuthorizeEndpoint([LwpSchoolClass, OpType.Read, 'classId'])
    @Query(() => [LwpClassTopic])
    async getClassTopics(@Args('classId') classId: string): Promise<Omit<LwpClassTopic, keyof BaseEntity>[]> {
        return await this.classTopicService.getClassTopics(classId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpClassTopic])
    async getClassTopicsForAdmin(@Args('classId') classId: string): Promise<LwpClassTopic[]> {
        return await this.classTopicService.getClassTopicsForAdmin(classId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpPupilTopic])
    async getPupilTopicsForPupilTopicsOverview(@Args('id') id: string): Promise<LwpPupilTopic[]> {
        return await this.pupilTopicService.getPupilTopicsForPupilTopicsOverview(id);
    }

    @AuthorizeEndpoint([LwpClassTopic, OpType.Write, 'id'])
    @Mutation(() => OperationStatus)
    async deleteClassTopic(
        @Args('id') id: string,
        @Args({ name: 'option', type: () => ClassTopicDeleteOptions, nullable: true }) option: ClassTopicDeleteOptions,
        @AuthInfo('sub') userId: string,
        @AuthInfo('userType') userType: UserType
    ): Promise<OperationStatus> {
        return await this.classTopicService.deleteClassTopic(id, option, userId, userType);
    }

    /**
     * Bulk removal from the class schedule page. Authorised per id, the way `removePupilsFromClass`
     * authorises on `pupilIds`, so a selection reaching into a class the user cannot write to is
     * refused before the service sees it.
     */
    @AuthorizeEndpoint([LwpClassTopic, OpType.Write, 'ids'])
    @Mutation(() => OperationStatus)
    async deleteClassTopics(
        @Args({ name: 'ids', type: () => [String] }) ids: string[],
        @AuthInfo('sub') userId: string
    ): Promise<OperationStatus> {
        return await this.classTopicService.deleteClassTopics(ids, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async adminTeacherTopicsToBeReleasedTomorrow(): Promise<boolean> {
        return await this.classTopicService.teacherTopicsToBeReleasedTomorrow();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async adminTeacherTopicsToBeReleasedNextWeek(): Promise<boolean> {
        return await this.classTopicService.teacherTopicsToBeReleasedNextWeek();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async adminTeacherMoneySkillsFirstTopicScheduled(): Promise<boolean> {
        return await this.classTopicService.teacherMoneySkillsFirstTopicScheduled();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async adminCreateReadingTopics(): Promise<boolean> {
        await this.classTopicService.createReadingTopics();

        return true;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async adminCreateThisWeekReadingTopic(@Args('classId') classId: string): Promise<boolean> {
        await this.classTopicService.adminCreateThisWeekReadingTopic(classId);

        return true;
    }

    @AuthorizeEndpoint([LwpSchoolClass, OpType.Write, 'classId'])
    @Mutation(() => Boolean)
    async updateClassReadingWeekStartDay(
        @Args('classId') classId: string,
        @Args('newReadingStartDay') newReadingStartDay: Weekday
    ): Promise<boolean> {
        await this.classTopicService.updateClassReadingWeekStartDay([classId], newReadingStartDay);

        return true;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async sendTeacherReadingTopicEnd(): Promise<boolean> {
        return await this.classTopicService.sendTeacherReadingTopicEnd();
    }

    @AuthorizeEndpoint([LwpClassTopic, OpType.Read, 'id'])
    @Query(() => LwpClassTopic)
    async getClassTopic(@Args('id') id: string): Promise<LwpClassTopic> {
        return await this.classTopicService.getClassTopic(id);
    }

    @AuthorizeEndpoint([LwpClassTopic, OpType.Read, 'id'])
    @Query(() => ReadingTopicOutput)
    async getReadingTopic(@Args('id') id: string): Promise<ReadingTopicOutput> {
        return await this.classTopicService.getReadingTopic(id);
    }

    @AuthorizeEndpoint([LwpClassTopic, OpType.Write, 'input.id'])
    @Mutation(() => LwpClassTopic)
    async updateClassTopic(
        @Args({ name: 'input', type: () => UpdateClassTopicInput }) input: UpdateClassTopicInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[],
        @AuthInfo('sub') userId: string
    ): Promise<LwpClassTopic> {
        return await this.classTopicService.updateClassTopic(input, file, userId);
    }

    @AuthorizeEndpoint([LwpClassTopic, OpType.Write, 'input.classTopicId'])
    @Mutation(() => LwpClassTopic)
    async saveReadingNote(@Args({ name: 'input', type: () => ReadingNoteInput }) input: ReadingNoteInput): Promise<LwpClassTopic> {
        return await this.classTopicService.saveReadingNote(input);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'], [LwpClassTopic, OpType.Read, 'topicId', { optional: true }])
    @Query(() => ClassTopicForClassDetailPageOutput, { nullable: true })
    async getClassTopicForWeekByWeek(
        @Args('classId') classId: string,
        @Args({ name: 'topicId', nullable: true }) topicId: string
    ): Promise<ClassTopicForClassDetailPageOutput> {
        return this.classTopicService.getClassTopicForWeekByWeek(classId, topicId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'], [LwpClassTopic, OpType.Read, 'topicId', { optional: true }])
    @Query(() => ClassTopicForClassDetailPageOutput, { nullable: true })
    async getClassReadingTopicForWeekByWeek(
        @Args('classId') classId: string,
        @Args({ name: 'topicId', nullable: true }) topicId: string
    ): Promise<ClassTopicForClassDetailPageOutput> {
        return this.classTopicService.getClassReadingTopicForWeekByWeek(classId, topicId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'], [LwpClassTopic, OpType.Read, 'topicId', { optional: true }])
    @Query(() => ClassTopicForClassDetailPageOutput, { nullable: true })
    async getGroupAcrossClassesReadingTopicForWeekByWeek(
        @Args('classId') classId: string,
        @Args({ name: 'topicId', nullable: true }) topicId: string
    ): Promise<ClassTopicForClassDetailPageOutput> {
        return this.classTopicService.getGroupAcrossClassesReadingTopicForWeekByWeek(classId, topicId);
    }

    @ResolveField(() => StaticLwpTopic)
    async topic(@Parent() classTopic: LwpClassTopic): Promise<StaticLwpTopic> {
        return await this.topicService.getTopicByClassTopic(classTopic.id);
    }

    @ResolveField(() => [LwpPupilTopic])
    async pupilTopics(@Parent() classTopic: LwpClassTopic): Promise<LwpPupilTopic[]> {
        return await this.pupilTopicService.getPupilTopicsByClassTopic(classTopic.id);
    }

    @ResolveField(() => LwpSchoolClass)
    async class(@Parent() classTopic: LwpClassTopic): Promise<LwpSchoolClass> {
        return await this.schoolClassService.getClassByClassTopic(classTopic.id);
    }

    @ResolveField(() => ClassTopicStatistics)
    async statistics(@Parent() classTopic: LwpClassTopic): Promise<ClassTopicStatistics> {
        return await this.classTopicService.getClassTopicStatistics(classTopic.id);
    }
}
