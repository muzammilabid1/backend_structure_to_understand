import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileUpload } from 'graphql-upload';
import { constants, PupilParentStatus, SubjectProgrammeType } from 'lwp-shared';
import { MediaTypeForAllFeeds } from 'lwp-shared/enums/MediaTypeForAllFeeds';
import moment from 'moment';
import newrelic from 'newrelic/index';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { UserTrustLevel } from 'src/auth/types/UserTrustLevel';
import { UserType } from 'src/auth/types/UserType';
import { LogParentPupilActions } from 'src/common/log_parent_pupil_action.actions';
import { appConstants } from 'src/constants';
import { Pagination } from 'src/paginate';
import {
    BaseEntity,
    Brackets,
    Connection,
    EntityManager,
    In,
    QueryFailedError,
    QueryRunner,
    Repository,
    SelectQueryBuilder
} from 'typeorm';

import { PupilReadingTopicOutput } from '../dtos/PupilReadingTopicOutput';
import { LwpFeedbackReply } from '../entities/lwp_feedback_reply';
import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { LwpPupilFeedbackEditLog } from '../entities/lwp_pupil_feedback_edit_log';
import { LwpPupilFeedbackMedia } from '../entities/lwp_pupil_feedback_media';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilTopic } from '../entities/pupil_topic';
import { LwpPupilActivity } from '../entities/pupil-activity';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { LwpUser } from '../entities/user';
import { LwpViewReadingLogToReadingTopic } from '../entities/views/reading_log_to_reading_topic';
import {
    ActivityTypeForAllFeeds,
    AddReadingLogAsGroupInput,
    AddReadingLogInput,
    DeviceType,
    ErrorStatusCodeEnum,
    FeedbackType,
    LastPupilHistoryOutput,
    LikePupilActivityFeedbackInput,
    LogParentPupilActionInput,
    MediaType,
    OperationStatus,
    PupilActivityFeedbackInput,
    PupilActivityFeedsFilterInput,
    PupilHistoryOutput,
    PupilOwnActivityFeedbackInput,
    ReadingMode,
    ReadingType,
    UpdateReadingLogAsGroupInput,
    UpdateReadingLogInput
} from '../model';
import { HelperService } from './helper.service';
import { LogParentPupilActionService } from './log_parent_pupil_action.service';
import { LwpPupilFeedbackMediaService } from './lwp_pupil_feedback_media.service';

@Injectable()
export class LwpPupilFeedbackService {
    constructor(
        @InjectRepository(LwpPupilFeedback)
        private pupilFeedbackRepository: Repository<LwpPupilFeedback>,
        @InjectRepository(LwpPupilFeedbackMedia)
        private pupilFeedbackMediaRepository: Repository<LwpPupilFeedbackMedia>,
        @InjectRepository(LwpPupilActivity)
        private pupilActivityRepository: Repository<LwpPupilActivity>,
        @InjectRepository(LwpPupil)
        private pupilRepository: Repository<LwpPupil>,
        @InjectRepository(LwpPupilTopic)
        private pupilTopicRepository: Repository<LwpPupilTopic>,
        @InjectRepository(LwpSchoolClass)
        private schoolClassRepository: Repository<LwpSchoolClass>,
        @InjectRepository(LwpSchool)
        private schoolRepository: Repository<LwpSchool>,
        @InjectRepository(LwpPupilFeedbackEditLog)
        private pupilFeedbackHistoryLogRepository: Repository<LwpPupilFeedbackEditLog>,
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        @InjectRepository(LwpPupilFeedbackEditLog)
        private pupilFeedbackEditLogRepository: Repository<LwpPupilFeedbackEditLog>,
        @InjectRepository(LwpFeedbackReply)
        private feedbackReplyRepository: Repository<LwpFeedbackReply>,
        @InjectRepository(StaticLwpSubject)
        private subjectRepository: Repository<StaticLwpSubject>,
        private helperService: HelperService,
        private shallowUserService: ShallowUserService,
        private logParentPupilActionService: LogParentPupilActionService,
        private pupilFeedbackMediaService: LwpPupilFeedbackMediaService,
        private connection: Connection
    ) {}

    public async getTopicReadingLogFeedbacks(pupilTopicId: string): Promise<LwpPupilFeedback[]> {
        const readingFeedbacks = await this.joinToReadingTopic(this.pupilFeedbackRepository.createQueryBuilder('feedback'))
            .where('readingPupilTopic.id = :pupilTopicId', { pupilTopicId })
            .andWhere('feedback.type = :type', { type: FeedbackType.READING })
            .orderBy('feedback.logCreatedAt', 'ASC')
            .getMany();

        return readingFeedbacks?.length > 0 ? readingFeedbacks : [];
    }

    /**
     * Batch loading method for DataLoader to get reading log feedbacks for multiple topic IDs
     * @param topicIds Array of pupil topic IDs
     * @returns Promise resolving to array of feedback arrays in same order as input keys
     */
    public async getReadingLogFeedbacksByTopicIds(topicIds: readonly string[]): Promise<LwpPupilFeedback[][]> {
        const results = await this.joinToReadingTopic(this.pupilFeedbackRepository.createQueryBuilder('feedback'))
            .where('readingPupilTopic.id IN (:...topicIds)', { topicIds: topicIds as string[] })
            .andWhere('feedback.type = :type', { type: FeedbackType.READING })
            .addSelect('readingPupilTopic.id', 'topicId')
            .orderBy('feedback.logCreatedAt', 'ASC')
            .getRawAndEntities();

        const feedbacks = results.entities;
        const rawResults = results.raw;

        // Create a map to associate each feedback with its topic ID
        const feedbackToTopicMap = new Map<string, string>();

        rawResults.forEach((raw, index) => {
            if (feedbacks[index]) {
                feedbackToTopicMap.set(feedbacks[index].id, raw.topicId);
            }
        });

        // Group feedbacks by topic ID and return in same order as input keys
        return topicIds.map((topicId) => feedbacks.filter((feedback) => feedbackToTopicMap.get(feedback.id) === topicId));
    }

    public async getPupilActivityFeedByPupilActivity(pupilActivityId: string, userTrustLevel: UserTrustLevel): Promise<LwpPupilFeedback[]> {
        const feedbacksBaseQuery = this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .leftJoinAndSelect('feedback.activity', 'pupilActivity')
            .where('pupilActivity.id = :pupilActivityId', { pupilActivityId })
            .andWhere('feedback.type = :type', { type: FeedbackType.ACTIVITY })
            .andWhere('feedback.id IS NOT NULL');

        if (userTrustLevel === UserTrustLevel.Limited) {
            feedbacksBaseQuery.andWhere('feedback.originalFeedbackId IS NULL');
        }

        const feedbacks = await feedbacksBaseQuery.orderBy('feedback.logCreatedAt', 'DESC').getMany();

        return feedbacks?.length > 0 ? feedbacks : [];
    }

    public async getFeedbackPrivateNote(feedbackId: string): Promise<string> {
        const feedback = await this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .where('feedback.id = :feedbackId', { feedbackId })
            .getOne();

        return feedback?.privateNote;
    }

    public async getFeedbackPresignedPhotos(feedbackId: string): Promise<Omit<LwpPupilFeedbackMedia, keyof BaseEntity>[]> {
        const feedback = await this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .innerJoin('feedback.media', 'media')
            .where('feedback.id = :feedbackId', { feedbackId })
            .andWhere('media.type = :mediaType', { mediaType: MediaType.PHOTO })
            .select(['feedback.type', 'media.id', 'media.filename'])
            .getOne();

        const feedbackMediaPhotos: Omit<LwpPupilFeedbackMedia, keyof BaseEntity>[] = [];

        if (!feedback || feedback?.media?.length === 0) return feedbackMediaPhotos;

        if (feedback?.media?.length > 0) {
            for (const feedbackMedia of feedback.media) {
                let photoPath: string;

                if (feedback?.type === FeedbackType.ACTIVITY) {
                    photoPath = appConstants.minioPaths.usermedia.uploadedImages;
                } else if (feedback?.type === FeedbackType.SCRAPBOOK) {
                    photoPath = appConstants.minioPaths.usermedia.uploadedScrapbookImages;
                } else {
                    photoPath = appConstants.minioPaths.usermedia.uploadedReadingImages;
                }

                const feedbackPhoto = await this.helperService.getUsermediaUrl(`${photoPath}/${feedbackMedia?.filename}`);

                feedbackMediaPhotos.push({ ...feedbackMedia, filename: feedbackPhoto });
            }
        }

        return feedbackMediaPhotos;
    }

    public async getFeedbackPresignedAudios(feedbackId: string): Promise<Omit<LwpPupilFeedbackMedia, keyof BaseEntity>[]> {
        const feedback = await this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .innerJoin('feedback.media', 'media')
            .where('feedback.id = :feedbackId', { feedbackId })
            .andWhere('media.type = :mediaType', { mediaType: MediaType.AUDIO })
            .select(['feedback.type', 'media.id', 'media.filename'])
            .getOne();

        const feedbackMediaAudios: Omit<LwpPupilFeedbackMedia, keyof BaseEntity>[] = [];

        if (!feedback || feedback?.media?.length === 0) return feedbackMediaAudios;

        if (feedback?.type === FeedbackType.READING && feedback?.media?.length > 0) {
            for (const feedbackMedia of feedback.media) {
                const feedbackAudio = await this.helperService.getUsermediaUrl(
                    `${appConstants.minioPaths.usermedia.uploadedReadingAudio}/${feedbackMedia?.filename}`
                );

                feedbackMediaAudios.push({ ...feedbackMedia, filename: feedbackAudio });
            }
        } else if (feedback?.type === FeedbackType.SCRAPBOOK && feedback?.media?.length > 0) {
            for (const feedbackMedia of feedback.media) {
                const feedbackAudio = await this.helperService.getUsermediaUrl(
                    `${appConstants.minioPaths.usermedia.uploadedScrapbookAudio}/${feedbackMedia?.filename}`
                );

                feedbackMediaAudios.push({ ...feedbackMedia, filename: feedbackAudio });
            }
        }

        return feedbackMediaAudios;
    }

    public async getFeedbackPhotos(feedbackId: string): Promise<string[]> {
        const feedback = await this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .innerJoinAndSelect('feedback.media', 'media')
            .where('feedback.id = :feedbackId', { feedbackId })
            .andWhere('media.type = :mediaType', { mediaType: MediaType.PHOTO })
            .getOne();
        const feedbackPhotos: string[] = [];

        if (!feedback) return feedbackPhotos;

        if (feedback?.type === FeedbackType.ACTIVITY) {
            if (feedback?.media?.length > 0) {
                for (const feedbackMedia of feedback.media) {
                    feedbackPhotos.push(feedbackMedia?.filename);
                }
            }
        }

        if (feedback?.type === FeedbackType.READING) {
            if (feedback?.media?.length > 0) {
                for (const feedbackMedia of feedback.media) {
                    feedbackPhotos.push(feedbackMedia?.filename);
                }
            }
        }

        return feedbackPhotos;
    }

    public async getFeedbackAudios(feedbackId: string): Promise<string[]> {
        const feedback = await this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .innerJoinAndSelect('feedback.media', 'media')
            .where('feedback.id = :feedbackId', { feedbackId })
            .andWhere('media.type = :mediaType', { mediaType: MediaType.AUDIO })
            .getOne();
        const feedbackAudios: string[] = [];

        if (!feedback) return feedbackAudios;

        if (feedback?.type === FeedbackType.READING) {
            if (feedback?.media?.length > 0) {
                for (const feedbackMedia of feedback.media) {
                    feedbackAudios.push(feedbackMedia?.filename);
                }
            }
        }

        return feedbackAudios;
    }

    public async addPupilFeedbackEditLog(feedback: LwpPupilFeedback, updatedBy: LwpUser): Promise<LwpPupilFeedbackEditLog> {
        const editLog = new LwpPupilFeedbackEditLog();

        editLog.feedback = feedback;
        editLog.logCreatedBy = updatedBy;

        return await this.pupilFeedbackEditLogRepository.save(editLog);
    }

    private async updateUserSharingPermission(userId: string, sharingAllowed: boolean): Promise<void> {
        await this.userRepository.update(userId, { sharingAllowed: sharingAllowed });
    }

    /**
     * Reading in the real world has no book to name, finish or reach a page of. Applied here rather
     * than in the form because every client writes through these paths, so the rule holds however
     * the entry is saved rather than only when a form remembers to clear the fields.
     */
    private applyRealWorldReadingRule(readingFeedback: LwpPupilFeedback): void {
        if (readingFeedback.readingMode !== ReadingMode.READ_IN_REAL_WORLD) return;

        readingFeedback.readingType = ReadingType.SOMETHING_ELSE;
        readingFeedback.isBookFinished = null;
        readingFeedback.pageNumber = null;
    }

    /**
     * An omitted field keeps what is stored; an explicit null clears it. `??` alone cannot tell the
     * two apart, so an answer the parent had just cleared was written straight back.
     */
    private resolveEditableField<T>(supplied: T | null | undefined, stored: T | null): T | null {
        return undefined === supplied ? (stored ?? null) : supplied;
    }

