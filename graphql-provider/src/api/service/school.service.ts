import { HttpService } from '@nestjs/axios';
import {
    BadRequestException,
    ConflictException,
    forwardRef,
    HttpException,
    Inject,
    Injectable,
    UnprocessableEntityException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosResponse } from 'axios';
import { FileUpload } from 'graphql-upload';
import { ImportStatus, InviteMode, PupilParentStatus, SubjectProgrammeType, UserStatus } from 'lwp-shared';
import newrelic from 'newrelic/index';
import { map } from 'rxjs/operators';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { UsersService } from 'src/auth/service/user.service';
import { UserType } from 'src/auth/types/UserType';
import { Mail } from 'src/common/notification/notification.types';
import { appConstants } from 'src/constants';
import { DataImportService } from 'src/data-import/service/data-import.service';
import { type EntityManager, getManager, In, Repository, SelectQueryBuilder } from 'typeorm';

import { SchoolAwaitingWelcome } from '../dtos/SchoolAwaitingWelcome';
import { SchoolLeaderAwaitingWelcome } from '../dtos/SchoolLeaderAwaitingWelcome';
import { SchoolResourceStatus } from '../dtos/SchoolResourceStatus';
import { SendWelcomeEmailsResult, WelcomeEmailFailure } from '../dtos/SendWelcomeEmailsResult';
import { SpmSchoolsOutput } from '../dtos/SpmSchoolsOutput';
import { ImportedSchool } from '../entities/imported_school';
import { LogLwpPupilClassChange } from '../entities/log_lwp_pupil_class_change';
import { LogSchoolClassLicense } from '../entities/log_school_class_license';
import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { LwpSchoolDates } from '../entities/lwp_school_dates';
import { LwpSchoolImpactReport } from '../entities/lwp_school_impact_report';
import { LwpPupil } from '../entities/pupil';
import { LwpSchool } from '../entities/school';
import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { LwpUser } from '../entities/user';
import {
    EmailTemplateTypes,
    ErrorStatusCodeEnum,
    FeedbackType,
    GetSchoolsForSchoolOverviewInput,
    OperationStatus,
    PupilWithoutClassCounts,
    PurchaseAdditionalClassLicencesInput,
    SchoolClassLicenceOperationType,
    SchoolClassStatus,
    SchoolInput,
    SchoolSubjectType,
    SpmEngagementMetric,
    SpmSchoolData,
    TeacherInput,
    TeacherRole,
    UninvitedStaff,
    UpdateParentFeedbackFeatureForSchoolInput,
    UpdateSchoolClassLicenceInput,
    UpdateSchoolInput,
    UpdateSocialLoginPermissionsInput
} from '../model';
import { PupilClassActionType } from '../types/PupilClassActionType';
import { UKRegions } from '../types/UKRegions';
import { HelperService } from './helper.service';
import { LogSchoolClassLicenseService } from './log_class_license.service';
import { LwpDataQueryService } from './lwp_data_query.service';
import { LwpSchoolHolidayService } from './lwp_school_holiday.service';
import { LwpSchoolStaticTagService } from './lwp_school_static_tag.service';
import { NotificationService } from './notification.service';
import { ParameterService } from './parameter.service';
import { PupilService } from './pupil.service';
import { QueryBaseService } from './query_base.service';
import { SchoolClassService } from './school_class.service';
import { StaticLwpFeaturesService } from './static_lwp_features.service';
import { StaticLwpPeriodService } from './static_period.service';
import { TeacherService } from './teacher.service';
import { WondeService } from './wonde.service';

type PurchaseLicenceParams = {
    FIRSTNAME?: string;
    LASTNAME?: string;
    EMAIL: string;
    ADDITIONALFULLPROGRAMMECLASSCOUNT: number;
    ADDITIONALREADINGONLYCLASSCOUNT: number;
    ADDITIONALUPGRADECLASSCOUNT: number;
    ADDITIONALFULLPROGRAMMECLASSPRICE: number;
    ADDITIONALREADINGONLYCLASSPRICE: number;
    ADDITIONALUPGRADECLASSPRICE: number;
    ADDITIONALREADYTEDDYCLASSCOUNT: number;
    ADDITIONALREADYTEDDYCLASSPRICE: number;
    TOTALPRICE: number;
    SCHOOLID: string;
    SCHOOLNAME: string;
    USEREMAIL: string;
    USERID: string;
    USERFIRSTNAME: string;
    USERLASTNAME: string;
    USERALIAS?: string;
    ADDITIONALEMAILS?: string;
};

type SpmSchoolsPagination = {
    limit: number;
    offset: number;
};

const DEFAULT_SPM_PAGE_LIMIT = 25;

@Injectable()
export class SchoolService {
    constructor(
        @InjectRepository(LwpSchool)
        private schoolRepository: Repository<LwpSchool>,
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        @InjectRepository(LogSchoolClassLicense)
        private schoolClassLicenceRepository: Repository<LogSchoolClassLicense>,
        @InjectRepository(LwpPupilFeedback)
        private pupilFeedbackRepository: Repository<LwpPupilFeedback>,
        @InjectRepository(ImportedSchool)
        private importedSchoolRepository: Repository<ImportedSchool>,
        @InjectRepository(StaticLwpSchoolTag)
        private staticLwpTopicSchoolRepository: Repository<StaticLwpSchoolTag>,
        @InjectRepository(LwpSchoolImpactReport)
        private schoolImpactRepository: Repository<LwpSchoolImpactReport>,
        @InjectRepository(LwpSchoolDates)
        private schoolDatesRepository: Repository<LwpSchoolDates>,
        @InjectRepository(LwpPupil)
        private pupilRepository: Repository<LwpPupil>,
        @InjectRepository(LogLwpPupilClassChange)
        private logPupilClassChangeRepository: Repository<LogLwpPupilClassChange>,
        private schoolHolidayService: LwpSchoolHolidayService,
        private helperService: HelperService,
        private queryBaseService: QueryBaseService,
        private schoolClassLicenseService: LogSchoolClassLicenseService,
        private teacherService: TeacherService,
        private periodService: StaticLwpPeriodService,
        private userService: UsersService,
        private schoolClassService: SchoolClassService,
        private parameterService: ParameterService,
        private notificationService: NotificationService,
        private wondeService: WondeService,
        private shallowUserService: ShallowUserService,
        private lwpSchoolStaticTagService: LwpSchoolStaticTagService,
        private featuresService: StaticLwpFeaturesService,
        private dataQueryService: LwpDataQueryService,
        @Inject(forwardRef(() => PupilService))
        private pupilService: PupilService,
        private dataImportService: DataImportService,
        private httpService: HttpService
    ) {}

    entityManager = getManager();

    public async addSchool(input: SchoolInput, file: FileUpload[], invitedBy: string | LwpUser): Promise<LwpSchool> {
        const { schoolName, leader, email, google, microsoft, fullProgrammedClassesAllowed, classesAllowed } = input;
        const schoolLeader = new TeacherInput();
        const school = new LwpSchool();
        const currentPeriod = await this.periodService.getCurrentPeriod();
        const socialLoginPermissionsStringified = JSON.stringify({ email, google, microsoft });

        const existingLeader = await this.userRepository.findOne({ where: { email: leader.email }, relations: ['school'] });

        if (existingLeader && existingLeader?.school) {
            throw new HttpException(`School leader is already associated with another school.`, ErrorStatusCodeEnum._535);
        }

        const shallowUser = this.shallowUserService.newShallowUser(invitedBy);

        school.schoolName = schoolName;
        school.curentPeriod = currentPeriod ? currentPeriod : null;
        school.socialLoginPermissions = JSON.parse(socialLoginPermissionsStringified);
        school.numOfFullProgrammeClassesAllowed = fullProgrammedClassesAllowed;
        school.numOfTotalClassesAllowed = classesAllowed;
        school.urn = input?.urn ?? null;
        school.logCreatedBy = shallowUser;
        school.logUpdatedBy = shallowUser;

        if (file && file.filter((f) => f).length) {
            const fileUploads = await Promise.all(file);

            const filename = `${new Date().getTime()}_${fileUploads[0].filename}`;

            await this.helperService.uploadFile(`${appConstants.minioPaths.public.schoolLogoImage}/${filename}`, fileUploads[0], true);
            school.logo = filename;
        }

        const createdSchool = await this.schoolRepository.save(school);

        await this.schoolClassLicenseService.addLogSchoolClassLicense(
            {
                fullProgrammeClassCount: fullProgrammedClassesAllowed,
                totalClassCount: classesAllowed,
                totalPrice: 0,
                schoolId: createdSchool?.id,
                operationType: SchoolClassLicenceOperationType.SCHOOL_CREATED,
                fullProgrammeClassPrice: null,
                readingOnlyClassPrice: null,
                requestedFullProgrammeClassCount: null,
                requestedReadingOnlyClassCount: null,
                requestedUpgradeClassCount: null,
                readyTeddyClassPrice: null,
                requestedReadyTeddyClassCount: null,
                readyTeddyClassCount: null
            },
            shallowUser
        );

        const schoolHolidays = await this.schoolHolidayService.allReleasedSchoolHolidays();

        if (schoolHolidays?.length > 0) {
            for (const schoolHoliday of schoolHolidays) {
                await this.schoolHolidayService.addSchoolHoliday(
                    {
                        holidayName: schoolHoliday?.holidayName,
                        startDate: schoolHoliday?.startDate,
                        endDate: schoolHoliday?.endDate,
                        periodIndex: schoolHoliday?.period?.index?.toString(),
                        schoolId: school?.id
                    },
                    invitedBy
                );
            }
        }

        schoolLeader.firstname = leader.firstname;
        schoolLeader.lastname = leader.lastname;
        schoolLeader.email = leader.email;
        schoolLeader.nameForChildren = leader.nameForChildren;
        schoolLeader.role = TeacherRole.SCHOOL_LEADER;
        schoolLeader.schoolId = createdSchool.id;
        // The leader's invite mode drives whether/when they are invited (addTeacher handles the send).
        // TODO(LEA-6305): `sendInvite` is only passed as the transitional fallback for the shim in addTeacher;
        // remove this line once the shim is gone.
        schoolLeader.sendInvite = leader.sendInvite;
        schoolLeader.inviteMode = leader.inviteMode;

        await this.teacherService.addTeacher(schoolLeader, shallowUser.id);

        return createdSchool;
    }

