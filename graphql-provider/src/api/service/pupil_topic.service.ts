import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PupilParentStatus, SetByTeacherDataType, SubjectProgrammeType, UserStatus } from 'lwp-shared';
import moment from 'moment';
import newrelic from 'newrelic/index';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { UserTrustLevel } from 'src/auth/types/UserTrustLevel';
import { UserType } from 'src/auth/types/UserType';
import { LogParentPupilActions } from 'src/common/log_parent_pupil_action.actions';
import { appConstants } from 'src/constants';
import { BaseEntity, Connection, type EntityManager, Repository, SelectQueryBuilder } from 'typeorm';

import { PupilReadingLogFeedbacksOutput } from '../dtos/PupilReadingLogFeedbacksOutput';
import { ScrapbookReadyTeddyTopicOutput } from '../dtos/ScrapbookReadyTeddyTopicOutput';
import { LogParentPupilAction } from '../entities/log_parent_pupil_action';
import { LwpSetByTeacherStepMedia } from '../entities/lwp_set_by_teacher_step_media';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilTopic } from '../entities/pupil_topic';
import { LwpSchool } from '../entities/school';
import { StaticLwpTopic } from '../entities/static_topic';
import { LwpUser } from '../entities/user';
import {
    DeviceType,
    ErrorStatusCodeEnum,
    FeedbackType,
    LogParentPupilActionInput,
    OperationStatus,
    PupilTopicProgressInput,
    PupilTopicProgressOutput,
    PupilTotalStarCountOutput,
    UpdatePupilTopic
} from '../model';
import { HelperService } from './helper.service';
import { LogParentPupilActionService } from './log_parent_pupil_action.service';
import { LwpPupilFeedbackService } from './lwp_pupil_feedback.service';
import { PupilActivityService } from './pupil_activity.service';
import { QueryBaseService } from './query_base.service';
import { StaticLwpFeaturesService } from './static_lwp_features.service';
import { StaticLwpPeriodService } from './static_period.service';

@Injectable()
export class PupilTopicService {
    constructor(
        @InjectRepository(LwpPupilTopic)
        private pupilTopicRepository: Repository<LwpPupilTopic>,
        @InjectRepository(LwpSchool)
        private schoolRepository: Repository<LwpSchool>,
        @InjectRepository(LwpPupil)
        private pupilRepository: Repository<LwpPupil>,
        @InjectRepository(LogParentPupilAction)
        private LogParentPupilActionRepository: Repository<LogParentPupilAction>,
        private helperService: HelperService,
        private queryBaseService: QueryBaseService,
        private pupilActivityService: PupilActivityService,
        private logParentPupilActionService: LogParentPupilActionService,
        private periodService: StaticLwpPeriodService,
        private pupilFeedbackService: LwpPupilFeedbackService,
        private shallowUserService: ShallowUserService,
        private connection: Connection,
        private staticLwpFeaturesService: StaticLwpFeaturesService
    ) {}

