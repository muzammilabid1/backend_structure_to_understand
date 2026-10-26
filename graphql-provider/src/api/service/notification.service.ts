import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import moment from 'moment';
import { ConfigService } from 'nestjs-config';
import { UserType } from 'src/auth/types/UserType';
import { Mail } from 'src/common/notification/notification.types';
import { SpmContact } from 'src/config/notification';
import { ImportStatus } from 'src/data-import/types/import-status';
import { EntityManager, Repository } from 'typeorm';

import { LwpClassTopic } from '../entities/class_topic';
import { LwpSchoolHoliday } from '../entities/lwp_school_holiday';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilParent } from '../entities/pupil_parent';
import { LwpPupilTopic } from '../entities/pupil_topic';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpPeriod } from '../entities/static_period';
import { StaticLwpTopic } from '../entities/static_topic';
import { LwpUser } from '../entities/user';
import { EmailTemplateTypes, notificationPreferenceEnum } from '../model';
import { HelperService } from './helper.service';
import { LwpNotificationService } from './lwp_notification.service';
import { StaticLwpFeaturesService } from './static_lwp_features.service';

@Injectable()
export class NotificationService {
    private readonly staffEmail = 'hello@learningwithparents.com';
    private readonly staffEmailName = 'Learning with Parents support';

    private teacherInviteMessageByInvitedUserType: { [key in UserType]: (user?: LwpUser) => string } = {
        [UserType.ADMIN]: () => this.getTeacherInviteMessageByAdmin(),
        [UserType.PARENT]: () => this.getTeacherInviteMessageByParent(),
        [UserType.TEACHER]: () => this.getTeacherInviteMessageByTeacher(),
        [UserType.HELPER]: (u) => this.getParentInviteMessageByTeacher(u),
        [UserType.TOPICACCESS]: (u) => this.getParentInviteMessageByParent(u),
        [UserType.MAGICPARENT]: (u) => this.getParentInviteMessageByParent(u)
    };

    constructor(
        private readonly helperService: HelperService,
        private readonly configService: ConfigService,
        private readonly lwpNotificationService: LwpNotificationService,
        private readonly featuresService: StaticLwpFeaturesService,
        @InjectRepository(LwpSchoolClass)
        private schoolClassRepository: Repository<LwpSchoolClass>,
        @InjectRepository(StaticLwpPeriod)
        private staticPeriodRepository: Repository<StaticLwpPeriod>,
        @InjectRepository(LwpSchool)
        private schoolRepository: Repository<LwpSchool>,
        @InjectRepository(StaticLwpTopic)
        private topicRepository: Repository<StaticLwpTopic>
    ) {}

    /**
     * The school's tags, the class's year group and the main teacher's alias, so that email templates can
     * vary their content per school (tags are assigned in admin, one per A/B test arm) and per year group,
     * and can address the parent as their child's teacher.
     *
     * The teacher alias is read here rather than taken from the class relation of the class topic the caller
     * hands us, because that relation is only loaded when the caller thought to join it - and one of them did
     * not, which is what left the alias blank in a parent's first invitation email (LEA-6568).
     */
    private async getClassEmailContext(
        schoolClassId: string,
        manager?: EntityManager
    ): Promise<{ schoolTags: string[]; yearGroup: string; teacherAlias: string }> {
        const schoolClassRepository: Repository<LwpSchoolClass> = manager
            ? manager.getRepository(LwpSchoolClass)
            : this.schoolClassRepository;

        const schoolClass = await schoolClassRepository
            .createQueryBuilder('class')
            .leftJoinAndSelect('class.yearGroup', 'yearGroup')
            .leftJoinAndSelect('class.school', 'school')
            .leftJoinAndSelect('school.schoolTags', 'schoolTags')
            .leftJoinAndSelect('schoolTags.tag', 'tag')
            .leftJoin('class.mainTeacher', 'mainTeacher')
            .addSelect(['mainTeacher.id', 'mainTeacher.nameForChildren'])
            .where('class.id = :schoolClassId', { schoolClassId })
            .getOne();

        return {
            schoolTags: this.toTagNames(schoolClass?.school),
            yearGroup: schoolClass?.yearGroup?.year ?? null,
            teacherAlias: schoolClass?.mainTeacher?.nameForChildren ?? null
        };
    }

    /**
     * The name of the subject the topic belongs to, so that email templates can vary their content per
     * subject - e.g. only showing the activity rationale for Maths topics. A topic sits in one or more
     * domains, each of which belongs to a subject; in practice those domains share a subject, so the
     * first name alphabetically is the topic's subject.
     */
    private async getSubjectName(topicId: string, manager?: EntityManager): Promise<string> {
        if (!topicId) return null;

        const topicRepository: Repository<StaticLwpTopic> = manager ? manager.getRepository(StaticLwpTopic) : this.topicRepository;

        const subjects = await topicRepository
            .createQueryBuilder('topic')
            .innerJoin('topic.domainsAndYearGroups', 'domainsAndYearGroups')
            .innerJoin('domainsAndYearGroups.domain', 'domain')
            .innerJoin('domain.subject', 'subject')
            .where('topic.id = :topicId', { topicId })
            .select('subject.name', 'name')
            .distinct(true)
            .orderBy('subject.name')
            .getRawMany<{ name: string }>();

        return subjects[0]?.name ?? null;
    }

    /** The tag names on an already-loaded school, which requires `schoolTags.tag` to have been joined. */
    private toTagNames(school?: LwpSchool): string[] {
        return (school?.schoolTags ?? []).map((schoolTag) => schoolTag?.tag?.name).filter(Boolean);
    }

    /**
     * The School Partnership Manager looking after a school, named by its `SPM: ...` tag. The tag matches an
     * SPM_EMAILS entry when it holds either the text before the '@' - `SPM: Joanne` holds the `jo` of `jo@...` -
     * or the configured name, which catches a tag shorter than the mailbox: `SPM: Jess` names `Jess <jessica@...>`.
     * The email is always signed with the name from that entry.
     *
     * Only `SPM: ...` tags are read, which is what makes such loose matching safe - an ordinary school tag like
     * `Johnson Primary` is never a candidate. Where two entries suit one tag, the first configured wins. Returns
     * null when no tag matches, leaving the caller on the template's own sender and sign-off.
     */
    private resolveSpmFromTags(tags: string[]): SpmContact | null {
        const spms: SpmContact[] = this.configService.get('notification.spm_emails') ?? [];
        const spmTags = tags.filter((tag) => /^\s*SPM\s*:/i.test(tag)).map((tag) => tag.toLowerCase());

        return (
            spms.find(({ email, name }) =>
                spmTags.some((tag) => tag.includes(email.split('@')[0].toLowerCase()) || tag.includes(name.toLowerCase()))
            ) ?? null
        );
    }

