import { ConfigService } from 'nestjs-config';
import { parseSpmEmails } from 'src/config/notification';
import { Repository } from 'typeorm';

import { LwpClassTopic } from '../entities/class_topic';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilParent } from '../entities/pupil_parent';
import { LwpPupilTopic } from '../entities/pupil_topic';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpPeriod } from '../entities/static_period';
import { StaticLwpTopic } from '../entities/static_topic';
import { LwpUser } from '../entities/user';
import { HelperService } from './helper.service';
import { LwpNotificationService } from './lwp_notification.service';
import { NotificationService } from './notification.service';
import { StaticLwpFeaturesService } from './static_lwp_features.service';

describe('NotificationService', () => {
    let service: NotificationService;
    let saveNotification: jest.Mock;
    let getOne: jest.Mock;
    let configGet: jest.Mock;
    let getRawMany: jest.Mock;

    const classTopic = {
        id: '10',
        class: { id: '20', school: { schoolName: 'Test School' } },
        topic: { id: '60', parentTopicName: 'Fractions', scrapbookPrompt: null },
        releaseDate: new Date('2026-09-01'),
        dueDate: new Date('2026-09-08')
    } as unknown as LwpClassTopic;
    const parent = { id: '30', email: 'parent@example.com', firstname: 'Pat', lastname: 'Parent' } as unknown as LwpUser;
    const pupil = { id: '40', firstname: 'Pip', lastname: 'Pupil', getPupilStatus: () => Promise.resolve('ACTIVE') } as unknown as LwpPupil;
    const pupilParent = { status: 'ACTIVE' } as unknown as LwpPupilParent;
    const pupilTopic = { id: '50' } as unknown as LwpPupilTopic;

    const sendPupilTopics = (): Promise<void> =>
        service.sendPupilTopics(classTopic, parent, pupil, pupilParent, false, pupilTopic, 'magic-link-token');

    beforeEach(() => {
        saveNotification = jest.fn();
        getOne = jest.fn();
        configGet = jest.fn();
        getRawMany = jest.fn().mockResolvedValue([]);

        const helperService = { dateHandler1: jest.fn(), dateHandler2: jest.fn() } as unknown as HelperService;
        const configService = { get: configGet } as unknown as ConfigService;
        const lwpNotificationService = { saveNotification } as unknown as LwpNotificationService;
        const schoolClassRepository = {
            createQueryBuilder: jest.fn(() => ({
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                leftJoin: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne
            }))
        } as unknown as Repository<LwpSchoolClass>;
        const topicRepository = {
            createQueryBuilder: jest.fn(() => ({
                innerJoin: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                distinct: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany
            }))
        } as unknown as Repository<StaticLwpTopic>;

        // Only the school class repository matters for these tests; the rest are dependencies of the
        // school leader welcome email, which is not exercised here.
        const featuresService = { isReadyTeddyEnabledForSchool: jest.fn() } as unknown as StaticLwpFeaturesService;
        const staticPeriodRepository = { findOne: jest.fn() } as unknown as Repository<StaticLwpPeriod>;
        const schoolRepository = { createQueryBuilder: jest.fn() } as unknown as Repository<LwpSchool>;

        service = new NotificationService(
            helperService,
            configService,
            lwpNotificationService,
            featuresService,
            schoolClassRepository,
            staticPeriodRepository,
            schoolRepository,
            topicRepository
        );
    });

    describe('sendPupilTopics', () => {
        it('passes the school tags and the class year group to the email template', async () => {
            getOne.mockResolvedValue({
                yearGroup: { year: 'Year 3' },
                school: { schoolTags: [{ tag: { name: 'term1-rationale-emails' } }, { tag: { name: 'money-skills' } }] }
            });

            await sendPupilTopics();

            expect(saveNotification.mock.calls[0][1].params).toEqual(
                expect.objectContaining({
                    SCHOOLTAGS: ['term1-rationale-emails', 'money-skills'],
                    YEARGROUP: 'Year 3'
                })
            );
        });

        it('passes an empty tag list when the school has no tags', async () => {
            getOne.mockResolvedValue({ yearGroup: { year: 'Year 3' }, school: { schoolTags: [] } });

            await sendPupilTopics();

            expect(saveNotification.mock.calls[0][1].params).toEqual(expect.objectContaining({ SCHOOLTAGS: [], YEARGROUP: 'Year 3' }));
        });

        it('still sends when the class has no year group and the school cannot be found', async () => {
            getOne.mockResolvedValue(null);

            await sendPupilTopics();

            expect(saveNotification.mock.calls[0][1].params).toEqual(expect.objectContaining({ SCHOOLTAGS: [], YEARGROUP: null }));
        });

        it("passes the topic's subject to the email template", async () => {
            getOne.mockResolvedValue(null);
            getRawMany.mockResolvedValue([{ name: 'Maths' }]);

            await sendPupilTopics();

            expect(saveNotification.mock.calls[0][1].params).toEqual(expect.objectContaining({ SUBJECTNAME: 'Maths' }));
        });

        it('passes the first subject alphabetically when the topic sits in domains of several subjects', async () => {
            getOne.mockResolvedValue(null);
            getRawMany.mockResolvedValue([{ name: 'English' }, { name: 'Maths' }]);

            await sendPupilTopics();

            expect(saveNotification.mock.calls[0][1].params).toEqual(expect.objectContaining({ SUBJECTNAME: 'English' }));
        });

        it('still sends when the topic is not in a domain, so has no subject', async () => {
            getOne.mockResolvedValue(null);
            getRawMany.mockResolvedValue([]);

            await sendPupilTopics();

            expect(saveNotification.mock.calls[0][1].params).toEqual(expect.objectContaining({ SUBJECTNAME: null }));
        });

        // LEA-6568: the class topic handed to us by the first-invitation path carries no main teacher, so the
        // alias has to come from the class we look up ourselves.
        it("names the class's main teacher when the class topic has no teacher relation loaded", async () => {
            getOne.mockResolvedValue({ mainTeacher: { nameForChildren: 'Mrs Smith' } });

            await sendPupilTopics();

            expect(saveNotification.mock.calls[0][1].params).toEqual(expect.objectContaining({ TEACHERALIAS: 'Mrs Smith' }));
        });

        it('keeps the alias off the class topic when the caller did load the teacher relation', async () => {
            getOne.mockResolvedValue({ mainTeacher: { nameForChildren: 'Mrs Smith' } });

            const classTopicWithTeacher = {
                ...classTopic,
                class: { id: '20', school: { schoolName: 'Test School' }, mainTeacher: { nameForChildren: 'Mr Jones' } }
            } as unknown as LwpClassTopic;

            await service.sendPupilTopics(classTopicWithTeacher, parent, pupil, pupilParent, false, pupilTopic, 'magic-link-token');

            expect(saveNotification.mock.calls[0][1].params).toEqual(expect.objectContaining({ TEACHERALIAS: 'Mr Jones' }));
        });

        it('still sends an empty alias when the class has no main teacher', async () => {
            getOne.mockResolvedValue({ mainTeacher: null });

            await sendPupilTopics();

            expect(saveNotification.mock.calls[0][1].params).toEqual(expect.objectContaining({ TEACHERALIAS: '' }));
        });
    });

    describe('sendPupilReadingTopicReleased', () => {
        it('passes the school tags and the class year group to the email template', async () => {
            getOne.mockResolvedValue({
                yearGroup: { year: 'Year 5' },
                school: { schoolTags: [{ tag: { name: 'term1-rationale-emails' } }] }
            });

            await service.sendPupilReadingTopicReleased(classTopic, parent, pupil, pupilParent, 20, 'magic-link-token');

            expect(saveNotification.mock.calls[0][1].params).toEqual(
                expect.objectContaining({ SCHOOLTAGS: ['term1-rationale-emails'], YEARGROUP: 'Year 5' })
            );
        });

        it("passes the topic's subject to the email template", async () => {
            getOne.mockResolvedValue(null);
            getRawMany.mockResolvedValue([{ name: 'English' }]);

            await service.sendPupilReadingTopicReleased(classTopic, parent, pupil, pupilParent, 20, 'magic-link-token');

            expect(saveNotification.mock.calls[0][1].params).toEqual(expect.objectContaining({ SUBJECTNAME: 'English' }));
        });

        // LEA-6568: as above, a reading topic released to a newly invited parent arrives without the teacher.
        it("names the class's main teacher when the class topic has no teacher relation loaded", async () => {
            getOne.mockResolvedValue({ mainTeacher: { nameForChildren: 'Mrs Smith' } });

            await service.sendPupilReadingTopicReleased(classTopic, parent, pupil, pupilParent, 20, 'magic-link-token');

            expect(saveNotification.mock.calls[0][1].params).toEqual(expect.objectContaining({ TEACHERALIAS: 'Mrs Smith' }));
        });

        it('still sends an empty alias when the class has no main teacher', async () => {
            getOne.mockResolvedValue({ mainTeacher: null });

            await service.sendPupilReadingTopicReleased(classTopic, parent, pupil, pupilParent, 20, 'magic-link-token');

            expect(saveNotification.mock.calls[0][1].params).toEqual(expect.objectContaining({ TEACHERALIAS: '' }));
        });
    });

    describe('schoolLeaderWelcomeEmail', () => {
        const leader = { id: '60', email: 'leader@example.com', getFullName: () => 'Lee Leader' } as unknown as LwpUser;

        const configureSpms = (spmEmails: string): void => {
            const spms = parseSpmEmails(spmEmails);

            configGet.mockImplementation((key: string) => (key === 'notification.spm_emails' ? spms : undefined));
        };

        const sendToSchoolTagged = (...tagNames: string[]): Promise<void> =>
            service.schoolLeaderWelcomeEmail(leader, {
                schoolTags: tagNames.map((name) => ({ tag: { name } }))
            } as unknown as LwpSchool);

        const spmParams = (): { SPM: string; SPMEMAIL: string } => saveNotification.mock.calls[0][1].params;

        const spmReplyTo = (): { email: string; name: string } => saveNotification.mock.calls[0][1].replyTo;

        const templateSignsOff = { SPM: 'School Partnership Manager', SPMEMAIL: null };

        beforeEach(() => {
            configureSpms('Amelia <amelia@learningwithparents.com>,Jo <jo@learningwithparents.com>');
        });

        it('signs the email off with the configured name and sends it from the address beside it', async () => {
            await sendToSchoolTagged('SPM: Joanne');

            expect(spmParams()).toEqual(expect.objectContaining({ SPM: 'Jo', SPMEMAIL: 'jo@learningwithparents.com' }));
        });

        it('replies to the SPM it is sent from, named from the same configured entry', async () => {
            await sendToSchoolTagged('SPM: Joanne');

            expect(spmReplyTo()).toEqual({ email: 'jo@learningwithparents.com', name: 'Jo' });
        });

        it.each(['SPM: Joanne', 'SPM: Amelia'])('addresses the Reply-To to whoever %s is sent from', async (tagName) => {
            await sendToSchoolTagged(tagName);

            expect(spmReplyTo().email).toBe(spmParams().SPMEMAIL);
        });

        it.each([
            ['the SPM tag names nobody configured', 'SPM: Catherine'],
            ['an ordinary tag holds the same letters', 'Johnson Primary']
        ])('leaves the Reply-To to the send when %s', async (_case, tagName) => {
            await sendToSchoolTagged(tagName);

            expect(spmReplyTo()).toBeNull();
        });

        it.each(['SPM: Joanne', 'spm: joanne', 'SPM:Joanne', '  SPM :  JOANNE  ', 'SPM: Joanne Smith', 'SPM: Team Jo'])(
            'finds the address in the tag %s',
            async (tagName) => {
                await sendToSchoolTagged(tagName);

                expect(spmParams()).toEqual(expect.objectContaining({ SPM: 'Jo', SPMEMAIL: 'jo@learningwithparents.com' }));
            }
        );

        it("picks the SPM tag out of the school's other tags", async () => {
            await sendToSchoolTagged('term1-rationale-emails', 'SPM: Amelia', 'money-skills');

            expect(spmParams()).toEqual(expect.objectContaining({ SPM: 'Amelia', SPMEMAIL: 'amelia@learningwithparents.com' }));
        });

        it('takes the first configured SPM when two of their addresses suit one tag', async () => {
            configureSpms('Jo <jo@learningwithparents.com>,Joanne <joanne@learningwithparents.com>');

            await sendToSchoolTagged('SPM: Joanne');

            expect(spmParams()).toEqual(expect.objectContaining({ SPM: 'Jo', SPMEMAIL: 'jo@learningwithparents.com' }));
        });

        it('takes the first configured SPM when a school carries two SPM tags', async () => {
            await sendToSchoolTagged('SPM: Joanne', 'SPM: Amelia');

            expect(spmParams()).toEqual(expect.objectContaining({ SPM: 'Amelia', SPMEMAIL: 'amelia@learningwithparents.com' }));
        });

        it('reads only `SPM:` tags, so an ordinary tag holding the same letters is ignored', async () => {
            await sendToSchoolTagged('Johnson Primary', 'Ameliorate');

            expect(spmParams()).toEqual(expect.objectContaining(templateSignsOff));
        });

        it('leaves the template to sign off and send when the SPM tag names nobody configured', async () => {
            await sendToSchoolTagged('SPM: Catherine');

            expect(spmParams()).toEqual(expect.objectContaining(templateSignsOff));
        });

        it('leaves the template to sign off and send when the school has no tags', async () => {
            await sendToSchoolTagged();

            expect(spmParams()).toEqual(expect.objectContaining(templateSignsOff));
        });

        it('leaves the template to sign off and send when no SPMs are configured', async () => {
            configureSpms('');

            await sendToSchoolTagged('SPM: Joanne');

            expect(spmParams()).toEqual(expect.objectContaining(templateSignsOff));
        });

        it('ignores configured entries that are not in the `Name <address>` format', async () => {
            configureSpms('jo@learningwithparents.com,Jo,<jo@learningwithparents.com>');

            await sendToSchoolTagged('SPM: Joanne');

            expect(spmParams()).toEqual(expect.objectContaining(templateSignsOff));
        });
    });

    describe('sendTeacherTopicToBeReleasedNextWeek', () => {
        const teacher = { email: 'teacher@example.com', firstname: 'Tess', lastname: 'Teacher', nameForChildren: 'Miss T' };
        const nextWeekTopic = (topic: Partial<StaticLwpTopic>, dueDate: string | null = '2026-09-28'): LwpClassTopic =>
            ({
                id: '10',
                class: { id: '20', name: 'Year 4 Oak', mainTeacher: teacher, school: { schoolName: 'Test School' } },
                topic: { teacherTopicName: 'Saving Up', parentTopicName: 'Saving', teacherEmailBody: 'Hello {{ class }}', ...topic },
                releaseDate: '2026-09-21',
                dueDate
            }) as unknown as LwpClassTopic;

        const sentParams = (): Record<string, unknown> => saveNotification.mock.calls[0][1].params;

        it('sends the file names and base URL for the template to build the links from, as the day-before email does', async () => {
            process.env.MINIO_PUBLIC_BASE_URL = 'http://files.test/public';

            await service.sendTeacherTopicToBeReleasedNextWeek(
                nextWeekTopic({ teacherResource: 'slides.pptx', teacherPdf: 'handouts.pdf' })
            );

            expect(sentParams()).toEqual(
                expect.objectContaining({
                    PUBLICFILES_BASEURL: 'http://files.test/public',
                    TEACHERRESOURCE_FILENAME: 'slides.pptx',
                    TEACHERPDF_FILENAME: 'handouts.pdf'
                })
            );
        });

        it('sends no PDF file name when the topic has no PDF', async () => {
            await service.sendTeacherTopicToBeReleasedNextWeek(nextWeekTopic({ teacherResource: 'slides.pptx', teacherPdf: undefined }));

            expect(sentParams().TEACHERPDF_FILENAME).toBeNull();
        });

        it('sends dates as YYYY-MM-DD whether they arrive as strings or Date objects', async () => {
            await service.sendTeacherTopicToBeReleasedNextWeek({
                ...nextWeekTopic({ teacherResource: 'slides.pptx' }),
                releaseDate: new Date(2026, 8, 21),
                dueDate: null
            } as unknown as LwpClassTopic);

            expect(sentParams()).toEqual(expect.objectContaining({ RELEASEDATE: '2026-09-21', DUEDATE: null }));
        });

        it("fills the class name into the topic's teacher email body and emails the main teacher", async () => {
            await service.sendTeacherTopicToBeReleasedNextWeek(nextWeekTopic({ teacherResource: 'slides.pptx' }));

            expect(saveNotification.mock.calls[0][0]).toBe(teacher);
            expect(sentParams()).toEqual(expect.objectContaining({ TOPICMESSAGE: 'Hello Year 4 Oak', TEACHERALIAS: 'Miss T' }));
        });
    });

    describe('sendTeacherMoneySkillsFirstTopicScheduled', () => {
        const leader = {
            id: '1',
            email: 'leader@example.com',
            firstname: 'Lee',
            lastname: 'Leader',
            nameForChildren: 'Mrs L',
            isSchoolLeader: true
        } as unknown as LwpUser;
        const mainTeacher = {
            id: '2',
            email: 'teacher@example.com',
            firstname: 'Tess',
            lastname: 'Teacher',
            nameForChildren: 'Miss T',
            isSchoolLeader: false
        } as unknown as LwpUser;

        const firstTopic = (topic: Partial<StaticLwpTopic> = {}): LwpClassTopic =>
            ({
                id: '10',
                class: { id: '20', name: 'Year 4 Oak', mainTeacher, school: { schoolName: 'Test School' } },
                topic: {
                    teacherTopicName: 'Saving Up',
                    parentTopicName: 'Saving',
                    teacherResource: 'resource.pptx',
                    teacherPdf: 'handouts.pdf',
                    isTeacherPdfRequired: true,
                    ...topic
                },
                releaseDate: '2026-09-21',
                dueDate: '2026-09-28'
            }) as unknown as LwpClassTopic;

        const sentParams = (call = 0): Record<string, unknown> => saveNotification.mock.calls[call][1].params;

        it('emails the given user the details of the class and topic', async () => {
            await service.sendTeacherMoneySkillsFirstTopicScheduled(leader, firstTopic());

            expect(saveNotification.mock.calls[0][0]).toBe(leader);
            expect(sentParams()).toEqual(
                expect.objectContaining({
                    SCHOOL: 'Test School',
                    CLASS: 'Year 4 Oak',
                    CLASSID: '20',
                    CLASSTOPICID: '10',
                    TOPICNAME: 'Saving Up',
                    PARENTTOPICNAME: 'Saving',
                    TEACHERALIAS: 'Mrs L'
                })
            );
        });

        it('sends the file names and base URL for the template to build the links from', async () => {
            process.env.MINIO_PUBLIC_BASE_URL = 'http://files.test/public';

            await service.sendTeacherMoneySkillsFirstTopicScheduled(leader, firstTopic());
            await service.sendTeacherMoneySkillsFirstTopicScheduled(
                leader,
                firstTopic({ teacherResource: undefined, teacherPdf: undefined, isTeacherPdfRequired: undefined })
            );

            expect(sentParams(0)).toEqual(
                expect.objectContaining({
                    PUBLICFILES_BASEURL: 'http://files.test/public',
                    TEACHERRESOURCE_FILENAME: 'resource.pptx',
                    TEACHERPDF_FILENAME: 'handouts.pdf',
                    TEACHERPDF_REQUIRED: true
                })
            );
            expect(sentParams(1)).toEqual(
                expect.objectContaining({ TEACHERRESOURCE_FILENAME: null, TEACHERPDF_FILENAME: null, TEACHERPDF_REQUIRED: false })
            );
        });

        it('sends dates as YYYY-MM-DD whether they arrive as strings or Date objects', async () => {
            await service.sendTeacherMoneySkillsFirstTopicScheduled(leader, {
                ...firstTopic(),
                releaseDate: new Date(2026, 8, 21),
                dueDate: null
            } as unknown as LwpClassTopic);

            expect(sentParams()).toEqual(expect.objectContaining({ RELEASEDATE: '2026-09-21', DUEDATE: null }));
        });

        it("tells the template whether the recipient is a school leader or the class's main teacher", async () => {
            await service.sendTeacherMoneySkillsFirstTopicScheduled(leader, firstTopic());
            await service.sendTeacherMoneySkillsFirstTopicScheduled(mainTeacher, firstTopic());

            expect(sentParams(0)).toEqual(expect.objectContaining({ ISSCHOOLLEADER: true, ISMAINTEACHER: false }));
            expect(sentParams(1)).toEqual(expect.objectContaining({ ISSCHOOLLEADER: false, ISMAINTEACHER: true }));
        });
    });
});