    public async sendReleasedPupilTopicNotifications(): Promise<boolean> {
        await this.connection.transaction(async (manager) => {
            await manager.query(
                `SET LOCAL statement_timeout = ${process.env.ALLOW_SCHEDULING === 'true' || process.env.REPL === 'true' ? '0' : "'300s'"}`
            );

            await manager.getRepository(LwpPupilTopic).query(
                `
                with shouldNotifyInvitedParents as (
                    select
                        coalesce(min(value)::boolean, false)
                    from
                        static_lwp_parameter
                    where
                        key = 'SEND_TOPIC_EMAILS_TO_INVITED_USER'
                ),
                allSendablePendingPupilTopics as (
                    select
                        *
                    from
                        lwp_view_pupil_topics_for_notifications
                    where
                        case (
                            select
                                *
                            from
                                shouldNotifyInvitedParents)
                            when true then
                            "pupilParentStatus" in ('ACTIVE', 'INVITED')
                        else
                            "pupilParentStatus" = 'ACTIVE'
                        end
                        and (not "isReadingTopic" or "readingTarget" > 0)
                        and "periodIndex" >= "globalCurrentAcademicYear"
                        and current_date - interval '7 days' <= "releaseDate"
                        AND ("parentsNotified" = false OR ("pupilParentLastInvitation" IS NULL AND "pupilParentStatus" = 'INVITED'))
                    ),
                needsNotifying as (
                    select
                        asppt.*,
                        asppt_dedup."numId" as "numPendingTopics"
                    from
                        allSendablePendingPupilTopics asppt
                        inner join (
                            select
                                min("pupilTopicId") as "minId",
                            count("pupilTopicId") as "numId",
                            ("lwpPupil").id as "pupilId"
                        from
                            allSendablePendingPupilTopics
                        group by
                            "pupilId", "isReadingTopic") asppt_dedup on (asppt."lwpPupil").id = asppt_dedup."pupilId"
                        and asppt."pupilTopicId" = asppt_dedup."minId"
                ),
                schoolTags as (
                    select
                        lsst."schoolId" as "schoolId",
                        jsonb_agg(slst.name order by slst.name) as "tags"
                    from
                        lwp_school_static_tags lsst
                        join static_lwp_school_tag slst on slst.id = lsst."tagId"
                    where
                        lsst."schoolId" in (select "schoolId" from needsNotifying)
                    group by
                        lsst."schoolId"
                ),
                topicSubjects as (
                    select
                        sltdyg."topicId" as "topicId",
                        min(sls.name) as "name"
                    from
                        static_lwp_topic_domain_year_group sltdyg
                        join static_lwp_topic_domain sltd on sltd.id = sltdyg."domainId"
                        join static_lwp_subject sls on sls.id = sltd."subjectId"
                    where
                        sltdyg."topicId" in (select ("staticLwpTopic").id from needsNotifying)
                    group by
                        sltdyg."topicId"
                ),
                topicMagicLinks as (
                insert into lwp_magic_link ("userId", "pupilId", "type", "context")
                    select
                        ("lwpUserParent").id,
                        ("lwpPupil").id,
                        case "isReadingTopic" when true then 'READING' else 'TOPICACCESS' end,
                        jsonb_build_object('pupilTopicId', "pupilTopicId")
                    from
                        needsNotifying
                    returning
                        "userId",
                        "url",
                        "context"
                ),
                rejectMagicLinks as (
                insert into lwp_magic_link ("userId", "pupilId", "type", "context")
                    select
                        ("lwpUserParent").id,
                        ("lwpPupil").id,
                        'REJECT_INVITATION',
                        jsonb_build_object('pupilTopicId', "pupilTopicId")
                    from
                        needsNotifying nn
                    where (nn."lwpUserParent")."userStatus" = 'INVITED'
                returning
                    "userId",
                    "url",
                    "context"
                ),
                newStickers AS (
                    INSERT INTO log_lwp_parent_sticker_notification ("stickerId", "userId", "feedbackId")
                    SELECT
                        lfr."stickerId" as "stickerId",
                        lpf."userId" as "userId",
                        MIN(lpf."id") AS "feedbackId"
                    FROM
                        needsNotifying nn
                        JOIN lwp_pupil_feedback lpf ON (lpf."userType" = 'PARENT' AND ("lwpUserParent").id = lpf."userId")
                        JOIN lwp_pupil_feedback_history lpfh ON (lpfh."lwpPupilFeedbackId" = lpf.id AND lpfh."lwpPupilId" = ("lwpPupil").id)
                        JOIN lwp_feedback_reply lfr ON (lfr."feedbackId" = lpf.id AND lfr."parentNotified" IS FALSE AND lfr."stickerId" IS NOT NULL)
                    GROUP BY
                        lfr."stickerId",
                        lpf."userId"
                    ON CONFLICT DO NOTHING
                    RETURNING "stickerId", "userId", "feedbackId"
                ),
                aggregatedStickers AS (
                    SELECT
                        ns."userId",
                        lpfh."lwpPupilId",
                        jsonb_agg(jsonb_build_object(
                            'feedbackId', ns."feedbackId",
                            'stickerUrl', $1 || '/' || ls."fileName"
                        )) AS "NEW_STICKERS"
                    FROM
                        newStickers ns
                        JOIN lwp_sticker ls ON ls."id" = ns."stickerId"
                        JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = ns."feedbackId"
                    GROUP BY
                        ns."userId", lpfh."lwpPupilId"
                ),
                generatedNotifs as (
                insert into lwp_notification overriding user value
                    select
                        (gen_notif_data ("lwpUserParent", "notifPreference", case when nn."isReadingTopic" then 'sendPupilReadingTopicReleased' else 'sendPupilTopics' end, false, jsonb_build_object(
                            'MAGICID', tml.url,
                            'REJECT_MAGICID', rml.url,
                            'PUPILID', (nn."lwpPupil").id,
                            'PUPILTOPICID', nn."pupilTopicId",
                            'CHILDFIRSTNAME', (nn."lwpPupil").firstname,
                            'CHILDLASTNAME', (nn."lwpPupil").lastname,
                            'SCHOOL', nn."schoolName",
                            'TOPICID', (nn."staticLwpTopic").id,
                            'TOPICNAME', COALESCE(NULLIF((nn."staticLwpTopic")."parentTopicName", ''), (nn."staticLwpTopic")."teacherTopicName"),
                            'CLASS', nn."className",
                            'CLASSID', nn."classId",
                            'CLASSTOPICID', nn."classTopicId",
                            'TEACHERALIAS', nn."teacherName",
                            'RELEASEDATE', nn."releaseDate",
                            'DUEDATE', nn."dueDate",
                            'TARGET', nn."readingTarget",
                            'PARENTSTATUS', (nn."lwpUserParent")."userStatus",
                            'PUPILSTATUS', nn."lwpPupilStatus",
                            'PUPILPARENTSTATUS', nn."pupilParentStatus",
                            'PUPILPARENTINVITATIONAT', nn."pupilParentLastInvitation",
                            'PARENTINVITATIONAT', (nn."lwpUserParent")."lastInvitationEmailSent",
                            'PENDINGTOPICS', (nn."numPendingTopics" > 1),
                            'NEW_STICKERS', COALESCE(agg."NEW_STICKERS", NULL),
                            'SCRAPBOOKPROMPT', (nn."staticLwpTopic")."scrapbookPrompt",
                            'SCHOOLTAGS', COALESCE(st."tags", '[]'::jsonb),
                            'YEARGROUP', yg.year,
                            'SUBJECTNAME', ts."name"
                        ))).*
                    from
                        needsNotifying nn
                        join topicMagicLinks tml on (nn."lwpUserParent").id = tml."userId"
                            and nn."pupilTopicId" = (tml.context -> 'pupilTopicId')::bigint
                        left join rejectMagicLinks rml on (nn."lwpUserParent").id = rml."userId"
                            and nn."pupilTopicId" = (rml.context -> 'pupilTopicId')::bigint
                        left join aggregatedStickers agg ON (nn."lwpUserParent").id = agg."userId" AND (nn."lwpPupil").id = agg."lwpPupilId"
                        left join schoolTags st on st."schoolId" = nn."schoolId"
                        left join lwp_school_class lsc on lsc.id = nn."classId"
                        left join static_lwp_year_group yg on yg.id = lsc."yearGroup"
                        left join topicSubjects ts on ts."topicId" = (nn."staticLwpTopic").id
                        returning
                            "userId",
                            "params"
                ),
                loggedNotifs as (
                insert into log_parent_pupil_action ("actionId", "parentId", "pupilId", "param1", "param2")
                    select
                        5,
                        "userId",
                        ("params" -> 'PUPILID')::bigint,
                    ("params" -> 'TOPICID')::bigint,
                    ("params" -> 'PUPILTOPICID')::bigint
                from
                    generatedNotifs
                returning
                    "param2")
                update
                    lwp_pupil_topic
                set
                    "parentsNotified" = true
                where
                    id in (
                        select
                            "param2"
                        from
                            loggedNotifs
                        union all
                        select
                            "pupilTopicId"
                        from
                            allSendablePendingPupilTopics
                    );
                `,
                [this.helperService.getPublicUrl(`${appConstants.minioPaths.public.uploadedStickers}`)]
            );
        });

        return true;
    }