    private getClassRegisterLink(schoolClassId: string): string {
        return `${this.configService.get('server.hostedUrl')}/class/${schoolClassId}/register`;
    }

    private getPupilTrophyLink(pupilId: string): string {
        return `${this.configService.get('server.hostedUrl')}/child/${pupilId}/trophies`;
    }

    private getParentInviteMessageByParent(user: LwpUser): string {
        return `${user.firstname} ${user.lastname}`;
    }

    private getParentInviteMessageByTeacher(user: LwpUser): string {
        return `${user.nameForChildren} at ${user.school.schoolName}`;
    }

    private getTeacherInviteMessageByAdmin(): string {
        return 'Admin';
    }

    private getTeacherInviteMessageByParent(): string {
        return 'Parent';
    }

    private getTeacherInviteMessageByTeacher(): string {
        return 'Teacher';
    }

    public async sendTrophyMailToParent(
        user: LwpUser,
        pupil: LwpPupil,
        message: string,
        trophyName: string,
        magicLinkToken: string,
        sendNow = false
    ): Promise<void> {
        const magicLink = `/magic/${magicLinkToken}`;

        await this.lwpNotificationService.saveNotification(
            user,
            {
                to: user?.email,
                toName: user?.getFullName(),
                params: {
                    BASEURL: `${this.configService.get('server.hostedUrl')}`,
                    PUPILID: pupil?.id,
                    CHILDFIRSTNAME: pupil?.firstname,
                    CHILDLASTNAME: pupil?.lastname,
                    TROPHYLINK: this.getPupilTrophyLink(pupil?.id),
                    TROPHYNAME: trophyName,
                    MESSAGE: message,
                    trophyLink: this.getPupilTrophyLink(pupil?.id),
                    trophyName,
                    message,
                    MAGICID: magicLink
                }
            },
            EmailTemplateTypes.sendTrophyMailToParent,
            null,
            false,
            sendNow
        );
    }

    public async sendTrophyMailToTeacher(
        user: LwpUser,
        message: string,
        schoolClassName: string,
        schoolClassId: string,
        trophyName: string,
        sendNow = false
    ): Promise<void> {
        await this.lwpNotificationService.saveNotification(
            user,
            {
                to: user?.email,
                toName: user?.getFullName(),
                params: {
                    BASEURL: `${this.configService.get('server.hostedUrl')}`,
                    CLASSID: schoolClassId,
                    TROPHYLINK: this.getClassRegisterLink(schoolClassId),
                    TROPHYNAME: trophyName,
                    CLASS: schoolClassName ?? '-',
                    CLASSNAME: schoolClassName ?? '-',
                    MESSAGE: message,
                    trophyLink: this.getClassRegisterLink(schoolClassId),
                    trophyName,
                    className: schoolClassName ?? '-',
                    message
                }
            },
            EmailTemplateTypes.sendTrophyMailToTeacher,
            null,
            false,
            sendNow
        );
    }

    public async sendPupilTopics(
        classTopic: LwpClassTopic,
        parent: LwpUser,
        pupil: LwpPupil,
        pupilParent: LwpPupilParent,
        pendingTopics: boolean,
        pupilTopic: LwpPupilTopic,
        topicMagicLinkToken: string,
        invitationMagicLinkToken?: string,
        rejectMagicLinkToken?: string,
        emailTemplate = EmailTemplateTypes.sendPupilTopics,
        sendNow = false,
        manager?: EntityManager
    ): Promise<void> {
        const { schoolTags, yearGroup, teacherAlias } = await this.getClassEmailContext(classTopic?.class?.id, manager);
        const subjectName = await this.getSubjectName(classTopic?.topic?.id, manager);

        await this.lwpNotificationService.saveNotification(
            parent,
            {
                to: parent?.email,
                toName: `${parent?.firstname} ${parent?.lastname}`,
                params: {
                    BASEURL: `${this.configService.get('server.hostedUrl')}`,
                    PUPILID: pupil?.id,
                    PUPILTOPICID: pupilTopic?.id,
                    CLASSID: classTopic?.class?.id,
                    CLASSTOPICID: classTopic?.id,
                    CHILDFIRSTNAME: pupil?.firstname,
                    CHILDLASTNAME: pupil?.lastname,
                    SCHOOL: classTopic?.class?.school?.schoolName ?? '',
                    TOPICNAME:
                        classTopic?.topic?.parentTopicName?.length > 0
                            ? classTopic?.topic?.parentTopicName
                            : (classTopic?.topic?.teacherTopicName ?? ''),
                    CLASS: classTopic?.class?.name,
                    TEACHERALIAS: classTopic?.class?.mainTeacher?.nameForChildren ?? teacherAlias ?? '',
                    RELEASEDATE: this.helperService.dateHandler1(classTopic?.releaseDate),
                    DUEDATE: classTopic?.dueDate ? this.helperService.dateHandler1(classTopic?.dueDate) : '',
                    READABLEDATE: classTopic?.dueDate
                        ? `Due by ${this.helperService.dateHandler2(classTopic?.dueDate)}`
                        : `Released on ${this.helperService.dateHandler2(classTopic?.releaseDate)}`,
                    PENDINGTOPICS: pendingTopics,
                    PARENTSTATUS: parent?.userStatus,
                    PUPILPARENTSTATUS: pupilParent.status,
                    PUPILSTATUS: await pupil?.getPupilStatus(),
                    PUPILPARENTINVITATIONAT: pupilParent?.lastInvitationEmailSent ?? null,
                    PARENTINVITATIONAT: parent?.lastInvitationEmailSent ?? null,
                    MAGICID: topicMagicLinkToken,
                    REJECT_MAGICID: rejectMagicLinkToken ? rejectMagicLinkToken : null,
                    NEW_STICKERS: '[]',
                    SCRAPBOOKPROMPT: classTopic?.topic?.scrapbookPrompt ?? null,
                    SCHOOLTAGS: schoolTags,
                    YEARGROUP: yearGroup,
                    SUBJECTNAME: subjectName
                }
            },
            emailTemplate,
            parent?.notificationPreference === notificationPreferenceEnum.EMAILREMINDER
                ? 'email'
                : parent?.notificationPreference === notificationPreferenceEnum.SMSREMINDER
                  ? 'phone'
                  : null,
            false,
            sendNow,
            manager
        );
    }

