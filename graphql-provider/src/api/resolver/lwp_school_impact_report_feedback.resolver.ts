import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { SchoolImpactReportFeedbackContentType } from 'lwp-shared';
import { AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';

import { LwpSchoolImpactReportFeedback } from '../entities/lwp_school_impact_report_feedback';
import { LwpSchoolImpactReportFeedbackService } from '../service/lwp_school_impact_report_feedback.service';

@Resolver(() => LwpSchoolImpactReportFeedback)
export class LwpSchoolImpactReportFeedbackResolver {
    constructor(private schoolImpactReportFeedbackService: LwpSchoolImpactReportFeedbackService) {}

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async updatePupilFeedbackImpactReportContext(
        @Args({ name: 'pupilFeedbackId' }) pupilFeedbackId: string,
        @Args({ name: 'include' }) include: boolean,
        @Args({ name: 'contentType', type: () => SchoolImpactReportFeedbackContentType })
        contentType: SchoolImpactReportFeedbackContentType
    ): Promise<boolean> {
        await this.schoolImpactReportFeedbackService.updatePupilFeedbackImpactReportContext(pupilFeedbackId, include, contentType);

        return true;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async updateSchoolImpactReportFeedback(@Args({ name: 'id' }) id: string, @Args({ name: 'content' }) content: string): Promise<boolean> {
        await this.schoolImpactReportFeedbackService.updateSchoolImpactReportFeedback(id, content);

        return true;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async deleteSchoolImpactReportFeedback(@Args('id') id: string): Promise<boolean> {
        await this.schoolImpactReportFeedbackService.deleteSchoolImpactReportFeedback(id);

        return true;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async updateSchoolImpactReportFeedbackPhoto(
        @Args({ name: 'id' }) id: string,
        @Args({ name: 'file', type: () => GraphQLUpload }) file: FileUpload
    ): Promise<boolean> {
        await this.schoolImpactReportFeedbackService.updateSchoolImpactReportFeedbackPhoto(id, file);

        return true;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => String)
    async getFeedbackPhotoLink(@Args('feedbackId') feedbackId: string): Promise<string> {
        return await this.schoolImpactReportFeedbackService.getFeedbackPhotoLink(feedbackId);
    }

    @ResolveField(() => String)
    async content(@Parent() feedback: LwpSchoolImpactReportFeedback): Promise<string> {
        if (feedback?.contentType === SchoolImpactReportFeedbackContentType.PHOTO) {
            return await this.schoolImpactReportFeedbackService.getFeedbackPhotoLink(feedback.id);
        }

        return feedback?.content;
    }
}
