import { Args, Mutation, Parent as PParent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ImpactReportVersion, SchoolImpactReportType, UserType } from 'lwp-shared';
import { AdminField, AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';
import { AuthInfo, AuthorizeEndpoint, Public } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { LeaderOnly } from 'src/auth/authorizers/LeaderOnly';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { OpType } from 'src/auth/types/OpType';

import { LwpSchoolImpactReportV1Output } from '../dtos/LwpSchoolImpactReportV1Output';
import { SchoolAnalyticsGraphOutput } from '../dtos/SchoolAnalyticsGraphOutput';
import { LwpSchoolDates } from '../entities/lwp_school_dates';
import { LwpSchoolImpactReport } from '../entities/lwp_school_impact_report';
import { LwpSchoolImpactReportFeedback } from '../entities/lwp_school_impact_report_feedback';
import { LwpSchoolImpactReportGraphs } from '../entities/lwp_school_impact_report_graphs';
import { LwpMagicLink } from '../entities/magic_link';
import { LwpSchool } from '../entities/school';
import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { StaticLwpPeriod } from '../entities/static_period';
import {
    GenrateSchoolImpactReportInput,
    SchoolAnalyticsDataQueryInput,
    SchoolImpactReportForMagicLinkOutput,
    UpdateSchoolImpactReportInput
} from '../model';
import { LwpSchoolImpactReportService } from '../service/lwp_school_impact_report.service';
import { LwpSchoolImpactReportFeedbackService } from '../service/lwp_school_impact_report_feedback.service';
import { StaticLwpFeaturesService } from '../service/static_lwp_features.service';

@Resolver(() => LwpSchoolImpactReport)
export class LwpSchoolImpactReportResolver {
    constructor(
        private schoolImpactReportService: LwpSchoolImpactReportService,
        private schoolImpactReportFeedbackService: LwpSchoolImpactReportFeedbackService,
        private featuresService: StaticLwpFeaturesService
    ) {}

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => LwpSchoolImpactReport)
    async generateSchoolImpactReport(
        @Args({ name: 'input', type: () => GenrateSchoolImpactReportInput }) input: GenrateSchoolImpactReportInput,
        @AuthInfo('sub') userId: string
    ): Promise<LwpSchoolImpactReport> {
        return await this.schoolImpactReportService.generateSchoolImpactReport(input, userId);
    }

    @Mutation(() => LwpMagicLink)
    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'schoolId'])
    async generateSchoolImpactReportMagicLink(
        @Args('schoolId') schoolId: string,
        @Args('termId') termId: string,
        @Args('reportType', { type: () => SchoolImpactReportType, nullable: true }) reportType: SchoolImpactReportType
    ): Promise<LwpMagicLink> {
        return await this.schoolImpactReportService.generateSchoolImpactReportMagicLink(schoolId, termId, reportType);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => LwpSchoolImpactReport)
    async updateImpactReport(
        @Args({ name: 'input', type: () => UpdateSchoolImpactReportInput }) input: UpdateSchoolImpactReportInput,
        @AuthInfo('sub') userId: string
    ): Promise<LwpSchoolImpactReport> {
        return await this.schoolImpactReportService.updateImpactReport(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async toggleNationalDataAverageDisplay(
        @Args('impactReportId') impactReportId: string,
        @Args('showNationalDataAverage') showNationalDataAverage: boolean,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        return await this.schoolImpactReportService.toggleNationalDataAverageDisplay(impactReportId, showNationalDataAverage, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async deleteGraphFromSchoolImpactReport(@Args('id') id: string, @Args('graphName') graphName: string): Promise<boolean> {
        await this.schoolImpactReportService.deleteGraphFromSchoolImpactReport(id, graphName);

        return true;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async deleteImpactReport(@Args('id') id: string): Promise<boolean> {
        await this.schoolImpactReportService.deleteImpactReport(id);

        return true;
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => LwpSchoolImpactReportV1Output, { nullable: true })
    async getSchoolImpactReport(
        @Args('schoolId') schoolId: string,
        @Args('termId') termId: string,
        @Args('reportType', { type: () => SchoolImpactReportType }) reportType: SchoolImpactReportType
    ): Promise<LwpSchoolImpactReportV1Output> {
        // School can be able to see only their published reports
        return await this.schoolImpactReportService.getV1SchoolImpactReport(schoolId, termId, reportType, true);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => LwpSchoolImpactReportV1Output, { nullable: true })
    async getSchoolImpactReportForAdmin(
        @Args('schoolId') schoolId: string,
        @Args('termId') termId: string,
        @Args('reportType', { type: () => SchoolImpactReportType }) reportType: SchoolImpactReportType
    ): Promise<LwpSchoolImpactReportV1Output> {
        return await this.schoolImpactReportService.getV1SchoolImpactReport(schoolId, termId, reportType, false);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => LwpSchoolImpactReport, { nullable: true })
    async getV2SchoolImpactReport(
        @Args('schoolId') schoolId: string,
        @Args('termId') termId: string,
        @Args('isPublished') isPublished: boolean,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<LwpSchoolImpactReport> {
        /**
         * Admins can fetch published or unpublished reports based on the isPublished flag.
         * School Leaders can only fetch published reports, regardless of the flag.
         */

        const is_published = authInfo.userType === UserType.ADMIN ? isPublished : true;

        return await this.schoolImpactReportService.getV2SchoolImpactReport(schoolId, termId, is_published);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => LwpSchoolImpactReport)
    async publishSchoolImpactReport(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<LwpSchoolImpactReport> {
        return await this.schoolImpactReportService.publishSchoolImpactReport(id, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => Boolean)
    async doesImpactReportExist(@Args('schoolId') schoolId: string, @Args('termId') termId: string): Promise<boolean> {
        return await this.schoolImpactReportService.doesImpactReportExist(schoolId, termId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => String)
    async generateImpactReportEmailLinkForSchoolLeaders(
        @Args('schoolId') schoolId: string,
        @Args('termId') termId: string,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<string> {
        return await this.schoolImpactReportService.generateImpactReportEmailLinkForSchoolLeaders(schoolId, termId, authInfo);
    }

    @Public()
    @Query(() => SchoolImpactReportForMagicLinkOutput)
    async getSchoolImpactReportFromMagicLink(@Args({ name: 'token' }) token: string): Promise<SchoolImpactReportForMagicLinkOutput> {
        return await this.schoolImpactReportService.getSchoolImpactReportFromMagicLink(token);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'input.schoolId'])
    @Query(() => SchoolAnalyticsGraphOutput, { nullable: true })
    async getSchoolAnalyticsDataQuery(
        @Args('input', { type: () => SchoolAnalyticsDataQueryInput }) input: SchoolAnalyticsDataQueryInput
    ): Promise<SchoolAnalyticsGraphOutput> {
        return await this.schoolImpactReportService.getSchoolAnalyticsDataQuery(input);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [StaticLwpSubject])
    async getSubjectsForFiltersOnTopicAnalyticGraphs(@Args('schoolId') schoolId: string): Promise<StaticLwpSubject[]> {
        return await this.schoolImpactReportService.getSubjectsForFiltersOnTopicAnalyticGraphs(schoolId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpSchoolImpactReport])
    async getSchoolImpactReportsByTerm(
        @Args('schoolId') schoolId: string,
        @Args('termId') termId: string
    ): Promise<LwpSchoolImpactReport[]> {
        return await this.schoolImpactReportService.getSchoolImpactReportsByTerm(schoolId, termId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async deleteGraphFromImpactReportV2(@Args('graphId') graphId: string, @Args('graphName') graphName: string): Promise<boolean> {
        return await this.schoolImpactReportService.deleteGraphFromImpactReportV2(graphId, graphName);
    }

    @ResolveField(() => StaticLwpPeriod)
    @AuthorizeField(TeacherField)
    async period(@PParent() impactReport: LwpSchoolImpactReport): Promise<StaticLwpPeriod> {
        return await this.schoolImpactReportService.getImpactReportPeriod(impactReport.id);
    }

    @ResolveField(() => [LwpSchoolImpactReportFeedback])
    @AuthorizeField(TeacherField)
    async feedbacks(@PParent() impactReport: LwpSchoolImpactReport): Promise<LwpSchoolImpactReportFeedback[]> {
        return await this.schoolImpactReportFeedbackService.getImpactReportFeedbacks(impactReport.id);
    }

    @ResolveField(() => Boolean, { nullable: true })
    @AuthorizeField(AdminField)
    async hasPublishedVersion(@PParent() impactReport: LwpSchoolImpactReport): Promise<boolean> {
        if (impactReport?.isPublished) return null;

        return await this.schoolImpactReportService.hasPublishedVersion(impactReport);
    }

    @ResolveField(() => LwpSchoolDates)
    @AuthorizeField(TeacherField)
    async term(@PParent() impactReport: LwpSchoolImpactReport): Promise<LwpSchoolDates> {
        return await this.schoolImpactReportService.getSchoolImpactReportTerm(impactReport.termId);
    }

    // Resolver for Impact Report Graphs - **Only for Version 2 Impact Reports**
    @ResolveField(() => [LwpSchoolImpactReportGraphs], { nullable: true })
    @AuthorizeField(TeacherField)
    async graphs(@PParent() impactReport: LwpSchoolImpactReport): Promise<LwpSchoolImpactReportGraphs[] | null> {
        if (impactReport?.version === ImpactReportVersion.VERSION_2)
            return await this.schoolImpactReportService.getV2ImpactReportGraphsById(impactReport.id);

        return null;
    }
}
