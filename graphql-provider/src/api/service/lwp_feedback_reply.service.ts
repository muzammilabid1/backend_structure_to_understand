import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FeedbackReplyType } from 'lwp-shared';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { UserType } from 'src/auth/types/UserType';
import { Connection, Repository } from 'typeorm';

import { LwpFeedbackReply } from '../entities/lwp_feedback_reply';
import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { LwpSticker } from '../entities/lwp_sticker';
import { LwpUser } from '../entities/user';
import { CreateFeedbackReplyInput, ErrorStatusCodeEnum, UpdateFeedbackReplyInput } from '../model';

@Injectable()
export class LwpFeedbackReplyService {
    constructor(
        @InjectRepository(LwpFeedbackReply)
        private feedbackReplyRepositery: Repository<LwpFeedbackReply>,
        @InjectRepository(LwpPupilFeedback)
        private pupilFeedbackRepository: Repository<LwpPupilFeedback>,
        @InjectRepository(LwpSticker)
        private stickerRepository: Repository<LwpSticker>,
        private shallowUserService: ShallowUserService,
        private connection: Connection
    ) {}

    public async createFeedbackReply(input: CreateFeedbackReplyInput, userId: string): Promise<LwpFeedbackReply> {
        const user = this.shallowUserService.newShallowUser(userId);

        const feedbackReply = new LwpFeedbackReply();

        const feedback = await this.pupilFeedbackRepository.findOne({ where: { id: input.feedbackId }, select: ['id'] });

        if (!feedback) throw new HttpException('Feedback does not exist', ErrorStatusCodeEnum._535);

        if (input.stickerId) {
            const sticker = await this.stickerRepository.findOne({ where: { id: input.stickerId }, select: ['id'] });

            if (!sticker) throw new HttpException('Sticker does not exist', ErrorStatusCodeEnum._535);

            feedbackReply.sticker = sticker;
        } else {
            feedbackReply.reply = input.reply;
        }

        feedbackReply.type = input?.stickerId ? FeedbackReplyType.STICKER : FeedbackReplyType.REPLY;
        feedbackReply.feedback = feedback;
        feedbackReply.logCreatedBy = user;

        return await this.feedbackReplyRepositery.save(feedbackReply);
    }

    public async updateFeedbackReply(input: UpdateFeedbackReplyInput, userId: string): Promise<LwpFeedbackReply> {
        const user = this.shallowUserService.newShallowUser(userId);

        const feedbackReply = await this.feedbackReplyRepositery.findOne({
            where: { id: input.id },
            select: ['id', 'type', 'reply', 'logCreatedAt', 'logUpdatedAt'],
            relations: ['sticker']
        });

        if (!feedbackReply) throw new HttpException('Reply does not exist', ErrorStatusCodeEnum._535);

        if (feedbackReply.sticker && !input.stickerId) {
            throw new HttpException('Sticker id is required for updating sticker', ErrorStatusCodeEnum._535);
        } else if (!feedbackReply.sticker && !input.reply) {
            throw new HttpException('Reply is required when updating sticker', ErrorStatusCodeEnum._535);
        }

        if (feedbackReply.sticker) {
            feedbackReply.sticker = { id: input.stickerId } as LwpSticker;
        } else {
            feedbackReply.reply = input.reply;
        }

        feedbackReply.logUpdatedBy = user;

        return await this.feedbackReplyRepositery.save(feedbackReply);
    }

    public async removeFeedbackReply(id: string, deletedBy: string): Promise<LwpFeedbackReply> {
        const user = this.shallowUserService.newShallowUser(deletedBy);
        const feedbackReply = await this.feedbackReplyRepositery
            .createQueryBuilder('lfr')
            .leftJoin('lfr.feedback', 'feedback')
            .leftJoin('lfr.sticker', 'sticker')
            .where('lfr.id = :id', { id })
            .select(['lfr.id', 'lfr.type', 'lfr.logCreatedAt', 'lfr.logUpdatedAt', 'feedback.id', 'sticker.id'])
            .getOne();

        if (!feedbackReply) throw new HttpException('Reply does not exist', ErrorStatusCodeEnum._535);

        const res = await this.feedbackReplyRepositery.update(id, {
            deletedBy: user
        });

        if (res['affected'] > 0) {
            const copiedFeedbackReply = new LwpFeedbackReply();

            copiedFeedbackReply.type = feedbackReply.type;
            copiedFeedbackReply.feedback = { id: feedbackReply?.feedback?.id } as LwpPupilFeedback;
            copiedFeedbackReply.originalFeedbackReplyId = feedbackReply.id;
            copiedFeedbackReply.originalFeedbackReplyDeletedAt = new Date();
            copiedFeedbackReply.logCreatedBy = user;
            copiedFeedbackReply.logCreatedAt = feedbackReply.logCreatedAt;
            copiedFeedbackReply.logUpdatedAt = feedbackReply.logUpdatedAt;
            copiedFeedbackReply.sticker = feedbackReply.sticker;

            return await this.feedbackReplyRepositery.save(copiedFeedbackReply);
        }

        throw new HttpException('Failed to delete reply', ErrorStatusCodeEnum._535);
    }