    public async sendUpdatedMagicLink(
        classTopic: LwpClassTopic,
        parent: LwpUser,
        pupil: LwpPupil,
        pupilParent: LwpPupilParent,
        pupilTopic: LwpPupilTopic,
        topicMagicLinkToken: string,
        rejectMagicLinkToken?: string,
        expiredMagicToken?: string,
        sendNow = false
    ): Promise<void> {
        await this.lwpNotificationService.saveNotification(
            parent,
            {
                to: parent?.email,
                toName: `${parent?.firstname} ${parent?.lastname}`,
                params: {
                    BASEURL: `${this.configService.get('server.hostedUrl')}`,
                    MAGICID: topicMagicLinkToken,
                    PUPILID: pupil?.id,
                    PUPILTOPICID: pupilTopic?.id,
                    CHILDFIRSTNAME: pupil?.firstname,
                    CHILDLASTNAME: pupil?.lastname,
                    CLASS: classTopic?.class?.name,
                    CLASSID: classTopic?.class?.id,
                    CLASSTOPICID: classTopic?.id,
                    RELEASEDATE: this.helperService.dateHandler1(classTopic?.releaseDate),
                    PARENTSTATUS: parent?.userStatus,
                    PUPILSTATUS: await pupil?.getPupilStatus(),
                    PUPILPARENTSTATUS: pupilParent.status,
                    SCHOOL: classTopic?.class?.school?.schoolName ?? '',
                    TOPICNAME:
                        classTopic?.topic?.parentTopicName?.length > 0
                            ? classTopic?.topic?.parentTopicName
                            : (classTopic?.topic?.teacherTopicName ?? ''),
                    TEACHERALIAS: classTopic?.class?.mainTeacher?.nameForChildren ?? '',
                    DUEDATE: classTopic?.dueDate ? this.helperService.dateHandler1(classTopic?.dueDate) : '',
                    PUPILPARENTINVITATIONAT: pupilParent?.lastInvitationEmailSent ?? null,
                    PARENTINVITATIONAT: parent?.lastInvitationEmailSent ?? null,
                    REJECT_MAGICID: rejectMagicLinkToken ? rejectMagicLinkToken : null,
                    TARGET: pupilTopic.readingTarget,
                    TARGET_URL: `${this.configService.get('server.hostedUrl')}/magic/${expiredMagicToken}`
                }
            },
            EmailTemplateTypes.updatedMagicLink,
            parent?.notificationPreference === notificationPreferenceEnum.EMAILREMINDER
                ? 'email'
                : parent?.notificationPreference === notificationPreferenceEnum.SMSREMINDER
                  ? 'phone'
                  : null,
            false,
            sendNow
        );
    }

    public async sendPupilReadingTopicReleased(
        classTopic: LwpClassTopic,
        parent: LwpUser,
        pupil: LwpPupil,
        pupilParent: LwpPupilParent,
        readingTarget: number,
        magicLinkToken: string,
        invitationMagicLinkToken?: string,
        rejectMagicLinkToken?: string,
        pupilTopic?: LwpPupilTopic,
        sendNow = false,
        manager?: EntityManager
    ): Promise<void> {
        const { schoolTags, yearGroup, teacherAlias } = await this.getClassEmailContext(classTopic?.class?.id, manager);
        const subjectName = await this.getSubjectName(classTopic?.topic?.id, manager);

        await this.lwpNotificationService.saveNotification(
            parent,
            {
                to: parent?.email,
                toName: `${parent?.firstname} ${parent?.lastname}`,
                params: {
                    PUPILID: pupil?.id,
                    PUPILTOPICID: pupilTopic?.id,
                    CLASSID: classTopic?.class?.id,
                    CLASSTOPICID: classTopic?.id,
                    CHILDFIRSTNAME: pupil?.firstname,
                    CHILDLASTNAME: pupil?.lastname,
                    SCHOOL: classTopic?.class?.school?.schoolName ?? '',
                    TOPICNAME:
                        classTopic?.topic?.parentTopicName?.length > 0
                            ? classTopic?.topic?.parentTopicName
                            : (classTopic?.topic?.teacherTopicName ?? ''),
                    CLASS: classTopic?.class?.name,
                    TEACHERALIAS: classTopic?.class?.mainTeacher?.nameForChildren ?? teacherAlias ?? '',
                    RELEASEDATE: this.helperService.dateHandler1(classTopic?.releaseDate),
                    DUEDATE: classTopic?.dueDate ? this.helperService.dateHandler1(classTopic?.dueDate) : '',
                    READABLEDATE: classTopic?.dueDate
                        ? `Due by ${this.helperService.dateHandler2(classTopic?.dueDate)}`
                        : `Released on ${this.helperService.dateHandler2(classTopic?.releaseDate)}`,
                    TARGET: readingTarget,
                    MAGICID: magicLinkToken,
                    PARENTSTATUS: parent?.userStatus,
                    PUPILPARENTSTATUS: pupilParent.status,
                    PUPILSTATUS: await pupil?.getPupilStatus(),
                    PUPILPARENTINVITATIONAT: pupilParent?.lastInvitationEmailSent ?? null,
                    PARENTINVITATIONAT: parent?.lastInvitationEmailSent ?? null,
                    SIGNUP_MAGICID: invitationMagicLinkToken ? invitationMagicLinkToken : null,
                    REJECT_MAGICID: rejectMagicLinkToken ? rejectMagicLinkToken : null,
                    NEW_STICKERS: '[]',
                    SCHOOLTAGS: schoolTags,
                    YEARGROUP: yearGroup,
                    SUBJECTNAME: subjectName
                }
            },
            EmailTemplateTypes.sendPupilReadingTopicReleased,
            parent?.notificationPreference === notificationPreferenceEnum.EMAILREMINDER
                ? 'email'
                : parent?.notificationPreference === notificationPreferenceEnum.SMSREMINDER
                  ? 'phone'
                  : null,
            false,
            sendNow,
            manager
        );
    }

