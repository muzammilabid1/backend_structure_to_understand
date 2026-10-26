import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PupilParentStatus, UserStatus } from 'lwp-shared';
import newrelic from 'newrelic/index';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { DeleteResult, EntityManager, Repository, UpdateResult } from 'typeorm';

import { PupilParentRelationInput } from '../dtos/PupilParentRelationInput';
import { UpdatePupilParentRelationInput } from '../dtos/UpdatePupilParentRelationInput';
import { LogParentPupilAction } from '../entities/log_parent_pupil_action';
import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { LwpPupilParent } from '../entities/pupil_parent';
import { LwpPupilTopic } from '../entities/pupil_topic';
import { LwpUser } from '../entities/user';
import { EmailTemplateTypes, ErrorStatusCodeEnum, MagicLinkType, OperationStatus } from '../model';
import { MagicLinkService } from './magic_link.service';
import { NotificationService } from './notification.service';

@Injectable()
export class PupilParentService {
    constructor(
        @InjectRepository(LwpPupilParent)
        private parentPupilRepository: Repository<LwpPupilParent>,
        @InjectRepository(LogParentPupilAction)
        private LogParentPupilActionRepository: Repository<LogParentPupilAction>,
        @InjectRepository(LwpPupilFeedback)
        private pupilFeedbackRepository: Repository<LwpPupilFeedback>,
        @InjectRepository(LwpPupilTopic)
        private pupilTopicRepository: Repository<LwpPupilTopic>,
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        @InjectRepository(LwpPupilParent)
        private pupilParentRepository: Repository<LwpPupilParent>,
        private magicLinkService: MagicLinkService,
        private notificationService: NotificationService,
        private shallowUserService: ShallowUserService
    ) {}

    public async createPupilParentRelation(input: PupilParentRelationInput, manager?: EntityManager): Promise<LwpPupilParent> {
        const { parent, pupil, invitedBy, status, importedStudentContactID } = input;
        const parentPupilRepository: Repository<LwpPupilParent> = manager
            ? manager.getRepository(LwpPupilParent)
            : this.parentPupilRepository;

        const pupilParent = new LwpPupilParent();

        pupilParent.parent = parent;
        pupilParent.parentId = parent?.id;
        pupilParent.pupil = pupil;
        pupilParent.pupilId = pupil?.id;
        pupilParent.importedStudentContactID = importedStudentContactID;

        pupilParent.logCreatedBy = invitedBy;
        pupilParent.invitedBy = status === PupilParentStatus.INVITED ? invitedBy : pupilParent.invitedBy;
        pupilParent.status = status;

        const isExist = await parentPupilRepository.count({ where: { parentId: parent.id, pupilId: pupil.id } });

        if (!isExist) return await parentPupilRepository.save(pupilParent);

        return null;
    }

    public async updatePupilParentRelation(input: UpdatePupilParentRelationInput): Promise<UpdateResult> {
        const { parentId, pupilId, status, logUpdatedBy, importedStudentContactID, invitedBy } = input;
        const payload = {};

        if (status) payload['status'] = status;
        if (importedStudentContactID) payload['importedStudentContactID'] = importedStudentContactID;
        if (logUpdatedBy) payload['logUpdatedBy'] = logUpdatedBy;
        if (invitedBy) payload['invitedBy'] = invitedBy;

        return await this.parentPupilRepository.update({ pupilId, parentId }, { ...payload });
    }

    public async deletePupilParentRelationByParentId(parentId: string): Promise<DeleteResult> {
        return await this.parentPupilRepository.delete({ parentId });
    }