    public async savePupilActivityFeedback(
        input: PupilActivityFeedbackInput,
        file: FileUpload[],
        userId: string,
        userType: UserType,
        deviceType: DeviceType
    ): Promise<LwpPupilFeedback> {
        const pupilActivity = await this.pupilActivityRepository
            .createQueryBuilder('pupilActivity')
            .leftJoin('pupilActivity.topic', 'pupilTopic')
            .leftJoin('pupilActivity.pupil', 'pupil')
            .leftJoin('pupilActivity.activity', 'staticActivity')
            .leftJoin('pupil.school', 'school')
            .leftJoin('pupilTopic.classTopic', 'classTopic')
            .leftJoin('classTopic.class', 'schoolClass')
            .leftJoin('pupilTopic.period', 'pupilTopicPeriod')
            .where('pupilActivity.id = :id', { id: input.pupilActivityId })
            .select([
                'pupilActivity.id',
                'school.id',
                'school.commentsAndPhotos',
                'pupil.id',
                'pupilTopic.id',
                'pupilTopic.earnedGoldStar',
                'pupilTopic.silverStars',
                'pupilTopicPeriod.index',
                'staticActivity.id',
                'pupilActivity.earnedStar',
                'classTopic.id',
                'schoolClass.id',
                'schoolClass.feedCount'
            ])
            .getOne();

        if (!pupilActivity?.id) throw new HttpException('Pupil Activity does not exist', ErrorStatusCodeEnum._535);
        if (!pupilActivity?.pupil?.school?.id)
            throw new HttpException('This pupil is not associated with a school', ErrorStatusCodeEnum._535);
        if (!pupilActivity.topic?.id) throw new HttpException('Associated Pupil Topic does not exist', ErrorStatusCodeEnum._535);

        let param3 = 0;

        if (input.pupilComment) param3 += 2;
        if (input.parentComment) param3 += 1;

        const logParentPupilActionInput = new LogParentPupilActionInput();

        logParentPupilActionInput.actionId = input.id
            ? LogParentPupilActions.comments_photos_updated.id
            : LogParentPupilActions.comments_photos_added.id;
        logParentPupilActionInput.parentId = userId;
        logParentPupilActionInput.pupilId = input.pupilId;
        logParentPupilActionInput.userId = userId;
        logParentPupilActionInput.param1 = pupilActivity?.activity?.id;
        logParentPupilActionInput.param2 = pupilActivity?.id;

        const pupilActivityFeedback = input.id
            ? await this.pupilFeedbackRepository.findOne({ where: { id: input.id } })
            : new LwpPupilFeedback();
        const pupilTopic = pupilActivity?.topic;
        const school = pupilActivity?.pupil?.school;

        if (
            input.parentComment &&
            input.parentComment !== pupilActivityFeedback.parentComment &&
            input.pupilComment === pupilActivityFeedback.pupilComment
        ) {
            param3 = 1;
        }

        if (
            input.pupilComment &&
            input.pupilComment !== pupilActivityFeedback.pupilComment &&
            input.parentComment === pupilActivityFeedback.parentComment
        ) {
            param3 = 2;
        }

        pupilActivityFeedback.activity = pupilActivity;
        pupilActivityFeedback.parentComment = input.parentComment;
        pupilActivityFeedback.pupilComment = input.pupilComment;
        pupilActivityFeedback.sharingAllowed = input.sharingAllowed;
        pupilActivityFeedback.type = FeedbackType.ACTIVITY;
        pupilActivityFeedback.userType = userType;
        pupilActivityFeedback.userId = userId;
        pupilActivityFeedback.period = pupilTopic?.period;

        const shallowUser = this.shallowUserService.newShallowUser(userId);

        pupilActivityFeedback.logCreatedBy = shallowUser;
        pupilActivityFeedback.logUpdatedBy = shallowUser;

        pupilActivityFeedback.logSubmittedOnMobile = 0;
        pupilActivityFeedback.logSubmittedOnDesktop = 0;

        if (!pupilActivityFeedback.pupils) {
            pupilActivityFeedback.pupils = [];
        }

        pupilActivityFeedback.pupils.push(pupilActivity?.pupil);

        if (deviceType === DeviceType.MOBILE) {
            pupilActivityFeedback.logSubmittedOnMobile = pupilActivityFeedback?.logSubmittedOnMobile + 1;
        } else {
            pupilActivityFeedback.logSubmittedOnDesktop = pupilActivityFeedback?.logSubmittedOnDesktop + 1;
        }

        if (input.id) {
            pupilActivityFeedback.logUpdatedAt = new Date();

            const feedbackPhotos = await this.getFeedbackPhotos(input?.id);

            if (feedbackPhotos?.length > 0 && !input?.hasPhoto) {
                await this.pupilFeedbackMediaService.deleteFeedbackMedia(
                    feedbackPhotos[0],
                    `${appConstants.minioPaths.usermedia.uploadedImages}`
                );
            }
        }

        if (file && file.filter((f) => f).length) {
            if (input.sharingAllowed == null) throw new HttpException('Please specify the sharing permission.', ErrorStatusCodeEnum._535);

            param3 = param3 + 4;
        }

        logParentPupilActionInput.param3 = param3;

        // if this is a new feedback (not exist in database) then we need to update associated topic stars
        if (!input.id) {
            if (!pupilActivity.earnedStar) {
                await this.updatePupilTopicStarCount(pupilTopic?.topic?.isReading, pupilTopic);
            }

            await this.pupilActivityRepository.update({ id: pupilActivity?.id }, { earnedStar: true });

            // increasing commentsAndPhotos count in school statistics
            await this.schoolRepository.update({ id: school?.id }, { commentsAndPhotos: school.commentsAndPhotos + 1 });

            // increasing feedCount in school class

            if (pupilActivity?.topic?.classTopic?.class?.id) {
                await this.schoolClassRepository.update(pupilActivity.topic.classTopic.class.id, {
                    feedCount: pupilActivity.topic.classTopic.class?.feedCount + 1
                });
            }
        }

        // if sharingAllowedGlobal is true then we need to set permission on user level
        if (input.sharingAllowedGlobal) {
            await this.updateUserSharingPermission(userId, input.sharingAllowed);
        }

        // update logLastActivityCompleted date and update pupil status
        await this.pupilRepository.update(
            { id: pupilActivity?.pupil?.id },
            { logLastActivityCompleted: this.helperService.getDateTime(new Date(), 'YYYY-MM-DD HH:mm') }
        );

        if (userType !== UserType.TEACHER) {
            await this.logParentPupilActionService.addLogParentPupilAction(logParentPupilActionInput);
        }

        await this.helperService.updateSchoolClassStats(pupilActivity?.topic?.classTopic?.class?.id);

        const savedFeedback = await this.pupilFeedbackRepository.save(pupilActivityFeedback);

        // The edit log is generated only during an update
        if (input.id) await this.addPupilFeedbackEditLog(savedFeedback, shallowUser);

        if (file && file.filter((f) => f).length) {
            await this.pupilFeedbackMediaService.checkForExistingFile(savedFeedback?.id, MediaType.PHOTO, savedFeedback?.type);
            await this.pupilFeedbackMediaService.addFeedbackMedia(
                file,
                MediaType.PHOTO,
                `${appConstants.minioPaths.usermedia.uploadedImages}`,
                savedFeedback,
                userId
            );
        }

        return savedFeedback;
    }

    public async saveOwnPupilActivityFeedback(
        input: PupilOwnActivityFeedbackInput,
        file: FileUpload[],
        userId: string
    ): Promise<LwpPupilFeedback> {
        const pupil = await this.pupilRepository.findOne({ where: { id: input.pupilId } });

        if (!pupil) throw new HttpException('Pupil does not exist', ErrorStatusCodeEnum._535);

        const pupilFeedback = input.id ? await this.pupilFeedbackRepository.findOne({ where: { id: input.id } }) : new LwpPupilFeedback();

        pupilFeedback.description = input.description;
        pupilFeedback.teacherLikes = [];
        pupilFeedback.type = FeedbackType.ACTIVITY;
        pupilFeedback.sharingAllowed = input.sharingAllowed;

        if (!pupilFeedback.pupils) {
            pupilFeedback.pupils = [];
        }

        pupilFeedback.pupils.push(pupil);

        if (input.id) {
            pupilFeedback.logUpdatedAt = new Date();

            const feedbackPhotos = await this.getFeedbackPhotos(input?.id);

            if (feedbackPhotos?.length > 0 && !input?.hasPhoto) {
                await this.pupilFeedbackMediaService.deleteFeedbackMedia(
                    feedbackPhotos[0],
                    `${appConstants.minioPaths.usermedia.uploadedImages}`
                );
            }
        }

        if (file && file.filter((f) => f).length) {
            if (input.sharingAllowed == null) throw new HttpException('Please specify the sharing permission.', ErrorStatusCodeEnum._535);
        }

        // if sharingAllowedGlobal is true then we need to set permission on user level
        if (input.sharingAllowedGlobal) {
            await this.updateUserSharingPermission(userId, input.sharingAllowed);
        }

        const savedFeedback = await this.pupilFeedbackRepository.save(pupilFeedback);

        if (file && file.filter((f) => f).length) {
            await this.pupilFeedbackMediaService.addFeedbackMedia(
                file,
                MediaType.PHOTO,
                `${appConstants.minioPaths.usermedia.uploadedImages}`,
                savedFeedback,
                userId
            );
        }

        return savedFeedback;
    }

    public async addReadingLog(
        input: AddReadingLogInput,
        userId: string,
        userType: UserType,
        firstName: string,
        lastName: string,
        deviceType: DeviceType
    ): Promise<LwpPupilFeedback> {
        try {
            if (userType === UserType.PARENT && input?.privateNote)
                throw new HttpException(`You cannot add private note`, ErrorStatusCodeEnum._535);

            if (moment(input.bookReadAt).startOf('day').isAfter(moment().startOf('day')))
                throw new HttpException('Book read date cannot be in the future', ErrorStatusCodeEnum._535);

            const pupilTopic = await this.pupilTopicRepository.findOne({
                where: { id: input?.pupilTopicId },
                relations: ['pupil', 'classTopic', 'classTopic.class', 'classTopic.class.school']
            });

            if (!pupilTopic) throw new HttpException(`Reading week does not exist`, ErrorStatusCodeEnum._535);

            const shallowPupil = new LwpPupil();

            shallowPupil.id = input.pupilId;

            const savedReadingFeedback = await this.createReadingFeedback(
                input,
                [shallowPupil],
                userType,
                userId,
                firstName,
                lastName,
                deviceType
            );

            if (input?.userType === UserType.PARENT) {
                await this.pupilRepository.update(
                    { id: pupilTopic?.pupil?.id },
                    {
                        logLastActivityCompleted: this.helperService.getDateTime(new Date(), 'YYYY-MM-DD HH:mm')
                    }
                );

                const pupilSchoolClass = await this.schoolClassRepository.findOne({ where: { id: pupilTopic?.classTopic?.class?.id } });

                if (pupilSchoolClass) {
                    await this.schoolClassRepository.update(
                        { id: pupilSchoolClass?.id },
                        { isStatsNeedUpdate: true, feedCount: pupilSchoolClass?.feedCount + 1 }
                    );
                }

                const pupilSchool = await this.schoolRepository.findOne({ where: { id: pupilTopic?.classTopic?.class?.school?.id } });

                if (pupilSchool) {
                    await this.schoolRepository.update({ id: pupilSchool?.id }, { commentsAndPhotos: pupilSchool?.commentsAndPhotos + 1 });
                }
            }

            await this.updatePupilTopicStarCount(true, pupilTopic);

            return savedReadingFeedback;
        } catch (err) {
            if (err instanceof QueryFailedError && err?.driverError?.constraint) {
                switch (err.driverError.constraint) {
                    case 'CHK_lpf_usertype_required_for_original':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'addReadingLog',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('User type is required for feedback records.', ErrorStatusCodeEnum._535);
                    case 'CHK_lpf_readingtype_required_for_original_reading':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'addReadingLog',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('Reading type is required for READING feedback.', ErrorStatusCodeEnum._535);
                    case 'CHK_lpf_bookname_required_for_original_reading':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'addReadingLog',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('Book name is required for READING feedback.', ErrorStatusCodeEnum._535);
                    case 'CHK_lpf_logcreatedby_or_user_required_for_original':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'addReadingLog',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('Something went wrong. Please try again.', ErrorStatusCodeEnum._535);

                    default:
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'addReadingLog',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException(err?.message, ErrorStatusCodeEnum._535);
                }
            } else {
                throw new HttpException(err?.message, ErrorStatusCodeEnum._535);
            }
        }
    }