    public async sendTeacherTopicsToBeReleasedTomorrow(ct: LwpClassTopic, sendNow = false): Promise<void> {
        await this.lwpNotificationService.saveNotification(
            ct?.class?.mainTeacher,
            {
                to: ct?.class?.mainTeacher?.email,
                toName: `${ct?.class?.mainTeacher?.firstname} ${ct?.class?.mainTeacher?.lastname}`,
                params: {
                    BASEURL: `${this.configService.get('server.hostedUrl')}`,
                    SCHOOL: ct?.class?.school?.schoolName,
                    TOPICNAME: ct?.topic?.teacherTopicName,
                    TEACHERPDF_REQUIRED: ct?.topic?.isTeacherPdfRequired,
                    PARENTTOPICNAME: ct?.topic?.parentTopicName,
                    TOPICMESSAGE: ct.topic.teacherEmailBody?.replace(/{{ class }}/g, ct?.class?.name) ?? '',
                    CLASS: ct?.class?.name,
                    TEACHERALIAS: ct?.class?.mainTeacher?.nameForChildren,
                    RELEASEDATE: this.helperService.dateHandler1(ct?.releaseDate),
                    DUEDATE: ct?.dueDate ? this.helperService.dateHandler1(ct?.dueDate) : '',
                    READABLEDATE: ct?.dueDate
                        ? `Due by ${this.helperService.dateHandler2(ct?.dueDate)}`
                        : `Released on ${this.helperService.dateHandler2(ct?.releaseDate)}`,
                    ISRELEASED: ct?.released ? 'Y' : 'N',
                    PUBLICFILES_BASEURL: process.env.MINIO_PUBLIC_BASE_URL,
                    TEACHERPDF_FILENAME: ct?.topic?.teacherPdf,
                    CLASSTOPICID: ct?.id,
                    CLASSID: ct?.class?.id
                }
            },
            EmailTemplateTypes.sendTeacherTopicsToBeReleasedTomorrow,
            null,
            false,
            sendNow
        );
    }

    /**
     * Only used for test sends from the admin screens; the real email is queued in bulk by SQL. Values
     * are shaped as that SQL will send them - dates as YYYY-MM-DD, files as bare filenames - so a
     * template that looks right in a test send looks right in the real email.
     */
    public async sendTeacherTopicToBeReleasedNextWeek(ct: LwpClassTopic, sendNow = false): Promise<void> {
        await this.lwpNotificationService.saveNotification(
            ct?.class?.mainTeacher,
            {
                to: ct?.class?.mainTeacher?.email,
                toName: `${ct?.class?.mainTeacher?.firstname} ${ct?.class?.mainTeacher?.lastname}`,
                params: {
                    SCHOOL: ct?.class?.school?.schoolName,
                    CLASS: ct?.class?.name,
                    CLASSID: ct?.class?.id,
                    CLASSTOPICID: ct?.id,
                    TOPICNAME: ct?.topic?.teacherTopicName,
                    PARENTTOPICNAME: ct?.topic?.parentTopicName,
                    TOPICMESSAGE: ct?.topic?.teacherEmailBody?.replace(/{{ class }}/g, ct?.class?.name) ?? '',
                    TEACHERALIAS: ct?.class?.mainTeacher?.nameForChildren,
                    RELEASEDATE: ct?.releaseDate ? moment(ct.releaseDate).format('YYYY-MM-DD') : null,
                    DUEDATE: ct?.dueDate ? moment(ct.dueDate).format('YYYY-MM-DD') : null,
                    PUBLICFILES_BASEURL: process.env.MINIO_PUBLIC_BASE_URL,
                    TEACHERRESOURCE_FILENAME: ct?.topic?.teacherResource ?? null,
                    TEACHERPDF_FILENAME: ct?.topic?.teacherPdf ?? null
                }
            },
            EmailTemplateTypes.sendTeacherTopicToBeReleasedNextWeek,
            null,
            false,
            sendNow
        );
    }

    /**
     * Only used for test sends from the admin screens; the real email is queued in bulk by SQL, like the other
     * teacher topic emails. Sent to `user`, with values shaped as that SQL sends them - dates as YYYY-MM-DD,
     * files as bare filenames - so a template that looks right in a test send looks right in the real email.
     */
    public async sendTeacherMoneySkillsFirstTopicScheduled(user: LwpUser, ct: LwpClassTopic, sendNow = false): Promise<void> {
        await this.lwpNotificationService.saveNotification(
            user,
            {
                to: user?.email,
                toName: `${user?.firstname} ${user?.lastname}`,
                params: {
                    SCHOOL: ct?.class?.school?.schoolName,
                    CLASS: ct?.class?.name,
                    CLASSID: ct?.class?.id,
                    CLASSTOPICID: ct?.id,
                    TOPICNAME: ct?.topic?.teacherTopicName,
                    PARENTTOPICNAME: ct?.topic?.parentTopicName,
                    TEACHERALIAS: user?.nameForChildren,
                    RELEASEDATE: ct?.releaseDate ? moment(ct.releaseDate).format('YYYY-MM-DD') : null,
                    DUEDATE: ct?.dueDate ? moment(ct.dueDate).format('YYYY-MM-DD') : null,
                    PUBLICFILES_BASEURL: process.env.MINIO_PUBLIC_BASE_URL,
                    TEACHERRESOURCE_FILENAME: ct?.topic?.teacherResource ?? null,
                    TEACHERPDF_FILENAME: ct?.topic?.teacherPdf ?? null,
                    TEACHERPDF_REQUIRED: !!ct?.topic?.isTeacherPdfRequired,
                    ISSCHOOLLEADER: !!user?.isSchoolLeader,
                    ISMAINTEACHER: !!user?.id && ct?.class?.mainTeacher?.id === user.id
                }
            },
            EmailTemplateTypes.sendTeacherMoneySkillsFirstTopicScheduled,
            null,
            false,
            sendNow
        );
    }

    public async sendTeacherReadingTopicEnd(ct: LwpClassTopic, sendNow = false): Promise<void> {
        await this.lwpNotificationService.saveNotification(
            ct?.class?.mainTeacher,
            {
                to: ct?.class?.mainTeacher?.email,
                toName: `${ct?.class?.mainTeacher?.firstname} ${ct?.class?.mainTeacher?.lastname}`,
                params: {
                    TOPICNAME: ct?.topic?.teacherTopicName,
                    PARENTTOPICNAME: ct?.topic?.parentTopicName,
                    TOPICMESSAGE: ct.topic.teacherEmailBody?.replace(/{{ class }}/g, ct?.class?.name) ?? '',
                    CLASS: ct?.class?.name,
                    TEACHERALIAS: ct?.class?.mainTeacher?.nameForChildren,
                    RELEASEDATE: this.helperService.dateHandler1(ct?.releaseDate),
                    DUEDATE: this.helperService.dateHandler1(ct?.dueDate),
                    READABLEDATE: ct?.dueDate
                        ? `Due by ${this.helperService.dateHandler2(ct?.dueDate)}`
                        : `Released on ${this.helperService.dateHandler2(ct?.releaseDate)}`,
                    ISRELEASED: ct?.released ? 'Y' : 'N',
                    CLASSTOPICID: ct?.id,
                    SCHOOL: ct?.class?.school?.schoolName,
                    TARGET: ct?.readingTarget,
                    CLASSID: ct?.class?.id
                }
            },
            EmailTemplateTypes.sendTeacherReadingTopicEnd,
            null,
            false,
            sendNow
        );
    }

