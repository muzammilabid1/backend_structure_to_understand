import { Injectable } from '@nestjs/common';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { IMailgunClient } from 'mailgun.js/Interfaces';
import { ConfigService } from 'nestjs-config';

import { EmailService, Mail, MailReplyTo, Sender } from '../notification.types';

@Injectable()
export class MailgunService implements EmailService {
    private mgClient: IMailgunClient;

    defaultMailSender: Sender = {
        name: 'Learning with Parents',
        email: `learntogether@${process.env.EMAIL_DOMAIN}`
    };

    defaultReplyTo: Sender = {
        name: 'Learning with Parents',
        email: 'hello@learningwithparents.com'
    };

    constructor(private configService: ConfigService) {
        this.mgClient = new Mailgun(formData).client({
            username: 'api',
            key: this.configService.get('notification.mailgun_apiKey'),
            url: 'https://api.eu.mailgun.net'
        });
    }

    public async sendMail(mail: Mail): Promise<string> {
        if (mail?.to?.includes('@example.com')) return 'exampleId';

        const response = await this.mgClient.messages.create(process.env.EMAIL_DOMAIN, {
            from: this.mailDetailsToRFC822Mailbox(mail.sender || this.defaultMailSender),
            to: [this.mailDetailsToRFC822Mailbox({ name: mail.toName ?? 'LwP User', email: mail.to })],
            subject: mail.subject,
            html: mail.html,
            'h:Reply-To': this.mailDetailsToRFC822Mailbox(mail.replyTo || this.defaultReplyTo)
        });

        return response?.id;
    }

    private mailDetailsToRFC822Mailbox(user: Sender | MailReplyTo): `${string} <${string}>` {
        return `${user.name} <${user.email}>`;
    }
}
