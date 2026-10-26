import { HttpException } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { ImportStatus, PupilParentStatus, UserStatus } from 'lwp-shared';
import moment from 'moment';
import newrelic from 'newrelic/index';
import { AuthInfo, AuthorizeEndpoint, Public } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { LeaderOnly } from 'src/auth/authorizers/LeaderOnly';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import { DataImportService } from 'src/data-import/service/data-import.service';
import { Pagination } from 'src/paginate';
import { Repository } from 'typeorm';

import { AllFeedsOutput } from '../dtos/AllFeedsOutput';
import { DemoActivityFeedbackOutput } from '../dtos/DemoActivityFeedbackOutput';
import { ResyncWondeDataOutPut } from '../dtos/ResyncWondeDataOutPut';
import { UserResetPassword } from '../dtos/UserResetPassword';
import { LwpClassTopic } from '../entities/class_topic';
import { LwpDemoActivityFeedback } from '../entities/demo_activity_feedback';
import { LwpSchoolHoliday } from '../entities/lwp_school_holiday';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilParent } from '../entities/pupil_parent';
import { LwpPupilTopic } from '../entities/pupil_topic';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpPeriod } from '../entities/static_period';
import { LwpUser } from '../entities/user';
import {
    AdminAllFeedsFilterInput,
    AdminInput,
    EmailTemplateTypeForReminderEmail,
    EmailTemplateTypes,
    ErrorStatusCodeEnum,
    GetTagsByColorInput,
    notificationPreferenceEnum,
    PupilStatus,
    Search,
    SendNotificationInput,
    SendTestEmailOutput,
    TagsCategoryType,
    TagsColorOutput,
    TestEmailInput,
    UpdateAdminInput
} from '../model';
import { AdminService } from '../service/admin.service';
import { ClassTopicService } from '../service/class_topic.service';
import { HelperService } from '../service/helper.service';
import { LwpNotificationService } from '../service/lwp_notification.service';
import { NotificationService } from '../service/notification.service';
import { PupilTopicService } from '../service/pupil_topic.service';
import { TrophyService } from '../service/trophy.service';
import { WondeService } from '../service/wonde.service';

@Resolver(() => LwpUser)
export class AdminResolver {
    constructor(
        private adminService: AdminService,
        private notificationService: NotificationService,
        @InjectRepository(LwpClassTopic)
        private classTopicRepository: Repository<LwpClassTopic>,
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        @InjectRepository(LwpSchoolClass)
        private schoolClassRepository: Repository<LwpSchoolClass>,
        @InjectRepository(LwpSchool)
        private schoolRepository: Repository<LwpSchool>,
        @InjectRepository(LwpPupilTopic)
        private pupilTopicRepository: Repository<LwpPupilTopic>,
        @InjectRepository(LwpPupil)
        private pupilRepository: Repository<LwpPupil>,
        private wondeService: WondeService,
        private trophyService: TrophyService,
        private lwpNotificationService: LwpNotificationService,
        private helperService: HelperService,
        private classTopicService: ClassTopicService,
        private pupilTopicService: PupilTopicService,
        private dataImportService: DataImportService
    ) {}