    public async sendMailForTopicReminderAfter7Days(
        pt: LwpPupilTopic,
        parent: LwpUser,
        pupil: LwpPupil,
        pendingTopics: boolean,
        magicLinkToken: string,
        sendNow = false
    ): Promise<void> {
        const classTopic = pt?.classTopic;

        if (parent?.notificationPreference !== notificationPreferenceEnum.NOREMINDER) {
            await this.lwpNotificationService.saveNotification(
                parent,
                {
                    to: parent?.email,
                    toName: parent?.getFullName(),
                    params: {
                        BASEURL: `${this.configService.get('server.hostedUrl')}`,
                        PUPILID: pupil?.id,
                        PUPILTOPICID: pt?.id,
                        CLASSID: pt?.classTopic?.class?.id,
                        CLASSTOPICID: classTopic?.id,
                        CHILDFIRSTNAME: pupil?.firstname,
                        CHILDLASTNAME: pupil?.lastname,
                        SCHOOL: pt?.classTopic?.class?.school?.schoolName ?? '',
                        TOPICNAME:
                            pt?.topic?.parentTopicName?.length > 0 ? pt?.topic?.parentTopicName : (pt?.topic?.teacherTopicName ?? ''),
                        CLASS: pt?.classTopic?.class?.name,
                        TEACHERALIAS: pt?.classTopic?.class?.mainTeacher?.nameForChildren ?? '',
                        RELEASEDATE: this.helperService.dateHandler1(pt?.releaseDate),
                        DUEDATE: classTopic?.dueDate ? this.helperService.dateHandler1(classTopic?.dueDate) : '',
                        PENDINGTOPICS: pendingTopics,
                        MAGICID: magicLinkToken
                    }
                },
                EmailTemplateTypes.sendMailForTopicReminderAfter7Days,
                parent?.notificationPreference === notificationPreferenceEnum.EMAILREMINDER
                    ? 'email'
                    : parent?.notificationPreference === notificationPreferenceEnum.SMSREMINDER
                      ? 'phone'
                      : null,
                false,
                sendNow
            );
        }
    }

    public async readingTopicReminderAfter5Days(
        pt: LwpPupilTopic,
        parent: LwpUser,
        pupil: LwpPupil,
        pendingTopics: boolean,
        magicLinkToken: string,
        sendNow = false
    ): Promise<void> {
        const classTopic = pt?.classTopic;

        if (parent?.notificationPreference !== notificationPreferenceEnum.NOREMINDER) {
            await this.lwpNotificationService.saveNotification(
                parent,
                {
                    to: parent?.email,
                    toName: parent?.getFullName(),
                    params: {
                        BASEURL: `${this.configService.get('server.hostedUrl')}`,
                        PUPILID: pupil?.id,
                        PUPILTOPICID: pt?.id,
                        CLASSID: pt?.classTopic?.class?.id,
                        CLASSTOPICID: classTopic?.id,
                        CHILDFIRSTNAME: pupil?.firstname,
                        CHILDLASTNAME: pupil?.lastname,
                        SCHOOL: pt?.classTopic?.class?.school?.schoolName ?? '',
                        TOPICNAME:
                            pt?.topic?.parentTopicName?.length > 0 ? pt?.topic?.parentTopicName : (pt?.topic?.teacherTopicName ?? ''),
                        CLASS: pt?.classTopic?.class?.name,
                        TEACHERALIAS: pt?.classTopic?.class?.mainTeacher?.nameForChildren ?? '',
                        RELEASEDATE: this.helperService.dateHandler1(pt?.releaseDate),
                        DUEDATE: classTopic?.dueDate ? this.helperService.dateHandler1(classTopic?.dueDate) : '',
                        MAGICID: magicLinkToken
                    }
                },
                EmailTemplateTypes.readingTopicReminderAfter5Days,
                parent?.notificationPreference === notificationPreferenceEnum.EMAILREMINDER
                    ? 'email'
                    : parent?.notificationPreference === notificationPreferenceEnum.SMSREMINDER
                      ? 'phone'
                      : null,
                false,
                sendNow
            );
        }
    }

    public async readingTopicReminderAfter2Days(
        pt: LwpPupilTopic,
        parent: LwpUser,
        pupil: LwpPupil,
        pendingTopics: boolean,
        magicLinkToken: string,
        sendNow = false
    ): Promise<void> {
        const classTopic = pt?.classTopic;

        if (parent?.notificationPreference !== notificationPreferenceEnum.NOREMINDER) {
            await this.lwpNotificationService.saveNotification(
                parent,
                {
                    to: parent?.email,
                    toName: parent?.getFullName(),
                    params: {
                        BASEURL: `${this.configService.get('server.hostedUrl')}`,
                        PUPILID: pupil?.id,
                        PUPILTOPICID: pt?.id,
                        CLASSID: pt?.classTopic?.class?.id,
                        CLASSTOPICID: classTopic?.id,
                        CHILDFIRSTNAME: pupil?.firstname,
                        CHILDLASTNAME: pupil?.lastname,
                        SCHOOL: pupil?.school?.schoolName ?? '',
                        TOPICNAME:
                            pt?.topic?.parentTopicName?.length > 0 ? pt?.topic?.parentTopicName : (pt?.topic?.teacherTopicName ?? ''),
                        CLASS: pt?.classTopic?.class?.name,
                        TEACHERALIAS: pt?.classTopic?.class?.mainTeacher?.nameForChildren ?? '',
                        RELEASEDATE: this.helperService.dateHandler1(pt?.releaseDate),
                        DUEDATE: classTopic?.dueDate ? this.helperService.dateHandler1(classTopic?.dueDate) : '',
                        MAGICID: magicLinkToken
                    }
                },
                EmailTemplateTypes.readingTopicReminderAfter2Days,
                parent?.notificationPreference === notificationPreferenceEnum.EMAILREMINDER
                    ? 'email'
                    : parent?.notificationPreference === notificationPreferenceEnum.SMSREMINDER
                      ? 'phone'
                      : null,
                false,
                sendNow
            );
        }
    }

