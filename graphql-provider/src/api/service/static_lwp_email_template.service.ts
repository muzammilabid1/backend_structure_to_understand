import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from 'nestjs-config';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { In, Repository } from 'typeorm';

import { LwpNotification } from '../entities/lwp_notification';
import { StaticLwpEmailTemplate } from '../entities/static_lwp_email_template';
import {
    AddEmailTemplateInput,
    EmailTemplatePreviewInput,
    EmailTemplateStatus,
    EmailTemplateTypes,
    ErrorStatusCodeEnum,
    MessageLogFilterInput,
    MessageLogsCountOutput,
    OperationStatus,
    UpdateEmailTemplateInput,
    UseEmailOption
} from '../model';
import { HelperService } from './helper.service';
import { LwpNotificationService } from './lwp_notification.service';
import { ParameterService } from './parameter.service';

@Injectable()
export class StaticLwpEmailTemplateService {
    constructor(
        @InjectRepository(StaticLwpEmailTemplate)
        private emailTemplateRepository: Repository<StaticLwpEmailTemplate>,
        @InjectRepository(LwpNotification)
        private lwpNotificationRepository: Repository<LwpNotification>,
        private readonly parameterService: ParameterService,
        private lwpNotificationService: LwpNotificationService,
        private readonly helperService: HelperService,
        private readonly configService: ConfigService,
        private shallowUserService: ShallowUserService
    ) {}

    public async getEmailTemplates(): Promise<StaticLwpEmailTemplate[]> {
        const emailTemplateKeys = Object.keys(EmailTemplateTypes).filter((key) => typeof EmailTemplateTypes[key as string] === 'string');

        return await this.emailTemplateRepository.find({
            where: { type: In(emailTemplateKeys), status: In([EmailTemplateStatus.CURRENT, EmailTemplateStatus.DRAFT]) },
            order: { type: 'ASC' },
            relations: ['logUpdatedBy']
        });
    }

    public async getEmailTemplate(id: string): Promise<StaticLwpEmailTemplate> {
        const emailTemplate = await this.emailTemplateRepository.findOne({ where: { id } });

        if (!emailTemplate) throw new HttpException('Email Template does not exist', 535);

        return emailTemplate;
    }

    public async createEmailTemplate(input: AddEmailTemplateInput, userId: string): Promise<StaticLwpEmailTemplate> {
        const existingTemplate = await this.emailTemplateRepository.count({
            where: { type: input?.type, status: EmailTemplateStatus.CURRENT }
        });

        if (existingTemplate > 0) {
            throw new HttpException(`Email Template of type ${input?.type} already exist`, 535);
        }

        const user = this.shallowUserService.newShallowUser(userId);

        const emailTemplate = new StaticLwpEmailTemplate();

        emailTemplate.subject = input.subject;
        emailTemplate.senderEmail = input.senderEmail;
        emailTemplate.senderName = input.senderName;
        emailTemplate.type = input?.type;
        emailTemplate.previewLine = input.previewLine;
        emailTemplate.sendEmail = input?.sendEmail;
        emailTemplate.emailOption = input?.emailOption;
        emailTemplate.wholeEmailContent = input?.wholeEmailContent;
        emailTemplate.multipleSection = input?.multipleSection;
        emailTemplate.multipleSectionContent = input?.multipleSectionContent;
        emailTemplate.heading = input?.heading;
        emailTemplate.bodyText = input?.bodyText;
        emailTemplate.linkText = input?.linkText;
        emailTemplate.link = input?.link;
        emailTemplate.sendSms = input?.sendSms;
        emailTemplate.smsContent = input?.smsContent;
        emailTemplate.sendPhoneNotification = input?.sendPhoneNotification;
        emailTemplate.notificationTitle = input?.notificationTitle;
        emailTemplate.notificationDescription = input?.notificationDescription;
        emailTemplate.notificationUrl = input?.notificationUrl;
        emailTemplate.status = input?.status;
        emailTemplate.defaultMessageLayout =
            (await this.parameterService.getParameterByKey('DEFAULT_EMAIL_TEMPLATE_LAYOUT'))?.value ?? null;

        emailTemplate.logCreatedBy = user;
        emailTemplate.logUpdatedBy = user;

        return await this.emailTemplateRepository.save(emailTemplate);
    }

