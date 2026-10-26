import { HttpException } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { Loader } from 'nestjs-dataloader';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { LeaderOnly } from 'src/auth/authorizers/LeaderOnly';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import { BaseEntity, Repository } from 'typeorm';

import { AcademicYearInfo } from '../dtos/AcademicYearInfo';
import { ClassPupilsForClassPupilsPageOutput } from '../dtos/ClassPupilsForClassPupilsPageOutput';
import { SchoolClassForFeedbackFilterOutput } from '../dtos/SchoolClassForFeedbackFilterOutput';
import { LwpClassTopic } from '../entities/class_topic';
import { ImportedSchoolClass } from '../entities/imported_school_class';
import { ImportedStudent } from '../entities/imported_student';
import { LwpPupil } from '../entities/pupil';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { StaticLwpPeriod } from '../entities/static_period';
import { StaticLwpTopicDomain } from '../entities/topic_domain';
import { LwpUser } from '../entities/user';
import { MoneySkillsAutoScheduleByClassIdLoader } from '../loader/money_skills_auto_schedule_by_class.loader';
import {
    AddPupilsInClassInput,
    ClassPupilsForRegisterTableOutput,
    ClassTopicContextOutput,
    CreateGroupAcrossClassesInput,
    ErrorStatusCodeEnum,
    GroupWithinSchoolClassInput,
    LinkClassInput,
    OperationStatus,
    PupilStatus,
    ReadingTopicExistOuput,
    ScheduleClassesGroupsOutput,
    SchoolClassAndGroupsOutput,
    SchoolClassInput,
    SchoolClassStatistics,
    UpdateGroupWithinSchoolClassInput,
    UpdateSchoolClassInput
} from '../model';
import { ClassTopicService } from '../service/class_topic.service';
import { PupilService } from '../service/pupil.service';
import { SchoolService } from '../service/school.service';
import { SchoolClassService } from '../service/school_class.service';
import { StaticLwpPeriodService } from '../service/static_period.service';
import { TeacherService } from '../service/teacher.service';