    public async sendQuestionToUser(user: LwpUser, question: string, sendNow = false): Promise<void> {
        await this.lwpNotificationService.saveNotification(
            user,
            {
                to: user?.email,
                toName: user?.getFullName(),
                params: {
                    BASEURL: `${this.configService.get('server.hostedUrl')}`,
                    USERQUESTION: question
                }
            },
            EmailTemplateTypes.sendQuestionToUser,
            null,
            false,
            sendNow
        );
    }

    public async sendQuestionToLwpStaff(user: LwpUser, question: string, staffEmail?: string, sendNow = false): Promise<void> {
        await this.lwpNotificationService.addNotification(
            {
                to: staffEmail?.length > 0 ? staffEmail : this?.staffEmail,
                toName: this?.staffEmailName,
                replyTo: { email: user?.email, name: user?.getFullName() },
                params: {
                    BASEURL: `${this.configService.get('server.hostedUrl')}`,
                    USERTYPE: user?.type,
                    USERQUESTION: question,
                    SCHOOL: user?.school?.schoolName ?? '',
                    USERFIRSTNAME: user?.firstname,
                    USERLASTNAME: user?.lastname,
                    USEREMAIL: user?.email,
                    FIRSTNAME: user?.firstname,
                    LASTNAME: user?.lastname,
                    USERSTATUS: user?.userStatus,
                    LINK: `${this.configService.get('server.hostedUrl')}`
                }
            },
            EmailTemplateTypes.sendQuestionToLwpStaff,
            false,
            sendNow
        );
    }

    public async schoolLeaderInvitationEmail(
        user: LwpUser,
        school: LwpSchool,
        magicLinkToken: string,
        rejectMagicLinkToken: string,
        invitedBy?: LwpUser,
        sendNow = false
    ): Promise<void> {
        let message = '';

        if (invitedBy) {
            const inviteMessageFn = this.teacherInviteMessageByInvitedUserType[invitedBy?.type];

            message = inviteMessageFn(invitedBy);
        }

        await this.lwpNotificationService.saveNotification(
            user,
            {
                to: user?.email,
                toName: user?.getFullName(),
                params: {
                    BASEURL: `${this.configService.get('server.hostedUrl')}`,
                    RESETPASSTOKEN: magicLinkToken,
                    INVITEDBY: message,
                    CODE: magicLinkToken,
                    SCHOOL: school?.schoolName,
                    MAGICID: magicLinkToken,
                    REJECT_MAGICID: rejectMagicLinkToken,
                    TOTALLICENSES: school?.numOfTotalClassesAllowed,
                    FULLPROGRAMMELICENSES: school?.numOfFullProgrammeClassesAllowed
                }
            },
            EmailTemplateTypes.schoolLeaderInvitationEmail,
            null,
            false,
            sendNow
        );
    }

    /**
     * The welcome email's params and Reply-To, split out from the send because `SchoolService.sendSchoolLeaderWelcomeEmails`
     * writes its own notification rows - the whole admin batch in one insert - and must produce exactly these.
     * This is the only definition of them, so the batch and the single test send cannot drift apart.
     */
    public schoolLeaderWelcomeEmailMail(school: LwpSchool): Pick<Mail, 'params' | 'replyTo'> {
        const fullProgrammeLicences = school?.numOfFullProgrammeClassesAllowed ?? 0;
        const totalLicences = school?.numOfTotalClassesAllowed ?? 0;
        const schoolTags = this.toTagNames(school);
        const spm = this.resolveSpmFromTags(schoolTags);

        return {
            params: {
                BASEURL: `${this.configService.get('server.hostedUrl')}`,
                SCHOOL: school?.schoolName,
                SPM: spm?.name ?? 'School Partnership Manager',
                // Becomes the From address in getEmailData; absent when no tag matched, which leaves
                // the template's own sender in place.
                SPMEMAIL: spm?.email ?? null,
                ACADEMICYEAR: school?.curentPeriod?.shortName,
                WONDECOMPLETED: school?.importStatus === ImportStatus.COMPLETE,
                FULLPROGRAMME: fullProgrammeLicences > 0,
                READINGLOG: totalLicences > 0,
                READINGLOGONLY: totalLicences > 0 && fullProgrammeLicences === 0 && !school?.isReadyTeddyAvailable,
                READYTEDDY: school?.isReadyTeddyAvailable ?? false,
                SCHOOLTAGS: schoolTags
            },
            // Sent as the SPM, so a leader hitting reply reaches them rather than the shared inbox. Named and
            // addressed from the same SPM_EMAILS entry as the sender, so From and Reply-To always agree.
            // Supplied here rather than worked out at the send, which knows nothing of SPMs - this is the only
            // email whose sender is overridden. Null when no tag matched, leaving the send's default Reply-To.
            replyTo: spm ? { email: spm.email, name: spm.name } : null
        };
    }

    /**
     * The September welcome email for school leaders. Content and conditionals live in the template - see
     * graphql-provider/docs/email-templates/README.md.
     *
     * Nothing calls this on a schedule: LEA-6539 removed the autumn cron, so the email is only sent when
     * something deliberately asks for it - the admin test send, and the admin bulk send on the schools list.
     *
     * The School Partnership Manager is resolved from the school's tags, so callers must pass a school with
     * `schoolTags.tag` loaded or everyone falls back to the generic sign-off and sender. Their personal
     * booking links are still not supplied.
     */
    public async schoolLeaderWelcomeEmail(user: LwpUser, school: LwpSchool, sendNow = false): Promise<void> {
        await this.lwpNotificationService.saveNotification(
            user,
            {
                to: user?.email,
                toName: user?.getFullName(),
                ...this.schoolLeaderWelcomeEmailMail(school)
            },
            EmailTemplateTypes.schoolLeaderWelcomeEmail,
            null,
            false,
            sendNow
        );
    }

