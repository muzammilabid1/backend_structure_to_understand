export interface MailReplyTo {
    email: string;
    name: string;
}
export interface Sender {
    email: string;
    name: string;
}

export interface Mail {
    to: string;
    toName?: string;
    subject?: string;
    html?: string;
    // String lists are stored as JSON arrays on the notification, so templates can iterate or test them, e.g. SCHOOLTAGS
    params?: { [key: string]: string | number | boolean | Date | string[] | null };
    replyTo?: MailReplyTo;
    sender?: Sender;
}

export interface TemplateSender {
    name: string;
    email: string;
    id: string;
}

export interface TemplateData {
    htmlContent: string;
    name: string;
    subject: string;
    tag: string;
    sender: TemplateSender;
}

export interface SMSData {
    sender: string;
    recipient: string;
    content: string;
}

export interface EmailService {
    sendMail(mail: Mail): Promise<string>;
    // sendMailWithTemplate(templateId: string, mail: Mail): Promise<unknown>;
}

export interface SMSService {
    sendSMS(sms: SMSData): Promise<string>;
}
