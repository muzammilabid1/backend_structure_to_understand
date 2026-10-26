export interface SpmContact {
    name: string;
    email: string;
}

const spmEntryPattern = /^([^<>]*)<([^\s<>]+@[^\s<>]+)>$/;

/** The SPMs in SPM_EMAILS, one per comma-separated `Jo <jo@learningwithparents.com>` entry. */
export const parseSpmEmails = (raw?: string): SpmContact[] =>
    (raw || '')
        .split(',')
        .map((entry) => entry.trim().match(spmEntryPattern))
        .map((entry) => ({ name: entry?.[1].trim() ?? '', email: entry?.[2] ?? '' }))
        .filter((spm) => spm.name && spm.email);

export default {
    sendinblue_apiKey: process.env.SENDINBLUE_APIKEY,
    mailgun_apiKey: process.env.MAILGUN_APIKEY,
    twilio_sid: process.env.TWILIO_SID,
    twilio_token: process.env.TWILIO_TOKEN,
    spm_emails: parseSpmEmails(process.env.SPM_EMAILS)
};