    public async getRepliesByFeedbackId(feedbackId: string): Promise<LwpFeedbackReply[]> {
        return await this.feedbackReplyRepositery.find({
            where: { feedback: feedbackId },
            order: {
                logCreatedAt: 'ASC'
            }
        });
    }

    public async getLogCreatedBy(id: string): Promise<LwpUser> {
        const feedbackReply = await this.feedbackReplyRepositery
            .createQueryBuilder('lfr')
            .leftJoinAndSelect('lfr.logCreatedBy', 'logCreatedBy')
            .where('lfr.id = :id', { id })
            .select([
                'lfr.id',
                'logCreatedBy.id',
                'logCreatedBy.nameForChildren',
                'logCreatedBy.firstname',
                'logCreatedBy.lastname',
                'logCreatedBy.type'
            ])
            .getOne();

        if (feedbackReply?.logCreatedBy?.type === UserType.ADMIN) {
            feedbackReply.logCreatedBy.nameForChildren = `${feedbackReply.logCreatedBy.firstname} ${feedbackReply.logCreatedBy.lastname}`;
        }

        return feedbackReply?.logCreatedBy ? feedbackReply?.logCreatedBy : null;
    }

    public async sendParentNotificationOfTeacherFeedbackReply(): Promise<boolean> {
        await this.connection.transaction(async (manager) => {
            await manager.query(
                `SET LOCAL statement_timeout = ${process.env.ALLOW_SCHEDULING === 'true' || process.env.REPL === 'true' ? '0' : "'300s'"}`
            );

            await manager.getRepository(LwpFeedbackReply).query(`
                WITH needsSendingParentNotif AS (
                        SELECT
                            lu_parent.*::lwp_user AS "lwpUserParent",
                            CASE
                                WHEN lu_parent."notificationPreference" = 'EMAILREMINDER' THEN 'email'
                                WHEN lu_parent."notificationPreference" = 'SMSREMINDER' THEN 'phone'
                                ELSE NULL
                            END as "notifPreference",
                            lfr.reply as "reply",
                            lfr."feedbackId" as "pupilFeedbackId",
                            (lp.*)::lwp_pupil as "lwpPupil",
                            lu_teacher."nameForChildren" as "teacherAlias",
                            CASE WHEN lpf.type = 'READING' THEN true ELSE false END AS "isReading",
                            sla.name as "activityName",
                            COALESCE(NULLIF(slt."parentTopicName", ''), slt."teacherTopicName") as "topicName"

                        FROM
                            lwp_feedback_reply lfr
                            LEFT JOIN lwp_pupil_feedback lpf ON lpf.id = lfr."feedbackId"
                            LEFT JOIN lwp_user lu_teacher ON lu_teacher.id = lfr."logCreatedById"
                            LEFT JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id
                            LEFT JOIN lwp_pupil lp ON lp.id = lpfh."lwpPupilId"
                            LEFT JOIN lwp_user lu_parent ON lpf."userId" = lu_parent.id
                            LEFT JOIN lwp_pupil_activity lpa ON lpa.id = lpf."activityId"
                            LEFT JOIN static_lwp_activity sla ON sla.id = lpa."activityId"
                            LEFT JOIN lwp_pupil_topic lpt ON lpt.id = lpa."topicId"
                            LEFT JOIN static_lwp_topic slt ON slt."id" = lpt."topicId"
                        WHERE
                            lfr."parentNotified" = FALSE
                            AND lfr."originalFeedbackReplyId" IS NULL
                            AND lpf.id IS NOT NULL AND lpf."originalFeedbackId" IS NULL
                    ),
                    generatedNotifs AS (
                        INSERT INTO lwp_notification
                        OVERRIDING USER VALUE
                        SELECT
                            (gen_notif_data(
                                nn."lwpUserParent",
                                nn."notifPreference",
                                'sendParentNotificationOfTeacherFeedbackReply',
                                false,
                                jsonb_build_object(
                                    'REPLY', nn."reply",
                                    'PUPILID', (nn."lwpPupil").id,
                                    'PUPILFEEDBACKID', nn."pupilFeedbackId",
                                    'CHILDFIRSTNAME', (nn."lwpPupil").firstname,
                                    'CHILDLASTNAME', (nn."lwpPupil").lastname,
                                    'TEACHERALIAS', nn."teacherAlias",
                                    'ACTIVITYNAME', nn."activityName",
                                    'TOPICNAME', nn."topicName",
                                    'ISREADING', nn."isReading"
                                )
                            )).*
                        FROM
                            needsSendingParentNotif nn
                        returning
                            "params"
                    )
                    UPDATE lwp_feedback_reply lfr
                    SET "parentNotified" = TRUE
                    FROM needsSendingParentNotif nn
                    WHERE lfr."feedbackId" in (
                        select
                            ("params"->'PUPILFEEDBACKID')::bigint
                        from
                            generatedNotifs
                    );
            `);
        });

        return true;
    }

    public async getSticker(id: string): Promise<LwpSticker | null> {
        const feedbackReply = await this.feedbackReplyRepositery
            .createQueryBuilder('lfr')
            .leftJoinAndSelect('lfr.sticker', 'sticker')
            .where('lfr.id = :id', { id })
            .select(['lfr.id', 'sticker.alt', 'sticker.fileName', 'sticker.id'])
            .getOne();

        return feedbackReply?.sticker ?? null;
    }
}