    /**
     * Creates a reading feedback entry from a given input.
     *
     * @private
     * @param {(AddReadingLogInput | AddReadingLogAsGroupInput)} input either a single input or a batch input of reading log data
     * @param {LwpPupil[]} pupils the pupils to attach the reading log to
     * @param {UserType} userType the type of user logging
     * @param {number} userId the ID of the user logging
     * @param {string} firstName the name of the logging user - not the pupil
     * @param {string} lastName the last name of the logging user
     * @param {DeviceType} deviceType the type of device logged on
     * @param {FileUpload[]} imageFile any images attached
     * @param {FileUpload[]} audioFile any audio attached
     * @return {Promise<LwpPupilFeedback>} the hydrated and saved Feedback object
     * @memberof LwpPupilFeedbackService
     */
    private async createReadingFeedback(
        input: AddReadingLogInput | AddReadingLogAsGroupInput,
        pupils: LwpPupil[],
        userType: UserType,
        userId: string,
        firstName: string,
        lastName: string,
        deviceType: DeviceType
    ): Promise<LwpPupilFeedback> {
        try {
            const readingAsGroup = 1 < pupils.length;

            const readingFeedback = new LwpPupilFeedback();

            // These are only set for AddReadingLogInput
            readingFeedback.readingType = input['readingType'] ?? ReadingType.SOMETHING_ELSE;
            readingFeedback.readingMode = input['readingMode'] ?? null;
            readingFeedback.sharingAllowed = input['sharingAllowed'];

            readingFeedback.bookName = input.bookName;
            readingFeedback.includeInReadingTarget = input.includeInReadingTarget;
            readingFeedback.bookReadAt = input.bookReadAt;
            readingFeedback.isBookFinished = input.isBookFinished;
            readingFeedback.pageNumber = input.pageNumber ? input.pageNumber : null;
            this.applyRealWorldReadingRule(readingFeedback);
            readingFeedback.comment = input.comment ? input.comment : null;
            readingFeedback.privateNote = input?.privateNote ? input.privateNote : null;
            readingFeedback.userType = input?.userType ?? userType;
            readingFeedback.userId = userId;
            readingFeedback.type = FeedbackType.READING;
            readingFeedback.logOnReadingAsGroupTab = readingAsGroup;

            readingFeedback.userName = input?.userName
                ? input?.userName
                : userType === UserType.TEACHER
                  ? (
                        await this.userRepository
                            .createQueryBuilder('lu')
                            .select('lu.nameForChildren')
                            .whereInIds([userId])
                            .getRawOne<{ lu_nameForChildren: string }>()
                    ).lu_nameForChildren
                  : `${firstName} ${lastName}`;

            const shallowUser = this.shallowUserService.newShallowUser(userId);

            readingFeedback.logCreatedBy = shallowUser;
            readingFeedback.logUpdatedBy = shallowUser;

            readingFeedback.pupils = pupils;

            if (!readingAsGroup && input?.userType === UserType.TEACHER && input?.comment) {
                readingFeedback.notifyParent = true;
            }

            if (deviceType === DeviceType.MOBILE) {
                readingFeedback.logSubmittedOnMobile = 1;
            } else {
                readingFeedback.logSubmittedOnDesktop = 1;
            }

            const savedReadingFeedback = await this.pupilFeedbackRepository.save(readingFeedback);

            await this.createFeedbackMediaFromReadingLogInput(input, savedReadingFeedback, userId);

            // if sharingAllowedGlobal is true then we need to set permission on user level
            // only set on single reading inputs
            if (input['sharingAllowedGlobal']) {
                await this.updateUserSharingPermission(userId, input['sharingAllowed']);
            }

            return savedReadingFeedback;
        } catch (err) {
            if (err instanceof QueryFailedError && err?.driverError?.constraint) {
                switch (err.driverError.constraint) {
                    case 'CHK_lpf_usertype_required_for_original':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'createReadingFeedback',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('User type is required for feedback records.', ErrorStatusCodeEnum._535);
                    case 'CHK_lpf_readingtype_required_for_original_reading':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'createReadingFeedback',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('Reading type is required for READING feedback.', ErrorStatusCodeEnum._535);
                    case 'CHK_lpf_bookname_required_for_original_reading':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'createReadingFeedback',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('Book name is required for READING feedback.', ErrorStatusCodeEnum._535);
                    case 'CHK_lpf_logcreatedby_or_user_required_for_original':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'createReadingFeedback',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('Something went wrong. Please try again.', ErrorStatusCodeEnum._535);

                    default:
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'createReadingFeedback',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException(err?.message, ErrorStatusCodeEnum._535);
                }
            } else {
                throw new HttpException(err?.message, ErrorStatusCodeEnum._535);
            }
        }
    }

    /**
     * createFeedbackMediaFromReadingLogInput takes something resembling a reading log
     * input DTO - so long as it *might* contain a photo/audio token - and creates appropriate
     * feedback media from those tokens to attach to the feedback.
     *
     * @private
     * @param {{ photo?: string, audio?: string }} input the input DTO, whatever it is
     * @param {LwpPupilFeedback} savedReadingFeedback the feedback to attach anything created to
     * @param {string} userId the ID of the user saving the feedback
     * @memberof LwpPupilFeedbackService
     */
    private async createFeedbackMediaFromReadingLogInput(
        input: { photo?: string; audio?: string },
        savedReadingFeedback: LwpPupilFeedback,
        userId: string
    ): Promise<void> {
        if (input.photo) {
            await this.pupilFeedbackMediaService.createFeedbackMediaFromToken(
                (input as AddReadingLogInput).photo,
                MediaType.PHOTO,
                savedReadingFeedback,
                userId
            );
        }

        if (input.audio) {
            await this.pupilFeedbackMediaService.createFeedbackMediaFromToken(input.audio, MediaType.AUDIO, savedReadingFeedback, userId);
        }
    }

    public async getPupilTopicIdsOfFeedback(
        feedbackId: string,
        repository: Repository<LwpPupilFeedback> = this.pupilFeedbackRepository
    ): Promise<string[]> {
        return []
            .concat(
                await this.joinToReadingTopic(repository.createQueryBuilder('feedback'))
                    .where('feedback.id = :id', { id: feedbackId })
                    .select('readingPupilTopic.id', 'pupilTopic_id')
                    .getRawMany(),
                await repository
                    .createQueryBuilder('feedback')
                    .leftJoin('feedback.activity', 'activity')
                    .leftJoin('activity.topic', 'activityPupilTopic')
                    .where('feedback.id = :id', { id: feedbackId })
                    .select('activityPupilTopic.id', 'pupilTopic_id')
                    .getRawMany()
            )
            .map((pupilTopicIdObj) => {
                if (pupilTopicIdObj?.pupilTopic_id) return pupilTopicIdObj?.pupilTopic_id;
            });
    }

    public async addReadingLogAsGroup(
        input: AddReadingLogAsGroupInput,
        userId: string,
        userType: UserType,
        firstName: string,
        lastName: string,
        deviceType: DeviceType
    ): Promise<LwpPupilFeedback> {
        try {
            if (input?.pupilIds?.length === 0) throw new HttpException('Please select at least one pupil', ErrorStatusCodeEnum._535);

            if (moment(input.bookReadAt).startOf('day').isAfter(moment().startOf('day')))
                throw new HttpException('Book read date cannot be in the future', ErrorStatusCodeEnum._535);

            // when logged as group, only happens on school, so we can set readingType is SCHOOL_BOOK
            const feedbacksDetail = { ...input, readingType: ReadingType.SCHOOL_BOOK };

            const savedReadingFeedback = await this.createReadingFeedback(
                feedbacksDetail,
                input.pupilIds.map((id) => {
                    const p = new LwpPupil();

                    p.id = id;

                    return p;
                }),
                userType,
                userId,
                firstName,
                lastName,
                deviceType
            );

            const pupilTopicIds = (await this.getPupilTopicIdsOfFeedback(savedReadingFeedback?.id)).filter(
                (pupilTopicId) => pupilTopicId != null
            );

            if (pupilTopicIds.length > 0) await this.updatePupilTopicStarCountReadingBatch(pupilTopicIds, this.pupilTopicRepository);

            return savedReadingFeedback;
        } catch (err) {
            if (err instanceof QueryFailedError && err?.driverError?.constraint) {
                switch (err.driverError.constraint) {
                    case 'CHK_lpf_usertype_required_for_original':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'addReadingLogAsGroup',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('User type is required for feedback records.', ErrorStatusCodeEnum._535);
                    case 'CHK_lpf_readingtype_required_for_original_reading':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'addReadingLogAsGroup',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('Reading type is required for READING feedback.', ErrorStatusCodeEnum._535);
                    case 'CHK_lpf_bookname_required_for_original_reading':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'addReadingLogAsGroup',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('Book name is required for READING feedback.', ErrorStatusCodeEnum._535);
                    case 'CHK_lpf_logcreatedby_or_user_required_for_original':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'addReadingLogAsGroup',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('Something went wrong. Please try again.', ErrorStatusCodeEnum._535);

                    default:
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'addReadingLogAsGroup',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException(err?.message, ErrorStatusCodeEnum._535);
                }
            } else {
                throw new HttpException(err?.message, ErrorStatusCodeEnum._535);
            }
        }
    }

    public async updateReadingLogAsGroup(
        input: UpdateReadingLogAsGroupInput,
        userId: string,
        deviceType: DeviceType
    ): Promise<LwpPupilFeedback> {
        try {
            if (input?.pupilIds?.length === 0) throw new HttpException('Please select at least one pupil', ErrorStatusCodeEnum._535);

            const updatedBy = this.shallowUserService.newShallowUser(userId);

            const readingFeedback = await this.pupilFeedbackRepository
                .createQueryBuilder('feedback')
                .where('feedback.id = :id', { id: input?.id })
                .getOne();

            const previousPupilTopicIds = await this.getPupilTopicIdsOfFeedback(input?.id);

            if (!readingFeedback) throw new HttpException(`Reading log does not exist`, ErrorStatusCodeEnum._535);

            readingFeedback.readingType = input?.readingType ?? readingFeedback?.readingType;
            readingFeedback.bookName = input?.bookName ?? readingFeedback?.bookName;
            readingFeedback.includeInReadingTarget = input?.includeInReadingTarget ?? readingFeedback?.includeInReadingTarget;
            readingFeedback.isBookFinished = this.resolveEditableField(input?.isBookFinished, readingFeedback?.isBookFinished);
            readingFeedback.readingMode = input?.readingMode ?? readingFeedback?.readingMode;
            readingFeedback.pageNumber = this.resolveEditableField(input?.pageNumber, readingFeedback?.pageNumber);
            this.applyRealWorldReadingRule(readingFeedback);
            readingFeedback.comment = input?.comment ?? readingFeedback?.comment;
            readingFeedback.privateNote = input?.privateNote ?? readingFeedback?.privateNote;

            readingFeedback.logUpdatedBy = updatedBy;

            if (!readingFeedback.pupils) {
                readingFeedback.pupils = [];
            }

            readingFeedback.pupils = await this.pupilRepository.find({ where: { id: In(input?.pupilIds) } });

            readingFeedback.logOnReadingAsGroupTab = input?.pupilIds.length > 1;

            if (deviceType === DeviceType.MOBILE) {
                readingFeedback.logSubmittedOnMobile = readingFeedback?.logSubmittedOnMobile + 1;
            } else {
                readingFeedback.logSubmittedOnDesktop = readingFeedback?.logSubmittedOnDesktop + 1;
            }

            const readingAudios = await this.getFeedbackAudios(readingFeedback?.id);

            if (readingAudios?.length > 0 && (!input.hasAudio || input.audio)) {
                await this.pupilFeedbackMediaService.deleteFeedbackMedia(
                    readingAudios?.[0],
                    `${appConstants.minioPaths.usermedia.uploadedReadingAudio}`
                );
            }

            await this.createFeedbackMediaFromReadingLogInput(input, readingFeedback, userId);

            const savedReadingFeedback = await this.pupilFeedbackRepository.save(readingFeedback);

            await this.addPupilFeedbackEditLog(savedReadingFeedback, updatedBy);

            const currentPupilTopicIds = await this.getPupilTopicIdsOfFeedback(savedReadingFeedback?.id);

            const pupilTopicIds = [
                ...new Set([...previousPupilTopicIds, ...currentPupilTopicIds].filter((pupilTopicId) => pupilTopicId != null))
            ];

            if (pupilTopicIds.length > 0) await this.updatePupilTopicStarCountReadingBatch(pupilTopicIds, this.pupilTopicRepository);

            return savedReadingFeedback;
        } catch (err) {
            if (err instanceof QueryFailedError && err?.driverError?.constraint) {
                switch (err.driverError.constraint) {
                    case 'CHK_lpf_usertype_required_for_original':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'updateReadingLogAsGroup',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('User type is required for feedback records.', ErrorStatusCodeEnum._535);
                    case 'CHK_lpf_readingtype_required_for_original_reading':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'updateReadingLogAsGroup',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('Reading type is required for READING feedback.', ErrorStatusCodeEnum._535);
                    case 'CHK_lpf_bookname_required_for_original_reading':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'updateReadingLogAsGroup',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('Book name is required for READING feedback.', ErrorStatusCodeEnum._535);
                    case 'CHK_lpf_logcreatedby_or_user_required_for_original':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'updateReadingLogAsGroup',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('Something went wrong. Please try again.', ErrorStatusCodeEnum._535);

                    default:
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'updateReadingLogAsGroup',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException(err?.message, ErrorStatusCodeEnum._535);
                }
            } else {
                throw new HttpException(err?.message, ErrorStatusCodeEnum._535);
            }
        }
    }

    public async updatePupilTopicStarCount(isReading: boolean, pupilTopic: LwpPupilTopic): Promise<void> {
        if (isReading) {
            await this.updatePupilTopicStarCountReadingBatch([pupilTopic.id], this.pupilTopicRepository);
        } else {
            if (!pupilTopic?.earnedGoldStar) {
                await this.pupilTopicRepository.update({ id: pupilTopic?.id }, { earnedGoldStar: true });
            } else {
                await this.pupilTopicRepository.update({ id: pupilTopic?.id }, { silverStars: pupilTopic.silverStars + 1 });
            }
        }
    }

