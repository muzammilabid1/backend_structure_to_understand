/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GraphQLError } from 'graphql';
import Handlebars from 'handlebars';
import { PupilParentStatus, UserStatus } from 'lwp-shared';
import moment from 'moment';
import { ConfigService } from 'nestjs-config';
import newrelic from 'newrelic/index';
import { UserType } from 'src/auth/types/UserType';
import { EmailService, Mail, SMSService } from 'src/common/notification/notification.types';
import { InvalidSmsRecipientError } from 'src/common/notification/validation';
import { Pagination } from 'src/paginate';
import { Brackets, EntityManager, IsNull, LessThanOrEqual, Not, Repository, SelectQueryBuilder } from 'typeorm';
import { buildPaginator, Cursor } from 'typeorm-cursor-pagination';
import Paginator from 'typeorm-cursor-pagination/lib/Paginator';

import { LwpNotification } from '../entities/lwp_notification';
import { LwpNotificationEventHistory } from '../entities/lwp_notification_event_history';
import { LwpPupilParent } from '../entities/pupil_parent';
import { StaticLwpEmailTemplate } from '../entities/static_lwp_email_template';
import { LwpUser } from '../entities/user';
import {
    EmailTemplateOutput,
    EmailTemplateStatus,
    EmailTemplateTypes,
    ErrorStatusCodeEnum,
    LwpNotificationPreview,
    LwpNotificationStatus,
    MailgunEventType,
    MessageLogFilterInput,
    MessageLogsCountOutput,
    MessageType,
    NotificationType,
    SMSDataOutput,
    TestEmailInput,
    TwilioMessageStatus,
    UpdateNotificationStatusInputForTesting,
    UseEmailOption
} from '../model';
import { HelperService } from './helper.service';
import { ParameterService } from './parameter.service';

// Allow users to specify that they want a friendly date.
Handlebars.registerHelper('friendlyDate', function (dateString, setting) {
    // "dayMonth", e.g. "Wednesday 4th March"
    if (setting === 'dayMonth') return moment(dateString ?? null).format('dddd Do MMMM');

    // "long", e.g. "Wednesday, 4 March 2026"
    const longDate: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

    // default, e.g. "04/03/2026"
    return new Date(dateString).toLocaleDateString('en-GB', setting === 'long' ? longDate : {});
});

// Allow users to get just the day of a date.
Handlebars.registerHelper('day', function (dateString) {
    return new Date(dateString).toLocaleDateString('en-GB', { weekday: 'long' });
});

// Allow users to check equality of two strings
Handlebars.registerHelper('eq', function (s1: string, s2: string) {
    return s1 === s2;
});

// Allow users to escape URLs
Handlebars.registerHelper('encodeForUrl', function (url: string) {
    return encodeURIComponent(url);
});

// Allow users to check whether a list of tags contains a given tag, e.g. {{#if (hasTag SCHOOLTAGS "term1-emails")}}
Handlebars.registerHelper('hasTag', function (tags: unknown, tag: string) {
    return Array.isArray(tags) && tags.includes(tag);
});

type RecipientType = {
    primary: string;
    secondary?: string;
};

type SendNotificationContext = {
    userId?: string;
    pupilId?: string;
};

type CompiledTemplateAndParametersInput = {
    emailOption?: UseEmailOption;
    wholeEmailContent?: string;
    defaultEmailTemplate?: string;
    heading?: string;
    bodyText?: string;
    linkText?: string;
    link?: string;
    previewLine?: string;
    smsContent?: string;
    subject?: string;
    senderName?: string;
};
type LayoutParameterDataType = {
    HEADING?: HandlebarsTemplateDelegate<any>;
    BODY?: HandlebarsTemplateDelegate<any>;
    BUTTONTEXT?: HandlebarsTemplateDelegate<any>;
    LINK?: HandlebarsTemplateDelegate<any>;
    PREVIEWLINE?: HandlebarsTemplateDelegate<any>;
};
export type CompiledTemplateAndParametersOutput = {
    templateForEmail?: HandlebarsTemplateDelegate<any>;
    templateForSubject?: HandlebarsTemplateDelegate<any>;
    templateForSenderName?: HandlebarsTemplateDelegate<any>;
    templateForSMS?: HandlebarsTemplateDelegate<any>;
    templateForBodyText?: HandlebarsTemplateDelegate<any>;
    templateForPreviewLine?: HandlebarsTemplateDelegate<any>;
    templateForHeading?: HandlebarsTemplateDelegate<any>;
    layoutParameterData?: LayoutParameterDataType;
    emailParams?: string[];
    smsParams?: string[];
};