    public async adminInvitationEmail(user: LwpUser, magicLinkToken: string, rejectMagicLinkToken: string, sendNow = false): Promise<void> {
        await this.lwpNotificationService.saveNotification(
            user,
            {
                to: user?.email,
                toName: user?.getFullName(),
                params: {
                    BASEURL: `${this.configService.get('server.hostedUrl')}`,
                    INVITEDBY: '',
                    CODE: magicLinkToken,
                    RESETPASSTOKEN: magicLinkToken,
                    MAGICID: magicLinkToken,
                    REJECT_MAGICID: rejectMagicLinkToken
                }
            },
            EmailTemplateTypes.adminInvitationEmail,
            null,
            false,
            sendNow
        );
    }

    public async teacherInvitationEmail(
        user: LwpUser,
        school: LwpSchool,
        magicLinkToken: string,
        rejectMagicLinkToken: string,
        invitedBy?: LwpUser,
        sendNow = false
    ): Promise<void> {
        let message = '';

        if (invitedBy) {
            const inviteMessageFn = this.teacherInviteMessageByInvitedUserType[invitedBy?.type];

            message = inviteMessageFn(invitedBy);
        }

        const countClassesWith = (attr): Promise<number> =>
            // TypeORM refuses to work if you mix its own WHERE and strings
            // (it decides for you what parameter numbers it wants, and doesn't tell you.)
            // So, these are all manual queries.
            // They can't all be done easily in TypeORM WHERE because you can't easily index the Period
            // for just short-circuiting the ID, you'd have to load the whole relation.
            // See https://poteris.slack.com/archives/C045RSHUV9P/p1692795937626509
            this.schoolClassRepository
                .query(
                    `select count(1) from lwp_school_class where "isRegistrationClass" and "periodIndex" = $1 and "schoolId" = $2 and ${this.schoolClassRepository.manager.connection.driver.escape(
                        attr
                    )}`,
                    [school?.periodIndex, school?.id]
                )
                .then((res) => res[0].count);

        await this.lwpNotificationService.saveNotification(
            user,
            {
                to: user?.email,
                toName: user?.getFullName(),
                params: {
                    BASEURL: `${this.configService.get('server.hostedUrl')}`,
                    INVITEDBY: message,
                    CODE: magicLinkToken,
                    SCHOOL: school?.schoolName,
                    MAGICID: magicLinkToken,
                    REJECT_MAGICID: rejectMagicLinkToken,
                    READINGLOGCLASSES: await countClassesWith('IsReadingLogsEnabled'),
                    FULLPROGRAMMECLASSES: await countClassesWith('isFullProgramme')
                }
            },
            EmailTemplateTypes.teacherInvitationEmail,
            null,
            false,
            sendNow
        );
    }

    public async parentInvitationEmail(
        pupilParent: LwpPupilParent,
        magicLinkToken: string,
        rejectMagicLinkToken: string,
        preference?: string,
        isBulkProcess = false,
        sendNow = false,
        manager?: EntityManager
    ): Promise<void> {
        await this.lwpNotificationService.saveNotification(
            pupilParent?.parent,
            {
                to: pupilParent?.parent?.email,
                toName: pupilParent?.parent?.getFullName(),
                params: {
                    BASEURL: `${this.configService.get('server.hostedUrl')}`,
                    CODE: magicLinkToken,
                    MAGICID: magicLinkToken,
                    REJECT_MAGICID: rejectMagicLinkToken,
                    CHILDFIRSTNAME: pupilParent?.pupil?.firstname,
                    SCHOOL: pupilParent?.pupil?.school?.schoolName,
                    PARENTSTATUS: pupilParent?.parent?.userStatus,
                    PUPILPARENTSTATUS: pupilParent?.status,
                    PUPILSTATUS: await pupilParent?.pupil?.getPupilStatus(),
                    PUPILPARENTINVITATIONAT: pupilParent?.lastInvitationEmailSent,
                    PARENTINVITATIONAT: pupilParent?.parent?.lastInvitationEmailSent
                }
            },
            EmailTemplateTypes.parentInvitationEmail,
            preference,
            isBulkProcess,
            sendNow,
            manager
        );
    }

    public async userRequestedSignUpLink(
        user: LwpUser,
        magicLinkToken: string,
        rejectMagicLinkToken: string,
        preference?: string,
        isBulkProcess = false,
        sendNow = false
    ): Promise<void> {
        const emailData = {
            to: user?.email,
            toName: user?.getFullName(),
            params: {
                BASEURL: `${this.configService.get('server.hostedUrl')}`,
                RESETPASSTOKEN: magicLinkToken,
                FIRSTNAME: user?.firstname,
                USERTYPE: user?.type,
                CODE: magicLinkToken,
                MAGICID: magicLinkToken,
                REJECT_MAGICID: rejectMagicLinkToken
            }
        };

        if (preference === 'phone') {
            await this.lwpNotificationService.saveNotification(
                user,
                emailData,
                EmailTemplateTypes.userRequestedSignUpLink,
                preference,
                isBulkProcess,
                sendNow
            );
        } else {
            await this.lwpNotificationService.saveNotification(
                user,
                emailData,
                EmailTemplateTypes.userRequestedSignUpLink,
                null,
                isBulkProcess,
                sendNow
            );
        }
    }

    public async sendParentNotificationOfTeacherReadingComment(
        parent: LwpUser,
        pupil: LwpPupil,
        classTopic: LwpClassTopic,
        pupilTopic: LwpPupilTopic,
        readingEntryDate: Date,
        comment: string,
        magicLinkToken: string,
        preference?: string,
        isBulkProcess = false,
        sendNow = false,
        feedbackId?: number
    ): Promise<void> {
        const emailData = {
            to: parent?.email,
            toName: parent?.getFullName(),
            params: {
                PUPILID: pupil?.id,
                PUPILTOPICID: pupilTopic?.id,
                CLASSID: classTopic?.class?.id,
                CLASSTOPICID: classTopic?.id,
                CHILDFIRSTNAME: pupil?.firstname,
                CHILDLASTNAME: pupil?.lastname,
                SCHOOL: classTopic?.class?.school?.schoolName ?? '',
                CLASS: classTopic?.class?.name,
                TEACHERALIAS: classTopic?.class?.mainTeacher?.nameForChildren ?? '',
                RELEASEDATE: this.helperService.dateHandler1(classTopic?.releaseDate),
                READINGENTRYDATE: moment(readingEntryDate).format('YYYY-MM-DD'),
                PUPILFEEDBACKID: feedbackId,
                COMMENT: comment,
                MAGICID: magicLinkToken
            }
        };

        if (preference === 'phone') {
            await this.lwpNotificationService.saveNotification(
                parent,
                emailData,
                EmailTemplateTypes.sendParentNotificationOfTeacherReadingComment,
                preference,
                isBulkProcess,
                sendNow
            );

            return;
        }

        await this.lwpNotificationService.saveNotification(
            parent,
            emailData,
            EmailTemplateTypes.sendParentNotificationOfTeacherReadingComment,
            null,
            isBulkProcess,
            sendNow
        );
    }

