import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileUpload } from 'graphql-upload';
import moment from 'moment';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { UserTrustLevel } from 'src/auth/types/UserTrustLevel';
import { UserType } from 'src/auth/types/UserType';
import { appConstants } from 'src/constants';
import { Repository } from 'typeorm';

import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilTopic } from '../entities/pupil_topic';
import { StaticLwpPeriod } from '../entities/static_period';
import { LwpUser } from '../entities/user';
import { ErrorStatusCodeEnum, FeedbackType, MediaType, SaveScrapbookFeedbackInput, UpdateScrapbookFeedbackInput } from '../model';
import { LwpPupilFeedbackMediaService } from './lwp_pupil_feedback_media.service';

@Injectable()
export class ScrapbookService {
    constructor(
        @InjectRepository(LwpPupilFeedback)
        private pupilFeedbackRepository: Repository<LwpPupilFeedback>,
        @InjectRepository(LwpPupilTopic)
        private pupilTopicRepository: Repository<LwpPupilTopic>,
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        private shallowUserService: ShallowUserService,
        private pupilFeedbackMediaService: LwpPupilFeedbackMediaService
    ) {}

    public async saveScrapbookFeedback(
        input: SaveScrapbookFeedbackInput,
        imageFile: FileUpload[],
        audioFile: FileUpload[],
        userId: string,
        userType: UserType
    ): Promise<LwpPupilFeedback> {
        if (![UserType.PARENT, UserType.ADMIN].includes(userType)) {
            throw new HttpException('Only parents can create scrapbook entries', ErrorStatusCodeEnum._535);
        }

        // The entry is filed under the period of the topic it answers, not the school's current period. A
        // pre-admission class sits a year ahead of its school, so the two differ until the year rolls over, and
        // an entry stamped with the school's year stops counting as an answer the moment it does.
        const pupilTopic = await this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .innerJoin('pupilTopic.pupil', 'pupil')
            .innerJoin('pupilTopic.period', 'period')
            .select('pupil.id', 'pupilId')
            .addSelect('period.index', 'periodIndex')
            .where('pupilTopic.id = :pupilTopicId', { pupilTopicId: input.pupilTopicId })
            .andWhere('pupil.id = :pupilId', { pupilId: input.pupilId })
            .getRawOne<{ pupilId: string; periodIndex: number }>();

        if (!pupilTopic) {
            throw new HttpException('Invalid pupil topic ID', ErrorStatusCodeEnum._535);
        }

        const shallowUser = this.shallowUserService.newShallowUser(userId);
        const feedback = new LwpPupilFeedback();

        feedback.type = FeedbackType.SCRAPBOOK;
        feedback.comment = input.comment ?? null;
        feedback.userType = userType;
        feedback.userId = userId;
        feedback.logCreatedBy = shallowUser;
        feedback.logUpdatedBy = shallowUser;
        feedback.sharingAllowed = input.sharingAllowed;
        feedback.scrapbookPrompt = input.scrapbookPrompt;
        feedback.pupils = [{ id: pupilTopic.pupilId } as LwpPupil];
        feedback.period = { index: pupilTopic.periodIndex } as StaticLwpPeriod;
        feedback.logSubmittedOnDesktop = 0;
        feedback.logSubmittedOnMobile = 0;

        const savedFeedback = await this.pupilFeedbackRepository.save(feedback);

        if (input.sharingAllowedGlobal) await this.userRepository.update(userId, { sharingAllowed: input.sharingAllowed });

        const mediaPromises: Promise<void>[] = [];

        if (imageFile?.filter((f) => f).length) {
            mediaPromises.push(
                this.pupilFeedbackMediaService.addFeedbackMedia(
                    imageFile,
                    MediaType.PHOTO,
                    appConstants.minioPaths.usermedia.uploadedScrapbookImages,
                    savedFeedback,
                    userId
                )
            );
        }

        if (audioFile?.filter((f) => f).length) {
            mediaPromises.push(
                this.pupilFeedbackMediaService.addFeedbackMedia(
                    audioFile,
                    MediaType.AUDIO,
                    appConstants.minioPaths.usermedia.uploadedScrapbookAudio,
                    savedFeedback,
                    userId
                )
            );
        }

        await Promise.all(mediaPromises);

        return savedFeedback;
    }