    private async notifyLwpTeamOfMoneySkillsActivation(userDetails: LwpUser, schoolDetails: LwpSchool): Promise<void> {
        try {
            const teacherSupportEmail = (await this.parameterService.getParameterByKey('TEACHER_SUPPORT_EMAIL'))?.value ?? '';

            await this.notificationService.sendLwpTeamMoneySkillsActivationEmail(userDetails, schoolDetails, true, teacherSupportEmail);
        } catch (err) {
            newrelic.noticeError(err, { caught: true, handled: false });
        }
    }

    public async updateSchool(input: UpdateSchoolInput, file: FileUpload[], userId: string): Promise<LwpSchool> {
        try {
            const school = await this.schoolRepository.findOne({ where: { id: input.id } });

            const updatedBy = this.shallowUserService.newShallowUser(userId);

            if (!school) throw new HttpException('School not found.', ErrorStatusCodeEnum._535);

            school.schoolName = input?.schoolName;
            school.isTestSchool = input?.isTestSchool;
            school.enableAddClasses = input?.enableAddClasses;
            school.skipAutoWondeImport = input?.skipAutoWondeImport;
            school.inactive = input?.inactive;
            school.ignoreAcademicYearCheckDuringImport = input?.ignoreAcademicYearCheckDuringImport;
            school.organisations = input?.organisations;
            school.termsAndConditions = input?.termsAndConditions;
            school.privacyPolicy = input?.privacyPolicy;
            school.logUpdatedBy = updatedBy;

            const isMoneySkillsAlreadyAvailable = school.isMoneySkillsAvailable;

            school.isMoneySkillsAvailable = input?.isMoneySkillsAvailable;
            school.isReadyTeddyAvailable = input?.isReadyTeddyAvailable;

            await this.lwpSchoolStaticTagService.addTagsInSchool(school, input?.tags, updatedBy);

            if (input?.urn) school.urn = input?.urn;

            if (school.logo && !input.hasImage) {
                await this.helperService.removeFile(`${appConstants.minioPaths.public.schoolLogoImage}/${school.logo}`, true);
                school.logo = null;
            }

            if (file && file.filter((f) => f).length) {
                const fileUploads = await Promise.all(file);

                const filename = `${new Date().getTime()}_${fileUploads[0].filename}`;

                await this.helperService.uploadFile(`${appConstants.minioPaths.public.schoolLogoImage}/${filename}`, fileUploads[0], true);
                school.logo = filename;
            }

            const updatedSchool = await this.schoolRepository.save(school);

            if (!isMoneySkillsAlreadyAvailable && updatedSchool?.isMoneySkillsAvailable) {
                const userDetails = await this.userRepository.findOne(userId, {
                    select: ['firstname', 'lastname', 'nameForChildren', 'email']
                });

                await this.notifyLwpTeamOfMoneySkillsActivation(userDetails, updatedSchool);
            }

            return updatedSchool;
        } catch (err) {
            if (err?.constraint?.includes('idx_unique_school_isprogramtag')) {
                throw new HttpException(
                    'This school is already linked to a tag with a partner program. Each school can only have one such tag. Please choose a different tag or update the existing association',
                    ErrorStatusCodeEnum._535
                );
            }

            throw err; // Re-throw if it's an unexpected error
        }
    }

    public async updateSocialLoginPermissions(input: UpdateSocialLoginPermissionsInput): Promise<boolean> {
        const { id, email, google, microsoft, tenantDomain, msTenantIssuer } = input;

        if (microsoft && tenantDomain && !msTenantIssuer)
            throw new BadRequestException('Microsoft-enabled restricted tenants must have a Microsoft tenant domain');

        await this.schoolRepository.update({ id }, { socialLoginPermissions: { email, google, microsoft }, tenantDomain, msTenantIssuer });

        return true;
    }

    public async updateSchoolClassLicence(
        input: UpdateSchoolClassLicenceInput,
        userId: string,
        periodIndex?: string,
        manager?: EntityManager
    ): Promise<boolean> {
        await (manager?.getRepository(LwpSchool) ?? this.schoolRepository).update(
            { id: input.schoolId },
            {
                numOfFullProgrammeClassesAllowed: input.fullProgrammedClassesAllowed,
                numOfTotalClassesAllowed: input.classesAllowed
            }
        );

        await this.schoolClassLicenseService.addLogSchoolClassLicense(
            {
                schoolId: input.schoolId,
                operationType: SchoolClassLicenceOperationType.SET_BY_ADMIN,
                fullProgrammeClassCount: input.fullProgrammedClassesAllowed,
                totalClassCount: input.classesAllowed,
                readyTeddyClassCount: null,
                requestedFullProgrammeClassCount: null,
                requestedReadingOnlyClassCount: null,
                requestedUpgradeClassCount: null,
                fullProgrammeClassPrice: 0,
                readingOnlyClassPrice: 0,
                totalPrice: 0,
                readyTeddyClassPrice: null,
                requestedReadyTeddyClassCount: null
            },
            this.shallowUserService.newShallowUser(userId),
            periodIndex,
            manager
        );

        return true;
    }

    public async purchaseAdditionalClassLicences(
        input: PurchaseAdditionalClassLicencesInput,
        userId: string,
        isAdmin: boolean
    ): Promise<boolean> {
        const {
            emails,
            fullProgrammeClassesCount,
            totalClassCount,
            schoolId,
            totalPrice,
            fullProgrammeClassPrice,
            readingOnlyClassPrice,
            requestedFullProgrammeClassCount,
            requestedReadingOnlyClassCount,
            requestedUpgradeClassCount,
            readyTeddyClassesCount,
            requestedReadyTeddyClassCount,
            readyTeddyClassPrice
        } = input;

        const isReadyTeddyEnabled = await this.featuresService.isReadyTeddyEnabledForSchool(input.schoolId);

        if (!isReadyTeddyEnabled && !isAdmin && readyTeddyClassesCount > 0)
            throw new HttpException(
                'Ready Teddy is not enabled for this school, you cannot set a limit for ready teddy classes',
                ErrorStatusCodeEnum._535
            );

        const updateData: Partial<LwpSchool> = {
            numOfFullProgrammeClassesAllowed: fullProgrammeClassesCount,
            numOfTotalClassesAllowed: totalClassCount
        };

        const school = await this.schoolRepository.findOne({ where: { id: schoolId }, select: ['schoolName', 'isReadyTeddyAvailable'] });

        if (!school.isReadyTeddyAvailable && input?.readyTeddyClassesCount != null && input?.readyTeddyClassesCount > 0) {
            updateData.isReadyTeddyAvailable = true;
        }

        await this.schoolRepository.update({ id: schoolId }, updateData);

        const user = await this.userRepository.findOne(userId);

        const schoolClassLicenceLog = await this.schoolClassLicenseService.addLogSchoolClassLicense(
            {
                schoolId: schoolId,
                operationType: SchoolClassLicenceOperationType.UPDATED_BY_SCHOOL,
                fullProgrammeClassCount: fullProgrammeClassesCount,
                totalClassCount: totalClassCount,
                requestedFullProgrammeClassCount,
                requestedReadingOnlyClassCount,
                requestedUpgradeClassCount,
                fullProgrammeClassPrice,
                readingOnlyClassPrice,
                totalPrice,
                readyTeddyClassCount: readyTeddyClassesCount,
                readyTeddyClassPrice,
                requestedReadyTeddyClassCount
            },
            user
        );

        const purchaseLicenceAdminEmailParameter = await this.parameterService.getParameterByKey('ADMIN_EMAIL_FOR_PURCHASE_LICENCE');

        const params: PurchaseLicenceParams = {
            FIRSTNAME: null,
            LASTNAME: null,
            EMAIL: purchaseLicenceAdminEmailParameter?.value,
            ADDITIONALFULLPROGRAMMECLASSCOUNT: schoolClassLicenceLog?.requestedFullProgrammeClassCount ?? 0,
            ADDITIONALREADINGONLYCLASSCOUNT: schoolClassLicenceLog?.requestedReadingOnlyClassCount ?? 0,
            ADDITIONALUPGRADECLASSCOUNT: schoolClassLicenceLog?.requestedUpgradeClassCount ?? 0,
            ADDITIONALFULLPROGRAMMECLASSPRICE: schoolClassLicenceLog?.fullProgrammeClassPrice ?? 0,
            ADDITIONALREADINGONLYCLASSPRICE: schoolClassLicenceLog?.readingOnlyClassPrice ?? 0,
            ADDITIONALUPGRADECLASSPRICE:
                (schoolClassLicenceLog?.fullProgrammeClassPrice ?? 0) - (schoolClassLicenceLog?.readingOnlyClassPrice ?? 0),
            TOTALPRICE: schoolClassLicenceLog?.totalPrice ?? 0,
            ADDITIONALREADYTEDDYCLASSCOUNT:
                isReadyTeddyEnabled && !school.isReadyTeddyAvailable ? schoolClassLicenceLog?.requestedReadyTeddyClassCount : 0,
            ADDITIONALREADYTEDDYCLASSPRICE:
                isReadyTeddyEnabled && !school.isReadyTeddyAvailable ? schoolClassLicenceLog?.readyTeddyClassPrice : 0,
            SCHOOLID: schoolId,
            SCHOOLNAME: school?.schoolName,
            USEREMAIL: user?.email,
            USERID: user?.id,
            USERFIRSTNAME: user?.firstname,
            USERLASTNAME: user?.lastname,
            USERALIAS: user?.nameForChildren,
            ADDITIONALEMAILS: emails?.join(', ')
        };

        await this.notificationService.invoiceOfSchoolClassLicenceToAdmin(
            purchaseLicenceAdminEmailParameter?.value,
            purchaseLicenceAdminEmailParameter?.value,
            params,
            true
        );

        const users = await this.userRepository.find({ where: { email: In(emails) }, select: ['firstname', 'lastname', 'email'] });

        for (const email of emails) {
            const user = users.find((u) => u?.email === email);
            const newParams: PurchaseLicenceParams = { ...params };

            if (user) {
                newParams['FIRSTNAME'] = user?.firstname;
                newParams['LASTNAME'] = user?.lastname;
            }

            newParams['EMAIL'] = email;

            await this.notificationService.invoiceOfSchoolClassLicenceToSchool(
                email,
                user ? `${user?.firstname} ${user?.lastname}` : email,
                newParams,
                true
            );
        }

        return true;
    }