    /**
     * updatePupilTopicStarCountReadingBatch updates the star count for a list of
     * pupil topic IDs, using a given connection (usually in a transaction).
     *
     * @param {string[]} pupilTopicIds the list of topics to update
     * @param {(Repository<LwpPupilTopic> | EntityManager | QueryRunner)} connectionish
     *  something that can do a .query() call, usually in a transaction
     * @memberof LwpPupilFeedbackService
     */
    public async updatePupilTopicStarCountReadingBatch(
        pupilTopicIds: string[],
        connectionish: Repository<LwpPupilTopic> | EntityManager | QueryRunner
    ): Promise<void> {
        await connectionish.query(
            `
                WITH foundItems AS (
                    SELECT
                        iq."pupilTopicId",
                        "starCount",
                        CASE WHEN iq."readingTarget" > 0 THEN
                            coalesce(iq."starCount" >= iq."readingTarget", FALSE)
                        ELSE
                            FALSE
                        END AS "earnedGoldStar"
                    FROM (
                        SELECT
                            lpt.id AS "pupilTopicId",
                            lpt."readingTarget",
                            count(DISTINCT date(lpf."bookReadAt")) FILTER (WHERE (lpf."userType" = 'TEACHER'
                                AND lpf."includeInReadingTarget" = TRUE)
                            OR (lpf."userType" <> 'TEACHER')
                        OR (lpf.id IS NULL)) AS "starCount"
                    FROM
                        lwp_pupil_topic lpt
                        LEFT JOIN lwp_view_reading_log_to_reading_topic lvrltrt ON lvrltrt."pupilTopicId" = lpt.id
                        LEFT JOIN lwp_pupil_feedback lpf ON lvrltrt."pupilFeedbackId" = lpf.id and lpf."originalFeedbackId" is null
                    WHERE
                        lpt.id = ANY($1)
                    GROUP BY
                        lpt.id) iq
                )
                UPDATE lwp_pupil_topic lpt
                SET
                    "silverStars" = case when foundItems."earnedGoldStar" then foundItems."starCount" - 1 else foundItems."starCount" end,
                    "earnedGoldStar" = foundItems."earnedGoldStar"
                FROM foundItems
                WHERE
                    foundItems."pupilTopicId" = lpt.id
        `,
            [pupilTopicIds]
        );
    }

    public async updateReadingLog(
        input: UpdateReadingLogInput,
        userId: string,
        userType: UserType,
        deviceType: DeviceType
    ): Promise<LwpPupilFeedback> {
        try {
            const updatedBy = this.shallowUserService.newShallowUser(userId);
            let query = this.pupilFeedbackRepository.createQueryBuilder('feedback').where('feedback.id = :id', { id: input?.id });

            // FIXME(cj): This conditional exists because we want to allow admins to update any feedback,
            // but we don't have a sufficiently-expressive authz decorator to do this at the resolver level.
            if (userType !== UserType.ADMIN) {
                query = query.andWhere('feedback.userType = :userType', { userType });
            }

            const readingFeedback = await query.getOne();

            const pupilIdAndPupilTopicIdOfFeedback = await this.joinToReadingTopic(
                this.pupilFeedbackRepository.createQueryBuilder('feedback')
            )
                .where('feedback.id = :id', { id: input?.id })
                .select(['readingPupilTopic.id', 'readingPupilTopic.pupil.id'])
                .getRawOne();

            const pupilTopicId = pupilIdAndPupilTopicIdOfFeedback?.readingPupilTopic_id;

            if (!readingFeedback) throw new HttpException(`Reading log does not exist`, ErrorStatusCodeEnum._535);

            readingFeedback.readingType = input?.readingType ?? readingFeedback?.readingType ?? ReadingType.SOMETHING_ELSE;
            readingFeedback.readingMode = input?.readingMode ?? readingFeedback?.readingMode;
            readingFeedback.bookName = input?.bookName ?? readingFeedback?.bookName;
            readingFeedback.includeInReadingTarget = input?.includeInReadingTarget ?? readingFeedback?.includeInReadingTarget;
            readingFeedback.isBookFinished = this.resolveEditableField(input?.isBookFinished, readingFeedback?.isBookFinished);
            readingFeedback.pageNumber = this.resolveEditableField(input?.pageNumber, readingFeedback?.pageNumber);
            this.applyRealWorldReadingRule(readingFeedback);
            readingFeedback.comment = input?.comment ?? readingFeedback?.comment;
            readingFeedback.privateNote = input?.privateNote ?? readingFeedback?.privateNote;

            readingFeedback.logUpdatedBy = updatedBy;

            readingFeedback.sharingAllowed = input.sharingAllowed;

            if (deviceType === DeviceType.MOBILE) {
                readingFeedback.logSubmittedOnMobile = readingFeedback?.logSubmittedOnMobile + 1;
            } else {
                readingFeedback.logSubmittedOnDesktop = readingFeedback?.logSubmittedOnDesktop + 1;
            }

            const readingPhotos = await this.getFeedbackPhotos(readingFeedback?.id);
            const readingAudios = await this.getFeedbackAudios(readingFeedback?.id);

            if (readingPhotos?.length > 0 && (!input.hasPhoto || input.photo)) {
                await this.pupilFeedbackMediaService.deleteFeedbackMedia(
                    readingPhotos?.[0],
                    `${appConstants.minioPaths.usermedia.uploadedReadingImages}`
                );
            }

            if (readingAudios?.length > 0 && (!input.hasAudio || input.audio)) {
                await this.pupilFeedbackMediaService.deleteFeedbackMedia(
                    readingAudios?.[0],
                    `${appConstants.minioPaths.usermedia.uploadedReadingAudio}`
                );
            }

            await this.createFeedbackMediaFromReadingLogInput(input, readingFeedback, userId);

            // if sharingAllowedGlobal is true then we need to set permission on user level
            if (input['sharingAllowedGlobal']) {
                await this.updateUserSharingPermission(userId, input['sharingAllowed']);
            }

            const savedReadingFeedback = await this.pupilFeedbackRepository.save(readingFeedback);

            await this.addPupilFeedbackEditLog(savedReadingFeedback, updatedBy);

            const pupilTopic = await this.pupilTopicRepository.findOne({ where: { id: pupilTopicId } });

            if (pupilTopic?.id) await this.updatePupilTopicStarCount(true, pupilTopic);

            return savedReadingFeedback;
        } catch (err) {
            if (err instanceof QueryFailedError && err?.driverError?.constraint) {
                switch (err.driverError.constraint) {
                    case 'CHK_lpf_usertype_required_for_original':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'updateReadingLog',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('User type is required for feedback records.', ErrorStatusCodeEnum._535);
                    case 'CHK_lpf_readingtype_required_for_original_reading':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'updateReadingLog',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('Reading type is required for READING feedback.', ErrorStatusCodeEnum._535);
                    case 'CHK_lpf_bookname_required_for_original_reading':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'updateReadingLog',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('Book name is required for READING feedback.', ErrorStatusCodeEnum._535);
                    case 'CHK_lpf_logcreatedby_or_user_required_for_original':
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'updateReadingLog',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException('Something went wrong. Please try again.', ErrorStatusCodeEnum._535);

                    default:
                        newrelic.noticeError(err, {
                            caught: true,
                            handled: true,
                            constraint: err.driverError.constraint,
                            functionName: 'updateReadingLog',
                            input: JSON.stringify(input)
                        });
                        throw new HttpException(err?.message, ErrorStatusCodeEnum._535);
                }
            } else {
                throw new HttpException(err?.message, ErrorStatusCodeEnum._535);
            }
        }
    }

    public async allPupilReadingLogs(
        pupilId: string,
        limit = 0,
        offset = 0,
        userId: string,
        userType: UserType,
        userTrustLevel: UserTrustLevel
    ): Promise<Pagination<LwpPupilFeedback>> {
        let results = [];
        let total = 0;

        const baseQuery = this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .leftJoinAndSelect('feedback.pupils', 'pupil')
            .where('pupil.id = :pupilId', { pupilId })
            .andWhere('feedback.type = :type', { type: FeedbackType.READING })
            .orderBy('feedback.bookReadAt', 'DESC')
            .skip(offset)
            .take(limit);

        if (userTrustLevel === UserTrustLevel.Limited) {
            baseQuery.andWhere('feedback.originalFeedbackId IS NULL');
        }

        if (userType !== UserType.PARENT) {
            [results, total] = await baseQuery.getManyAndCount();
        } else {
            if (userTrustLevel === UserTrustLevel.Limited) {
                baseQuery.andWhere('feedback.bookReadAt >= :twoWeeksAgo', {
                    twoWeeksAgo: moment().subtract(14, 'days').format('YYYY-MM-DD')
                });
            }

            [results, total] = await baseQuery
                .leftJoinAndSelect('pupil.parents', 'parents')
                .leftJoinAndSelect('parents.parent', 'parent')
                .andWhere('parent.id = :parentId', { parentId: userId })
                .andWhere('parents.status = :status', { status: PupilParentStatus.ACTIVE })
                .getManyAndCount();
        }

        return new Pagination<LwpPupilFeedback>({
            results,
            total,
            limit,
            offset
        });
    }

    public async getPupilReadingLogsForTheDay(
        pupilId: string,
        date: Date,
        userId: string,
        userType: UserType,
        userTrustLevel: UserTrustLevel
    ): Promise<LwpPupilFeedback[]> {
        try {
            // Format date as YYYY-MM-DD for PostgreSQL date comparison
            const dateString = date.toISOString().split('T')[0];

            const baseQuery = this.pupilFeedbackRepository
                .createQueryBuilder('feedback')
                .leftJoinAndSelect('feedback.pupils', 'pupil')
                .where('pupil.id = :pupilId', { pupilId })
                .andWhere('feedback.type = :type', { type: FeedbackType.READING })
                .andWhere('feedback.bookReadAt = :dateString', { dateString })
                .orderBy('feedback.bookReadAt', 'DESC');

            if (userTrustLevel === UserTrustLevel.Limited) {
                baseQuery.andWhere('feedback.originalFeedbackId IS NULL');
            }

            let results: LwpPupilFeedback[] = [];

            if (userType !== UserType.PARENT) {
                results = await baseQuery.getMany();
            } else {
                results = await baseQuery
                    .leftJoinAndSelect('pupil.parents', 'parents')
                    .leftJoinAndSelect('parents.parent', 'parent')
                    .andWhere('parent.id = :parentId', { parentId: userId })
                    .andWhere('parents.status = :status', { status: PupilParentStatus.ACTIVE })
                    .getMany();
            }

            return results;
        } catch {
            throw new Error('Failed to retrieve reading logs for the day');
        }
    }

    public async getPupilReadingTopic(
        pupilId: string,
        topicId: string,
        userId: string,
        userType: UserType
    ): Promise<PupilReadingTopicOutput> {
        /*
         * This function is used to get the previous and next reading topic id as well as the details of the topic requested.
         * It collects all the reading topics for the pupil to do so.
         * @@@P - This should probably be limited to the current academic year? (In which case there are at most 53.)
         */

        let readingTopics: LwpPupilTopic[] = [];

        if (userType !== UserType.PARENT) {
            readingTopics = await this.pupilTopicRepository
                .createQueryBuilder('pupilTopic')
                .leftJoinAndSelect('pupilTopic.pupil', 'pupil')
                .leftJoinAndSelect('pupil.school', 'school')
                .leftJoinAndSelect('pupilTopic.topic', 'topic')
                .where('topic.isReading = :isReading', { isReading: true })
                .andWhere('pupil.id = :pupilId', { pupilId })
                .andWhere('pupilTopic.periodIndex = school.curentPeriod.index')
                .orderBy('pupilTopic.releaseDate', 'DESC')
                .getMany();
        } else {
            // @@@P - doesn't this just return the same topics as the query above?
            readingTopics = await this.pupilTopicRepository
                .createQueryBuilder('pupilTopic')
                .leftJoinAndSelect('pupilTopic.pupil', 'pupil')
                .leftJoinAndSelect('pupil.school', 'school')
                .leftJoinAndSelect('pupil.parents', 'parents')
                .leftJoinAndSelect('parents.parent', 'parent')
                .leftJoinAndSelect('pupilTopic.topic', 'topic')
                .where('topic.isReading = :isReading', { isReading: true })
                .andWhere('pupil.id = :pupilId', { pupilId })
                .andWhere('parent.id = :parentId', { parentId: userId })
                .andWhere('pupilTopic.periodIndex = school.curentPeriod.index')
                .orderBy('pupilTopic.releaseDate', 'DESC')
                .getMany();
        }

        if (readingTopics?.length > 0) {
            const readingTopicIndex = readingTopics?.findIndex((rTopic) => rTopic?.id === topicId);

            if (readingTopicIndex >= 0) {
                const pupilReadingTopic = new PupilReadingTopicOutput();

                pupilReadingTopic.prevReadingTopicId = readingTopics?.[readingTopicIndex + 1]?.id ?? null;
                pupilReadingTopic.nextReadingTopicId = readingTopics?.[readingTopicIndex - 1]?.id ?? null;
                pupilReadingTopic.readingTopic = readingTopics?.[readingTopicIndex];

                return pupilReadingTopic;
            }
        }

        throw new HttpException(`Reading log does not exist`, ErrorStatusCodeEnum._535);
    }

    public async getReadingTopics(pupilId: string, userId: string, userType: UserType): Promise<LwpPupilTopic[]> {
        let readingTopicsQuery: SelectQueryBuilder<LwpPupilTopic>;

        if (userType !== UserType.PARENT) {
            readingTopicsQuery = this.pupilTopicRepository
                .createQueryBuilder('pupilTopic')
                .leftJoinAndSelect('pupilTopic.pupil', 'pupil')
                .leftJoinAndSelect('pupil.school', 'school')
                .leftJoinAndSelect('pupilTopic.topic', 'topic')
                .where('topic.isReading = :isReading', { isReading: true })
                .andWhere('pupil.id = :pupilId', { pupilId })
                .andWhere('pupilTopic.periodIndex = school.curentPeriod.index');
        } else {
            readingTopicsQuery = this.pupilTopicRepository
                .createQueryBuilder('pupilTopic')
                .leftJoinAndSelect('pupilTopic.pupil', 'pupil')
                .leftJoinAndSelect('pupil.school', 'school')
                .leftJoinAndSelect('pupil.parents', 'parents')
                .leftJoinAndSelect('parents.parent', 'parent')
                .leftJoinAndSelect('pupilTopic.topic', 'topic')
                .where('topic.isReading = :isReading', { isReading: true })
                .andWhere('pupil.id = :pupilId', { pupilId })
                .andWhere('parent.id = :parentId', { parentId: userId })
                .andWhere('pupilTopic.periodIndex = school.curentPeriod.index');
        }

        const readingTopics = await readingTopicsQuery.orderBy('pupilTopic.releaseDate', 'DESC').getMany();

        return readingTopics?.length > 0 ? readingTopics : [];
    }

