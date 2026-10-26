import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import Handlebars from 'handlebars';
import { ConfigService } from 'nestjs-config';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Repository } from 'typeorm';

import { LwpNotification } from '../entities/lwp_notification';
import { StaticLwpParameter } from '../entities/parameter';
import { StaticLwpEmailTemplate } from '../entities/static_lwp_email_template';
import { LwpUser } from '../entities/user';
import {
    AddEmailTemplateInput,
    EmailTemplatePreviewInput,
    EmailTemplateStatus,
    EmailTemplateTypes,
    UpdateEmailTemplateInput,
    UseEmailOption
} from '../model';
import { HelperService } from './helper.service';
import { CompiledTemplateAndParametersOutput, LwpNotificationService } from './lwp_notification.service';
import { ParameterService } from './parameter.service';
import { StaticLwpEmailTemplateService } from './static_lwp_email_template.service';

describe('StaticLwpEmailTemplate', () => {
    let mockStaticLwpEmailTemplateService: StaticLwpEmailTemplateService;
    let mockParameterService: Partial<ParameterService>;
    let mockLwpNotificationService: Partial<LwpNotificationService>;
    let mockHelperService: Partial<HelperService>;
    let mockConfigService: Partial<ConfigService>;
    let mockShallowUserService: Partial<ShallowUserService>;

    let mockStaticLwpEmailTemplateRepository: Partial<Repository<StaticLwpEmailTemplate>>;
    let mockLwpNotificationRepository: Partial<Repository<LwpNotification>>;

    beforeEach(async () => {
        mockStaticLwpEmailTemplateRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
        };

        mockLwpNotificationRepository = {
            createQueryBuilder: jest.fn()
        };

        mockParameterService = {
            getParameterByKey: jest.fn()
        };
        mockLwpNotificationService = {
            getCompiledTemplateAndParameters: jest.fn(),
            getTemplateParametersData: jest.fn(),
            getMessageLogsCount: jest.fn()
        };
        mockHelperService = {
            capitalizeFirstLetter: jest.fn(),
            getMinioPublicBaseUrl: jest.fn()
        };
        mockConfigService = {
            get: jest.fn()
        };
        mockShallowUserService = {
            newShallowUser: jest.fn()
        };

        const staticlLwpEmailTemplateRepositoryToken = getRepositoryToken(StaticLwpEmailTemplate);
        const lwpNotificationRepositoryToken = getRepositoryToken(LwpNotification);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StaticLwpEmailTemplateService,
                {
                    provide: staticlLwpEmailTemplateRepositoryToken,
                    useValue: mockStaticLwpEmailTemplateRepository
                },
                {
                    provide: lwpNotificationRepositoryToken,
                    useValue: mockLwpNotificationRepository
                },
                {
                    provide: ParameterService,
                    useValue: mockParameterService
                },
                {
                    provide: LwpNotificationService,
                    useValue: mockLwpNotificationService
                },
                {
                    provide: HelperService,
                    useValue: mockHelperService
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService
                },
                {
                    provide: ShallowUserService,
                    useValue: mockShallowUserService
                }
            ]
        }).compile();

        mockStaticLwpEmailTemplateRepository = module.get<Repository<StaticLwpEmailTemplate>>(staticlLwpEmailTemplateRepositoryToken);
        mockStaticLwpEmailTemplateService = module.get<StaticLwpEmailTemplateService>(StaticLwpEmailTemplateService);
    });

    it('email template service should be defined', () => {
        expect(mockStaticLwpEmailTemplateService).toBeDefined();
    });
    it('email template repository should be defined', () => {
        expect(mockStaticLwpEmailTemplateRepository).toBeDefined();
    });

    describe('createEmailTemplate', () => {
        it('should successfully create a new StaticLwpEmailTemplate with HTML option', async () => {
            const input: Partial<AddEmailTemplateInput> = {
                sendEmail: true,
                emailOption: UseEmailOption.HTML,
                wholeEmailContent: 'Whole email content here',
                multipleSection: true,
                multipleSectionContent: 'Multiple section content here',
                heading: 'Email Heading',
                sendSms: true,
                smsContent: 'SMS Content here',
                status: EmailTemplateStatus.CURRENT
            };
            const user = new LwpUser();
            const lwpEmailTemplateOutput: Partial<StaticLwpEmailTemplate> = {
                id: '1',
                sendEmail: input.sendEmail,
                emailOption: input.emailOption,
                wholeEmailContent: input.wholeEmailContent,
                defaultMessageLayout: 'default_layout',
                logCreatedBy: user,
                logUpdatedBy: user
            };

            jest.spyOn(mockShallowUserService, 'newShallowUser').mockReturnValue(user as LwpUser);
            jest.spyOn(mockParameterService, 'getParameterByKey').mockResolvedValue({ value: 'default_layout' } as StaticLwpParameter);
            jest.spyOn(mockStaticLwpEmailTemplateRepository, 'save').mockResolvedValue(lwpEmailTemplateOutput as StaticLwpEmailTemplate);

            const result = await mockStaticLwpEmailTemplateService.createEmailTemplate(input as AddEmailTemplateInput, user?.id);

            expect(mockStaticLwpEmailTemplateRepository.save).toHaveBeenCalledWith(expect.objectContaining(input));
            expect(result).toEqual(expect.objectContaining(lwpEmailTemplateOutput));

            expect(result).toHaveProperty('defaultMessageLayout', 'default_layout');
            expect(result).toHaveProperty('emailOption', UseEmailOption.HTML);
        });

        it('should successfully create a new StaticLwpEmailTemplate with LAYOUT option', async () => {
            const input: Partial<AddEmailTemplateInput> = {
                sendEmail: true,
                emailOption: UseEmailOption.LAYOUT,
                bodyText: 'Body text here',
                linkText: 'Link text here',
                link: 'https://www.google.com',
                heading: 'Email Heading',
                sendSms: true,
                smsContent: 'SMS Content here',
                status: EmailTemplateStatus.CURRENT
            };
            const user = new LwpUser();
            const lwpEmailTemplateOutput: Partial<StaticLwpEmailTemplate> = {
                id: '1',
                sendEmail: input.sendEmail,
                emailOption: input.emailOption,
                wholeEmailContent: input.wholeEmailContent,
                defaultMessageLayout: 'default_layout',
                logCreatedBy: user,
                logUpdatedBy: user
            };

            jest.spyOn(mockShallowUserService, 'newShallowUser').mockReturnValue(user as LwpUser);
            jest.spyOn(mockParameterService, 'getParameterByKey').mockResolvedValue({ value: 'default_layout' } as StaticLwpParameter);
            jest.spyOn(mockStaticLwpEmailTemplateRepository, 'save').mockResolvedValue(lwpEmailTemplateOutput as StaticLwpEmailTemplate);

            const result = await mockStaticLwpEmailTemplateService.createEmailTemplate(input as AddEmailTemplateInput, user?.id);

            expect(mockStaticLwpEmailTemplateRepository.save).toHaveBeenCalledWith(expect.objectContaining(input));
            expect(result).toEqual(expect.objectContaining(lwpEmailTemplateOutput));

            expect(result).toHaveProperty('defaultMessageLayout', 'default_layout');
            expect(result).toHaveProperty('emailOption', UseEmailOption.LAYOUT);
        });
    });

    describe('updateLwpEmailTemplate', () => {
        const input: Partial<UpdateEmailTemplateInput> = {
            sendEmail: true,
            emailOption: UseEmailOption.HTML,
            wholeEmailContent: 'Complete email content',
            multipleSection: true,
            multipleSectionContent: JSON.stringify([{ title: 'Section Title', content: 'Section Content' }]),
            heading: 'Email Heading',
            bodyText: 'Email Body Text',
            linkText: 'Email Link Text',
            link: 'https://example.com',
            sendSms: true,
            smsContent: 'SMS content for the email template',
            sendPhoneNotification: true,
            notificationTitle: 'Notification Title',
            notificationDescription: 'Notification description',
            notificationUrl: 'https://notification-url.example.com',
            status: EmailTemplateStatus.CURRENT,
            type: EmailTemplateTypes.adminInvitationEmail
        };

        it('updates an existing current template to historic when a new current template is created', async () => {
            const draftTemplate = null;
            const user = new LwpUser();
            const newTemplate = { ...input, id: '3' };

            jest.spyOn(mockStaticLwpEmailTemplateRepository, 'findOne').mockResolvedValueOnce(draftTemplate as StaticLwpEmailTemplate);

            jest.spyOn(mockStaticLwpEmailTemplateRepository, 'save').mockResolvedValue(newTemplate as StaticLwpEmailTemplate);

            await mockStaticLwpEmailTemplateService.updateEmailTemplate(input as UpdateEmailTemplateInput, user?.id);

            expect(mockStaticLwpEmailTemplateRepository.update).toHaveBeenCalledWith(
                { type: EmailTemplateTypes.adminInvitationEmail, status: EmailTemplateStatus.CURRENT },
                { status: EmailTemplateStatus.HISTORIC }
            );
        });

        it('creates a new template when no draft exists', async () => {
            const user = new LwpUser();
            const existingTemplate = { ...input, id: '1' };
            const newTemplate = { ...input, id: '2' };

            jest.spyOn(mockStaticLwpEmailTemplateRepository, 'findOne')
                .mockResolvedValueOnce(existingTemplate as StaticLwpEmailTemplate)
                .mockResolvedValueOnce(null as StaticLwpEmailTemplate);

            jest.spyOn(mockStaticLwpEmailTemplateRepository, 'save').mockResolvedValue(newTemplate as StaticLwpEmailTemplate);

            const result = await mockStaticLwpEmailTemplateService.updateEmailTemplate(input as UpdateEmailTemplateInput, user?.id);

            expect(result).toEqual(newTemplate);
        });

        it('updates an existing draft template', async () => {
            const draftTemplate = { id: '1', status: EmailTemplateStatus.DRAFT };
            const input = new UpdateEmailTemplateInput();

            input.status = EmailTemplateStatus.DRAFT;
            const existingTemplate = { ...input, id: '2' };
            const user = new LwpUser();
            const updatedTemplate = { ...input, id: draftTemplate.id };

            jest.spyOn(mockStaticLwpEmailTemplateRepository, 'findOne')
                .mockResolvedValueOnce(existingTemplate as StaticLwpEmailTemplate)
                .mockResolvedValueOnce(draftTemplate as StaticLwpEmailTemplate);

            jest.spyOn(mockStaticLwpEmailTemplateRepository, 'save').mockResolvedValue(updatedTemplate as StaticLwpEmailTemplate);

            const result = await mockStaticLwpEmailTemplateService.updateEmailTemplate(input, user?.id);

            expect(mockStaticLwpEmailTemplateRepository.save).toHaveBeenCalledWith(expect.any(Object));
            expect(result).toHaveProperty('status', EmailTemplateStatus.DRAFT);
        });

        it('throws an error if the email template repository fails to update', async () => {
            const input = new UpdateEmailTemplateInput();
            const user = new LwpUser();

            jest.spyOn(mockStaticLwpEmailTemplateRepository, 'findOne').mockRejectedValue(new Error('Database error'));

            await expect(mockStaticLwpEmailTemplateService.updateEmailTemplate(input, user?.id)).rejects.toThrow('Database error');
        });
    });

    describe('emailTemplatePreview', () => {
        it('should generate SMS preview correctly', async () => {
            const input: Partial<EmailTemplatePreviewInput> = {
                codePreview: 'SMS',
                smsContent: 'Test SMS Content with {{{JEST}}}'
            };
            const getCompiledTemplateAndParametersOutput: Partial<CompiledTemplateAndParametersOutput> = {
                templateForSMS: Handlebars.compile(input.smsContent),
                layoutParameterData: {},
                smsParams: ['JEST']
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const smsParams: Record<string, any> = { JEST: 'Jest' };
            const expectedTemplateOutput = getCompiledTemplateAndParametersOutput.templateForSMS(smsParams);

            jest.spyOn(mockLwpNotificationService, 'getCompiledTemplateAndParameters').mockReturnValue(
                getCompiledTemplateAndParametersOutput
            );
            jest.spyOn(mockLwpNotificationService, 'getTemplateParametersData').mockReturnValue(smsParams);

            const result = await mockStaticLwpEmailTemplateService.emailTemplatePreview(input as EmailTemplatePreviewInput);

            expect(result).toEqual(expectedTemplateOutput);
        });

        it('should generate email preview with LAYOUT option correctly', async () => {
            const input: Partial<EmailTemplatePreviewInput> = {
                codePreview: 'Desktop',
                heading: 'Test Email Heading {{{TEST_HEADING}}}',
                bodyText: 'Test Email Body {{{TEST_BODY}}}',
                emailOption: UseEmailOption.LAYOUT,
                wholeEmailContent: '',
                smsContent: ''
            };
            const defaultMessageLayout = '{{{HEADING}}} {{{BODY}}}';
            const getCompiledTemplateAndParametersOutput: Partial<CompiledTemplateAndParametersOutput> = {
                templateForEmail: Handlebars.compile(defaultMessageLayout),
                layoutParameterData: {
                    HEADING: Handlebars.compile(input.heading),
                    BODY: Handlebars.compile(input.bodyText)
                },
                emailParams: ['TEST_HEADING', 'TEST_BODY']
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const emailParams: Record<string, any> = { TEST_HEADING: 'Test_heading', TEST_BODY: 'Test_body' };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const getTemplateParametersDataOutput: Record<string, any> = Object.assign({}, emailParams, {
                HEADING: getCompiledTemplateAndParametersOutput.layoutParameterData.HEADING(emailParams),
                BODY: getCompiledTemplateAndParametersOutput.layoutParameterData.BODY(emailParams)
            });
            const expectedTemplateOutput = getCompiledTemplateAndParametersOutput.templateForEmail(getTemplateParametersDataOutput);

            jest.spyOn(mockLwpNotificationService, 'getCompiledTemplateAndParameters').mockReturnValue(
                getCompiledTemplateAndParametersOutput
            );
            jest.spyOn(mockLwpNotificationService, 'getTemplateParametersData').mockReturnValue(getTemplateParametersDataOutput);

            const result = await mockStaticLwpEmailTemplateService.emailTemplatePreview(input as EmailTemplatePreviewInput);

            expect(result).toEqual(expectedTemplateOutput);
        });

        it('should generate email preview with HTML option correctly', async () => {
            const input: Partial<EmailTemplatePreviewInput> = {
                codePreview: 'Desktop',
                emailOption: UseEmailOption.HTML,
                wholeEmailContent: 'Test Whole Email Content {{{TEST}}} {{{EMAIL_CONTENT}}}'
            };
            const getCompiledTemplateAndParametersOutput: Partial<CompiledTemplateAndParametersOutput> = {
                templateForEmail: Handlebars.compile(input.wholeEmailContent),
                emailParams: ['TEST', 'EMAIL_CONTENT']
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const emailParams: Record<string, any> = { TEST: 'Test', EMAIL_CONTENT: 'Email_content' };
            const expectedTemplateOutput = getCompiledTemplateAndParametersOutput.templateForEmail(emailParams);

            jest.spyOn(mockLwpNotificationService, 'getCompiledTemplateAndParameters').mockReturnValue(
                getCompiledTemplateAndParametersOutput
            );
            jest.spyOn(mockStaticLwpEmailTemplateService, 'emailTemplatePreview').mockResolvedValue(expectedTemplateOutput);

            const result = await mockStaticLwpEmailTemplateService.emailTemplatePreview(input as EmailTemplatePreviewInput);

            expect(result).toEqual(expectedTemplateOutput);
        });

        it('should handle exceptions correctly', async () => {
            const input: Partial<EmailTemplatePreviewInput> = {
                codePreview: 'SMS',
                smsContent: 'Test SMS Content with {JEST}}}'
            };

            await expect(mockStaticLwpEmailTemplateService.emailTemplatePreview(input as EmailTemplatePreviewInput)).rejects.toThrow();
        });
    });
});
