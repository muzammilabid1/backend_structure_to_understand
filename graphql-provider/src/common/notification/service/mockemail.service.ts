import { Injectable } from '@nestjs/common';

import { EmailService, Mail, SMSData, SMSService } from '../notification.types';
import { assertPhoneNumberIsE164 } from '../validation';

@Injectable()
export class MockEmailService implements EmailService, SMSService {
    public async send(mail: Mail): Promise<boolean> {
        console.log('Mocking send mail with below details');
        console.log(mail);

        return Promise.resolve(true);
    }

    public async sendMail(mail: Mail): Promise<string> {
        if (mail?.to?.includes('@example.com')) return 'mockId';
        console.log('Mocking send mail including db template with below details');
        console.log(mail);

        return Promise.resolve('mockId');
    }

    public async sendMailWithTemplate(templateId: string, mail: Mail): Promise<boolean> {
        console.log('Mocking send mail with template below details');
        console.log(templateId);
        console.log(mail);

        return Promise.resolve(true);
    }

    public async sendSMS(sms: SMSData): Promise<string> {
        assertPhoneNumberIsE164(sms?.recipient);

        if (sms?.recipient?.slice(0, 10) === '+447700900') return 'mockId';
        console.log('Mocking send sms with below details');
        console.log(sms);

        return Promise.resolve('mockId');
    }
}