    public async reimportSchoolsWondeData(contextUserId?: string): Promise<void> {
        const schoolsToReImport = await this.schoolRepository
            .createQueryBuilder('school')
            .leftJoin('school.importedSchool', 'importedSchool')
            .where('school.inactive = :inactive', { inactive: false })
            .andWhere('school.misIntegration IS NOT NULL AND school.misIntegration != :misIntegration', { misIntegration: 'CSV' })
            .andWhere('school.skipAutoWondeImport = :skipAutoWondeImport', { skipAutoWondeImport: false })
            .andWhere('school."importedSchoolId" IS NOT NULL')
            .select([
                'school.id as id',
                'school."importedSchoolId" as "importedSchoolId"',
                // Mirrors DataImportService.isReviewRequiredForSchool: every import for a Ready
                // Teddy school goes through the review, not just the first of the academic year.
                `EXISTS (
                    SELECT 1
                    FROM lwp_school_class lsc
                    WHERE lsc."schoolId" = school.id
                        AND lsc."isReadyTeddyEnabled" = true
                        AND lsc.status = :schoolClassStatusActive
                        AND (lsc."isRegistrationClass" = true OR lsc."isGroupAcrossClasses" = true)
                        AND lsc."periodIndex" >= school."curentPeriodIndex"
                ) as "isDataImportReviewRequired"`
            ])
            .orderBy('school.schoolName', 'ASC')
            .setParameters({
                schoolClassStatusActive: SchoolClassStatus.ACTIVE
            })
            .getRawMany();

        if (0 == schoolsToReImport?.length) {
            return;
        }

        let notImportedSchoolsCount = 0;

        for (const school of schoolsToReImport) {
            try {
                const serviceForDataImport = school?.isDataImportReviewRequired ? this.dataImportService : this.wondeService;

                await serviceForDataImport.importWondeSchoolData(school?.importedSchoolId, school?.id, contextUserId);
            } catch (error) {
                notImportedSchoolsCount++;

                console.log(`ERROR while processing WSID ${school?.importedSchoolId} LWPSID ${school?.id}: ${error}`);
                newrelic.noticeError(error, {
                    caught: true,
                    handled: false,
                    schoolId: school?.id,
                    wondeSchoolId: school?.importedSchoolId,
                    userId: contextUserId
                });
            }
        }

        if (0 < notImportedSchoolsCount) {
            throw new Error(`Schools not imported from Wonde: ${notImportedSchoolsCount}`);
        }
    }

    public async getSchools(manager?: EntityManager): Promise<LwpSchool[]> {
        return await (manager?.getRepository(LwpSchool) ?? this.schoolRepository)
            .createQueryBuilder('schools')
            .where('schools.inactive = :inactive', { inactive: false })
            .orderBy('schools.schoolName')
            .getMany();
    }

    public async getSchoolsForSpm({ limit = DEFAULT_SPM_PAGE_LIMIT, offset = 0 }: SpmSchoolsPagination): Promise<SpmSchoolsOutput> {
        const [schools, total] = await this.schoolRepository
            .createQueryBuilder('schools')
            .where('schools.inactive = :inactive', { inactive: false })
            .orderBy('schools.schoolName')
            .skip(offset)
            .take(limit)
            .getManyAndCount();

        if (!schools.length) {
            return { results: [], total, page_total: 0, limit, offset };
        }

        const schoolIds = schools.map((s) => s.id);

        const [
            classCounts,
            unconfirmedSchoolIds,
            readingLaunchDates,
            mathsEnglishLaunchDates,
            moneySkillsLaunchDates,
            readingEngagement,
            readingLogCommentEngagement,
            readingLogPreviousTermEngagement,
            readingLogTargetByClass,
            teacherFeedbackInUse,
            schoolReadingTargets,
            topicsEngagement,
            activitiesEngagement,
            pupilPremiumData,
            teacherFeedbackCountData,
            topicsSetCountData
        ]: [
            { schoolId: string; count: string }[],
            { schoolId: string }[],
            { schoolId: string; launchDate: Date }[],
            { schoolId: string; launchDate: Date }[],
            { schoolId: string; launchDate: Date }[],
            { schoolId: string; activePercent: number }[],
            { schoolId: string; activePercent: number }[],
            { schoolId: string; activePercent: number }[],
            { schoolId: string; className: string; activePercent: number }[],
            { schoolId: string; inUse: boolean }[],
            { schoolId: string; readingTarget: number }[],
            { schoolId: string; activePercent: number }[],
            { schoolId: string; activePercent: number }[],
            { schoolId: string; ppPercent: number }[],
            { schoolId: string; teacherFeedbackCount: number }[],
            { schoolId: string; topicsSetCount: number }[]
        ] = await Promise.all([
            // Count active registration classes per school
            this.schoolRepository.manager.query(
                `SELECT lsc."schoolId", COUNT(lsc.id) as count
                 FROM lwp_school_class lsc
                 JOIN lwp_school ls ON ls.id = lsc."schoolId"
                   AND lsc."periodIndex" = ls."curentPeriodIndex"
                 WHERE lsc."schoolId" = ANY($1)
                   AND lsc.status = $2
                   AND lsc."isRegistrationClass" = true
                 GROUP BY lsc."schoolId"`,
                [schoolIds, SchoolClassStatus.ACTIVE]
            ),
            // Identify schools that have at least one pupil with an imported (not yet onboarded) parent
            this.schoolRepository.manager.query(
                `SELECT DISTINCT p."schoolId"
                 FROM lwp_pupil p
                 JOIN lwp_pupil_parent pp ON pp."pupilId" = p.id
                 WHERE p."schoolId" = ANY($1)
                   AND pp.status = $2`,
                [schoolIds, PupilParentStatus.IMPORTED]
            ),
            // @note: launch date is determined by using the date of 3rd unique parent reading log entry
            this.schoolRepository.manager.query(
                `WITH deduped AS (
                    SELECT DISTINCT lp."schoolId", lpf.id, lpf."logCreatedAt"
                    FROM lwp_pupil_feedback lpf
                    JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id
                    JOIN lwp_pupil lp ON lp.id = lpfh."lwpPupilId"
                    JOIN lwp_school ls ON ls.id = lp."schoolId"
                    WHERE lp."schoolId" = ANY($1)
                      AND lpf."userType" = $2
                      AND lpf.type = $3
                      AND lpf."originalFeedbackId" IS NULL
                      AND lpf."periodIndex" = ls."curentPeriodIndex"
                ),
                ranked AS (
                    SELECT "schoolId", "logCreatedAt",
                        ROW_NUMBER() OVER (PARTITION BY "schoolId" ORDER BY "logCreatedAt") AS rn
                    FROM deduped
                )
                SELECT "schoolId", "logCreatedAt" AS "launchDate" FROM ranked WHERE rn = 3`,
                [schoolIds, UserType.PARENT, FeedbackType.READING]
            ),
            // @note: launch date of Full programme is determined by using the date of the 3rd parent activity feedback
            this.schoolRepository.manager.query(
                `WITH ranked AS (
                    SELECT lsc."schoolId", lpf."logCreatedAt",
                        ROW_NUMBER() OVER (PARTITION BY lsc."schoolId" ORDER BY lpf."logCreatedAt") AS rn
                    FROM lwp_pupil_feedback lpf
                    JOIN lwp_pupil_activity lpa ON lpa.id = lpf."activityId"
                    JOIN lwp_pupil_topic lpt ON lpt.id = lpa."topicId"
                    JOIN lwp_class_topic lct ON lct.id = lpt."classTopicId"
                    JOIN lwp_school_class lsc ON lsc.id = lct."classId"
                    JOIN lwp_school ls ON ls.id = lsc."schoolId"
                    JOIN static_lwp_topic_domain_year_group ldyg ON ldyg."topicId" = lpt."topicId"
                    JOIN static_lwp_topic_domain ld ON ld.id = ldyg."domainId"
                    JOIN static_lwp_subject lsub ON lsub.id = ld."subjectId"
                    WHERE lsc."schoolId" = ANY($1)
                      AND lpf."userType" = $2
                      AND lpf.type = $3
                      AND lsub."programmeType" = $4
                      AND lpf."originalFeedbackId" IS NULL
                      AND lpf."periodIndex" = ls."curentPeriodIndex"
                )
                SELECT "schoolId", "logCreatedAt" AS "launchDate" FROM ranked WHERE rn = 3`,
                [schoolIds, UserType.PARENT, FeedbackType.ACTIVITY, SubjectProgrammeType.FULL_PROGRAMME]
            ),
            // @note: money skills launch date is determined by the date of the 3rd parent activity feedback for money skills topics
            this.schoolRepository.manager.query(
                `WITH ranked AS (
                    SELECT lsc."schoolId", lpf."logCreatedAt",
                        ROW_NUMBER() OVER (PARTITION BY lsc."schoolId" ORDER BY lpf."logCreatedAt") AS rn
                    FROM lwp_pupil_feedback lpf
                    JOIN lwp_pupil_activity lpa ON lpa.id = lpf."activityId"
                    JOIN lwp_pupil_topic lpt ON lpt.id = lpa."topicId"
                    JOIN lwp_class_topic lct ON lct.id = lpt."classTopicId"
                    JOIN lwp_school_class lsc ON lsc.id = lct."classId"
                    JOIN static_lwp_topic_domain_year_group ldyg ON ldyg."topicId" = lpt."topicId"
                    JOIN static_lwp_topic_domain ld ON ld.id = ldyg."domainId"
                    JOIN static_lwp_subject lsub ON lsub.id = ld."subjectId"
                    JOIN lwp_school ls ON ls.id = lsc."schoolId"
                    WHERE lsc."schoolId" = ANY($1)
                      AND lpf."userType" = $2
                      AND lpf.type = $3
                      AND lsub."programmeType" = $4
                      AND lpf."originalFeedbackId" IS NULL
                      AND lpf."periodIndex" = ls."curentPeriodIndex"
                )
                SELECT "schoolId", "logCreatedAt" AS "launchDate" FROM ranked WHERE rn = 3`,
                [schoolIds, UserType.PARENT, FeedbackType.ACTIVITY, SubjectProgrammeType.MONEY_SKILLS]
            ),
            // Calculate the percentage of reading target achieved by pupils this period
            this.schoolRepository.manager.query(
                `SELECT
                    ls.id AS "schoolId",
                    calculate_percentage(
                        COUNT(DISTINCT lp.id)::int,
                        COUNT(DISTINCT lp.id) FILTER (WHERE lpt."earnedGoldStar" = true)::int
                    ) AS "activePercent"
                FROM lwp_school ls
                JOIN lwp_school_class lsc ON lsc."schoolId" = ls.id
                    AND lsc."periodIndex" = ls."curentPeriodIndex"
                    AND lsc."isRegistrationClass" = true
                    AND lsc.status = $2
                    AND lsc."IsReadingLogsEnabled" = true
                JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = lsc.id
                JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
                JOIN lwp_pupil_parent lpp ON lpp."pupilId" = lp.id
                    AND lpp.status IN ($3, $4)
                JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id
                    AND lpt."periodIndex" = ls."curentPeriodIndex"
                    AND lpt."readingTarget" > 0
                JOIN lwp_class_topic lct ON lct.id = lpt."classTopicId"
                    AND lct."released" = true
                    AND lct."readingTarget" > 0
                JOIN static_lwp_topic slt ON slt.id = lct."topicId" AND slt."isReading" = true
                WHERE ls.id = ANY($1)
                GROUP BY ls.id`,
                [schoolIds, SchoolClassStatus.ACTIVE, PupilParentStatus.INVITED, PupilParentStatus.ACTIVE]
            ),
            this.getReadingLogCommentEngagement(schoolIds, false),
            this.getReadingLogCommentEngagement(schoolIds, true),
            this.getReadingLogTargetByClass(schoolIds),
            this.getTeacherFeedbackInUse(schoolIds),
            this.getSchoolReadingTargets(schoolIds),
            this.getTopicsCurrentTerm(schoolIds),
            this.getActivitiesCurrentTerm(schoolIds),
            this.getPupilPremiumPercent(schoolIds),
            this.getTeacherFeedbackCount(schoolIds),
            this.getTopicsSetCount(schoolIds)
        ]);

        const countMap = new Map(classCounts.map(({ schoolId, count }) => [schoolId, parseInt(count, 10)]));
        const unconfirmedSet = new Set(unconfirmedSchoolIds.map(({ schoolId }) => schoolId));
        const readingLaunchMap = new Map(readingLaunchDates.map((r) => [r.schoolId, r.launchDate]));
        const mathsEnglishLaunchMap = new Map(mathsEnglishLaunchDates.map((r) => [r.schoolId, r.launchDate]));
        const moneySkillsLaunchMap = new Map(moneySkillsLaunchDates.map((r) => [r.schoolId, r.launchDate]));
        const readingEngagementMap = new Map(readingEngagement.map((r) => [r.schoolId, r.activePercent]));
        const readingLogCommentEngagementMap = new Map(readingLogCommentEngagement.map((r) => [r.schoolId, r.activePercent]));
        const readingLogPreviousTermEngagementMap = new Map(readingLogPreviousTermEngagement.map((r) => [r.schoolId, r.activePercent]));

        const readingLogTargetByClassMap = new Map<string, { className: string; activePercent: number }[]>();

        for (const row of readingLogTargetByClass) {
            if (!readingLogTargetByClassMap.has(row.schoolId)) {
                readingLogTargetByClassMap.set(row.schoolId, []);
            }

            readingLogTargetByClassMap.get(row.schoolId).push({ className: row.className, activePercent: row.activePercent });
        }

        const teacherFeedbackInUseMap = new Map(teacherFeedbackInUse.map((r) => [r.schoolId, r.inUse]));
        const schoolReadingTargetMap = new Map(schoolReadingTargets.map((r) => [r.schoolId, r.readingTarget]));
        const topicsEngagementMap = new Map(topicsEngagement.map((r) => [r.schoolId, r.activePercent]));
        const activitiesEngagementMap = new Map(activitiesEngagement.map((r) => [r.schoolId, r.activePercent]));
        const pupilPremiumMap = new Map(pupilPremiumData.map((r) => [r.schoolId, r.ppPercent]));
        const teacherFeedbackCountMap = new Map(teacherFeedbackCountData.map((r) => [r.schoolId, r.teacherFeedbackCount]));
        const topicsSetCountMap = new Map(topicsSetCountData.map((r) => [r.schoolId, r.topicsSetCount]));

        const toEngagementMetric = (map: Map<string, number>, schoolId: string): SpmEngagementMetric => {
            const activePercent = map.get(schoolId) ?? null;

            return { activePercent, inactivePercent: activePercent !== null ? 100 - activePercent : null };
        };

        schools.forEach((school) => {
            const spmData = new SpmSchoolData();

            spmData.activatedClassCount = countMap.get(school.id) ?? 0;
            spmData.hasUnconfirmedParentDetails = unconfirmedSet.has(school.id);
            spmData.readingLogLaunchDate = readingLaunchMap.get(school.id) ?? null;
            spmData.mathsEnglishLaunchDate = mathsEnglishLaunchMap.get(school.id) ?? null;
            spmData.moneySkillsLaunchDate = moneySkillsLaunchMap.get(school.id) ?? null;
            spmData.readingLogCurrentTerm = toEngagementMetric(readingEngagementMap, school.id);
            spmData.readingLogCurrentTermComment = toEngagementMetric(readingLogCommentEngagementMap, school.id);
            spmData.readingLogPreviousTermComment = toEngagementMetric(readingLogPreviousTermEngagementMap, school.id);
            spmData.readingLogTargetByClass = readingLogTargetByClassMap.get(school.id) ?? [];
            spmData.teacherFeedbackInUse = teacherFeedbackInUseMap.get(school.id) ?? null;
            spmData.schoolReadingTarget = schoolReadingTargetMap.get(school.id) ?? null;
            spmData.topicsCurrentTerm = toEngagementMetric(topicsEngagementMap, school.id);
            spmData.activitiesCurrentTerm = toEngagementMetric(activitiesEngagementMap, school.id);
            spmData.pupilPremiumPercent = pupilPremiumMap.get(school.id) ?? null;
            spmData.teacherFeedbackCount = teacherFeedbackCountMap.get(school.id) ?? null;
            spmData.topicsSetCount = topicsSetCountMap.get(school.id) ?? null;
            school.spmData = spmData;
        });

        return { results: schools, total, page_total: schools.length, limit, offset };
    }

