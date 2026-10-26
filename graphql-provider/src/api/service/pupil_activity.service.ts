import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { UserType } from 'src/auth/types/UserType';
import { LogParentPupilActions } from 'src/common/log_parent_pupil_action.actions';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';

import { LwpPupilTopic } from '../entities/pupil_topic';
import { LwpPupilActivity } from '../entities/pupil-activity';
import { LwpUser } from '../entities/user';
import { DeviceType, ErrorStatusCodeEnum, LogParentPupilActionInput, OperationStatus, PupilActivitiesOfPupilTopicOutput } from '../model';
import { HelperService } from './helper.service';
import { LogParentPupilActionService } from './log_parent_pupil_action.service';
import { QueryBaseService } from './query_base.service';
@Injectable()
export class PupilActivityService {
    constructor(
        @InjectRepository(LwpPupilActivity)
        private pupilActivityRepository: Repository<LwpPupilActivity>,
        @InjectRepository(LwpPupilTopic)
        private pupilTopicRepository: Repository<LwpPupilTopic>,
        private helperService: HelperService,
        private queryBaseService: QueryBaseService,
        private logParentPupilActionService: LogParentPupilActionService,
        private shallowUserService: ShallowUserService
    ) {}

    public async getPupilActivities(id: string): Promise<LwpPupilActivity[]> {
        return await this.pupilActivityRepository.find({ where: { pupil: { id } } });
    }

    public async getPupilActivity(pupilActivityId: string, userId: string, userType: UserType): Promise<LwpPupilActivity> {
        const logParentPupilActionInput = new LogParentPupilActionInput();

        logParentPupilActionInput.actionId = LogParentPupilActions.activity_page_accessed.id;
        logParentPupilActionInput.parentId = userId;
        logParentPupilActionInput.userId = userId;

        const selectedFields = ['pupilActivity', 'activity.id', 'pupil.id'];

        const pupilActivityQueryBuilder: SelectQueryBuilder<LwpPupilActivity> = this.pupilActivityRepository
            .createQueryBuilder('pupilActivity')
            .leftJoin('pupilActivity.activity', 'activity')
            .leftJoin('pupilActivity.pupil', 'pupil')
            .where('pupilActivity.id = :id', { id: pupilActivityId });

        if (userType === UserType.TEACHER) {
            pupilActivityQueryBuilder.leftJoin('pupil.school', 'school');
            selectedFields.push('school');
        }

        const pupilActivity = await pupilActivityQueryBuilder.select(selectedFields).getOne();

        if (!pupilActivity) throw new HttpException('Pupil Activity does not exist', ErrorStatusCodeEnum._535);

        logParentPupilActionInput.pupilId = pupilActivity?.pupil?.id;
        logParentPupilActionInput.param1 = pupilActivity?.activity.id;
        logParentPupilActionInput.param2 = pupilActivity?.id;
        await this.logParentPupilActionService.addLogParentPupilAction(logParentPupilActionInput);

        return pupilActivity;
    }

    public async savePupilActivityRating(id: string, rating: number, userId: string, userType: UserType): Promise<LwpPupilActivity> {
        const selectedFields = ['pupilActivity.id', 'pupilActivity.rating', 'activity.id', 'pupil.id'];

        const pupilActivityQueryBuilder: SelectQueryBuilder<LwpPupilActivity> = this.pupilActivityRepository
            .createQueryBuilder('pupilActivity')
            .leftJoin('pupilActivity.activity', 'activity')
            .leftJoin('pupilActivity.pupil', 'pupil')
            .where('pupilActivity.id = :id', { id });

        const pupilActivity = await pupilActivityQueryBuilder.select(selectedFields).getOne();

        const logParentPupilActionInput = new LogParentPupilActionInput();

        if (!pupilActivity) throw new HttpException('Pupil Activity does not exist', ErrorStatusCodeEnum._535);

        if (userType !== UserType.TEACHER) {
            if (pupilActivity.rating !== null) {
                logParentPupilActionInput.actionId = LogParentPupilActions.rating_updated.id;
            } else {
                logParentPupilActionInput.actionId = LogParentPupilActions.rating_set.id;
            }

            logParentPupilActionInput.parentId = userId;
            logParentPupilActionInput.pupilId = pupilActivity.pupil?.id;
            logParentPupilActionInput.userId = userId;
            logParentPupilActionInput.param1 = pupilActivity?.activity?.id;
            logParentPupilActionInput.param2 = pupilActivity?.id;
            logParentPupilActionInput.param3 = rating;
            await this.logParentPupilActionService.addLogParentPupilAction(logParentPupilActionInput);
        }

        if (rating >= 5) {
            pupilActivity.rating = 5;
        } else if (rating <= 0) {
            pupilActivity.rating = 0;
        } else {
            pupilActivity.rating = rating;
        }

        return await this.pupilActivityRepository.save(pupilActivity);
    }

