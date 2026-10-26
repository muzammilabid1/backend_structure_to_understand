import { HttpException, Inject } from '@nestjs/common';
import { Args, Context, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import { MINIO_CONNECTION } from 'nestjs-minio';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { OpType } from 'src/auth/types/OpType';
import { UserTrustLevel } from 'src/auth/types/UserTrustLevel';
import { Stream } from 'stream';
import { Repository } from 'typeorm';

import { StaticLwpActivity } from '../entities/activity';
import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilTopic } from '../entities/pupil_topic';
import { LwpPupilActivity } from '../entities/pupil-activity';
import {
    ErrorStatusCodeEnum,
    MathscotChoicesInput,
    MathscotChoicesOutput,
    OperationStatus,
    PupilActivitiesOfPupilTopicOutput
} from '../model';
import { ActivityService } from '../service/activity.service';
import { HelperService } from '../service/helper.service';
import { LwpPupilFeedbackService } from '../service/lwp_pupil_feedback.service';
import { MathscotItemService } from '../service/mathscot-item.service';
import { PupilService } from '../service/pupil.service';
import { PupilActivityService } from '../service/pupil_activity.service';
import { PupilMathscotService } from '../service/pupil_mathscot.service';
import { PupilTopicService } from '../service/pupil_topic.service';