    public async getAllSchools(): Promise<LwpSchool[]> {
        return await this.schoolRepository.find({ order: { schoolName: 'ASC' } });
    }

    public async getSchoolsForSchoolOverview(
        filter: GetSchoolsForSchoolOverviewInput = {
            inactive: false,
            isTestSchool: false,
            needImpactReportGenerating: false
        }
    ): Promise<LwpSchool[]> {
        let queryBuilder = this.schoolRepository.createQueryBuilder('schools').orderBy('schools.schoolName');

        if (filter.needImpactReportGenerating) {
            const recentEndedTerm = await this.schoolDatesRepository
                .createQueryBuilder('d')
                .where('d.endDate < :date', { date: new Date() })
                .orderBy('d."endDate"', 'DESC')
                .select('d.id')
                .getOne();

            if (recentEndedTerm?.id) {
                queryBuilder = queryBuilder
                    .leftJoinAndSelect('schools.impactReports', 'schoolImpactReports')
                    .leftJoinAndSelect('schoolImpactReports.term', 'term')
                    .andWhere(
                        `NOT EXISTS (
                            SELECT 1 FROM lwp_school_impact_report sir
                            INNER JOIN lwp_school_dates t ON t.id = sir."termId"
                            WHERE t.id = :termId AND sir."schoolId" = schools.id
                        )`,
                        { termId: recentEndedTerm.id }
                    );
            }
        }

        return await queryBuilder
            .andWhere('schools.inactive = :inactive', { inactive: filter.inactive })
            .andWhere('schools.isTestSchool = :isTestSchool', { isTestSchool: filter.isTestSchool })
            .getMany();
    }

    /**
     * Batch: for each input school id (in order), whether the school has any uninvited (IMPORTED) staff.
     * Backs the `hasUninvitedStaff` DataLoader field.
     */
    public async getHasUninvitedStaffBySchoolIds(schoolIds: readonly string[]): Promise<boolean[]> {
        if (!schoolIds.length) return [];

        const rows = await this.userRepository
            .createQueryBuilder('user')
            .innerJoin('user.school', 'school')
            .select('school.id', 'schoolId')
            .where('school.id IN (:...schoolIds)', { schoolIds })
            .andWhere('user.userStatus = :status', { status: UserStatus.IMPORTED })
            .groupBy('school.id')
            .getRawMany();

        const schoolIdsWithUninvitedStaff = new Set(rows.map((row) => row.schoolId));

        return schoolIds.map((id) => schoolIdsWithUninvitedStaff.has(id));
    }

    /**
     * List of uninvited (IMPORTED) staff for the admin "Send invites" modal, scoped to the given schools.
     * The caller passes the ids of the schools it is showing that have uninvited staff (from the
     * `hasUninvitedStaff` field), so the query only touches the relevant schools rather than scanning all of
     * them. Test vs non-test is implicit in the ids supplied; inactive schools are guarded out as a safety net.
     */
    public async getUninvitedStaff(schoolIds: string[]): Promise<UninvitedStaff[]> {
        if (!schoolIds.length) return [];

        const users = await this.userRepository
            .createQueryBuilder('user')
            .innerJoin('user.school', 'school')
            .select([
                'user.id',
                'user.firstname',
                'user.lastname',
                'user.isSchoolLeader',
                'user.inviteMode',
                'school.id',
                'school.schoolName'
            ])
            .where('school.id IN (:...schoolIds)', { schoolIds })
            .andWhere('user.userStatus = :status', { status: UserStatus.IMPORTED })
            .andWhere('school.inactive = false')
            .orderBy('school.schoolName', 'ASC')
            .addOrderBy('user.lastname', 'ASC')
            .getMany();

        return users.map((user) => ({
            userId: user.id,
            firstname: user.firstname,
            lastname: user.lastname,
            isSchoolLeader: !!user.isSchoolLeader,
            inviteMode: user.inviteMode,
            schoolId: user.school.id,
            schoolName: user.school.schoolName
        }));
    }