    /**
     * getPupilTopicOfPupilFeedback takes a pupil feedback object
     * and makes a best-effort attempt to find an associated pupil topic entry.
     * There is no guarantee it will find one.
     *
     * @param {(LwpPupilFeedback)} feedback the feedback to look up
     * @return {Promise<LwpPupilTopic | null>} the pupil topic, if one was found
     * @memberof LwpPupilFeedbackService
     */
    public async getPupilTopicOfPupilFeedback(feedback: LwpPupilFeedback): Promise<LwpPupilTopic | null> {
        const joinedBase = this.joinFeedbackToTopic(feedback, this.pupilTopicRepository.createQueryBuilder('pt'));

        return joinedBase.query.where(`${joinedBase.alias}.id = :id`, { id: feedback.id }).getOne();
    }

    /**
     * getPupilFeedbacksOfPupilTopic takes a pupil topic and looks up
     * all associated feedbacks, including reading log feedbacks.
     *
     * @param {(LwpPupilTopic)} topic the topic to look up
     * @return {Promise<LwpPupilFeedback[]>} the list of feedbacks found
     * @memberof LwpPupilFeedbackService
     */
    public async getPupilFeedbacksOfPupilTopic(topic: LwpPupilTopic): Promise<LwpPupilFeedback[]> {
        return [].concat(
            await this.joinToReadingTopic(this.pupilFeedbackRepository.createQueryBuilder('feedback'))
                .where('readingPupilTopic.id = :id', { id: topic.id })
                .orderBy('feedback.logCreatedAt', 'ASC')
                .getMany(),
            await this.pupilFeedbackRepository
                .createQueryBuilder('feedback')
                .leftJoin('feedback.activity', 'activity')
                .leftJoin('activity.topic', 'activityPupilTopic')
                .where('activityPupilTopic.id = :id', { id: topic.id })
                .getMany()
        );
    }

    /**
     * joinToReadingTopic takes a {@link SelectQueryBuilder} with {@link LwpPupilFeedback}, and
     * adds a table aliased to "readingPupilTopic" for the linked reading pupil topic.
     *
     * @template T the type of query builder to be working with
     * @param {SelectQueryBuilder<T>} qb the start query builder, with an LwpPupilFeedback table included
     * @return {SelectQueryBuilder<T>} the same query builder with "readingPupilTopic" added
     * @memberof LwpPupilFeedbackService
     */
    public joinToReadingTopic<T>(qb: SelectQueryBuilder<T>): SelectQueryBuilder<T> {
        // whilst we might be able to hack a "relation"-y way of doing this in, it's not properly supported:
        // https://github.com/typeorm/typeorm/issues/4668
        const alias = this.getTableAlias(qb, LwpPupilFeedback);

        qb = qb.leftJoin(LwpViewReadingLogToReadingTopic, 'log_to_topic', `log_to_topic.pupilFeedbackId = ${alias}.id`);

        return qb.leftJoinAndSelect(LwpPupilTopic, 'readingPupilTopic', 'readingPupilTopic.id = log_to_topic."pupilTopicId"');
    }

    /**
     * joinFeedbackToTopic takes an {@link LwpPupilFeedback} and an
     * {@link SelectQueryBuilder} with {@link LwpPupilTopic}, and adds the appropriate
     * joins to connect the topics in the builder, dependent on the feedback type,
     * to either reading or topic feedbacks.
     *
     * @template T the type of query builder to be working with
     * @param {LwpPupilFeedback} feedback the feedback to use as a starting point
     * @param {SelectQueryBuilder<T>} qb the query builder to add to
     * @return {{ query: SelectQueryBuilder<T>; alias: string }} the generated query builder and the alias for the join
     * @memberof LwpPupilFeedbackService
     */
    public joinFeedbackToTopic<T>(feedback: LwpPupilFeedback, qb: SelectQueryBuilder<T>): { query: SelectQueryBuilder<T>; alias: string } {
        let baseQuery: SelectQueryBuilder<T>;
        let alias: string;

        if (feedback.type == FeedbackType.READING) {
            baseQuery = this.joinToReadingFeedback(qb);
            alias = 'readingFeedback';
        } else {
            const ptAlias = this.getTableAlias(qb, LwpPupilTopic);

            baseQuery = qb
                .leftJoinAndSelect(`${ptAlias}.activities`, 'activity')
                .leftJoinAndSelect(LwpPupilFeedback, 'activityFeedback', 'activityFeedback.activityId = activity.id');
            alias = 'activityFeedback';
        }

        return {
            query: baseQuery,
            alias
        };
    }

    /**
     * joinToReadingFeedback takes a {@link SelectQueryBuilder} with {@link LwpPupilTopic},
     * and adds a table aliased to "readingFeedback" for reading logs.
     *
     * n.b. this cannot be performantly implemented with an or in a single left join
     * with activity feedbacks also included, owing to the fact that the Postgres
     * optimiser will not identify a specific index for use, and will construct
     * a query plan that doesn't push down selections efficiently. As a result,
     * activity feedbacks need to be separately selected.
     *
     * @template T the type of query builder to be working with
     * @param {SelectQueryBuilder<LwpPupilFeedback>} qb the start query builder, with an LwpPupilTopic table
     * @return {SelectQueryBuilder<LwpPupilFeedback>} the same query builder with "activity", "readingFeedback", and optionally "activityFeedback" added
     * @memberof LwpPupilFeedbackService
     */
    public joinToReadingFeedback<T>(qb: SelectQueryBuilder<T>): SelectQueryBuilder<T> {
        // whilst we might be able to hack a "relation"-y way of doing this in, it's not properly supported:
        // https://github.com/typeorm/typeorm/issues/4668
        const alias = this.getTableAlias(qb, LwpPupilTopic);

        return qb
            .leftJoin(LwpViewReadingLogToReadingTopic, 'log_to_topic', `log_to_topic.pupilTopicId = ${alias}.id`)
            .leftJoinAndSelect(LwpPupilFeedback, 'readingFeedback', 'readingFeedback.id = log_to_topic.pupilFeedbackId');
    }

    /**
     * getTableAlias gets a table alias name for a table in a query.
     *
     * @private
     * @template T the type of query builder to be working with
     * @param {SelectQueryBuilder<T>} qb the query builder itself
     * @param {(Function | string)} table the table we're looking for
     * @return {string} the name of the alias
     * @throws {ReferenceError} if the table is not aliased
     * @memberof LwpPupilFeedbackService
     */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    private getTableAlias<T>(qb: SelectQueryBuilder<T>, table: Function | string): string {
        const foundAlias = qb.expressionMap.aliases.find((a) => a.target == table);

        if (!foundAlias) {
            throw new ReferenceError(`Alias not found for table ${table.toString()}`);
        }

        return foundAlias.name;
    }

    public async getPupilCount(id: string): Promise<number> {
        const pupilFeedback = await this.pupilFeedbackRepository.findOne({ where: { id }, relations: ['pupils'] });

        return pupilFeedback?.pupils?.length;
    }

    public async getPupilOfFeedback(id: string): Promise<LwpPupil> {
        const pupilFeedback = await this.pupilFeedbackRepository.findOne({ where: { id }, relations: ['pupils'] });

        if (pupilFeedback?.pupils?.length > 1) return null;

        return pupilFeedback?.pupils?.find((pupil) => pupil?.id !== null);
    }

    public async getHistoryOfFeedback(id: string): Promise<PupilHistoryOutput[]> {
        const rawHistory: PupilHistoryOutput[] = await this.pupilFeedbackHistoryLogRepository
            .createQueryBuilder('history')
            .leftJoin('history.feedback', 'feedback')
            .leftJoin('history.logCreatedBy', 'user')
            .where('feedback.id = :id', { id })
            .select([
                'history.id as "id"',
                'history.logCreatedAt as "logCreatedAt"',
                `COALESCE(user.nameForChildren, CONCAT(user.firstname, ' ', user.lastname)) as "userName"`
            ])
            .orderBy('history.logCreatedAt', 'DESC')
            .addOrderBy('history.id', 'ASC')
            .getRawMany<{
                id: string;
                logCreatedAt: Date;
                userName: string;
            }>();

        return rawHistory;
    }

    public async getLastActionOfFeedbackByIds(ids: readonly string[]): Promise<(LastPupilHistoryOutput | null)[]> {
        try {
            if (!ids.length) return [];

            // Get only the most recent history for each feedback ID using subquery
            const rawHistories = await this.pupilFeedbackHistoryLogRepository
                .createQueryBuilder('history')
                .distinctOn(['feedback.id'])
                .leftJoin('history.feedback', 'feedback')
                .leftJoin('history.logCreatedBy', 'user')
                .where('feedback.id IN (:...ids)', { ids })
                .orderBy('feedback.id')
                .addOrderBy('history.logCreatedAt', 'DESC')
                .select([
                    'feedback.id as "feedbackId"',
                    'user.firstname as "firstname"',
                    'user.lastname as "lastname"',
                    'user.nameForChildren as "nameForChildren"',
                    'history.logCreatedAt as "logCreatedAt"'
                ])
                .getRawMany<{
                    feedbackId: string;
                    firstname: string;
                    lastname: string;
                    nameForChildren: string;
                    logCreatedAt: Date;
                }>();
            const historyMap = new Map<string, LastPupilHistoryOutput>();

            // for ordering feedback in the same order as the ids
            rawHistories.forEach((raw) => {
                historyMap.set(raw.feedbackId, {
                    userName: raw.nameForChildren ?? `${raw.firstname} ${raw.lastname}`,
                    updatedAt: raw.logCreatedAt
                });
            });

            return ids.map((id) => historyMap.get(id) || null);
        } catch (error) {
            console.error('Error fetching last actions for feedbacks:', error);
            throw new Error('Failed to fetch last actions for feedbacks');
        }
    }

    public async getPupilsOfFeedback(id: string): Promise<LwpPupil[]> {
        return await this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoin('pupil.feedbacks', 'pupilFeedback')
            .where('pupilFeedback.id = :pupilFeedbackId', { pupilFeedbackId: id })
            .select(['pupil.id', 'pupil.firstname', 'pupil.lastname']) // we only need the ID, add more if needed
            .getMany();
    }

    public async getPupilSchoolOfFeedback(id: string): Promise<LwpSchool> {
        const school = await this.schoolRepository
            .createQueryBuilder('school')
            .leftJoin('school.pupils', 'pupil')
            .leftJoin('pupil.feedbacks', 'pupilFeedback')
            .where('pupilFeedback.id = :id', { id })
            .select([
                'school.id',
                'school.parentFeedbackTickFeatureEnabledAt',
                'school.isParentFeedbackReplyFeatureEnabled',
                'school.isParentFeedbackStickerFeatureEnabled',
                'school.organisations',
                'school.privacyPolicy',
                'school.enableBookNameOnlyReadingLog'
            ])
            .getOne();

        if (!school?.id) return null;

        return school;
    }

    public async getSchoolsByFeedbackIds(ids: readonly string[]): Promise<(LwpSchool | null)[]> {
        if (!ids.length) return [];

        const rawResults = await this.schoolRepository
            .createQueryBuilder('school')
            .leftJoin('school.pupils', 'pupil')
            .leftJoin('pupil.feedbacks', 'feedback')
            .where('feedback.id IN (:...ids)', { ids })
            .select([
                'school.id as "schoolId"',
                'school.parentFeedbackTickFeatureEnabledAt as "parentFeedbackTickFeatureEnabledAt"',
                'school.isParentFeedbackReplyFeatureEnabled as "isParentFeedbackReplyFeatureEnabled"',
                'school.isParentFeedbackStickerFeatureEnabled as "isParentFeedbackStickerFeatureEnabled"',
                'school.organisations as "organisations"',
                'school.privacyPolicy as "privacyPolicy"',
                'school.enableBookNameOnlyReadingLog as "enableBookNameOnlyReadingLog"',
                'feedback.id as "feedbackId"'
            ])
            .getRawMany<{
                schoolId: string;
                parentFeedbackTickFeatureEnabledAt: Date;
                isParentFeedbackReplyFeatureEnabled: boolean;
                isParentFeedbackStickerFeatureEnabled: boolean;
                organisations: string;
                privacyPolicy: string;
                enableBookNameOnlyReadingLog: boolean;
                feedbackId: string;
            }>();

        const feedbackSchoolMap = new Map<string, LwpSchool>();

        rawResults.forEach((result) => {
            if (result.schoolId) {
                const school = new LwpSchool();

                school.id = result.schoolId;
                school.parentFeedbackTickFeatureEnabledAt = result.parentFeedbackTickFeatureEnabledAt;
                school.isParentFeedbackReplyFeatureEnabled = result.isParentFeedbackReplyFeatureEnabled;
                school.isParentFeedbackStickerFeatureEnabled = result.isParentFeedbackStickerFeatureEnabled;
                school.organisations = result.organisations;
                school.privacyPolicy = result.privacyPolicy;
                school.enableBookNameOnlyReadingLog = result.enableBookNameOnlyReadingLog;

                feedbackSchoolMap.set(result.feedbackId, school);
            }
        });

        const result: (LwpSchool | null)[] = [];

        ids.forEach((id) => {
            result.push(feedbackSchoolMap.get(id) || null);
        });

        return result;
    }