@Injectable()
export class LwpNotificationService {
    private readonly staffPhoneNumber = 'LWPStaff'; // This could be a number or string
    static allEmailTemplates = {};
    static notificationEmailParameters = {
        sendTrophyMailToParent: [
            'BASEURL',
            'USERSTATUS',
            'FIRSTNAME',
            'LASTNAME',
            'PUPILID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'TROPHYNAME',
            'MESSAGE',
            'trophyName',
            'message',
            'MAGICID'
        ],
        sendTrophyMailToTeacher: [
            'BASEURL',
            'USERSTATUS',
            'FIRSTNAME',
            'LASTNAME',
            'CLASSID',
            'TROPHYNAME',
            'CLASS',
            'MESSAGE',
            'trophyName',
            'className',
            'message'
        ],
        sendPupilTopics: [
            'MAGICID',
            'REJECT_MAGICID',
            'PUPILID',
            'PUPILTOPICID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'SCHOOL',
            'TOPICNAME',
            'TOPICSUBJECT',
            'TOPICMESSAGE',
            'CLASS',
            'CLASSID',
            'CLASSTOPICID',
            'TEACHERALIAS',
            'RELEASEDATE',
            'DUEDATE',
            'TARGET',
            'PARENTSTATUS',
            'PUPILSTATUS',
            'PUPILPARENTSTATUS',
            'PUPILPARENTINVITATIONAT',
            'PARENTINVITATIONAT',
            'PENDINGTOPICS',
            'NEW_STICKERS',
            'SCRAPBOOKPROMPT',
            'SCHOOLTAGS',
            'YEARGROUP',
            'SUBJECTNAME'
        ],
        updatedMagicLink: [
            'BASEURL',
            'MAGICID',
            'PUPILID',
            'PUPILTOPICID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'CLASS',
            'CLASSID',
            'CLASSTOPICID',
            'RELEASEDATE',
            'PARENTSTATUS',
            'PUPILSTATUS',
            'PUPILPARENTSTATUS',
            'SCHOOL',
            'TOPICNAME',
            'TEACHERALIAS',
            'DUEDATE',
            'PUPILPARENTINVITATIONAT',
            'PARENTINVITATIONAT',
            'REJECT_MAGICID',
            'TARGET',
            'TARGET_URL'
        ],
        sendPupilReadingTopicReleased: [
            'MAGICID',
            'REJECT_MAGICID',
            'PUPILID',
            'PUPILTOPICID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'SCHOOL',
            'TOPICNAME',
            'TOPICSUBJECT',
            'TOPICMESSAGE',
            'CLASS',
            'CLASSID',
            'CLASSTOPICID',
            'TEACHERALIAS',
            'RELEASEDATE',
            'DUEDATE',
            'TARGET',
            'PARENTSTATUS',
            'PUPILSTATUS',
            'PUPILPARENTSTATUS',
            'PUPILPARENTINVITATIONAT',
            'PARENTINVITATIONAT',
            'PENDINGTOPICS',
            'SCHOOLTAGS',
            'YEARGROUP',
            'SUBJECTNAME'
        ],
        sendTeacherTopicsToBeReleasedTomorrow: [
            'SCHOOL',
            'CLASSTOPICID',
            'TOPICNAME',
            'PARENTTOPICNAME',
            'TOPICMESSAGE',
            'CLASS',
            'TEACHERALIAS',
            'TEACHERMESSAGE',
            'RELEASEDATE',
            'DUEDATE',
            'ISRELEASED',
            'TEACHERPDF_FILENAME',
            'PUBLICFILES_BASEURL',
            'TEACHERPDF_REQUIRED',
            'CLASSID'
        ],
        sendTeacherTopicToBeReleasedNextWeek: [
            'SCHOOL',
            'CLASS',
            'CLASSID',
            'CLASSTOPICID',
            'TOPICNAME',
            'PARENTTOPICNAME',
            'TOPICMESSAGE',
            'TEACHERALIAS',
            'RELEASEDATE',
            'DUEDATE',
            'PUBLICFILES_BASEURL',
            'TEACHERRESOURCE_FILENAME',
            'TEACHERPDF_FILENAME'
        ],
        sendTeacherMoneySkillsFirstTopicScheduled: [
            'SCHOOL',
            'CLASS',
            'CLASSID',
            'CLASSTOPICID',
            'TOPICNAME',
            'PARENTTOPICNAME',
            'TEACHERALIAS',
            'RELEASEDATE',
            'DUEDATE',
            'PUBLICFILES_BASEURL',
            'TEACHERRESOURCE_FILENAME',
            'TEACHERPDF_FILENAME',
            'TEACHERPDF_REQUIRED',
            'ISSCHOOLLEADER',
            'ISMAINTEACHER'
        ],
        sendTeacherReadingTopicEnd: [
            'SCHOOL',
            'CLASSTOPICID',
            'TOPICNAME',
            'PARENTTOPICNAME',
            'TOPICMESSAGE',
            'TEACHERALIAS',
            'CLASS',
            'TEACHERMESSAGE',
            'RELEASEDATE',
            'ISRELEASED',
            'DUEDATE',
            'TARGET',
            'CLASSID'
        ],
        sendRegistrationMail: ['BASEURL', 'USERSTATUS', 'FIRSTNAME', 'LASTNAME', 'TEACHERALIAS', 'CLASS', 'SCHOOL', 'REGISTEREDLIST'],
        sendMailForTopicReminderAfter7Days: [
            'PUPILID',
            'MAGICID',
            'PUPILTOPICID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'SCHOOL',
            'TOPICNAME',
            'CLASS',
            'CLASSID',
            'CLASSTOPICID',
            'TEACHERALIAS',
            'RELEASEDATE',
            'DUEDATE'
        ],
        readingTopicReminderAfter5Days: [
            'PUPILID',
            'MAGICID',
            'PUPILTOPICID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'SCHOOL',
            'TOPICNAME',
            'CLASS',
            'CLASSID',
            'CLASSTOPICID',
            'TEACHERALIAS',
            'RELEASEDATE',
            'DUEDATE'
        ],
        readingTopicReminderAfter7Days: [
            'BASEURL',
            'USERSTATUS',
            'FIRSTNAME',
            'LASTNAME',
            'PUPILID',
            'PUPILTOPICID',
            'CLASSID',
            'CLASSTOPICID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'SCHOOL',
            'TOPICNAME',
            'TOPICSUBJECT',
            'TOPICMESSAGE',
            'CLASS',
            'TEACHERALIAS',
            'TEACHERMESSAGE',
            'RELEASEDATE',
            'DUEDATE',
            'READABLEDATE',
            'PENDINGTOPICS'
        ],
        readingTopicReminderAfter2Days: [
            'PUPILID',
            'MAGICID',
            'PUPILTOPICID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'SCHOOL',
            'TOPICNAME',
            'CLASS',
            'CLASSID',
            'CLASSTOPICID',
            'TEACHERALIAS',
            'RELEASEDATE',
            'DUEDATE'
        ],
        sendQuestionToUser: ['BASEURL', 'USERSTATUS', 'FIRSTNAME', 'LASTNAME', 'USERQUESTION'],
        sendQuestionToLwpStaff: [
            'BASEURL',
            'USERSTATUS',
            'FIRSTNAME',
            'LASTNAME',
            'USERTYPE',
            'USERQUESTION',
            'SCHOOL',
            'USERFIRSTNAME',
            'USERLASTNAME',
            'USEREMAIL'
        ],
        schoolLeaderInvitationEmail: [
            'BASEURL',
            'USERSTATUS',
            'FIRSTNAME',
            'LASTNAME',
            'RESETPASSTOKEN',
            'INVITEDBY',
            'CODE',
            'SCHOOL',
            'MAGICID',
            'REJECT_MAGICID',
            'TOTALLICENSES',
            'FULLPROGRAMMELICENSES'
        ],
        schoolLeaderWelcomeEmail: [
            'BASEURL',
            'USERSTATUS',
            'FIRSTNAME',
            'LASTNAME',
            'SCHOOL',
            'SPM',
            'SPMEMAIL',
            'ACADEMICYEAR',
            'WONDECOMPLETED',
            'FULLPROGRAMME',
            'READINGLOG',
            'READINGLOGONLY',
            'READYTEDDY',
            'SCHOOLTAGS'
        ],
        adminInvitationEmail: [
            'BASEURL',
            'USERSTATUS',
            'FIRSTNAME',
            'LASTNAME',
            'INVITEDBY',
            'CODE',
            'RESETPASSTOKEN',
            'MAGICID',
            'REJECT_MAGICID'
        ],
        teacherInvitationEmail: [
            'BASEURL',
            'USERSTATUS',
            'FIRSTNAME',
            'LASTNAME',
            'INVITEDBY',
            'CODE',
            'SCHOOL',
            'MAGICID',
            'REJECT_MAGICID',
            'READINGLOGCLASSES',
            'FULLPROGRAMMECLASSES'
        ],
        parentInvitationEmail: [
            'BASEURL',
            'USERSTATUS',
            'FIRSTNAME',
            'LASTNAME',
            'CODE',
            'MAGICID',
            'REJECT_MAGICID',
            'CHILDFIRSTNAME',
            'SCHOOL',
            'PARENTSTATUS',
            'PUPILPARENTSTATUS',
            'PUPILSTATUS',
            'PUPILPARENTINVITATIONAT',
            'PARENTINVITATIONAT'
        ],
        userRequestedSignUpLink: [
            'BASEURL',
            'USERSTATUS',
            'USERTYPE',
            'FIRSTNAME',
            'LASTNAME',
            'RESETPASSTOKEN',
            'CODE',
            'MAGICID',
            'REJECT_MAGICID'
        ],
        sendResetPasswordEmail: ['BASEURL', 'FIRSTNAME', 'LASTNAME', 'RESETPASSTOKEN', 'CODE', 'HASPASSWORD'],
        sendTeacherAssignedToClass: [
            'BASEURL',
            'USERSTATUS',
            'FIRSTNAME',
            'LASTNAME',
            'CLASS',
            'SCHOOL',
            'TEACHERALIAS',
            'CLASSID',
            'ISFULLPROGRAMMECLASS'
        ],
        sendParentNotificationOfTeacherReadingComment: [
            'PUPILID',
            'CLASSTOPICID',
            'PUPILTOPICID',
            'PUPILFEEDBACKID',
            'CLASSID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'SCHOOL',
            'CLASS',
            'TEACHERALIAS',
            'RELEASEDATE',
            'READINGENTRYDATE',
            'COMMENT',
            'MAGICID'
        ],
        sendParentNotificationOfTeacherFeedbackReply: [
            'FIRSTNAME',
            'LASTNAME',
            'BASEURL',
            'USERSTATUS',
            'REPLY',
            'PUPILID',
            'PUPILFEEDBACKID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'FIRSTNAME',
            'LASTNAME',
            'TEACHERALIAS',
            'ISREADING',
            'TOPICNAME',
            'ACTIVITYNAME'
        ],
        sendTeacherReadingTopicHolidayOverlap: [
            'SCHOOL',
            'CLASS',
            'TEACHERALIAS',
            'CLASSTOPICID',
            'RELEASEDATE',
            'CLASSID',
            'HOLIDAYNAME',
            'HOLIDAYSTARTDATE',
            'HOLIDAYENDDATE',
            'BASEURL',
            'TEACHERALIAS'
        ],
        invoiceOfSchoolClassLicenceToAdmin: [
            'FIRSTNAME',
            'LASTNAME',
            'EMAIL',
            'ADDITIONALFULLPROGRAMMECLASSCOUNT',
            'ADDITIONALREADINGONLYCLASSCOUNT',
            'ADDITIONALUPGRADECLASSCOUNT',
            'ADDITIONALFULLPROGRAMMECLASSPRICE',
            'ADDITIONALREADINGONLYCLASSPRICE',
            'ADDITIONALUPGRADECLASSPRICE',
            'ADDITIONALREADYTEDDYCLASSCOUNT',
            'ADDITIONALREADYTEDDYCLASSPRICE',
            'TOTALPRICE',
            'SCHOOLID',
            'SCHOOLNAME',
            'USEREMAIL',
            'USERID',
            'USERFIRSTNAME',
            'USERLASTNAME',
            'USERALIAS',
            'ADDITIONALEMAILS'
        ],
        invoiceOfSchoolClassLicenceToSchool: [
            'FIRSTNAME',
            'LASTNAME',
            'EMAIL',
            'ADDITIONALFULLPROGRAMMECLASSCOUNT',
            'ADDITIONALREADINGONLYCLASSCOUNT',
            'ADDITIONALUPGRADECLASSCOUNT',
            'ADDITIONALFULLPROGRAMMECLASSPRICE',
            'ADDITIONALREADINGONLYCLASSPRICE',
            'ADDITIONALUPGRADECLASSPRICE',
            'ADDITIONALREADYTEDDYCLASSCOUNT',
            'ADDITIONALREADYTEDDYCLASSPRICE',
            'TOTALPRICE',
            'SCHOOLID',
            'SCHOOLNAME',
            'USEREMAIL',
            'USERID',
            'USERFIRSTNAME',
            'USERLASTNAME',
            'USERALIAS'
        ],
        sendLwpTeamMoneySkillsActivationEmail: [
            'SCHOOLID',
            'SCHOOLNAME',
            'TEACHERALIAS',
            'EMAIL',
            'ENABLED_AT',
            'BASEURL',
            'FIRSTNAME',
            'LASTNAME'
        ]
    };