    public async updatePupilActivity(id: string, earnedStar: boolean, rating: number, userId: string): Promise<LwpPupilActivity> {
        const pupilActivity = await this.pupilActivityRepository.findOne({ where: { id }, relations: ['pupil', 'activity'] });
        const logParentPupilActionInput = new LogParentPupilActionInput();

        if (!pupilActivity) throw new HttpException('Pupil Activity does not exist', ErrorStatusCodeEnum._535);

        if (pupilActivity.rating !== null) {
            logParentPupilActionInput.actionId = LogParentPupilActions.rating_updated.id;
        } else {
            logParentPupilActionInput.actionId = LogParentPupilActions.rating_set.id;
        }

        logParentPupilActionInput.parentId = userId;
        logParentPupilActionInput.pupilId = pupilActivity?.pupil?.id;
        logParentPupilActionInput.userId = userId;
        logParentPupilActionInput.param1 = pupilActivity?.activity?.id;
        logParentPupilActionInput.param2 = pupilActivity?.id;
        logParentPupilActionInput.param3 = rating;
        await this.logParentPupilActionService.addLogParentPupilAction(logParentPupilActionInput);

        if (rating >= 5) {
            pupilActivity.rating = 5;
        } else if (rating <= 0) {
            pupilActivity.rating = 0;
        } else {
            pupilActivity.rating = rating;
        }

        pupilActivity.earnedStar = earnedStar;

        return await this.pupilActivityRepository.save(pupilActivity);
    }

    public async increaseAccessCount(id: string, deviceType: DeviceType): Promise<LwpPupilActivity> {
        const pupilActivity = await this.pupilActivityRepository.findOne({
            where: { id }
        });

        if (!pupilActivity) throw new HttpException('Pupil Activity does not exist', ErrorStatusCodeEnum._535);

        pupilActivity.logLastAccessed = new Date();
        if (!pupilActivity?.logFirstAccessed) pupilActivity.logFirstAccessed = new Date();

        if (deviceType === DeviceType.MOBILE) {
            pupilActivity.logAccessedOnMobile = pupilActivity?.logAccessedOnMobile + 1;
        } else {
            pupilActivity.logAccessedOnDesktop = pupilActivity?.logAccessedOnDesktop + 1;
        }

        return await this.pupilActivityRepository.save(pupilActivity);
    }