    /**
     * The single definition of "still owed the welcome email", shared by the read paths and the send so the
     * button, the list and the send cannot disagree. Expects `user` joined to its school as `school`.
     *
     * A leader of an active school is owed one whether they are already on the platform (ACTIVE) or still to
     * accept an invitation (INVITED), and also while they are only imported if their invitation is being held
     * back for the autumn window (IMPORTED with SEND_LATER) - they will be invited alongside this email.
     * Imported leaders whose invitation was sent immediately or suppressed are not owed one.
     *
     * `lastWelcomeEmailSent` alone answers it, with no lookup into the notifications: it is stamped when the email
     * is queued, so a leader drops off the list at once and a failed send does not put them back on it - the same
     * one-shot rule the trophy and topic emails follow, where failures are chased through the message logs.
     */
    private applySchoolLeaderAwaitingWelcomeFilter<T>(queryBuilder: SelectQueryBuilder<T>): SelectQueryBuilder<T> {
        return queryBuilder
            .andWhere('user.type = :teacherType', { teacherType: UserType.TEACHER })
            .andWhere('user.isSchoolLeader = true')
            .andWhere(
                '(user.userStatus IN (:...welcomeStatuses) OR (user.userStatus = :importedStatus AND user.inviteMode = :sendLater))',
                {
                    welcomeStatuses: [UserStatus.ACTIVE, UserStatus.INVITED],
                    importedStatus: UserStatus.IMPORTED,
                    sendLater: InviteMode.SEND_LATER
                }
            )
            .andWhere('user.lastWelcomeEmailSent IS NULL')
            .andWhere('school.inactive = false');
    }

    /** For each input school id, in the order given, whether it has a leader still owed the welcome email. */
    public async getHasSchoolLeadersAwaitingWelcomeBySchoolIds(schoolIds: readonly string[]): Promise<boolean[]> {
        if (!schoolIds.length) return [];

        const rows = await this.applySchoolLeaderAwaitingWelcomeFilter(
            this.userRepository
                .createQueryBuilder('user')
                .innerJoin('user.school', 'school')
                .select('school.id', 'schoolId')
                .where('school.id IN (:...schoolIds)', { schoolIds })
        )
            .groupBy('school.id')
            .getRawMany();

        const schoolIdsAwaitingWelcome = new Set(rows.map((row) => row.schoolId));

        return schoolIds.map((id) => schoolIdsAwaitingWelcome.has(id));
    }

    /**
     * Rows for the admin "Send welcome emails" modal, one per school with the number of leaders it would email.
     * Scoped to the school ids the caller is showing. Schools with nobody left to email are not returned.
     */
    public async getSchoolsAwaitingWelcome(schoolIds: string[]): Promise<SchoolAwaitingWelcome[]> {
        if (!schoolIds.length) return [];

        const rows = await this.applySchoolLeaderAwaitingWelcomeFilter(
            this.userRepository
                .createQueryBuilder('user')
                .innerJoin('user.school', 'school')
                .select('school.id', 'schoolId')
                .addSelect('school.schoolName', 'schoolName')
                .addSelect('COUNT(DISTINCT user.id)', 'leaderCount')
                .where('school.id IN (:...schoolIds)', { schoolIds })
        )
            .groupBy('school.id')
            .addGroupBy('school.schoolName')
            .orderBy('school.schoolName', 'ASC')
            .getRawMany<{ schoolId: string; schoolName: string; leaderCount: string }>();

        return rows.map((row) => ({ ...row, leaderCount: +row.leaderCount }));
    }

    /** The leaders behind one school's count, loaded when the admin expands that school in the modal. */
    public async getSchoolLeadersAwaitingWelcome(schoolId: string): Promise<SchoolLeaderAwaitingWelcome[]> {
        return await this.applySchoolLeaderAwaitingWelcomeFilter(
            this.userRepository
                .createQueryBuilder('user')
                .innerJoin('user.school', 'school')
                .select('user.id', 'userId')
                .addSelect('user.firstname', 'firstname')
                .addSelect('user.lastname', 'lastname')
                .addSelect('user.email', 'email')
                .where('school.id = :schoolId', { schoolId })
        )
            .orderBy('user.lastname', 'ASC')
            .getRawMany<SchoolLeaderAwaitingWelcome>();
    }

    /**
     * Admin send of the school leader welcome email, for every leader of the given schools. Selection is per
     * school, so the leaders are resolved here rather than taken from the client, and the eligibility filter
     * decides who is owed one - a stale modal cannot email someone who has since had it.
     *
     * Nothing is sent here: the batch becomes WAITING rows in one insert and `sendAllPendingNotifications`
     * delivers them, which also means delivery honours TEACHER_NOTIFICATION_TIME.
     */
    public async sendSchoolLeaderWelcomeEmails(schoolIds: string[]): Promise<SendWelcomeEmailsResult> {
        const requestedSchoolIds = [...new Set(schoolIds ?? [])];

        if (!requestedSchoolIds.length) return { sentCount: 0, failures: [] };

        const users = await this.applySchoolLeaderAwaitingWelcomeFilter(
            this.userRepository
                .createQueryBuilder('user')
                .innerJoinAndSelect('user.school', 'school')
                .leftJoinAndSelect('school.curentPeriod', 'curentPeriod')
                .leftJoinAndSelect('school.schoolTags', 'schoolTags')
                .leftJoinAndSelect('schoolTags.tag', 'tag')
                .where('school.id IN (:...requestedSchoolIds)', { requestedSchoolIds })
        ).getMany();

        const failures: WelcomeEmailFailure[] = [];
        const queuedIds = new Set<string>();
        let notQueuedReason =
            'No longer eligible - they must be a school leader at an active school who has not already been sent the welcome email.';

        if (users.length) {
            try {
                const mailByUserId: Record<string, Pick<Mail, 'params' | 'replyTo'>> = {};

                for (const user of users) {
                    mailByUserId[user.id] = this.notificationService.schoolLeaderWelcomeEmailMail(user.school);
                }

                // Stamping in the same statement takes each leader off the awaiting-welcome list at once, so the
                // batch cannot be queued twice while it waits for the cron. The ids come back through a trailing
                // select because TypeORM returns [rows, rowCount] for an update.
                //
                // `gen_notif_data` builds `context.mailData` and has no notion of a Reply-To, so the SPM one is
                // merged into each generated row. A leader whose school matched no SPM tag gets a JSON null,
                // which leaves the send on its default Reply-To.
                const queued: { id: string }[] = await this.userRepository.query(
                    `
                    with generated as (
                        select
                            gen_notif_data (lu.*, 'email', $1::varchar, false, recipient.mail -> 'params') as notification,
                            coalesce(recipient.mail -> 'replyTo', 'null'::jsonb) as reply_to
                        from jsonb_each($2::jsonb) as recipient (id, mail)
                            join lwp_user lu on lu.id = recipient.id::bigint and lu."lastWelcomeEmailSent" is null
                    ),
                    queued as (
                        insert into lwp_notification overriding user value
                        select (jsonb_populate_record (
                            generated.notification,
                            jsonb_build_object('context', jsonb_set((generated.notification).context, '{mailData,replyTo}', generated.reply_to))
                        )).*
                        from generated
                        returning "userId"
                    ),
                    stamped as (
                        update lwp_user set "lastWelcomeEmailSent" = now()
                        where id in (select "userId" from queued)
                        returning id
                    )
                    select id from stamped;
                    `,
                    [EmailTemplateTypes.schoolLeaderWelcomeEmail, JSON.stringify(mailByUserId)]
                );

                queued.forEach((row) => queuedIds.add(String(row.id)));
            } catch (error) {
                newrelic.noticeError(error);
                // One statement, so a failure is all-or-nothing: nobody was queued.
                notQueuedReason = error?.message ?? 'Unknown error while queueing the welcome emails.';
            }
        }

        // Any leader we loaded but did not queue, so none is reported as emailed when they were not.
        for (const user of users.filter((user) => !queuedIds.has(user.id))) {
            failures.push({ userId: user.id, name: user.getFullName(), reason: notQueuedReason });
        }

        return { sentCount: queuedIds.size, failures };
    }

    public async getSchool(id: string): Promise<LwpSchool> {
        const school = await this.schoolRepository.findOne({
            where: { id }
        });

        if (!school) throw new HttpException(`School does not exist`, ErrorStatusCodeEnum._535);

        return school;
    }

    public async getSchoolByNameAndOrUrn(name: string | null, urn: string | null, manager?: EntityManager): Promise<LwpSchool> {
        if (!name && !urn) {
            throw new UnprocessableEntityException('School name and/or URN must be provided');
        }

        const schools = await (manager?.getRepository(LwpSchool) ?? this.schoolRepository).find({
            where: {
                ...(name ? { schoolName: name } : undefined),
                ...(urn ? { urn } : undefined)
            }
        });

        if (schools.length > 1) {
            throw new ConflictException(`Multiple schools found with the name ${name}`);
        }

        return schools[0];
    }

    public async updateSchoolEnableReadingLogEntries(schoolId: string, enableBookNameOnlyReadingLog: boolean): Promise<boolean> {
        await this.schoolRepository.update({ id: schoolId }, { enableBookNameOnlyReadingLog });

        return enableBookNameOnlyReadingLog;
    }

    public async updateParentFeedbackFeatureForSchool(input: UpdateParentFeedbackFeatureForSchoolInput): Promise<boolean> {
        const school = await this.schoolRepository.findOne({ where: { id: input.schoolId } });

        const parentFeedbackTickFeatureEnabledAt = input.enableTick ? (school?.parentFeedbackTickFeatureEnabledAt ?? new Date()) : null;
        const isParentFeedbackReplyFeatureEnabled = input.enableComments;
        const isParentFeedbackStickerFeatureEnabled = input.enableStickers;

        await this.schoolRepository.update(
            { id: input.schoolId },
            { parentFeedbackTickFeatureEnabledAt, isParentFeedbackReplyFeatureEnabled, isParentFeedbackStickerFeatureEnabled }
        );

        return true;
    }