    constructor(
        @InjectRepository(LwpNotification)
        private lwpNotificationRepository: Repository<LwpNotification>,
        @InjectRepository(LwpNotificationEventHistory)
        private lwpNotificationEventHistoryRepository: Repository<LwpNotificationEventHistory>,
        @InjectRepository(StaticLwpEmailTemplate)
        private emailTemplateRepository: Repository<StaticLwpEmailTemplate>,
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        @InjectRepository(LwpPupilParent)
        private pupilParentRepository: Repository<LwpPupilParent>,
        private readonly configService: ConfigService,
        @Inject('EmailService')
        private readonly emailService: EmailService,
        @Inject('SMSService')
        private readonly smsService: SMSService,
        private readonly helperService: HelperService,
        private readonly parameterService: ParameterService
    ) {}

    onModuleInit(): void {
        Logger.verbose('Initialising notification service module...');
        this.getAllTemplates();
        Logger.verbose('Initialised notification service module');
    }

    private createVerifiedLinkForEmail(user: LwpUser, link: string, hasQueryParam = false): string {
        if (user && !user?.isEmailVerified && user?.emailVerificationCode) {
            return !hasQueryParam
                ? `${this.configService.get('server.hostedUrl')}${link}?v=${user?.emailVerificationCode}`
                : `${this.configService.get('server.hostedUrl')}${link}&v=${user?.emailVerificationCode}`;
        }

        return `${this.configService.get('server.hostedUrl')}${link}`;
    }

    private getAllTemplates: () => void = async (): Promise<void> => {
        await this.getEmailTemplatesFromDatabase();
    };

    public getCompiledTemplateAndParameters(input: CompiledTemplateAndParametersInput): CompiledTemplateAndParametersOutput {
        const output: CompiledTemplateAndParametersOutput = {};

        if (input?.emailOption) {
            if (input?.emailOption === UseEmailOption.LAYOUT) {
                output.templateForEmail = Handlebars.compile(input?.defaultEmailTemplate ?? '');
                output.layoutParameterData = {
                    HEADING: Handlebars.compile(input?.heading ?? ''),
                    BODY: Handlebars.compile(input?.bodyText ?? ''),
                    BUTTONTEXT: Handlebars.compile(input?.linkText ?? ''),
                    LINK: Handlebars.compile(input?.link ?? ''),
                    PREVIEWLINE: Handlebars.compile(input?.previewLine ?? '')
                };
            } else {
                output.templateForEmail = Handlebars.compile(input?.wholeEmailContent ?? '');
            }

            output.emailParams = this.getEmailTemplateParameters(
                input?.emailOption,
                input?.emailOption === UseEmailOption.LAYOUT ? input?.defaultEmailTemplate : input?.wholeEmailContent,
                input?.subject ?? '',
                input?.senderName ?? '',
                input?.emailOption === UseEmailOption.LAYOUT ? input?.bodyText : '',
                input?.emailOption === UseEmailOption.LAYOUT ? input?.previewLine : '',
                input?.emailOption === UseEmailOption.LAYOUT ? input?.heading : ''
            );
        }

        if (input?.smsContent) {
            output.templateForSMS = Handlebars.compile(input?.smsContent);
            output.smsParams = this.getEmailTemplateParameters('', input?.smsContent);
        }

        if (input?.subject) output.templateForSubject = Handlebars.compile(input?.subject);
        if (input?.senderName) output.templateForSenderName = Handlebars.compile(input?.senderName);
        if (input?.bodyText) output.templateForBodyText = Handlebars.compile(input?.bodyText);
        if (input?.heading) output.templateForHeading = Handlebars.compile(input?.heading);
        if (input?.previewLine) output.templateForPreviewLine = Handlebars.compile(input?.previewLine);

        return output;
    }

    public getTemplateParametersData(
        templateParameters: Record<string, any>,
        layoutParameterData: LayoutParameterDataType
    ): Record<string, any> {
        const parameters = Object.assign({}, templateParameters, {
            BUTTONTEXT: layoutParameterData?.BUTTONTEXT,
            LINK: layoutParameterData?.LINK,
            SHORTBASEURL: process?.env?.SHORTBASEURL ? process.env.SHORTBASEURL : this.configService.get('server.hostedUrl'),
            BASEURL: this.configService.get('server.hostedUrl'),
            FILESURL: this.helperService.getMinioPublicBaseUrl()
        });

        const optionalParameters = {};

        if (layoutParameterData?.BODY) optionalParameters['BODY'] = layoutParameterData?.BODY(parameters);
        if (layoutParameterData?.HEADING) optionalParameters['HEADING'] = layoutParameterData?.HEADING(parameters);
        if (layoutParameterData?.BUTTONTEXT) optionalParameters['BUTTONTEXT'] = layoutParameterData?.BUTTONTEXT(parameters);
        if (layoutParameterData?.LINK) optionalParameters['LINK'] = layoutParameterData?.LINK(parameters);
        if (layoutParameterData?.PREVIEWLINE) optionalParameters['PREVIEWLINE'] = layoutParameterData?.PREVIEWLINE(parameters);

        return Object.assign({}, parameters, optionalParameters);
    }