    public async deletePupilActivities(ids: string[], deletedBy: string | LwpUser, manager?: EntityManager): Promise<OperationStatus> {
        if (ids.length === 0) return { status: 'fail', msg: 'No records deleted' } as OperationStatus;

        const pupilActivityRepository = manager?.getRepository(LwpPupilActivity) ?? this.pupilActivityRepository;

        const pupilActivities = await pupilActivityRepository
            .createQueryBuilder('pupilActivity')
            .leftJoin('pupilActivity.feedbacks', 'feedbacks')
            .select(['pupilActivity.id', 'feedbacks.id'])
            .where('pupilActivity.id IN (:...ids)', { ids })
            .getMany();

        if (pupilActivities.length < ids.length) throw new HttpException('Pupil Activity does not exist', ErrorStatusCodeEnum._535);

        if (pupilActivities.some((pupilActivity) => pupilActivity?.feedbacks?.length > 0))
            throw new HttpException('This activity cannot be deleted because a pupil has completed it.', ErrorStatusCodeEnum._535);

        const res = await pupilActivityRepository.update(ids, { deletedBy: this.shallowUserService.newShallowUser(deletedBy) });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async getPupilActivitiesOfPupilTopic(pupilTopicId: string): Promise<PupilActivitiesOfPupilTopicOutput[]> {
        const pupilActivities = await this.pupilActivityRepository
            .createQueryBuilder('pupilActivity')
            .leftJoinAndSelect('pupilActivity.topic', 'topic')
            .where('topic.id = :pupilTopicId', { pupilTopicId })
            .getMany();

        const pupilActivitiesOutput: PupilActivitiesOfPupilTopicOutput[] = pupilActivities?.map((pupilActivity) => {
            return {
                id: pupilActivity?.id,
                earnedStar: pupilActivity?.earnedStar,
                rating: pupilActivity?.rating ?? null
            };
        });

        return pupilActivitiesOutput?.length > 0 ? pupilActivitiesOutput : [];
    }

    public async updateActivityContext(pupilActivityId: string, pupilActivityContext: string): Promise<LwpPupilActivity> {
        const pupilActivity = await this.pupilActivityRepository.findOne({
            where: { id: pupilActivityId }
        });

        if (!pupilActivity) throw new HttpException('Pupil Activity does not exist', ErrorStatusCodeEnum._535);

        pupilActivity.context = pupilActivityContext;

        return await this.pupilActivityRepository.save(pupilActivity);
    }

    public async isPupilActivityInCurrentAcademicYear(pupilActivityId: string): Promise<boolean> {
        const pupilActivity = await this.pupilActivityRepository
            .createQueryBuilder('activity')
            .leftJoin('activity.topic', 'topic')
            .leftJoin('topic.period', 'topicPeriod')
            .leftJoin('activity.pupil', 'pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('school.curentPeriod', 'schoolPeriod')
            .where('activity.id = :id', { id: pupilActivityId })
            .andWhere('topicPeriod.index = schoolPeriod.index')
            .getCount();

        return pupilActivity > 0;
    }

    public async isPupilActivityInPreviousAcademicYear(pupilActivityId: string): Promise<boolean> {
        const pupilActivity = await this.pupilActivityRepository
            .createQueryBuilder('activity')
            .leftJoin('activity.topic', 'topic')
            .leftJoin('topic.period', 'topicPeriod')
            .leftJoin('activity.pupil', 'pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('school.curentPeriod', 'schoolPeriod')
            .where('activity.id = :id', { id: pupilActivityId })
            .andWhere('topicPeriod.index < schoolPeriod.index')
            .getCount();

        return pupilActivity > 0;
    }

    public async getPupilActivitiesByPupilTopic(pupilTopicId: string): Promise<LwpPupilActivity[]> {
        const feedbackPupilActivityBase = await this.queryBaseService.pupilTopicActivitiesBase(pupilTopicId);
        const activities = await feedbackPupilActivityBase.select('activities').getRawMany();

        const parentPupils: LwpPupilActivity[] = activities
            .map((activity) => {
                return Object.assign({}, ...this.helperService.changeObjKeys(activity, 'activities_'));
            })
            .filter((activity) => activity.id !== null);

        return parentPupils;
    }

    // Batch method for DataLoader - loads activities for multiple pupil topic IDs
    public async getPupilActivitiesByPupilTopicIds(pupilTopicIds: readonly string[]): Promise<LwpPupilActivity[][]> {
        // Use the same base query structure as the single method (getPupilActivitiesByPupilTopic) but for multiple IDs
        const activitiesQuery = this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoinAndSelect('pupilTopic.activities', 'activities')
            .leftJoinAndSelect('activities.activity', 'activity')
            .orderBy('activity.order', 'ASC')
            .where('pupilTopic.id IN (:...pupilTopicIds)', { pupilTopicIds });

        const pupilTopicsWithActivities = await activitiesQuery.getMany();

        const activitiesByTopicId = new Map<string, LwpPupilActivity[]>();

        pupilTopicIds.forEach((id) => {
            activitiesByTopicId.set(id, []);
        });

        pupilTopicsWithActivities.forEach((pupilTopic) => {
            if (pupilTopic.activities && activitiesByTopicId.has(pupilTopic.id)) {
                activitiesByTopicId.set(pupilTopic.id, pupilTopic.activities);
            }
        });

        // Return results in the same order as input IDs
        return pupilTopicIds.map((id) => activitiesByTopicId.get(id) || []);
    }
}