@Resolver(() => LwpSchoolClass)
export class SchoolClassResolver {
    constructor(
        private schoolClassService: SchoolClassService,
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        private pupilService: PupilService,
        private classTopicService: ClassTopicService,
        private teacherService: TeacherService,
        private schoolService: SchoolService,
        private staticLwpPeriodSerivce: StaticLwpPeriodService
    ) {}

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [LwpSchoolClass])
    async getSchoolClasses(@Args('schoolId') schoolId: string): Promise<LwpSchoolClass[]> {
        return await this.schoolClassService.getSchoolClasses(schoolId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [SchoolClassAndGroupsOutput])
    async getSchoolClassesAndGroups(
        @Args('schoolId') schoolId: string,
        @Args('myClasses') myClasses: boolean,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<SchoolClassAndGroupsOutput[]> {
        if (authInfo.userType === UserType.TEACHER && !authInfo?.isSchoolLeader && !myClasses)
            throw new HttpException('Forbidden Resource', ErrorStatusCodeEnum._403);
        const isSchoolLeaderOrAdmin = authInfo?.isSchoolLeader || authInfo?.userType === UserType.ADMIN;

        return await this.schoolClassService.getSchoolClassesAndGroups(schoolId, authInfo?.sub, isSchoolLeaderOrAdmin, myClasses);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [SchoolClassAndGroupsOutput])
    async getGroupsAcrossClasses(
        @Args('schoolId') schoolId: string,
        @Args('myClasses') myClasses: boolean,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<SchoolClassAndGroupsOutput[]> {
        if (authInfo.userType === UserType.TEACHER && !authInfo?.isSchoolLeader && !myClasses)
            throw new HttpException('Forbidden Resource', ErrorStatusCodeEnum._403);
        const isSchoolLeaderOrAdmin = authInfo?.isSchoolLeader || authInfo?.userType === UserType.ADMIN;

        return await this.schoolClassService.getGroupsAcrossClasses(schoolId, authInfo?.sub, isSchoolLeaderOrAdmin, myClasses);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [SchoolClassAndGroupsOutput])
    async getPreAdmissionClasses(
        @Args('schoolId') schoolId: string,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<SchoolClassAndGroupsOutput[]> {
        const isSchoolLeaderOrAdmin = authInfo?.isSchoolLeader || authInfo?.userType === UserType.ADMIN;

        return await this.schoolClassService.getPreAdmissionClasses(schoolId, authInfo?.sub, authInfo.userType, isSchoolLeaderOrAdmin);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [ScheduleClassesGroupsOutput])
    async getScheduleClassesGroups(
        @Args('schoolId') schoolId: string,
        @Args('topicId') topicId: string,
        @Args({ name: 'subjectIds', type: () => [String] }) subjectIds: string[],
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<ScheduleClassesGroupsOutput[]> {
        return await this.schoolClassService.getScheduleClassesGroups(
            schoolId,
            topicId,
            authInfo?.sub,
            authInfo?.isSchoolLeader || authInfo?.userType === UserType.ADMIN,
            subjectIds
        );
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'])
    @Query(() => Date, { nullable: true })
    async getPreviouslySetTopicDate(@Args('topicId') topicId: string, @Args('classId') classId: string): Promise<Date | null> {
        return await this.schoolClassService.getPreviouslySetTopicDate(topicId, classId);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [LwpSchoolClass])
    async getSchoolClassesForSchoolOverview(@Args('schoolId') schoolId: string): Promise<LwpSchoolClass[]> {
        return await this.schoolClassService.getSchoolClassesForSchoolOverview(schoolId);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [LwpSchoolClass])
    async getGroupsAcrossClassesForSchoolOverview(@Args('schoolId') schoolId: string): Promise<LwpSchoolClass[]> {
        return await this.schoolClassService.getGroupsAcrossClassesForSchoolOverview(schoolId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpSchoolClass])
    async getSchoolClassesForClassOverview(
        @Args('schoolId') schoolId: string,
        @Args({ name: 'getGroups', type: () => Boolean, defaultValue: false }) getGroups: boolean
    ): Promise<LwpSchoolClass[]> {
        return await this.schoolClassService.getSchoolClassesForClassOverview(schoolId, getGroups);
    }

    @AuthorizeField(TeacherField)
    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'id'])
    @Query(() => LwpSchoolClass)
    async schoolClass(@Args('id') id: string): Promise<LwpSchoolClass> {
        return await this.schoolClassService.schoolClass(id);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'])
    @Query(() => ReadingTopicExistOuput)
    async schoolClassHaveReadingTopics(@Args('classId') classId: string): Promise<ReadingTopicExistOuput> {
        return await this.schoolClassService.schoolClassHaveReadingTopics(classId);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Write, 'input.schoolId'])
    @Mutation(() => LwpSchoolClass)
    async createSchoolClass(
        @Args({ name: 'input', type: () => SchoolClassInput }) input: SchoolClassInput,
        @AuthInfo('sub') userId: string
    ): Promise<LwpSchoolClass> {
        return await this.schoolClassService.createSchoolClass(input, userId);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchoolClass, OpType.Write, 'classId'])
    @Mutation(() => Boolean)
    async hideSchoolClass(@Args({ name: 'schoolId' }) _schoolId: string, @Args({ name: 'classId' }) classId: string): Promise<boolean> {
        return await this.schoolClassService.hideSchoolClass(classId);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'input.schoolId'], [LwpPupil, OpType.Read, 'input.pupilIds'])
    @Mutation(() => Boolean)
    async createGroupAcrossClasses(
        @Args({ name: 'input', type: () => CreateGroupAcrossClassesInput }) input: CreateGroupAcrossClassesInput,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        await this.schoolClassService.createGroupAcrossClasses(input, userId);

        return true;
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Write, 'input.classId'])
    @Mutation(() => LwpSchoolClass)
    async createGroupWithinSchoolClass(
        @Args({ name: 'input', type: () => GroupWithinSchoolClassInput }) input: GroupWithinSchoolClassInput,
        @AuthInfo('sub') userId: string
    ): Promise<LwpSchoolClass> {
        return await this.schoolClassService.createGroupWithinSchoolClass(input, userId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Write, 'input.groupId'])
    @Mutation(() => LwpSchoolClass)
    async updateGroupWithinSchoolClass(
        @Args({ name: 'input', type: () => UpdateGroupWithinSchoolClassInput }) input: UpdateGroupWithinSchoolClassInput
    ): Promise<LwpSchoolClass> {
        return await this.schoolClassService.updateGroupWithinSchoolClass(input);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Write, 'input.id'])
    @Mutation(() => LwpSchoolClass)
    async updateSchoolClass(
        @Args({ name: 'input', type: () => UpdateSchoolClassInput }) input: UpdateSchoolClassInput,
        @AuthInfo('sub') userId: string
    ): Promise<LwpSchoolClass> {
        return await this.schoolClassService.updateSchoolClass(input, userId);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchoolClass, OpType.Write, 'id'])
    @Mutation(() => OperationStatus)
    async deleteSchoolClass(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        return await this.schoolClassService.deleteSchoolClass(id, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async updateNoLinkedParentStatusOfPupils(): Promise<boolean> {
        await this.schoolClassService.updateNoLinkedParentStatusOfPupils();

        return true;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async adminSendTrophyMailToTeacher(): Promise<boolean> {
        await this.schoolClassService.sendTrophyMailToTeacher();

        return true;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async updateAllGroupAcrossClassesLicenseDetails(): Promise<boolean> {
        await this.schoolClassService.updateAllGroupAcrossClassesLicenseDetails();

        return true;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async adminSendTrophyMailToSchoolLeader(): Promise<boolean> {
        await this.schoolClassService.sendTrophyMailToSchoolLeader();

        return true;
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'id'])
    @Query(() => ClassPupilsForRegisterTableOutput)
    async getClassPupilsForRegisterTable(@Args({ name: 'id' }) id: string): Promise<ClassPupilsForRegisterTableOutput> {
        return await this.schoolClassService.getClassPupilsForRegisterTable(id);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'id'])
    @Query(() => ClassPupilsForRegisterTableOutput)
    async getActivityGridDataForGroupAcrossClasses(@Args({ name: 'id' }) id: string): Promise<ClassPupilsForRegisterTableOutput> {
        return await this.schoolClassService.getActivityGridDataForGroupAcrossClasses(id);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'id'])
    @Query(() => [ClassPupilsForClassPupilsPageOutput])
    async getClassPupilsForClassPupilsPage(@Args({ name: 'id' }) id: string): Promise<ClassPupilsForClassPupilsPageOutput[]> {
        return await this.schoolClassService.getClassPupilsForClassPupilsPage(id);
    }

    @AuthorizeField(TeacherField)
    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'])
    @Query(() => [LwpPupil])
    async getClassPupils(@Args('classId') classId: string, @Args('pupilName', { nullable: true }) pupilName: string): Promise<LwpPupil[]> {
        return await this.schoolClassService.getClassPupils(classId, pupilName);
    }

    @AuthorizeField(TeacherField)
    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'], [ImportedSchoolClass, OpType.Read, 'wondeClassId'])
    @Query(() => [String])
    async getMISRegistrationClassPupils(
        @Args('wondeClassId') wondeClassId: string,
        @Args('classId', { nullable: true }) classId: string
    ): Promise<string[]> {
        return await this.schoolClassService.getMISRegistrationClassPupils(wondeClassId, classId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpPupil])
    async getClassPupilsForAdmin(@Args('classId') classId: string): Promise<LwpPupil[]> {
        return await this.schoolClassService.getClassPupilsForAdmin(classId);
    }

    @AuthorizeField(TeacherField)
    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'])
    @Query(() => [LwpPupil])
    async getClassReadingLogs(@Args('classId') classId: string): Promise<LwpPupil[]> {
        return await this.schoolClassService.getClassReadingLogs(classId);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchoolClass, OpType.Write, 'classId'], [LwpUser, OpType.Write, 'teacherId'])
    @Mutation(() => OperationStatus)
    async assignTeacherToClass(@Args('teacherId') teacherId: string, @Args('classId') classId: string): Promise<OperationStatus> {
        return await this.schoolClassService.assignTeacherToClass(teacherId, classId);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchoolClass, OpType.Write, 'classId'])
    @Mutation(() => LwpSchoolClass)
    async changeReadingLogsStatus(
        @Args('IsReadingLogsEnabled') IsReadingLogsEnabled: boolean,
        @Args('classId') classId: string
    ): Promise<LwpSchoolClass> {
        return await this.schoolClassService.changeReadingLogsStatus(IsReadingLogsEnabled, classId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'])
    @Query(() => SchoolClassStatistics)
    async getSchoolClassStatistics(@Args('classId') classId: string): Promise<SchoolClassStatistics> {
        return await this.schoolClassService.getSchoolClassStatistics(classId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'])
    @Query(() => [String])
    async getSchoolClassStatisticsPupils(@Args('classId') classId: string, @Args('status') status: PupilStatus): Promise<string[]> {
        return await this.schoolClassService.getSchoolClassStatisticsPupils(classId, status);
    }

    @AuthorizeField(TeacherField)
    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'])
    @Query(() => [LwpSchoolClass])
    async getClassGroups(@Args('classId') classId: string): Promise<LwpSchoolClass[]> {
        return await this.schoolClassService.getClassGroups(classId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'])
    @Query(() => [LwpSchoolClass])
    async getClassGroupsForAddingPupil(
        @Args('schoolId') schoolId: string,
        @Args('classId') classId: string,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<LwpSchoolClass[]> {
        const isTeacher = authInfo?.userType === UserType.TEACHER && !authInfo?.isSchoolLeader;

        return await this.schoolClassService.getClassGroupsForAddingPupil(classId, schoolId, isTeacher ? authInfo?.sub : null);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async linkLwpClassToWondeClass(@Args('input') input: LinkClassInput): Promise<boolean> {
        return await this.schoolClassService.linkLwpClassToWondeClass(input);
    }

    @AuthorizeField(TeacherField)
    @AuthorizeEndpoint(
        TeacherOnly,
        // good god this is horrific - why are we mixing different IDs for different objects in the same place in the input?!?
        [
            LwpPupil,
            OpType.Write,
            (args): string[] => (args.input as AddPupilsInClassInput).pupilIds.filter((id) => !Number.isNaN(parseInt(id)))
        ],
        [
            ImportedStudent,
            OpType.Write,
            (args): string[] => (args.input as AddPupilsInClassInput).pupilIds.filter((id) => Number.isNaN(parseInt(id)))
        ],
        [LwpSchoolClass, OpType.Write, 'input.classId']
    )
    @Mutation(() => Boolean)
    async addPupilsInClass(@Args('input') input: AddPupilsInClassInput, @AuthInfo('sub') userId: string): Promise<boolean> {
        await this.pupilService.addPupilsInClass(input, userId);

        return true;
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpUser, OpType.Read, 'teacherId'], [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [SchoolClassForFeedbackFilterOutput])
    async getClassesAndGroupsForFeedbackFilter(
        @Args({ name: 'periodIndex', nullable: true }) periodIndex: string,
        @Args({ name: 'teacherId' }) teacherId: string,
        @Args({ name: 'schoolId' }) schoolId: string,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<SchoolClassForFeedbackFilterOutput[]> {
        const isAdminOrSchoolLeader = authInfo?.userType === UserType.ADMIN || authInfo?.isSchoolLeader;

        return await this.schoolClassService.getClassesAndGroupsForFeedbackFilter(periodIndex, teacherId, schoolId, isAdminOrSchoolLeader);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [LwpSchoolClass])
    async getRegistrationClasses(@Args('schoolId') schoolId: string): Promise<LwpSchoolClass[]> {
        return await this.schoolClassService.getSchoolClasses(schoolId, true);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [LwpSchoolClass])
    async getSchoolClassesForUnassignedPupils(
        @Args('schoolId') schoolId: string,
        @Args('isPreRegistrationClass') isPreRegistrationClass: boolean
    ): Promise<LwpSchoolClass[]> {
        return await this.schoolClassService.getSchoolClassesForUnassignedPupils(schoolId, isPreRegistrationClass);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'])
    @Query(() => [StaticLwpSubject])
    async getSubjectsForClassGroupCreation(@Args('classId') classId: string): Promise<StaticLwpSubject[]> {
        return await this.schoolClassService.getSubjectsForClassGroupCreation(classId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'])
    @Query(() => Boolean)
    async anyPupilInClassHasTopic(@Args('staticTopicId') staticTopicId: string, @Args('classId') classId: string): Promise<boolean> {
        return await this.schoolClassService.anyPupilInClassHasTopic(staticTopicId, classId);
    }

    @AuthorizeField(TeacherField)
    @ResolveField(() => SchoolClassStatistics)
    async statistics(@Parent() schoolClass: LwpSchoolClass): Promise<SchoolClassStatistics> {
        return await this.schoolClassService.getSchoolClassStatistics(schoolClass.id);
    }

    @AuthorizeField(TeacherField)
    @ResolveField(() => [LwpPupil])
    async pupils(@Parent() schoolClass: LwpSchoolClass): Promise<LwpPupil[]> {
        return await this.pupilService.getSchoolClassPupils(schoolClass.id);
    }

    @AuthorizeField(TeacherField)
    @ResolveField(() => [LwpClassTopic])
    async topics(@Parent() schoolClass: LwpSchoolClass): Promise<Omit<LwpClassTopic, keyof BaseEntity>[]> {
        return await this.classTopicService.getClassTopics(schoolClass.id);
    }

    @AuthorizeField(TeacherField)
    @ResolveField(() => [LwpUser])
    async teachers(@Parent() schoolClass: LwpSchoolClass): Promise<LwpUser[]> {
        return await this.teacherService.getSchoolClassTeachers(schoolClass.id);
    }

    @ResolveField(() => LwpUser)
    async mainTeacher(@Parent() schoolClass: LwpSchoolClass): Promise<LwpUser> {
        return await this.teacherService.getSchoolClassMainTeacher(schoolClass.id);
    }

    @AuthorizeField(TeacherField)
    @ResolveField(() => LwpSchool)
    async school(@Parent() schoolClass: LwpSchoolClass): Promise<LwpSchool> {
        return await this.schoolService.getSchoolByClass(schoolClass.id);
    }

    @ResolveField(() => StaticLwpTopicDomain)
    async yearGroup(@Parent() schoolClass: LwpSchoolClass): Promise<StaticLwpTopicDomain> {
        return await this.schoolClassService.getClassYearGroup(schoolClass.id);
    }

    @AuthorizeField(TeacherField)
    @ResolveField(() => Number)
    async classSize(@Parent() schoolClass: LwpSchoolClass): Promise<number> {
        return await this.schoolClassService.getClassNumOfPupils(schoolClass.id);
    }

    @AuthorizeField(TeacherField)
    @ResolveField(() => [LwpSchoolClass])
    async groups(@Parent() schoolClass: LwpSchoolClass): Promise<LwpSchoolClass[]> {
        return await this.schoolClassService.getClassGroups(schoolClass.id);
    }

    @ResolveField(() => LwpSchoolClass)
    async parentClass(@Parent() schoolClass: LwpSchoolClass): Promise<LwpSchoolClass> {
        return await this.schoolClassService.getParentClass(schoolClass.id);
    }

    @AuthorizeField(TeacherField)
    @ResolveField(() => LwpClassTopic)
    async currentReadingWeek(@Parent() schoolClass: LwpSchoolClass): Promise<LwpClassTopic> {
        return await this.classTopicService.getCurrentClassReadingTopic(schoolClass.id);
    }

    @AuthorizeField(TeacherField)
    @ResolveField(() => LwpClassTopic)
    async currentTopic(@Parent() schoolClass: LwpSchoolClass): Promise<LwpClassTopic> {
        return await this.classTopicService.getCurrentClassTopic(schoolClass.id);
    }

    @AuthorizeField(TeacherField)
    @ResolveField(() => LwpClassTopic)
    async upcomingTopic(@Parent() schoolClass: LwpSchoolClass): Promise<LwpClassTopic> {
        return await this.classTopicService.getUpcomingClassTopic(schoolClass.id);
    }

    @AuthorizeField(TeacherField)
    @ResolveField(() => ImportedSchoolClass)
    async importedSchoolClass(@Parent() schoolClass: LwpSchoolClass): Promise<ImportedSchoolClass> {
        return await this.schoolClassService.getClassImportedClass(schoolClass.id);
    }

    @ResolveField(() => String)
    async schoolClassName(@Parent() schoolClass: LwpSchoolClass): Promise<string> {
        return await this.schoolClassService.getSchoolClassName(schoolClass.id);
    }

    @ResolveField(() => StaticLwpPeriod)
    async period(@Parent() schoolClass: LwpSchoolClass): Promise<StaticLwpPeriod> {
        return await this.staticLwpPeriodSerivce.getSchoolClassPeriod(schoolClass.id);
    }

    @AuthorizeField(TeacherField)
    @ResolveField(() => [StaticLwpSubject], { nullable: true })
    async subjects(@Parent() schoolClass: LwpSchoolClass): Promise<StaticLwpSubject[]> {
        return this.schoolClassService.getSubjects(schoolClass);
    }

    @AuthorizeField(TeacherField)
    @ResolveField(() => Number)
    async attentionRequiredPupilsCount(@Parent() schoolClass: LwpSchoolClass): Promise<number> {
        return await this.schoolClassService.getAttentionRequiredPupilsCountOfSchoolClass(schoolClass?.id);
    }

    @AuthorizeField(TeacherField)
    @ResolveField(() => ClassTopicContextOutput, { nullable: true })
    async classTopicContext(@Parent() schoolClass: LwpSchoolClass): Promise<ClassTopicContextOutput> {
        return await this.schoolClassService.getClassTopicContext(schoolClass?.id);
    }

    /**
     * Drives the auto-schedule action on the school overview, which lists every class in the school,
     * so it is loaded in one batch rather than a query per row.
     */
    @AuthorizeField(TeacherField)
    @ResolveField(() => Boolean)
    async canAutoScheduleMoneySkills(
        @Parent() schoolClass: LwpSchoolClass,
        @Loader(MoneySkillsAutoScheduleByClassIdLoader) moneySkillsAutoScheduleLoader: DataLoader<string, boolean>
    ): Promise<boolean> {
        return moneySkillsAutoScheduleLoader.load(schoolClass.id);
    }

    @AuthorizeField(UnrestrictedField)
    @ResolveField(() => Boolean, { nullable: true })
    async isPreAdmissionClass(@Parent() schoolClass: LwpSchoolClass): Promise<boolean> {
        return await this.schoolClassService.isPreAdmissionClass(schoolClass?.id);
    }

    @AuthorizeField(UnrestrictedField)
    @ResolveField(() => AcademicYearInfo, { nullable: true })
    async academicYearInfo(@Parent() schoolClass: LwpSchoolClass): Promise<AcademicYearInfo> {
        return await this.schoolClassService.getSchoolClassAcademicYearInfo(schoolClass?.id);
    }
}