    private updateNotificationTemplate(emailTemplate: StaticLwpEmailTemplate, defaultEmailTemplate: string): void {
        const { templateForEmail, templateForSubject, templateForSenderName, templateForSMS, emailParams, smsParams, layoutParameterData } =
            this.getCompiledTemplateAndParameters({
                emailOption: emailTemplate?.emailOption,
                wholeEmailContent: emailTemplate?.wholeEmailContent,
                defaultEmailTemplate,
                heading: emailTemplate?.heading,
                bodyText: emailTemplate?.bodyText,
                linkText: emailTemplate?.linkText,
                link: emailTemplate?.link,
                previewLine: emailTemplate?.previewLine,
                smsContent: emailTemplate?.smsContent,
                subject: emailTemplate?.subject,
                senderName: emailTemplate?.senderName
            });

        LwpNotificationService.allEmailTemplates[emailTemplate?.type] = {
            templateForEmail,
            templateForSubject,
            templateForSenderName,
            templateForSMS,
            emailParams,
            smsParams,
            senderEmail: emailTemplate?.senderEmail,
            lastUpdatedAt: emailTemplate?.logUpdatedAt,
            layoutParameterData,
            templateId: emailTemplate?.id,
            sendEmail: emailTemplate?.sendEmail,
            sendSms: emailTemplate?.sendSms
        };
    }

    private async getEmailTemplatesFromDatabase(): Promise<void> {
        const emailTemplates = await this.emailTemplateRepository.find({ where: { status: EmailTemplateStatus.CURRENT } });
        const defaultEmailTemplate = await this.parameterService.getParameterByKey('DEFAULT_EMAIL_TEMPLATE_LAYOUT');

        for (const emailTemplate of emailTemplates) {
            this.updateNotificationTemplate(emailTemplate, defaultEmailTemplate?.value);
        }
    }

    public getEmailTemplateParameters(emailOption: string, ...props: string[]): string[] {
        const emailTemplateParameters: string[] = [];

        if (props?.length > 0) {
            for (let i = 0; i < props.length; i++) {
                const prop = props[i];

                if (prop?.trim()) {
                    const parseTemplate: any = Handlebars.parse(prop);

                    // Bypass the layout parameter data for block statements when emailOption is layout
                    const includeBlockStatements = emailOption !== UseEmailOption.LAYOUT || i > 0;

                    this.collectStatementParameters(parseTemplate?.body, emailTemplateParameters, includeBlockStatements);
                }
            }
        }

        return emailTemplateParameters?.length > 0 ? Array.from(new Set(emailTemplateParameters)) : [];
    }

    private collectStatementParameters(statements: any[], parameters: string[], includeBlockStatements: boolean): void {
        if (!Array.isArray(statements)) return;

        for (const statement of statements) {
            if (statement?.type === 'MustacheStatement') {
                this.collectExpressionParameters(statement, parameters);
            }

            if (statement?.type === 'BlockStatement' && includeBlockStatements) {
                this.collectExpressionParameters(statement, parameters);
                this.collectStatementParameters(statement.program?.body, parameters, includeBlockStatements);
                this.collectStatementParameters(statement.inverse?.body, parameters, includeBlockStatements);
            }
        }
    }

    /**
     * Collect the parameters a mustache or block expression refers to, including ones nested inside
     * helper arguments — e.g. {{#if (hasTag SCHOOLTAGS "term1-emails")}} refers to SCHOOLTAGS.
     * Paths in helper position (`hasTag`, `if`, `friendlyDate`) are helper names, not parameters.
     */
    private collectExpressionParameters(expression: any, parameters: string[]): void {
        const params: any[] = Array.isArray(expression?.params) ? expression.params : [];
        const hashPairs: any[] = Array.isArray(expression?.hash?.pairs) ? expression.hash.pairs : [];
        const isHelperCall = params.length > 0 || hashPairs.length > 0;

        if (!isHelperCall && expression?.path?.type === 'PathExpression') {
            parameters.push(expression.path.original?.trim() ?? '');
        }

        for (const value of [...params, ...hashPairs.map((pair) => pair?.value)]) {
            if (value?.type === 'PathExpression') {
                parameters.push(value.original?.trim() ?? '');
            } else if (value?.type === 'SubExpression') {
                this.collectExpressionParameters(value, parameters);
            }
        }
    }

    private async getTemplateByType(type: EmailTemplateTypes, manager?: EntityManager): Promise<StaticLwpEmailTemplate> {
        const emailTemplateRepository: Repository<StaticLwpEmailTemplate> = manager
            ? manager.getRepository(StaticLwpEmailTemplate)
            : this.emailTemplateRepository;

        const template = await emailTemplateRepository.findOne({
            where: { type, status: EmailTemplateStatus.CURRENT },
            relations: ['lwpNotification']
        });

        return template ? template : null;
    }

    private async updateTemplateCache(emailTemplate: StaticLwpEmailTemplate, manager?: EntityManager): Promise<void> {
        if (!emailTemplate) return;

        const defaultEmailTemplate = await this.parameterService.getParameterByKey('DEFAULT_EMAIL_TEMPLATE_LAYOUT', manager);

        this.updateNotificationTemplate(emailTemplate, defaultEmailTemplate?.value);
    }

    private async getEmailTemplate(type: EmailTemplateTypes, manager?: EntityManager): Promise<any> {
        const emailTemplate = await this.getTemplateByType(type, manager);

        if (
            !LwpNotificationService.allEmailTemplates?.[emailTemplate?.type] ||
            emailTemplate?.logUpdatedAt?.toString() !==
                LwpNotificationService.allEmailTemplates?.[emailTemplate?.type]?.lastUpdatedAt?.toString()
        ) {
            await this.updateTemplateCache(emailTemplate, manager);
        }

        return LwpNotificationService.allEmailTemplates?.[emailTemplate?.type] ?? null;
    }

    private async getEmailData(type: EmailTemplateTypes, params: any, manager?: EntityManager): Promise<EmailTemplateOutput> {
        const emailTemplate = await this.getEmailTemplate(type, manager);

        if (!emailTemplate)
            throw new HttpException(`Template of type ${type} not found. Please add template first.`, ErrorStatusCodeEnum._535);

        const emailTemplateData = new EmailTemplateOutput();

        const parameters = this.getTemplateParametersData(params, emailTemplate?.layoutParameterData);

        emailTemplateData.htmlContent = emailTemplate?.templateForEmail(parameters);
        emailTemplateData.subject = emailTemplate?.templateForSubject(parameters);
        emailTemplateData.senderName = emailTemplate?.templateForSenderName(parameters);
        // Lets a send override the From address per recipient - the school leader welcome email supplies
        // the School Partnership Manager's. Falls back to the template's own sender when absent.
        emailTemplateData.senderEmail = params?.SPMEMAIL ?? emailTemplate?.senderEmail;
        emailTemplateData.emailParams = emailTemplate?.emailParams;
        emailTemplateData.templateId = emailTemplate?.templateId;
        emailTemplateData.sendEmail = emailTemplate?.sendEmail;

        return emailTemplateData;
    }

    private async getSMSData(type: EmailTemplateTypes, params: any, manager?: EntityManager): Promise<SMSDataOutput> {
        const emailTemplate = await this.getEmailTemplate(type, manager);

        if (!emailTemplate)
            throw new HttpException(`Template of type ${type} not found. Please add template first.`, ErrorStatusCodeEnum._535);

        const smsData = new SMSDataOutput();

        smsData.content = emailTemplate?.templateForSMS(params);
        smsData.smsParams = emailTemplate?.smsParams;
        smsData.sender = this.staffPhoneNumber;
        smsData.templateId = emailTemplate?.templateId;
        smsData.sendSms = emailTemplate?.sendSms;

        return smsData;
    }