    public async sendParentNotificationOfTeacherFeedbackReply(
        parent: LwpUser,
        pupil: LwpPupil,
        feedbackId: number,
        comment: string,
        teacherName: string,
        isReading = false,
        topicName: string,
        activityName: string,
        preference?: string,
        isBulkProcess = false,
        sendNow = false
    ): Promise<void> {
        const emailData = {
            to: parent?.email,
            toName: parent?.getFullName(),
            params: {
                BASEURL: `${this.configService.get('server.hostedUrl')}`,
                FIRSTNAME: parent?.firstname,
                LASTNAME: parent?.lastname,
                USERSTATUS: parent.userStatus,
                REPLY: comment,
                PUPILID: pupil.id,
                PUPILFEEDBACKID: feedbackId,
                CHILDFIRSTNAME: pupil.firstname,
                CHILDLASTNAME: pupil.lastname,
                TEACHERALIAS: teacherName,
                ISREADING: isReading,
                TOPICNAME: topicName,
                ACTIVITYNAME: activityName
            }
        };

        if (preference === 'phone') {
            await this.lwpNotificationService.saveNotification(
                parent,
                emailData,
                EmailTemplateTypes.sendParentNotificationOfTeacherFeedbackReply,
                preference,
                isBulkProcess,
                sendNow
            );

            return;
        }

        await this.lwpNotificationService.saveNotification(
            parent,
            emailData,
            EmailTemplateTypes.sendParentNotificationOfTeacherFeedbackReply,
            null,
            isBulkProcess,
            sendNow
        );
    }

    public async sendResetPasswordEmail(
        user: LwpUser,
        resetPassToken: string,
        preference?: string,
        sendNow = false,
        hasPassword = true
    ): Promise<void> {
        await this.lwpNotificationService.saveNotification(
            user,
            {
                to: user?.email,
                toName: user?.getFullName(),
                params: {
                    BASEURL: `${this.configService.get('server.hostedUrl')}`,
                    RESETPASSTOKEN: resetPassToken,
                    CODE: resetPassToken,
                    HASPASSWORD: hasPassword
                }
            },
            EmailTemplateTypes.sendResetPasswordEmail,
            preference ?? null,
            false,
            sendNow
        );
    }

    public async invoiceOfSchoolClassLicenceToAdmin(
        to: string,
        toName: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params: { [key: string]: any },
        sendNow = false
    ): Promise<void> {
        await this.lwpNotificationService.addNotification(
            {
                to,
                toName,
                params
            },
            EmailTemplateTypes.invoiceOfSchoolClassLicenceToAdmin,
            true,
            sendNow
        );
    }

    public async invoiceOfSchoolClassLicenceToSchool(
        to: string,
        toName: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params: { [key: string]: any },
        sendNow = false
    ): Promise<void> {
        await this.lwpNotificationService.addNotification(
            {
                to,
                toName,
                params
            },
            EmailTemplateTypes.invoiceOfSchoolClassLicenceToSchool,
            true,
            sendNow
        );
    }

    public async sendTeacherAssignedToClass(teacher: LwpUser, schoolClass: LwpSchoolClass, sendNow = false): Promise<void> {
        await this.lwpNotificationService.saveNotification(
            teacher,
            {
                to: teacher?.email,
                toName: teacher?.getFullName(),
                params: {
                    BASEURL: `${this.configService.get('server.hostedUrl')}`,
                    CLASS: schoolClass?.name,
                    SCHOOL: schoolClass?.school?.schoolName,
                    TEACHERALIAS: teacher?.nameForChildren,
                    CLASSID: schoolClass?.id,
                    ISFULLPROGRAMMECLASS: schoolClass?.isFullProgramme
                }
            },
            EmailTemplateTypes.sendTeacherAssignedToClass,
            null,
            false,
            sendNow
        );
    }

    public async sendTeacherReadingTopicHolidayOverlap(
        teacher: LwpUser,
        schoolClass: LwpSchoolClass,
        classTopic: LwpClassTopic,
        schoolHoliday: LwpSchoolHoliday,
        sendNow = false
    ): Promise<void> {
        await this.lwpNotificationService.saveNotification(
            teacher,
            {
                to: teacher?.email,
                toName: teacher?.getFullName(),
                params: {
                    BASEURL: `${this.configService.get('server.hostedUrl')}`,
                    SCHOOL: schoolClass.school.schoolName,
                    CLASSTOPICID: classTopic.id,
                    CLASS: schoolClass.name,
                    TEACHERALIAS: teacher.nameForChildren,
                    RELEASEDATE: classTopic.releaseDate,
                    CLASSID: schoolClass.id,
                    HOLIDAYNAME: schoolHoliday.holidayName,
                    HOLIDAYSTARTDATE: moment(schoolHoliday.startDate).format('YYYY-MM-DD'),
                    HOLIDAYENDDATE: moment(schoolHoliday.endDate).format('YYYY-MM-DD')
                }
            },
            EmailTemplateTypes.sendTeacherReadingTopicHolidayOverlap,
            null,
            false,
            sendNow
        );
    }

    public async sendLwpTeamMoneySkillsActivationEmail(
        user: LwpUser,
        school: LwpSchool,
        sendNow = false,
        staffEmail?: string | null
    ): Promise<void> {
        await this.lwpNotificationService.addNotification(
            {
                to: staffEmail?.length > 0 ? staffEmail : this?.staffEmail,
                toName: this?.staffEmailName,
                replyTo: { email: user?.email, name: user?.getFullName() },
                params: {
                    BASEURL: `${this.configService.get('server.hostedUrl')}`,
                    SCHOOLID: school?.id,
                    SCHOOLNAME: school?.schoolName,
                    ENABLED_AT: this.helperService.dateHandler2(school.logUpdatedAt),
                    EMAIL: user?.email,
                    TEACHERALIAS: user?.nameForChildren,
                    FIRSTNAME: user?.firstname,
                    LASTNAME: user?.lastname
                }
            },
            EmailTemplateTypes.sendLwpTeamMoneySkillsActivationEmail,
            false,
            sendNow
        );
    }
}
