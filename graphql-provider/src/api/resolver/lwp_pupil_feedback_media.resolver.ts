import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { OpType } from 'src/auth/types/OpType';

import { PresignedUrlOutput } from '../dtos/PresignedUrlOutput';
import { LwpPupilFeedbackMedia } from '../entities/lwp_pupil_feedback_media';
import { FeedbackType, MediaType } from '../model';
import { LwpPupilFeedbackMediaService } from '../service/lwp_pupil_feedback_media.service';

@Resolver(() => LwpPupilFeedbackMedia)
export class LwpPupilFeedbackMediaResolver {
    constructor(private pupilFeedbackMediaService: LwpPupilFeedbackMediaService) {}

    @AuthorizeEndpoint([LwpPupilFeedbackMedia, OpType.Write, null])
    @Mutation(() => PresignedUrlOutput)
    async presignedUrlForFeedbackMedia(
        @Args({ name: 'fileName' }) fileName: string,
        @Args({ name: 'mediaType', type: () => MediaType }) mediaType: MediaType,
        @Args({ name: 'feedbackType', type: () => FeedbackType }) feedbackType: FeedbackType,
        @AuthInfo('sub') userId: string
    ): Promise<PresignedUrlOutput> {
        return this.pupilFeedbackMediaService.getFeedbackMediaPresignedUrl(fileName, feedbackType, mediaType, userId);
    }
}
