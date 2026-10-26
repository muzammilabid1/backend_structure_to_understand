import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LogParentPupilActions } from 'src/common/log_parent_pupil_action.actions';
import { Pagination } from 'src/paginate';
import { EntityManager, Repository } from 'typeorm';

import { LogParentPupilAction } from '../entities/log_parent_pupil_action';
import { LwpPupilTopic } from '../entities/pupil_topic';
import { LogParentPupilActionInput, LogParentPupilActionOutput } from '../model';

@Injectable()
export class LogParentPupilActionService {
    constructor(
        @InjectRepository(LogParentPupilAction)
        private logParentPupilActionRepository: Repository<LogParentPupilAction>,
        @InjectRepository(LwpPupilTopic)
        private pupilTopicRepository: Repository<LwpPupilTopic>
    ) {}

    async addLogParentPupilAction(
        input: LogParentPupilActionInput,
        userId?: string,
        manager?: EntityManager
    ): Promise<LogParentPupilAction> {
        const logParentPupilActionRepository: Repository<LogParentPupilAction> = manager
            ? manager.getRepository(LogParentPupilAction)
            : this.logParentPupilActionRepository;
        const logParentPupilAction = new LogParentPupilAction();

        if (input?.actionId === 7) await this.pupilTopicNeedVideoUpdate(input?.param2, true, manager);
        if (input?.actionId === 8) await this.pupilTopicNeedVideoUpdate(input?.param2, false, manager);

        logParentPupilAction.actionId = input?.actionId;
        logParentPupilAction.userId = userId || input?.userId;
        logParentPupilAction.parentId = userId || input?.parentId;
        logParentPupilAction.pupilId = input?.pupilId;
        logParentPupilAction.param1 = input?.param1;
        logParentPupilAction.param2 = input?.param2;
        logParentPupilAction.param3 = input?.param3;

        return await logParentPupilActionRepository.save(logParentPupilAction);
    }

    async pupilTopicNeedVideoUpdate(pupilTopicId: string, isStarted: boolean, manager?: EntityManager): Promise<void> {
        const pupilTopicRepository: Repository<LwpPupilTopic> = manager ? manager.getRepository(LwpPupilTopic) : this.pupilTopicRepository;
        const pupilTopic = await pupilTopicRepository.findOne({
            where: { id: pupilTopicId },
            select: ['id', 'logFirstStartedVideo', 'logFirstFinishedVideo']
        });

        if (pupilTopic) {
            if (isStarted && !pupilTopic?.logFirstStartedVideo) {
                pupilTopic.logFirstStartedVideo = new Date();
            }

            if (!isStarted) {
                pupilTopic.logLastStartedVideo = new Date();
                if (!pupilTopic?.logFirstFinishedVideo) {
                    pupilTopic.logFirstFinishedVideo = new Date();
                }
            }

            await pupilTopicRepository.save(pupilTopic);
        }
    }

    async getLogParentPupilActionHistory(userId: string, limit = 10, offset = 0): Promise<Pagination<LogParentPupilActionOutput>> {
        const [results, total] = await this.logParentPupilActionRepository
            .createQueryBuilder('log')
            .where('log.userId = :userId', { userId })
            .orderBy('log.time', 'DESC')
            .skip(offset)
            .take(limit)
            .getManyAndCount();

        const logs: LogParentPupilActionOutput[] =
            results?.length > 0 ? results.map((result) => ({ ...result, action: this.translateActions(result?.actionId) })) : [];

        return new Pagination<LogParentPupilActionOutput>({
            results: logs,
            total,
            limit,
            offset
        });
    }

    private translateActions(actionId: number): string {
        switch (actionId) {
            case 1:
                return LogParentPupilActions.child_home_accessed.action;

            case 2:
                return LogParentPupilActions.history_accessed.action;

            case 3:
                return LogParentPupilActions.intro_video_started.action;

            case 4:
                return LogParentPupilActions.intro_video_finished.action;

            case 5:
                return LogParentPupilActions.topic_released.action;

            case 6:
                return LogParentPupilActions.topic_page_accessed.action;

            case 7:
                return LogParentPupilActions.video_started.action;

            case 8:
                return LogParentPupilActions.video_finished.action;

            case 9:
                return LogParentPupilActions.topic_reminder_sent.action;

            case 10:
                return LogParentPupilActions.activity_page_accessed.action;

            case 11:
                return LogParentPupilActions.rating_set.action;

            case 12:
                return LogParentPupilActions.rating_updated.action;

            case 13:
                return LogParentPupilActions.comments_photos_added.action;

            case 14:
                return LogParentPupilActions.comments_photos_updated.action;

            case 15:
                return LogParentPupilActions.mathscot_saved.action;

            default:
                return actionId?.toString();
        }
    }
}
