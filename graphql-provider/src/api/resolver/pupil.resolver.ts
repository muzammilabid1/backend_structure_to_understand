import { HttpException } from '@nestjs/common';
import { Args, Mutation, Parent as PParent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import DataLoader from 'dataloader';
import { PupilParentStatus } from 'lwp-shared';
import { Loader } from 'nestjs-dataloader';
import { AuthorizeField, TeacherField, TrustedUserField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { LeaderOnly } from 'src/auth/authorizers/LeaderOnly';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { OpType } from 'src/auth/types/OpType';
import { UserTrustLevel } from 'src/auth/types/UserTrustLevel';
import { UserType } from 'src/auth/types/UserType';
import { LogParentPupilActions } from 'src/common/log_parent_pupil_action.actions';
import { Pagination } from 'src/paginate';

import { ClassReadingPageWithPupilOutput } from '../dtos/ClassReadingPageWithPupilOutput';
import { GetPupilBookHistoryOutput } from '../dtos/GetPupilBookHistoryOutput';
import { LwpBuildType } from '../dtos/LwpBuildType';
import { ParentInfoOfPupilOutput } from '../dtos/ParentInfoOfPupilOutput';
import { PupilBookHistoryOutput, PupilBookHistoryPaginatedOutput, PupilBookOutput } from '../dtos/PupilBookHistoryOutput';
import { PupilFeedbackOutput } from '../dtos/PupilFeedbackOutput';
import { SchoolPupilsOutput } from '../dtos/SchoolPupilsOutput';
import { ScrapbookReadyTeddyTopicOutput } from '../dtos/ScrapbookReadyTeddyTopicOutput';
import { ImportedStudent } from '../entities/imported_student';
import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { LwpPupilTag } from '../entities/lwp_pupil_tag';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilMathscot } from '../entities/pupil_mathscot';
import { LwpPupilParent } from '../entities/pupil_parent';
import { LwpPupilTopic } from '../entities/pupil_topic';
import { LwpPupilTrophy } from '../entities/pupil_trophy';
import { LwpPupilActivity } from '../entities/pupil-activity';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpProgram } from '../entities/static_lwp_program';
import { LwpUser } from '../entities/user';
import { PupilCurrentRTTopicLoader } from '../loader/pupil_current_rt_topic.loader';
import {
    AssignPupilToNewOrExistingClassInput,
    AwaitingInvitedParentOutput,
    BookReadAt,
    ChangeClassPupilPremiumInput,
    ClassesAndGroupsInfoOfPupilsOutput,
    CreateSchoolDataForTestingInput,
    ErrorStatusCodeEnum,
    FeedbackPupilsNameOutput,
    GenerateMathscotCertificateInput,
    LinkPupilInput,
    LogParentPupilActionInput,
    MergeMathscotItems,
    NavigateToOtherChildPageInput,
    NavigateToOtherChildPageOutput,
    OperationStatus,
    ParentsContext,
    PupilBookHistoryForParentInput,
    PupilBookHistoryInput,
    PupilPreviousMathscotsOutput,
    PupilReadingNoteOutput,
    PupilRecentBookLogsInput,
    PupilStatus,
    PupilTotalStarCountOutput,
    PupilType,
    ReadingMode,
    ReadingType,
    SchoolAndDummyWondeDataInput,
    UpdatePupilInput
} from '../model';
import { CertificateService } from '../service/certificate.service';
import { LogParentPupilActionService } from '../service/log_parent_pupil_action.service';
import { LwpPupilTagService } from '../service/lwp_pupil_tag.service';
import { PupilMathscotService } from '../service/pupil_mathscot.service';
import { SchoolService } from '../service/school.service';
import { TrophyService } from '../service/trophy.service';
import { BlankCertificateType } from '../types/BlankCertificateType';
import { ParentService } from './../service/parent.service';
import { PupilService } from './../service/pupil.service';
import { PupilActivityService } from './../service/pupil_activity.service';
import { PupilTopicService } from './../service/pupil_topic.service';
import { SchoolClassService } from './../service/school_class.service';