    public getSchoolLogo(logo?: string): string {
        return logo ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.schoolLogoImage}/${logo}`) : null;
    }

    public async deleteSchool(id: string, contextUserId: string): Promise<OperationStatus> {
        const school = await this.schoolRepository
            .createQueryBuilder('school')
            .leftJoin('school.pupils', 'pupil')
            .leftJoin('pupil.classes', 'classes')
            .select(['school.id', 'pupil.id', 'classes.id', 'classes.status'])
            .where('school.id = :id', { id })
            .getOne();

        if (!school) throw new HttpException(`School does not exist`, ErrorStatusCodeEnum._535);

        await this.schoolRepository.createQueryBuilder().relation('deletedBy').of(id).set(contextUserId);
        await this.importedSchoolRepository.delete({
            lwpSchool: { id }
        });

        const res = await this.schoolRepository.delete(id);

        if (school?.pupils?.length > 0) {
            const logs = [];

            for (const pupil of school.pupils) {
                if (pupil?.classes?.length) {
                    for (const schoolClass of pupil.classes) {
                        const removedLog = new LogLwpPupilClassChange();

                        removedLog.pupilId = pupil.id;
                        removedLog.classId = schoolClass.id;
                        removedLog.status = schoolClass.status;
                        removedLog.logCreatedById = contextUserId;
                        removedLog.action = PupilClassActionType.REMOVED;

                        logs.push(removedLog);
                    }
                }
            }

            if (logs?.length) await this.logPupilClassChangeRepository.save(logs);
        }

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async setSchoolPeriodToCurrent(schoolId: string): Promise<LwpSchool> {
        const school = await this.schoolRepository.findOne({ where: { id: schoolId }, relations: ['curentPeriod'] });

        if (!school) throw new HttpException(`School does not exist`, ErrorStatusCodeEnum._535);

        const currentPeriod = await this.periodService.getCurrentPeriod();

        if (currentPeriod && school?.curentPeriod?.index !== currentPeriod?.index) {
            school.curentPeriod = currentPeriod;

            return await this.schoolRepository.save(school);
        }

        return school;
    }

    /**
     * @param convertPreAdmissionClasses only the mutation opts in - the yearly rollover script runs
     * the conversion itself so that it can report on it and support a dry run.
     */
    public async changeSchoolPeriod(
        schoolId: string,
        index: number,
        contextUserId: string,
        convertPreAdmissionClasses = false,
        manager?: EntityManager
    ): Promise<LwpSchool> {
        const schoolRepository: Repository<LwpSchool> = manager?.getRepository(LwpSchool) ?? this.schoolRepository;

        const school = await schoolRepository.findOne({ where: { id: schoolId }, relations: ['curentPeriod'] });

        if (!school) throw new HttpException(`School does not exist`, ErrorStatusCodeEnum._535);

        // Must happen before the school moves on, while its pre-admission classes are still identifiable.
        if (convertPreAdmissionClasses) {
            await this.schoolClassService.convertPreAdmissionClassesToGroups(schoolId, index, contextUserId, manager);
        }

        school.curentPeriod = await this.periodService.getStaticPeriod(index, manager);
        school.commentsAndPhotos = 0;
        school.hasCurrentAcademicYearWondeData = false;
        // Import status tracks a single import's progress through the review state machine; the
        // new academic year starts with no import of its own yet.
        school.importStatus = null;
        school.logUpdatedBy = this.shallowUserService.newShallowUser(contextUserId);

        const savedSchool = await schoolRepository.save(school);

        await schoolRepository.query(
            `
                UPDATE lwp_pupil_parent as lpp
                SET "showInterstitial" = true
                FROM lwp_pupil as lp
                JOIN lwp_school as ls ON lp."schoolId" = ls.id
                WHERE lpp."pupilId" = lp.id
                AND ls.id = $1;
            `,
            [schoolId]
        );

        return savedSchool;
    }

    public async getSchoolByClass(schoolClassId: string): Promise<LwpSchool> {
        const pupilParentBase = await this.queryBaseService.schoolClassSchoolBase(schoolClassId);
        const school = await pupilParentBase.select('school').getRawOne();
        const newSchool = Object.assign({}, ...this.helperService.changeObjKeys(school, 'school_'));

        if (newSchool?.id) return newSchool;

        return null;
    }

    public async getTeacherSchool(teacherId: string): Promise<LwpSchool> {
        const teacherSchoolBase = await this.queryBaseService.TeacherSchoolBase(teacherId);
        const school = await teacherSchoolBase.select('school').getRawOne();
        const newSchool = Object.assign({}, ...this.helperService.changeObjKeys(school, 'school_'));

        if (newSchool?.id) return newSchool;

        return null;
    }

    public async getPupilSchool(pupilId: string): Promise<LwpSchool> {
        const pupilSchoolBase = await this.queryBaseService.pupilSchoolBase(pupilId);
        const school = await pupilSchoolBase.select('school').getRawOne();
        const newSchool = Object.assign({}, ...this.helperService.changeObjKeys(school, 'school_'));

        if (newSchool?.id) return newSchool;

        return null;
    }

    public async getSchoolImportedSchool(schoolId: string): Promise<ImportedSchool> {
        const school = await this.schoolRepository.findOne({ where: { id: schoolId }, relations: ['importedSchool'] });

        if (school?.importedSchool) return school?.importedSchool;

        return null;
    }

    public async getSchoolPupilsActive(schoolId: string): Promise<number> {
        return (
            await this.schoolRepository.query(
                `
                select
                    coalesce(count(distinct lvps."pupilId") filter (where lvps."pupilStatus" = 'ACTIVE'), 0) as "pupilsActive"
                from
                    lwp_school ls
                    left join lwp_school_class lsc on lsc."schoolId" = ls.id
                        and lsc."periodIndex" = ls."curentPeriodIndex"
                    left join lwp_class_pupil lcp on lcp."lwpSchoolClassId" = lsc.id
                    left join lwp_pupil lp on lp.id = lcp."lwpPupilId"
                    left join lwp_view_pupil_status lvps on lp.id = lvps."pupilId"
                where ls.id = $1`,
                [schoolId]
            )
        )[0].pupilsActive;
    }

    public async getSchoolStarsEarned(schoolId: string): Promise<number> {
        return (
            await this.schoolRepository.query(
                `
                SELECT
                    coalesce(sum(
                            CASE WHEN lpt."earnedGoldStar" THEN
                                1
                            ELSE
                                0
                            END) + sum(lpt."silverStars"), 0) AS "starsEarned"
                FROM
                    lwp_school ls
                    LEFT JOIN lwp_school_class lsc ON lsc."schoolId" = ls.id
                        AND lsc."periodIndex" = ls."curentPeriodIndex"
                    LEFT JOIN lwp_class_topic lct ON lct."classId" = lsc.id
                    LEFT JOIN lwp_pupil_topic lpt ON lpt."classTopicId" = lct.id
                WHERE
                    ls.id = $1`,
                [schoolId]
            )
        )[0].starsEarned;
    }

    public async commentsAndPhotos(schoolId: string): Promise<number> {
        let pupilFeedbackBase: SelectQueryBuilder<LwpPupilFeedback> = null;
        const school = await this.schoolRepository.findOne({ where: { id: schoolId }, relations: ['curentPeriod'] });

        pupilFeedbackBase = this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .innerJoinAndSelect('feedback.pupils', 'pupil', 'pupil.schoolId = :schoolId', { schoolId })
            .leftJoinAndSelect('feedback.activity', 'activity')
            .leftJoinAndSelect('activity.topic', 'activityPupilTopic')
            .where('feedback.periodIndex = :index', { index: school?.curentPeriod?.index })
            .andWhere('feedback.originalFeedbackId IS NULL');

        return await pupilFeedbackBase.orderBy('feedback.logCreatedAt', 'DESC').getCount();
    }

    public async getCommentsAndPhotosBySchoolIds(schoolIds: readonly string[]): Promise<number[]> {
        if (!schoolIds.length) return [];

        const schools = await this.schoolRepository
            .createQueryBuilder('school')
            .leftJoinAndSelect('school.curentPeriod', 'period')
            .where('school.id IN (:...schoolIds)', { schoolIds: schoolIds })
            .getMany();

        const schoolPeriodMap = new Map<string, number>();

        schools.forEach((school) => {
            schoolPeriodMap.set(school.id, school.curentPeriod?.index);
        });

        const feedbackCounts = await this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .innerJoin('feedback.pupils', 'pupil')
            .leftJoin('feedback.activity', 'activity')
            .leftJoin('activity.topic', 'activityPupilTopic')
            .select('pupil.schoolId', 'schoolId')
            .addSelect('feedback.periodIndex', 'periodIndex')
            .addSelect('COUNT(*)', 'count')
            .where('pupil.schoolId IN (:...schoolIds)', { schoolIds: schoolIds })
            .andWhere('feedback.originalFeedbackId IS NULL')
            .groupBy('pupil.schoolId')
            .addGroupBy('feedback.periodIndex')
            .getRawMany();

        const countMap = new Map<string, number>();

        feedbackCounts.forEach((result) => {
            const schoolId = result.schoolId;
            const resultPeriodIndex = result.periodIndex;
            const schoolCurrentPeriod = schoolPeriodMap.get(schoolId);

            // only count feedback from the school's current period
            if (schoolCurrentPeriod !== undefined && resultPeriodIndex === schoolCurrentPeriod) {
                countMap.set(schoolId, parseInt(result.count));
            }
        });

        // Return counts in same order as input school IDs
        const result: number[] = [];

        schoolIds.forEach((schoolId) => {
            result.push(countMap.get(schoolId) || 0);
        });

        return result;
    }

    public async logSchoolClassLicensesOfSchool(schoolId: string): Promise<LogSchoolClassLicense[]> {
        const school = await this.schoolRepository.findOne({ where: { id: schoolId }, select: ['curentPeriod', 'id'] });

        const schoolClassLicenses = await this.schoolClassLicenceRepository.find({
            where: { school: { id: school?.id }, schoolPeriod: school?.periodIndex.toString() },
            order: { schoolPeriod: 'DESC', logCreatedAt: 'DESC' },
            relations: ['logCreatedBy']
        });

        return schoolClassLicenses ?? [];
    }

    public async getSchoolSubjectType(schoolId: string): Promise<SchoolSubjectType | null> {
        const result = await this.schoolRepository
            .createQueryBuilder('school')
            .select([
                'school.id AS school_id',
                `bool_or(sc.IsReadingLogsEnabled) AS hasReadingClasses`,
                'bool_or(sc.isFullProgramme) OR (COUNT(subjects.id) > 0) AS hasFullProgramClasses'
            ])
            .innerJoin('static_lwp_period', 'p', 'school.curentPeriodIndex = p.index')
            .innerJoin('lwp_school_class', 'sc', 'sc.schoolId = school.id AND sc.periodIndex = p.index')
            .leftJoin('sc.subjects', 'subjects')
            .where('school.id = :schoolId', { schoolId })
            .groupBy('school.id')
            .getRawOne();

        if (result?.hasreadingclasses && result?.hasfullprogramclasses) return SchoolSubjectType.BOTH;
        else if (result?.hasreadingclasses) return SchoolSubjectType.READING;
        else if (result?.hasfullprogramclasses) return SchoolSubjectType.TOPIC;

        return null;
    }

    public async enableSchoolDataDownloadQuery(schoolId: string, isDownloadSchoolData: boolean): Promise<boolean> {
        await this.schoolRepository.update({ id: schoolId }, { isDownloadSchoolData });

        return isDownloadSchoolData;
    }

    public async getSchoolTags(schoolId: string): Promise<StaticLwpSchoolTag[]> {
        return await this.staticLwpTopicSchoolRepository
            .createQueryBuilder('static_tags')
            .innerJoin('static_tags.schoolAndTag', 'schoolAndTag')
            .where('schoolAndTag.school.id = :schoolId', { schoolId })
            .orderBy('static_tags.id', 'ASC')
            .getMany();
    }

    public async getSchoolTagsBySchoolIds(schoolIds: readonly string[]): Promise<StaticLwpSchoolTag[][]> {
        if (!schoolIds.length) return [];

        const results = await this.staticLwpTopicSchoolRepository
            .createQueryBuilder('static_tags')
            .innerJoin('static_tags.schoolAndTag', 'schoolAndTag')
            .innerJoin('schoolAndTag.school', 'school')
            .where('school.id IN (:...schoolIds)', { schoolIds: schoolIds })
            .addSelect('school.id', 'schoolId')
            .orderBy('static_tags.id', 'ASC')
            .getRawAndEntities();

        const rawResults = results.raw;
        const tags = results.entities;

        // Group tags by school ID
        const schoolToTagsMap = new Map<string, StaticLwpSchoolTag[]>();

        rawResults.forEach((raw) => {
            const schoolId = raw.schoolId;
            const tagId = raw.static_tags_id;
            const tag = tags.find((t) => t.id === tagId);

            if (tag) {
                if (!schoolToTagsMap.has(schoolId)) {
                    schoolToTagsMap.set(schoolId, []);
                }

                schoolToTagsMap.get(schoolId).push(tag);
            }
        });

        // return tags in same order as input schoolIds
        const result: StaticLwpSchoolTag[][] = [];

        schoolIds.forEach((schoolId) => {
            result.push(schoolToTagsMap.get(schoolId) || []);
        });

        return result;
    }

    public async impactReportExists(schoolId: string): Promise<boolean> {
        const impactReportCounts = await this.schoolImpactRepository.count({
            where: {
                school: schoolId,
                isPublished: true
            }
        });

        return impactReportCounts > 0;
    }

    /**
     * @param schoolId - The unique identifier of the school.
     *
     * This method checks if the school has the following resources enabled during its current and future periods:
     * - Reading classes (`hasReadingClasses`) - only includes the current academic year.
     * - Full program, Ready Teddy program, or Money Skills availability (`hasFullProgramClasses`).
     *
     * It retrieves this information by querying the active classes for the current and future periods of the school.
     */

    async getSchoolResourceStatus(schoolId: string): Promise<SchoolResourceStatus> {
        const schoolResourceStatus: SchoolResourceStatus = await this.schoolRepository
            .createQueryBuilder('school')
            .leftJoin('school.curentPeriod', 'currentPeriod')
            .leftJoin('school.classes', 'classes', 'classes.status = :status AND classes.period.index >= currentPeriod.index', {
                status: SchoolClassStatus.ACTIVE
            })
            .where('school.id = :schoolId', { schoolId })
            .select([
                `coalesce(bool_or(classes.IsReadingLogsEnabled), false) AS "hasReadingClasses"`,
                'coalesce(bool_or((classes.isFullProgramme OR classes.isReadyTeddyEnabled OR school.isMoneySkillsAvailable)), false) AS "hasFullProgramClasses"'
            ])
            .groupBy('school.id')
            .getRawOne();

        return schoolResourceStatus;
    }

    public async getPupilsWithoutClassesCount(schoolId: string): Promise<PupilWithoutClassCounts> {
        const currentPeriodIndex = await this.periodService.getCurrentPeriodIndex();

        const currentYearPupilsBaseQuery = this.pupilService.schoolPupilsWithoutClassesBaseQuery(schoolId, currentPeriodIndex, false);
        const countOfCurrentYearPupils = await this.pupilRepository
            .createQueryBuilder('lwp_pupil')
            .where(`lwp_pupil.id In (${currentYearPupilsBaseQuery.select('pupil.id').getQuery()})`)
            .setParameters(currentYearPupilsBaseQuery.getParameters())
            .getCount();

        const isPreRegistration = true;
        const includeIgnoredPupils = true;
        const nextYearPreRegisteredPupilsBaseQuery = this.pupilService.schoolPupilsWithoutClassesBaseQuery(
            schoolId,
            currentPeriodIndex,
            isPreRegistration,
            includeIgnoredPupils
        );

        const countOfPreRegisteredPupils = await this.pupilRepository
            .createQueryBuilder('lwp_pupil')
            .select([
                'coalesce(COUNT(1), 0) AS "nextYearTotalPupils"', // Total pupils, default to 0 if null
                'coalesce(COUNT(1) FILTER (WHERE lwp_pupil."isIgnoredForFutureYearClasses" = false), 0) AS "nextYearNonIgnoredPupils"' // Non-ignored pupils, default to 0 if null
            ])
            .where(`lwp_pupil.id In (${nextYearPreRegisteredPupilsBaseQuery.select('pupil.id').getQuery()})`)
            .setParameters(nextYearPreRegisteredPupilsBaseQuery.getParameters())
            .getRawOne();

        return {
            currentYear: countOfCurrentYearPupils,
            nextYearTotalPupils: countOfPreRegisteredPupils?.nextYearTotalPupils,
            nextYearNonIgnoredPupils: countOfPreRegisteredPupils?.nextYearNonIgnoredPupils
        };
    }

    public async enableMoneySkillsForSchool(
        schoolId: string,
        userId: string,
        shouldNotifySpms = true,
        manager?: EntityManager
    ): Promise<boolean> {
        const schoolRepository = manager?.getRepository(LwpSchool) ?? this.schoolRepository;

        const user = await this.userRepository.findOne(userId, {
            select: ['firstname', 'lastname', 'nameForChildren', 'email']
        });

        const school = await schoolRepository.findOne({ where: { id: schoolId }, select: ['id', 'schoolName', 'logUpdatedAt'] });

        if (!school) throw new HttpException(`School does not exist`, ErrorStatusCodeEnum._535);

        if (school?.isMoneySkillsAvailable) return true;

        school.isMoneySkillsAvailable = true;
        school.logUpdatedBy = user;

        const updatedSchool = await schoolRepository.save(school);

        if (shouldNotifySpms) {
            await this.notifyLwpTeamOfMoneySkillsActivation(user, updatedSchool);
        }

        return true;
    }

    public async isDataQueryAvailableForSchool(schoolId: string): Promise<boolean> {
        const subjectType = await this.getSchoolSubjectType(schoolId);

        const dataQueryCount = await this.dataQueryService.getSchoolLeaderBaseQueryBuilder(subjectType).getCount();

        return dataQueryCount > 0;
    }

    public async getPendingImportActionsCount(importedSchoolId: string, importStatus: ImportStatus): Promise<number> {
        return await this.dataImportService.getPendingImportActionsCount(importedSchoolId, importStatus);
    }

    public async updateRegionInSchoolFromWondeData(contextUserId?: string): Promise<void> {
        const schoolsToUpdateRegion = await this.schoolRepository
            .createQueryBuilder('school')
            .leftJoin('school.importedSchool', 'importedSchool')
            .select(['school.id', 'school.importedSchoolId', 'school.region'])
            .where('school.inactive = :inactive and school.isTestSchool = :isTestSchool', { inactive: false, isTestSchool: false })
            .andWhere('school.misIntegration IS NOT NULL AND school.misIntegration != :misIntegration', { misIntegration: 'CSV' })
            .andWhere('school."importedSchoolId" IS NOT NULL')
            .andWhere('school.region IS NULL')
            .orderBy('school.schoolName', 'ASC')
            .getMany();

        if (!schoolsToUpdateRegion?.length) {
            return;
        }

        // Use Promise.all to fetch all Wonde data in parallel
        const results = await Promise.all(
            schoolsToUpdateRegion.map(async (school) => {
                try {
                    const wondeData = await this.dataImportService.getWondeSchoolData(school?.importedSchoolId);

                    if (!wondeData?.address?.address_postcode) return null; // Skip if no postcode available

                    const regionData = await this.httpService
                        .get(`https://api.postcodes.io/postcodes/${wondeData?.address?.address_postcode}`)
                        .pipe(map((d: AxiosResponse) => d.data))
                        .toPromise();

