import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import DataLoader from 'dataloader';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { UserType } from 'lwp-shared';
import { Loader } from 'nestjs-dataloader';
import { noticeError } from 'newrelic';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { LeaderOnly } from 'src/auth/authorizers/LeaderOnly';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { OpType } from 'src/auth/types/OpType';
import { DataImportService } from 'src/data-import/service/data-import.service';
import { Connection, EntityManager } from 'typeorm';

import { SchoolAwaitingWelcome } from '../dtos/SchoolAwaitingWelcome';
import { SchoolLeaderAwaitingWelcome } from '../dtos/SchoolLeaderAwaitingWelcome';
import { SchoolResourceStatus } from '../dtos/SchoolResourceStatus';
import { SendWelcomeEmailsResult } from '../dtos/SendWelcomeEmailsResult';
import { SpmSchoolsOutput } from '../dtos/SpmSchoolsOutput';
import { ImportedSchool } from '../entities/imported_school';
import { LogSchoolClassLicense } from '../entities/log_school_class_license';
import { LwpPupil } from '../entities/pupil';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpFeatures } from '../entities/static_lwp_features';
import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { StaticLwpPeriod } from '../entities/static_period';
import { LwpUser } from '../entities/user';
import { HasSchoolLeadersAwaitingWelcomeBySchoolIdLoader } from '../loader/has_school_leaders_awaiting_welcome_by_school.loader';
import { HasUninvitedStaffBySchoolIdLoader } from '../loader/has_uninvited_staff_by_school.loader';
import { SchoolCommentsAndPhotosLoader } from '../loader/school_comments_and_photos.loader';
import { SchoolNextPeriodLoader } from '../loader/school_next_period.loader';
import { SchoolPeriodsLoader } from '../loader/school_periods.loader';
import { SchoolTagsBySchoolIdLoader } from '../loader/school_tags_by_school.loader';
import {
    GetSchoolsForSchoolOverviewInput,
    OperationStatus,
    PupilWithoutClassCounts,
    PurchaseAdditionalClassLicencesInput,
    SchoolAllowedClassesInfo,
    SchoolInput,
    SchoolSubjectType,
    UninvitedStaff,
    UpdateParentFeedbackFeatureForSchoolInput,
    UpdateSchoolClassLicenceInput,
    UpdateSchoolInput,
    UpdateSocialLoginPermissionsInput
} from '../model';
import { PupilService } from '../service/pupil.service';
import { SchoolService } from '../service/school.service';
import { SchoolClassService } from '../service/school_class.service';
import { StaticLwpFeaturesService } from '../service/static_lwp_features.service';
import { StaticLwpSchoolTagService } from '../service/static_lwp_school_tag.service';
import { TeacherService } from '../service/teacher.service';

@Resolver(() => LwpSchool)
export class SchoolResolver {
    constructor(
        private schoolService: SchoolService,
        private teacherService: TeacherService,
        private schoolClassService: SchoolClassService,
        private pupilService: PupilService,
        private staticLwpSchoolTagService: StaticLwpSchoolTagService,
        private featuresService: StaticLwpFeaturesService,
        private dataImportService: DataImportService,
        private connection: Connection
    ) {}