@Resolver(() => LwpPupil)
export class PupilResolver {
    constructor(
        private pupilService: PupilService,
        private schoolClassService: SchoolClassService,
        private parentService: ParentService,
        private pupilActivityService: PupilActivityService,
        private pupilTopicService: PupilTopicService,
        private logParentPupilActionService: LogParentPupilActionService,
        private schoolService: SchoolService,
        private pupilMathscotService: PupilMathscotService,
        private pupilTrophyService: TrophyService,
        private schoolpupilTagService: LwpPupilTagService,
        private certificateService: CertificateService
    ) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpPupil])
    async allPupil(): Promise<LwpPupil[]> {
        return await this.pupilService.allPupil();
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, null, { parentId: 'schoolId' }])
    @Query(() => [SchoolPupilsOutput])
    async getSchoolPupils(
        @Args('schoolId') schoolId: string,
        @Args('pupilName', { nullable: true }) pupilName: string,
        @Args('isSchoolMIS', { nullable: true }) isSchoolMIS: boolean,
        @Args('isPupilsWithClasses', { nullable: true }) isPupilsWithClasses: boolean
    ): Promise<SchoolPupilsOutput[]> {
        return await this.pupilService.getSchoolPupils(schoolId, pupilName, isSchoolMIS, isPupilsWithClasses);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, null, { parentId: 'schoolId' }])
    @Query(() => [LwpPupil])
    async getSchoolPupilsWithoutMIS(@Args('schoolId') schoolId: string): Promise<LwpPupil[]> {
        return await this.pupilService.getSchoolPupilsWithoutMIS(schoolId);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, null, { parentId: 'schoolId' }])
    @Query(() => [LwpPupil])
    async getSchoolPupilsWithoutClasses(
        @Args('schoolId') schoolId: string,
        @Args('isPreRegistrationPupils') isPreRegistrationPupils: boolean
    ): Promise<LwpPupil[]> {
        return await this.pupilService.getSchoolPupilsWithoutClasses(schoolId, isPreRegistrationPupils);
    }

    @AuthorizeEndpoint([LwpUser, OpType.Read, 'parentId', { requiredTrust: UserTrustLevel.Limited }])
    @Query(() => [LwpPupil])
    async getPupils(
        @Args('parentId') parentId: string,
        @Args({ name: 'isActiveInCurrentAcademic', nullable: true }) isActiveInCurrentAcademic: boolean
    ): Promise<LwpPupil[]> {
        return await this.pupilService.getPupils(parentId, isActiveInCurrentAcademic);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpPupilParent])
    async getAllPupils(@Args('parentId') parentId: string): Promise<LwpPupilParent[]> {
        return await this.pupilService.getAllPupils(parentId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'], [LwpPupil, OpType.Read, 'pupilIds', { optional: true }])
    @Query(() => [ClassReadingPageWithPupilOutput])
    async getClassReadingFeedbacksOfPupils(
        @Args('classId') classId: string,
        @Args({ name: 'pupilIds', type: () => [String], nullable: true }) pupilIds: string[]
    ): Promise<ClassReadingPageWithPupilOutput[]> {
        return await this.pupilService.getClassReadingFeedbacksOfPupils(classId, pupilIds);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'id'])
    @Query(() => LwpPupil)
    async pupil(@Args('id', { nullable: true }) id: string, @AuthInfo() authInfo: AuthTokenJWT): Promise<LwpPupil> {
        const logParentPupilActionInput = new LogParentPupilActionInput();

        logParentPupilActionInput.actionId = LogParentPupilActions.child_home_accessed.id;
        logParentPupilActionInput.parentId = authInfo.sub;
        logParentPupilActionInput.userId = authInfo.sub;
        logParentPupilActionInput.pupilId = id;

        await this.logParentPupilActionService.addLogParentPupilAction(logParentPupilActionInput);

        if (authInfo.userType === UserType.ADMIN) {
            return await this.pupilService.getPupilByAdmin(id);
        }

        if ([UserType.PARENT, UserType.TOPICACCESS, UserType.MAGICPARENT].includes(authInfo.userType)) {
            return await this.pupilService.getPupilByParent(id, authInfo.sub);
        }

        if ([UserType.HELPER, UserType.TEACHER].includes(authInfo.userType) && !authInfo.isSchoolLeader) {
            return await this.pupilService.getPupilByTeacher(id, authInfo.sub);
        }

        if ([UserType.TEACHER, UserType.HELPER].includes(authInfo.userType) && authInfo.isSchoolLeader) {
            return await this.pupilService.getPupilByLeader(id, authInfo.sub);
        }

        throw new HttpException('Invalid user type.', ErrorStatusCodeEnum._535);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupil, OpType.Write, 'pupilIds'])
    @Mutation(() => Boolean)
    async changePupilsClass(
        @Args('newClassId') newClassId: string,
        @Args({ name: 'pupilIds', type: () => [String] }) pupilIds: string[],
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        return await this.pupilService.addPupilToClass(newClassId, pupilIds, userId, false, true);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupil, OpType.Write, 'pupilId'])
    @Mutation(() => Boolean)
    async changePupilClass(
        @Args('newClassId') newClassId: string,
        @Args('pupilId') pupilId: string,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        return await this.pupilService.addPupilToClass(newClassId, [pupilId], userId);
    }

    @AuthorizeEndpoint(
        LeaderOnly,
        [LwpPupil, OpType.Write, 'input.pupilIds'],
        [LwpSchool, OpType.Read, 'input.schoolId'],
        [LwpSchoolClass, OpType.Read, 'input.newClassId', { optional: true }]
    )
    @Mutation(() => Boolean)
    async assignPupilToNewOrExistingClass(
        @Args({ name: 'input', type: () => AssignPupilToNewOrExistingClassInput }) input: AssignPupilToNewOrExistingClassInput,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        const hasNewClassId = !!input.existingClassId;
        const hasClassDetails = !!input.className && !!input.yearGroup;

        if (!hasNewClassId && !hasClassDetails) {
            throw new Error('Either classId or both className and yearGroup must be provided.');
        }

        return await this.pupilService.assignPupilToNewOrExistingClass(input, userId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupil, OpType.Read, 'pupilId'])
    @Query(() => [ParentInfoOfPupilOutput])
    async getParentInfoOfPupil(
        @Args('pupilId') pupilId: string,
        @Args({ name: 'pupilParentStatus', type: () => PupilParentStatus }) pupilParentStatus: PupilParentStatus
    ): Promise<ParentInfoOfPupilOutput[]> {
        return await this.pupilService.getParentInfoOfPupil(pupilId, pupilParentStatus);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupil, OpType.Write, 'pupilIds'])
    @Mutation(() => Boolean)
    async removePupilsFromClass(
        @Args({ name: 'pupilIds', type: () => [String] }) pupilIds: string[],
        @Args('classId') classId: string,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        for (const pupilId of pupilIds) {
            await this.pupilService.removePupilFromClass(pupilId, classId, userId);
        }

        return true;
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupil, OpType.Write, 'pupilId'])
    @Mutation(() => Boolean)
    async sendParentNotification(
        @Args('pupilId') pupilId: string,
        @Args('parentId') parentId: string,
        @Args('sendOnPhone', { nullable: true }) sendOnPhone: boolean
    ): Promise<boolean> {
        await this.pupilService.changeRejectedParentToInvited(parentId);
        await this.pupilService.sendParentNotification(parentId, pupilId, false, sendOnPhone);

        return true;
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupil, OpType.Write, 'pupilId'])
    @Mutation(() => Boolean)
    async removePupilFromSchool(@Args('pupilId') pupilId: string, @AuthInfo('sub') userId: string): Promise<boolean> {
        await this.pupilService.removePupilsFromSchool([pupilId], userId);

        return true;
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpPupil, OpType.Write, 'pupilIds'])
    @Mutation(() => Boolean)
    async markPreRegistrationPupilsAsIgnoredForFutureYear(
        @Args({ name: 'pupilIds', type: () => [String] }) pupilIds: string[]
    ): Promise<boolean> {
        return await this.pupilService.markPreRegistrationPupilsAsIgnoredForFutureYear(pupilIds);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpPupil, OpType.Write, 'pupilIds'])
    @Mutation(() => Boolean)
    async removePupilsFromSchool(
        @Args({ name: 'pupilIds', type: () => [String] }) pupilIds: string[],
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        await this.pupilService.removePupilsFromSchool(pupilIds, userId);

        return true;
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Write, 'input.id', { requiredTrust: UserTrustLevel.Full }])
    @Mutation(() => LwpPupil)
    async updatePupil(@Args({ name: 'input', type: () => UpdatePupilInput }) input: UpdatePupilInput): Promise<LwpPupil> {
        return await this.pupilService.updatePupil(input);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deletePupil(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        return await this.pupilService.deletePupil(id, userId);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'pupilId'])
    @Query(() => [LwpPupilTrophy])
    async getPupilTrophies(
        @Args('pupilId') pupilId: string,
        @Args('parentId', { nullable: true }) parentId: string,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<LwpPupilTrophy[]> {
        return await this.pupilService.getPupilTrophies(pupilId, parentId, authInfo.sub, authInfo.userType);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Write, 'pupilId', { requiredTrust: UserTrustLevel.Full }])
    @Mutation(() => LwpPupil)
    async removeParentFromPupil(
        @Args('pupilId') pupilId: string,
        @Args('parentId') parentId: string,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<LwpPupil> {
        if (authInfo.userType === UserType.PARENT && authInfo.sub !== parentId) {
            throw new HttpException('Operation not permitted', ErrorStatusCodeEnum._403);
        }

        return await this.pupilService.removeParentFromPupil(pupilId, parentId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupil, OpType.Read, 'input.pupilIds'])
    @Mutation(() => String)
    async generateCertificates(@Args('input') input: GenerateMathscotCertificateInput): Promise<string> {
        const { teacherId, pupilIds, trophyId } = input;

        return this.pupilService.generateCertificates(teacherId, pupilIds, true, trophyId);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'pupilId'])
    @Query(() => String)
    async generatePupilCertificate(
        @Args('pupilId') pupilId: string,
        @Args({ name: 'schoolClassId', nullable: true }) schoolClassId: string,
        @Args('trophyId') trophyId: string
    ): Promise<string> {
        return this.pupilService.generatePupilCertificate(pupilId, schoolClassId, trophyId);
    }

    @AuthorizeEndpoint(TeacherOnly)
    @Mutation(() => String)
    async blankCertificate(@Args({ name: 'type', type: () => BlankCertificateType }) type: BlankCertificateType): Promise<string> {
        return await this.certificateService.getBlankCertificate(type);
    }

    @AuthorizeEndpoint([LwpPupilTopic, OpType.Read, 'pupilTopicId'])
    @Query(() => PupilReadingNoteOutput)
    async getPupilReadingNote(
        @Args({ name: 'pupilId' }) _pupilId: string,
        @Args({ name: 'pupilTopicId' }) pupilTopicId: string
    ): Promise<PupilReadingNoteOutput> {
        return await this.pupilService.getPupilReadingNote(pupilTopicId);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'pupilId'])
    @Query(() => [PupilPreviousMathscotsOutput])
    async getPupilPreviousMathscots(@Args({ name: 'pupilId' }) pupilId: string): Promise<PupilPreviousMathscotsOutput[]> {
        return await this.pupilService.getPupilPreviousMathscots(pupilId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async createSchoolDataForTesting(
        @Args({ name: 'input', type: () => CreateSchoolDataForTestingInput }) input: CreateSchoolDataForTestingInput,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        if (process.env.LWP_ENV === LwpBuildType.LOCAL || process.env.LWP_ENV === LwpBuildType.DEV) {
            return await this.pupilService.createSchoolDataForTesting(input, userId);
        }

        return false;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async createSchoolAndDummyWondeData(
        @Args({ name: 'input', type: () => SchoolAndDummyWondeDataInput }) input: SchoolAndDummyWondeDataInput,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        if (process.env.LWP_ENV === LwpBuildType.LOCAL || process.env.LWP_ENV === LwpBuildType.DEV) {
            return await this.pupilService.createSchoolAndDummyWondeData(input, userId);
        }

        return false;
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, (args): string[] => (args.input as [ChangeClassPupilPremiumInput]).map((i) => i.id)])
    @Mutation(() => Boolean)
    async changeClassPupilsPremium(
        @Args({ name: 'input', type: () => [ChangeClassPupilPremiumInput] }) input: [ChangeClassPupilPremiumInput]
    ): Promise<boolean> {
        return await this.pupilService.changeClassPupilsPremium(input);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId', { optional: true }], [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [ClassesAndGroupsInfoOfPupilsOutput])
    async getClassesAndGroupsInfoOfPupils(
        @Args({ name: 'schoolId' }) schoolId: string,
        @Args({ name: 'classId', nullable: true }) classId: string,
        @Args({ name: 'readingOnly' }) readingOnly: boolean,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<ClassesAndGroupsInfoOfPupilsOutput[]> {
        return await this.pupilService.getClassesAndGroupsInfoOfPupils(
            schoolId,
            classId,
            authInfo.sub,
            authInfo.isSchoolLeader,
            authInfo.userType === UserType.ADMIN,
            readingOnly
        );
    }

    @AuthorizeEndpoint(
        TeacherOnly,
        [LwpSchoolClass, OpType.Read, 'classId', { optional: true }],
        [LwpSchool, OpType.Read, 'schoolId'],
        [LwpPupil, OpType.Read, 'pupilIds', { optional: true }]
    )
    @Query(() => PupilFeedbackOutput)
    async getFeedbackForGroupReading(
        @Args({ name: 'limit', nullable: true }) limit: number,
        @Args({ name: 'offset', nullable: true }) offset: number,
        @Args({ name: 'schoolId' }) schoolId: string,
        @Args({ name: 'classId', nullable: true }) classId: string,
        @Args({ name: 'pupilIds', type: () => [String], nullable: true }) pupilIds: string[]
    ): Promise<Pagination<LwpPupilFeedback>> {
        return await this.pupilService.getFeedbackForGroupReading(limit, offset, schoolId, classId, pupilIds);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupilFeedback, OpType.Read, 'feedbackId'])
    @Query(() => [FeedbackPupilsNameOutput])
    async getFeedbackPupils(@Args({ name: 'feedbackId' }) feedbackId: string): Promise<FeedbackPupilsNameOutput[]> {
        return await this.pupilService.getFeedbackPupils(feedbackId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'])
    @Query(() => [LwpPupil])
    async getClassMissingPupils(@Args({ name: 'classId' }) classId: string): Promise<LwpPupil[]> {
        return await this.pupilService.getClassMissingPupils(classId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'])
    @Query(() => [LwpPupil])
    async getClassImportedPupils(@Args({ name: 'classId' }) classId: string): Promise<LwpPupil[]> {
        return await this.pupilService.getClassImportedPupils(classId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchoolClass, OpType.Read, 'classId'])
    @Query(() => [AwaitingInvitedParentOutput])
    async getAwaitingInvitedPupils(@Args({ name: 'classId' }) classId: number): Promise<AwaitingInvitedParentOutput[]> {
        return await this.pupilService.getAwaitingInvitedPupils(classId);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'input.targetChildId'])
    @Query(() => NavigateToOtherChildPageOutput, { nullable: true })
    async navigateToOtherChildPage(@Args('input') input: NavigateToOtherChildPageInput): Promise<NavigateToOtherChildPageOutput> {
        return await this.pupilService.navigateToOtherChildPage(input);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'input.pupilId'])
    @Query(() => [PupilBookHistoryOutput], { nullable: true })
    async getPupilBookHistoryForTeacher(
        @Args({ name: 'input', type: () => PupilBookHistoryInput }) input: PupilBookHistoryInput
    ): Promise<PupilBookHistoryOutput[]> {
        return await this.pupilService.getPupilBookHistoryForTeacher(input);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'input.pupilId'])
    @Query(() => PupilBookHistoryPaginatedOutput, { nullable: true })
    async getPupilBookHistoryForParent(
        @Args({ name: 'input', type: () => PupilBookHistoryForParentInput }) input: PupilBookHistoryForParentInput
    ): Promise<PupilBookHistoryPaginatedOutput> {
        return await this.pupilService.getPupilBookHistoryForParent(input.pupilId, input.type, input.limit, input.offset);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'input.pupilId'])
    @Query(() => [PupilBookHistoryOutput], { nullable: true })
    async getPupilRecentBookLogs(
        @Args({ name: 'input', type: () => PupilRecentBookLogsInput }) input: PupilRecentBookLogsInput
    ): Promise<PupilBookHistoryOutput[]> {
        return this.pupilService.getPupilRecentBookLogs(input);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'pupilId'])
    @Query(() => [PupilBookOutput], { nullable: true })
    async getPupilBooks(
        @Args('pupilId') pupilId: string,
        @Args({ name: 'readingMode', type: () => ReadingMode, nullable: true }) readingMode?: ReadingMode
    ): Promise<PupilBookOutput[]> {
        return await this.pupilService.getPupilBooks(pupilId, readingMode);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'pupilId'])
    @Query(() => GetPupilBookHistoryOutput)
    async getPupilBookHistory(
        @Args('pupilId') pupilId: string,
        @Args('bookName') bookName: string,
        @Args({ name: 'readingType', type: () => ReadingType }) readingType: ReadingType,
        @Args('readAt') readAt: BookReadAt,
        @Args('isCurrentYearOnly') isCurrentYearOnly: boolean
    ): Promise<GetPupilBookHistoryOutput> {
        return await this.pupilService.getPupilBookHistory(pupilId, bookName, readingType, readAt, isCurrentYearOnly);
    }

    @AuthorizeEndpoint() // this doesn't need to authorise any resource, it only ever happens to the user themselves, the param is useless
    @Mutation(() => Boolean)
    async pupilWatchedIntoVideo(@Args({ name: 'pupilId' }) _pupilId: string, @AuthInfo('sub') userId: string): Promise<boolean> {
        return await this.pupilService.pupilWatchedIntoVideo(userId);
    }

    @AuthorizeEndpoint(
        LeaderOnly,
        [LwpPupil, OpType.Write, (args): string[] => (args.input as LinkPupilInput).linkPupilInputs.map((i) => i.lwpPupilId)],
        [
            ImportedStudent,
            OpType.Write,
            (args): string[] =>
                (args.input as LinkPupilInput).linkPupilInputs
                    .filter((i) => i.importedStudentId !== 'not_in_mis')
                    .map((i) => i.importedStudentId)
        ]
    )
    @Mutation(() => Boolean)
    async linkPupilToWondePupil(@Args('input') input: LinkPupilInput): Promise<boolean> {
        return await this.pupilService.linkPupilToWondePupil(input);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupilTag, OpType.Read, 'id'])
    @Query(() => [LwpPupil])
    async getPupilsByTagId(@Args('id') id: string): Promise<LwpPupil[]> {
        return await this.pupilService.getPupilsByTagId(id);
    }

    @ResolveField(() => MergeMathscotItems)
    @AuthorizeField(UnrestrictedField)
    async mathscotUrl(@PParent() pupil: LwpPupil): Promise<MergeMathscotItems> {
        return await this.pupilService.pupilMathscotUrl(pupil);
    }

    @ResolveField(() => String)
    @AuthorizeField(UnrestrictedField)
    fullname(@PParent() ch: LwpPupil): string {
        return `${ch.firstname} ${ch.lastname}`;
    }

    @ResolveField(() => PupilStatus)
    @AuthorizeField(UnrestrictedField)
    async pupilStatus(@PParent() pupil: LwpPupil): Promise<PupilStatus> {
        return this.pupilService.getPupilStatus(pupil.id);
    }

    @ResolveField(() => Date)
    @AuthorizeField(TrustedUserField)
    async lastLogin(@PParent() pupil: LwpPupil): Promise<Date> {
        return await this.pupilService.getPupilLastLogin(pupil.id);
    }

    @ResolveField(() => PupilType)
    @AuthorizeField(UnrestrictedField)
    async type(@PParent() pupil: LwpPupil): Promise<PupilType> {
        return await this.pupilService.getPupilType(pupil);
    }

    @ResolveField(() => Date)
    @AuthorizeField(TrustedUserField)
    async lastActivity(@PParent() pupil: LwpPupil): Promise<Date> {
        return await this.pupilService.getPupillastActivity(pupil.id);
    }

    @ResolveField(() => Number)
    @AuthorizeField(UnrestrictedField)
    async videoCount(@PParent() pupil: LwpPupil): Promise<number> {
        return await this.pupilService.getPupilVideoCount(pupil.id);
    }

    @ResolveField(() => [LwpPupilTrophy])
    @AuthorizeField(TrustedUserField)
    async trophies(@PParent() pupil: LwpPupil): Promise<LwpPupilTrophy[]> {
        return await this.pupilTrophyService.getTrophiesOfPupil(pupil.id);
    }

    @ResolveField(() => PupilTotalStarCountOutput)
    @AuthorizeField(UnrestrictedField)
    async starsEarned(@PParent() pupil: LwpPupil): Promise<PupilTotalStarCountOutput> {
        return await this.pupilTopicService.getPupilTotalStarCount(pupil.id);
    }

    @ResolveField(() => Number)
    @AuthorizeField(UnrestrictedField)
    async watchedVideoCount(@PParent() pupil: LwpPupil): Promise<number> {
        return await this.pupilService.getPupilWatchedVideoCount(pupil.id);
    }

    @ResolveField(() => Number)
    @AuthorizeField(UnrestrictedField)
    async activityCount(@PParent() pupil: LwpPupil): Promise<number> {
        return await this.pupilService.getPupilActivityCount(pupil.id);
    }

    @ResolveField(() => Number)
    @AuthorizeField(UnrestrictedField)
    async feedbackCount(@PParent() pupil: LwpPupil): Promise<number> {
        return await this.pupilService.getPupilFeedbackCount(pupil.id);
    }

    @ResolveField(() => [LwpSchoolClass])
    @AuthorizeField(TrustedUserField)
    async classes(@PParent() pupil: LwpPupil): Promise<LwpSchoolClass[]> {
        return await this.schoolClassService.getPupilClasses(pupil.id);
    }

    @ResolveField(() => [LwpSchoolClass])
    @AuthorizeField(TeacherField)
    async classGroups(@PParent() pupil: LwpPupil): Promise<LwpSchoolClass[]> {
        return await this.schoolClassService.getPupilClasses(pupil.id, true);
    }

    // ## we need to replace parents from parents
    @ResolveField(() => [LwpPupilParent])
    @AuthorizeField(TrustedUserField)
    async parents(@PParent() pupil: LwpPupil, @AuthInfo('userType') userType: UserType): Promise<LwpPupilParent[]> {
        return await this.parentService.getPupilParents1(pupil.id, userType);
    }

    @ResolveField(() => [LwpPupilParent])
    @AuthorizeField(TrustedUserField)
    async nonRejectedParents(@PParent() pupil: LwpPupil): Promise<LwpPupilParent[]> {
        return await this.parentService.getNonRejectedParents(pupil.id);
    }

    @ResolveField(() => [LwpPupilParent])
    @AuthorizeField(TeacherField)
    async importedParents(@PParent() pupil: LwpPupil): Promise<LwpPupilParent[]> {
        return await this.parentService.getImportedParents(pupil.id);
    }

    @ResolveField(() => [LwpUser])
    @AuthorizeField(TeacherField)
    async importedStudent(@PParent() pupil: LwpPupil): Promise<LwpUser[]> {
        return await this.parentService.getPupilImportedStudent(pupil.id);
    }

    @ResolveField(() => [LwpPupilActivity])
    @AuthorizeField(UnrestrictedField)
    async activities(@PParent() pupil: LwpPupil): Promise<LwpPupilActivity[]> {
        return await this.pupilActivityService.getPupilActivities(pupil.id);
    }

    @ResolveField(() => LwpSchool)
    @AuthorizeField(UnrestrictedField)
    async school(@PParent() pupil: LwpPupil): Promise<LwpSchool> {
        return await this.schoolService.getPupilSchool(pupil.id);
    }

    @ResolveField(() => LwpSchoolClass)
    @AuthorizeField(UnrestrictedField)
    async currentClass(@PParent() pupil: LwpPupil): Promise<LwpSchoolClass> {
        return await this.pupilService.getPupilRegistrationClass(pupil.id);
    }

    @ResolveField(() => LwpSchoolClass)
    @AuthorizeField(UnrestrictedField)
    async currentClassOrGroupAcrossClasses(@PParent() pupil: LwpPupil): Promise<LwpSchoolClass> {
        return await this.pupilService.getPupilRegistrationClassOrGroupAcrossClasses(pupil.id);
    }

    @ResolveField(() => Boolean)
    @AuthorizeField(UnrestrictedField)
    async isInSchoolClassOrGroupAcrossClasses(@PParent() pupil: LwpPupil): Promise<boolean> {
        return await this.pupilService.isPupilInSchoolClassOrGroupAcrossClasses(pupil.id);
    }

    @ResolveField(() => ParentsContext)
    @AuthorizeField(UnrestrictedField)
    async parentsContext(@PParent() pupil: LwpPupil): Promise<ParentsContext> {
        return await this.pupilService.getParentsContext(pupil.id);
    }

    @ResolveField(() => LwpPupilMathscot)
    @AuthorizeField(UnrestrictedField)
    async currentMathscot(@PParent() pupil: LwpPupil): Promise<LwpPupilMathscot> {
        return await this.pupilMathscotService.getPupilCurrentPupilMathscot(pupil.id);
    }

    @ResolveField(() => String)
    @AuthorizeField(UnrestrictedField)
    async previousMathscotImage(@PParent() pupil: LwpPupil): Promise<string> {
        return await this.pupilService.getPupilPreviousPupilMathscotImage(pupil.id);
    }

    @ResolveField(() => String)
    @AuthorizeField(UnrestrictedField)
    async yearGroup(@PParent() pupil: LwpPupil): Promise<string> {
        return this.pupilService.getPupilYearGroup(pupil.startedSchool);
    }

    @ResolveField(() => Boolean)
    @AuthorizeField(UnrestrictedField)
    async parentWatchedIntroVideo(@AuthInfo() authInfo: AuthTokenJWT): Promise<boolean> {
        if (authInfo.userType === UserType.PARENT) {
            return this.pupilService.getPupilParentIntroVideoWatchedStatus(authInfo.sub);
        }

        return true;
    }

    @ResolveField(() => [LwpPupilTopic])
    @AuthorizeField(UnrestrictedField)
    async allTopics(@PParent() pupil: LwpPupil, @AuthInfo() authInfo: AuthTokenJWT): Promise<LwpPupilTopic[]> {
        return await this.pupilTopicService.getPupilTopics(pupil.id, { id: authInfo.sub, type: authInfo.userType });
    }

    @ResolveField(() => [LwpPupilTopic])
    @AuthorizeField(UnrestrictedField)
    async readingTopics(@PParent() pupil: LwpPupil, @AuthInfo('userType') userType: UserType): Promise<LwpPupilTopic[]> {
        if (userType === UserType.PARENT) return null;

        return await this.pupilTopicService.getReadingTopics(pupil.id);
    }

    @ResolveField(() => LwpPupilTopic)
    @AuthorizeField(UnrestrictedField)
    async currentReadingTopic(@PParent() pupil: LwpPupil, @AuthInfo('userType') userType: UserType): Promise<LwpPupilTopic> {
        if (userType === UserType.PARENT) return null;

        return await this.pupilTopicService.currentReadingTopic(pupil.id);
    }

    @ResolveField(() => LwpPupilTopic, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    async currentReadyTeddyTopic(
        @PParent() pupil: LwpPupil,
        @Loader(PupilCurrentRTTopicLoader) loader: DataLoader<string, LwpPupilTopic | null>
    ): Promise<LwpPupilTopic | null> {
        return loader.load(pupil.id);
    }

    @ResolveField(() => ScrapbookReadyTeddyTopicOutput, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    async currentReadyTeddyTopicForScrapbook(@PParent() pupil: LwpPupil): Promise<ScrapbookReadyTeddyTopicOutput> {
        return await this.pupilTopicService.currentReadyTeddyTopicForScrapbook(pupil);
    }

    @ResolveField(() => Boolean)
    @AuthorizeField(TeacherField)
    async isCurrentYearTopicsReleased(@PParent() pupil: LwpPupil): Promise<boolean> {
        return await this.pupilTopicService.isCurrentYearTopicsReleased(pupil.id);
    }

    @ResolveField(() => Boolean)
    @AuthorizeField(UnrestrictedField)
    async isActiveInCurrentAcademicYear(@PParent() pupil: LwpPupil): Promise<boolean> {
        return await this.pupilService.isActiveInCurrentAcademicYear(pupil.id);
    }

    @ResolveField(() => StaticLwpProgram, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    async getSchoolSponsorProgram(@PParent() pupil: LwpPupil): Promise<StaticLwpProgram> {
        return await this.pupilService.getSchoolSponsorProgram(pupil.id);
    }

    @ResolveField(() => [LwpPupilTag], { nullable: true })
    @AuthorizeField(TeacherField)
    async tags(@PParent() pupil: LwpPupil): Promise<LwpPupilTag[]> {
        return await this.schoolpupilTagService.getPupilTagsByPupilId(pupil.id);
    }

    @ResolveField(() => Boolean)
    @AuthorizeField(UnrestrictedField)
    async hasTopicsInCurrentAcademicYear(@PParent() pupil: LwpPupil): Promise<boolean> {
        return await this.pupilService.hasTopicsInCurrentAcademicYear(pupil.id);
    }

    @Mutation(() => Boolean)
    @AuthorizeEndpoint(TeacherOnly, [LwpPupil, OpType.Write, 'sourcePupilId'], [LwpPupil, OpType.Write, 'destinationPupilId'])
    async mergePupils(
        @AuthInfo('sub') userId: string,
        @Args('sourcePupilId') sourcePupilId: string,
        @Args('destinationPupilId') destinationPupilId: string
    ): Promise<boolean> {
        await this.pupilService.mergePupils(sourcePupilId, destinationPupilId, userId);

        return true;
    }
}