@Resolver(() => LwpPupilActivity)
export class PupilActivityResolver {
    constructor(
        @InjectRepository(LwpPupilActivity) private pupilActivityRepository: Repository<LwpPupilActivity>,
        @InjectRepository(LwpPupil) private pupilRepository: Repository<LwpPupil>,
        @Inject(MINIO_CONNECTION) private readonly minioClient,
        private mathscotItemService: MathscotItemService,
        private pupilActivityService: PupilActivityService,
        private pupilService: PupilService,
        private pupilFeedbackService: LwpPupilFeedbackService,
        private activityService: ActivityService,
        private pupilTopicService: PupilTopicService,
        private pupilMathscotService: PupilMathscotService,
        private helperService: HelperService
    ) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpPupilActivity])
    async allPupilActivity(): Promise<LwpPupilActivity[]> {
        return this.pupilActivityRepository.find();
    }

    async findOrCreate(pupil: LwpPupil): Promise<LwpPupilActivity> {
        return (
            (await this.pupilActivityRepository.findOne({ pupil: { id: pupil?.id } })) ??
            (await this.pupilActivityRepository.save({ pupil: { id: pupil?.id } }))
        );
    }

    async validateGetPupil(id: string): Promise<LwpPupil> {
        const pupil = await this.pupilRepository.findOne({ where: { id } });

        if (!pupil) {
            throw new HttpException('Invalid Pupil', ErrorStatusCodeEnum._535);
        }

        return pupil;
    }

    async streamToBuffer(s: Stream): Promise<Buffer> {
        return new Promise((res, rej) => {
            const bufs = [];

            s.on('data', (d) => bufs.push(d));
            s.on('end', () => res(Buffer.concat(bufs)));
            s.on('error', rej);
        });
    }

    async getWaterMarkImage(): Promise<Buffer> {
        return this.streamToBuffer(fs.createReadStream('./src/resources/watermark.png'));
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'input.pupilId', { requiredTrust: UserTrustLevel.Full }])
    @Mutation(() => String)
    async previewPupilMathscot(@Args({ name: 'input' }) input: MathscotChoicesInput): Promise<string> {
        const adultMathscot = (
            await this.mathscotItemService.getMathscotUrlsByInputWithoutSave({
                ids: input?.itemIds ?? [],
                pupilId: input?.pupilId,
                colour: input.colour,
                character: input.character
            })
        )?.bigImage;

        return adultMathscot ?? null;
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'input.pupilId'])
    @Mutation(() => MathscotChoicesOutput)
    async generateMathscotChoices(@Args({ name: 'input' }) input: MathscotChoicesInput): Promise<MathscotChoicesOutput> {
        const currentMathscot = await this.pupilMathscotService.getPupilCurrentPupilMathscot(input.pupilId);

        const adultMathscot = (
            await this.mathscotItemService.getMathscotUrlsByInputWithoutSave({
                ids: currentMathscot?.items,
                pupilId: input.pupilId,
                colour: input.colour,
                character: input.character
            })
        )?.bigImage;

        if (!adultMathscot) throw new HttpException(`No Mathscot found. Please set your mathscot.`, ErrorStatusCodeEnum._535);

        const ids =
            input?.itemIds ?? (await this.pupilActivityRepository.findOne({ pupil: { id: input.pupilId } }))?.mathscotActivityItemIds ?? [];

        const pupilMathscotItems = currentMathscot?.items?.filter((id) => !ids.includes(id)) ?? [];

        const mergedItems = await Promise.all(
            ids.map(async (id) => {
                const mergedUrl = await this.mathscotItemService.addMathscotIdsToInput(
                    {
                        ids: pupilMathscotItems,
                        pupilId: input.pupilId,
                        colour: input.colour,
                        character: input.character
                    },
                    id.toString()
                );

                return { id: id.toString(), mergedUrl };
            })
        );

        return {
            adultMathscot,
            mergedItems
        };
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'id'])
    @Query(() => [LwpPupilActivity])
    async getPupilActivities(@Args('id') id: string): Promise<LwpPupilActivity[]> {
        return await this.pupilActivityService.getPupilActivities(id);
    }

    @AuthorizeEndpoint([LwpPupilActivity, OpType.Read, 'id'])
    @Query(() => LwpPupilActivity)
    async getPupilActivity(@Args('id') id: string, @AuthInfo() authInfo: AuthTokenJWT): Promise<LwpPupilActivity> {
        return await this.pupilActivityService.getPupilActivity(id, authInfo.sub, authInfo.userType);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [PupilActivitiesOfPupilTopicOutput])
    async getPupilActivitiesOfPupilTopic(
        @Args({ name: 'pupilTopicId' }) pupilTopicId: string
    ): Promise<PupilActivitiesOfPupilTopicOutput[]> {
        return await this.pupilActivityService.getPupilActivitiesOfPupilTopic(pupilTopicId);
    }

    @AuthorizeEndpoint([LwpPupilActivity, OpType.Write, 'id'])
    @Mutation(() => LwpPupilActivity)
    async savePupilActivityRating(
        @Args({ name: 'id' }) id: string,
        @Args({ name: 'rating' }) rating: number,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<LwpPupilActivity> {
        return await this.pupilActivityService.savePupilActivityRating(id, rating, authInfo.sub, authInfo.userType);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => LwpPupilActivity)
    async updatePupilActivity(
        @Args({ name: 'id' }) id: string,
        @Args({ name: 'earnedStar' }) earnedStar: boolean,
        @Args({ name: 'rating', nullable: true }) rating: number,
        @AuthInfo('sub') userId: string
    ): Promise<LwpPupilActivity> {
        return await this.pupilActivityService.updatePupilActivity(id, earnedStar, rating, userId);
    }

    @AuthorizeEndpoint([LwpPupilActivity, OpType.Read, 'pupilActivityId'])
    @Mutation(() => LwpPupilActivity)
    async increaseAccessCount(@Args({ name: 'pupilActivityId' }) pupilActivityId: string, @Context() context): Promise<LwpPupilActivity> {
        return await this.pupilActivityService.increaseAccessCount(
            pupilActivityId,
            this.helperService.extractDeviceTypeFromContext(context)
        );
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deletePupilActivity(@Args({ name: 'id' }) id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        return await this.pupilActivityService.deletePupilActivities([id], userId);
    }

    @AuthorizeEndpoint([LwpPupilActivity, OpType.Write, 'pupilActivityId'])
    @Mutation(() => LwpPupilActivity)
    async updateActivityContext(
        @Args({ name: 'pupilActivityId' }) pupilActivityId: string,
        @Args({ name: 'pupilActivityContext' }) pupilActivityContext: string
    ): Promise<LwpPupilActivity> {
        return await this.pupilActivityService.updateActivityContext(pupilActivityId, pupilActivityContext);
    }

    @ResolveField(() => LwpPupil)
    async pupil(@Parent() activity: LwpPupilActivity): Promise<LwpPupil> {
        return await this.pupilService.getPupilActivityPupil(activity.id);
    }

    @ResolveField(() => [LwpPupilFeedback])
    async feedbacks(@Parent() activity: LwpPupilActivity, @AuthInfo() authInfo: AuthTokenJWT): Promise<LwpPupilFeedback[]> {
        return await this.pupilFeedbackService.getPupilActivityFeedByPupilActivity(activity.id, authInfo.userTrustLevel);
    }

    @ResolveField(() => StaticLwpActivity)
    async activity(@Parent() activity: LwpPupilActivity): Promise<StaticLwpActivity> {
        return await this.activityService.getActivityByPupilActivity(activity.id);
    }

    @ResolveField(() => Boolean)
    async isInCurrentAcademicYear(@Parent() activity: LwpPupilActivity): Promise<boolean> {
        return await this.pupilActivityService.isPupilActivityInCurrentAcademicYear(activity.id);
    }

    @ResolveField(() => Boolean)
    async isInPreviousAcademicYear(@Parent() activity: LwpPupilActivity): Promise<boolean> {
        return await this.pupilActivityService.isPupilActivityInPreviousAcademicYear(activity.id);
    }

    @ResolveField(() => LwpPupilTopic)
    async topic(@Parent() activity: LwpPupilActivity): Promise<LwpPupilTopic> {
        return await this.pupilTopicService.getPupilTopicByPupilActivity(activity.id);
    }
}