                    // Some postcodes I checked had a null 'region' field, but the 'european_electoral_region' field might contain the region data, so I’ve added a fallback to check that field when necessary.
                    const region = regionData?.result?.region ?? regionData?.result?.european_electoral_region;

                    if (!region) return null; // Skip if no region data available

                    // Check if region matches enum
                    const validRegion = Object.values(UKRegions)
                        .map((r) => r.toLowerCase())
                        .includes(region.toLowerCase())
                        ? region
                        : null;

                    if (!validRegion) return null;

                    return {
                        id: school.id,
                        region: validRegion
                    };
                } catch (error) {
                    console.log(
                        `Error while fetching region data for school ID ${school?.id} with imported school ID ${school?.importedSchoolId}: ${error}`
                    );

                    newrelic.noticeError(error, {
                        caught: true,
                        handled: false,
                        schoolId: school?.id,
                        wondeSchoolId: school?.importedSchoolId,
                        userId: contextUserId
                    });

                    return null;
                }
            })
        );

        const updatedSchools = results.filter((school) => !!school?.region);

        if (updatedSchools.length) await this.schoolRepository.save(updatedSchools);
    }

    private async getReadingLogTargetByClass(
        schoolIds: string[]
    ): Promise<{ schoolId: string; className: string; activePercent: number }[]> {
        return this.schoolRepository.manager.query(
            `SELECT
                ls.id AS "schoolId",
                lsc.name AS "className",
                calculate_percentage(
                    COUNT(DISTINCT lp.id)::int,
                    COUNT(DISTINCT lp.id) FILTER (WHERE lpt."earnedGoldStar" = true)::int
                ) AS "activePercent"
            FROM lwp_school ls
            JOIN lwp_school_class lsc ON lsc."schoolId" = ls.id
                AND lsc."periodIndex" = ls."curentPeriodIndex"
                AND lsc."isRegistrationClass" = true
                AND lsc.status = '${SchoolClassStatus.ACTIVE}'
                AND lsc."IsReadingLogsEnabled" = true
            JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = lsc.id
            JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
            JOIN lwp_pupil_parent lpp ON lpp."pupilId" = lp.id
                AND lpp.status IN ('${PupilParentStatus.INVITED}', '${PupilParentStatus.ACTIVE}')
            JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id
                AND lpt."periodIndex" = ls."curentPeriodIndex"
                AND lpt."readingTarget" > 0
            JOIN lwp_class_topic lct ON lct.id = lpt."classTopicId"
                AND lct."released" = true
                AND lct."readingTarget" > 0
            JOIN static_lwp_topic slt ON slt.id = lct."topicId" AND slt."isReading" = true
            WHERE ls.id = ANY($1)
            GROUP BY ls.id, lsc.id, lsc.name
            ORDER BY lsc.name`,
            [schoolIds]
        );
    }

    private async getReadingLogCommentEngagement(
        schoolIds: string[],
        previousTerm: boolean
    ): Promise<{ schoolId: string; activePercent: number }[]> {
        const periodOffset = previousTerm ? 1 : 0;

        return this.schoolRepository.manager.query(
            `SELECT
                ls.id AS "schoolId",
                calculate_percentage(
                    COUNT(DISTINCT lp.id)::int,
                    COUNT(DISTINCT lp.id) FILTER (WHERE lpf.id IS NOT NULL)::int
                ) AS "activePercent"
            FROM lwp_school ls
            JOIN lwp_school_class lsc ON lsc."schoolId" = ls.id
                AND lsc."periodIndex" = ls."curentPeriodIndex" - $6
                AND lsc."isRegistrationClass" = true
                AND lsc.status = $2
                AND lsc."IsReadingLogsEnabled" = true
            JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = lsc.id
            JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
            JOIN lwp_pupil_parent lpp ON lpp."pupilId" = lp.id
                AND lpp.status IN ($3, $4)
            LEFT JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilId" = lp.id
            LEFT JOIN lwp_pupil_feedback lpf ON lpf.id = lpfh."lwpPupilFeedbackId"
                AND lpf.type = $5
                AND lpf."periodIndex" = ls."curentPeriodIndex" - $6
                AND lpf."comment" IS NOT NULL
            WHERE ls.id = ANY($1)
            GROUP BY ls.id`,
            [schoolIds, SchoolClassStatus.ACTIVE, PupilParentStatus.INVITED, PupilParentStatus.ACTIVE, FeedbackType.READING, periodOffset]
        );
    }

    private async getTeacherFeedbackInUse(schoolIds: string[]): Promise<{ schoolId: string; inUse: boolean }[]> {
        return this.schoolRepository.manager.query(
            `SELECT
                ls.id AS "schoolId",
                COUNT(DISTINCT lpf.id) > 0 AS "inUse"
            FROM lwp_school ls
            JOIN lwp_school_class lsc ON lsc."schoolId" = ls.id
                AND lsc."periodIndex" = ls."curentPeriodIndex"
                AND lsc."isRegistrationClass" = true
                AND lsc.status = $2
                AND lsc."IsReadingLogsEnabled" = true
            JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = lsc.id
            JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
            JOIN lwp_pupil_parent lpp ON lpp."pupilId" = lp.id
                AND lpp.status = ANY($3)
            LEFT JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilId" = lp.id
            LEFT JOIN lwp_pupil_feedback lpf ON lpf.id = lpfh."lwpPupilFeedbackId"
                AND lpf.type = 'READING'
                AND lpf."periodIndex" = ls."curentPeriodIndex"
                AND lpf."userType" = 'TEACHER'
            WHERE ls.id = ANY($1)
            GROUP BY ls.id`,
            [schoolIds, SchoolClassStatus.ACTIVE, [PupilParentStatus.INVITED, PupilParentStatus.ACTIVE]]
        );
    }

    private async getTopicsCurrentTerm(schoolIds: string[]): Promise<{ schoolId: string; activePercent: number }[]> {
        return this.schoolRepository.manager.query(
            `SELECT
                ls.id AS "schoolId",
                calculate_percentage(
                    COUNT(DISTINCT lp.id)::int,
                    COUNT(DISTINCT lp.id) FILTER (WHERE
                        lpt."earnedGoldStar" = true
                        OR lpt."silverStars" > 0
                        OR lpt."watchedVideo" = true
                    )::int
                ) AS "activePercent"
            FROM lwp_school ls
            JOIN lwp_school_class lsc ON lsc."schoolId" = ls.id
                AND lsc."periodIndex" = ls."curentPeriodIndex"
                AND lsc."isRegistrationClass" = true
                AND lsc.status = $2
            JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = lsc.id
            JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
            JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id
                AND lpt."periodIndex" = ls."curentPeriodIndex"
            JOIN lwp_class_topic lct ON lct.id = lpt."classTopicId"
                AND lct."released" = true
            JOIN static_lwp_topic slt ON slt.id = lct."topicId" AND slt."isReading" = false
            WHERE ls.id = ANY($1)
            GROUP BY ls.id`,
            [schoolIds, SchoolClassStatus.ACTIVE]
        );
    }

    private async getActivitiesCurrentTerm(schoolIds: string[]): Promise<{ schoolId: string; activePercent: number }[]> {
        return this.schoolRepository.manager.query(
            `SELECT
                ls.id AS "schoolId",
                calculate_percentage(
                    COUNT(DISTINCT lp.id)::int,
                    COUNT(DISTINCT lp.id) FILTER (WHERE
                        lpa."earnedStar" = true
                        OR lpa."logFirstAccessed" IS NOT NULL
                    )::int
                ) AS "activePercent"
            FROM lwp_school ls
            JOIN lwp_school_class lsc ON lsc."schoolId" = ls.id
                AND lsc."periodIndex" = ls."curentPeriodIndex"
                AND lsc."isRegistrationClass" = true
                AND lsc.status = $2
            JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = lsc.id
            JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
            JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id
                AND lpt."periodIndex" = ls."curentPeriodIndex"
            JOIN lwp_class_topic lct ON lct.id = lpt."classTopicId"
                AND lct."released" = true
            JOIN static_lwp_topic slt ON slt.id = lct."topicId" AND slt."isReading" = false
            JOIN lwp_pupil_activity lpa ON lpa."topicId" = lpt.id
            WHERE ls.id = ANY($1)
            GROUP BY ls.id`,
            [schoolIds, SchoolClassStatus.ACTIVE]
        );
    }

    private async getTeacherFeedbackCount(schoolIds: string[]): Promise<{ schoolId: string; teacherFeedbackCount: number }[]> {
        return this.schoolRepository.manager.query(
            `SELECT
                ls.id AS "schoolId",
                COUNT(DISTINCT lpf.id)::int AS "teacherFeedbackCount"
            FROM lwp_school ls
            JOIN lwp_school_class lsc ON lsc."schoolId" = ls.id
                AND lsc."periodIndex" = ls."curentPeriodIndex"
                AND lsc."isRegistrationClass" = true
                AND lsc.status = $2
                AND lsc."IsReadingLogsEnabled" = true
            JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = lsc.id
            JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
            LEFT JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilId" = lp.id
            LEFT JOIN lwp_pupil_feedback lpf ON lpf.id = lpfh."lwpPupilFeedbackId"
                AND lpf.type = $3
                AND lpf."periodIndex" = ls."curentPeriodIndex"
                AND lpf."userType" = $4
            WHERE ls.id = ANY($1)
            GROUP BY ls.id`,
            [schoolIds, SchoolClassStatus.ACTIVE, FeedbackType.READING, UserType.TEACHER]
        );
    }

    // @note activity topics only
    private async getTopicsSetCount(schoolIds: string[]): Promise<{ schoolId: string; topicsSetCount: number }[]> {
        return this.schoolRepository.manager.query(
            `SELECT
                ls.id AS "schoolId",
                COUNT(DISTINCT lct.id)::int AS "topicsSetCount"
            FROM lwp_school ls
            JOIN lwp_school_class lsc ON lsc."schoolId" = ls.id
                AND lsc."periodIndex" = ls."curentPeriodIndex"
                AND lsc."isRegistrationClass" = true
                AND lsc.status = $2
            JOIN lwp_class_topic lct ON lct."classId" = lsc.id
                AND lct."released" = true
            JOIN static_lwp_topic slt on slt."id" = lct."topicId"
                AND slt."isReading" = false
            WHERE ls.id = ANY($1)
            GROUP BY ls.id`,
            [schoolIds, SchoolClassStatus.ACTIVE]
        );
    }

    private async getPupilPremiumPercent(schoolIds: string[]): Promise<{ schoolId: string; ppPercent: number }[]> {
        return this.schoolRepository.manager.query(
            `SELECT
                ls.id AS "schoolId",
                calculate_percentage(
                    COUNT(DISTINCT lp.id)::int,
                    COUNT(DISTINCT lp.id) FILTER (WHERE lp."isPremium" = true)::int
                ) AS "ppPercent"
            FROM lwp_school ls
            JOIN lwp_school_class lsc ON lsc."schoolId" = ls.id
                AND lsc."periodIndex" = ls."curentPeriodIndex"
                AND lsc."isRegistrationClass" = true
                AND lsc.status = $2
            JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = lsc.id
            JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
            WHERE ls.id = ANY($1)
            GROUP BY ls.id`,
            [schoolIds, SchoolClassStatus.ACTIVE]
        );
    }

    private async getSchoolReadingTargets(schoolIds: string[]): Promise<{ schoolId: string; readingTarget: number }[]> {
        return this.schoolRepository.manager.query(
            `SELECT
                ls.id AS "schoolId",
                MODE() WITHIN GROUP (ORDER BY lsc."readingTarget") AS "readingTarget"
            FROM lwp_school ls
            JOIN lwp_school_class lsc ON lsc."schoolId" = ls.id
                AND lsc."periodIndex" = ls."curentPeriodIndex"
                AND lsc."isRegistrationClass" = true
                AND lsc.status = $2
                AND lsc."IsReadingLogsEnabled" = true
            WHERE ls.id = ANY($1)
            GROUP BY ls.id`,
            [schoolIds, SchoolClassStatus.ACTIVE]
        );
    }
}
