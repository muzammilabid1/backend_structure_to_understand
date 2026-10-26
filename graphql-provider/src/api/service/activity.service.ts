import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileUpload } from 'graphql-upload';
import { SetByTeacherDataType } from 'lwp-shared';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { appConstants } from 'src/constants';
import { BaseEntity, EntityManager, In, Repository } from 'typeorm';

import { StaticLwpActivityLegacy } from '../dtos/StaticLwpActivityLegacy';
import { StaticLwpActivity, StaticLwpActivitySteps } from '../entities/activity';
import { LwpSetByTeacherStepMedia } from '../entities/lwp_set_by_teacher_step_media';
import { StaticLwpModal } from '../entities/modal';
import { StaticLwpTopic } from '../entities/static_topic';
import { LwpUser } from '../entities/user';
import {
    ActivityInput,
    ActivityStepInput,
    ActivityStepType,
    ActivityType,
    AddActivityStepsInput,
    ErrorStatusCodeEnum,
    OperationStatus,
    SetByTeacherDataOutput,
    UpdateActivityInput,
    UpdateActivityStepInput
} from '../model';
import { HelperService } from './helper.service';
import { MagicLinkService } from './magic_link.service';
import { PupilActivityService } from './pupil_activity.service';
import { QueryBaseService } from './query_base.service';
import { StaticLwpActivityTagService } from './static_lwp_activity_tag.service';
@Injectable()
export class ActivityService {
    constructor(
        @InjectRepository(StaticLwpActivity)
        private activityRepository: Repository<StaticLwpActivity>,
        @InjectRepository(StaticLwpTopic)
        private topicRepository: Repository<StaticLwpTopic>,
        @InjectRepository(StaticLwpActivitySteps)
        private staticLwpActivityStepsRepository: Repository<StaticLwpActivitySteps>,
        @InjectRepository(LwpSetByTeacherStepMedia)
        private setByTeacherMediaRepository: Repository<LwpSetByTeacherStepMedia>,
        private queryBaseService: QueryBaseService,
        private helperService: HelperService,
        private pupilActivityService: PupilActivityService,
        private magicLinkService: MagicLinkService,
        private staticLwpActivityTagService: StaticLwpActivityTagService,
        private shallowUserService: ShallowUserService
    ) {}

    public mapInputToActivity(input: Omit<ActivityInput, 'steps' | 'topicId'>, topic: StaticLwpTopic, userId: string): StaticLwpActivity {
        const activity = new StaticLwpActivity();

        activity.topic = topic;
        activity.name = input.name;
        activity.resources = input?.resources && JSON.parse(input?.resources)?.length ? JSON.parse(input?.resources) : null;
        activity.activityType = input.activityType;
        activity.order = input.order;
        activity.welcomeMessage = input.welcomeMessage;
        activity.rationaleModal = input.rationaleModalId ? ({ id: input.rationaleModalId } as StaticLwpModal) : null;
        activity.details = input.details;
        activity.isHidden = input.isHidden;
        activity.hidePhotoUpload = input.hidePhotoUpload;
        activity.logCreatedBy = { id: userId } as LwpUser;
        activity.logUpdatedBy = { id: userId } as LwpUser;

        return activity;
    }