    @AuthorizeEndpoint(TeacherOnly)
    @Query(() => LwpSchool)
    async getTeacherSchool(@AuthInfo('sub') userId: string): Promise<LwpSchool> {
        return await this.schoolService.getTeacherSchool(userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpSchool])
    async getSchools(): Promise<LwpSchool[]> {
        return await this.schoolService.getSchools();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => SpmSchoolsOutput)
    async getSchoolsForSpm(
        @Args({ name: 'limit', nullable: true }) limit: number,
        @Args({ name: 'offset', nullable: true }) offset: number
    ): Promise<SpmSchoolsOutput> {
        return await this.schoolService.getSchoolsForSpm({ limit, offset });
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpSchool])
    async getAllSchools(): Promise<LwpSchool[]> {
        return await this.schoolService.getAllSchools();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpSchool])
    async getSchoolsForSchoolOverview(
        @Args({ name: 'filter', type: () => GetSchoolsForSchoolOverviewInput, nullable: true }) filter: GetSchoolsForSchoolOverviewInput
    ): Promise<LwpSchool[]> {
        return await this.schoolService.getSchoolsForSchoolOverview(filter);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [UninvitedStaff])
    async getUninvitedStaff(@Args({ name: 'schoolIds', type: () => [String] }) schoolIds: string[]): Promise<UninvitedStaff[]> {
        return await this.schoolService.getUninvitedStaff(schoolIds);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [SchoolAwaitingWelcome])
    async getSchoolsAwaitingWelcome(
        @Args({ name: 'schoolIds', type: () => [String] }) schoolIds: string[]
    ): Promise<SchoolAwaitingWelcome[]> {
        return await this.schoolService.getSchoolsAwaitingWelcome(schoolIds);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [SchoolLeaderAwaitingWelcome])
    async getSchoolLeadersAwaitingWelcome(@Args('schoolId') schoolId: string): Promise<SchoolLeaderAwaitingWelcome[]> {
        return await this.schoolService.getSchoolLeadersAwaitingWelcome(schoolId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => SendWelcomeEmailsResult)
    async sendSchoolLeaderWelcomeEmails(
        @Args({ name: 'schoolIds', type: () => [String] }) schoolIds: string[]
    ): Promise<SendWelcomeEmailsResult> {
        return await this.schoolService.sendSchoolLeaderWelcomeEmails(schoolIds);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchool, OpType.Read, 'id'])
    @Query(() => LwpSchool)
    async getSchool(@Args('id') id: string): Promise<LwpSchool> {
        return await this.schoolService.getSchool(id);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchool, OpType.Write, 'schoolId'])
    @Mutation(() => Boolean)
    async updateSchoolEnableReadingLogEntries(
        @Args('schoolId') schoolId: string,
        @Args('enableBookNameOnlyReadingLog') enableBookNameOnlyReadingLog: boolean
    ): Promise<boolean> {
        return await this.schoolService.updateSchoolEnableReadingLogEntries(schoolId, enableBookNameOnlyReadingLog);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Write, 'input.schoolId'])
    @Mutation(() => Boolean)
    async updateParentFeedbackFeatureForSchool(
        @Args({ name: 'input', type: () => UpdateParentFeedbackFeatureForSchoolInput }) input: UpdateParentFeedbackFeatureForSchoolInput
    ): Promise<boolean> {
        return await this.schoolService.updateParentFeedbackFeatureForSchool(input);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Write, 'schoolId'])
    @Mutation(() => Boolean)
    async enableMoneySkillsForSchool(@Args('schoolId') schoolId: string, @AuthInfo('sub') userId: string): Promise<boolean> {
        return await this.schoolService.enableMoneySkillsForSchool(schoolId, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deleteSchool(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        return await this.schoolService.deleteSchool(id, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => LwpSchool)
    async addSchool(
        @Args({ name: 'input' }) input: SchoolInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[],
        @AuthInfo('sub') userId: string
    ): Promise<LwpSchool> {
        return await this.schoolService.addSchool(input, file, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => LwpSchool)
    async updateSchool(
        @Args({ name: 'input' }) input: UpdateSchoolInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[],
        @AuthInfo('sub') userId: string
    ): Promise<LwpSchool> {
        return await this.schoolService.updateSchool(input, file, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async updateSocialLoginPermissions(@Args({ name: 'input' }) input: UpdateSocialLoginPermissionsInput): Promise<boolean> {
        return await this.schoolService.updateSocialLoginPermissions(input);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async updateSchoolClassLicence(@Args('input') input: UpdateSchoolClassLicenceInput, @AuthInfo('sub') userId: string): Promise<boolean> {
        return await this.schoolService.updateSchoolClassLicence(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    reimportSchoolsWondeData(@AuthInfo('sub') userId: string): boolean {
        // In the current model for running this call, we deliberately run it
        // in a promise that is left pending after the HTTP response returns
        // to the user to tell them that this is happening.
        // Of course, this is not a good way of doing this, but it is the currently-
        // used way of doing it.
        // TODO change! Should be on a worker process
        void this.schoolService
            .reimportSchoolsWondeData(userId)
            .catch((rej) => noticeError(rej, { caught: true, handled: false, adminPanelRequested: true }, false));

        return true;
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Write, 'input.schoolId'])
    @Mutation(() => Boolean)
    async purchaseAdditionalClassLicences(
        @Args({ name: 'input' }) input: PurchaseAdditionalClassLicencesInput,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<boolean> {
        return await this.schoolService.purchaseAdditionalClassLicences(input, authInfo.sub, authInfo.userType === UserType.ADMIN);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Write, 'schoolId'])
    @Mutation(() => LwpSchool)
    async setSchoolPeriodToCurrent(@Args({ name: 'schoolId' }) schoolId: string): Promise<LwpSchool> {
        return await this.schoolService.setSchoolPeriodToCurrent(schoolId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => LwpSchool)
    async changeSchoolPeriod(
        @Args({ name: 'schoolId' }) schoolId: string,
        @Args({ name: 'index' }) index: number,
        @AuthInfo('sub') userId: string
    ): Promise<LwpSchool> {
        const convertPreAdmissionClasses = true;

        return await this.connection.manager.transaction(
            async (manager: EntityManager) =>
                await this.schoolService.changeSchoolPeriod(schoolId, index, userId, convertPreAdmissionClasses, manager)
        );
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Write, 'schoolId'])
    @Mutation(() => Boolean)
    async enableSchoolDataDownloadQuery(
        @Args('schoolId') schoolId: string,
        @Args('isDownloadSchoolData') isDownloadSchoolData: boolean
    ): Promise<boolean> {
        return await this.schoolService.enableSchoolDataDownloadQuery(schoolId, isDownloadSchoolData);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpSchool])
    async getSchoolsByTagId(@Args('tagId') tagId: string): Promise<LwpSchool[]> {
        return await this.staticLwpSchoolTagService.getSchoolsByTagId(tagId);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => SchoolResourceStatus)
    async getSchoolResourceStatus(@Args('schoolId') schoolId: string): Promise<SchoolResourceStatus> {
        return await this.schoolService.getSchoolResourceStatus(schoolId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async updateRegionInSchoolFromWondeData(@AuthInfo('sub') userId: string): Promise<boolean> {
        await this.schoolService.updateRegionInSchoolFromWondeData(userId);

        return true;
    }

    @ResolveField()
    async schoolLeaders(@Parent() school: LwpSchool): Promise<LwpUser[]> {
        return await this.teacherService.getSchoolLeaders(school.id);
    }

    @ResolveField(() => [LwpSchoolClass])
    async classes(@Parent() school: LwpSchool): Promise<LwpSchoolClass[]> {
        return await this.schoolClassService.getSchoolClasses(school.id);
    }

    @ResolveField(() => SchoolAllowedClassesInfo)
    async remainingAllowedClassesInfo(@Parent() school: LwpSchool): Promise<SchoolAllowedClassesInfo> {
        return await this.schoolClassService.getAllowedClassesInfo(school.id);
    }

    @ResolveField(() => [LwpPupil])
    async pupils(@Parent() school: LwpSchool): Promise<LwpPupil[]> {
        return await this.pupilService.getNonMISSchoolPupils(school.id);
    }

    @ResolveField(() => ImportedSchool)
    async importedSchool(@Parent() school: LwpSchool): Promise<ImportedSchool> {
        return await this.schoolService.getSchoolImportedSchool(school.id);
    }

    @ResolveField(() => StaticLwpPeriod)
    async curentPeriod(
        @Parent() school: LwpSchool,
        @Loader(SchoolPeriodsLoader) periodsLoader: DataLoader<string, StaticLwpPeriod>
    ): Promise<StaticLwpPeriod> {
        return periodsLoader.load(school.id);
    }

    @ResolveField(() => StaticLwpPeriod, { nullable: true })
    async nextPeriod(
        @Parent() school: LwpSchool,
        @Loader(SchoolNextPeriodLoader) nextPeriodLoader: DataLoader<string, StaticLwpPeriod>
    ): Promise<StaticLwpPeriod | null> {
        return nextPeriodLoader.load(school.id);
    }

    @ResolveField(() => String)
    logo(@Parent() school: LwpSchool): string {
        return this.schoolService.getSchoolLogo(school?.logo);
    }

    @ResolveField(() => Number)
    @AuthorizeField(TeacherField)
    async pupilsActive(@Parent() school: LwpSchool): Promise<number> {
        return await this.schoolService.getSchoolPupilsActive(school?.id);
    }

    @ResolveField(() => Number)
    @AuthorizeField(TeacherField)
    async starsEarned(@Parent() school: LwpSchool): Promise<number> {
        return await this.schoolService.getSchoolStarsEarned(school?.id);
    }

    @ResolveField(() => Number)
    @AuthorizeField(TeacherField)
    async commentsAndPhotos(
        @Parent() school: LwpSchool,
        @Loader(SchoolCommentsAndPhotosLoader) commentsLoader: DataLoader<string, number>
    ): Promise<number> {
        return commentsLoader.load(school.id);
    }

    @ResolveField(() => String, { nullable: true })
    @AuthorizeField(TeacherField)
    misName(@Parent() school: LwpSchool): string | null {
        return school.misIntegration;
    }

    @ResolveField(() => [LogSchoolClassLicense])
    @AuthorizeField(TeacherField)
    async logSchoolClassLicenses(@Parent() school: LwpSchool): Promise<LogSchoolClassLicense[]> {
        return await this.schoolService.logSchoolClassLicensesOfSchool(school?.id);
    }

    @ResolveField(() => SchoolSubjectType, { nullable: true })
    @AuthorizeField(TeacherField)
    async schoolSubjectType(@Parent() school: LwpSchool): Promise<SchoolSubjectType | null> {
        return await this.schoolService.getSchoolSubjectType(school.id);
    }

    @ResolveField(() => StaticLwpSchoolTag, { nullable: true })
    async tags(
        @Parent() school: LwpSchool,
        @Loader(SchoolTagsBySchoolIdLoader) schoolTagsLoader: DataLoader<string, StaticLwpSchoolTag[]>
    ): Promise<StaticLwpSchoolTag[]> {
        return schoolTagsLoader.load(school.id);
    }

    /**
     * The ids of this school's tags, and nothing else.
     *
     * Kept deliberately separate from `tags` above, which stays admin-only. Parents need
     * to match their own school against the tag ids chosen on an activity step (see
     * ActivityStepVisibilityRules), so this field is readable by anyone, but it exposes
     * only opaque ids: never tag names, colours, or which other schools carry a tag.
     *
     * If you ever need to widen what parents can see here, don't. Add a separate field.
     */
    @ResolveField(() => [String])
    @AuthorizeField(UnrestrictedField)
    async tagIds(
        @Parent() school: LwpSchool,
        @Loader(SchoolTagsBySchoolIdLoader) schoolTagsLoader: DataLoader<string, StaticLwpSchoolTag[]>
    ): Promise<string[]> {
        const tags = await schoolTagsLoader.load(school.id);

        return (tags ?? []).map((tag) => tag.id);
    }

    @ResolveField(() => Boolean)
    async hasUninvitedStaff(
        @Parent() school: LwpSchool,
        @Loader(HasUninvitedStaffBySchoolIdLoader) hasUninvitedStaffLoader: DataLoader<string, boolean>
    ): Promise<boolean> {
        return hasUninvitedStaffLoader.load(school.id);
    }

    @ResolveField(() => Boolean)
    async hasSchoolLeadersAwaitingWelcome(
        @Parent() school: LwpSchool,
        @Loader(HasSchoolLeadersAwaitingWelcomeBySchoolIdLoader) awaitingWelcomeLoader: DataLoader<string, boolean>
    ): Promise<boolean> {
        return awaitingWelcomeLoader.load(school.id);
    }

    @ResolveField(() => Boolean, { nullable: true })
    async impactReportExists(@Parent() school: LwpSchool): Promise<boolean> {
        return this.schoolService.impactReportExists(school.id);
    }

    @ResolveField(() => Boolean, { nullable: true })
    async features(@Parent() school: LwpSchool): Promise<StaticLwpFeatures[]> {
        return this.featuresService.getSchoolFeatures(school.id);
    }

    @ResolveField(() => Boolean, { nullable: true })
    async isReadyTeddyEnabled(@Parent() school: LwpSchool): Promise<boolean> {
        return this.featuresService.isReadyTeddyEnabledForSchool(school.id);
    }

    @ResolveField(() => PupilWithoutClassCounts, { nullable: true })
    async pupilsWithoutClassesCount(@Parent() school: LwpSchool): Promise<PupilWithoutClassCounts> {
        return this.schoolService.getPupilsWithoutClassesCount(school.id);
    }

    @ResolveField(() => Number, { nullable: true })
    async pupilsWithoutMISCount(@Parent() school: LwpSchool): Promise<number> {
        return this.pupilService.schoolPupilsWithoutMISBaseQuery(school.id).getCount();
    }

    @ResolveField(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    async isDataQueryAvailableForSchool(@Parent() school: LwpSchool): Promise<boolean> {
        return await this.schoolService.isDataQueryAvailableForSchool(school.id);
    }

    @ResolveField(() => Boolean, { nullable: true })
    async isDataImportReviewEnabledForSchool(@Parent() school: LwpSchool): Promise<boolean> {
        return this.dataImportService.isReviewRequiredForSchool(school.id);
    }

    @ResolveField(() => Boolean, { nullable: true })
    async isScrapbookEnabledForSchool(@Parent() school: LwpSchool): Promise<boolean> {
        return await this.featuresService.isScrapbookEnabledForSchool(school.id);
    }

    @ResolveField(() => Number)
    async pendingImportActionsCount(@Parent() school: LwpSchool): Promise<number> {
        if (!school?.importedSchoolId) return 0;

        return await this.schoolService.getPendingImportActionsCount(school.importedSchoolId, school.importStatus);
    }
}