    public async getTeacherLikesOfPupilFeedback(id: string): Promise<LwpUser[]> {
        const pupilFeedback = await this.pupilFeedbackRepository.findOne({ where: { id }, relations: ['teacherLikes'] });

        return pupilFeedback?.teacherLikes?.length > 0 ? pupilFeedback?.teacherLikes : [];
    }

    public async getPupilActivityOfPupilFeedback(id: string): Promise<LwpPupilActivity> {
        const pupilFeedback = await this.pupilFeedbackRepository.findOne({ where: { id }, relations: ['activity'] });

        return pupilFeedback?.activity ? pupilFeedback?.activity : null;
    }

    public async getPupilFeedbackUser(id: string, userId: string, userType: UserType): Promise<LwpUser> {
        const pupilFeedback = await this.pupilFeedbackRepository.findOne({ where: { id }, relations: ['logCreatedBy'] });

        let createdBy: LwpUser = pupilFeedback?.logCreatedBy ? pupilFeedback?.logCreatedBy : null;

        if (
            pupilFeedback?.logCreatedBy &&
            pupilFeedback?.logCreatedBy?.id !== userId &&
            [UserType.TOPICACCESS, UserType.MAGICPARENT].includes(userType)
        ) {
            createdBy = { ...pupilFeedback?.logCreatedBy, firstname: 'Another', lastname: 'parent' } as LwpUser;
        }

        return createdBy;
    }

    public async getFeedbackTickedBy(id: string): Promise<LwpUser> {
        const pupilFeedback = await this.pupilFeedbackRepository
            .createQueryBuilder('lpf')
            .leftJoinAndSelect('lpf.tickedBy', 'tickedBy')
            .where('lpf.id = :id', { id })
            .select(['lpf.id', 'tickedBy.nameForChildren', 'tickedBy.firstname', 'tickedBy.lastname', 'tickedBy.type'])
            .getOne();

        if (pupilFeedback.tickedBy && pupilFeedback.tickedBy.type === UserType.ADMIN) {
            pupilFeedback.tickedBy.nameForChildren = `${pupilFeedback.tickedBy.firstname} ${pupilFeedback.tickedBy.lastname}`;
        }

        return pupilFeedback?.tickedBy;
    }

    public async getPupilFeedbackUserName(id: string, userId: string, userType: UserType, userTrustLevel: UserTrustLevel): Promise<string> {
        const pupilFeedback = await this.pupilFeedbackRepository.findOne({
            where: { id },
            relations: ['logCreatedBy'],
            select: ['id', 'userId', 'userType', 'userName', 'logCreatedBy']
        });

        let userDetails: LwpUser = null;

        if ([UserType.TOPICACCESS, UserType.MAGICPARENT].includes(userType) || userTrustLevel < UserTrustLevel.Full) {
            return pupilFeedback?.userType === UserType.TEACHER ? 'teacher' : pupilFeedback?.userId === userId ? 'you' : 'another parent';
        }

        if (pupilFeedback?.userId && pupilFeedback?.userId !== '0' && !pupilFeedback?.logCreatedBy && !pupilFeedback?.userName) {
            userDetails = await this.userRepository.findOne({
                where: { id: pupilFeedback?.userId },
                select: ['nameForChildren', 'firstname', 'lastname']
            });

            if (!userDetails) return null;

            return userDetails?.nameForChildren || `${userDetails?.firstname} ${userDetails?.lastname}`;
        }

        if (userType === UserType.PARENT && pupilFeedback?.userType === UserType.TEACHER) {
            return pupilFeedback?.logCreatedBy?.nameForChildren || pupilFeedback?.userName;
        }

        return (
            pupilFeedback?.userName ||
            (pupilFeedback?.logCreatedBy?.firstname
                ? `${pupilFeedback?.logCreatedBy?.firstname} ${pupilFeedback?.logCreatedBy?.lastname}`
                : null)
        );
    }

    public async getPupilHistory(
        pupilId: string,
        userId: string,
        userType: UserType,
        userTrustLevel: UserTrustLevel
    ): Promise<LwpPupilFeedback[]> {
        // start generating logs
        const logParentPupilActionInput = new LogParentPupilActionInput();

        logParentPupilActionInput.actionId = LogParentPupilActions.history_accessed.id;
        logParentPupilActionInput.parentId = userId;
        logParentPupilActionInput.userId = userId;
        logParentPupilActionInput.pupilId = pupilId;
        await this.logParentPupilActionService.addLogParentPupilAction(logParentPupilActionInput);
        // end generating logs

        const baseQuery = this.pupilFeedbackRepository
            .createQueryBuilder('pupilFeedback')
            .leftJoin('pupilFeedback.pupils', 'pupil')
            .where('pupil.id = :pupilId', { pupilId })
            .orderBy('pupilFeedback.logCreatedAt', 'DESC');

        if (userTrustLevel === UserTrustLevel.Limited) {
            baseQuery.andWhere('pupilFeedback.originalFeedbackId IS NULL');
        }

        if (userType !== UserType.PARENT) {
            return baseQuery.getMany();
        }

        if (userTrustLevel === UserTrustLevel.Limited) {
            baseQuery.andWhere('pupilFeedback.logCreatedAt >= :twoWeeksAgo', {
                twoWeeksAgo: moment().subtract(14, 'days').format('YYYY-MM-DD')
            });
        }

        return baseQuery
            .leftJoin('pupil.parents', 'parents')
            .leftJoin('parents.parent', 'parent')
            .andWhere('parent.id = :parentId', { parentId: userId })
            .getMany();
    }

    public async pupilHaveHistory(pupilId: string, userId: string): Promise<boolean> {
        return !!(await this.pupilFeedbackRepository
            .createQueryBuilder('pupilFeedback')
            .leftJoin('pupilFeedback.pupils', 'pupil')
            .leftJoin('pupil.parents', 'parent')
            .where('pupil.id = :pupilId', { pupilId })
            .andWhere('parent.parentId = :parentId', { parentId: userId })
            .orderBy('pupilFeedback.logCreatedAt', 'DESC')
            .getCount());
    }

    public async getPupilFeedbacksOfPupilActivity(pupilActivityId: string): Promise<LwpPupilFeedback[]> {
        return await this.pupilFeedbackRepository
            .createQueryBuilder('pupilFeedback')
            .leftJoinAndSelect('pupilFeedback.activity', 'activity')
            .where('activity.id = :pupilActivityId', { pupilActivityId })
            .andWhere('pupilFeedback.originalFeedbackId IS NULL')
            .orderBy('pupilFeedback.logCreatedAt', 'DESC')
            .getMany();
    }

