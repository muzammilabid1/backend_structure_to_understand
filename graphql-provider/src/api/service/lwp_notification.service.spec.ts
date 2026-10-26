import Handlebars from 'handlebars';

import { UseEmailOption } from '../model';
import { LwpNotificationService } from './lwp_notification.service';

describe('LwpNotificationService', () => {
    let service: LwpNotificationService;

    beforeEach(() => {
        service = new LwpNotificationService(null, null, null, null, null, null, null, null, null, null);
    });

    describe('hasTag helper', () => {
        it('is true when the tag list contains the tag', () => {
            const template = Handlebars.compile('{{#if (hasTag SCHOOLTAGS "term1-rationale-emails")}}variant{{else}}control{{/if}}');

            expect(template({ SCHOOLTAGS: ['some-other-tag', 'term1-rationale-emails'] })).toBe('variant');
        });

        it('is false when the tag list does not contain the tag', () => {
            const template = Handlebars.compile('{{#if (hasTag SCHOOLTAGS "term1-rationale-emails")}}variant{{else}}control{{/if}}');

            expect(template({ SCHOOLTAGS: ['some-other-tag'] })).toBe('control');
        });

        it('is false when the tag list is missing or not a list', () => {
            const template = Handlebars.compile('{{#if (hasTag SCHOOLTAGS "term1-rationale-emails")}}variant{{else}}control{{/if}}');

            expect(template({})).toBe('control');
            expect(template({ SCHOOLTAGS: 'term1-rationale-emails' })).toBe('control');
        });
    });

    describe('friendlyDate helper', () => {
        it('renders the day and month without the year for the dayMonth setting', () => {
            const template = Handlebars.compile('{{friendlyDate START "dayMonth"}} - {{friendlyDate END "dayMonth"}}');

            expect(template({ START: '2026-03-04', END: '2026-10-22' })).toBe('Wednesday 4th March - Thursday 22nd October');
        });

        it('renders Invalid date rather than today for a missing date with the dayMonth setting', () => {
            expect(Handlebars.compile('{{friendlyDate START "dayMonth"}}')({})).toBe('Invalid date');
        });
    });

    describe('getEmailTemplateParameters', () => {
        it('collects parameters from plain mustache statements', () => {
            const parameters = service.getEmailTemplateParameters(UseEmailOption.HTML, '<p>Hi {{CHILDFIRSTNAME}} {{{TOPICMESSAGE}}}</p>');

            expect(parameters).toEqual(['CHILDFIRSTNAME', 'TOPICMESSAGE']);
        });

        it('collects parameters used inside helper arguments, ignoring the helper names', () => {
            const parameters = service.getEmailTemplateParameters(
                UseEmailOption.HTML,
                '{{#if (hasTag SCHOOLTAGS "term1-rationale-emails")}}<p>{{{RATIONALEMESSAGE}}}</p>{{/if}}'
            );

            expect(parameters).toEqual(['SCHOOLTAGS', 'RATIONALEMESSAGE']);
        });

        it('collects the subject parameter from a subject conditional', () => {
            const parameters = service.getEmailTemplateParameters(
                UseEmailOption.HTML,
                '{{#if (eq SUBJECTNAME "Maths")}}<p>{{{RATIONALEMESSAGE}}}</p>{{/if}}'
            );

            expect(parameters).toEqual(['SUBJECTNAME', 'RATIONALEMESSAGE']);
        });

        it('collects parameters from nested blocks and from else branches', () => {
            const parameters = service.getEmailTemplateParameters(
                UseEmailOption.HTML,
                `{{#if (hasTag SCHOOLTAGS "term1-rationale-emails")}}
                    {{#unless (eq YEARGROUP "Year 1")}}<p>{{{RATIONALEMESSAGE}}}</p>{{/unless}}
                 {{else}}
                    <p>{{TOPICNAME}}</p>
                 {{/if}}`
            );

            expect(parameters).toEqual(['SCHOOLTAGS', 'YEARGROUP', 'RATIONALEMESSAGE', 'TOPICNAME']);
        });

        it('collects the arguments of a helper mustache rather than the helper name', () => {
            const parameters = service.getEmailTemplateParameters(UseEmailOption.HTML, '<p>{{friendlyDate DUEDATE "long"}}</p>');

            expect(parameters).toEqual(['DUEDATE']);
        });

        it('bypasses block statements in the layout itself, but not in the layout content', () => {
            const parameters = service.getEmailTemplateParameters(
                UseEmailOption.LAYOUT,
                '<html>{{{BODY}}}{{#if LAYOUTONLY}}{{IGNORED}}{{/if}}</html>',
                '{{#if (hasTag SCHOOLTAGS "term1-rationale-emails")}}<p>{{{RATIONALEMESSAGE}}}</p>{{/if}}'
            );

            expect(parameters).toEqual(['BODY', 'SCHOOLTAGS', 'RATIONALEMESSAGE']);
        });

        it('returns an empty list for templates without parameters', () => {
            expect(service.getEmailTemplateParameters(UseEmailOption.HTML, '<p>No parameters here</p>')).toEqual([]);
            expect(service.getEmailTemplateParameters(UseEmailOption.HTML, '')).toEqual([]);
        });
    });

    describe('notificationEmailParameters', () => {
        it('allows the school tag and year group parameters on the parent activity emails', () => {
            expect(LwpNotificationService.notificationEmailParameters.sendPupilTopics).toEqual(
                expect.arrayContaining(['SCHOOLTAGS', 'YEARGROUP'])
            );
            expect(LwpNotificationService.notificationEmailParameters.sendPupilReadingTopicReleased).toEqual(
                expect.arrayContaining(['SCHOOLTAGS', 'YEARGROUP'])
            );
        });

        it('allows the subject parameter on the parent activity emails', () => {
            expect(LwpNotificationService.notificationEmailParameters.sendPupilTopics).toEqual(expect.arrayContaining(['SUBJECTNAME']));
            expect(LwpNotificationService.notificationEmailParameters.sendPupilReadingTopicReleased).toEqual(
                expect.arrayContaining(['SUBJECTNAME'])
            );
        });
    });
});