    public async addActivity(input: ActivityInput, file: FileUpload[], userId: string): Promise<StaticLwpActivity> {
        let fileUploads = [];

        const topic = await this.topicRepository.findOne({ where: { id: input.topicId } });

        if (!topic) throw new HttpException('Topic does not exist', ErrorStatusCodeEnum._535);

        const activity = this.mapInputToActivity(input, topic, userId);

        if (file && file.filter((f) => f).length) {
            fileUploads = await Promise.all(file);
        }

        if (fileUploads.length > 0) {
            const cardImageFile = fileUploads.find((fileUpload) => this.helperService.isCardImage(fileUpload?.filename));

            if (cardImageFile) {
                const filename = `${new Date().getTime()}_${cardImageFile?.filename}`;

                await this.helperService.uploadFile(
                    `${appConstants.minioPaths.public.cardIconsForActivites}/${filename}`,
                    cardImageFile,
                    true
                );
                activity.cardImage = filename;
            }
        }

        const activityRes = await this.activityRepository.save(activity);

        activityRes.cardImage = activityRes.cardImage
            ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.cardIconsForActivites}/${activityRes.cardImage}`)
            : null;

        if (input.activityType === ActivityType.LEGACY && input?.steps?.length > 0) {
            await this.helperService.addStepFiles(input?.steps, file);

            const newSteps: Omit<
                StaticLwpActivitySteps,
                keyof BaseEntity | 'id' | 'modal' | 'deletedBy' | 'linkOpenCount' | 'setByTeacherMedia'
            >[] = await Promise.all(
                input?.steps
                    .map((s) => {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { fileIdentifier, ...rest } = s;

                        return rest;
                    })
                    .map(async (step) => {
                        let properties = JSON.parse(step?.properties);

                        if (step.stepType === ActivityStepType.TEXTDICE) {
                            properties = await this.helperService.getTextDiceStepProperties(step?.properties, fileUploads);
                        }

                        return { ...step, activity: activityRes, properties: properties };
                    })
            );

            await this.staticLwpActivityStepsRepository.save(newSteps);
        }

        return activityRes;
    }

    public async getActivity(id: string): Promise<StaticLwpActivity> {
        const activity = await this.activityRepository.findOne({ where: { id } });

        if (!activity) throw new HttpException('Activity does not exist', ErrorStatusCodeEnum._535);

        activity.cardImage = activity.cardImage
            ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.cardIconsForActivites}/${activity.cardImage}`)
            : null;
        activity.resources = activity?.resources ? JSON.stringify(activity?.resources) : null;

        return activity;
    }

    public async allActivities(): Promise<Omit<StaticLwpActivity, keyof BaseEntity>[]> {
        const activities = await this.activityRepository.find({ order: { name: 'ASC' } });

        if (activities?.length === 0) return [];

        const mappedActivities = activities.map((activity) => ({
            ...activity,
            cardImage: activity?.cardImage
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.cardIconsForActivites}/${activity.cardImage}`)
                : null
        }));

        return mappedActivities;
    }

    public async getDemoActivity(id: string, magicLinkUrl?: string): Promise<StaticLwpActivity> {
        let skip = false;

        const activity = await this.activityRepository.findOne({ where: { id }, relations: ['topic'] });

        if (!activity || !activity.topic) throw new HttpException('Activity does not exist', ErrorStatusCodeEnum._535);

        if (magicLinkUrl) {
            const magicLink = await this.magicLinkService.verifyMagicLink(magicLinkUrl, null);

            if (magicLink?.context?.topicId === activity?.topic?.id) skip = true;
        }

        if (!skip && !activity.topic?.isDemo) throw new HttpException('Its not a Demo Activity', ErrorStatusCodeEnum._535);
        activity.cardImage = this.helperService.getPublicUrl(
            `${appConstants.minioPaths.public.cardIconsForActivites}/${activity.cardImage}`
        );

        return activity;
    }

    public async getTopicActivities(topicId: string): Promise<Omit<StaticLwpActivity, keyof BaseEntity>[]> {
        const activities = await this.activityRepository
            .createQueryBuilder('activity')
            .leftJoinAndSelect('activity.topic', 'staticTopic')
            .where('staticTopic.id = :topicId', { topicId })
            .andWhere('activity.isHidden = :isHidden', { isHidden: false })
            .orderBy('activity.order', 'ASC')
            .getMany();

        return activities.map((activity) => ({
            ...activity,
            cardImage: this.helperService.getPublicUrl(`${appConstants.minioPaths.public.cardIconsForActivites}/${activity.cardImage}`)
        }));
    }

    /**
     * Batch method for DataLoader: Get activities for multiple topic IDs
     */
    public async getActivitiesByTopicIds(topicIds: readonly string[]): Promise<StaticLwpActivity[][]> {
        if (topicIds.length === 0) return [];

        const activities = await this.activityRepository
            .createQueryBuilder('activity')
            .leftJoinAndSelect('activity.topic', 'staticTopic')
            .where('staticTopic.id IN (:...topicIds)', { topicIds })
            .andWhere('activity.isHidden = :isHidden', { isHidden: false })
            .orderBy('staticTopic.id', 'ASC')
            .addOrderBy('activity.order', 'ASC')
            .getMany();

        // Group activities by topic ID and maintain order of requested topicIds
        const activitiesByTopicId: Record<string, StaticLwpActivity[]> = {};

        activities.forEach((activity) => {
            const topicId = activity.topic.id;

            if (!activitiesByTopicId[topicId]) activitiesByTopicId[topicId] = [];
            const activityWithUpdatedImage = {
                ...activity,
                cardImage: this.helperService.getPublicUrl(`${appConstants.minioPaths.public.cardIconsForActivites}/${activity.cardImage}`)
            } as StaticLwpActivity;

            activitiesByTopicId[topicId].push(activityWithUpdatedImage);
        });

        const result: StaticLwpActivity[][] = [];

        topicIds.forEach((topicId) => {
            result.push(activitiesByTopicId[topicId] || []);
        });

        return result;
    }

    public async deleteActivity(id: string, deletedBy: string | LwpUser, manager: EntityManager): Promise<OperationStatus> {
        const pupilActivitiesCount = await this.activityRepository
            .createQueryBuilder('activity')
            .leftJoin('activity.pupilActivities', 'pupilActivity')
            .where('activity.id = :id', { id })
            .select('COUNT(pupilActivity.id)', 'count')
            .getRawOne();

        if (pupilActivitiesCount?.count > 0) {
            throw new HttpException('This activity cannot be deleted because it has associated with pupils.', ErrorStatusCodeEnum._535);
        }

        const activitySteps = await this.staticLwpActivityStepsRepository.find({ where: { activity: { id } } });

        if (activitySteps?.length > 0) {
            for (const step of activitySteps) {
                await this.deleteActivityStep(step.id, deletedBy, manager);
            }
        }

        const res = await manager.update(StaticLwpActivity, id, {
            deletedBy: this.shallowUserService.newShallowUser(deletedBy)
        });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async deleteActivityStep(id: string, deletedBy: string | LwpUser, manager?: EntityManager): Promise<OperationStatus> {
        const res = await (manager ?? this.staticLwpActivityStepsRepository).update(StaticLwpActivitySteps, id, {
            deletedBy: this.shallowUserService.newShallowUser(deletedBy)
        });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async deleteActivitySteps(id: string): Promise<boolean> {
        const activitySteps = await this.staticLwpActivityStepsRepository.find({ where: { activity: { id } } });

        for (const step of activitySteps) {
            if (step.stepType === ActivityStepType.TEXT_AND_IMAGE) {
                await this.helperService.removeFile(`${appConstants.minioPaths.public.imageActivitySteps}/${step?.imageUrl}`, true);
            }

            if (step.stepType === ActivityStepType.DOWNLOAD) {
                await this.helperService.removeFile(`${appConstants.minioPaths.public.fileActivitySteps}/${step?.downloadUrl}`, true);
            }

            if (step.stepType === ActivityStepType.IMAGE) {
                await this.helperService.removeFile(`${appConstants.minioPaths.public.imageActivitySteps}/${step?.imageUrl}`, true);
            }

            if (step.stepType === ActivityStepType.AUDIO) {
                await this.helperService.removeFile(`${appConstants.minioPaths.public.fileActivitySteps}/${step?.audioUrl}`, true);
            }

            await this.staticLwpActivityStepsRepository.delete(step.id);
        }

        return true;
    }

    public async updateActivity(input: UpdateActivityInput, file: FileUpload[]): Promise<StaticLwpActivity> {
        const activity = await this.activityRepository.findOne({ where: { id: input.id } });
        let fileUploads = [];

        if (!activity) throw new HttpException('Activity does not exist', ErrorStatusCodeEnum._535);
        activity.name = input.name;
        activity.order = input.order;
        activity.isHidden = input.isHidden;
        activity.hidePhotoUpload = input.hidePhotoUpload;
        activity.welcomeMessage = input.welcomeMessage;
        activity.rationaleModal = input.rationaleModalId ? ({ id: input.rationaleModalId } as StaticLwpModal) : null;
        activity.details = input.details ?? activity.details;
        activity.activityType = input.activityType ?? activity.activityType;
        activity.resources = input?.resources && JSON.parse(input?.resources)?.length > 0 ? JSON.parse(input?.resources) : null;
        if (input.starValue !== undefined) activity.starValue = input.starValue;
        if (activity.cardImage && !input.hasCardImage) {
            await this.helperService.removeFile(`${appConstants.minioPaths.public.cardIconsForActivites}/${activity.cardImage}`, true);
            activity.cardImage = null;
        }

        if (file && file.filter((f) => f).length) {
            fileUploads = await Promise.all(file);
        }

        if (fileUploads.length > 0) {
            const cardImageFile = fileUploads.find((fileUpload) => this.helperService.isCardImage(fileUpload?.filename));

            if (cardImageFile) {
                const filename = `${new Date().getTime()}_${cardImageFile?.filename}`;

                await this.helperService.uploadFile(
                    `${appConstants.minioPaths.public.cardIconsForActivites}/${filename}`,
                    cardImageFile,
                    true
                );
                activity.cardImage = filename;
            }
        }

        if (input?.tags?.length > 0) {
            activity.tags = await this.staticLwpActivityTagService.getTagsByIds(input?.tags);
        } else {
            activity.tags = [];
        }

        const newActivity = await this.activityRepository.save(activity);

        newActivity.cardImage = this.helperService.getPublicUrl(
            `${appConstants.minioPaths.public.cardIconsForActivites}/${newActivity.cardImage}`
        );

        if (input?.activityType === ActivityType.LEGACY && !input?.steps.length) {
            await this.deleteActivitySteps(newActivity?.id);
        }

        if (input.activityType === ActivityType.LEGACY && input.steps.length > 0) {
            const steps = await this.staticLwpActivityStepsRepository.find({ where: { activity: { id: newActivity?.id } } });

            await this.helperService.updateStepFiles(steps, input?.steps, fileUploads);

            const inputSteps = input.steps.filter((s) => s.isNew === true);

            if (inputSteps.length > 0) {
                await this.helperService.addStepFiles(inputSteps, fileUploads);

                const newSteps = await Promise.all(
                    inputSteps
                        .map((s) => {
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const { isNew, fileIdentifier, ...rest } = s;

                            return rest;
                        })
                        .map(async (step) => {
                            let properties = JSON.parse(step?.properties);

                            if (step.stepType === ActivityStepType.TEXTDICE) {
                                properties = await this.helperService.getTextDiceStepProperties(step?.properties, fileUploads);
                            }

                            return { ...step, activity: newActivity, properties };
                        })
                );

                await this.staticLwpActivityStepsRepository.save(newSteps);
            }
        }

        return newActivity;
    }

    public async addActivitySteps(input: AddActivityStepsInput): Promise<StaticLwpActivity> {
        const activity = await this.activityRepository.findOne({ where: { id: input.activityId } });

        if (!activity) throw new HttpException('Activity does not exist', ErrorStatusCodeEnum._535);

        // saving activity steps
        await this.addAcitvitySteps(input.steps, activity);

        activity.cardImage = this.helperService.getPublicUrl(
            `${appConstants.minioPaths.public.cardIconsForActivites}/${activity.cardImage}`
        );

        return activity;
    }

    public async duplicateActivity(activityId: string, topicId: string, order: number, userId: string): Promise<boolean> {
        const topic = await this.topicRepository.findOne({ where: { id: topicId } });

        if (!topic) throw new HttpException('Topic does not exist', ErrorStatusCodeEnum._535);

        const activityToDuplicate = await this.activityRepository.findOne({ where: { id: activityId }, relations: ['steps', 'tags'] });

        if (!activityToDuplicate) throw new HttpException('Activity does not exist', ErrorStatusCodeEnum._535);

        const activityWithOrderExist = await this.activityRepository.findOne({ where: { order, topic }, select: ['id'] });

        if (activityWithOrderExist?.id)
            throw new HttpException('An activity with this order number already exists in the target topic.', ErrorStatusCodeEnum._535);

        const activity = this.mapInputToActivity(
            {
                name: activityToDuplicate.name,
                activityType: activityToDuplicate.activityType,
                details: activityToDuplicate.details,
                hidePhotoUpload: activityToDuplicate.hidePhotoUpload,
                isHidden: activityToDuplicate.isHidden,
                order,
                resources: activityToDuplicate.resources ? JSON.stringify(activityToDuplicate.resources) : null,
                welcomeMessage: activityToDuplicate.welcomeMessage,
                rationaleModalId: activityToDuplicate.rationaleModalId
            },
            topic,
            userId
        );

        activity.tags = activityToDuplicate.tags;
        activity.steps = [];

        if (activityToDuplicate.cardImage) {
            const newFileName = await this.helperService.duplicateFile(
                appConstants.minioPaths.public.cardIconsForActivites,
                activityToDuplicate.cardImage,
                this.helperService.getNewFileName(activityToDuplicate.cardImage),
                true
            );

            activity.cardImage = newFileName;
        }

        const duplicatedActivity = await this.activityRepository.save(activity);

        if (activityToDuplicate?.activityType === ActivityType.LEGACY && activityToDuplicate?.steps?.length > 0) {
            const steps = await this.staticLwpActivityStepsRepository.find({ where: { activity: { id: activityToDuplicate?.id } } });

            await this.helperService.duplicateSteps(steps, duplicatedActivity);
        }

        return true;
    }

    public async updateLegacyActivityStep(input: UpdateActivityStepInput): Promise<StaticLwpActivitySteps> {
        const { id, stepType, order, text, imageUrl, downloadUrl, downloadName, linkName, linkUrl, properties } = input;
        const activityStep = await this.staticLwpActivityStepsRepository.findOne({ where: { id } });

        if (!activityStep) throw new HttpException('Activity Step does not exist', ErrorStatusCodeEnum._535);
        switch (stepType) {
            case ActivityStepType.TEXT_AND_IMAGE:
                const textImageStep = await this.staticLwpActivityStepsRepository.findOne({ where: { id } });

                textImageStep.order = order;
                textImageStep.stepType = ActivityStepType.TEXT_AND_IMAGE;
                textImageStep.text = text;
                textImageStep.imageUrl = imageUrl;

                return await this.staticLwpActivityStepsRepository.save(textImageStep);

            case ActivityStepType.DOWNLOAD:
                const downloadStep = await this.staticLwpActivityStepsRepository.findOne({ where: { id } });

                downloadStep.order = order;
                downloadStep.stepType = ActivityStepType.DOWNLOAD;
                downloadStep.downloadName = downloadName;
                downloadStep.downloadUrl = downloadUrl;

                return await this.staticLwpActivityStepsRepository.save(downloadStep);

            case ActivityStepType.LINK:
                const linkStep = await this.staticLwpActivityStepsRepository.findOne({ where: { id } });

                linkStep.order = order;
                linkStep.stepType = ActivityStepType.LINK;
                linkStep.linkName = linkName;
                linkStep.linkUrl = linkUrl;

                return await this.staticLwpActivityStepsRepository.save(linkStep);

            default:
                const diceStep = await this.staticLwpActivityStepsRepository.findOne({ where: { id } });

                diceStep.order = order;
                diceStep.stepType = ActivityStepType.DICE;
                diceStep.properties = JSON.parse(properties);

                return await this.staticLwpActivityStepsRepository.save(diceStep);
        }
    }

    public async steps(activity: StaticLwpActivity): Promise<StaticLwpActivityLegacy> {
        const steps = await this.staticLwpActivityStepsRepository.find({
            where: { activity: { id: activity?.id } },
            order: { order: 'ASC' }
        });
        const legacy = new StaticLwpActivityLegacy();

        legacy.legacySteps = steps.map((step) => ({
            ...step,
            downloadUrl: step.downloadUrl
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.fileActivitySteps}/${step.downloadUrl}`)
                : null,
            imageUrl: step.imageUrl
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.imageActivitySteps}/${step.imageUrl}`)
                : null,
            audioUrl: step?.audioUrl
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.fileActivitySteps}/${step.audioUrl}`)
                : null,
            carouselData: step?.carouselData?.length > 0 ? this.helperService.getCarouselData(step?.carouselData) : null,
            imageCarouselData:
                step?.imageCarouselData?.length > 0 ? this.helperService.getImageCarouselData(step?.imageCarouselData) : null,
            checklistImageData:
                step?.checklistImageData?.length > 0 ? this.helperService.getChecklistImageData(step?.checklistImageData) : null,
            properties:
                step?.stepType === ActivityStepType.TEXTDICE ? this.helperService.getTextDiceProperties(step?.properties) : step?.properties
        }));

        return legacy;
    }

    public async getStepsByActivityIds(activityIds: readonly string[]): Promise<StaticLwpActivityLegacy[]> {
        const steps = await this.staticLwpActivityStepsRepository.find({
            where: { activity: { id: In(activityIds as string[]) } },
            order: { order: 'ASC' },
            relations: ['activity']
        });

        const stepsByActivityId = new Map<string, StaticLwpActivitySteps[]>();

        steps.forEach((step) => {
            if (!step.activity) return;
            const activityId = step.activity.id;

            if (!stepsByActivityId.has(activityId)) {
                stepsByActivityId.set(activityId, []);
            }

            stepsByActivityId.get(activityId).push(step);
        });

        const result: StaticLwpActivityLegacy[] = [];

        activityIds.forEach((activityId) => {
            const activitySteps = stepsByActivityId.get(activityId) || [];
            const legacy = new StaticLwpActivityLegacy();

            legacy.legacySteps = activitySteps.map((step) => ({
                ...step,
                downloadUrl: step.downloadUrl
                    ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.fileActivitySteps}/${step.downloadUrl}`)
                    : null,
                imageUrl: step.imageUrl
                    ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.imageActivitySteps}/${step.imageUrl}`)
                    : null,
                audioUrl: step?.audioUrl
                    ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.fileActivitySteps}/${step.audioUrl}`)
                    : null,
                carouselData: step?.carouselData?.length > 0 ? this.helperService.getCarouselData(step?.carouselData) : null,
                imageCarouselData:
                    step?.imageCarouselData?.length > 0 ? this.helperService.getImageCarouselData(step?.imageCarouselData) : null,
                checklistImageData:
                    step?.checklistImageData?.length > 0 ? this.helperService.getChecklistImageData(step?.checklistImageData) : null,
                properties:
                    step?.stepType === ActivityStepType.TEXTDICE
                        ? this.helperService.getTextDiceProperties(step?.properties)
                        : step?.properties
            }));

            result.push(legacy);
        });

        return result;
    }

    public async getRationaleModalsByActivityIds(activityIds: readonly string[]): Promise<(StaticLwpModal | null)[]> {
        const activities = await this.activityRepository.find({
            where: { id: In(activityIds as string[]) },
            relations: ['rationaleModal']
        });

        const modalsByActivityId = new Map<string, StaticLwpModal>();

        activities.forEach((activity) => {
            if (activity.rationaleModal) modalsByActivityId.set(activity.id, activity.rationaleModal);
        });

        return activityIds.map((id) => modalsByActivityId.get(id) || null);
    }

    private async addAcitvitySteps(steps: [ActivityStepInput], activity: StaticLwpActivity): Promise<StaticLwpActivitySteps[]> {
        const newSteps = steps.map((step) => ({ ...step, activity, properties: JSON.parse(step?.properties) }));

        return this.staticLwpActivityStepsRepository.save(newSteps);
    }

    public async getActivityByPupilActivity(pupilTopicId: string): Promise<StaticLwpActivity> {
        const feedbackPupilActivityBase = await this.queryBaseService.pupilActivityStaticActivityBase(pupilTopicId);
        const activity = await feedbackPupilActivityBase.select('activity').getRawOne();
        const newActivity = Object.assign({}, ...this.helperService.changeObjKeys(activity, 'activity_'));

        newActivity.cardImage = this.helperService.getPublicUrl(
            `${appConstants.minioPaths.public.cardIconsForActivites}/${newActivity.cardImage}`
        );
        if (newActivity?.id) return newActivity;

        return null;
    }

    public async getSetByTeacherStepsForTopic(
        topicId: string,
        classTopicId: string | null,
        isReleased: boolean
    ): Promise<SetByTeacherDataOutput[]> {
        const steps = await this.staticLwpActivityStepsRepository
            .createQueryBuilder('step')
            .innerJoin('step.activity', 'activity')
            .innerJoin('activity.topic', 'topic')
            .where('topic.id = :topicId', { topicId })
            .andWhere('activity.isHidden = false')
            .andWhere('step.stepType = :stepType', { stepType: ActivityStepType.SET_BY_TEACHER })
            .select(['step.id', 'step.setByTeacherData'])
            .orderBy('step.order', 'ASC')
            .getMany();

        if (!steps.length) return [];

        let mediaByStep = new Map<string, { filename: string; parentMessage: string | null }>();

        if (classTopicId) {
            const media = await this.setByTeacherMediaRepository
                .createQueryBuilder('media')
                .innerJoin('media.step', 'step')
                .where('media.classTopic = :classTopicId', { classTopicId })
                .andWhere('media.step IN (:...stepIds)', { stepIds: steps.map((s) => s.id) })
                .select(['media.filename', 'media.parentMessage', 'step.id'])
                .getMany();

            mediaByStep = new Map(media.map((m) => [m?.step?.id, { filename: m?.filename, parentMessage: m?.parentMessage ?? null }]));
        }

        const mapped = steps.map((step) => {
            const media = mediaByStep.get(step.id) ?? null;
            const folder =
                step.setByTeacherData?.type === SetByTeacherDataType.AUDIO
                    ? appConstants.minioPaths.public.uploadedSetByTeacherAudio
                    : appConstants.minioPaths.public.uploadedSetByTeacherImage;

            return {
                stepId: step.id,
                heading: step.setByTeacherData?.heading,
                subHeading: step.setByTeacherData?.subHeading,
                type: step.setByTeacherData?.type,
                filename: media?.filename ? this.helperService.getPublicUrl(`${folder}/${media.filename}`) : null,
                parentMessage: media?.parentMessage ?? null
            };
        });

        return isReleased ? mapped.filter((step) => step.filename !== null) : mapped;
    }
}