    public async updateScrapbookFeedback(
        input: UpdateScrapbookFeedbackInput,
        imageFile: FileUpload[],
        audioFile: FileUpload[],
        userId: string,
        userType: UserType
    ): Promise<LwpPupilFeedback> {
        if (userType !== UserType.PARENT) {
            throw new HttpException('Only parents can update scrapbook entries', ErrorStatusCodeEnum._535);
        }

        const feedback = await this.pupilFeedbackRepository.findOne({
            where: { id: input.feedbackId, type: FeedbackType.SCRAPBOOK },
            select: ['id', 'userId', 'type']
        });

        if (!feedback) {
            throw new HttpException('Scrapbook entry not found', ErrorStatusCodeEnum._535);
        }

        if (feedback.userId !== userId) {
            throw new HttpException('You can only update your own scrapbook entries', ErrorStatusCodeEnum._535);
        }

        const shallowUser = this.shallowUserService.newShallowUser(userId);

        if (input.comment) feedback.comment = input.comment;
        feedback.logUpdatedBy = shallowUser;

        const savedFeedback = await this.pupilFeedbackRepository.save(feedback);

        if (imageFile?.filter((f) => f).length) {
            await this.pupilFeedbackMediaService.checkForExistingFile(input.feedbackId, MediaType.PHOTO, FeedbackType.SCRAPBOOK);
            await this.pupilFeedbackMediaService.addFeedbackMedia(
                imageFile,
                MediaType.PHOTO,
                appConstants.minioPaths.usermedia.uploadedScrapbookImages,
                savedFeedback,
                userId
            );
        }

        if (audioFile?.filter((f) => f).length) {
            await this.pupilFeedbackMediaService.checkForExistingFile(input.feedbackId, MediaType.AUDIO, FeedbackType.SCRAPBOOK);
            await this.pupilFeedbackMediaService.addFeedbackMedia(
                audioFile,
                MediaType.AUDIO,
                appConstants.minioPaths.usermedia.uploadedScrapbookAudio,
                savedFeedback,
                userId
            );
        }

        return savedFeedback;
    }

    public async getScrapbookFeedbacks(pupilId: string, userType: UserType, userTrustLevel: UserTrustLevel): Promise<LwpPupilFeedback[]> {
        const query = this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .innerJoin('feedback.pupils', 'pupil')
            .innerJoin('pupil.school', 'school')
            .innerJoin('school.curentPeriod', 'schoolPeriod')
            .innerJoin('feedback.period', 'feedbackPeriod')
            .where('pupil.id = :pupilId', { pupilId })
            .andWhere('feedback.type = :type', { type: FeedbackType.SCRAPBOOK })
            // >= rather than =: a pre-admission entry is filed under its class's year, which stays ahead of the
            // school's until the rollover. Equality would hide it for the whole year the parent wrote it in.
            .andWhere('"feedback"."periodIndex" >= "school"."curentPeriodIndex"')
            .andWhere('feedback.entryDeletedAt IS NULL')
            .orderBy('feedback.logCreatedAt', 'DESC');

        if (userTrustLevel === UserTrustLevel.Limited) {
            query.andWhere('feedback.originalFeedbackId IS NULL');
            if (userType === UserType.PARENT) {
                query.andWhere('feedback.logCreatedAt >= :twoWeeksAgo', {
                    twoWeeksAgo: moment().subtract(14, 'days').format('YYYY-MM-DD')
                });
            }
        }

        return query.getMany();
    }
}