    private async updateNotificationStatus(
        notificationId: string,
        mailParams: any,
        type: EmailTemplateTypes,
        error?: any,
        templateId?: string,
        apiId?: string,
        manager?: EntityManager
    ): Promise<void> {
        const badParams = mailParams.filter(
            (mailParam) =>
                LwpNotificationService.notificationEmailParameters[type]?.indexOf(mailParam?.trim()) === -1 &&
                // global parameter adding.
                ![
                    'BASEURL',
                    'FIRSTNAME',
                    'LASTNAME',
                    'USERSTATUS',
                    'HEADING',
                    'BODY',
                    'BUTTONTEXT',
                    'PREVIEWLINE',
                    'SHORTBASEURL',
                    'FILESURL'
                ].includes(mailParam)
        );
        const emailTemplateRepository: Repository<StaticLwpEmailTemplate> = manager
            ? manager.getRepository(StaticLwpEmailTemplate)
            : this.emailTemplateRepository;
        const lwpNotificationRepository: Repository<LwpNotification> = manager
            ? manager.getRepository(LwpNotification)
            : this.lwpNotificationRepository;
        const lwpNotificationEventHistoryRepository: Repository<LwpNotificationEventHistory> = manager
            ? manager.getRepository(LwpNotificationEventHistory)
            : this.lwpNotificationEventHistoryRepository;

        if (templateId) {
            await emailTemplateRepository.update(
                { id: templateId },
                {
                    lwpNotification: { id: notificationId },
                    logUpdatedAt() {
                        return '"logUpdatedAt"';
                    }
                }
            );
        }

        const notification = await lwpNotificationRepository.findOne({
            where: { id: notificationId },
            select: ['id', 'logCreatedBy']
        });

        const notificationEvent = new LwpNotificationEventHistory();

        notificationEvent.notification = notification;

        if (error) {
            notificationEvent.status = LwpNotificationStatus.FAILED;
            notificationEvent.error = JSON.stringify(error);
        } else {
            notificationEvent.status = LwpNotificationStatus.SENT;
        }

        await lwpNotificationEventHistoryRepository.save(notificationEvent);

        await lwpNotificationRepository.update(
            { id: notificationId },
            {
                badParams,
                apiId
            }
        );
    }

    private async updateInvitationSentOfParentPupil(userId: string, pupilId: string, manager?: EntityManager): Promise<void> {
        const pupilParentRepository: Repository<LwpPupilParent> = manager
            ? manager.getRepository(LwpPupilParent)
            : this.pupilParentRepository;
        const userRepository: Repository<LwpUser> = manager ? manager.getRepository(LwpUser) : this.userRepository;

        const pupilParent = await pupilParentRepository.findOne({
            where: { parentId: userId, pupilId: pupilId },
            relations: ['parent']
        });

        if (pupilParent?.id) {
            if (pupilParent?.status === PupilParentStatus.INVITED)
                await pupilParentRepository.update({ id: pupilParent?.id }, { lastInvitationEmailSent: new Date() });
            if (pupilParent?.parent?.userStatus === UserStatus.INVITED)
                await userRepository.update({ id: pupilParent?.parent?.id }, { lastInvitationEmailSent: new Date() });
        }
    }