    public async deleteReadingLog(id: string): Promise<OperationStatus> {
        await this.pupilFeedbackMediaService.deleteMediaOfFeedback(id);
        const res = await this.pupilFeedbackRepository.delete(id);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public applyActivityFiltersOnPupilFeedback(
        activity: ActivityTypeForAllFeeds,
        classIds: string[],
        pupilFeedbackBase: SelectQueryBuilder<LwpPupilFeedback>
    ): SelectQueryBuilder<LwpPupilFeedback> {
        switch (activity) {
            case ActivityTypeForAllFeeds.ALL_TOPIC: {
                pupilFeedbackBase = pupilFeedbackBase.andWhere('feedback.type = :type', {
                    type: FeedbackType.ACTIVITY
                });
                break;
            }
            case ActivityTypeForAllFeeds.ALL_READING: {
                pupilFeedbackBase = pupilFeedbackBase.andWhere('feedback.type = :type', {
                    type: FeedbackType.READING
                });
                break;
            }
            case ActivityTypeForAllFeeds.LATEST_TOPIC:
            case ActivityTypeForAllFeeds.CURRENT_TOPIC: {
                pupilFeedbackBase = pupilFeedbackBase
                    .leftJoin('feedback.activity', 'activity')
                    .leftJoin('activity.topic', 'activityPupilTopic')
                    .leftJoin('activityPupilTopic.classTopic', 'activityClassTopic')
                    .andWhere(`activityClassTopic.released = true`)
                    .andWhere(`activityClassTopic.readingTarget IS NULL`);

                if (activity === ActivityTypeForAllFeeds.CURRENT_TOPIC) {
                    pupilFeedbackBase.andWhere(`activityClassTopic.released = true`).andWhere(
                        new Brackets((qb) => {
                            qb.where("activityClassTopic.releaseDate >= current_date - interval '13 days'").andWhere(
                                'activityClassTopic.dueDate IS NULL OR activityClassTopic.dueDate >= current_date'
                            );
                        })
                    );
                } else {
                    pupilFeedbackBase = pupilFeedbackBase.andWhere(
                        new Brackets((qb) => {
                            qb.where(
                                `activityClassTopic.id = (
                                    SELECT sub.id
                                    FROM lwp_class_topic sub
                                    WHERE sub.released = true
                                      AND sub."readingTarget" IS NULL
                                      ${classIds.length ? 'AND sub."classId" IN (:...schoolClassIds)' : ''}
                                    ORDER BY sub."releaseDate" DESC, sub.id  DESC
                                    LIMIT 1
                                )`,
                                { schoolClassIds: classIds }
                            );
                        })
                    );
                }

                break;
            }

            case ActivityTypeForAllFeeds.CURRENT_READING_WEEK:
            case ActivityTypeForAllFeeds.PREVIOUS_READING_WEEK: {
                pupilFeedbackBase = this.joinToReadingTopic(pupilFeedbackBase)
                    .leftJoin('readingPupilTopic.classTopic', 'readingClassTopic')
                    .andWhere(`readingClassTopic.released = true`);

                if (activity === ActivityTypeForAllFeeds.CURRENT_READING_WEEK) {
                    pupilFeedbackBase = pupilFeedbackBase
                        .andWhere("readingClassTopic.releaseDate >= current_date - interval '6 days'")
                        .andWhere('feedback.type = :type', {
                            type: FeedbackType.READING
                        });
                } else {
                    pupilFeedbackBase = pupilFeedbackBase
                        .andWhere(
                            "readingClassTopic.releaseDate >= current_date - interval '13 days' AND readingClassTopic.releaseDate <= current_date - interval '7 days'"
                        )
                        .andWhere('feedback.type = :type', {
                            type: FeedbackType.READING
                        });
                }

                break;
            }
        }

        return pupilFeedbackBase;
    }

    public async applySubjectFiltersOnPupilFeedback(
        subjects: string[],
        pupilFeedbackBase: SelectQueryBuilder<LwpPupilFeedback>
    ): Promise<SelectQueryBuilder<LwpPupilFeedback>> {
        if (!subjects?.length) {
            return pupilFeedbackBase;
        }

        const includeReadingFeedbacks = subjects.includes(constants.readingAsASubjectId);
        const topicSubjectIds = subjects.filter((subjectId) => subjectId !== constants.readingAsASubjectId);

        // Scrapbook entries belong to the Ready Teddy programme but are not linked to a topic/subject,
        // so include them whenever a Ready Teddy subject is selected in the filter.
        let includeScrapbookFeedbacks = false;

        if (topicSubjectIds.length > 0) {
            const readyTeddySubjectCount = await this.subjectRepository
                .createQueryBuilder('subject')
                .where('subject.id IN (:...topicSubjectIds)', { topicSubjectIds })
                .andWhere('subject.programmeType = :programmeType', { programmeType: SubjectProgrammeType.READY_TEDDY })
                .getCount();

            includeScrapbookFeedbacks = readyTeddySubjectCount > 0;

            pupilFeedbackBase = pupilFeedbackBase
                .leftJoin('feedback.activity', 'subjectActivity')
                .leftJoin('subjectActivity.topic', 'subjectPupilTopic')
                .leftJoin('subjectPupilTopic.topic', 'subjectStaticTopic')
                .leftJoin('subjectStaticTopic.domainsAndYearGroups', 'subjectDomainsAndYearGroups')
                .leftJoin('subjectDomainsAndYearGroups.domain', 'subjectDomain')
                .leftJoin('subjectDomain.subject', 'subject');
        }

        return pupilFeedbackBase.andWhere(
            new Brackets((qb) => {
                if (includeReadingFeedbacks) {
                    qb.orWhere('feedback.type = :readingFeedbackType', { readingFeedbackType: FeedbackType.READING });
                }

                if (topicSubjectIds.length > 0) {
                    qb.orWhere('subject.id IN (:...topicSubjectIds)', { topicSubjectIds });
                }

                if (includeScrapbookFeedbacks) {
                    qb.orWhere('feedback.type = :scrapbookFeedbackType', { scrapbookFeedbackType: FeedbackType.SCRAPBOOK });
                }
            })
        );
    }

    public async getPupilActivityFeeds(
        teacherId: string,
        userId: string,
        userType: UserType,
        isSchoolLeader: boolean,
        schoolId: string,
        limit = 15,
        offset = 0,
        filter?: PupilActivityFeedsFilterInput
    ): Promise<Pagination<LwpPupilFeedback>> {
        if (teacherId === userId || userType === UserType.ADMIN) {
            let results = [];
            let total = 0;
            let feedbackIds = [];
            let isJoinedClasses = false;

            let pupilFeedbackBase = this.pupilFeedbackRepository.createQueryBuilder('feedback').innerJoin('feedback.pupils', 'pupil');

            if ((isSchoolLeader || userType == UserType.ADMIN) && schoolId) {
                pupilFeedbackBase = pupilFeedbackBase.innerJoin('pupil.school', 'school').where('school.id = :schoolId', { schoolId });
            } else {
                pupilFeedbackBase = pupilFeedbackBase
                    .innerJoin('pupil.school', 'school')
                    .innerJoin('pupil.classes', 'classes')
                    .innerJoin('classes.period', 'classPeriod', 'classPeriod.index = feedback.periodIndex')
                    .innerJoin('classes.teachers', 'teachers')
                    .where('teachers.id = :teacherId', { teacherId })
                    .andWhere('school.id = :schoolId', { schoolId });

                isJoinedClasses = true;
            }

            pupilFeedbackBase = this.applyActivityFiltersOnPupilFeedback(filter?.activity, filter?.classIds, pupilFeedbackBase);

            pupilFeedbackBase = await this.applySubjectFiltersOnPupilFeedback(filter?.subjects, pupilFeedbackBase);

            if (filter?.feedbackTypes?.length) {
                pupilFeedbackBase = pupilFeedbackBase.andWhere('feedback.type IN (:...feedbackTypes)', {
                    feedbackTypes: filter.feedbackTypes
                });
            }

            if (null != filter?.media && MediaTypeForAllFeeds.ALL !== filter?.media) {
                pupilFeedbackBase = pupilFeedbackBase.leftJoin('feedback.media', 'media');

                switch (filter.media) {
                    case MediaTypeForAllFeeds.HAS_AUDIO: {
                        pupilFeedbackBase = pupilFeedbackBase.andWhere('media.type = :mediaType', { mediaType: MediaType.AUDIO });
                        break;
                    }
                    case MediaTypeForAllFeeds.HAS_PHOTO: {
                        pupilFeedbackBase = pupilFeedbackBase.andWhere('media.type = :mediaType', { mediaType: MediaType.PHOTO });
                        break;
                    }
                }
            }

            if (filter?.sharingPermitted) {
                pupilFeedbackBase = pupilFeedbackBase.andWhere('feedback.sharingAllowed = true');
            }

            if (filter?.postedBefore) {
                pupilFeedbackBase = pupilFeedbackBase.andWhere('feedback.logCreatedAt < :before', { before: filter.postedBefore });
            }

            if (filter?.postedAfter) {
                pupilFeedbackBase = pupilFeedbackBase.andWhere('feedback.logCreatedAt > :after', { after: filter.postedAfter });
            }

            if (filter?.bookName?.trim()?.length > 0) {
                pupilFeedbackBase = pupilFeedbackBase.andWhere('feedback.normalisedBookName ILIKE :bookName', {
                    bookName: `%${filter?.bookName?.trim().toLowerCase()}%`
                });
            }

            if (filter?.academicYear) {
                pupilFeedbackBase = pupilFeedbackBase.andWhere('feedback.periodIndex = :periodIndex', {
                    periodIndex: filter?.academicYear
                });
            } else {
                pupilFeedbackBase = pupilFeedbackBase.andWhere('feedback.periodIndex >= school.curentPeriod.index');
            }

            if (filter?.showOnlyUntickFeed) {
                pupilFeedbackBase = pupilFeedbackBase.andWhere(
                    'feedback.tickedBy IS NULL AND feedback.userType = :userType AND feedback.logCreatedAt >= school.parentFeedbackTickFeatureEnabledAt',
                    {
                        userType: UserType.PARENT
                    }
                );
            }

            if (filter?.classIds?.length) {
                if (!isJoinedClasses) {
                    pupilFeedbackBase = pupilFeedbackBase.innerJoin('pupil.classes', 'classes');
                }

                pupilFeedbackBase = pupilFeedbackBase.andWhere('classes.id IN (:...classIds)', {
                    classIds: filter.classIds
                });
            }

            [feedbackIds, total] = await pupilFeedbackBase
                .select('feedback.id')
                .andWhere('feedback.originalFeedbackId IS NULL')
                .groupBy('feedback.id')
                .orderBy('feedback.logCreatedAt', 'DESC')
                .offset(offset)
                .limit(limit * 2)
                .getManyAndCount();

            if (feedbackIds.length === 0) {
                return new Pagination<LwpPupilFeedback>({
                    results: [],
                    total: total,
                    limit,
                    offset
                });
            }

            results = await this.pupilFeedbackRepository
                .createQueryBuilder('feedback')
                .leftJoinAndSelect('feedback.feedbackReplies', 'feedbackReplies')
                .orderBy('feedback.logCreatedAt', 'DESC')
                .andWhere('feedback.id IN (:...feedbackIds)', {
                    feedbackIds: feedbackIds?.map(({ id }) => id)
                })
                .getMany();

            return new Pagination<LwpPupilFeedback>({
                results,
                total,
                limit,
                offset
            });
        }

        throw new HttpException('Forbidden Resource', ErrorStatusCodeEnum._403);
    }

    public async getFeedBackById(feedbackId: string): Promise<LwpPupilFeedback> {
        const results = await this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .orderBy('feedback.logCreatedAt', 'DESC')
            .andWhere('feedback.id = :feedbackId', {
                feedbackId
            })
            .getOne();

        const pfMediaBase = this.pupilFeedbackMediaRepository
            .createQueryBuilder('feedbackMedia')
            .leftJoin('feedbackMedia.feedback', 'feedback')
            .where('feedback.id = :feedbackId', { feedbackId: results.id });

        results.photos = await pfMediaBase.andWhere({ type: MediaType.PHOTO }).getMany();

        results.audios = await pfMediaBase.andWhere({ type: MediaType.AUDIO }).getMany();

        return results;
    }

    public async likePupilActivityFeedback(input: LikePupilActivityFeedbackInput): Promise<LwpPupilFeedback> {
        const { feedId, teacherId } = input;
        const pupilFeedback = await this.pupilFeedbackRepository.findOne({
            where: { id: feedId },
            relations: ['teacherLikes']
        });
        const teacher = await this.userRepository.findOne({ where: { id: teacherId } });

        if (!teacher || !pupilFeedback) throw new HttpException('Teacher or Feedback does not exist', ErrorStatusCodeEnum._535);

        const isLiking = pupilFeedback.teacherLikes?.filter((teacherLiked) => teacherLiked.id == teacherId).length ? false : true;

        if (isLiking) {
            pupilFeedback.teacherLikes.push(teacher);
        } else {
            pupilFeedback.teacherLikes = pupilFeedback.teacherLikes?.filter((teacherLiked) => teacherLiked.id != teacherId);
        }

        await this.pupilFeedbackRepository.save(pupilFeedback);

        return pupilFeedback;
    }

    public async getTeacherLikedActivityFeeds(teacherId: string): Promise<LwpPupilFeedback[]> {
        const teacherLikedFeedbacks = await this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .leftJoinAndSelect('feedback.teacherLikes', 'teacher')
            .where('teacher.id = :teacherId', { teacherId })
            .orderBy('feedback.logCreatedAt', 'DESC')
            .getMany();

        return teacherLikedFeedbacks;
    }

    public async deleteFeedback(id: string, reasonToDelete: string, userId: string): Promise<LwpPupilFeedback> {
        const deletedBy = this.shallowUserService.newShallowUser(userId);

        const pupilFeedback = await this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .leftJoinAndSelect('feedback.activity', 'activity')
            .leftJoinAndSelect('activity.topic', 'topic')
            .leftJoinAndSelect('feedback.pupils', 'pupils')
            .leftJoinAndSelect('feedback.period', 'period')
            .where('feedback.id = :id', { id })
            .getOne();

        if (!pupilFeedback) throw new HttpException('Feedback does not exist', ErrorStatusCodeEnum._535);

        return await this.connection.manager.transaction(async (manager) => {
            // Associate deletedBy before deletion
            const res = await manager.getRepository(LwpPupilFeedback).update(id, { deletedBy });

            if (res.affected > 0) {
                const copiedFeedback = new LwpPupilFeedback();

                copiedFeedback.bookReadAt = pupilFeedback.bookReadAt;
                copiedFeedback.entryDeletedAt = new Date();

                copiedFeedback.originalFeedbackId = pupilFeedback.id;

                copiedFeedback.logCreatedAt = pupilFeedback.logCreatedAt;
                copiedFeedback.logUpdatedAt = pupilFeedback.logUpdatedAt;

                copiedFeedback.type = pupilFeedback.type;
                copiedFeedback.readingType = pupilFeedback.readingType;
                copiedFeedback.readingMode = pupilFeedback.readingMode;

                copiedFeedback.activity = pupilFeedback.activity;
                copiedFeedback.pupils = pupilFeedback.pupils;
                copiedFeedback.period = pupilFeedback.period;

                copiedFeedback.logCreatedBy = deletedBy;
                if (reasonToDelete) copiedFeedback.reasonToDelete = reasonToDelete;

                const savedCopiedFeedback = await manager.save(LwpPupilFeedback, copiedFeedback);

                if (savedCopiedFeedback.type === FeedbackType.READING) {
                    const pupilTopicIds = (
                        await this.getPupilTopicIdsOfFeedback(savedCopiedFeedback?.id, manager.getRepository(LwpPupilFeedback))
                    ).filter((pupilTopicId) => pupilTopicId != null);

                    const pupilTopicIdsSet = [...new Set(pupilTopicIds)];

                    if (pupilTopicIdsSet.length > 0) {
                        await this.updatePupilTopicStarCountReadingBatch(pupilTopicIdsSet, manager.getRepository(LwpPupilTopic));
                    }
                } else if (savedCopiedFeedback.type === FeedbackType.ACTIVITY) {
                    /**
                     * Count the remaining feedback entries for the activity from which the feedback is being deleted.
                     */
                    const remainingFeedbacks = await manager.count(LwpPupilFeedback, {
                        where: {
                            activity: { id: pupilFeedback.activity.id },
                            originalFeedbackId: null
                        }
                    });

                    /**
                     * Retrieve the pupil's topic associated with this activity.
                     */
                    const pupilTopic = pupilFeedback.activity.topic;

                    if (pupilTopic && remainingFeedbacks === 0) {
                        const earnedStartPupilTopicActivityCount = await manager.count(LwpPupilActivity, {
                            where: {
                                topic: { id: pupilTopic.id },
                                earnedStar: true
                            }
                        });

                        /**
                         * - For watching a video, the silverStars count starts at one.
                         * - When the first feedback is logged, the silverStars count remains one, but "earnedGoldStar" becomes true.
                         * - When feedback is logged for another activity of the same topic, the silverStars count increases.
                         *   This means if a feedback entry is deleted and no remaining feedback exists for the activity,
                         *   and if the silverStars count is greater than one, we decrement the silverStars count by one.
                         */
                        if (pupilTopic.silverStars > 1) {
                            pupilTopic.silverStars -= 1;
                        }

                        /**
                         * If the remaining feedback count for the activity is zero, set "earnedStar" to false.
                         * If no activities in the topic have "earnedStar" set to true, set "earnedGoldStar" to false.
                         */

                        pupilTopic.earnedGoldStar = earnedStartPupilTopicActivityCount > 1;

                        await manager.update(LwpPupilActivity, { id: pupilFeedback.activity.id }, { earnedStar: false });
                        await manager.save(LwpPupilTopic, pupilTopic);
                    }
                }

                return savedCopiedFeedback;
            }

            throw new HttpException('Failed to delete feedback', ErrorStatusCodeEnum._535);
        });
    }

    public async savePupilFeedbackRating(id: string, rating: number): Promise<LwpPupilFeedback> {
        const pupilFeedback = await this.pupilFeedbackRepository.findOne({ where: { id } });

        if (!pupilFeedback) throw new HttpException('Feedback does not exist', ErrorStatusCodeEnum._535);

        pupilFeedback.rating = rating;

        return await this.pupilFeedbackRepository.save(pupilFeedback);
    }

    public readingFeedbackClassNamesBaseQuery(id: string): SelectQueryBuilder<LwpPupilFeedback> {
        return this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .innerJoin('feedback.pupils', 'pupils')
            .innerJoinAndSelect(
                'pupils.classes',
                'classes',
                'classes.period.index = feedback.periodIndex and classes."isRegistrationClass" = true and classes."IsReadingLogsEnabled" = true'
            )
            .where('feedback.id = :id', { id });
    }

    public async getFeedbackClassName(feedback: LwpPupilFeedback): Promise<string> {
        let className: string = '';

        if (feedback.type === FeedbackType.READING) {
            const classData = await this.readingFeedbackClassNamesBaseQuery(feedback.id)
                .select(['classes.id as id', 'classes.name as "name"'])
                .groupBy('classes.id')
                .orderBy('classes.name', 'ASC')
                .getRawOne<{ id: string; name: string }>();

            className = classData?.name;
        } else {
            const joinedBase = this.joinFeedbackToTopic(feedback, this.pupilTopicRepository.createQueryBuilder('topic'));

            const classData = await joinedBase.query
                .leftJoin('topic.classTopic', 'classTopic')
                .leftJoin('classTopic.class', 'class')
                .select(['class.name as "name"'])
                .where(`${joinedBase.alias}.id = :id`, { id: feedback.id })
                .getRawOne<{ name: string }>();

            className = classData?.name;
        }

        return className;
    }

    public async isFeedbackDoneInMultipleClasses(id: string): Promise<boolean> {
        const classData = await this.readingFeedbackClassNamesBaseQuery(id)
            .select('COUNT(DISTINCT classes.id)', 'count')
            .getRawOne<{ count: number }>();

        return classData.count > 1;
    }

    public async getFeedbackPupilsClasses(feedbackId: string): Promise<LwpSchoolClass[]> {
        const classData = await this.readingFeedbackClassNamesBaseQuery(feedbackId)
            .select(['classes.id as id', 'classes.name as "name"'])
            .groupBy('classes.id')
            .orderBy('classes.name', 'ASC')
            .getRawMany<{ id: string; name: string }>();

        return classData as LwpSchoolClass[];
    }

    public async sendParentNotificationOfTeacherReadingComment(): Promise<boolean> {
        await this.connection.transaction(async (manager) => {
            await manager.query(
                `SET LOCAL statement_timeout = ${process.env.ALLOW_SCHEDULING === 'true' || process.env.REPL === 'true' ? '0' : "'300s'"}`
            );

            await manager.getRepository(LwpPupilFeedback).query(`
                with needsSendingParentNotif as (
                    select distinct on (lu_parent.id, ls.id, lp.id, lsc.id, lu_teacher.id, lpf.id)
                        (lu_parent.*)::lwp_user as "lwpUserParent",
                        ls.id as "schoolId",
                        case lu_parent."notificationPreference" when 'EMAILREMINDER' then 'email' when 'SMSREMINDER' then 'phone' else null end as "notifPreference",
                        (lp.*)::lwp_pupil as "lwpPupil",
                        lpt.id as "pupilTopicId",
                        lsc.id as "classId",
                        lpt."classTopicId" as "classTopicId",
                        ls."schoolName" as "schoolName",
                        lsc.name as "className",
                        lu_teacher."nameForChildren" as "teacherName",
                        lpt."releaseDate" as "releaseDate",
                        lpf."logCreatedAt" as "feedbackCreatedAt",
                        lpf.comment as "comment",
                        lpf.id as "pupilFeedbackId"
                    from
                        lwp_pupil_feedback lpf
                        -- one-to-many or zero, but we only care about the one-to-many case, and we handle this with the distinct
                        join lwp_view_reading_log_to_reading_topic lvrltrt on lvrltrt."pupilFeedbackId" = lpf.id
                        join lwp_pupil_topic lpt on lvrltrt."pupilTopicId" = lpt.id
                        join lwp_pupil_feedback_history lpfh on lpfh."lwpPupilFeedbackId" = lpf.id
                        -- one-to-one
                        join lwp_class_topic lct on lpt."classTopicId" = lct.id
                        -- one-to-many but only one per parent
                        join lwp_pupil_parent lpp on lpfh."lwpPupilId" = lpp."pupilId"
                        -- one-to-one
                        join lwp_view_notifiable_parents lu_parent on lpp."parentId" = lu_parent.id
                        -- one-to-one
                        join lwp_pupil lp on lpfh."lwpPupilId" = lp.id
                        -- one-to-one
                        join lwp_school_class lsc on lct."classId" = lsc.id
                        -- one-to-one
                        join lwp_user lu_teacher on lsc."mainTeacherId" = lu_teacher.id
                        -- one-to-one
                        join lwp_school ls on lsc."schoolId" = ls.id
                        -- one-to-one
                        join lwp_view_can_notify_school lvcns on lsc."schoolId" = lvcns."schoolId"
                    where
                        lpf."notifyParent"
                        and lpp.status = 'ACTIVE'
                        and not ls.inactive
                    -- this combined with the DISTINCT means we only get the biggest ID if there's multiple for a feedback
                    order by lu_parent.id, ls.id, lp.id, lsc.id, lu_teacher.id, lpf.id, lpt.id desc
                    ),
                    topicMagicLinks as (
                    insert into lwp_magic_link ("userId", "pupilId", "type", "context")
                        select
                            ("lwpUserParent").id,
                            ("lwpPupil").id,
                            'READING',
                            jsonb_build_object('pupilTopicId', "pupilTopicId")
                        from
                            needsSendingParentNotif
                        returning
                            "userId",
                            "url",
                            "context"
                    ),
                    generatedNotifs as (
                    insert into lwp_notification overriding user value
                        select
                            (gen_notif_data ("lwpUserParent", "notifPreference", 'sendParentNotificationOfTeacherReadingComment', false, jsonb_build_object(
                                'PUPILID', (nn."lwpPupil").id,
                                'PUPILTOPICID', nn."pupilTopicId",
                                'PUPILFEEDBACKID', nn."pupilFeedbackId",
                                'CLASSID', nn."classId",
                                'CLASSTOPICID', nn."classTopicId",
                                'CHILDFIRSTNAME', (nn."lwpPupil").firstname,
                                'CHILDLASTNAME', (nn."lwpPupil").lastname,
                                'SCHOOL', nn."schoolName",
                                'CLASS', nn."className",
                                'TEACHERALIAS', nn."teacherName",
                                'RELEASEDATE', nn."releaseDate",
                                'READINGENTRYDATE', nn."feedbackCreatedAt"::date,
                                'COMMENT', nn."comment",
                                'MAGICID', tml.url
                            ))).*
                        from
                            needsSendingParentNotif nn
                            join topicMagicLinks tml on (nn."lwpUserParent").id = tml."userId"
                                and nn."pupilTopicId" = (tml.context -> 'pupilTopicId')::bigint
                            returning
                                "userId",
                                "params"
                    )
                update
                    lwp_pupil_feedback
                set
                    "notifyParent" = false
                where
                    id in (
                        select
                            ("params"->'PUPILFEEDBACKID')::bigint
                        from
                            generatedNotifs
                    );
            `);
        });

        return true;
    }

    public async markFeedbacksAsTicked(feedbackId: string, tickedById: string): Promise<void> {
        const tickedBy = this.shallowUserService.newShallowUser(tickedById);

        await this.pupilFeedbackRepository.update({ id: feedbackId }, { tickedBy, tickedAt: new Date() });
    }

    public async buildPupilFeedbacksQueryBuilder(
        pupilId: string,
        teacherId: string,
        filter: PupilActivityFeedsFilterInput,
        userId: string,
        userType: UserType,
        isSchoolLeader: boolean,
        schoolId: string
    ): Promise<SelectQueryBuilder<LwpPupilFeedback>> {
        let pupilFeedbackBase: SelectQueryBuilder<LwpPupilFeedback> = null;

        pupilFeedbackBase = this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .innerJoin('feedback.pupils', 'pupil')
            .innerJoin('pupil.school', 'school')
            .where('feedback.userType = :userType', { userType: UserType.PARENT })
            .andWhere('feedback.tickedBy IS NULL')
            .andWhere('feedback.originalFeedbackId IS NULL');

        if (pupilId) {
            pupilFeedbackBase = pupilFeedbackBase
                .andWhere('pupil.id = :pupilId', { pupilId })
                .andWhere('feedback.type = :type', { type: FeedbackType.READING });
        } else {
            let isJoinedClasses = false;

            if (teacherId === userId || userType === UserType.ADMIN) {
                if ((isSchoolLeader || userType == UserType.ADMIN) && schoolId) {
                    pupilFeedbackBase = pupilFeedbackBase.andWhere('school.id = :schoolId', { schoolId });
                } else {
                    isJoinedClasses = true;
                    pupilFeedbackBase = pupilFeedbackBase
                        .innerJoin('pupil.classes', 'classes')
                        .innerJoin('classes.period', 'classPeriod', 'classPeriod.index = feedback.periodIndex')
                        .innerJoin('classes.teachers', 'teachers')
                        .andWhere('teachers.id = :teacherId', { teacherId });
                }

                pupilFeedbackBase = this.applyActivityFiltersOnPupilFeedback(filter.activity, filter.classIds, pupilFeedbackBase);

                pupilFeedbackBase = await this.applySubjectFiltersOnPupilFeedback(filter?.subjects, pupilFeedbackBase);

                if (filter?.feedbackTypes?.length) {
                    pupilFeedbackBase = pupilFeedbackBase.andWhere('feedback.type IN (:...feedbackTypes)', {
                        feedbackTypes: filter.feedbackTypes
                    });
                }

                if (null != filter.media && MediaTypeForAllFeeds.ALL !== filter.media) {
                    pupilFeedbackBase = pupilFeedbackBase.leftJoin('feedback.media', 'media');

                    switch (filter.media) {
                        case MediaTypeForAllFeeds.HAS_AUDIO: {
                            pupilFeedbackBase = pupilFeedbackBase.andWhere('media.type = :mediaType', { mediaType: MediaType.AUDIO });
                            break;
                        }
                        case MediaTypeForAllFeeds.HAS_PHOTO: {
                            pupilFeedbackBase = pupilFeedbackBase.andWhere('media.type = :mediaType', { mediaType: MediaType.PHOTO });
                            break;
                        }
                    }
                }

                if (filter?.sharingPermitted) {
                    pupilFeedbackBase = pupilFeedbackBase.andWhere('feedback.sharingAllowed = true');
                }

                if (filter?.postedBefore) {
                    pupilFeedbackBase = pupilFeedbackBase.andWhere('feedback.logCreatedAt < :before', { before: filter.postedBefore });
                }

                if (filter?.postedAfter) {
                    pupilFeedbackBase = pupilFeedbackBase.andWhere('feedback.logCreatedAt > :after', { after: filter.postedAfter });
                }

                if (filter?.bookName?.trim()?.length > 0) {
                    pupilFeedbackBase = pupilFeedbackBase.andWhere('feedback.normalisedBookName ILIKE :bookName', {
                        bookName: `%${filter?.bookName?.trim().toLowerCase()}%`
                    });
                }

                if (filter?.academicYear) {
                    pupilFeedbackBase = pupilFeedbackBase.andWhere('feedback.periodIndex = :periodIndex', {
                        periodIndex: filter?.academicYear
                    });
                } else {
                    // Match getPupilActivityFeeds' default ("current year onwards"), so the unticked
                    // count and mark-all-as-ticked operate on the same set the feed displays.
                    pupilFeedbackBase = pupilFeedbackBase.andWhere('feedback.periodIndex >= school.curentPeriod.index');
                }

                if (filter?.classIds?.length) {
                    if (!isJoinedClasses) {
                        pupilFeedbackBase = pupilFeedbackBase.innerJoin('pupil.classes', 'classes');
                    }

                    pupilFeedbackBase = pupilFeedbackBase.andWhere('classes.id IN (:...classIds)', {
                        classIds: filter.classIds
                    });
                }
            }
        }

        return pupilFeedbackBase.andWhere('feedback.logCreatedAt >= school.parentFeedbackTickFeatureEnabledAt');
    }

    public async haveUnTickedFeedbacks(
        pupilId: string,
        teacherId: string,
        filter: PupilActivityFeedsFilterInput,
        userId: string,
        userType: UserType,
        isSchoolLeader: boolean,
        schoolId: string
    ): Promise<boolean> {
        const queryBuilder = await this.buildPupilFeedbacksQueryBuilder(
            pupilId,
            teacherId,
            filter,
            userId,
            userType,
            isSchoolLeader,
            schoolId
        );

        return (await queryBuilder.getCount()) > 0;
    }

    public async markAllFeedbacksAsTicked(
        pupilId: string,
        teacherId: string,
        filter: PupilActivityFeedsFilterInput,
        userId: string,
        userType: UserType,
        isSchoolLeader: boolean,
        schoolId: string
    ): Promise<boolean> {
        const queryBuilder = await this.buildPupilFeedbacksQueryBuilder(
            pupilId,
            teacherId,
            filter,
            userId,
            userType,
            isSchoolLeader,
            schoolId
        );

        const feedbacks = await queryBuilder.select(['feedback.id']).getMany();

        const feedbackIDs = feedbacks.map((f) => f.id);

        const tickedBy = this.shallowUserService.newShallowUser(userId);

        await this.pupilFeedbackRepository.update({ id: In(feedbackIDs) }, { tickedBy, tickedAt: new Date() });

        return true;
    }

    public async getPupilFeedbackByPupilTopicId(pupilTopicId: string, pupilId: string, type: FeedbackType): Promise<LwpPupilFeedback[]> {
        let feedbackQuery = this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .innerJoin('feedback.pupils', 'pupil')
            .where('pupil.id = :pupilId', { pupilId });

        if (type === FeedbackType.ACTIVITY) {
            feedbackQuery = feedbackQuery
                .innerJoin('feedback.activity', 'pupilActivity')
                .andWhere('pupilActivity.topic.id = :pupilTopicId', { pupilTopicId })
                .andWhere('feedback.type = :type', { type: FeedbackType.ACTIVITY });
        } else {
            feedbackQuery = this.joinToReadingTopic(feedbackQuery)
                .andWhere('readingPupilTopic.id = :pupilTopicId', { pupilTopicId })
                .andWhere('feedback.type = :type', { type: FeedbackType.READING });
        }

        return await feedbackQuery.orderBy('feedback.logCreatedAt', 'DESC').getMany();
    }

    public async getPupilFeedbacksByTopicIdAndbookReadAt(pupilTopicId: string, bookReadAt: Date): Promise<LwpPupilFeedback[]> {
        return this.joinToReadingTopic(this.pupilFeedbackRepository.createQueryBuilder('lpf'))
            .where('lpf.bookReadAt = :bookReadAt AND lpf.type = :type AND lpf.originalFeedbackId IS NULL', {
                bookReadAt,
                type: FeedbackType.READING
            })
            .andWhere('readingPupilTopic.id = :pupilTopicId', { pupilTopicId })
            .select([
                'lpf.id',
                'lpf.bookName',
                'lpf.userName',
                'lpf.pageNumber',
                'lpf.userType',
                'lpf.comment',
                'lpf.bookReadAt',
                'lpf.isBookFinished',
                'lpf.logCreatedAt'
            ])
            .orderBy('lpf.logCreatedAt', 'DESC')
            .getMany();
    }
}