    public async readingTopicReminders(scheduleDate?: Date): Promise<boolean> {
        const current_date = scheduleDate ? `'${moment(scheduleDate).format('YYYY-MM-DD')}'::date` : 'current_date';

        await this.connection.transaction(async (manager) => {
            await manager.query(
                `SET LOCAL statement_timeout = ${process.env.ALLOW_SCHEDULING === 'true' || process.env.REPL === 'true' ? '0' : "'300s'"}`
            );

            await manager.getRepository(LwpPupilTopic).query(`
                with needsSendingReadingTopicReminder as (
                    select
                            *,
                            (${current_date} - interval '5 days' >= "releaseDate") as "is5Day"
                        from
                            lwp_view_pupil_topics_for_notifications
                        where
                            "pupilParentStatus" = 'ACTIVE'
                            and "isReadingTopic"
                            and "readingTarget" > 0
                            and ("lwpUserParent")."notificationPreference" != 'NOREMINDER'
                            and "releaseDate" >= ${current_date} - interval '14 days'
                            and "reminderSent" = false
                            and "periodIndex" >= "globalCurrentAcademicYear"
                            and ((
                                    ${current_date} - interval '5 days' >= "releaseDate"
                                    and
                                    "earnedGoldStar" = false
                                ) or (
                                    ${current_date} - interval '2 days' >= "releaseDate"
                                    and
                                    "reminderSentFor2Days" = false
                                    and
                                    "silverStars" = 0
                                ))
                    ),
                    topicMagicLinks as (
                    insert into lwp_magic_link ("userId", "pupilId", "type", "context")
                        select
                            ("lwpUserParent").id,
                            ("lwpPupil").id,
                            'READING',
                            jsonb_build_object('pupilTopicId', "pupilTopicId")
                        from
                            needsSendingReadingTopicReminder
                        returning
                            "userId",
                            "url",
                            "context"
                    ),
                    generatedNotifs as (
                    insert into lwp_notification overriding user value
                        select
                            (gen_notif_data ("lwpUserParent", "notifPreference", concat('readingTopicReminderAfter', case when "is5Day" then '5' else '2' end, 'Days'), false, jsonb_build_object(
                                'MAGICID', tml.url,
                                'PUPILID', (nn."lwpPupil").id,
                                'PUPILTOPICID', nn."pupilTopicId",
                                'CHILDFIRSTNAME', (nn."lwpPupil").firstname,
                                'CHILDLASTNAME', (nn."lwpPupil").lastname,
                                'SCHOOL', nn."schoolName",
                                'TOPICID', (nn."staticLwpTopic").id,
                                'TOPICNAME', COALESCE(NULLIF((nn."staticLwpTopic")."parentTopicName", ''), (nn."staticLwpTopic")."teacherTopicName"),
                                'CLASS', nn."className",
                                'CLASSID', nn."classId",
                                'CLASSTOPICID', nn."classTopicId",
                                'TEACHERALIAS', nn."teacherName",
                                'RELEASEDATE', nn."releaseDate",
                                'DUEDATE', nn."dueDate"
                            ))).*
                        from
                            needsSendingReadingTopicReminder nn
                            join topicMagicLinks tml on (nn."lwpUserParent").id = tml."userId"
                                and nn."pupilTopicId" = (tml.context -> 'pupilTopicId')::bigint
                            returning
                                "userId",
                                "params"
                    ),
                    loggedNotifs as (
                    insert into log_parent_pupil_action ("actionId", "parentId", "pupilId", "param1", "param2")
                        select
                            9,
                            "userId",
                            ("params" -> 'PUPILID')::bigint,
                        ("params" -> 'TOPICID')::bigint,
                        ("params" -> 'PUPILTOPICID')::bigint
                    from
                        generatedNotifs
                    returning
                        "param2")
                update
                    lwp_pupil_topic lpt
                set
                    "reminderSent" = case when nsrtr."is5Day" then true else lpt."reminderSent" end,
                    "reminderSentFor2Days" = case when nsrtr."is5Day" then lpt."reminderSentFor2Days" else true end
                from needsSendingReadingTopicReminder nsrtr
                where
                    id in (
                        select
                            "param2"
                        from
                            loggedNotifs
                    )
                    and nsrtr."pupilTopicId" = id;
            `);
        });

        return true;
    }

    public async topicReminderAfter7Days(scheduleDate?: Date): Promise<boolean> {
        const current_date = scheduleDate ? `'${moment(scheduleDate).format('YYYY-MM-DD')}'::date` : 'current_date';

        await this.connection.transaction(async (manager) => {
            await manager.query(
                `SET LOCAL statement_timeout = ${process.env.ALLOW_SCHEDULING === 'true' || process.env.REPL === 'true' ? '0' : "'300s'"}`
            );

            await manager.getRepository(LwpPupilTopic).query(`
                with needsSendingTopicReminder as (
                    select
                            *
                        from
                            lwp_view_pupil_topics_for_notifications
                        where
                            "pupilParentStatus" = 'ACTIVE'
                            and not "isReadingTopic"
                            and ("lwpUserParent")."notificationPreference" != 'NOREMINDER'
                            and "releaseDate" >= ${current_date} - interval '14 days'
                            and "releaseDate" <= ${current_date} - interval '7 days'
                            and "periodIndex" >= "globalCurrentAcademicYear"
                            and not "earnedGoldStar"
                            and not "reminderSent"
                    ),
                    topicMagicLinks as (
                    insert into lwp_magic_link ("userId", "pupilId", "type", "context")
                        select
                            ("lwpUserParent").id,
                            ("lwpPupil").id,
                            'TOPICACCESS',
                            jsonb_build_object('pupilTopicId', "pupilTopicId")
                        from
                            needsSendingTopicReminder
                        returning
                            "userId",
                            "url",
                            "context"
                    ),
                    generatedNotifs as (
                    insert into lwp_notification overriding user value
                        select
                            (gen_notif_data ("lwpUserParent", "notifPreference", 'sendMailForTopicReminderAfter7Days', false, jsonb_build_object(
                                'MAGICID', tml.url,
                                'PUPILID', (nn."lwpPupil").id,
                                'PUPILTOPICID', nn."pupilTopicId",
                                'CHILDFIRSTNAME', (nn."lwpPupil").firstname,
                                'CHILDLASTNAME', (nn."lwpPupil").lastname,
                                'SCHOOL', nn."schoolName",
                                'TOPICID', (nn."staticLwpTopic").id,
                                'TOPICNAME', COALESCE(NULLIF((nn."staticLwpTopic")."parentTopicName", ''), (nn."staticLwpTopic")."teacherTopicName"),
                                'CLASS', nn."className",
                                'CLASSID', nn."classId",
                                'CLASSTOPICID', nn."classTopicId",
                                'TEACHERALIAS', nn."teacherName",
                                'RELEASEDATE', nn."releaseDate",
                                'DUEDATE', nn."dueDate"
                            ))).*
                        from
                            needsSendingTopicReminder nn
                            join topicMagicLinks tml on (nn."lwpUserParent").id = tml."userId"
                                and nn."pupilTopicId" = (tml.context -> 'pupilTopicId')::bigint
                            returning
                                "userId",
                                "params"
                    ),
                    loggedNotifs as (
                    insert into log_parent_pupil_action ("actionId", "parentId", "pupilId", "param1", "param2")
                        select
                            9,
                            "userId",
                            ("params" -> 'PUPILID')::bigint,
                        ("params" -> 'TOPICID')::bigint,
                        ("params" -> 'PUPILTOPICID')::bigint
                    from
                        generatedNotifs
                    returning
                        "param2")
                update
                    lwp_pupil_topic
                set
                    "reminderSent" = true
                where
                    id in (
                        select
                            "param2"
                        from
                            loggedNotifs
                    );
            `);
        });

        return true;
    }