    // the only people who can write any or create new params are global admins.
    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => UserResetPassword)
    async addAdmin(
        @Args({ name: 'input', type: () => AdminInput }) input: AdminInput,
        @AuthInfo('sub') userId: string
    ): Promise<UserResetPassword> {
        return await this.adminService.addAdmin(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => LwpUser)
    async updateAdmin(
        @Args({ name: 'input', type: () => UpdateAdminInput }) input: UpdateAdminInput,
        @AuthInfo('sub') userId: string
    ): Promise<LwpUser> {
        return await this.adminService.updateAdmin(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpUser])
    async getAdmins(): Promise<LwpUser[]> {
        return await this.adminService.getAdmins();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => UserResetPassword)
    async resetUserPassword(@Args('email') email: string, @AuthInfo('sub') userId: string): Promise<UserResetPassword> {
        return await this.adminService.resetUserPassword(email, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async adminReleasePupilTopics(@Args('date', { nullable: true }) date: Date): Promise<boolean> {
        return await this.adminService.adminReleasePupilTopics(date);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async syncSiteImages(): Promise<boolean> {
        return await this.adminService.syncSiteImages();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async trophiesAssignedToPupils(): Promise<boolean> {
        await this.trophyService.trophiesAssignedToPupils();

        return true;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => AllFeedsOutput)
    async getAllFeeds(
        @Args({ name: 'limit', nullable: true }) limit: number,
        @Args({ name: 'offset', nullable: true }) offset: number,
        @Args({ name: 'filter', nullable: true }) filter: AdminAllFeedsFilterInput
    ): Promise<AllFeedsOutput> {
        return this.adminService.getAllFeeds(limit, offset, filter);
    }

    @Public()
    @Query(() => DemoActivityFeedbackOutput)
    async getDemoActivityAllFeeds(
        @Args({ name: 'limit', nullable: true }) limit: number,
        @Args({ name: 'offset', nullable: true }) offset: number
    ): Promise<Pagination<LwpDemoActivityFeedback>> {
        return this.adminService.getDemoActivityAllFeeds(limit, offset);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [Search])
    async getSearchResults(@Args({ name: 'query' }) query: string): Promise<Search[]> {
        return this.adminService.getSearchResults(query);
    }

    private toBoolean(p: Promise<void>): Promise<boolean> {
        return p
            .then(() => true)
            .catch(() => {
                return false;
            });
    }

    private async getUser(email: string): Promise<LwpUser | null> {
        return email ? this.userRepository.findOne({ where: { email }, relations: ['school'] }) : null;
    }

    private async getUserByPhoneNumber(phoneNumber: string): Promise<LwpUser | null> {
        return phoneNumber
            ? this.userRepository.findOne({
                  where: { phoneNumber: this.helperService.formatPhoneNumber(phoneNumber) },
                  relations: ['school']
              })
            : null;
    }

    private async getSchool(schoolId: string): Promise<LwpSchool | null> {
        // The school leader welcome email reads its tags and academic year straight off these relations,
        // so without them SCHOOLTAGS is always empty and ACADEMICYEAR blank.
        return schoolId
            ? this.schoolRepository.findOne({ where: { id: schoolId }, relations: ['schoolTags', 'schoolTags.tag', 'curentPeriod'] })
            : null;
    }

    private async getSchoolCLass(schoolClassId: string): Promise<LwpSchoolClass | null> {
        return schoolClassId
            ? this.schoolClassRepository.findOne({ where: { id: schoolClassId }, relations: ['pupils', 'school', 'teachers'] })
            : null;
    }

    private async getPupil(pupilId: string): Promise<LwpPupil | null> {
        return pupilId
            ? this.pupilRepository.findOne({ where: { id: pupilId }, relations: ['classes', 'parents', 'classes.school'] })
            : null;
    }

    private async getPupilTopic(pupilTopicId: string): Promise<LwpPupilTopic | null> {
        return pupilTopicId
            ? this.pupilTopicRepository.findOne({
                  where: { id: pupilTopicId },
                  relations: ['activities', 'classTopic', 'classTopic.class', 'pupil', 'pupil.parents']
              })
            : null;
    }

    private async getClassTopic(classTopicId: string): Promise<LwpClassTopic | null> {
        return classTopicId
            ? this.classTopicRepository.findOne({
                  where: { id: classTopicId },
                  relations: [
                      'topic',
                      'topic.activities',
                      'class',
                      'class.pupils',
                      'class.school',
                      'class.pupils.allTopics',
                      'class.pupils.parents',
                      'class.mainTeacher',
                      'class.yearGroup',
                      'class.topics'
                  ]
              })
            : null;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async sendNotification(@Args({ name: 'input', type: () => SendNotificationInput }) input: SendNotificationInput): Promise<boolean> {
        const {
            type,
            classTopicId,
            invitedByEmail,
            pupilId,
            pupilTopicId,
            question,
            // resetPassToken,
            schoolClassId,
            schoolId,
            recipient
        } = input;

        const email = recipient?.includes('@') ? recipient : null;
        const phoneNumber = recipient?.includes('@') ? null : recipient;
        // academic year starts in September, e.g. 2026-08-19 -> index 2025, '2025-2026'
        const periodIndex = moment().subtract(8, 'months').year();
        const period = { index: periodIndex, shortName: `${periodIndex}-${periodIndex + 1}` } as StaticLwpPeriod;
        const schoolTags = [{ tag: { name: 'Test Tag' } }];

        const school =
            (await this.getSchool(schoolId)) ??
            ({
                schoolName: 'Test Email School',
                id: '1',
                periodIndex: 1,
                numOfTotalClassesAllowed: 10,
                numOfFullProgrammeClassesAllowed: 10,
                curentPeriod: period,
                importStatus: ImportStatus.COMPLETE,
                isReadyTeddyAvailable: true,
                schoolTags
            } as LwpSchool);

        const user =
            (await this.getUser(email)) ??
            (await this.getUserByPhoneNumber(phoneNumber)) ??
            ({
                firstname: 'Tom',
                lastname: 'Riddle',
                email,
                phoneNumber,
                type: UserType.PARENT,
                isEmailVerified: true,
                isPhoneVerified: true,
                userStatus: UserStatus.ACTIVE,
                notificationPreference: notificationPreferenceEnum.EMAILREMINDER,
                getFullName: (): string => 'Tom Riddle',
                lastInvitationEmailSent: new Date(),
                emailVerificationCode: '111111',
                phoneVerificationCode: '11111',
                nameForChildren: 'Lerry',
                school: school
            } as LwpUser);

        const invitedByUser =
            (await this.getUser(invitedByEmail)) ??
            ({
                firstname: 'Tom',
                lastname: 'Riddle',
                email,
                isEmailVerified: true,
                isPhoneVerified: true,
                phoneNumber,
                type: UserType.PARENT,
                userStatus: UserStatus.ACTIVE,
                notificationPreference: notificationPreferenceEnum.EMAILREMINDER,
                getFullName: () => 'Tom Riddle'
            } as LwpUser);
        const resetPassToken = 'testMagicLink';

        const schoolClass =
            (await this.getSchoolCLass(schoolClassId)) ??
            ({
                id: '123',
                name: 'Test Email Class',
                isFullProgramme: true,
                school: { schoolName: 'Test Email School' },
                pupils: [{ firstname: 'Lord', lastname: 'Voldmort', getFullName: (): string => 'Lord Voldmort' }]
            } as LwpSchoolClass);
        const pupil =
            (await this.getPupil(pupilId)) ??
            ({
                id: '41',
                firstname: 'Lord',
                lastname: 'Voldmort',
                getFullName: (): string => 'Lord Voldmort',
                getPupilStatus: (): Promise<PupilStatus> => Promise.resolve(PupilStatus.MISSING),
                school: { schoolName: 'Test Email School' },
                classes: [{ name: 'Test Email Class' }]
            } as LwpPupil);
        const pupilParent = {
            status: PupilParentStatus.ACTIVE,
            lastInvitationEmailSent: new Date(),
            pupil,
            parent: user
        } as LwpPupilParent;

        const classTopic =
            (await this.getClassTopic(classTopicId)) ??
            ({
                id: '1',
                class: {
                    id: '1',
                    name: 'Test Email Class',
                    mainTeacher: user,
                    school: {
                        schoolName: 'Test Email School'
                    }
                },
                releaseDate: new Date(),
                released: true,
                dueDate: new Date(),
                readingTarget: 2,
                topic: {
                    teacherTopicName: 'Test Topic',
                    parentTopicName: 'Test Topic',
                    teacherPdf: 'www.google.com',
                    teacherResource: 'test-slides.pptx',
                    isTeacherPdfRequired: true,
                    teacherEmailBody: 'This is body',
                    scrapbookPrompt: 'Test scrapbook prompt'
                }
            } as LwpClassTopic);

        const pupilTopic =
            (await this.getPupilTopic(pupilTopicId)) ??
            ({
                id: '1',
                classTopic: classTopic,
                topic: {
                    teacherTopicName: 'Test Topic',
                    parentTopicName: 'Test Topic'
                },
                releaseDate: new Date(),
                class: {
                    id: '1',
                    name: 'Test Email Class',
                    mainTeacher: user,
                    school: {
                        schoolName: 'Test Email School'
                    }
                }
            } as LwpPupilTopic);

        const schoolHoliday = {
            id: '1',
            holidayName: 'Example',
            startDate: new Date(),
            endDate: new Date()
        } as LwpSchoolHoliday;

        const message = 'Welcome to LWP';
        const teacherName = 'Ms Briganza';
        const schoolClassName = 'Test Email Class';
        const trophyName = 'Default Certificate';
        const myQuestion = 'Who are you?';

        switch (type) {
            case EmailTemplateTypes.adminInvitationEmail:
                return !!(
                    user &&
                    resetPassToken &&
                    (await this.toBoolean(this.notificationService.adminInvitationEmail(user, resetPassToken, resetPassToken, true)))
                );

            case EmailTemplateTypes.parentInvitationEmail:
                return !!(
                    user &&
                    resetPassToken &&
                    invitedByUser &&
                    (await this.toBoolean(
                        this.notificationService.parentInvitationEmail(
                            pupilParent,
                            resetPassToken,
                            resetPassToken,
                            phoneNumber ? 'phone' : 'email',
                            false,
                            true
                        )
                    ))
                );

            case EmailTemplateTypes.userRequestedSignUpLink:
                return !!(
                    user &&
                    (await this.toBoolean(
                        this.notificationService.userRequestedSignUpLink(user, resetPassToken, resetPassToken, null, false, true)
                    ))
                );

            case EmailTemplateTypes.schoolLeaderInvitationEmail:
                return !!(
                    user &&
                    resetPassToken &&
                    invitedByUser &&
                    school &&
                    (await this.toBoolean(
                        this.notificationService.schoolLeaderInvitationEmail(
                            user,
                            school,
                            resetPassToken,
                            resetPassToken,
                            invitedByUser,
                            true
                        )
                    ))
                );

            case EmailTemplateTypes.schoolLeaderWelcomeEmail:
                return !!(user && school && (await this.toBoolean(this.notificationService.schoolLeaderWelcomeEmail(user, school, true))));

            case EmailTemplateTypes.sendMailForTopicReminderAfter7Days:
                return !!(
                    pupilTopic &&
                    user &&
                    pupil &&
                    (await this.toBoolean(
                        this.notificationService.sendMailForTopicReminderAfter7Days(pupilTopic, user, pupil, false, resetPassToken, true)
                    ))
                );

            case EmailTemplateTypes.readingTopicReminderAfter5Days:
                return !!(
                    pupilTopic &&
                    user &&
                    pupil &&
                    (await this.toBoolean(
                        this.notificationService.readingTopicReminderAfter5Days(pupilTopic, user, pupil, false, resetPassToken, true)
                    ))
                );

            case EmailTemplateTypes.sendPupilTopics:
                return !!(
                    classTopic &&
                    user &&
                    pupil &&
                    (await this.toBoolean(
                        this.notificationService.sendPupilTopics(
                            classTopic,
                            user,
                            pupil,
                            pupilParent,
                            false,
                            pupilTopic,
                            resetPassToken,
                            resetPassToken,
                            resetPassToken,
                            EmailTemplateTypes.sendPupilTopics,
                            true
                        )
                    ))
                );

            case EmailTemplateTypes.sendPupilReadingTopicReleased:
                return !!(
                    classTopic &&
                    user &&
                    pupil &&
                    (await this.toBoolean(
                        this.notificationService.sendPupilReadingTopicReleased(
                            classTopic,
                            user,
                            pupil,
                            pupilParent,
                            5,
                            resetPassToken,
                            resetPassToken,
                            resetPassToken,
                            pupilTopic,
                            true
                        )
                    ))
                );

            case EmailTemplateTypes.sendQuestionToLwpStaff:
                return !!(
                    user &&
                    (await this.toBoolean(this.notificationService.sendQuestionToLwpStaff(user, question ?? myQuestion, null, true)))
                );

            case EmailTemplateTypes.sendQuestionToUser:
                return !!(user && (await this.toBoolean(this.notificationService.sendQuestionToUser(user, question ?? myQuestion, true))));

            case EmailTemplateTypes.sendResetPasswordEmail:
                return !!(
                    user &&
                    resetPassToken &&
                    (await this.toBoolean(this.notificationService.sendResetPasswordEmail(user, resetPassToken, null, true)))
                );

            case EmailTemplateTypes.sendTeacherAssignedToClass:
                return !!(
                    user &&
                    schoolClass &&
                    (await this.toBoolean(this.notificationService.sendTeacherAssignedToClass(user, schoolClass, true)))
                );

            case EmailTemplateTypes.sendTeacherTopicsToBeReleasedTomorrow:
                return !!(
                    classTopic && (await this.toBoolean(this.notificationService.sendTeacherTopicsToBeReleasedTomorrow(classTopic, true)))
                );

            case EmailTemplateTypes.sendTeacherTopicToBeReleasedNextWeek:
                return !!(
                    classTopic && (await this.toBoolean(this.notificationService.sendTeacherTopicToBeReleasedNextWeek(classTopic, true)))
                );

            case EmailTemplateTypes.sendTeacherMoneySkillsFirstTopicScheduled:
                return !!(
                    user &&
                    classTopic &&
                    (await this.toBoolean(this.notificationService.sendTeacherMoneySkillsFirstTopicScheduled(user, classTopic, true)))
                );

            case EmailTemplateTypes.sendTeacherReadingTopicEnd:
                return !!(classTopic && (await this.toBoolean(this.notificationService.sendTeacherReadingTopicEnd(classTopic, true))));

            case EmailTemplateTypes.sendTrophyMailToParent:
                return !!(
                    user &&
                    (await this.toBoolean(
                        this.notificationService.sendTrophyMailToParent(user, pupil, message, trophyName, resetPassToken, true)
                    ))
                );

            case EmailTemplateTypes.sendTrophyMailToTeacher:
                return !!(
                    user &&
                    (await this.toBoolean(
                        this.notificationService.sendTrophyMailToTeacher(user, message, schoolClassName, schoolClass?.id, trophyName, true)
                    ))
                );

            case EmailTemplateTypes.readingTopicReminderAfter2Days:
                return !!(
                    user &&
                    (await this.toBoolean(
                        this.notificationService.readingTopicReminderAfter2Days(pupilTopic, user, pupil, false, resetPassToken, true)
                    ))
                );

            case EmailTemplateTypes.teacherInvitationEmail:
                return !!(
                    user &&
                    school &&
                    resetPassToken &&
                    invitedByUser &&
                    (await this.toBoolean(
                        this.notificationService.teacherInvitationEmail(user, school, resetPassToken, resetPassToken, invitedByUser, true)
                    ))
                );

            case EmailTemplateTypes.sendParentNotificationOfTeacherReadingComment:
                return !!(
                    user &&
                    resetPassToken &&
                    (await this.toBoolean(
                        this.notificationService.sendParentNotificationOfTeacherReadingComment(
                            user,
                            pupil,
                            classTopic,
                            pupilTopic,
                            new Date(),
                            'Test mail from admin',
                            resetPassToken,
                            null,
                            false,
                            true,
                            1
                        )
                    ))
                );

            case EmailTemplateTypes.sendParentNotificationOfTeacherFeedbackReply:
                return !!(
                    user &&
                    (await this.toBoolean(
                        this.notificationService.sendParentNotificationOfTeacherFeedbackReply(
                            user,
                            pupil,
                            1,
                            'Testing Comment',
                            teacherName,
                            false,
                            'Dragon',
                            'Testing Activity',
                            null,
                            false,
                            true
                        )
                    ))
                );

            case EmailTemplateTypes.invoiceOfSchoolClassLicenceToAdmin:
                return !!(
                    user &&
                    (await this.toBoolean(
                        this.notificationService.invoiceOfSchoolClassLicenceToAdmin(
                            user?.email,
                            user?.firstname,
                            {
                                FIRSTNAME: user?.firstname,
                                LASTNAME: user?.lastname,
                                EMAIL: user?.email,
                                ADDITIONALFULLPROGRAMMECLASSCOUNT: 0,
                                ADDITIONALREADINGONLYCLASSCOUNT: 0,
                                ADDITIONALUPGRADECLASSCOUNT: 0,
                                ADDITIONALFULLPROGRAMMECLASSPRICE: 0,
                                ADDITIONALREADINGONLYCLASSPRICE: 0,
                                ADDITIONALUPGRADECLASSPRICE: 0,
                                ADDITIONALREADYTEDDYCLASSCOUNT: 0,
                                ADDITIONALREADYTEDDYCLASSPRICE: 0,
                                TOTALPRICE: 0,
                                SCHOOLID: 1,
                                SCHOOLNAME: 'Test School'
                            },
                            true
                        )
                    ))
                );

            case EmailTemplateTypes.invoiceOfSchoolClassLicenceToSchool:
                return !!(
                    user &&
                    (await this.toBoolean(
                        this.notificationService.invoiceOfSchoolClassLicenceToSchool(
                            user?.email,
                            user?.firstname,
                            {
                                FIRSTNAME: user?.firstname,
                                LASTNAME: user?.lastname,
                                EMAIL: user?.email,
                                ADDITIONALFULLPROGRAMMECLASSCOUNT: 0,
                                ADDITIONALREADINGONLYCLASSCOUNT: 0,
                                ADDITIONALUPGRADECLASSCOUNT: 0,
                                ADDITIONALFULLPROGRAMMECLASSPRICE: 0,
                                ADDITIONALREADINGONLYCLASSPRICE: 0,
                                ADDITIONALUPGRADECLASSPRICE: 0,
                                ADDITIONALREADYTEDDYCLASSCOUNT: 0,
                                ADDITIONALREADYTEDDYCLASSPRICE: 0,
                                TOTALPRICE: 0,
                                SCHOOLID: 1,
                                SCHOOLNAME: 'Test School'
                            },
                            true
                        )
                    ))
                );

            case EmailTemplateTypes.sendTeacherReadingTopicHolidayOverlap:
                return !!(
                    user &&
                    (await this.toBoolean(
                        this.notificationService.sendTeacherReadingTopicHolidayOverlap(user, schoolClass, classTopic, schoolHoliday, true)
                    ))
                );

            case EmailTemplateTypes.sendLwpTeamMoneySkillsActivationEmail:
                return !!(
                    user && (await this.toBoolean(this.notificationService.sendLwpTeamMoneySkillsActivationEmail(user, school, true, null)))
                );

            case EmailTemplateTypes.updatedMagicLink:
                return !!(
                    classTopic &&
                    user &&
                    pupil &&
                    (await this.toBoolean(
                        this.notificationService.sendUpdatedMagicLink(
                            classTopic,
                            user,
                            pupil,
                            pupilParent,
                            pupilTopic,
                            resetPassToken,
                            resetPassToken,
                            resetPassToken,
                            true
                        )
                    ))
                );

            default:
                throw new HttpException('Type not supported', 400);
        }
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => SendTestEmailOutput)
    public async sendTestEmail(@Args({ name: 'input', type: () => TestEmailInput }) input: TestEmailInput): Promise<SendTestEmailOutput> {
        const output: SendTestEmailOutput = { response: 'Failed', status: ErrorStatusCodeEnum._535 };

        try {
            await this.lwpNotificationService.sendTestEmail(input);
            output.response = 'Success';
            output.status = 200;

            return output;
        } catch (e) {
            throw new HttpException(e?.details ?? e?.response ?? output.response, ErrorStatusCodeEnum._535);
        }
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    public async deleteWondeData(@Args('lwpSchoolId') lwpSchoolId: string): Promise<boolean> {
        // It will delete old wonde data associated with $lwpSchool
        await this.wondeService.deleteWondeData(lwpSchoolId, true);

        return true;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    public async removeWondeAndUnusedLwpDataFromWonde(@Args('lwpSchoolId') lwpSchoolId: string): Promise<boolean> {
        // It will delete old wonde data associated with $lwpSchool and any unused data related to wonde in lwp tables
        return await this.wondeService.removeWondeAndUnusedLwpDataFromWonde(lwpSchoolId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    public async removeWondeSchoolId(@Args('lwpSchoolId') lwpSchoolId: string): Promise<boolean> {
        return await this.wondeService.removeWondeSchoolId(lwpSchoolId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    public async resetUsersSavedPermissions(): Promise<boolean> {
        return await this.adminService.resetUsersSavedPermissions();
    }

    // First Mutation
    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    public async pullWondeSchoolData(
        @Args('wondeSchoolId') wondeSchoolId: string,
        @Args('lwpSchoolId') lwpSchoolId: string,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        wondeSchoolId = wondeSchoolId?.trim();

        // Checked before the import is fired off below, so the admin sees the error.
        await this.wondeService.assertWondeIdAvailable(wondeSchoolId, lwpSchoolId);

        const isDataImportReviewRequired = await this.dataImportService.isReviewRequiredForSchool(lwpSchoolId);

        const service = isDataImportReviewRequired ? this.dataImportService : this.wondeService;

        // In the current model for running this call, we deliberately run it
        // in a promise that is left pending after the HTTP response returns
        // to the user to tell them that this is happening.
        // Of course, this is not a good way of doing this, but it is the currently-
        // used way of doing it.
        // TODO change! Should be on a worker process
        void service.importWondeSchoolData(wondeSchoolId, lwpSchoolId, userId).catch((e) => {
            newrelic.noticeError(e, {
                caught: true,
                handled: false,
                lwpSchoolId: lwpSchoolId,
                wondeSchoolId: wondeSchoolId,
                adminPanelRequested: true
            });
        });
        // this.wondeService.deleteNonActiveLwpClasses(lwpSchoolId);

        return true;
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Write, 'schoolId'])
    @Mutation(() => ResyncWondeDataOutPut)
    public async resyncWondeData(
        @Args('wondeSchoolId') wondeSchoolId: string,
        @Args('schoolId') schoolId: string,
        @AuthInfo('sub') userId: string
    ): Promise<ResyncWondeDataOutPut> {
        const isDataImportReviewRequired = await this.dataImportService.isReviewRequiredForSchool(schoolId);

        const service = isDataImportReviewRequired ? this.dataImportService : this.wondeService;

        try {
            await service.importWondeSchoolData(wondeSchoolId, schoolId, userId);
        } catch (e) {
            newrelic.noticeError(e, {
                caught: true,
                handled: false,
                lwpSchoolId: schoolId,
                wondeSchoolId: wondeSchoolId,
                adminPanelRequested: true
            });
        }

        const school = await this.schoolRepository.findOne({
            where: { id: schoolId },
            select: ['importStatus', 'lastImportedAt']
        });

        return {
            importStatus: school?.importStatus,
            lastImportedAt: school?.lastImportedAt
        };
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    public async reimportCachedData(
        @Args('wondeSchoolId') wondeSchoolId: string,
        @Args('lwpSchoolId') lwpSchoolId: string,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        const isDataImportReviewRequired = await this.dataImportService.isReviewRequiredForSchool(lwpSchoolId);

        const service = isDataImportReviewRequired ? this.dataImportService : this.wondeService;

        await service.reLinkingLwpWithWonde(wondeSchoolId, lwpSchoolId, userId).catch(async (e) => {
            await this.schoolRepository.update(
                { id: lwpSchoolId },
                {
                    lastImportedAt: new Date(),
                    importStatus: ImportStatus.FAILED
                }
            );

            newrelic.noticeError(e, {
                caught: true,
                handled: false,
                lwpSchoolId: lwpSchoolId,
                wondeSchoolId: wondeSchoolId,
                adminPanelRequested: true
            });
        });

        /**
         * If data import review is required, the import status will be updated to one of:
         * LINKING_PUPILS, LINKING_CLASSES, DIFFING_ENTITIES, or COMPLETE
         * within the "processImportedData" service.
         *
         * If data import review is not required, the legacy service is used instead,
         * and the import status is set directly to COMPLETE after reimporting the data.
         */

        if (!isDataImportReviewRequired) {
            await this.schoolRepository.update(
                { id: lwpSchoolId },
                {
                    lastImportedAt: new Date(),
                    importStatus: ImportStatus.COMPLETE
                }
            );
        }

        return true;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    public async sendReminderEmails(
        @Args('scheduleDate') scheduleDate: Date,
        @Args('type', { type: () => EmailTemplateTypeForReminderEmail }) type: EmailTemplateTypeForReminderEmail
    ): Promise<boolean> {
        switch (type) {
            case EmailTemplateTypeForReminderEmail.sendTeacherReadingTopicEnd:
                return this.classTopicService.sendTeacherReadingTopicEnd(scheduleDate);

            case EmailTemplateTypeForReminderEmail.readingTopicReminderAfter5Days:
                return this.pupilTopicService.readingTopicReminders(scheduleDate);

            case EmailTemplateTypeForReminderEmail.readingTopicReminderAfter2Days:
                return this.pupilTopicService.readingTopicReminders(scheduleDate);

            case EmailTemplateTypeForReminderEmail.sendMailForTopicReminderAfter7Days:
                return this.pupilTopicService.topicReminderAfter7Days(scheduleDate);

            default:
                throw new HttpException('Type not supported', 400);
        }
    }

    private validateTeacherInputForTags(userType: UserType, category: TagsCategoryType, schoolId: string): void {
        if (userType === UserType.TEACHER && (!schoolId || category !== TagsCategoryType.PUPIL_TAG)) {
            throw new HttpException('Invalid category or missing school ID for teacher', 400);
        }
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchool, OpType.Read, 'schoolId', { optional: true }])
    @Query(() => [TagsColorOutput])
    async getTagsByColor(
        @Args('input', { type: () => GetTagsByColorInput }) input: GetTagsByColorInput,
        @AuthInfo('userType') userType: UserType
    ): Promise<TagsColorOutput[]> {
        this.validateTeacherInputForTags(userType, input.category, input.schoolId);

        return await this.adminService.getTagsByColor(input);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchool, OpType.Read, 'schoolId', { optional: true }])
    @Query(() => [TagsColorOutput])
    async getRecentAddedColors(
        @Args('category', { type: () => TagsCategoryType }) category: TagsCategoryType,
        @Args('schoolId', { nullable: true }) schoolId: string,
        @AuthInfo('userType') userType: UserType
    ): Promise<TagsColorOutput[]> {
        this.validateTeacherInputForTags(userType, category, schoolId);

        return await this.adminService.getRecentAddedColors(category, schoolId);
    }
}
