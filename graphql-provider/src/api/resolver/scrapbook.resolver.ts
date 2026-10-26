import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { OpType } from 'src/auth/types/OpType';

import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { LwpPupil } from '../entities/pupil';
import { SaveScrapbookFeedbackInput, UpdateScrapbookFeedbackInput } from '../model';
import { ScrapbookService } from '../service/scrapbook.service';

@Resolver(() => LwpPupilFeedback)
export class ScrapbookResolver {
    constructor(private scrapbookService: ScrapbookService) {}

    @AuthorizeEndpoint([LwpPupilFeedback, OpType.Write, null, { parentId: 'input.pupilId' }])
    @Mutation(() => LwpPupilFeedback)
    async saveScrapbookFeedback(
        @Args({ name: 'input' }) input: SaveScrapbookFeedbackInput,
        @Args({ name: 'imageFile', type: () => [GraphQLUpload], nullable: true }) imageFile: FileUpload[],
        @Args({ name: 'audioFile', type: () => [GraphQLUpload], nullable: true }) audioFile: FileUpload[],
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<LwpPupilFeedback> {
        return this.scrapbookService.saveScrapbookFeedback(input, imageFile, audioFile, authInfo.sub, authInfo.userType);
    }

    @AuthorizeEndpoint([LwpPupilFeedback, OpType.Write, 'input.feedbackId'])
    @Mutation(() => LwpPupilFeedback)
    async updateScrapbookFeedback(
        @Args({ name: 'input' }) input: UpdateScrapbookFeedbackInput,
        @Args({ name: 'imageFile', type: () => [GraphQLUpload], nullable: true }) imageFile: FileUpload[],
        @Args({ name: 'audioFile', type: () => [GraphQLUpload], nullable: true }) audioFile: FileUpload[],
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<LwpPupilFeedback> {
        return this.scrapbookService.updateScrapbookFeedback(input, imageFile, audioFile, authInfo.sub, authInfo.userType);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'pupilId'])
    @Query(() => [LwpPupilFeedback])
    async getScrapbookFeedbacks(
        @Args({ name: 'pupilId' }) pupilId: string,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<LwpPupilFeedback[]> {
        return this.scrapbookService.getScrapbookFeedbacks(pupilId, authInfo.userType, authInfo.userTrustLevel);
    }
}