    public async updateEmailTemplate(input: UpdateEmailTemplateInput, userId: string): Promise<StaticLwpEmailTemplate> {
        const existingEmailTemplate = await this.emailTemplateRepository.count({
            where: { type: input?.type, id: input.id }
        });

        if (existingEmailTemplate === 0) throw new HttpException('Email Template does not exist', 535);

        if (input.status === EmailTemplateStatus.CURRENT) {
            await this.emailTemplateRepository.update(
                { type: input.type, status: EmailTemplateStatus.CURRENT },
                { status: EmailTemplateStatus.HISTORIC }
            );
        }

        const emailTemplate = new StaticLwpEmailTemplate();

        emailTemplate.subject = input?.subject;
        emailTemplate.senderName = input?.senderName;
        emailTemplate.senderEmail = input?.senderEmail;
        emailTemplate.previewLine = input?.previewLine;
        emailTemplate.lwpNotification = null;
        emailTemplate.sendEmail = input?.sendEmail;
        emailTemplate.emailOption = input?.emailOption;
        emailTemplate.wholeEmailContent = input?.wholeEmailContent;
        emailTemplate.multipleSection = input?.multipleSection;
        emailTemplate.multipleSectionContent = input?.multipleSectionContent;
        emailTemplate.heading = input?.heading;
        emailTemplate.bodyText = input?.bodyText;
        emailTemplate.linkText = input?.linkText;
        emailTemplate.link = input?.link;
        emailTemplate.sendSms = input?.sendSms;
        emailTemplate.smsContent = input?.smsContent;
        emailTemplate.sendPhoneNotification = input?.sendPhoneNotification;
        emailTemplate.notificationTitle = input?.notificationTitle;
        emailTemplate.notificationDescription = input?.notificationDescription;
        emailTemplate.notificationUrl = input?.notificationUrl;
        emailTemplate.status = input?.status;
        emailTemplate.type = input?.type;
        emailTemplate.defaultMessageLayout =
            (await this.parameterService.getParameterByKey('DEFAULT_EMAIL_TEMPLATE_LAYOUT'))?.value ?? null;
        emailTemplate.logUpdatedBy = this.shallowUserService.newShallowUser(userId);
        emailTemplate.logUpdatedAt = new Date();

        const isDraftTemplateExist = await this.emailTemplateRepository.findOne({
            where: {
                type: input.type,
                status: EmailTemplateStatus.DRAFT
            },
            order: { logCreatedAt: 'DESC' },
            select: ['id']
        });

        if (isDraftTemplateExist) {
            return await this.emailTemplateRepository.save({ id: isDraftTemplateExist?.id, ...emailTemplate });
        }

        return await this.emailTemplateRepository.save(emailTemplate);
    }

    public async deleteEmailTemplate(id: string): Promise<OperationStatus> {
        const res = await this.emailTemplateRepository.delete({ id });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async getDraftEmailTemplate(type: EmailTemplateTypes): Promise<StaticLwpEmailTemplate> {
        const emailTemplate = await this.emailTemplateRepository.findOne({
            where: { type, status: EmailTemplateStatus.DRAFT },
            order: {
                logCreatedAt: 'DESC'
            }
        });

        return emailTemplate;
    }

    public async emailTemplatePreview(input: EmailTemplatePreviewInput): Promise<string> {
        const defaultEmailTemplate = (await this.parameterService.getParameterByKey('DEFAULT_EMAIL_TEMPLATE_LAYOUT'))?.value ?? '';

        let templateOutput = null;

        try {
            const { emailParams, smsParams, templateForSMS, templateForEmail, layoutParameterData } =
                this.lwpNotificationService.getCompiledTemplateAndParameters({
                    heading: input?.heading,
                    bodyText: input?.bodyText,
                    wholeEmailContent: input?.wholeEmailContent,
                    smsContent: input?.smsContent,
                    linkText: input?.linkText,
                    link: input?.link,
                    previewLine: input?.previewLine,
                    emailOption: input?.emailOption,
                    defaultEmailTemplate
                });

            if (input?.codePreview === 'SMS') {
                const smsLayoutParameterData = {};

                smsParams.forEach((element) => {
                    smsLayoutParameterData[element] = this.helperService.capitalizeFirstLetter(element);
                });

                const parameters = this.lwpNotificationService.getTemplateParametersData(smsLayoutParameterData, layoutParameterData);

                templateOutput = templateForSMS(parameters);
            } else {
                let templateParameters = {};

                emailParams.forEach((element) => {
                    templateParameters[element] = this.helperService.capitalizeFirstLetter(element);
                });

                templateParameters = {
                    ...templateParameters,
                    BASEURL: this.configService.get('server.hostedUrl'),
                    FILESURL: this.helperService.getMinioPublicBaseUrl()
                };
                if (input?.emailOption === UseEmailOption.LAYOUT) {
                    const parameters = this.lwpNotificationService.getTemplateParametersData(templateParameters, layoutParameterData);

                    templateOutput = templateForEmail(parameters);
                } else {
                    templateOutput = templateForEmail(templateParameters);
                }
            }

            return templateOutput;
        } catch (error) {
            throw new HttpException(error?.message, ErrorStatusCodeEnum._535);
        }
    }

    public async removeDraftEmailTemplate(id: string): Promise<OperationStatus> {
        const res = await this.emailTemplateRepository.delete(id);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async getMessageLogsCount(input: MessageLogFilterInput): Promise<MessageLogsCountOutput> {
        return await this.lwpNotificationService.getMessageLogsCount(input);
    }

    public async getLastNotificationOfEmailTemplate(id: string): Promise<LwpNotification> {
        const emailTemplate = await this.emailTemplateRepository.findOne({ where: { id }, relations: ['lwpNotification'] });

        return emailTemplate?.lwpNotification ? emailTemplate?.lwpNotification : null;
    }

    subtractSeconds(numOfSeconds: number, date: Date): Date {
        date.setSeconds(date.getSeconds() - numOfSeconds);

        return date;
    }

    public async getBadParamsOfEmailTemplate(type: EmailTemplateTypes, logUpdatedAt: Date, emailTemplateId: string): Promise<string[]> {
        const badParams = [];
        const date = this.subtractSeconds(2, logUpdatedAt);
        const lwpNotifications = await this.lwpNotificationRepository
            .createQueryBuilder('notification')
            .leftJoinAndSelect('notification.emailTemplate', 'emailTemplate')
            .where('notification.emailTemplateType = :type', { type })
            .andWhere('emailTemplate.id = :emailTemplateId', { emailTemplateId })
            .andWhere('notification.logCreatedAt >= :logUpdatedAt', { logUpdatedAt: date })
            .select('notification.badParams')
            .distinctOn(['notification.badParams'])
            .getMany();

        for (const notificaion of lwpNotifications) {
            for (const param of notificaion.badParams) {
                badParams.push(param);
            }
        }

        return badParams;
    }
}
