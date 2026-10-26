import { Injectable } from '@nestjs/common';
import { ConfigService } from 'nestjs-config';
import twilio from 'twilio';
import type TwilioClient from 'twilio/lib/rest/Twilio';

import { SMSData, SMSService } from '../notification.types';
import { assertPhoneNumberIsE164 } from '../validation';

@Injectable()
export class TwilioService implements SMSService {
    client: TwilioClient;

    constructor(private configService: ConfigService) {
        this.client = twilio(this.configService.get('notification.twilio_sid'), this.configService.get('notification.twilio_token'));
    }

    public async sendSMS(sms: SMSData): Promise<string> {
        assertPhoneNumberIsE164(sms?.recipient);

        const { content, recipient, sender } = sms;

        if (recipient?.slice(0, 10) === '+447700900') return 'exampleId';

        const response = await this.client.messages.create({
            to: recipient,
            from: sender,
            body: content,
            statusCallback: process.env.TWILIO_WEBHOOK_URL
        });

        return response?.sid;
    }
}