    public async onPhoneNumberEmail(
        data: Mail,
        type: EmailTemplateTypes,
        recipient?: string,
        notificationId?: string,
        context?: SendNotificationContext,
        preference?: string,
        paramsData?: { [key: string]: any },
        isBulkProcess = false,
        manager?: EntityManager
    ): Promise<void> {
        let mailParams = [];

        // Add BASEURL and other contents to all emails.
        // n.b. please DO NOT move this to other places in the app without considering the implications for cron-sent emails!
        // they don't get included within the sendNotification methods etcetera (as they are done in pure SQL).
        paramsData['SHORTBASEURL'] = process?.env?.SHORTBASEURL ? process.env.SHORTBASEURL : this.configService.get('server.hostedUrl');
        paramsData['BASEURL'] = this.configService.get('server.hostedUrl');
        paramsData['FILESURL'] = this.helperService.getMinioPublicBaseUrl();

        try {
            if (preference === 'email') {
                const emailTemplate = await this.getEmailData(type, paramsData, manager);

                if (!emailTemplate?.sendEmail) return;

                mailParams = emailTemplate?.emailParams;
                const apiId = await this.emailService.sendMail({
                    to: recipient,
                    toName: data?.toName,
                    html: emailTemplate?.htmlContent,
                    sender: { email: emailTemplate?.senderEmail, name: emailTemplate?.senderName },
                    replyTo: {
                        email: data?.replyTo?.email ?? 'hello@learningwithparents.com',
                        name: data?.replyTo?.name ?? 'Learning With Parents'
                    },
                    subject: emailTemplate?.subject
                });

                await this.updateNotificationStatus(notificationId, mailParams, type, null, emailTemplate?.templateId, apiId, manager);
                if (type === EmailTemplateTypes.sendPupilTopics || type === EmailTemplateTypes.sendPupilReadingTopicReleased) {
                    if (context?.pupilId && context?.userId) {
                        await this.updateInvitationSentOfParentPupil(context?.userId, context?.pupilId, manager);
                    }
                }
            } else {
                const smsData = await this.getSMSData(type, paramsData, manager);

                mailParams = smsData?.smsParams;

                if (smsData?.content && smsData?.sendSms) {
                    let apiId: string | undefined;
                    let err: InvalidSmsRecipientError | undefined;

                    try {
                        apiId = await this.smsService.sendSMS({
                            sender: smsData?.sender,
                            recipient,
                            content: smsData?.content
                        });
                    } catch (e) {
                        if (e instanceof InvalidSmsRecipientError) {
                            // eslint-disable-next-line no-self-assign
                            err = err;
                        } else {
                            throw e;
                        }
                    }

                    await this.updateNotificationStatus(notificationId, mailParams, type, err, smsData?.templateId, apiId, manager);
                    if (!err) {
                        if (type === EmailTemplateTypes.sendPupilTopics || type === EmailTemplateTypes.sendPupilReadingTopicReleased) {
                            if (context?.pupilId && context?.userId) {
                                await this.updateInvitationSentOfParentPupil(context?.userId, context?.pupilId, manager);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            await this.updateNotificationStatus(notificationId, mailParams, type, error, null, null, manager);

            if (!isBulkProcess) {
                throw new HttpException(
                    'email' === preference ? `Error in sending email to <<${recipient}>>` : `Error in sending SMS to <<${recipient}>>`,
                    ErrorStatusCodeEnum.FAILED_EMAIL_OR_SMS
                );
            }
        }
    }

    public async sendTestEmail(input: TestEmailInput): Promise<void> {
        const defaultEmailTemplate = (await this.parameterService.getParameterByKey('DEFAULT_EMAIL_TEMPLATE_LAYOUT'))?.value ?? '';

        const { emailParams, smsParams, templateForSMS, templateForSubject, templateForSenderName, templateForEmail, layoutParameterData } =
            this.getCompiledTemplateAndParameters({
                senderName: input?.senderName,
                subject: input?.subject,
                emailOption: input?.emailOption,
                wholeEmailContent: input?.wholeEmailContent,
                defaultEmailTemplate,
                heading: input?.heading,
                bodyText: input?.bodyText,
                linkText: input?.linkText,
                link: input?.link,
                previewLine: input?.previewLine,
                smsContent: input?.smsContent
            });

        let testMailParams = [];

        if (input?.sentTo?.includes('@')) {
            testMailParams = emailParams;
        } else {
            testMailParams = smsParams;
        }

        const unknownParams = testMailParams.filter((mailParams) => {
            return (
                LwpNotificationService.notificationEmailParameters[input?.type]?.indexOf(mailParams?.trim()) === -1 &&
                // global parameter adding.
                ![
                    'BASEURL',
                    'FIRSTNAME',
                    'LASTNAME',
                    'USERSTATUS',
                    'HEADING',
                    'BODY',
                    'BUTTONTEXT',
                    'PREVIEWLINE',
                    'SHORTBASEURL',
                    'FILESURL'
                ].includes(mailParams)
            );
        });

        if (unknownParams?.length > 0) {
            const response =
                unknownParams?.length === 1
                    ? `${unknownParams?.join(', ')} IS NOT A VALID PARAMETER.`
                    : `${unknownParams?.join(', ')} ARE NOT VALID PARAMETERS.`;

            throw new HttpException(response, ErrorStatusCodeEnum._540);
        }

        let templateParameters = {};

        if (input?.sentTo?.includes('@')) {
            if (input?.emailOption === UseEmailOption.LAYOUT) {
                const parameters = this.getTemplateParametersData(templateParameters, layoutParameterData);

                templateForEmail(parameters);
            } else if (input?.emailOption === UseEmailOption.HTML) {
                templateForEmail(templateParameters);
            }

            emailParams.forEach((element) => {
                templateParameters[element] = this.helperService.capitalizeFirstLetter(element);
            });

            templateParameters = {
                ...templateParameters,
                BASEURL: this.configService.get('server.hostedUrl'),
                FILESURL: this.helperService.getMinioPublicBaseUrl()
            };

            const parameters = this.getTemplateParametersData(templateParameters, layoutParameterData);

            const senderName = templateForSenderName(parameters);

            await this.emailService.sendMail({
                to: input?.sentTo,
                toName: 'Receiver',
                html: templateForEmail(parameters),
                sender: { email: input?.senderEmail, name: senderName },
                replyTo: {
                    email: input?.senderEmail ?? 'hello@learningwithparents.com',
                    name: senderName ?? 'Learning With Parents'
                },
                subject: templateForSubject(parameters)
            });
        } else {
            const smsLayoutParameterData = {};

            smsParams.forEach((element) => {
                smsLayoutParameterData[element] = this.helperService.capitalizeFirstLetter(element);
            });

            const parameters = this.getTemplateParametersData(smsLayoutParameterData, layoutParameterData);

            await this.smsService.sendSMS({
                sender: this.staffPhoneNumber,
                recipient: input?.sentTo,
                content: templateForSMS(parameters)
            });
        }
    }

    /**
     * Validates email templates within notifications.
     * For each notification, if `emailTemplateType` does not exist in `EmailTemplateTypes`,
     * it is set to the deprecated template type.
     */
    private validateEmailTemplatesInNotifications(notifications: LwpNotification[]): LwpNotification[] {
        // Retrieve valid email template keys
        const emailTemplateKeys = Object.keys(EmailTemplateTypes).filter(
            (key) => typeof EmailTemplateTypes[key as keyof typeof EmailTemplateTypes] === 'string'
        );

        // Map through notifications to validate `emailTemplateType`
        return notifications.map((lwpNotification) => {
            // If `emailTemplateType` is not valid, set it to the deprecated template type
            if (!emailTemplateKeys.includes(lwpNotification?.emailTemplateType)) {
                lwpNotification.emailTemplateType = EmailTemplateTypes.deprecatedTemplate;
            }

            return lwpNotification;
        });
    }

    async getNotificationHistory(recipient: string, limit = 10, offset = 0): Promise<Pagination<LwpNotification>> {
        const [lwpNotifications, total] = await this.lwpNotificationRepository
            .createQueryBuilder('notificaion')
            .where('notificaion.recipient = :recipient', { recipient })
            .orderBy('notificaion.logCreatedAt', 'DESC')
            .skip(offset)
            .take(limit)
            .getManyAndCount();

        return new Pagination<LwpNotification>({
            results: this.validateEmailTemplatesInNotifications(lwpNotifications),
            total,
            limit,
            offset
        });
    }

    async getNotification(id: string): Promise<LwpNotification> {
        const lwpNotification = await this.lwpNotificationRepository.findOne({ where: { id } });

        if (!lwpNotification) {
            throw new HttpException(`Notification not found.`, ErrorStatusCodeEnum._535);
        }

        return lwpNotification;
    }

    getStatusCondition(status: LwpNotificationStatus[]): string {
        const statusConditions = status
            .map((st) => {
                if (st === LwpNotificationStatus.OPENED) return "ln.status = 'OPENED'";
                if (st === LwpNotificationStatus.SENT) return "ln.status = 'SENT'";
                if (st === LwpNotificationStatus.CLICKED) return "ln.status = 'CLICKED'";
                if (st === LwpNotificationStatus.DELIVERED) return "ln.status = 'DELIVERED'";
                if (st === LwpNotificationStatus.FAILED) return "ln.status = 'FAILED'";
                if (st === LwpNotificationStatus.REJECTED) return "ln.status = 'REJECTED'";
                if (st === LwpNotificationStatus.WAITING) return "ln.status = 'WAITING'";
            })
            .join(' OR ');

        return statusConditions;
    }

    generateSearchSubquery(search: string): Brackets {
        return new Brackets((qb) => {
            qb.where(
                `CONCAT(
                'to:', ln.recipient, 
                ';;; type:', ln.notificationType,
                ';;; ', 
                (
                    SELECT STRING_AGG(CONCAT(key, ':', value), ';;; ')
                    FROM JSONB_EACH_TEXT(ln.params) AS param(key, value)
                ),
                ';;; emailTemplateType:', ln.emailTemplateType,
                ';;; status:', ln.status,
                ';;;'
            ) ILIKE :search`,
                { search: `%${search}%` }
            );
        });
    }

    private createNotificationSearchQueryBuilder(input: MessageLogFilterInput): SelectQueryBuilder<LwpNotification> {
        const queryBuilder = this.lwpNotificationRepository.createQueryBuilder('ln');

        if (input?.recipient && input?.recipient?.length) {
            queryBuilder.andWhere('ln.recipient IN (:...recipients)', { recipients: input.recipient });
        }

        if (input?.emailType) {
            queryBuilder.andWhere('ln.emailTemplateType = :emailTemplate', { emailTemplate: input.emailType });
        }

        if (input?.messageType && input?.messageType !== MessageType.BOTH) {
            queryBuilder.andWhere('ln.notificationType = :notificationType', { notificationType: input.messageType });
        }

        if (input?.statuses && input?.statuses?.length) {
            queryBuilder.andWhere(`(${this.getStatusCondition(input.statuses)})`);
        }

        if (input?.from) {
            const from = moment(input.from).startOf('day').format('YYYY-MM-DD HH:mm:ss');

            queryBuilder.andWhere('ln.logCreatedAt > :from', { from });
        }

        if (input?.until) {
            const until = moment(input.until).endOf('day').format('YYYY-MM-DD HH:mm:ss');

            queryBuilder.andWhere('ln.logCreatedAt < :until', { until });
        }

        const search = input?.search?.trim();

        if (search) {
            queryBuilder.andWhere(this.generateSearchSubquery(search));
        }

        return queryBuilder;
    }

    async getAllNotificationHistory(limit = 10, offset = 0, input: MessageLogFilterInput): Promise<Pagination<LwpNotification>> {
        const queryBuilder = this.createNotificationSearchQueryBuilder(input);

        const [lwpNotifications, total] = await queryBuilder.orderBy('ln.logCreatedAt', 'DESC').skip(offset).take(limit).getManyAndCount();

        return new Pagination<LwpNotification>({
            results: this.validateEmailTemplatesInNotifications(lwpNotifications),
            total,
            limit,
            offset
        });
    }

    async getMessageLogsCount(input: MessageLogFilterInput): Promise<MessageLogsCountOutput> {
        const queryBuilder = this.createNotificationSearchQueryBuilder(input);

        const results = await queryBuilder
            .select([
                "COALESCE(SUM(1) FILTER (WHERE ln.status = 'CLICKED'), 0) AS clickedCount",
                "COALESCE(SUM(1) FILTER (WHERE ln.status = 'OPENED'), 0) AS openedCount",
                "COALESCE(SUM(1) FILTER (WHERE ln.status = 'DELIVERED'), 0) AS deliveredCount",
                "COALESCE(SUM(1) FILTER (WHERE ln.status IN ('WAITING', 'QUEUED')), 0) AS waitingQueuedCount",
                "COALESCE(SUM(1) FILTER (WHERE ln.status IN ('FAILED', 'REJECTED')), 0) AS failedRejectedCount",
                "COALESCE(SUM(1) FILTER (WHERE ln.status = 'SENT'), 0) AS sentCount",
                "COALESCE(SUM(1) FILTER (WHERE ln.status != 'OPENED'), 0) AS totalMessage"
            ])
            .getRawOne();

        const counts: MessageLogsCountOutput = {
            clickedCount: +results?.clickedcount,
            openedCount: +results?.openedcount,
            deliveredCount: +results?.deliveredcount,
            waitingQueuedCount: +results?.waitingqueuedcount,
            failedRejectedCount: +results?.failedrejectedcount,
            sentCount: +results?.sentcount,
            totalMessage: +results?.totalmessage
        };

        return counts;
    }

    async getFailedNotificationHistory(limit = 100, offset = 0): Promise<Pagination<LwpNotification>> {
        const [lwpNotifications, total] = await this.lwpNotificationRepository
            .createQueryBuilder('notification')
            .where("notification.status = 'FAILED'")
            .orderBy('notification.logCreatedAt', 'DESC')
            .offset(offset)
            .limit(limit)
            .getManyAndCount();

        return new Pagination<LwpNotification>({
            results: this.validateEmailTemplatesInNotifications(lwpNotifications),
            total,
            limit,
            offset
        });
    }

    async getUserNotificationHistory(userId: string, limit = 100, offset = 0): Promise<Pagination<LwpNotification>> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        const condition: RecipientType = { primary: user?.email ? user?.email : user?.phoneNumber, secondary: user?.phoneNumber };

        const [lwpNotifications, total] = await this.lwpNotificationRepository
            .createQueryBuilder('notification')
            .where(
                new Brackets((qb) =>
                    qb
                        .where('notification.recipient = :primaryRecipient', { primaryRecipient: condition?.primary })
                        .orWhere('notification.recipient = :secondaryRecipient', { secondaryRecipient: condition?.secondary })
                )
            )
            .andWhere(`notification.status <> 'FAILED'`)
            .orderBy('notification.logCreatedAt', 'DESC')
            .offset(offset)
            .limit(limit)
            .getManyAndCount();

        return new Pagination<LwpNotification>({
            results: this.validateEmailTemplatesInNotifications(lwpNotifications),
            total,
            limit,
            offset
        });
    }

    async getNotificationParams(id: string): Promise<string> {
        const lwpNotification = await this.lwpNotificationRepository.findOne({ where: { id }, select: ['params'] });

        return lwpNotification?.params ? JSON.stringify(lwpNotification?.params) : null;
    }

    public async sendNotificationNow(notificationId: string, manager?: EntityManager): Promise<void> {
        const lwpNotificationRepository: Repository<LwpNotification> = manager
            ? manager.getRepository(LwpNotification)
            : this.lwpNotificationRepository;

        const savedNotification = await lwpNotificationRepository.findOneOrFail(notificationId);

        await this.onPhoneNumberEmail(
            savedNotification?.context?.mailData,
            savedNotification?.emailTemplateType,
            savedNotification?.recipient,
            savedNotification?.id,
            {
                pupilId: savedNotification?.context?.pupilId ? savedNotification?.context?.pupilId : null,
                userId: savedNotification?.userId ? savedNotification?.userId : null
            },
            savedNotification?.notificationType === NotificationType.SMS ? 'phone' : 'email',
            savedNotification?.params,
            savedNotification?.context?.isBulkProcess,
            manager
        );
    }

    public async saveNotification(
        user: LwpUser,
        data: Mail,
        type: EmailTemplateTypes,
        preference?: string,
        isBulkProcess = false,
        sendNow = false,
        manager?: EntityManager
    ): Promise<void> {
        const lwpNotificationRepository: Repository<LwpNotification> = manager
            ? manager.getRepository(LwpNotification)
            : this.lwpNotificationRepository;

        const params = data?.params;

        params['FIRSTNAME'] = user?.firstname;
        params['LASTNAME'] = user?.lastname;
        params['USERSTATUS'] = user?.userStatus;

        const queryParams = [preference, type, isBulkProcess, params, user.id];

        // `gen_notif_data` builds `context.mailData` itself and has no notion of a Reply-To, so a caller-supplied
        // one is merged into the row it generates. Only callers that set one take this path - everyone else runs
        // exactly the query they always have.
        const generated = data?.replyTo
            ? await lwpNotificationRepository.query(
                  `
        insert into lwp_notification overriding user value
        select
            (jsonb_populate_record (
                generated.notification,
                jsonb_build_object('context', jsonb_set((generated.notification).context, '{mailData,replyTo}', $6::jsonb))
            )).*
        from (
            select gen_notif_data (lu.*, $1, $2, $3, $4) as notification
            from lwp_user lu
            where lu.id = $5
        ) generated
        returning id;
        `,
                  [...queryParams, JSON.stringify(data.replyTo)]
              )
            : await lwpNotificationRepository.query(
                  `
        insert into lwp_notification overriding user value
        select
            (gen_notif_data (lu.*, $1, $2, $3, $4)).*
        from
            lwp_user lu
        where lu.id = $5
        returning id;
        `,
                  queryParams
              );

        if (sendNow && generated?.[0]?.id) {
            await this.sendNotificationNow(generated?.[0]?.id, manager);
        }
    }

    public async addNotification(data: Mail, type: EmailTemplateTypes, isBulkProcess = false, sendNow = false): Promise<void> {
        const template = await this.getTemplateByType(type);
        const lwpNotification = new LwpNotification();
        const paramsData = data?.params;

        lwpNotification.emailTemplateType = type;
        lwpNotification.context = {
            isBulkProcess,
            pupilId: null,
            mailData: data
        };
        lwpNotification.recipient = data?.to;
        lwpNotification.notificationType = NotificationType.EMAIL;
        lwpNotification.params = paramsData;
        lwpNotification.userId = null;
        lwpNotification.emailTemplate = template;

        const savedNotification = await this.lwpNotificationRepository.save(lwpNotification);

        if (sendNow) {
            await this.sendNotificationNow(savedNotification?.id);
        }
    }

    private getAllPendingNotificationsByType(type: NotificationType): SelectQueryBuilder<LwpNotification> {
        return this.lwpNotificationRepository
            .createQueryBuilder('ln')
            .where(`ln.status = 'WAITING'`)
            .andWhere('ln.notificationType = :type', { type });
    }

    public async sendAllPendingNotifications(): Promise<boolean> {
        const allPendingEmailsQuery = this.getAllPendingNotificationsByType(NotificationType.EMAIL);

        const allPendingSMSQuery = this.getAllPendingNotificationsByType(NotificationType.SMS);

        const generatePaginatorFor = (cursor?: Cursor): Paginator<LwpNotification> =>
            buildPaginator({
                entity: LwpNotification,
                alias: 'ln',
                query: {
                    limit: 1000,
                    afterCursor: cursor?.afterCursor
                }
            });

        let emailCursor: Cursor;
        let smsCursor: Cursor;
        let allPendingEmails: LwpNotification[];
        let allPendingSms: LwpNotification[];
        let firstRun = true;

        do {
            if (firstRun || emailCursor.afterCursor) {
                ({ data: allPendingEmails, cursor: emailCursor } = await generatePaginatorFor(emailCursor).paginate(allPendingEmailsQuery));

                for (const pendingEmail of allPendingEmails) {
                    try {
                        if (pendingEmail?.userType === UserType.PARENT) {
                            const canSend = await this.helperService.canSendNotification();

                            if (!canSend) continue;
                        }

                        if (pendingEmail?.userType === UserType.TEACHER) {
                            const canSend = await this.helperService.canSendTeacherNotification();

                            if (!canSend) continue;
                        }

                        await this.onPhoneNumberEmail(
                            pendingEmail?.context?.mailData,
                            pendingEmail?.emailTemplateType,
                            pendingEmail?.recipient,
                            pendingEmail?.id,
                            {
                                pupilId: pendingEmail?.context?.pupilId ? pendingEmail?.context?.pupilId : null,
                                userId: pendingEmail?.userId ? pendingEmail?.userId : null
                            },
                            'email',
                            pendingEmail?.params,
                            pendingEmail?.context?.isBulkProcess
                        );
                    } catch (error) {
                        newrelic.noticeError(error, { caught: true, handled: false });
                    }
                }
            }

            if (firstRun || smsCursor.afterCursor) {
                ({ data: allPendingSms, cursor: smsCursor } = await generatePaginatorFor(smsCursor).paginate(allPendingSMSQuery));

                for (const pendingSms of allPendingSms) {
                    try {
                        if (pendingSms?.userType === UserType.PARENT) {
                            const canSend = await this.helperService.canSendNotification();

                            if (!canSend) continue;
                        }

                        if (pendingSms?.userType === UserType.TEACHER) {
                            const canSend = await this.helperService.canSendTeacherNotification();

                            if (!canSend) continue;
                        }

                        await this.onPhoneNumberEmail(
                            pendingSms?.context?.mailData,
                            pendingSms?.emailTemplateType,
                            pendingSms?.recipient,
                            pendingSms?.id,
                            {
                                pupilId: pendingSms?.context?.pupilId ? pendingSms?.context?.pupilId : null,
                                userId: pendingSms?.userId ? pendingSms?.userId : null
                            },
                            'phone',
                            pendingSms?.params,
                            pendingSms?.context?.isBulkProcess
                        );
                    } catch (error) {
                        newrelic.noticeError(error, { caught: true, handled: false });
                    }
                }
            }

            firstRun = false;
        } while (emailCursor.afterCursor || smsCursor.afterCursor);

        return true;
    }

    async getNotificationPreview(notifId: string): Promise<LwpNotificationPreview> {
        const notif = await this.lwpNotificationRepository
            .createQueryBuilder('notif')
            .where('notif.id = :id', { id: notifId })
            .select(['notif.id', 'notif.emailTemplateType', 'notif.logCreatedAt', 'notif.params', 'notif.notificationType'])
            .getOne();

        if (!notif) throw new GraphQLError('No notification specified.');

        const template = await this.emailTemplateRepository
            .createQueryBuilder('th')
            .where({ logCreatedAt: LessThanOrEqual(notif?.logCreatedAt) })
            .andWhere('th.type = :type', { type: notif?.emailTemplateType })
            .andWhere('th.status IN (:...emailTemplateStatusArray)', {
                emailTemplateStatusArray: [EmailTemplateStatus.CURRENT, EmailTemplateStatus.HISTORIC]
            })
            .select([
                'th.emailOption',
                'th.bodyText',
                'th.wholeEmailContent',
                'th.heading',
                'th.linkText',
                'th.link',
                'th.defaultMessageLayout',
                'th.subject',
                'th.previewLine',
                'th.smsContent'
            ])
            .orderBy('th.logCreatedAt', 'DESC')
            .limit(1)
            .getOneOrFail();

        if (template?.emailOption === UseEmailOption.LAYOUT) {
            let defaultEmailTemplate = template?.defaultMessageLayout;

            if (!defaultEmailTemplate) {
                defaultEmailTemplate = (await this.parameterService.getParameterByKey('DEFAULT_EMAIL_TEMPLATE_LAYOUT'))?.value ?? '';
            }

            const { templateForEmail, templateForSubject, templateForSMS, layoutParameterData } = this.getCompiledTemplateAndParameters({
                emailOption: template?.emailOption,
                defaultEmailTemplate,
                heading: template?.heading,
                bodyText: template?.bodyText,
                linkText: template?.linkText,
                link: template?.link,
                previewLine: template?.previewLine,
                subject: template?.subject,
                smsContent: template?.smsContent
            });

            const parameters = this.getTemplateParametersData(notif?.params, layoutParameterData);

            return {
                html: notif?.notificationType === NotificationType.SMS ? templateForSMS(parameters) : templateForEmail(parameters),
                subject: templateForSubject(parameters)
            };
        }

        const { templateForEmail, templateForSubject, templateForSMS } = this.getCompiledTemplateAndParameters({
            emailOption: template?.emailOption,
            wholeEmailContent: template?.wholeEmailContent ?? '',
            smsContent: template?.smsContent,
            subject: template?.subject ?? ''
        });

        const parameters = {
            SHORTBASEURL: process?.env?.SHORTBASEURL ? process.env.SHORTBASEURL : this.configService.get('server.hostedUrl'),
            BASEURL: this.configService.get('server.hostedUrl'),
            FILESURL: this.helperService.getMinioPublicBaseUrl(),
            ...notif?.params
        };

        return {
            html: notif?.notificationType === NotificationType.SMS ? templateForSMS(parameters) : templateForEmail(parameters),
            subject: templateForSubject(notif.params)
        };
    }

    async getNotificationStatusHistory(id: string): Promise<LwpNotificationEventHistory[]> {
        const latestStatusesSubQuery = this.lwpNotificationEventHistoryRepository
            .createQueryBuilder('history')
            .select('history.status', 'status')
            .addSelect('MAX(history."logCreatedAt")', 'maxCreatedAt')
            .where('history."notificationId" = :id', { id })
            .groupBy('history.status');

        const query = this.lwpNotificationEventHistoryRepository
            .createQueryBuilder('history')
            .innerJoin(
                `(${latestStatusesSubQuery.getQuery()})`,
                'latest',
                `history.status = latest.status AND history."logCreatedAt" = latest."maxCreatedAt"`
            )
            .where('history."notificationId" = :id', { id })
            .orderBy('history."logCreatedAt"', 'ASC');

        return await query.getMany();
    }

    async getNotificationErrorMessage(id: string): Promise<string | null> {
        const notificaion = await this.lwpNotificationEventHistoryRepository.findOne({
            where: { notification: id, error: Not(IsNull()) },
            select: ['error']
        });

        return notificaion?.error ?? null;
    }

    public getNotificationStatusByMailgunEvent(event: MailgunEventType): LwpNotificationStatus | null {
        switch (event) {
            case MailgunEventType.clicked:
                return LwpNotificationStatus.CLICKED;

            case MailgunEventType.opened:
                return LwpNotificationStatus.OPENED;

            case MailgunEventType.accepted:
                return LwpNotificationStatus.QUEUED;

            case MailgunEventType.delivered:
                return LwpNotificationStatus.DELIVERED;

            case MailgunEventType.permanent_fail:
                return LwpNotificationStatus.REJECTED;

            default:
                return null;
        }
    }

    public getNotificationStatusByTwilioEvent(event: TwilioMessageStatus): LwpNotificationStatus | null {
        switch (event) {
            case TwilioMessageStatus.queued:
            case TwilioMessageStatus.sent:
                return LwpNotificationStatus.QUEUED;

            case TwilioMessageStatus.delivered:
                return LwpNotificationStatus.DELIVERED;

            case TwilioMessageStatus.failed:
            case TwilioMessageStatus.undelivered:
                return LwpNotificationStatus.REJECTED;

            default:
                return null;
        }
    }

    async updateNotificationStatusForTesting(input: UpdateNotificationStatusInputForTesting): Promise<boolean> {
        if (!(input.mailgunStatus || input.twilioStatus))
            throw new HttpException('Either mailgun status or twilio status must be provided', ErrorStatusCodeEnum._535);

        if (!(input.recipient.includes('@example.com') || input.recipient.includes('+447700900')))
            throw new HttpException('It should be only for testing', ErrorStatusCodeEnum._535);

        let status: LwpNotificationStatus | null;

        if (input.mailgunStatus) status = this.getNotificationStatusByMailgunEvent(input.mailgunStatus);
        else if (input.twilioStatus) status = this.getNotificationStatusByTwilioEvent(input.twilioStatus);

        if (!status) return false;

        const notification = await this.lwpNotificationRepository.findOne({
            where: {
                recipient: input.recipient
            },
            select: ['apiId', 'id']
        });

        if (!notification) throw new HttpException(`Notification not found for recipient ${input.recipient}`, ErrorStatusCodeEnum._535);

        const lwpNotificationEvent = new LwpNotificationEventHistory();

        lwpNotificationEvent.notification = notification;
        lwpNotificationEvent.status = status;

        await this.lwpNotificationEventHistoryRepository.save(lwpNotificationEvent);

        return true;
    }
}