    public async pupilWatchedTopicVideo(id: string): Promise<LwpPupilTopic> {
        const pupilTopic = await this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoin('pupilTopic.pupil', 'pupil')
            .select(['pupilTopic.id', 'pupil.id'])
            .where('pupilTopic.id = :id', { id })
            .getOne();

        if (!pupilTopic) throw new HttpException('Pupil Topic does not exist', ErrorStatusCodeEnum._535);

        if (pupilTopic.pupil?.id) {
            await this.pupilRepository.update(
                { id: pupilTopic.pupil?.id },
                {
                    logLastActivityCompleted: this.helperService.getDateTime(new Date(), 'YYYY-MM-DD HH:mm')
                }
            );
        }

        pupilTopic.watchedVideo = true;

        return await this.pupilTopicRepository.save(pupilTopic);
    }

    public async pupilTopicOpened(id: string, userType: UserType, userTrustLevel: UserTrustLevel, deviceType: DeviceType): Promise<void> {
        const pupilTopic = await this.pupilTopicRepository.findOne({ where: { id } });

        if (!pupilTopic) throw new HttpException('Pupil Topic does not exist', ErrorStatusCodeEnum._535);

        if (deviceType === DeviceType.MOBILE) {
            pupilTopic.logAccessedOnMobile = pupilTopic?.logAccessedOnMobile + 1;
        } else {
            pupilTopic.logAccessedOnDesktop = pupilTopic?.logAccessedOnDesktop + 1;
        }

        if ([UserType.TOPICACCESS, UserType.MAGICPARENT].includes(userType) || userTrustLevel < UserTrustLevel.Full) {
            pupilTopic.logAccessedWithTopicLink = pupilTopic?.logAccessedWithTopicLink + 1;
        }

        pupilTopic.logOpenedAt = new Date();

        await this.pupilTopicRepository.save(pupilTopic);
    }

    public async unlockTopicActivities(id: string): Promise<boolean> {
        const pupilTopic = await this.pupilTopicRepository.findOne({ where: { id }, select: ['id', 'silverStars'] });

        if (!pupilTopic) throw new HttpException('Pupil Topic does not exist', ErrorStatusCodeEnum._535);
        if (pupilTopic?.silverStars > 0)
            throw new HttpException('Activities of this pupil topic are already unlocked', ErrorStatusCodeEnum._535);
        await this.pupilTopicRepository.update({ id }, { silverStars: 1 });

        return true;
    }

    public async getPupilTopics(pupilId: string, user: { id: string; type: UserType }): Promise<LwpPupilTopic[]> {
        let pupilTopics: LwpPupilTopic[] = [];

        if (user?.type !== UserType.PARENT) {
            pupilTopics = await this.pupilTopicRepository
                .createQueryBuilder('pupilTopic')
                .leftJoinAndSelect('pupilTopic.topic', 'staticTopic')
                .leftJoin('pupilTopic.period', 'period')
                .leftJoin('pupilTopic.pupil', 'pupil')
                .leftJoin('pupil.school', 'school')
                .leftJoin('school.curentPeriod', 'curentPeriod')
                .where('period.index >= curentPeriod.index')
                .andWhere('pupil.id = :pupilId', { pupilId })
                .andWhere('period.index IS NOT NULL')
                .orderBy('pupilTopic.releaseDate', 'DESC')
                .getMany();
        } else {
            pupilTopics = await this.pupilTopicRepository
                .createQueryBuilder('pupilTopic')
                .leftJoinAndSelect('pupilTopic.topic', 'staticTopic')
                .leftJoin('pupilTopic.period', 'period')
                .leftJoin('pupilTopic.pupil', 'pupil')
                .leftJoin('pupil.school', 'school')
                .leftJoin('school.curentPeriod', 'curentPeriod')
                .leftJoin('pupil.parents', 'pupilParent')
                .leftJoin('pupilParent.parent', 'parent')
                .where('pupil.id = :pupilId', { pupilId })
                .andWhere('parent.id = :parentId', { parentId: user?.id })
                .andWhere('period.index >= curentPeriod.index')
                .andWhere('period.index IS NOT NULL')
                .orderBy('pupilTopic.releaseDate', 'DESC')
                .getMany();
        }

        pupilTopics =
            pupilTopics?.length > 0
                ? pupilTopics?.filter((pupilTopic) => {
                      if (pupilTopic?.topic?.isReading === true && pupilTopic?.readingTarget === 0) return false;

                      return true;
                  })
                : [];

        return pupilTopics;
    }

