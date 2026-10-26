import { Injectable } from '@nestjs/common';
import { ConfigService } from 'nestjs-config';
import SibApiV3Sdk from 'sib-api-v3-sdk';

import { EmailService, Mail, SMSData, SMSService } from '../notification.types';
import { assertPhoneNumberIsE164 } from '../validation';

@Injectable()
export class SendInBlueService implements EmailService, SMSService {
    private readonly defaultClient = SibApiV3Sdk.ApiClient.instance;

    constructor(private configService: ConfigService) {
        const apiKey = this.defaultClient.authentications['api-key'];

        apiKey.apiKey = this.configService.get('notification.sendinblue_apiKey');
    }

    public async sendMail(mail: Mail): Promise<string> {
        if (mail?.to?.includes('@example.com')) return 'exampleId';
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

        sendSmtpEmail.subject = mail.subject;
        sendSmtpEmail.htmlContent = mail.html;
        sendSmtpEmail.replyTo = mail?.replyTo ?? { name: 'Learning with Parents', email: 'hello@learningwithparents.com' };
        sendSmtpEmail.to = [{ name: mail.toName ?? 'LwP User', email: mail.to }];
        sendSmtpEmail.sender = { name: mail?.sender?.name, email: mail?.sender?.email };

        const response = await apiInstance.sendTransacEmail(sendSmtpEmail);

        return response?.messageId;
    }

    public async sendMailWithTemplate(templateId: string, mail: Mail): Promise<unknown> {
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

        sendSmtpEmail.to = [{ name: mail.toName ?? 'LwP User', email: mail.to }];
        sendSmtpEmail.templateId = templateId;
        sendSmtpEmail.replyTo = mail?.replyTo ?? { name: 'Learning with Parents', email: 'hello@learningwithparents.com' };
        sendSmtpEmail.params = mail.params;

        return apiInstance.sendTransacEmail(sendSmtpEmail) as Promise<unknown>;
    }

    public async sendSMS(sms: SMSData): Promise<string> {
        assertPhoneNumberIsE164(sms?.recipient);

        if (sms?.recipient?.slice(0, 10) === '+447700900') return 'exampleId';
        const apiInstance = new SibApiV3Sdk.TransactionalSMSApi();
        const sendTransacSms = new SibApiV3Sdk.SendTransacSms();
        const { content, recipient, sender } = sms;

        sendTransacSms.sender = sender;
        sendTransacSms.recipient = recipient;
        sendTransacSms.content = content;

        const response = await apiInstance.sendTransacSms(sendTransacSms);

        return response?.messageId ? response?.messageId?.toString() : null;
    }
}