    public async deletePupilParentRelation(
        parentId: string,
        pupilId: string,
        deletedBy: string | LwpUser | null,
        manager?: EntityManager
    ): Promise<OperationStatus> {
        const pupilParentRepository: Repository<LwpPupilParent> = manager?.getRepository(LwpPupilParent) ?? this.parentPupilRepository;

        const pupilFeedbackRepository: Repository<LwpPupilFeedback> =
            manager?.getRepository(LwpPupilFeedback) ?? this.pupilFeedbackRepository;

        let res: UpdateResult | DeleteResult;

        if (deletedBy) {
            res = await pupilParentRepository.update(
                { parentId, pupilId },
                { deletedBy: this.shallowUserService.newShallowUser(deletedBy) }
            );
        } else {
            res = await pupilParentRepository.delete({ parentId, pupilId });
        }

        if (res?.affected > 0) {
            await pupilFeedbackRepository.query(
                `
                    UPDATE lwp_pupil_feedback
                    SET
                        "deletedUserCreatedBy" = $1,
                        "logCreatedById" = NULL
                    FROM lwp_pupil_feedback_history AS lpfh
                    WHERE
                        lpfh."lwpPupilFeedbackId" = lwp_pupil_feedback.id
                        AND lwp_pupil_feedback."logCreatedById" = $1
                        AND lpfh."lwpPupilId" = $2
                    RETURNING id;
            `,
                [parentId, pupilId]
            );

            await pupilFeedbackRepository.query(
                `
                    UPDATE lwp_pupil_feedback
                    SET
                        "deletedUserUpdatedBy" = $1,
                        "logUpdatedById" = NULL
                    FROM lwp_pupil_feedback_history AS lpfh
                    WHERE
                        lpfh."lwpPupilFeedbackId" = lwp_pupil_feedback.id
                        AND lwp_pupil_feedback."logUpdatedById" = $1
                        AND lpfh."lwpPupilId" = $2
                    RETURNING id;
                `,
                [parentId, pupilId]
            );

            return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        }

        return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async getPupilAllParents(pupilId: string): Promise<LwpPupilParent[]> {
        return await this.parentPupilRepository
            .createQueryBuilder('pupilParent')
            .where('pupilParent.pupilId = :pupilId', { pupilId })
            .getMany();
    }

    public async getPupilParent(pupilParentId: string): Promise<LwpPupilParent> {
        const pupilParentRelation = await this.parentPupilRepository.findOne({ where: { id: pupilParentId } });

        if (!pupilParentRelation) throw new HttpException('Pupil parent relation does not exist.', ErrorStatusCodeEnum._535);

        return pupilParentRelation;
    }

    public async getLastAccess(parentId: string, pupilId: string): Promise<Date | null> {
        const lastPupilAccess = await this.LogParentPupilActionRepository.findOne({
            where: { parentId, pupilId, actionId: 1 },
            order: { time: 'DESC' }
        });

        if (!lastPupilAccess?.id) return null;

        return lastPupilAccess?.time;
    }

    private async sendPupilParentInvitionEmail(pupilParentId: string): Promise<boolean> {
        const pupilParent = await this.parentPupilRepository.findOne({
            where: { id: pupilParentId },
            relations: ['pupil', 'pupil.school', 'pupil.school.curentPeriod', 'parent']
        });

        if (!pupilParent) throw new HttpException(`Parent invitation ${pupilParentId} not found`, ErrorStatusCodeEnum._535);

        if (pupilParent.lastInvitationEmailSent)
            throw new HttpException(`Invitation already sent for ${pupilParentId}`, ErrorStatusCodeEnum._535);

        const pupilTopic = await this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoinAndSelect('pupilTopic.pupil', 'pupil')
            .leftJoinAndSelect('pupil.school', 'pupilSchool')
            .leftJoinAndSelect('pupilSchool.curentPeriod', 'curentPeriod')
            .leftJoinAndSelect('pupilTopic.classTopic', 'classTopic')
            .leftJoinAndSelect('classTopic.topic', 'staticTopic')
            .leftJoinAndSelect('classTopic.class', 'class')
            .leftJoinAndSelect('class.school', 'school')
            .leftJoinAndSelect('class.mainTeacher', 'mainTeacher')
            .where('pupilTopic.periodIndex >= curentPeriod.index')
            .andWhere('pupilTopic.pupilId = :pupilId', { pupilId: pupilParent?.pupilId })
            .orderBy('pupilTopic.releaseDate', 'DESC')
            .getOne();

        if (!pupilTopic)
            throw new HttpException(
                `The current year's topic has not been released; unable to send an invitation to the parent`,
                ErrorStatusCodeEnum._535
            );

        const rejectMagicLink = await this.magicLinkService.generateMagicLink({
            userId: pupilParent?.parent?.id,
            pupilTopicId: null,
            pupilId: pupilParent?.pupil?.id,
            schoolId: null,
            termId: null,
            topicId: null,
            trophyId: null,
            reportType: null,
            type: MagicLinkType.REJECT_INVITATION
        });

        const topicMagicLink = await this.magicLinkService.generateMagicLink({
            userId: pupilParent?.parent?.id,
            pupilTopicId: pupilTopic.id,
            pupilId: pupilTopic?.pupil?.id,
            schoolId: null,
            reportType: null,
            termId: null,
            topicId: null,
            trophyId: null,
            type: pupilTopic?.classTopic?.topic?.isReading === true ? MagicLinkType.READING : MagicLinkType.TOPICACCESS
        });

        if (pupilTopic?.classTopic?.topic?.isReading === true) {
            await this.notificationService.sendPupilReadingTopicReleased(
                pupilTopic?.classTopic,
                pupilParent?.parent,
                pupilTopic.pupil,
                pupilParent,
                pupilTopic?.readingTarget,
                topicMagicLink?.url,
                topicMagicLink?.url,
                rejectMagicLink?.url,
                pupilTopic,
                true
            );
        } else {
            await this.notificationService.sendPupilTopics(
                pupilTopic?.classTopic,
                pupilParent?.parent,
                pupilTopic.pupil,
                pupilParent,
                false,
                pupilTopic,
                topicMagicLink?.url,
                topicMagicLink?.url,
                rejectMagicLink?.url,
                EmailTemplateTypes.sendPupilTopics,
                true
            );
        }

        await this.pupilTopicRepository.update({ id: pupilTopic.id }, { parentsNotified: true });

        if (pupilParent?.status === PupilParentStatus.INVITED)
            await this.pupilParentRepository.update({ id: pupilParent?.id }, { lastInvitationEmailSent: new Date() });
        if (pupilParent?.parent?.userStatus === UserStatus.INVITED)
            await this.userRepository.update({ id: pupilParent?.parent?.id }, { lastInvitationEmailSent: new Date() });

        return false;
    }

    public async sendPupilParentInvitationImmediate(pupilParentIds: string[]): Promise<boolean> {
        for (const parent of pupilParentIds) {
            try {
                await this.sendPupilParentInvitionEmail(parent);
            } catch (error) {
                newrelic.noticeError(error, { caught: true, handled: false });
            }
        }

        return true;
    }

    async rejectInviteConfirmation(pupilParentId: string): Promise<boolean> {
        const pupilParent = await this.getPupilParent(pupilParentId);

        if (pupilParent.status === PupilParentStatus.ACTIVE) {
            throw new HttpException(`The invitation for this pupil/parent was already accepted.`, ErrorStatusCodeEnum._535);
        }

        await this.parentPupilRepository.update({ id: pupilParent.id }, { status: PupilParentStatus.REJECTED });

        const parentUser = await this.userRepository.findOne({ id: pupilParent.parentId });

        // If the user is already active, the userStatus won't be updated
        if (UserStatus.ACTIVE === parentUser.userStatus) {
            return true;
        }

        const pupilParentQb = this.parentPupilRepository.createQueryBuilder('pupilParent');

        pupilParentQb
            .andWhere('pupilParent.parent = :parentId', { parentId: pupilParent.parentId })
            .andWhere('pupilParent.status != :pupilParentStatusRejected', { pupilParentStatusRejected: PupilParentStatus.REJECTED });

        const activePupilsParents = await pupilParentQb.getMany();

        if (0 === activePupilsParents.length) {
            await this.userRepository.update({ id: pupilParent.id }, { userStatus: UserStatus.REJECTED });
        }

        return true;
    }
}