    public async currentReadingTopic(pupilId: string): Promise<LwpPupilTopic> {
        return await this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoin('pupilTopic.topic', 'staticTopic')
            .leftJoin('pupilTopic.period', 'period')
            .leftJoin('pupilTopic.pupil', 'pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('school.curentPeriod', 'curentPeriod')
            .where('pupil.id = :pupilId', { pupilId })
            .andWhere('period.index = curentPeriod.index')
            .andWhere('staticTopic.isReading = :isReading', { isReading: true })
            .orderBy('pupilTopic.releaseDate', 'DESC')
            .addOrderBy('pupilTopic.id', 'DESC')
            .getOne();
    }

    /**
     * Batch method for DataLoader: fetches the most recent Ready Teddy LwpPupilTopic
     * for each pupil in the current academic year.
     *
     * Returns null for any pupil that has no RT topic in the current period.
     *
     * Uses getRawAndEntities so that pupil.id can be extracted from raw results to build
     * the pupilId → entity map. Ordered DESC so the first raw hit per pupil corresponds
     * to the most recent topic entity.
     *
     * Add additional selects/joins if nested fields (e.g. topic.scrapbookPrompt)
     * are needed in future.
     */
    public async getCurrentRTTopicsForPupils(pupilIds: readonly string[]): Promise<(LwpPupilTopic | null)[]> {
        if (pupilIds.length === 0) return [];

        const results = await this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .innerJoin('pupilTopic.topic', 'staticTopic')
            .innerJoin('staticTopic.domainsAndYearGroups', 'domainsAndYearGroups')
            .innerJoin('domainsAndYearGroups.domain', 'domain')
            .innerJoin('domain.subject', 'subject')
            .innerJoin('pupilTopic.pupil', 'pupil')
            .innerJoin('pupil.school', 'school')
            .innerJoin('school.curentPeriod', 'schoolPeriod')
            .innerJoin('pupilTopic.period', 'period')
            .where('pupil.id IN (:...pupilIds)', { pupilIds: pupilIds as string[] })
            .andWhere('subject.programmeType = :programmeType', { programmeType: SubjectProgrammeType.READY_TEDDY })
            .andWhere('period.index = schoolPeriod.index')
            .select('pupilTopic')
            .addSelect('pupil.id', 'pupilId')
            .orderBy('pupilTopic.releaseDate', 'DESC')
            .addOrderBy('pupilTopic.id', 'DESC')
            .getRawAndEntities();

        // Map pupil ID → most recent RT topic (results ordered DESC, so first hit per pupil wins)
        const map = new Map<string, LwpPupilTopic>();

        results.raw.forEach((raw, index) => {
            const pupilId = raw.pupilId;

            if (pupilId && !map.has(pupilId)) {
                map.set(pupilId, results.entities[index]);
            }
        });

        return (pupilIds as string[]).map((id) => map.get(id) ?? null);
    }

    private scrapbookPupilTopicBaseQuery(): SelectQueryBuilder<LwpPupilTopic> {
        return this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .innerJoin('pupilTopic.topic', 'staticTopic', 'staticTopic.scrapbookPrompt IS NOT NULL')
            .innerJoin('staticTopic.domainsAndYearGroups', 'domainsAndYearGroups')
            .innerJoin('domainsAndYearGroups.domain', 'domain')
            .innerJoin('domain.subject', 'subject', 'subject.programmeType = :programmeType', {
                programmeType: SubjectProgrammeType.READY_TEDDY
            })
            .innerJoin('pupilTopic.pupil', 'pupil')
            .innerJoin('pupil.school', 'school')
            .innerJoin('school.curentPeriod', 'schoolPeriod')
            .innerJoin('pupilTopic.period', 'period', 'period.index >= schoolPeriod.index');
    }

    public async currentReadyTeddyTopicForScrapbook(pupil: LwpPupil): Promise<ScrapbookReadyTeddyTopicOutput> {
        const isScrapbookEnabled = await this.staticLwpFeaturesService.isScrapbookEnabledForSchool(pupil?.schoolId);

        // If scrapbook is not enabled in the pupil's school, return null so that frontend doesn't show the scrapbook prompt at all
        if (!isScrapbookEnabled) return null;

        const result = await this.scrapbookPupilTopicBaseQuery()
            .where('pupil.id = :pupilId', { pupilId: pupil.id })
            .orderBy('pupilTopic.releaseDate', 'DESC')
            .select('pupilTopic.id', 'id')
            .addSelect('staticTopic.scrapbookPrompt', 'scrapbookPrompt')
            .addSelect(
                `EXISTS (
                    SELECT 1 FROM lwp_pupil_feedback feedback
                    INNER JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = feedback.id
                    WHERE 
                        lpfh."lwpPupilId" = :pupilId
                        AND feedback."type" = :feedbackType
                        AND feedback."periodIndex" >= schoolPeriod.index
                        AND feedback."scrapbookPrompt" = "staticTopic"."scrapbookPrompt"
                )`,
                'haveScrapbookEntry'
            )
            .setParameter('feedbackType', FeedbackType.SCRAPBOOK)
            .getRawOne<{ id: string; scrapbookPrompt: string; haveScrapbookEntry: boolean }>();

        if (!result) return null;

        return {
            id: result.id,
            scrapbookPrompt: result.scrapbookPrompt,
            haveScrapbookEntry: result.haveScrapbookEntry
        };
    }

    public async getPupilTopicForScrapbook(pupilTopicId: string): Promise<LwpPupilTopic> {
        return await this.scrapbookPupilTopicBaseQuery()
            .where('pupilTopic.id = :pupilTopicId', { pupilTopicId })
            .select(['pupilTopic.id'])
            .getOne();
    }

    public async getReadingTopics(pupilId: string): Promise<LwpPupilTopic[]> {
        return await this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoin('pupilTopic.topic', 'staticTopic')
            .leftJoin('pupilTopic.period', 'period')
            .leftJoin('pupilTopic.pupil', 'pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('school.curentPeriod', 'curentPeriod')
            .where('pupil.id = :pupilId', { pupilId })
            .andWhere('period.index = curentPeriod.index')
            .andWhere('staticTopic.isReading = :isReading', { isReading: true })
            .orderBy('pupilTopic.releaseDate', 'DESC')
            .getMany();
    }

    public async getPupilTopicsByClassTopic(classTopicId: string): Promise<LwpPupilTopic[]> {
        return await this.pupilTopicRepository.find({ where: { classTopic: { id: classTopicId } } });
    }

    public async getPupilTopicsForPupilTopicsOverview(classTopicId: string): Promise<LwpPupilTopic[]> {
        return (await this.pupilTopicRepository.find({ where: { classTopic: { id: classTopicId } } })) ?? [];
    }

    /**
     * Fetches pupil topic based on user role and trust level.
     */
    private async fetchPupilTopic(
        pupilTopicId: string,
        userId: string,
        userType: UserType,
        userStatus: UserStatus,
        userTrust: UserTrustLevel
    ): Promise<LwpPupilTopic | null> {
        const selectedFields: string[] = ['pupilTopic', 'topic.id', 'pupil.id'];
        const queryBuilder = this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoin('pupilTopic.topic', 'topic')
            .leftJoin('pupilTopic.pupil', 'pupil')
            .where('pupilTopic.id = :pupilTopicId', { pupilTopicId });

        if (userType === UserType.TEACHER || userType === UserType.ADMIN) {
            return await queryBuilder.select(selectedFields).getOne();
        }

        queryBuilder
            .leftJoin('pupil.parents', 'pupilParent')
            .leftJoin('pupilParent.parent', 'parent')
            .andWhere('parent.id = :userId', { userId });

        if (userTrust !== UserTrustLevel.Full && userStatus === UserStatus.INVITED) {
            queryBuilder.andWhere('pupilParent.status = :status', { status: PupilParentStatus.INVITED });
        }

        return await queryBuilder.select(selectedFields).getOne();
    }

    public async getPupilTopic(
        pupilTopicId: string,
        userId: string,
        userType: UserType,
        userStatus: UserStatus,
        userTrust: UserTrustLevel
    ): Promise<LwpPupilTopic> {
        const logInput = new LogParentPupilActionInput();

        logInput.actionId = LogParentPupilActions.topic_page_accessed.id;
        logInput.parentId = userId;
        logInput.userId = userId;

        // Fetch pupil topic based on user type
        const pupilTopic = await this.fetchPupilTopic(pupilTopicId, userId, userType, userStatus, userTrust);

        if (!pupilTopic) {
            throw new HttpException('Pupil Topic does not exist', ErrorStatusCodeEnum._535);
        }

        // Log action
        logInput.pupilId = pupilTopic.pupil?.id;
        logInput.param1 = pupilTopic.topic?.id;
        logInput.param2 = pupilTopic.id;

        await this.logParentPupilActionService.addLogParentPupilAction(logInput);

        return pupilTopic;
    }

    public async deletePupilTopics(
        pupilTopicIds: string[],
        deletedBy: string | LwpUser,
        manager?: EntityManager
    ): Promise<OperationStatus> {
        if (pupilTopicIds.length === 0) return { status: 'fail', msg: 'No records deleted' } as OperationStatus;

        const pupilTopicRepository: Repository<LwpPupilTopic> = manager?.getRepository(LwpPupilTopic) ?? this.pupilTopicRepository;

        const pupilTopics = await pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoin('pupilTopic.activities', 'activities')
            .select(['pupilTopic.id', 'activities.id'])
            .where('pupilTopic.id IN (:...pupilTopicIds)', { pupilTopicIds })
            .getMany();

        if (pupilTopics.length < pupilTopicIds.length) throw new HttpException('Pupil Topic does not exist', ErrorStatusCodeEnum._535);

        await this.pupilActivityService.deletePupilActivities(
            pupilTopics.flatMap((pupilTopic) => pupilTopic.activities.map((pupilActivity) => pupilActivity.id)),
            deletedBy,
            manager
        );

        const res = await pupilTopicRepository.update(pupilTopicIds, { deletedBy: this.shallowUserService.newShallowUser(deletedBy) });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async updatePupilTopic(input: UpdatePupilTopic): Promise<LwpPupilTopic> {
        const pupilTopic = await this.pupilTopicRepository.findOne({ where: { id: input?.id } });

        if (!pupilTopic) throw new HttpException('Pupil Topic does not exist', ErrorStatusCodeEnum._535);

        pupilTopic.watchedVideo = input?.watchedVideo;

        return await this.pupilTopicRepository.save(pupilTopic);
    }

    public async getPupilTopicProgress(input: PupilTopicProgressInput): Promise<PupilTopicProgressOutput[]> {
        let pupilTopic: LwpPupilTopic = null;
        const pupilTopicProgressOutput: PupilTopicProgressOutput[] = [];

        if (input?.isReadingTopic) {
            pupilTopic = await this.pupilTopicRepository.findOne({ where: { id: input?.id } });
            if (!pupilTopic) throw new HttpException('Pupil Topic does not exist', ErrorStatusCodeEnum._535);
            let readingAtHome = 0;
            let readingAtSchool = 0;
            let readingWithHelper = 0;

            const pupilFeedbacksForTopic = await this.pupilFeedbackService.getPupilFeedbacksOfPupilTopic(pupilTopic);

            if (pupilFeedbacksForTopic?.length === 0) return [];

            for (const readingLogFeedback of pupilFeedbacksForTopic) {
                if (
                    readingLogFeedback?.userType === UserType.PARENT ||
                    readingLogFeedback?.userType === UserType.TOPICACCESS ||
                    readingLogFeedback?.userType === UserType.MAGICPARENT
                ) {
                    readingAtHome++;
                    continue;
                }

                if (readingLogFeedback?.userType === UserType.TEACHER) {
                    readingAtSchool++;
                    continue;
                }

                if (readingLogFeedback?.userType === UserType.HELPER) {
                    readingWithHelper++;
                    continue;
                }
            }

            if (readingAtHome > 0)
                pupilTopicProgressOutput.push({
                    icon: 'home',
                    text: `Read ${readingAtHome > 1 ? `${readingAtHome} times` : '1 time'} at home`
                });
            if (readingAtSchool > 0)
                pupilTopicProgressOutput.push({
                    icon: 'school',
                    text: `Read ${readingAtSchool > 1 ? `${readingAtSchool} times` : '1 time'} at school`
                });
            if (readingWithHelper > 0)
                pupilTopicProgressOutput.push({
                    icon: null,
                    text: `Read ${readingWithHelper > 1 ? `${readingWithHelper} times` : '1 time'} with a helper`
                });

            return pupilTopicProgressOutput;
        } else {
            pupilTopic = await this.pupilTopicRepository.findOne({
                where: { id: input?.id },
                relations: ['activities', 'activities.activity']
            });
            if (!pupilTopic) throw new HttpException('Pupil Topic does not exist', ErrorStatusCodeEnum._535);

            for (const pupilActivity of pupilTopic.activities) {
                pupilTopicProgressOutput.push({ text: pupilActivity?.activity?.name, icon: pupilActivity?.earnedStar ? 'done' : 'remove' });
            }

            pupilTopicProgressOutput.unshift({ text: 'Watched video', icon: pupilTopic?.watchedVideo ? 'done' : 'remove' });
        }

        return pupilTopicProgressOutput;
    }

    public async getPupilReadingTopics(pupilId: string): Promise<PupilReadingLogFeedbacksOutput[]> {
        const pupilTopics = await this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoinAndSelect('pupilTopic.pupil', 'pupil')
            .leftJoinAndSelect('pupilTopic.classTopic', 'classTopic')
            .leftJoinAndSelect('classTopic.topic', 'staticTopic')
            .where('pupil.id = :pupilId', { pupilId })
            .andWhere('staticTopic.isReading = :isReading', { isReading: true })
            .addOrderBy('pupilTopic.releaseDate', 'DESC')
            .getMany();

        const pupilReadingLogFeedbacks: PupilReadingLogFeedbacksOutput[] = [];

        if (pupilTopics?.length > 0) {
            for (const pupilTopic of pupilTopics) {
                pupilReadingLogFeedbacks.push({
                    id: pupilTopic?.classTopic?.id,
                    releaseDate: pupilTopic?.classTopic?.releaseDate,
                    pupilName: `${pupilTopic?.pupil?.firstname} ${pupilTopic?.pupil?.lastname}`,
                    readingLogFeedbacks: await this.pupilFeedbackService.getPupilFeedbacksOfPupilTopic(pupilTopic),
                    pupilEarnedStars: pupilTopic?.earnedGoldStar ? pupilTopic?.readingTarget : pupilTopic?.silverStars
                });
            }
        }

        return pupilReadingLogFeedbacks;
    }

    public async getRecommendedPupilTopic(pupilId: string, isReadingTopic: boolean): Promise<LwpPupilTopic> {
        const recommendedTopicQueryBuilder = this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoin('pupilTopic.pupil', 'pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('school.curentPeriod', 'schoolPeriod')
            .leftJoin('pupilTopic.topic', 'staticTopic')
            .leftJoin('pupilTopic.period', 'topicPeriod')
            .where('pupil.id = :pupilId', { pupilId })
            .orderBy('pupilTopic.releaseDate', 'DESC');

        if (isReadingTopic) {
            recommendedTopicQueryBuilder
                .andWhere('topicPeriod.index = schoolPeriod.index')
                .andWhere('staticTopic.isReading = :isReading', { isReading: true })
                // Only recommend the reading topic while its reading week is still running.
                .andWhere(`daterange("pupilTopic"."releaseDate", ("pupilTopic"."releaseDate" + interval '7 days')::date) @> current_date`);

            return await recommendedTopicQueryBuilder.getOne();
        } else {
            recommendedTopicQueryBuilder
                .andWhere('topicPeriod.index >= schoolPeriod.index')
                .andWhere('staticTopic.isReading = :isReading', { isReading: false })
                .leftJoin('pupilTopic.activities', 'activities');

            const recommendedTopic = await recommendedTopicQueryBuilder
                .clone()
                .andWhere('pupilTopic.earnedGoldStar = :earnedGoldStar', { earnedGoldStar: false })
                .getOne();

            if (recommendedTopic) {
                return recommendedTopic;
            } else {
                return await recommendedTopicQueryBuilder.andWhere('activities.earnedStar = :bool', { bool: false }).getOne();
            }
        }
    }

    public async getRecommendedPupilTopics(pupilId: string): Promise<LwpPupilTopic[]> {
        const pupilTopics: LwpPupilTopic[] = [];

        const pupilReadingTopic = await this.getRecommendedPupilTopic(pupilId, true);

        if (pupilReadingTopic) {
            pupilTopics.push(pupilReadingTopic);
        }

        const nextPupilTopic = await this.getRecommendedPupilTopic(pupilId, false);

        if (nextPupilTopic) {
            pupilTopics.push(nextPupilTopic);
        }

        return pupilTopics;
    }

    public async getPupilTopicByPupilActivity(pupilActivityId: string): Promise<LwpPupilTopic> {
        const pupilParentBase = await this.queryBaseService.pupilActivityPupilTopicBase(pupilActivityId);
        const topic = await pupilParentBase.select('topic').getRawOne();
        const newPupilTopic = Object.assign({}, ...this.helperService.changeObjKeys(topic, 'topic_'));

        if (newPupilTopic?.id) return newPupilTopic;

        return null;
    }

    public async getPupilTotalStarCount(pupilId: string): Promise<PupilTotalStarCountOutput> {
        const result = await this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoin('pupilTopic.period', 'pupilTopicPeriod')
            .leftJoin('pupilTopic.pupil', 'pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('school.curentPeriod', 'schoolPeriod')
            .where('pupilTopic.pupilId = :id', { id: pupilId })
            .andWhere('pupilTopicPeriod.index >= schoolPeriod.index')
            .select('SUM(pupilTopic.silverStars)', 'silverStarsSum')
            .addSelect('SUM(CASE WHEN pupilTopic.earnedGoldStar = true THEN 1 ELSE 0 END)', 'earnedGoldStarCount')
            .getRawOne<{ earnedGoldStarCount: number; silverStarsSum: number }>();

        return { goldStars: result?.earnedGoldStarCount ?? 0, silverStars: result?.silverStarsSum ?? 0 };
    }

    public async getTopicByPupilTopic(pupilTopicId: string): Promise<Omit<StaticLwpTopic, keyof BaseEntity>> {
        const pupilTopic = await this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoinAndSelect('pupilTopic.topic', 'staticTopic')
            .leftJoinAndSelect('pupilTopic.pupil', 'pupil')
            .leftJoinAndSelect('pupil.school', 'school')
            .where('pupilTopic.id = :pupilTopicId', { pupilTopicId })
            .getOne();

        if (pupilTopic?.topic?.id) {
            return {
                ...pupilTopic?.topic,
                video: pupilTopic?.topic?.video ? `${appConstants.vimeoBaseUrl}/${pupilTopic?.topic?.video}` : null,
                teacherPdf: pupilTopic?.topic?.teacherPdf
                    ? this.helperService.getPublicUrl(
                          `${appConstants.minioPaths.public.fileActivitySteps}/${pupilTopic?.topic?.teacherPdf}`
                      )
                    : null,
                videoThumb: pupilTopic?.topic?.videoThumb
                    ? this.helperService.getPublicUrl(
                          `${appConstants.minioPaths.public.cardIconsForTopics}/${pupilTopic?.topic?.videoThumb}`
                      )
                    : null
            };
        }

        return null;
    }

    public async isCurrentYearTopicsReleased(pupilId: string): Promise<boolean> {
        const count = await this.pupilTopicRepository
            .createQueryBuilder('pupil_topic')
            .leftJoin('pupil_topic.pupil', 'pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('school.curentPeriod', 'curentPeriod')
            .where('pupil_topic.periodIndex >= curentPeriod.index')
            .andWhere('pupil_topic.pupilId = :pupilId', { pupilId })
            .getCount();

        return count > 0;
    }

    public async isPupilTopicInCurrentAcademicYear(pupilTopicId: string): Promise<boolean> {
        const pupilTopic = await this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoin('pupilTopic.pupil', 'pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('pupilTopic.period', 'pupilTopicPeriod')
            .leftJoin('school.curentPeriod', 'schoolPeriod')
            .where('pupilTopic.id = :pupilTopicId', { pupilTopicId })
            .andWhere('pupilTopicPeriod.index = schoolPeriod.index')
            .getCount();

        return pupilTopic > 0;
    }

    public async isPupilTopicInPreviousAcademicYear(pupilTopicId: string): Promise<boolean> {
        const pupilTopic = await this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoin('pupilTopic.pupil', 'pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('pupilTopic.period', 'pupilTopicPeriod')
            .leftJoin('school.curentPeriod', 'schoolPeriod')
            .where('pupilTopic.id = :pupilTopicId', { pupilTopicId })
            .andWhere('pupilTopicPeriod.index < schoolPeriod.index')
            .getCount();

        return pupilTopic > 0;
    }

    public async shouldCountTowardsWeeklyReadingTarget(pupilIds: string[], readingDate: Date): Promise<boolean> {
        const reading_date = moment(readingDate).format('YYYY-MM-DD');

        if (!pupilIds.length) return false;

        const topics = await this.pupilTopicRepository
            .createQueryBuilder('topic')
            .leftJoin('topic.topic', 'static_topic')
            .where('topic.pupil.id IN (:...pupilIds)', { pupilIds })
            .andWhere('static_topic.isReading = :isReading', { isReading: true })
            .andWhere(`daterange(topic."releaseDate", (topic."releaseDate" + interval '7 days')::date) @> :readingDate::date`, {
                readingDate: reading_date
            })
            .getCount();

        return pupilIds.length <= topics;
    }

    public isPupilTopicCurrentReadingTopicInClass = async (pupilTopicId: string): Promise<boolean> => {
        try {
            const result = await this.pupilTopicRepository.query(
                `
                    SELECT 1
                    FROM lwp_pupil_topic pt
                    INNER JOIN lwp_class_topic ct ON ct.id = pt."classTopicId"
                    INNER JOIN lwp_school_class c ON c.id = ct."classId"
                    INNER JOIN LATERAL (
                        SELECT lt.id
                        FROM lwp_class_topic lt
                        INNER JOIN lwp_school_class lc ON lc.id = lt."classId"
                        INNER JOIN static_lwp_topic st ON st.id = lt."topicId"
                        WHERE st."isReading" = true
                        AND lt.released = true
                        AND lc."IsReadingLogsEnabled" = true
                        AND lc.id = c.id
                        ORDER BY lt."releaseDate" DESC
                        LIMIT 1
                    ) current_topic ON current_topic.id = ct.id
                    WHERE pt.id = $1
            `,
                [pupilTopicId]
            );

            return result.length > 0;
        } catch (error) {
            newrelic.noticeError(error, { caught: true, handled: false });

            throw new HttpException('Failed to check if pupil topic is current reading topic', ErrorStatusCodeEnum._535);
        }
    };

    public async getSetByTeacherMediaForPupilTopicIds(pupilTopicIds: readonly string[]): Promise<LwpSetByTeacherStepMedia[][]> {
        try {
            const pupilTopicsWithMedia = await this.pupilTopicRepository
                .createQueryBuilder('pt')
                .select(['pt.id', 'sbtm.id', 'sbtm.filename', 'sbtm.parentMessage', 'step.id', 'step.setByTeacherData'])
                .leftJoin('pt.setByTeacherMedia', 'sbtm')
                .leftJoin('sbtm.step', 'step')
                .where('pt.id IN (:...pupilTopicIds)', { pupilTopicIds: pupilTopicIds as string[] })
                .getMany();

            const mediaByTopicId = new Map<string, LwpSetByTeacherStepMedia[]>();

            pupilTopicIds.forEach((id) => {
                mediaByTopicId.set(id, []);
            });

            pupilTopicsWithMedia.forEach((pt) => {
                if (pt.setByTeacherMedia && mediaByTopicId.has(pt.id)) {
                    const mediaWithUrls = pt.setByTeacherMedia
                        .filter((media) => !!media.filename)
                        .map((media) => {
                            const folder =
                                media.step?.setByTeacherData?.type === SetByTeacherDataType.AUDIO
                                    ? appConstants.minioPaths.public.uploadedSetByTeacherAudio
                                    : appConstants.minioPaths.public.uploadedSetByTeacherImage;

                            const clone = Object.assign(new LwpSetByTeacherStepMedia(), media);

                            clone.filename = this.helperService.getPublicUrl(`${folder}/${media.filename}`);

                            return clone;
                        });

                    mediaByTopicId.set(pt.id, mediaWithUrls);
                }
            });

            return pupilTopicIds.map((id) => mediaByTopicId.get(id) || []);
        } catch (error) {
            newrelic.noticeError(error, { caught: true, handled: false });
            throw new HttpException('Failed to load set-by-teacher media for pupil topics', ErrorStatusCodeEnum._535);
        }
    }
}
