import { forwardRef, HttpException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { sum } from 'lodash';
import { Gender, PupilParentStatus, ReadingMode, UserStatus } from 'lwp-shared';
import { behaviour } from 'lwp-shared';
import moment from 'moment';
import { nanoid } from 'nanoid';
import { MINIO_CONNECTION } from 'nestjs-minio';
import newrelic from 'newrelic/index';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { UsersService } from 'src/auth/service/user.service';
import { UserType } from 'src/auth/types/UserType';
import { appConstants } from 'src/constants';
import { Pagination } from 'src/paginate';
import { Brackets, Connection, EntityManager, In, Not, ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

import { ClassReadingPageWithPupilOutput } from '../dtos/ClassReadingPageWithPupilOutput';
import { GetPupilBookHistoryOutput } from '../dtos/GetPupilBookHistoryOutput';
import { ParentInfoOfPupilOutput } from '../dtos/ParentInfoOfPupilOutput';
import {
    PupilBookHistoryOutput,
    PupilBookHistoryPaginatedOutput,
    PupilBookHistorySummaryOutput,
    PupilBookOutput
} from '../dtos/PupilBookHistoryOutput';
import { SchoolPupilsOutput } from '../dtos/SchoolPupilsOutput';
import { StaticLwpActivity } from '../entities/activity';
import { LwpClassTopic } from '../entities/class_topic';
import { ImportedStudent } from '../entities/imported_student';
import { LogLwpPupilClassChange } from '../entities/log_lwp_pupil_class_change';
import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { LwpMagicLink } from '../entities/magic_link';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilMathscot } from '../entities/pupil_mathscot';
import { LwpPupilParent } from '../entities/pupil_parent';
import { LwpPupilTopic } from '../entities/pupil_topic';
import { LwpPupilTrophy } from '../entities/pupil_trophy';
import { LwpPupilActivity } from '../entities/pupil-activity';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpProgram } from '../entities/static_lwp_program';
import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { StaticLwpPeriod } from '../entities/static_period';
import { StaticLwpTopic } from '../entities/static_topic';
import { StaticLwpTrophy } from '../entities/static_trophy';
import { LwpUser } from '../entities/user';
import { StaticLwpYearGroup } from '../entities/year_group';
import {
    AcceptUserInvitationInput,
    ActivityInput,
    ActivityStepInput,
    ActivityType,
    AddPupilsInClassInput,
    AssignPupilToNewOrExistingClassInput,
    AwaitingInvitedParentOutput,
    BookReadAt,
    CertificatePdfDataForTrophy,
    ChangeClassPupilPremiumInput,
    ChildPage,
    ClassesAndGroupsInfoOfPupilsOutput,
    ClassTopicInput,
    ConfirmParentDetailsInput,
    CreateSchoolDataForTestingInput,
    EmailTemplateTypes,
    ErrorStatusCodeEnum,
    FeedbackPupilsNameOutput,
    FeedbackType,
    InviteParentForPupilInput,
    InviteParentsWithPupil,
    LinkPupilInput,
    MagicLinkType,
    MergeMathscotItems,
    NavigateToOtherChildPageInput,
    NavigateToOtherChildPageOutput,
    OperationStatus,
    ParentInput,
    ParentsContext,
    PupilBookHistoryFilter,
    PupilBookHistoryInput,
    PupilInput,
    PupilMathscotsCharacter,
    PupilMathscotsColour,
    PupilParentContext,
    PupilPreviousMathscotsOutput,
    PupilReadingNoteOutput,
    PupilRecentBookLogsInput,
    PupilStatus,
    PupilType,
    ReadingType,
    SchoolAndDummyWondeDataInput,
    SchoolClassStatus,
    SchoolInput,
    SubjectTypeForAllFeeds,
    TeacherRole,
    TopicInput,
    TransferPupilParentInput,
    TrophyCertificateFieldName,
    UpdatePupilInput
} from '../model';
import { PupilClassActionType } from '../types/PupilClassActionType';
import { ActivityService } from './activity.service';
import { AdminService } from './admin.service';
import { CertificateService } from './certificate.service';
import { ClassTopicService } from './class_topic.service';
import { HelperService } from './helper.service';
import { LwpPupilFeedbackService } from './lwp_pupil_feedback.service';
import { MagicLinkService } from './magic_link.service';
import { MathscotItemService } from './mathscot-item.service';
import { NotificationService } from './notification.service';
import { ParameterService } from './parameter.service';
import { PupilMathscotService } from './pupil_mathscot.service';
import { PupilParentService } from './pupil_parent.service';
import { PupilTopicService } from './pupil_topic.service';
import { QueryBaseService } from './query_base.service';
import { SchoolService } from './school.service';
import { SchoolClassService } from './school_class.service';
import { StaticLwpInterstitialService } from './static_lwp_interstitial.service';
import { StaticLwpPeriodService } from './static_period.service';
import { StaticTrophyService } from './static_trophy.service';
import { TeacherService } from './teacher.service';
import { TopicService } from './topic.service';
import { TopicDomainService } from './topic_domain.service';
import { WondeService } from './wonde.service';
import { YearGroupService } from './year_group.service';

// Book history covers books only, so reading logged as something else is left out of it.
const BOOK_READING_TYPES = [ReadingType.SCHOOL_BOOK, ReadingType.OWN_BOOK];

@Injectable()
export class PupilService {
    constructor(
        @InjectRepository(LwpPupil)
        private pupilRepository: Repository<LwpPupil>,
        private helperService: HelperService,
        @Inject(MINIO_CONNECTION) private readonly minioClient,
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        @InjectRepository(LwpPupilFeedback)
        private pupilFeedbackRepository: Repository<LwpPupilFeedback>,
        @InjectRepository(LwpSchoolClass)
        private schoolClassRepository: Repository<LwpSchoolClass>,
        @InjectRepository(LwpSchool)
        private schoolRepository: Repository<LwpSchool>,
        @InjectRepository(LwpPupilActivity)
        private pupilActivityRepository: Repository<LwpPupilActivity>,
        @InjectRepository(LwpPupilTopic)
        private pupilTopicRepository: Repository<LwpPupilTopic>,
        @InjectRepository(LwpPupilParent)
        private pupilParentRepository: Repository<LwpPupilParent>,
        @InjectRepository(LwpClassTopic)
        private classTopicRepository: Repository<LwpClassTopic>,
        @InjectRepository(LwpPupilTrophy)
        private pupilTrophyRepository: Repository<LwpPupilTrophy>,
        @InjectRepository(LwpPupilMathscot)
        private pupilMathscotRepository: Repository<LwpPupilMathscot>,
        @InjectRepository(ImportedStudent)
        private importedStudentRepository: Repository<ImportedStudent>,
        @InjectRepository(LwpPupilParent)
        private parentPupilRepository: Repository<LwpPupilParent>,
        @InjectRepository(StaticLwpTopic)
        private staticLwpTopicRepository: Repository<StaticLwpTopic>,
        @InjectRepository(StaticLwpActivity)
        private staticLwpActivityRepository: Repository<StaticLwpActivity>,
        @InjectRepository(StaticLwpYearGroup)
        private yearGroupRepository: Repository<StaticLwpYearGroup>,
        @InjectRepository(StaticLwpSubject)
        private subjectRepository: Repository<StaticLwpSubject>,
        @InjectRepository(LogLwpPupilClassChange)
        private logLwpPupilClassChangeRepository: Repository<LogLwpPupilClassChange>,
        @InjectRepository(LwpMagicLink)
        private magicLinkRepository: Repository<LwpMagicLink>,
        private pupilTopicService: PupilTopicService,
        private queryBaseService: QueryBaseService,
        private notificationService: NotificationService,
        private certificateService: CertificateService,
        private periodService: StaticLwpPeriodService,
        private mathscotItemService: MathscotItemService,
        private staticTrophyService: StaticTrophyService,
        private pupilMathscotService: PupilMathscotService,
        private pupilParentService: PupilParentService,
        private pupilFeedbackService: LwpPupilFeedbackService,
        private classTopicService: ClassTopicService,
        @Inject(forwardRef(() => SchoolService)) private schoolService: SchoolService,
        private teacherService: TeacherService,
        private schoolClassService: SchoolClassService,
        private staticInterstitialService: StaticLwpInterstitialService,
        private topicService: TopicService,
        private yearGroupService: YearGroupService,
        private topicDomainService: TopicDomainService,
        private activityService: ActivityService,
        private magicLinkService: MagicLinkService,
        private adminService: AdminService,
        private parameterService: ParameterService,
        private wondeService: WondeService,
        private usersService: UsersService,
        private shallowUserService: ShallowUserService,
        private connection: Connection
    ) {}

    public async changeClassPupilsPremium(input: [ChangeClassPupilPremiumInput]): Promise<boolean> {
        if (input?.length > 0) {
            for (const pupilObj of input) {
                await this.pupilRepository.update({ id: pupilObj?.id }, { isPremium: pupilObj?.isPremium });
            }

            return true;
        }

        return false;
    }

    public async getClassesAndGroupsInfoOfPupils(
        schoolId: string,
        classId: string,
        teacherId: string,
        isSchoolLeader: boolean,
        isAdmin: boolean,
        readingOnly: boolean
    ): Promise<ClassesAndGroupsInfoOfPupilsOutput[]> {
        return (
            await this.schoolClassRepository.query(
                `
            SELECT COALESCE(jsonb_agg("pupil"), jsonb_build_array()) AS "results" FROM (
                SELECT
                    jsonb_build_object(
                        'id', lp.id,
                        'pupilName', concat(firstname, ' ', lastname),
                        'groups', coalesce(
                            array_agg(distinct jsonb_build_object('id', lsc.id, 'name', lsc.name, 'yearGroup', slyg.year)) FILTER (WHERE lsc."parentClassId" IS NOT NULL AND (lsc.id != COALESCE($2::bigint, 0))),
                            ARRAY[]::jsonb[]
                        ),
                        'classes', coalesce(
                            array_agg(distinct jsonb_build_object('id', lsc.id, 'name', lsc.name, 'yearGroup', slyg.year)) FILTER (WHERE lsc."parentClassId" IS NULL),
                            ARRAY[]::jsonb[]
                        )
                    ) AS "pupil"
                FROM
                    lwp_pupil lp
                    JOIN lwp_school ls ON lp."schoolId" = ls.id
                    JOIN lwp_class_pupil lcp ON lcp."lwpPupilId" = lp.id
                    JOIN lwp_school_class lsc ON lsc."schoolId" = ls.id
                        AND lsc."periodIndex" >= ls."curentPeriodIndex"
                        AND lsc.id = lcp."lwpSchoolClassId"
                    JOIN static_lwp_year_group slyg on slyg.id = lsc."yearGroup"
                    JOIN lwp_class_teacher lct ON lct."lwpSchoolClassId" = lsc.id
                    LEFT JOIN lwp_class_teacher lct_parent_class ON lct."lwpSchoolClassId" = lsc."parentClassId"
                WHERE
                    ls.id = $1
                    AND ($2::bigint IS NULL OR lsc.id = $2::bigint OR lsc."parentClassId" = $2::bigint)
                    AND ($3::bigint IS NULL OR lct."lwpUserId" = $3::bigint OR lct_parent_class."lwpUserId" = $3::bigint)
                    AND (NOT $4::boolean OR (lsc."IsReadingLogsEnabled" OR (lsc."parentClassId" IS NOT NULL AND lsc."IsReadingLogsEnabled")))
                GROUP BY
                    lp.id
                ORDER BY
                    lp.firstname ASC
            ) iQ;
        `,
                [schoolId, classId, isSchoolLeader || isAdmin ? null : teacherId, readingOnly]
            )
        )[0].results;
    }

    public async getFeedbackForGroupReading(
        limit = 15,
        offset = 0,
        schoolId: string,
        classId: string,
        pupilIds?: string[]
    ): Promise<Pagination<LwpPupilFeedback>> {
        let results = [];
        let feedbackIds = [];
        let total = 0;
        let pupilFeedbackBase: SelectQueryBuilder<LwpPupilFeedback> = null;

        pupilFeedbackBase = this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .leftJoin('feedback.pupils', 'pupils')
            .innerJoin('pupils.classes', 'schoolClass')
            .where('feedback.type = :type', { type: SubjectTypeForAllFeeds.READING })
            .groupBy('feedback.id');

        if (classId) {
            pupilFeedbackBase = pupilFeedbackBase.andWhere('schoolClass.id = :classId', { classId });
        } else {
            pupilFeedbackBase = pupilFeedbackBase.innerJoin('schoolClass.school', 'school').andWhere('school.id = :schoolId', { schoolId });
        }

        if (pupilIds?.length > 0) {
            pupilFeedbackBase = pupilFeedbackBase.andWhere('pupils.id IN (:...pupilIds)', {
                pupilIds: pupilIds
            });
        }

        [feedbackIds, total] = await pupilFeedbackBase
            .select('feedback.id')
            .orderBy('feedback.logCreatedAt', 'DESC')
            .offset(offset)
            .limit(limit)
            .getManyAndCount();

        if (feedbackIds.length === 0) {
            return new Pagination<LwpPupilFeedback>({
                results: [],
                total: 0,
                limit,
                offset
            });
        }

        results = await this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .leftJoinAndSelect('feedback.pupils', 'pupils')
            .orderBy('feedback.bookReadAt', 'DESC')
            .andWhere('feedback.id IN (:...feedbackIds)', {
                feedbackIds: feedbackIds?.map((feedbackId) => feedbackId?.id)
            })
            .getMany();

        return new Pagination<LwpPupilFeedback>({
            results,
            total,
            limit,
            offset
        });
    }

    public async getClassMissingPupils(classId: string): Promise<LwpPupil[]> {
        const schoolClass = await this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoinAndSelect('schoolClass.pupils', 'pupils')
            .leftJoinAndSelect('pupils.parents', 'parents')
            .where('schoolClass.id = :classId', { classId })
            .getOne();

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        const missingPupils = schoolClass?.pupils.filter(async (p) => (await p.getPupilStatus()) === PupilStatus.MISSING);

        return missingPupils;
    }

    public async getFeedbackPupils(feedbackId: string): Promise<FeedbackPupilsNameOutput[]> {
        const currentPeriodIndex = await this.periodService.getCurrentPeriodIndex();

        const pupilFeedbackBase = await this.pupilFeedbackRepository
            .createQueryBuilder('feedback')
            .leftJoinAndSelect('feedback.pupils', 'pupils')
            .leftJoinAndSelect('pupils.classes', 'classes')
            .leftJoin('classes.period', 'period')
            .select(['feedback.id', 'pupils.firstname', 'pupils.lastname', 'classes.name'])
            .where('feedback.id = :feedbackId', { feedbackId })
            .andWhere('period.index = :periodId', { periodId: currentPeriodIndex })
            .andWhere('classes.parentClassId IS NULL')
            .andWhere('classes.isRegistrationClass = true')
            .getOne();

        return pupilFeedbackBase?.pupils?.map((item) => ({
            firstname: item?.firstname,
            lastname: item?.lastname,
            className: item?.classes?.[0]?.name ?? ''
        }));
    }

    public async getClassImportedPupils(classId: string): Promise<LwpPupil[]> {
        const pupils = await this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoin('pupil.classes', 'schoolClass')
            .leftJoin('pupil.parents', 'pupilParent')
            .where('schoolClass.id = :classId', { classId })
            .andWhere('pupilParent.status = :pupilParentStatus', { pupilParentStatus: PupilParentStatus.IMPORTED })
            .orderBy('pupil.firstname', 'ASC')
            .addOrderBy('pupil.lastname', 'ASC')
            .getMany();

        return pupils;
    }

    public async getAwaitingInvitedPupils(classId: number): Promise<AwaitingInvitedParentOutput[]> {
        const pupils = await this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoin('pupil.classes', 'schoolClass')
            .leftJoinAndSelect('pupil.parents', 'pupilParent')
            .leftJoin('pupilParent.parent', 'parent')
            .where('schoolClass.id = :classId', { classId })
            .andWhere('pupilParent.lastInvitationEmailSent IS NULL')
            .andWhere('pupilParent.status = :pupilParentStatus', { pupilParentStatus: PupilParentStatus.INVITED })
            .andWhere('parent.userStatus IN (:...parentStatus)', {
                parentStatus: [UserStatus.ACTIVE, UserStatus.INVITED, UserStatus.ACCOUNTLESS]
            })
            .orderBy('pupil.firstname', 'ASC')
            .addOrderBy('pupil.lastname', 'ASC')
            .select(['pupil.id', 'pupil.firstname', 'pupil.lastname', 'pupilParent'])
            .getMany();

        return pupils;
    }

    public async getTargetPupilReadingTopicId(
        targetChildId: string,
        currentPupilReadingTopicId: string
    ): Promise<NavigateToOtherChildPageOutput> {
        const subQuery = this.classTopicRepository
            .createQueryBuilder('classTopic')
            .leftJoin('classTopic.pupilTopics', 'pupilTopic')
            .where('pupilTopic.id = :currentPupilReadingTopicId', { currentPupilReadingTopicId })
            .select('classTopic.releaseDate');

        const pupilTopic = await this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoin('pupilTopic.topic', 'staticTopic')
            .leftJoin('pupilTopic.pupil', 'pupil')
            .leftJoin('pupilTopic.classTopic', 'classTopic')
            .leftJoin('pupil.school', 'school')
            .where('pupil.id = :pupilId', { pupilId: targetChildId })
            .andWhere('staticTopic.isReading = :isReading', { isReading: true })
            .andWhere('classTopic.releaseDate = (' + subQuery.getQuery() + ')')
            .andWhere('pupilTopic.periodIndex = school.curentPeriod.index')
            .select('pupilTopic.id')
            .setParameters(subQuery.getParameters())
            .getOne();

        return {
            page: ChildPage.READING,
            id: pupilTopic?.id ?? null
        };
    }

    public async getTargetPupilTopicId(targetChildId: string, currentPupilTopicId: string): Promise<NavigateToOtherChildPageOutput> {
        const subQuery = this.staticLwpTopicRepository
            .createQueryBuilder('st')
            .leftJoin('st.pupilTopics', 'pt')
            .where('pt.id = :currentPupilTopicId', { currentPupilTopicId })
            .andWhere('st.isReading = :isReading', { isReading: false })
            .andWhere('st.isPublished  = :isPublished ', { isPublished: true })
            .select('st.id', 'staticTopicId');

        const pupilTopic = await this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoin('pupilTopic.topic', 'staticTopic')
            .leftJoin('pupilTopic.pupil', 'pupil')
            .leftJoin('pupil.school', 'school')
            .where('pupil.id = :pupilId', { pupilId: targetChildId })
            .andWhere('staticTopic.id = (' + subQuery.getQuery() + ')')
            .andWhere('pupilTopic.periodIndex = school.curentPeriod.index')
            .orderBy('pupilTopic.releaseDate', 'DESC')
            .select('pupilTopic.id')
            .setParameters(subQuery.getParameters())
            .getOne();

        return {
            page: ChildPage.PUPILTOPIC,
            id: pupilTopic?.id ?? null
        };
    }

    public async getTargetPupilActivityId(targetChildId: string, currentPupilActivityId: string): Promise<NavigateToOtherChildPageOutput> {
        const subQuery = this.staticLwpActivityRepository
            .createQueryBuilder('sa')
            .leftJoin('sa.pupilActivities', 'pa')
            .where('pa.id = :currentPupilActivityId', { currentPupilActivityId })
            .select('sa.id');

        const pupilActivity = await this.pupilActivityRepository
            .createQueryBuilder('pupilActivity')
            .leftJoin('pupilActivity.activity', 'staticActivity')
            .leftJoin('pupilActivity.topic', 'pupilTopic')
            .leftJoin('pupilActivity.pupil', 'pupil')
            .leftJoin('pupil.school', 'school')
            .where('pupil.id = :pupilId', { pupilId: targetChildId })
            .andWhere('staticActivity.id = (' + subQuery.getQuery() + ')')
            .andWhere('pupilTopic.periodIndex = school.curentPeriod.index')
            .orderBy('pupilTopic.releaseDate', 'DESC')
            .select(['pupilActivity.id', 'pupilTopic.id', 'pupilTopic.silverStars'])
            .setParameters(subQuery.getParameters())
            .getOne();

        if (pupilActivity?.topic?.silverStars === 0)
            return {
                page: ChildPage.PUPILTOPIC,
                id: pupilActivity?.topic?.id ?? null
            };

        return {
            page: ChildPage.PUPILACTIVITY,
            id: pupilActivity?.id ?? null
        };
    }

    private navigateToOtherChildTargetPage: {
        [key in ChildPage]: (targetChildId: string, currentContextId: string) => Promise<NavigateToOtherChildPageOutput>;
    } = {
        [ChildPage.READING]: (tId, cId) => this.getTargetPupilReadingTopicId(tId, cId),
        [ChildPage.PUPILTOPIC]: (tId, cId) => this.getTargetPupilTopicId(tId, cId),
        [ChildPage.PUPILACTIVITY]: (tId, cId) => this.getTargetPupilActivityId(tId, cId)
    };

    public async navigateToOtherChildPage(input: NavigateToOtherChildPageInput): Promise<NavigateToOtherChildPageOutput> {
        return await this.navigateToOtherChildTargetPage[input.currentPage](input.targetChildId, input.currentContextId);
    }

    public async removeParentFromPupil(pupilId: string, parentId: string): Promise<LwpPupil> {
        const pupil = await this.pupilRepository.findOne({ where: { id: pupilId } });

        if (!pupil) throw new HttpException('Pupil not found.', ErrorStatusCodeEnum._535);

        await this.pupilParentService.deletePupilParentRelation(parentId, pupilId, null);

        return pupil;
    }

    public async updatePupil(input: UpdatePupilInput): Promise<LwpPupil> {
        const pupil = await this.pupilRepository.findOne({ where: { id: input.id } });

        pupil.firstname = input.firstname;
        pupil.lastname = input.lastname;
        pupil.isPremium = input.isPremium;

        if (input?.UPN) {
            if (this.helperService.validateUPN(input.UPN)) {
                pupil.UPN = input.UPN;
            } else {
                throw new HttpException('Invalid UPN', ErrorStatusCodeEnum._535);
            }
        }

        return await this.pupilRepository.save(pupil);
    }

    public async addPupilHelperWithClassId(input: PupilInput, invitedBy: string | LwpUser, manager?: EntityManager): Promise<LwpPupil> {
        const schoolClassRepository: Repository<LwpSchoolClass> = manager
            ? manager.getRepository(LwpSchoolClass)
            : this.schoolClassRepository;
        const pupilRepository: Repository<LwpPupil> = manager ? manager.getRepository(LwpPupil) : this.pupilRepository;

        try {
            const schoolClass = await schoolClassRepository
                .createQueryBuilder('schoolClass')
                .leftJoin('schoolClass.pupils', 'pupils')
                .leftJoin('schoolClass.yearGroup', 'yearGroup')
                .leftJoin('schoolClass.school', 'school')
                .leftJoin('schoolClass.period', 'schoolClassPeriod')
                .where('schoolClass.id = :id', { id: input.classId })
                .select(['schoolClass.id', 'pupils.firstname', 'pupils.lastname', 'yearGroup.year', 'school.id', 'schoolClassPeriod.index'])
                .getOne();

            if (!schoolClass) throw new HttpException('Invalid class id.', ErrorStatusCodeEnum._535);

            const isChildNameExist = this.helperService.isChildNameExist(schoolClass?.pupils, input.firstname, input.lastname);

            if (isChildNameExist)
                throw new HttpException(
                    `We already have a child in this class called ${input.firstname} ${input.lastname}. If you’d like to add this child to your account, please speak to the parent who has already registered, or the class teacher.`,
                    ErrorStatusCodeEnum._535
                );

            const pupil = new LwpPupil();

            pupil.firstname = input.firstname;
            pupil.lastname = input.lastname;
            pupil.dateOfBirth = input?.dateOfBirth;
            pupil.gender = input?.gender;
            pupil.school = schoolClass?.school;

            if (input.isPupilPremium != null) {
                pupil.isPremium = input.isPupilPremium;
            }

            const shallowUser = this.shallowUserService.newShallowUser(invitedBy);

            pupil.logCreatedBy = shallowUser;
            pupil.logUpdatedBy = shallowUser;

            pupil.startedSchool =
                input?.startedSchool ??
                `${schoolClass?.period?.index - this.helperService.getYearFromYearGroup(schoolClass?.yearGroup?.year)}`;

            if (input?.upn) {
                if (this.helperService.validateUPN(input.upn)) {
                    pupil.UPN = input.upn;
                } else {
                    throw new HttpException('Invalid UPN', ErrorStatusCodeEnum._535);
                }
            }

            if (!pupil.classes) {
                pupil.classes = [];
            }

            pupil.classes.push(schoolClass);

            await schoolClassRepository.update({ id: schoolClass?.id }, { isStatsNeedUpdate: true });

            return await pupilRepository.save(pupil);
        } catch (error) {
            if (error.code === '23505') {
                throw new HttpException(
                    'A pupil with this UPN is already registered. Please verify the details and try again.',
                    ErrorStatusCodeEnum._535
                );
            } else {
                throw new HttpException(`${error?.message}`, ErrorStatusCodeEnum._535, { cause: error });
            }
        }
    }

    public async parentInvitationEmailHelper(
        pupilParent: LwpPupilParent,
        magicLinkToken: string,
        rejectMagicLinkToken: string,
        preference?: string,
        isBulkProcess = false,
        sendNow = false,
        manager?: EntityManager
    ): Promise<void> {
        const userRepository: Repository<LwpUser> = manager ? manager.getRepository(LwpUser) : this.userRepository;

        await this.notificationService.parentInvitationEmail(
            pupilParent,
            magicLinkToken,
            rejectMagicLinkToken,
            preference,
            isBulkProcess,
            sendNow,
            manager
        );
        await userRepository.update({ id: pupilParent?.parent?.id }, { lastInvitationEmailSent: new Date() });
    }

    public async changeRejectedParentToInvited(parentId: string): Promise<void> {
        const user = await this.userRepository.findOne({ where: { id: parentId }, select: ['userStatus'] });

        if (user?.userStatus === UserStatus.REJECTED)
            await this.userRepository.update({ id: parentId }, { userStatus: UserStatus.INVITED });
    }

    public async sendParentNotification(
        parentId: string,
        pupilId: string,
        isBulkProcess = false,
        sendOnPhone = false,
        manager?: EntityManager
    ): Promise<void> {
        const pupilParentRepository: Repository<LwpPupilParent> = manager
            ? manager.getRepository(LwpPupilParent)
            : this.pupilParentRepository;
        const pupilTopicRepository: Repository<LwpPupilTopic> = manager ? manager.getRepository(LwpPupilTopic) : this.pupilTopicRepository;

        const pupilParent = await pupilParentRepository.findOne({
            where: { parentId, pupilId },
            relations: ['parent', 'pupil', 'pupil.school', 'pupil.school.curentPeriod']
        });

        const { value } = await this.parameterService.getParameterByKey('SEND_TOPIC_EMAILS_TO_INVITED_USER', manager);

        if (!pupilParent?.id) return;

        const rejectMagicLink = await this.magicLinkService.generateMagicLink(
            {
                userId: pupilParent?.parent?.id,
                pupilTopicId: null,
                pupilId: pupilParent?.pupil?.id,
                topicId: null,
                schoolId: null,
                termId: null,
                reportType: null,
                trophyId: null,
                type: MagicLinkType.REJECT_INVITATION
            },
            manager
        );

        if (value === 'true') {
            if (pupilParent?.lastInvitationEmailSent == null) {
                const dateBefore14Days = moment().subtract(14, 'days').toDate();
                const pupilTopicWithIn14Days = await pupilTopicRepository
                    .createQueryBuilder('pupilTopic')
                    .leftJoinAndSelect('pupilTopic.pupil', 'pupil')
                    .leftJoinAndSelect('pupilTopic.period', 'period')
                    .leftJoinAndSelect('pupilTopic.classTopic', 'classTopic')
                    .leftJoinAndSelect('classTopic.topic', 'staticTopic')
                    .leftJoinAndSelect('classTopic.class', 'class')
                    .leftJoinAndSelect('class.school', 'school')
                    // The topic emails below address the parent as the class's main teacher, so the alias has to
                    // be loaded here as well - without it a parent's first invitation named no teacher (LEA-6568).
                    .leftJoin('class.mainTeacher', 'mainTeacher')
                    .addSelect(['mainTeacher.id', 'mainTeacher.nameForChildren'])
                    .where('pupilTopic.pupilId = :pupilId', { pupilId: pupilParent?.pupil?.id })
                    .andWhere('period.index >= :periodIndex', { periodIndex: pupilParent?.pupil?.school?.curentPeriod?.index })
                    .andWhere('pupilTopic.parentsNotified = :parentsNotified', { parentsNotified: true })
                    .andWhere('pupilTopic.releaseDate >= :dateBefore14Days', { dateBefore14Days })
                    .orderBy('pupilTopic.releaseDate', 'DESC')
                    .getOne();

                if (pupilTopicWithIn14Days?.id) {
                    if (pupilTopicWithIn14Days?.classTopic?.topic?.isReading === true) {
                        const readingTopicMagicLink = await this.magicLinkService.generateMagicLink(
                            {
                                userId: pupilParent?.parent?.id,
                                pupilTopicId: pupilTopicWithIn14Days.id,
                                pupilId: pupilTopicWithIn14Days?.pupil?.id,
                                topicId: null,
                                trophyId: null,
                                schoolId: null,
                                termId: null,
                                reportType: null,
                                type: MagicLinkType.READING
                            },
                            manager
                        );

                        await this.notificationService.sendPupilReadingTopicReleased(
                            pupilTopicWithIn14Days?.classTopic,
                            pupilParent?.parent,
                            pupilTopicWithIn14Days.pupil,
                            pupilParent,
                            pupilTopicWithIn14Days?.readingTarget,
                            readingTopicMagicLink.url,
                            readingTopicMagicLink?.url,
                            rejectMagicLink?.url,
                            pupilTopicWithIn14Days,
                            true,
                            manager
                        );
                    } else {
                        const topicMagicLink = await this.magicLinkService.generateMagicLink(
                            {
                                userId: pupilParent?.parent?.id,
                                pupilTopicId: pupilTopicWithIn14Days.id,
                                pupilId: pupilTopicWithIn14Days?.pupil?.id,
                                topicId: null,
                                trophyId: null,
                                schoolId: null,
                                termId: null,
                                reportType: null,
                                type: MagicLinkType.TOPICACCESS
                            },
                            manager
                        );

                        await this.notificationService.sendPupilTopics(
                            pupilTopicWithIn14Days?.classTopic,
                            pupilParent?.parent,
                            pupilTopicWithIn14Days.pupil,
                            pupilParent,
                            false,
                            pupilTopicWithIn14Days,
                            topicMagicLink?.url,
                            topicMagicLink?.url,
                            rejectMagicLink?.url,
                            EmailTemplateTypes.sendPupilTopics,
                            true,
                            manager
                        );
                    }
                } else {
                    const pupilTopicBefore14Days = await pupilTopicRepository
                        .createQueryBuilder('pupilTopic')
                        .leftJoinAndSelect('pupilTopic.pupil', 'pupil')
                        .leftJoinAndSelect('pupilTopic.period', 'period')
                        .leftJoinAndSelect('pupilTopic.classTopic', 'classTopic')
                        .leftJoinAndSelect('classTopic.topic', 'staticTopic')
                        .where('pupilTopic.pupilId = :pupilId', { pupilId: pupilParent?.pupil?.id })
                        .andWhere('period.index >= :periodIndex', { periodIndex: pupilParent?.pupil?.school?.curentPeriod?.index })
                        .andWhere('pupilTopic.parentsNotified = :parentsNotified', { parentsNotified: true })
                        .andWhere('pupilTopic.releaseDate <= :dateBefore14Days', { dateBefore14Days })
                        .orderBy('pupilTopic.releaseDate', 'DESC')
                        .getOne();

                    if (pupilTopicBefore14Days?.id) {
                        const topicMagicLink = await this.magicLinkService.generateMagicLink(
                            {
                                userId: pupilParent?.parent?.id,
                                pupilTopicId: pupilTopicBefore14Days.id,
                                pupilId: pupilTopicBefore14Days?.pupil?.id,
                                topicId: null,
                                trophyId: null,
                                schoolId: null,
                                termId: null,
                                reportType: null,
                                type:
                                    pupilTopicBefore14Days?.classTopic?.topic?.isReading === true
                                        ? MagicLinkType.READING
                                        : MagicLinkType.TOPICACCESS
                            },
                            manager
                        );

                        const invitationMagicLinkUrl = topicMagicLink?.url;

                        if (pupilParent?.parent?.email) {
                            await this.parentInvitationEmailHelper(
                                pupilParent,
                                invitationMagicLinkUrl,
                                rejectMagicLink?.url,
                                'email',
                                isBulkProcess,
                                true,
                                manager
                            );
                        }

                        if (pupilParent?.parent?.phoneNumber && sendOnPhone) {
                            await this.parentInvitationEmailHelper(
                                pupilParent,
                                invitationMagicLinkUrl,
                                rejectMagicLink?.url,
                                'phone',
                                isBulkProcess,
                                true,
                                manager
                            );
                        }
                    }
                }
            } else {
                const pupilTopic = await pupilTopicRepository
                    .createQueryBuilder('pupilTopic')
                    .leftJoinAndSelect('pupilTopic.pupil', 'pupil')
                    .leftJoinAndSelect('pupilTopic.period', 'period')
                    .leftJoinAndSelect('pupilTopic.classTopic', 'classTopic')
                    .leftJoinAndSelect('classTopic.topic', 'staticTopic')
                    .where('pupilTopic.pupilId = :pupilId', { pupilId: pupilParent?.pupil?.id })
                    .andWhere('period.index >= :periodIndex', { periodIndex: pupilParent?.pupil?.school?.curentPeriod?.index })
                    .getOne();

                if (pupilTopic?.id) {
                    const topicMagicLink = await this.magicLinkService.generateMagicLink(
                        {
                            userId: pupilParent?.parent?.id,
                            pupilTopicId: pupilTopic.id,
                            pupilId: pupilTopic?.pupil?.id,
                            schoolId: null,
                            termId: null,
                            reportType: null,
                            topicId: null,
                            trophyId: null,
                            type: pupilTopic?.classTopic?.topic?.isReading === true ? MagicLinkType.READING : MagicLinkType.TOPICACCESS
                        },
                        manager
                    );

                    const invitationMagicLinkUrl = topicMagicLink?.url;

                    if (pupilParent?.parent?.email) {
                        await this.parentInvitationEmailHelper(
                            pupilParent,
                            invitationMagicLinkUrl,
                            rejectMagicLink?.url,
                            'email',
                            isBulkProcess,
                            true,
                            manager
                        );
                    }

                    if (pupilParent?.parent?.phoneNumber && sendOnPhone) {
                        await this.parentInvitationEmailHelper(
                            pupilParent,
                            invitationMagicLinkUrl,
                            rejectMagicLink?.url,
                            'phone',
                            isBulkProcess,
                            true,
                            manager
                        );
                    }
                }
            }
        } else {
            const topicMagicLink = await this.magicLinkService.generateMagicLink(
                {
                    userId: pupilParent?.parent?.id,
                    pupilTopicId: null,
                    pupilId: pupilParent?.pupil?.id,
                    schoolId: null,
                    termId: null,
                    reportType: null,
                    topicId: null,
                    trophyId: null,
                    type: MagicLinkType.TOPICACCESS
                },
                manager
            );

            const invitationMagicLinkUrl = topicMagicLink?.url;

            if (pupilParent?.parent?.email) {
                await this.parentInvitationEmailHelper(
                    pupilParent,
                    invitationMagicLinkUrl,
                    rejectMagicLink?.url,
                    'email',
                    isBulkProcess,
                    true,
                    manager
                );
            }

            if (pupilParent?.parent?.phoneNumber && sendOnPhone) {
                await this.parentInvitationEmailHelper(
                    pupilParent,
                    invitationMagicLinkUrl,
                    rejectMagicLink?.url,
                    'phone',
                    isBulkProcess,
                    true,
                    manager
                );
            }
        }
    }

    public async postInviteParentWithPupilWork(
        pupil: LwpPupil,
        parent: LwpUser,
        schoolClassId: string,
        invitedBy: string | LwpUser,
        manager?: EntityManager
    ): Promise<void> {
        const schoolClassRepository: Repository<LwpSchoolClass> = manager
            ? manager.getRepository(LwpSchoolClass)
            : this.schoolClassRepository;
        const classTopicRepository: Repository<LwpClassTopic> = manager ? manager.getRepository(LwpClassTopic) : this.classTopicRepository;

        const schoolClass = await schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoin('schoolClass.yearGroup', 'yearGroup')
            .leftJoin('schoolClass.period', 'period')
            .where('schoolClass.id = :id', { id: schoolClassId })
            .select(['schoolClass.id', 'yearGroup.mathscotThemes', 'period.index'])
            .getOne();

        await this.pupilParentService.createPupilParentRelation(
            {
                parent,
                pupil,
                invitedBy: this.shallowUserService.newShallowUser(invitedBy),
                status: PupilParentStatus.INVITED,
                importedStudentContactID: null
            },
            manager
        );

        const topicsForRelease = await classTopicRepository
            .createQueryBuilder('classTopic')
            .leftJoin('classTopic.topic', 'staticTopic')
            .leftJoin('staticTopic.activities', 'staticActivities')
            .leftJoin('classTopic.class', 'schoolClass')
            .where('schoolClass.id = :schoolClassId', { schoolClassId })
            .andWhere('classTopic.released = true')
            .select([
                'classTopic.id',
                'staticTopic.id',
                'staticTopic.isReading',
                'classTopic.releaseDate',
                'classTopic.readingTarget',
                'staticActivities.id',
                'staticActivities.isHidden'
            ])
            .getMany();

        await this.helperService.topicReleaseHelper(topicsForRelease, pupil, schoolClass, parent, manager);

        // Send email for invite pupil here

        await this.sendParentNotification(parent?.id, pupil?.id, false, false, manager);
    }

    public async pupilWatchedIntoVideo(parentId: string): Promise<boolean> {
        await this.userRepository.update({ id: parentId }, { watchedIntroVideo: true });

        return true;
    }

    public async getPupilByAdmin(pupilId: string): Promise<LwpPupil> {
        return await this.pupilRepository.findOne({
            where: { id: pupilId },
            relations: ['importedStudent']
        });
    }

    public async getPupilByParent(pupilId: string, parentId: string): Promise<LwpPupil> {
        const pupilParentBase = await this.queryBaseService.pupilParentBase(pupilId, parentId);
        const pupil = await pupilParentBase.select('pupil').getRawOne();

        if (!pupil) throw new HttpException('Pupil not found.', ErrorStatusCodeEnum._535);
        const newPupil = Object.assign({}, ...this.helperService.changeObjKeys(pupil, 'pupil_'));

        if (newPupil?.id) return newPupil;

        throw new HttpException('This pupil is not associated with you.', ErrorStatusCodeEnum._535);
    }

    public async getPupilByTeacher(pupilId: string, teacherId: string): Promise<LwpPupil> {
        const pupilTeacherBase = await this.queryBaseService.pupilTeacherBase(pupilId, teacherId);

        const pupil = await pupilTeacherBase.select('pupils').getRawOne();

        if (!pupil) throw new HttpException('Pupil not found.', ErrorStatusCodeEnum._535);

        const newPupil = Object.assign({}, ...this.helperService.changeObjKeys(pupil, 'pupils_'));

        if (newPupil?.id) return newPupil;

        throw new HttpException('This pupil is not associated with you.', ErrorStatusCodeEnum._535);
    }

    public async getPupilByLeader(pupilId: string, teacherId: string): Promise<LwpPupil> {
        const pupilTeacherBase = await this.queryBaseService.pupilLeaderBase(pupilId, teacherId);

        const pupil = await pupilTeacherBase.select('pupils').getRawOne();

        if (!pupil) throw new HttpException('Pupil not found.', ErrorStatusCodeEnum._535);

        const newPupil = Object.assign({}, ...this.helperService.changeObjKeys(pupil, 'pupils_'));

        if (newPupil?.id) return newPupil;

        throw new HttpException('This pupil is not associated with you.', ErrorStatusCodeEnum._535);
    }

    public async getPupils(parentId: string, isActiveInCurrentAcademic?: boolean): Promise<LwpPupil[]> {
        let pupilsQueryBuilder: SelectQueryBuilder<LwpPupil> = this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoin('pupil.parents', 'pupilParent')
            .leftJoin('pupilParent.parent', 'parent')
            .where('parent.id = :parentId', { parentId })
            .andWhere('pupilParent.status = :status', { status: PupilParentStatus.ACTIVE });

        if (isActiveInCurrentAcademic != null) {
            pupilsQueryBuilder = pupilsQueryBuilder
                .leftJoin('pupil.classes', 'pupilClass')
                .leftJoin('pupilClass.period', 'period')
                .leftJoin('pupil.school', 'school')
                .leftJoin('school.curentPeriod', 'currentPeriod');

            if (isActiveInCurrentAcademic) {
                pupilsQueryBuilder = pupilsQueryBuilder
                    .andWhere(
                        new Brackets((qb) => {
                            qb.where('pupilClass.isRegistrationClass = true').orWhere('pupilClass.isGroupAcrossClasses = true');
                        })
                    )
                    .andWhere('pupilClass.status = :status', { status: SchoolClassStatus.ACTIVE })
                    .andWhere('period.index >= school.curentPeriod.index')
                    .andWhere('school.inactive = false');
            } else {
                pupilsQueryBuilder = pupilsQueryBuilder
                    .andWhere(
                        new Brackets((qb) => {
                            qb.where('pupilClass.status != :status AND pupilClass.isRegistrationClass = true', {
                                status: SchoolClassStatus.ACTIVE
                            })
                                .orWhere('pupilClass.id is null')
                                .orWhere('period.index < school.curentPeriod.index')
                                .orWhere('school.inactive = true');
                        })
                    )
                    .groupBy('pupil.id');
            }
        }

        return await pupilsQueryBuilder
            .select(['pupil.id', 'pupil.firstname', 'pupil.lastname'])
            .orderBy('pupil.firstname', 'ASC')
            .getMany();
    }

    public getPupilById(pupilId: string): Promise<LwpPupil> {
        return this.pupilRepository.findOne({ where: { id: pupilId } });
    }

    public async getAllPupils(parentId: string): Promise<LwpPupilParent[]> {
        const parent = await this.userRepository.findOne({
            where: { id: parentId },
            relations: ['pupils', 'pupils.pupil']
        });

        return parent?.pupils?.length > 0 ? parent?.pupils : [];
    }

    public async getClassReadingFeedbacksOfPupils(classId: string, pupilIds: string[]): Promise<ClassReadingPageWithPupilOutput[]> {
        let query = await this.pupilRepository.createQueryBuilder('pupil');

        if (pupilIds && pupilIds.length > 0) {
            query = query.where('pupil.id IN (:...pupilIds)', { pupilIds });
        } else {
            query = query.leftJoin('pupil.classes', 'schoolClass').where('schoolClass.id = :classId', { classId });
        }

        const pupils = await query.getMany();

        const pupilReadingTopicsOutput: ClassReadingPageWithPupilOutput[] = [];

        const generatePfBase = (pupil: LwpPupil): SelectQueryBuilder<LwpPupilFeedback> =>
            this.pupilFeedbackRepository
                .createQueryBuilder('pf')
                .leftJoin('pf.pupils', 'pupil')
                .where('pupil.id = :id', { id: pupil.id })
                .andWhere("pf.type = 'READING'")
                .orderBy('pf.logCreatedAt', 'DESC');

        const getWeekFeedbacks = (pupil: LwpPupil, weekCreatedAt: Date): Promise<LwpPupilFeedback[]> =>
            generatePfBase(pupil)
                .andWhere("daterange(CAST(:date AS date), CAST((CAST(:date AS date) + interval '7 days') AS date)) @> pf.bookReadAt", {
                    date: weekCreatedAt
                })
                .getMany();

        const getDateReadAt = (
            pupil: LwpPupil,
            addToQuery?: (q: SelectQueryBuilder<LwpPupilFeedback>) => SelectQueryBuilder<LwpPupilFeedback>
        ): Promise<Date> => {
            let query = generatePfBase(pupil);

            if (addToQuery) {
                query = addToQuery(query);
            }

            return query
                .select('pf.bookReadAt')
                .limit(1)
                .getRawOne()
                .then((raw) => raw?.pf_bookReadAt);
        };

        if (pupils?.length > 0) {
            for (const pupil of pupils) {
                const [thisWeek, lastWeek] = await this.pupilTopicRepository
                    .createQueryBuilder('pt')
                    .innerJoin('pt.topic', 'staticTopic', 'staticTopic.isReading = :isReading', { isReading: true })
                    .where('pt.pupil = :pupil', { pupil: pupil.id })
                    .orderBy('pt.releaseDate', 'DESC')
                    .limit(2)
                    .getMany();

                const thisWeekFeedbacks = thisWeek?.releaseDate ? await getWeekFeedbacks(pupil, thisWeek?.releaseDate) : [];
                const lastWeekFeedbacks = lastWeek?.releaseDate ? await getWeekFeedbacks(pupil, lastWeek?.releaseDate) : [];

                const lastRead = await getDateReadAt(pupil);
                const lastReadAtHome = await getDateReadAt(pupil, (q) => q.andWhere("pf.userType != 'TEACHER'"));
                const lastReadAtSchool = await getDateReadAt(pupil, (q) => q.andWhere("pf.userType = 'TEACHER'"));

                const recentPupilTopicId = this.getRecentPupilReadingTopic(pupil?.allTopics);

                pupilReadingTopicsOutput.push({
                    id: pupil?.id,
                    firstname: pupil?.firstname,
                    lastname: pupil?.lastname,
                    recentPupilTopicId,
                    lastRead,
                    lastReadAtHome,
                    lastReadAtSchool,
                    pupilReadingLogFeedbacks: {
                        current: thisWeekFeedbacks,
                        previous: lastWeekFeedbacks
                    }
                });
            }
        }

        return pupilReadingTopicsOutput?.sort((a, b) => (a.firstname > b.firstname ? 1 : b.firstname > a.firstname ? -1 : 0));
    }

    public getRecentPupilReadingTopic(pupilTopics: LwpPupilTopic[]): string {
        const readingTopics = pupilTopics?.length > 0 ? pupilTopics?.filter((pt) => pt?.topic?.isReading === true) : [];

        const sortedReadingTopic = readingTopics.sort((a, b) => {
            if (a?.releaseDate > b?.releaseDate) {
                return -1;
            }

            if (a?.releaseDate < b?.releaseDate) {
                return 1;
            }

            return 0;
        })[0];

        return sortedReadingTopic?.id ? sortedReadingTopic?.id : null;
    }

    public async allPupil(): Promise<LwpPupil[]> {
        return await this.pupilRepository.find();
    }

    public async getPupilStatus(id: string): Promise<PupilStatus> {
        const pupil = await this.pupilRepository.findOne({ where: { id } });

        if (!pupil) throw new HttpException('Pupil not found.', ErrorStatusCodeEnum._535);

        return pupil.getPupilStatus();
    }

    public async getPupilLastLogin(pupilId: string): Promise<Date> {
        const result = await this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoin('pupil.parents', 'parents')
            .leftJoin('parents.parent', 'parent')
            .where('pupil.id = :pupilId', { pupilId })
            .andWhere('parents.status = :status', { status: PupilParentStatus.ACTIVE })
            .select('MAX(parent.lastLogin)', 'lastLogin')
            .getRawOne<{ lastLogin: Date }>();

        return result?.lastLogin || null;
    }

    public async getPupillastActivity(pupilId: string): Promise<Date> {
        const lastActivityFeedback = await this.pupilFeedbackRepository
            .createQueryBuilder('pupilFeedback')
            .leftJoin('pupilFeedback.activity', 'pupilActivity')
            .leftJoin('pupilActivity.pupil', 'pupil')
            .where('pupil.id = :pupilId', { pupilId })
            .orderBy('pupilFeedback.logCreatedAt', 'DESC')
            .select('pupilFeedback.logCreatedAt')
            .getRawOne<{ logCreatedAt: Date }>();

        return lastActivityFeedback?.logCreatedAt || null;
    }

    public getPupilVideoCount(id: string): Promise<number> {
        return this.pupilTopicRepository.count({ where: { pupil: id } });
    }

    public async getPupilType(pupil: LwpPupil): Promise<PupilType> {
        const pupilClassOrGroupQb = (startedYears: boolean): SelectQueryBuilder<LwpSchoolClass> =>
            this.schoolClassRepository
                .createQueryBuilder('schoolClass')
                .leftJoin('schoolClass.pupils', 'pupil')
                .innerJoin('schoolClass.school', 'school')
                .where('pupil.id = :pupilId', { pupilId: pupil.id })
                .andWhere(`"schoolClass"."periodIndex" ${startedYears ? '<=' : '>'} "school"."curentPeriodIndex"`)
                .orderBy('"schoolClass"."periodIndex"', startedYears ? 'DESC' : 'ASC')
                .addOrderBy('"schoolClass"."logCreatedAt"', 'DESC')
                .select([
                    'schoolClass.id',
                    'schoolClass.isFullProgramme',
                    'schoolClass.isReadyTeddyEnabled',
                    'schoolClass.IsReadingLogsEnabled'
                ]);

        const classOrGroup = async (condition: string, params: ObjectLiteral): Promise<LwpSchoolClass | undefined> =>
            (await pupilClassOrGroupQb(true).andWhere(condition, params).getOne()) ??
            (await pupilClassOrGroupQb(false).andWhere(condition, params).getOne());

        const pupilClass = await classOrGroup('schoolClass.isRegistrationClass = :isReg', { isReg: true });
        const pupilGroup = await classOrGroup('schoolClass.isGroupAcrossClasses = :isGroup', { isGroup: true });

        const pupilClassOrGroupInfo = {
            id: pupilClass?.id || pupilGroup?.id,
            isFullProgramme: pupilClass?.isFullProgramme || pupilGroup?.isFullProgramme,
            isReadyTeddyEnabled: pupilClass?.isReadyTeddyEnabled || pupilGroup?.isReadyTeddyEnabled,
            /*
             * Reading comes from the pupil's own registration class, never the group: a group's flag is a
             * BOOL_OR across its members' classes, and reading weeks are only ever created for
             * registration classes. The topic flags above keep the `||` because work really is set on a
             * group, and every member of it has that work to do.
             */
            IsReadingLogsEnabled: pupilClass?.IsReadingLogsEnabled
        };

        let hasTopicAccess = pupilClassOrGroupInfo?.isFullProgramme || pupilClassOrGroupInfo?.isReadyTeddyEnabled;

        if (pupilClassOrGroupInfo?.IsReadingLogsEnabled && !hasTopicAccess) {
            /**
             * If the class has only Reading Logs (not Full Programme or Ready Teddy),
             * we check if the pupil has any non-reading topics (e.g., Money Skills) scheduled.
             * If so, the pupil is considered to have topic access.
             *
             * Note: Money Skills topics can only be scheduled if:
             * - Money Skills is enabled at the school level, and
             * - The class has Reading Logs, Full Programme, or both enabled.
             */
            const pupilNonReadingTopicsCount = await this.pupilTopicRepository
                .createQueryBuilder('pupil_topics')
                .innerJoin('pupil_topics.classTopic', 'classTopic')
                .innerJoin('classTopic.class', 'class', '(class.id = :classId OR class.parentClassId = :classId)', {
                    classId: pupilClassOrGroupInfo.id
                })
                .innerJoin('pupil_topics.topic', 'topic', 'topic.isReading = false')
                .where('pupil_topics.pupilId = :pupilId', { pupilId: pupil.id })
                .getCount();

            hasTopicAccess = pupilNonReadingTopicsCount > 0;
        }

        if (pupilClassOrGroupInfo?.IsReadingLogsEnabled && hasTopicAccess) {
            return PupilType.BOTH;
        } else if (pupilClassOrGroupInfo?.IsReadingLogsEnabled) {
            return PupilType.READING;
        } else if (hasTopicAccess) {
            return PupilType.TOPIC;
        } else {
            // defaults to BOTH after discussion
            // see https://poteris.slack.com/archives/C045RSHUV9P/p1693389613380209
            return PupilType.BOTH;
        }
    }

    public getPupilWatchedVideoCount(id: string): Promise<number> {
        return this.pupilTopicRepository.count({ where: { pupil: { id }, watchedVideo: true } });
    }

    public getPupilActivityCount(id: string): Promise<number> {
        return this.pupilActivityRepository.count({ where: { pupil: { id } } });
    }

    public async getPupilFeedbackCount(id: string): Promise<number> {
        return await this.pupilFeedbackRepository
            .createQueryBuilder('pupilFeedback')
            .leftJoin('pupilFeedback.pupils', 'pupil')
            .where('pupil.id = :id', { id })
            .getCount();
    }

    // ## will remove getParentPupils and also need to look deletedAt and name sorting
    public async getParentPupils(parentId: string): Promise<LwpPupilParent[]> {
        const parentPupilBase = await this.queryBaseService.parentPupilsBase(parentId);
        // const pupils = await parentPupilBase.select('pupils').andWhere('pupils.deletedAt IS NULL').getRawMany();
        const pupils = await parentPupilBase.select('pupils').getRawMany();

        const parentPupils: LwpPupilParent[] = pupils
            .map((pupil: unknown) => {
                return Object.assign({}, ...this.helperService.changeObjKeys(pupil, 'pupils_'));
            })
            .filter((pupil: { id: null }) => pupil.id !== null);

        // parentPupils = parentPupils?.sort((a, b) => (a.firstname > b.firstname ? 1 : b.firstname > a.firstname ? -1 : 0));

        return parentPupils;
    }

    public async numSchoolsWithPupils(parentId: string): Promise<number> {
        const result = await this.userRepository
            .createQueryBuilder('parent')
            .leftJoin('parent.pupils', 'pupilParent')
            .leftJoin('pupilParent.pupil', 'pupil')
            .leftJoin('pupil.school', 'school')
            .where('parent.id = :parentId', { parentId })
            .andWhere('pupilParent.status != :pupilParentStatus', { pupilParentStatus: PupilParentStatus.REJECTED })
            .select('COUNT(DISTINCT school.id)', 'schoolCount')
            .getRawOne<{ schoolCount: number }>();

        return Number(result.schoolCount) || 0;
    }

    public async getParentImportedPupils(parentId: string): Promise<LwpPupil[]> {
        const parentPupilBase = await this.queryBaseService.parentImportedPupilsBase(parentId);
        const pupils = await parentPupilBase.select('importedChildren').getRawMany();

        const parentPupils: LwpPupil[] = pupils
            .map((pupil: unknown) => {
                return Object.assign({}, ...this.helperService.changeObjKeys(pupil, 'importedChildren_'));
            })
            .filter((pupil: { id: null }) => pupil.id !== null);

        return parentPupils;
    }

    /**
     * @param isPupilsWithClasses keeps only pupils who are in an active registration class for the
     * current or a future academic year - see {@link getNonMISSchoolPupils}, which applies it in SQL.
     * Only the non-MIS branch honours it, since that is the branch the groups across classes pickers
     * use.
     */
    public async getSchoolPupils(
        schoolId: string,
        pupilName?: string,
        isSchoolMIS?: boolean,
        isPupilsWithClasses?: boolean
    ): Promise<SchoolPupilsOutput[]> {
        let schoolPupils = [];

        if (isSchoolMIS) {
            schoolPupils = await this.getMISSchoolPupils(schoolId, pupilName);
        } else {
            schoolPupils = await this.getNonMISSchoolPupils(schoolId, pupilName, isPupilsWithClasses);
        }

        const schoolPupilOutputRecords: SchoolPupilsOutput[] = [];

        if (schoolPupils?.length > 0 && !isSchoolMIS) {
            for (const schoolPupil of schoolPupils) {
                schoolPupilOutputRecords.push({
                    id: `${schoolPupil?.id}`,
                    fullname: `${schoolPupil?.firstname} ${schoolPupil?.lastname}`,
                    yearGroup: await this.getPupilYearGroup(schoolPupil?.startedSchool),
                    currentClass: await this.getPupilRegistrationClass(schoolPupil?.id)
                });
            }

            schoolPupils = schoolPupilOutputRecords;
        }

        return schoolPupils?.length > 0 ? schoolPupils : [];
    }

    public async getMISSchoolPupils(schoolId: string, pupilName?: string): Promise<SchoolPupilsOutput[]> {
        let wondeStudentsBase = this.importedStudentRepository
            .createQueryBuilder('importedStudent')
            .leftJoinAndSelect('importedStudent.school', 'importedSchool')
            .leftJoinAndSelect('importedStudent.lwpPupil', 'lwpPupil')
            .leftJoinAndSelect('importedStudent.schoolClasses', 'importedSchoolClass')
            .leftJoinAndSelect('importedSchoolClass.period', 'wondeSchoolClassPeriod')
            .leftJoinAndSelect('importedSchool.lwpSchool', 'lwpSchool')
            .where('lwpSchool.id = :schoolId', { schoolId });

        if (pupilName) {
            wondeStudentsBase = wondeStudentsBase.andWhere("importedStudent.forename || ' ' || importedStudent.surname ILIKE :pupilName", {
                pupilName: `%${pupilName}%`
            });
        }

        const importedStudents = await wondeStudentsBase.getMany();

        let lwpPupilsBase = this.pupilRepository
            .createQueryBuilder('lwpPupil')
            .leftJoinAndSelect('lwpPupil.school', 'lwpSchool')
            .leftJoinAndSelect('lwpPupil.importedStudent', 'importedStudent')
            .where('lwpSchool.id = :schoolId', { schoolId })
            .andWhere('importedStudent.id IS NULL');

        if (pupilName) {
            lwpPupilsBase = lwpPupilsBase.andWhere("lwpPupil.firstname || ' ' || lwpPupil.lastname ILIKE :pupilName", {
                pupilName: `%${pupilName}%`
            });
        }

        const lwpPupils = await lwpPupilsBase.getMany();

        const schoolPupilOutputRecords: SchoolPupilsOutput[] = [];

        if (importedStudents?.length > 0) {
            for (const importedStudent of importedStudents) {
                const importedStudentClass = importedStudent?.schoolClasses[0];
                const startedSchool =
                    importedStudentClass?.period?.index &&
                    JSON.parse(importedStudent?.details)?.import_nc_year &&
                    !isNaN(JSON.parse(importedStudent?.details)?.import_nc_year) &&
                    Number.isInteger(parseFloat(JSON.parse(importedStudent?.details)?.import_nc_year))
                        ? `${importedStudentClass?.period?.index - +JSON.parse(importedStudent?.details)?.import_nc_year}`
                        : null;

                schoolPupilOutputRecords.push({
                    id: importedStudent?.id,
                    fullname: `${importedStudent?.forename} ${importedStudent?.surname}`,
                    yearGroup: await this.getPupilYearGroup(startedSchool),
                    currentClass: importedStudent?.lwpPupil?.id ? await this.getPupilRegistrationClass(importedStudent?.lwpPupil?.id) : null
                });
            }
        }

        if (lwpPupils?.length > 0) {
            for (const pupil of lwpPupils) {
                schoolPupilOutputRecords.push({
                    id: `${pupil?.id}`,
                    fullname: `${pupil?.firstname} ${pupil?.lastname}`,
                    yearGroup: await this.getPupilYearGroup(pupil?.startedSchool),
                    currentClass: await this.getPupilRegistrationClass(pupil?.id)
                });
            }
        }

        return schoolPupilOutputRecords?.length > 0 ? schoolPupilOutputRecords : [];
    }

    public async getNonMISSchoolPupils(schoolId: string, pupilName?: string, isPupilsWithClasses?: boolean): Promise<LwpPupil[]> {
        const schoolPupilsBase = this.queryBaseService.schoolPupilsBase(schoolId);
        let pupils = schoolPupilsBase.select('pupils');

        if (pupilName) {
            pupils = pupils.andWhere("pupils.firstname || ' ' || pupils.lastname ILIKE :pupilName", { pupilName: `%${pupilName}%` });
        }

        if (isPupilsWithClasses) {
            // A group across classes takes its licence from its pupils' registration classes - see
            // HelperService.updateGroupAcrossClassesLicenseDetails - so a pupil without one cannot be
            // added to a group. Inner joined, so those pupils drop out in SQL rather than being read
            // and discarded.
            //
            // Only an ACTIVE class counts. An IMPORTED one is still awaiting import review, and an
            // INACTIVE or HIDDEN one is no longer taught, so neither is a class the pupil is really
            // in - and a pupil whose only registration class is one of those was still being offered.
            //
            // Both periods are reached through their relations because periodIndex and
            // curentPeriodIndex are @RelationIds, not columns the query builder can filter on. That
            // also keeps the comparison in SQL, with no round trip to look the current period up.
            //
            // Distinct because this reads raw rows, so a pupil in both this year's and next year's
            // registration class would otherwise come back once per class.
            pupils = pupils
                .innerJoin('school.curentPeriod', 'currentPeriod')
                .innerJoin(
                    'pupils.classes',
                    'registrationClass',
                    'registrationClass.isRegistrationClass = :isRegistrationClass and registrationClass.status = :classStatus',
                    {
                        isRegistrationClass: true,
                        classStatus: SchoolClassStatus.ACTIVE
                    }
                )
                .innerJoin('registrationClass.period', 'registrationClassPeriod', 'registrationClassPeriod.index >= currentPeriod.index')
                .distinct(true);
        }

        const rawPupils = await pupils.getRawMany();

        return rawPupils
            .map((pupil: unknown) => {
                return Object.assign({}, ...this.helperService.changeObjKeys(pupil, 'pupils_'));
            })
            .filter((pupil: { id: null }) => pupil.id !== null);
    }

    public schoolPupilsWithoutMISBaseQuery(schoolId: string): SelectQueryBuilder<LwpPupil> {
        return this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('school.importedSchool', 'importedSchool')
            .leftJoin('pupil.importedStudent', 'importedStudent')
            .where('school.id = :schoolId', { schoolId })
            .andWhere('importedSchool.id IS NOT NULL')
            .andWhere('importedStudent.id IS NULL')
            .orderBy('pupil.startedSchool', 'DESC');
    }

    public async getSchoolPupilsWithoutMIS(schoolId: string): Promise<LwpPupil[]> {
        return await this.schoolPupilsWithoutMISBaseQuery(schoolId).getMany();
    }

    public schoolPupilsWithoutClassesBaseQuery(
        schoolId: string,
        currentPeriodIndex: number,
        isPreRegistration: boolean,
        includeIgnoredPupils?: boolean
    ): SelectQueryBuilder<LwpPupil> {
        // Fetch pupils who are NOT in any registration class for the current or future period.
        // Groups across classes don't count, so pupils only in such a group are included.
        const baseQuery = this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('lwp_class_pupil', 'lcp', 'lcp."lwpPupilId" = pupil.id')
            .leftJoin(
                'lwp_school_class',
                'class',
                'class.id = lcp."lwpSchoolClassId" AND class."parentClassId" IS NULL AND class."isGroupAcrossClasses" = false'
            )
            .leftJoin('static_lwp_period', 'period', `period.index = class."periodIndex" AND period.index >= :currentPeriodIndex`, {
                currentPeriodIndex
            })
            .where('school.id = :schoolId', { schoolId });

        if (isPreRegistration && !includeIgnoredPupils) {
            // if isPreRegistration is true, we want to include only pupils who are not ignored for future year classes
            baseQuery.andWhere('pupil."isIgnoredForFutureYearClasses" = false');
        }

        if (isPreRegistration) {
            // if isPreRegistration is true, we want to include pupils who are pre-registered or pupil year group is -1
            baseQuery.andWhere(
                new Brackets((qb) => {
                    qb.where('pupil.isPreRegistration = true').orWhere(
                        'CAST(:currentPeriodIndex - CAST(pupil.startedSchool AS INTEGER) AS INTEGER) = -1',
                        { currentPeriodIndex }
                    );
                })
            );
        } else {
            baseQuery.andWhere('pupil.isPreRegistration = false');
        }

        return baseQuery.groupBy('pupil.id').having('COUNT(period.index) = 0');
    }

    public async getSchoolPupilsWithoutClasses(schoolId: string, isPreRegistrationPupils: boolean): Promise<LwpPupil[]> {
        const currentPeriodIndex = await this.periodService.getCurrentPeriodIndex();
        const includeIgnoredPupils = true; // Include ignored pupils for future year classes

        return await this.schoolPupilsWithoutClassesBaseQuery(
            schoolId,
            currentPeriodIndex,
            isPreRegistrationPupils,
            includeIgnoredPupils
        ).getMany();
    }

    public async getLastPupilInvitation(parentId: string): Promise<LwpPupil> {
        const parentPupil = await this.parentPupilRepository.findOne({
            where: { parentId, status: PupilParentStatus.INVITED },
            order: { logCreatedAt: 'DESC' },
            relations: ['pupil']
        });

        if (parentPupil) return parentPupil.pupil;

        return null;
    }

    public async getPupilInvitations(parentId: string): Promise<LwpPupilParent[]> {
        const parentPupils = await this.parentPupilRepository.find({
            where: { parentId, status: PupilParentStatus.INVITED },
            order: { logCreatedAt: 'DESC' }
        });

        return parentPupils;
    }

    public async getPupilInvitation(parentId: string, pupilId: string): Promise<LwpPupilParent> {
        const parentPupil = await this.parentPupilRepository.findOne({
            where: { parentId, pupilId }
        });

        return parentPupil;
    }

    public async parentWatchedIntroVideo(parentId: string): Promise<boolean> {
        await this.userRepository.update({ id: parentId }, { watchedIntroVideo: true });

        return true;
    }

    public async acceptPupilInvitation(
        parentId: string,
        pupilId: string,
        isTopicsSectionShown: boolean,
        isReadingSectionShown: boolean,
        contextUserId: string
    ): Promise<LwpPupil> {
        const pupil = await this.pupilRepository.findOne({ where: { id: pupilId } });

        if (!pupil) throw new HttpException('Invalid pupil id', ErrorStatusCodeEnum._535);

        const interstitialContext: PupilParentContext = {
            isTopicsSectionShown,
            isReadingSectionShown
        };

        await this.parentPupilRepository.update(
            { pupilId, parentId },
            {
                status: PupilParentStatus.ACTIVE,
                showInterstitial: false,
                interstitialContext,
                logUpdatedBy: this.shallowUserService.newShallowUser(contextUserId)
            }
        );

        await this.userRepository.update({ id: parentId, userStatus: Not(UserStatus.ACTIVE) }, { userStatus: UserStatus.ACCOUNTLESS });

        await this.staticInterstitialService.assignReleasedInterstitials(parentId, UserType.PARENT);

        return pupil;
    }

    public async rejectPupilInvitation(
        parentId: string,
        pupilId: string,
        isTopicsSectionShown: boolean,
        isReadingSectionShown: boolean,
        contextUserId: string
    ): Promise<LwpUser> {
        const user = await this.userRepository
            .createQueryBuilder('parent')
            .leftJoinAndSelect('parent.pupils', 'pupils', 'pupils.status = :pupilParentStatus', {
                pupilParentStatus: PupilParentStatus.ACTIVE
            })
            .where('parent.id = :parentId', { parentId })
            .getOne();

        if (!user) throw new HttpException('Invalid user id', ErrorStatusCodeEnum._535);

        const interstitialContext: PupilParentContext = {
            isTopicsSectionShown,
            isReadingSectionShown
        };

        await this.parentPupilRepository.update(
            { pupilId, parentId },
            {
                status: PupilParentStatus.REJECTED,
                showInterstitial: false,
                interstitialContext,
                logUpdatedBy: this.shallowUserService.newShallowUser(contextUserId)
            }
        );

        if (user?.pupils?.length === 0) {
            user.userStatus = UserStatus.IMPORTED;
        }

        delete user['pupils'];

        return await this.userRepository.save(user);
    }

    public async acceptOrRejectPupilInvitation(pupilId: string, parentId: string, rejected: boolean): Promise<LwpPupil> {
        const pupil = await this.pupilRepository.findOne({ where: { id: pupilId } });

        if (!pupil) throw new HttpException('Invalid pupil id', ErrorStatusCodeEnum._535);

        await this.pupilParentService.updatePupilParentRelation({
            pupilId: pupil.id,
            parentId,
            status: rejected ? PupilParentStatus.REJECTED : PupilParentStatus.ACTIVE,
            logUpdatedBy: this.shallowUserService.newShallowUser(parentId),
            invitedBy: null,
            importedStudentContactID: null
        });

        return pupil;
    }

    public async getPupilTopicPupil(pupilTopicId: string): Promise<LwpPupil> {
        const pupilParentBase = await this.queryBaseService.pupilTopicPupilBase(pupilTopicId);
        const pupil = await pupilParentBase.select('pupil').getRawOne();
        const newPupil = Object.assign({}, ...this.helperService.changeObjKeys(pupil, 'pupil_'));

        if (newPupil?.id) return newPupil;

        return null;
    }

    public async getPupilActivityPupil(pupilActivityId: string): Promise<LwpPupil> {
        const pupilParentBase = await this.queryBaseService.pupilActivityPupilBase(pupilActivityId);
        const pupil = await pupilParentBase.select('pupil').getRawOne();
        const newPupil = Object.assign({}, ...this.helperService.changeObjKeys(pupil, 'pupil_'));

        if (newPupil?.id) return newPupil;

        return null;
    }

    public async getSchoolClassPupils(schoolClassId: string): Promise<LwpPupil[]> {
        const pupilParentBase = await this.queryBaseService.schoolClassPupilBase(schoolClassId);
        const pupils = await pupilParentBase.select('pupils').getRawMany();
        const parentPupils: LwpPupil[] = pupils
            .map((pupil: unknown) => {
                return Object.assign({}, ...this.helperService.changeObjKeys(pupil, 'pupils_'));
            })
            .filter((pupil: { id: null }) => pupil.id !== null);

        return parentPupils;
    }

    /**
     * Calculates the total stars a pupil has earned.
     *
     * @param pupil - A fully “hydrated” pupil whose `allTopics` array
     *   has been eagerly loaded to calculate total stars (silver + gold).
     * @returns The total number of stars (silver + gold) as a string.
     */
    public getTotalEarnedStars(pupil: LwpPupil): string {
        const totalEarnedStars = sum(
            (pupil?.allTopics ?? []).map((a) => {
                let allStars = 0;

                if (a?.silverStars) allStars += a.silverStars;

                if (a?.earnedGoldStar) allStars += 1;

                return allStars;
            })
        );

        return totalEarnedStars?.toString() ?? '0';
    }

    public getPdfCertificateUrl(fileName: string): string {
        return this.helperService.getPublicUrl(`${appConstants.minioPaths.public.staticCertificates}/${fileName}`);
    }

    public async getPupilCertificateData(
        pupils: LwpPupil[],
        teacher: LwpUser,
        trophy?: StaticLwpTrophy
    ): Promise<CertificatePdfDataForTrophy[]> {
        const data: CertificatePdfDataForTrophy[] = [];
        const defaultTrophy = {
            certificate:
                '{"mathscot":{"scale":0.55,"xValue":740,"yValue":270},"fieldData":[{"xValue":210,"yValue":490,"fontSize":60,"fieldName":"childName"},{"xValue":260,"yValue":210,"fontSize":30,"fieldName":"date"},{"xValue":385,"yValue":385,"fontSize":40,"fieldName":"totalStars"},{"xValue":660,"yValue":210,"fontSize":30,"fieldName":"teacherName"}]}',
            certificatePdf: this.getPdfCertificateUrl('MathscotCertificate.pdf')
        };

        for (const pupil of pupils) {
            const staticTrophyCertificateData = JSON.parse(trophy?.certificate ?? defaultTrophy?.certificate);
            const pupilMathscot = (await this.pupilMathscotUrl(pupil))?.bigImage ?? null;

            const testCertificateData: CertificatePdfDataForTrophy = {
                fileName: trophy?.certificatePdf ?? defaultTrophy?.certificatePdf,
                mathscot: staticTrophyCertificateData?.mathscot ?? null,
                fieldData: staticTrophyCertificateData?.fieldData ?? []
            };

            if (pupilMathscot && testCertificateData?.mathscot) {
                testCertificateData.mathscot['fieldValue'] = pupilMathscot;
            } else {
                testCertificateData.mathscot = null;
            }

            for (const field of testCertificateData.fieldData) {
                switch (field?.fieldName) {
                    case TrophyCertificateFieldName.CHILDNAME:
                        field['fieldValue'] = `${pupil?.firstname} ${pupil?.lastname}`;
                        break;

                    case TrophyCertificateFieldName.DATE:
                        field['fieldValue'] = moment().format('DD MMMM YYYY');
                        break;

                    case TrophyCertificateFieldName.TOTATSTARS:
                        field['fieldValue'] = this.getTotalEarnedStars(pupil);
                        break;

                    case TrophyCertificateFieldName.TEACHERNAME:
                        field['fieldValue'] = teacher?.nameForChildren ?? `${teacher?.firstname} ${teacher?.lastname}`;
                        break;

                    default:
                        break;
                }
            }

            data.push(testCertificateData);
        }

        return data;
    }

    public async deletePupil(id: string, userId: string, manager?: EntityManager): Promise<OperationStatus> {
        const pupilRepository = manager?.getRepository(LwpPupil) ?? this.pupilRepository;
        const pupil = await pupilRepository
            .createQueryBuilder('pupil')
            .leftJoinAndSelect('pupil.classes', 'classes')
            .leftJoinAndSelect('pupil.allTopics', 'allTopics')
            .leftJoinAndSelect('pupil.parents', 'parents')
            .where('pupil.id = :id', { id })
            .getOne();

        if (!pupil) throw new HttpException('Pupil not found', ErrorStatusCodeEnum._535);

        const shallowUser = this.shallowUserService.newShallowUser(userId);

        for (const schoolClass of pupil.classes) {
            await (manager?.getRepository(LwpSchoolClass) ?? this.schoolClassRepository).update(
                { id: schoolClass?.id },
                { isStatsNeedUpdate: true }
            );
        }

        if (pupil?.allTopics?.length > 0) {
            await this.pupilTopicService.deletePupilTopics(
                pupil.allTopics.map((pt) => pt.id),
                shallowUser,
                manager
            );
        }

        for (const pupilParent of pupil.parents) {
            await this.pupilParentService.deletePupilParentRelation(pupilParent?.parentId, pupilParent?.pupilId, shallowUser, manager);
        }

        const res = await pupilRepository.update({ id }, { deletedBy: shallowUser });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async generatePupilCertificate(pupilId: string, schoolClassId: string, trophyId: string): Promise<string> {
        const staticTrophy = await this.staticTrophyService.getTrophyById(trophyId);

        const pupil = await this.pupilRepository.findOne({
            where: { id: pupilId },
            relations: ['allTopics', 'allTopics.period', 'school', 'school.curentPeriod']
        });

        const staticTrophyCertificateData = JSON.parse(staticTrophy?.certificate);

        const testCertificateData: CertificatePdfDataForTrophy = {
            fileName: staticTrophy?.certificatePdf,
            mathscot: staticTrophyCertificateData?.mathscot ?? null,
            fieldData: staticTrophyCertificateData?.fieldData ?? []
        };

        for (const field of testCertificateData.fieldData) {
            switch (field?.fieldName) {
                case TrophyCertificateFieldName.CHILDNAME:
                    field['fieldValue'] = `${pupil?.firstname} ${pupil?.lastname}`;
                    break;

                case TrophyCertificateFieldName.DATE:
                    field['fieldValue'] = moment().format('DD MMMM YYYY');
                    break;

                case TrophyCertificateFieldName.TOTATSTARS:
                    field['fieldValue'] = this.getTotalEarnedStars(pupil);
                    break;

                case TrophyCertificateFieldName.TEACHERNAME:
                    let schoolClass: LwpSchoolClass;

                    if (schoolClassId) {
                        schoolClass = await this.schoolClassRepository.findOne({
                            where: { id: schoolClassId },
                            relations: ['mainTeacher']
                        });
                    }

                    field['fieldValue'] = schoolClass?.mainTeacher?.nameForChildren
                        ? `${schoolClass?.mainTeacher?.firstname} ${schoolClass?.mainTeacher?.lastname}`
                        : '';

                    break;

                default:
                    break;
            }
        }

        return await this.certificateService.generateTrophyCertificatesForPupils([testCertificateData]);
    }

    public async generateCertificates(teacherId: string, pupilIds: string[], isDownload: boolean, trophyId: string): Promise<string> {
        const teacher = await this.userRepository.findOne({ id: teacherId });
        let staticTrophy: StaticLwpTrophy;

        const pupilsQb = this.pupilRepository.createQueryBuilder('pupils');

        pupilsQb
            .leftJoinAndSelect('pupils.school', 'pupilSchool')
            .leftJoinAndSelect('pupils.allTopics', 'allTopics', 'allTopics.period.index >= pupilSchool.curentPeriod.index')
            .leftJoinAndSelect('allTopics.period', 'topicPeriod')
            .leftJoinAndSelect('pupilSchool.curentPeriod', 'schoolCurrentPeriod')
            .leftJoinAndSelect('pupils.trophies', 'pupilTrophies')
            .leftJoinAndSelect('pupilTrophies.trophy', 'trophy')
            .andWhereInIds(pupilIds);

        const pupils = await pupilsQb.getMany();

        // Prior to strings being IDs, this check resolved to false because 0 is falsy.
        // Now strings are IDs, we need to do this comparison manually.
        // It would probably make more sense to do this a different way than using zero as a magic number for the default certificate.
        if (trophyId && trophyId !== '0') {
            const trophy = await this.staticTrophyService.getTrophyById(trophyId);

            if (trophy) {
                staticTrophy = trophy;
            }
        }

        if (teacher && pupils.length > 0) {
            const data: CertificatePdfDataForTrophy[] = await this.getPupilCertificateData(pupils, teacher, staticTrophy);

            if (isDownload) {
                for (const pupil of pupils) {
                    if (trophyId && pupil?.trophies?.some((pt) => pt?.trophy?.id === trophyId)) {
                        const trophy = (pupil?.trophies || [])?.find((pt) => pt?.trophy?.id === trophyId);

                        await this.pupilTrophyRepository.update({ id: trophy?.id }, { lastCertificateDownloaded: new Date() });
                    } else {
                        await this.pupilRepository.update({ id: pupil?.id }, { lastCertificateDownloaded: new Date() });
                    }
                }
            }

            return this.certificateService.generateTrophyCertificatesForPupils(data);
        }

        throw new HttpException('Invalid id', 400);
    }

    public async getPupilTrophies(pupilId: string, parentId: string, userId: string, userType: UserType): Promise<LwpPupilTrophy[]> {
        if (userType !== UserType.PARENT) {
            return await this.pupilTrophyRepository.find({ where: { pupil: { id: pupilId } } });
        }

        return await this.pupilTrophyRepository
            .createQueryBuilder('pupilTrophy')
            .leftJoin('pupilTrophy.pupil', 'pupil')
            .leftJoin('pupil.parents', 'pupilParent')
            .leftJoin('pupilParent.parent', 'parent')
            .where('pupil.id = :id', { id: pupilId })
            .andWhere('parent.id = :parentId', { parentId: parentId || userId })
            .getMany();
    }

    public async removePupilFromClass(pupilId: string, classId: string, contextUserId: string, manager?: EntityManager): Promise<void> {
        const pupilRepository: Repository<LwpPupil> = manager ? manager.getRepository(LwpPupil) : this.pupilRepository;
        const schoolClassRepository: Repository<LwpSchoolClass> = manager
            ? manager.getRepository(LwpSchoolClass)
            : this.schoolClassRepository;
        const pupilTopicRepository: Repository<LwpPupilTopic> = manager ? manager.getRepository(LwpPupilTopic) : this.pupilTopicRepository;
        const classTopicRepository: Repository<LwpClassTopic> = manager ? manager.getRepository(LwpClassTopic) : this.classTopicRepository;
        const logLwpPupilClassChangeRepository: Repository<LogLwpPupilClassChange> = manager
            ? manager.getRepository(LogLwpPupilClassChange)
            : this.logLwpPupilClassChangeRepository;

        const schoolClass = await schoolClassRepository
            .createQueryBuilder('class')
            .leftJoin('class.period', 'period')
            .leftJoin(
                'class.groups',
                'groups',
                'groups.id = (SELECT "lwpSchoolClassId" FROM lwp_class_pupil WHERE "lwpSchoolClassId" = groups.id AND "lwpPupilId" = :pupilId LIMIT 1)'
            )
            .leftJoin('class.pupils', 'pupils')
            .where('class.id = :classId')
            .andWhere('pupils.id = :pupilId')
            .select([
                'class.id',
                'class.isRegistrationClass',
                'class.isGroupAcrossClasses',
                'class.status',
                'period.index',
                'groups.id',
                'groups.status'
            ])
            .setParameters({ pupilId, classId })
            .getOne();

        if (!schoolClass) return;

        // If the class is found, retrieve its groups
        const classGroupIdsToRemove = schoolClass ? schoolClass.groups.map((group) => group.id) : [];

        // Combine classId and groupIds to remove
        const classAndGroupIdsToRemove = [classId, ...classGroupIdsToRemove];

        const pupilTopics = await pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoin('pupilTopic.topic', 'topic')
            .leftJoin('pupilTopic.classTopic', 'classTopic')
            .where('"pupilTopic"."pupilId" = :pupilId', { pupilId })
            .andWhere('"topic"."isReading" = :bool', { bool: false })
            .andWhere('"classTopic"."classId" IN (:...classAndGroupIdsToRemove)', {
                classAndGroupIdsToRemove
            })
            .andWhere('pupilTopic.watchedVideo = :watchedVideoBool', { watchedVideoBool: false })
            .select(['pupilTopic.id'])
            .getMany();

        if (pupilTopics?.length > 0) {
            await pupilTopicRepository.delete({ id: In(pupilTopics?.map((pt) => pt.id)) });
        }

        // Detach topics
        const allClassTopicsInOldClasses = await classTopicRepository
            .createQueryBuilder('ct')
            .leftJoin('ct.class', 'class')
            .select('ct.id')
            .where('class.id IN (:...classIds)', { classIds: classAndGroupIdsToRemove })
            .getMany();

        const topicIds = allClassTopicsInOldClasses.map((classTopic) => classTopic.id);

        if (topicIds?.length > 0) {
            await pupilTopicRepository.update(
                { pupil: { id: pupilId }, classTopic: { id: In(topicIds) }, period: schoolClass?.period },
                { classTopic: null }
            );
        }

        await pupilRepository.createQueryBuilder().relation(LwpPupil, 'classes').of(pupilId).remove(classAndGroupIdsToRemove);

        if (schoolClass?.isGroupAcrossClasses) await this.helperService.updateGroupAcrossClassesLicenseDetails([schoolClass.id], manager);

        const logs = [];

        const classAndGroupsToRemove = [schoolClass, ...(schoolClass?.groups || [])];

        for (const classOrGroups of classAndGroupsToRemove) {
            const logEntry = new LogLwpPupilClassChange();

            logEntry.pupilId = pupilId;
            logEntry.classId = classOrGroups.id;
            logEntry.action = PupilClassActionType.REMOVED;
            logEntry.status = classOrGroups.status;
            logEntry.logCreatedById = contextUserId;
            logs.push(logEntry);
        }

        if (logs?.length) await logLwpPupilClassChangeRepository.save(logs);
    }

    public async removePupilsFromSchool(pupilIds: string[], contextUserId: string, manager?: EntityManager): Promise<void> {
        const pupilRepository: Repository<LwpPupil> = manager?.getRepository(LwpPupil) ?? this.pupilRepository;
        const logLwpPupilClassChangeRepository: Repository<LogLwpPupilClassChange> = manager
            ? manager.getRepository(LogLwpPupilClassChange)
            : this.logLwpPupilClassChangeRepository;

        const pupils = await pupilRepository
            .createQueryBuilder('pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('pupil.classes', 'classes')
            .where('pupil.id IN (:...pupilIds)', { pupilIds })
            .select(['pupil.id', 'school.id', 'classes.id', 'classes.status'])
            .getMany();

        if (pupils?.length === 0) throw new HttpException('Invalid pupil id', ErrorStatusCodeEnum._535);
        const logs = [];

        for (const pupil of pupils) {
            if (pupil?.classes?.length > 0) {
                for (const schoolClass of pupil.classes) {
                    const logEntry = new LogLwpPupilClassChange();

                    logEntry.pupilId = pupil.id;
                    logEntry.classId = schoolClass.id;
                    logEntry.status = schoolClass.status;
                    logEntry.action = PupilClassActionType.REMOVED;
                    logEntry.logCreatedById = contextUserId;

                    logs.push(logEntry);
                }
            }

            pupil.classes = [];
            pupil.deletedSchool = pupil?.school;
            pupil.school = null;
        }

        if (logs?.length) await logLwpPupilClassChangeRepository.save(logs);

        await pupilRepository.save(pupils);
    }

    public async markPreRegistrationPupilsAsIgnoredForFutureYear(pupilIds: string[]): Promise<boolean> {
        const result = await this.pupilRepository.update({ id: In(pupilIds) }, { isIgnoredForFutureYearClasses: true });

        return result.affected > 0;
    }

    public async getPupilMathscotPupil(pupilMathscotId: string): Promise<LwpPupil> {
        return await this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoin('pupil.mathscot', 'pupilMathscot')
            .where('pupilMathscot.id = :pupilMathscotId', { pupilMathscotId })
            .getOne();
    }

    public async addPupilsInClass(input: AddPupilsInClassInput, contextUserId: string): Promise<void> {
        let lwpPupilIds = [];
        const wondeStudentIds = [];

        for (const id of input.pupilIds) {
            if (Number.isInteger(parseFloat(id))) {
                lwpPupilIds.push(id);
            } else {
                wondeStudentIds.push(id);
            }
        }

        if (wondeStudentIds?.length > 0) {
            const pupilIds = await this.createLwpPupilsFromWondeStudents(
                wondeStudentIds,
                input?.classId,
                this.shallowUserService.newShallowUser(contextUserId)
            );

            lwpPupilIds = [...lwpPupilIds, ...pupilIds];
        }

        await this.addPupilToClass(input.classId, lwpPupilIds, contextUserId, true);
    }

    public async createLwpPupilsFromWondeStudents(wondeStudentIds: string[], classId: string, contextUser: LwpUser): Promise<string[]> {
        const pupilIds = [];

        const schoolClass = await this.schoolClassRepository.findOne({
            where: { id: classId },
            relations: ['period', 'school']
        });

        const importedStudents = await this.importedStudentRepository
            .createQueryBuilder('importedStudent')
            .leftJoinAndSelect('importedStudent.lwpPupil', 'lwpPupil')
            .leftJoinAndSelect('importedStudent.importedStudentContacts', 'importedStudentContacts')
            .leftJoinAndSelect('importedStudentContacts.importedContact', 'importedContact')
            .where('importedStudent.id IN (:...wondeStudentIds)', { wondeStudentIds })
            .getMany();

        await this.connection.manager.transaction(async (manager) => {
            if (importedStudents?.length > 0) {
                for (const importedStudent of importedStudents) {
                    if (importedStudent?.lwpPupil?.id) {
                        pupilIds.push(importedStudent?.lwpPupil?.id);
                        continue;
                    }

                    const lwpPupil = new LwpPupil();

                    lwpPupil.firstname = importedStudent.forename;
                    lwpPupil.lastname = importedStudent.surname;
                    lwpPupil.importedStudent = importedStudent;
                    lwpPupil.importedStudentId = importedStudent.id;
                    lwpPupil.isPremium = importedStudent.isPremium;
                    lwpPupil.school = schoolClass?.school;
                    lwpPupil.UPN = importedStudent?.UPN;
                    lwpPupil.startedSchool =
                        schoolClass?.period?.index &&
                        JSON.parse(importedStudent?.details)?.import_nc_year &&
                        !isNaN(JSON.parse(importedStudent?.details)?.import_nc_year) &&
                        Number.isInteger(parseFloat(JSON.parse(importedStudent?.details)?.import_nc_year))
                            ? `${schoolClass?.period?.index - +JSON.parse(importedStudent?.details)?.import_nc_year}`
                            : null;
                    lwpPupil.classes = [];

                    const savedPupil = await manager.save(lwpPupil);

                    pupilIds.push(savedPupil?.id);

                    if (importedStudent?.importedStudentContacts?.length > 0) {
                        for (const parentRel of importedStudent.importedStudentContacts) {
                            if (
                                parentRel?.importedContact &&
                                (parentRel?.parental_responsibility || parentRel?.priority === 1) &&
                                !parentRel?.court_order
                            ) {
                                const parent = parentRel.importedContact;

                                let lwpParentE: LwpUser;
                                let lwpParentP: LwpUser;

                                if (parent?.email) {
                                    lwpParentE = await this.userRepository.findOne({
                                        where: { email: parent.email },
                                        relations: ['importedContacts']
                                    });
                                }

                                if (parent?.phoneNumber) {
                                    lwpParentP = await this.userRepository.findOne({
                                        where: { phoneNumber: this.helperService.formatPhoneNumber(parent?.phoneNumber) },
                                        relations: ['importedContacts']
                                    });
                                }

                                // Checking if the parent is already in lwpUser table then just associate this parent to imported contact
                                if (lwpParentE || lwpParentP) {
                                    const lwpParent = lwpParentE ?? lwpParentP;

                                    await this.pupilParentService.createPupilParentRelation(
                                        {
                                            parent: lwpParent,
                                            pupil: lwpPupil,
                                            status: PupilParentStatus.IMPORTED,
                                            importedStudentContactID: parentRel?.id,
                                            invitedBy: contextUser
                                        },
                                        manager
                                    );

                                    if (!lwpParent.importedContacts) {
                                        lwpParent.importedContacts = [];
                                    }

                                    lwpParent.importedContacts.push(parent);
                                    await this.userRepository.save(lwpParent);
                                } else {
                                    // Saving importedContacts in LwpUser with relations
                                    const lwpUser = new LwpUser();

                                    lwpUser.firstname = parent.forename;
                                    lwpUser.lastname = parent.surname;
                                    lwpUser.email = parent?.email;
                                    lwpUser.phoneNumber = this.helperService.formatPhoneNumber(parent?.phoneNumber);
                                    lwpUser.type = UserType.PARENT;
                                    lwpUser.userStatus = UserStatus.IMPORTED;
                                    lwpUser.importedContacts = [];
                                    lwpUser.importedContacts.push(parent);
                                    lwpUser.importedContactId = parent.id;

                                    if (!lwpUser.email && !lwpUser.phoneNumber) {
                                        continue;
                                    }

                                    const savedLwpParent = await this.userRepository.save(lwpUser);

                                    await this.pupilParentService.createPupilParentRelation(
                                        {
                                            parent: savedLwpParent,
                                            pupil: lwpPupil,
                                            importedStudentContactID: parentRel?.id,
                                            status: PupilParentStatus.IMPORTED,
                                            invitedBy: contextUser
                                        },
                                        manager
                                    );

                                    parent.lwpUser = savedLwpParent;
                                    await manager.save(parent);
                                }
                            }
                        }
                    }
                }
            }
        });

        return pupilIds;
    }

    public async addPupilToClass(
        newClassId: string,
        pupilIds: string[],
        contextUserId: string,
        skipPupil = false,
        allowExisting = false,
        manager?: EntityManager
    ): Promise<boolean> {
        const pupils = await (manager?.getRepository(LwpPupil) ?? this.pupilRepository)
            .createQueryBuilder('pupil')
            .leftJoin('pupil.allTopics', 'allTopics')
            .leftJoin('allTopics.period', 'pupilTopicPeriod')
            .leftJoin('allTopics.classTopic', 'pupilClassTopic')
            .leftJoin('allTopics.topic', 'topic')
            .leftJoin('pupil.parents', 'parents')
            .leftJoin('parents.parent', 'parent')
            .leftJoin('pupil.classes', 'classes')
            .where('pupil.id IN (:...pupilIds)', { pupilIds })
            .select([
                'pupil.id',
                'pupil.firstname',
                'pupil.lastname',
                'classes.id',
                'allTopics.id',
                'pupilTopicPeriod.index',
                'pupilClassTopic.id',
                'topic.id',
                'topic.isReading',
                'parents.id',
                'parent.id'
            ])
            .getMany();

        if (!pupils) throw new HttpException(`Invalid ${pupilIds.length === 1 ? 'pupil' : 'pupils'} id`, ErrorStatusCodeEnum._535);

        let numberOfMovedPupils = 0;

        const doAddPupilToClass = async (manager: EntityManager, pupil: LwpPupil): Promise<void> => {
            const pupilRepository: Repository<LwpPupil> = manager.getRepository(LwpPupil);
            const schoolClassRepository: Repository<LwpSchoolClass> = manager.getRepository(LwpSchoolClass);
            const pupilTopicRepository: Repository<LwpPupilTopic> = manager.getRepository(LwpPupilTopic);
            const classTopicRepository: Repository<LwpClassTopic> = manager.getRepository(LwpClassTopic);
            const staticTopicRepository: Repository<StaticLwpTopic> = manager.getRepository(StaticLwpTopic);
            const logLwpPupilClassChangeRepository: Repository<LogLwpPupilClassChange> = manager.getRepository(LogLwpPupilClassChange);

            const newClass = await schoolClassRepository
                .createQueryBuilder('schoolClass')
                .leftJoin('schoolClass.period', 'classPeriod')
                .leftJoin('schoolClass.yearGroup', 'classYearGroup')
                .leftJoin('schoolClass.topics', 'classTopic', 'classTopic.released = :bool', { bool: true })
                .leftJoin('classTopic.topic', 'staticTopic')
                .leftJoin('staticTopic.activities', 'activity')
                .where('schoolClass.id = :schoolClassId', { schoolClassId: newClassId })
                .select([
                    'schoolClass.id',
                    'schoolClass.isRegistrationClass',
                    'schoolClass.isGroupAcrossClasses',
                    'schoolClass.readingStartDay',
                    'schoolClass.status',
                    'classYearGroup.id',
                    'classYearGroup.year',
                    'classYearGroup.mathscotThemes',
                    'classPeriod.index',
                    'classTopic.id',
                    'classTopic.released',
                    'classTopic.readingTarget',
                    'classTopic.releaseDate',
                    'staticTopic.id',
                    'staticTopic.isReading',
                    'activity.id',
                    'activity.isHidden'
                ])
                .getOne();

            if (pupil.classes.filter((pc) => pc.id === newClassId).length) {
                if (skipPupil || allowExisting) {
                    return;
                } else {
                    throw new HttpException(`Pupil already in this class.`, ErrorStatusCodeEnum._535);
                }
            }

            if (newClass?.isRegistrationClass) {
                const pupilRegistrationClass = await schoolClassRepository
                    .createQueryBuilder('schoolClass')
                    .leftJoin('schoolClass.pupils', 'pupil')
                    .leftJoin('schoolClass.period', 'period')
                    .where('pupil.id = :id', { id: pupil?.id })
                    .andWhere('period.index = :periodIndex', { periodIndex: newClass?.period?.index })
                    .andWhere('schoolClass.isRegistrationClass = :bool', { bool: true })
                    .select(['schoolClass.id', 'schoolClass.name'])
                    .orderBy('schoolClass.logCreatedAt', 'DESC')
                    .getOne();

                if (pupilRegistrationClass) {
                    if (skipPupil) {
                        // If the pupil is already in a registration class and skipPupil is true, throw an error

                        const currentlyIn = `${pupil?.getFullName()} is currently in ${pupilRegistrationClass?.name}`;

                        newrelic.addCustomAttribute('excludeFromErrorGroup', currentlyIn);

                        throw new HttpException(
                            `A pupil can only be in one registration class for this academic year. ${currentlyIn} so would need to be removed from there first.`,
                            ErrorStatusCodeEnum._535
                        );
                    } else {
                        // if the teacher changing pupil registration class from class 1 to class 2 then first we need removed them from class 1
                        await this.removePupilFromClass(pupil.id, pupilRegistrationClass.id, contextUserId, manager);

                        pupil = await pupilRepository
                            .createQueryBuilder('pupil')
                            .leftJoin('pupil.allTopics', 'allTopics')
                            .leftJoin('allTopics.period', 'pupilTopicPeriod')
                            .leftJoin('allTopics.classTopic', 'pupilClassTopic')
                            .leftJoin('allTopics.topic', 'topic')
                            .leftJoin('pupil.parents', 'parents')
                            .leftJoin('parents.parent', 'parent')
                            .leftJoin('pupil.classes', 'classes')
                            .where('pupil.id = :pupilId', { pupilId: pupil.id })
                            .select([
                                'pupil.id',
                                'pupil.firstname',
                                'pupil.lastname',
                                'classes.id',
                                'allTopics.id',
                                'pupilTopicPeriod.index',
                                'pupilClassTopic.id',
                                'topic.id',
                                'topic.isReading',
                                'parents.id',
                                'parent.id'
                            ])
                            .getOne();
                    }
                }

                const readingStaticTopic = await staticTopicRepository.findOne({ where: { isReading: true } });

                const { count: numReadingTopics } = await pupilTopicRepository
                    .createQueryBuilder('pt')
                    .select('COUNT(1)')
                    .where({
                        pupil: pupil,
                        topic: readingStaticTopic
                    })
                    .getRawOne<{ count: number }>();

                if (numReadingTopics > 0) {
                    // Pupil has reading topics. We need to deal with these.
                    // We'll need to readjust the pupil topics to the new class, and then release.

                    // Step 1: find existing reading pupil topics of theirs
                    const existingReadingPupilTopicIds = (
                        await pupilTopicRepository
                            .createQueryBuilder('pt')
                            .select('pt.id', 'id')
                            .leftJoin('pt.classTopic', 'ct')
                            .where({
                                pupil: pupil,
                                topic: readingStaticTopic
                            })
                            .andWhere('ct.id is null')
                            .getRawMany<{ id: string }>()
                    ).map((row) => row.id);

                    // Step 2: release the new reading topics to them
                    const newClassReadingTopics = await classTopicRepository.find({
                        where: {
                            class: { id: newClass?.id },
                            topic: { id: readingStaticTopic?.id },
                            released: true
                        },
                        relations: ['topic', 'topic.activities']
                    });

                    const createdIds = await this.helperService.topicReleaseHelper(
                        newClassReadingTopics,
                        pupil,
                        newClass,
                        pupil?.parents?.[0]?.parent,
                        manager
                    );

                    // Step 3: update the pupil topics with the new feedbacks!
                    await this.pupilFeedbackService.updatePupilTopicStarCountReadingBatch(createdIds, manager);

                    // Step 4: delete pupil topics that we replaced with new ones
                    // this keeps any which we don't replace!

                    await pupilTopicRepository.query(
                        `
                        DELETE FROM lwp_pupil_topic lpt
                        WHERE
                            -- same pupil
                            lpt."pupilId" = $1
                            -- same topic
                            -- already existed before
                            AND lpt.id = ANY($2)
                            -- there is a valid duplicate that we just created
                            AND EXISTS (
                                SELECT 1
                                FROM lwp_pupil_topic lpt2
                                JOIN lwp_class_topic lct ON lpt2."classTopicId" = lct.id
                                WHERE
                                    -- one of the items that we just created
                                    lpt2.id = ANY($3)
                                    -- exists in the same week
                                    AND daterange(lpt2."releaseDate", (lpt2."releaseDate" + interval '1 week')::date) @> lpt."releaseDate"
                            )
                `,
                        [pupil.id, existingReadingPupilTopicIds, createdIds]
                    );
                }
            }

            const topicsForRelease: LwpClassTopic[] = [];
            const pupilTopicsNeedToUpdate: LwpPupilTopic[] = [];

            for (const newClassTopic of newClass.topics.filter((ct) => ct.topic.isReading === false && ct.released)) {
                let isNewTopicExistInPupilTopic = false;

                // When a pupil is added to a new class, check if the pupil already has a topic
                // in the same academic period with the same static topic but not linked to any classTopic.
                // If found, link that pupilTopic to the corresponding classTopic of the new class.
                for (const pupilTopic of pupil.allTopics.filter(
                    (pt) => pt?.period?.index === newClass?.period?.index && pt?.classTopic?.id == null
                )) {
                    if (pupilTopic.topic.id === newClassTopic.topic.id) {
                        pupilTopic.classTopic = newClassTopic;
                        pupilTopic.period = newClass?.period;
                        isNewTopicExistInPupilTopic = true;
                        pupilTopicsNeedToUpdate.push(pupilTopic);
                        break;
                    }
                }

                // Any others which did not get transferred over need to be added from the new class,
                // like normal when there is an added pupil
                if (!isNewTopicExistInPupilTopic) {
                    topicsForRelease.push(newClassTopic);
                }
            }

            if (pupilTopicsNeedToUpdate?.length > 0) await pupilTopicRepository.save(pupilTopicsNeedToUpdate);

            await this.helperService.topicReleaseHelper(topicsForRelease, pupil, newClass, pupil?.parents?.[0]?.parent, manager);

            // change pupil class
            const newPupil = await pupilRepository.findOne({ where: { id: pupil.id }, relations: ['classes'] });

            if (!newPupil.classes) {
                newPupil.classes = [];
            }

            newPupil.classes.push(newClass);

            // Backfill startedSchool from the class if the pupil doesn't have one yet.
            // We only set it when the year group resolves to a number. getYearFromYearGroup returns null
            // for 'Unknown' (skipped here) and a number for recognised year groups (Reception/Early Years -> 0,
            // Year 1-6 -> 1-6). Note: any other unrecognised string falls through to its default of 0, i.e.
            // would be treated as Reception - acceptable for the current primary-only year-group set, but a
            // candidate for hardening (return null for unknown) in a follow-up.
            const classYearGroupNum = newClass?.yearGroup?.year ? this.helperService.getYearFromYearGroup(newClass.yearGroup.year) : null;

            if (!newPupil.startedSchool && newClass?.period?.index != null && classYearGroupNum != null) {
                newPupil.startedSchool = `${newClass.period.index - classYearGroupNum}`;
            }

            await pupilRepository.save(newPupil);

            if (newClass.isGroupAcrossClasses) await this.helperService.updateGroupAcrossClassesLicenseDetails([newClass.id], manager);

            const logEntry = new LogLwpPupilClassChange();

            logEntry.pupilId = pupil.id;
            logEntry.classId = newClass.id;
            logEntry.status = newClass.status;
            logEntry.action = PupilClassActionType.ADDED;
            logEntry.logCreatedById = contextUserId;

            await logLwpPupilClassChangeRepository.save(logEntry);

            await schoolClassRepository.update({ id: newClass?.id }, { isStatsNeedUpdate: true });

            numberOfMovedPupils += 1;
        };

        if (manager) {
            for (const pupil of pupils) {
                await doAddPupilToClass(manager, pupil);
            }
        } else {
            for (const pupil of pupils) {
                await this.connection.manager.transaction((mgr) => doAddPupilToClass(mgr, pupil));
            }
        }

        return numberOfMovedPupils > 0;
    }

    public async assignPupilToNewOrExistingClass(input: AssignPupilToNewOrExistingClassInput, contextUserId: string): Promise<boolean> {
        let classId = input.existingClassId;

        if (!input.existingClassId) {
            const school = await this.schoolRepository.findOne(input.schoolId, {
                relations: ['curentPeriod'],
                select: ['id', 'curentPeriod']
            });

            if (!school) throw new HttpException(`School does not exist`, ErrorStatusCodeEnum._535);

            const schoolClass = new LwpSchoolClass();
            const year = await this.yearGroupService.getYearGroup(input.yearGroup);
            const shallowUser = this.shallowUserService.newShallowUser(contextUserId);

            schoolClass.name = input.className;
            schoolClass.yearGroup = year;
            schoolClass.logCreatedBy = shallowUser;
            schoolClass.logUpdatedBy = shallowUser;
            schoolClass.isRegistrationClass = true;
            schoolClass.isReadyTeddyEnabled = true;
            schoolClass.school = school;
            schoolClass.period = { index: school?.curentPeriod?.index + 1 } as StaticLwpPeriod;
            schoolClass.status = SchoolClassStatus.INACTIVE;

            const createdSchoolClass = await this.schoolClassRepository.save(schoolClass);

            classId = createdSchoolClass.id;
        }

        return await this.addPupilToClass(classId, input.pupilIds, contextUserId, true);
    }

    public async linkPupilToWondePupil(linkClassInput: LinkPupilInput): Promise<boolean> {
        const { linkPupilInputs } = linkClassInput;

        // validating linkPupilInputs START
        const valueArr = linkPupilInputs.map((item) => {
            return item.importedStudentId;
        });
        const isDuplicate = valueArr.some((item, idx) => {
            return valueArr.indexOf(item) != idx && item !== 'not_in_mis';
        });

        if (isDuplicate)
            throw new HttpException('You can not associate one lwp pupil with more than one wonde student', ErrorStatusCodeEnum._535);
        // validating linkPupilInputs END

        try {
            for (const inputs of linkPupilInputs) {
                const { lwpPupilId, importedStudentId } = inputs;

                // If importedStudentId is null then go to next iteration
                if (!importedStudentId) {
                    continue;
                }

                // Find importedStudent from wonde_student table
                const importedStudent = await this.importedStudentRepository
                    .createQueryBuilder('importedStudent')
                    .leftJoin('importedStudent.lwpPupil', 'lwpPupil')
                    .where('importedStudent.id = :importedStudentId', { importedStudentId })
                    .select(['importedStudent.id', 'importedStudent.details', 'lwpPupil.id'])
                    .getOne();

                // Find lwpPupil from lwp_pupil table
                const lwpPupil = await this.pupilRepository
                    .createQueryBuilder('pupil')
                    .leftJoin('pupil.importedStudent', 'importedStudent')
                    .where('pupil.id = :lwpPupilId', { lwpPupilId })
                    .select(['pupil.id', 'pupil.startedSchool', 'pupil.importedStudentId', 'importedStudent.id'])
                    .getOne();

                if (importedStudentId === 'not_in_mis' && lwpPupil) {
                    const newWondeStudentId = lwpPupil?.importedStudent?.id;

                    const importedStudent = await this.importedStudentRepository
                        .createQueryBuilder('importedStudent')
                        .leftJoin('importedStudent.lwpPupil', 'lwpPupil')
                        .where('importedStudent.id = :newWondeStudentId', { newWondeStudentId })
                        .select(['importedStudent.id', 'lwpPupil.id'])
                        .getOne();

                    if (importedStudent) {
                        await this.importedStudentRepository.update(importedStudent.id, { lwpPupil: null });
                        await this.pupilRepository.update(lwpPupil.id, { importedStudentId: null });
                    }

                    continue;
                }

                // Go to next iteration if any one of pupil or student is not found
                if (!importedStudent || !lwpPupil) {
                    continue;
                }

                // Removing relation between importedStudent and lwpPupil
                // if user want to associate importedStudent with other lwpPupil
                if (importedStudent.lwpPupil?.id !== lwpPupilId) {
                    await this.importedStudentRepository.update(importedStudent.id, { lwpPupil: null });
                    await this.pupilRepository.update(lwpPupil.id, { importedStudentId: null });
                }

                // Associating importedStudent with lwpPupil
                await this.importedStudentRepository.update(importedStudent.id, { lwpPupil: { id: lwpPupil.id } });

                // Associating lwpPupil with importedStudent (and backfilling startedSchool below if missing)
                const pupilUpdate: { importedStudentId: string; startedSchool?: string } = {
                    importedStudentId: importedStudent.id
                };

                // Backfill startedSchool from the imported student's nc_year if the pupil doesn't have one yet.
                if (!lwpPupil.startedSchool) {
                    // Use the period of the pupil's registration class (most recent) rather than the school
                    // period: for Ready Teddy, pupils can be in next academic year's reception classes, so the
                    // class period is the correct basis for deriving startedSchool.
                    const registrationClass = await this.schoolClassRepository
                        .createQueryBuilder('schoolClass')
                        .innerJoin('schoolClass.pupils', 'pupil', 'pupil.id = :lwpPupilId', { lwpPupilId })
                        .leftJoin('schoolClass.period', 'period')
                        .leftJoin('schoolClass.school', 'lwpSchool')
                        .where('schoolClass.isRegistrationClass = :isReg', { isReg: true })
                        // Only current/future registration classes (>= the school's current period), never a
                        // previous academic year's class. >= (not =) allows Ready Teddy next-year reception.
                        .andWhere('period.index >= "lwpSchool"."curentPeriodIndex"')
                        .orderBy('period.index', 'DESC')
                        .select('period.index', 'periodIndex')
                        .limit(1)
                        .getRawOne<{ periodIndex: number }>();

                    let ncYear: string | undefined;

                    try {
                        ncYear = JSON.parse(importedStudent.details)?.import_nc_year;
                    } catch {
                        ncYear = undefined;
                    }

                    const normalisedYear = ncYear ? this.helperService.normalizeSchoolYear(ncYear) : -999;

                    if (registrationClass?.periodIndex != null && normalisedYear !== -999) {
                        pupilUpdate.startedSchool = `${registrationClass.periodIndex - normalisedYear}`;
                    }
                }

                await this.pupilRepository.update(lwpPupil.id, pupilUpdate);
            }

            return true;
        } catch (err) {
            if (err.code === '23505') {
                throw new HttpException('Something went wrong in pupil linking', ErrorStatusCodeEnum._535);
            } else {
                throw new HttpException(`${err.message}`, ErrorStatusCodeEnum._535);
            }
        }
    }

    public async getPupilYearGroup(startedSchool: string): Promise<string> {
        const currentPeriodIndex = await this.periodService.getCurrentPeriodIndex();

        if (startedSchool) {
            return `${currentPeriodIndex - +startedSchool}`;
        }

        return '0';
    }

    public async getPupilParentIntroVideoWatchedStatus(parentId: string): Promise<boolean> {
        return Boolean(
            (
                await this.userRepository.findOne({
                    where: { id: parentId },
                    select: ['watchedIntroVideo']
                })
            )?.watchedIntroVideo
        );
    }

    public async getPupilReadingNote(pupilTopicId: string): Promise<PupilReadingNoteOutput> {
        const pupilTopic = await this.pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoinAndSelect('pupilTopic.classTopic', 'classTopic')
            .leftJoinAndSelect('classTopic.class', 'class')
            .leftJoinAndSelect('class.mainTeacher', 'mainTeacher')
            .where('pupilTopic.id = :pupilTopicId', { pupilTopicId })
            .getOne();

        const currentReadingTopic = await this.classTopicService.getCurrentClassReadingTopic(pupilTopic?.classTopic?.class?.id);

        return {
            headingText:
                pupilTopic?.classTopic?.class?.mainTeacher?.nameForChildren ??
                pupilTopic?.classTopic?.class?.mainTeacher?.getFullName() ??
                'Teacher',
            messageText: currentReadingTopic?.readingNote ?? null,
            pupilEarnedStars: pupilTopic?.earnedGoldStar ? pupilTopic?.readingTarget : pupilTopic?.silverStars,
            classReadingTarget: pupilTopic?.readingTarget ?? 0
        };
    }

    public async getPupilRegistrationClass(pupilId: string, manager?: EntityManager): Promise<LwpSchoolClass> {
        const currentPeriodIndex = await this.periodService.getCurrentPeriodIndex(manager);
        const pupilClassesBase = await this.queryBaseService.pupilClassesBase(pupilId, manager);
        const pupilClass = await pupilClassesBase
            .select('class')
            .leftJoin('class.period', 'period')
            .andWhere('period.index >= :periodIndex', { periodIndex: currentPeriodIndex })
            .andWhere('class.isRegistrationClass = :bool', { bool: true })
            .orderBy('class.logCreatedAt', 'DESC')
            .getOne();

        return pupilClass ? pupilClass : null;
    }

    public async getParentsContext(pupilId: string): Promise<ParentsContext> {
        const pupilData = await this.pupilRepository.query(
            `
            select
            COUNT(lpp.id) > 0 AND SUM(1) FILTER (WHERE lpp."status" = 'REJECTED') = COUNT(lpp.id) AS "allParentsRejected",
            COUNT(lpp.id) > 0 AND SUM(1) FILTER (WHERE lpp."status" IN ('REJECTED', 'IMPORTED')) = COUNT(lpp.id) AS "allParentsRejectedOrImported",
            COUNT(lpp.id) > 0 AND SUM(1) FILTER (WHERE lpp."status" = 'INVITED' AND lpp."lastInvitationEmailSent" IS NULL AND lu."userStatus" IN ('ACTIVE', 'INVITED', 'ACCOUNTLESS')) > 0 AS "allAwaitingInviteParents",
            COUNT(lpp.id) > 0 AND SUM(1) FILTER (WHERE lpp."status" = 'INVITED') > 0 AND SUM(1) FILTER (WHERE lpp."status" <> 'ACTIVE') = COUNT(lpp.id) AS "allParentsNotActiveAndAtLeastOneInvited"
        from
            lwp_pupil lp
                left join
                    lwp_pupil_parent lpp on lpp."pupilId" = lp.id
                left join
                    lwp_user lu on lu.id = lpp."parentId"
        where
            lp.id = $1
            `,
            [pupilId]
        );

        const result = Object.assign({}, ...pupilData);

        return {
            allParentsRejected: result?.allParentsRejected ?? false,
            allParentsRejectedOrImported: result?.allParentsRejectedOrImported ?? false,
            allParentsNotActiveAndAtLeastOneInvited: result?.allParentsNotActiveAndAtLeastOneInvited ?? false,
            allAwaitingInviteParents: result?.allAwaitingInviteParents ?? false
        };
    }

    public async createSchoolAndDummyWondeData(input: SchoolAndDummyWondeDataInput, userId: string): Promise<boolean> {
        const sampleUser = this.shallowUserService.newShallowUser('1');

        const school = await this.schoolService.addSchool(
            {
                schoolName: input?.schoolName,
                email: true,
                google: false,
                microsoft: false,
                classesAllowed: input?.classesAllowed ?? 10,
                fullProgrammedClassesAllowed: input?.fullProgrammedClassesAllowed ?? 10,
                leader: {
                    ...input?.leader
                }
            } as SchoolInput,
            [],
            sampleUser
        );

        if (!school) throw new HttpException(`SCHOOL: ${input?.schoolName} not created.`, ErrorStatusCodeEnum._535);

        const mainTeacher = await this.userRepository.findOne({ where: { email: input?.leader?.email } });

        if (!mainTeacher)
            throw new HttpException(`TEACHER: ${input?.leader?.firstname} ${input?.leader?.lastname} not found.`, ErrorStatusCodeEnum._535);

        const magicLink = await this.magicLinkService.getActiveMagicLinkForUser(mainTeacher);

        if (!magicLink) throw new HttpException('MAGIC LINK not found.', ErrorStatusCodeEnum._535);

        const acceptedTeacher = await this.usersService.acceptUserInvitation({
            phoneNumber: null,
            password: input?.leaderPassword,
            resetPassToken: magicLink?.url,
            verificationCode: null,
            socialLoginJwt: null,
            ...input?.leader
        } as AcceptUserInvitationInput);

        if (!acceptedTeacher)
            throw new HttpException(
                `USER: ${acceptedTeacher?.firstname} ${acceptedTeacher?.lastname} not found.`,
                ErrorStatusCodeEnum._535
            );

        const importedSchool = await this.wondeService.createDummyWondeSchoolData(school?.id);

        await this.wondeService.reLinkingLwpWithWonde(importedSchool.id, school.id, userId);

        return true;
    }

    public async createSchoolDataForTesting(input: CreateSchoolDataForTestingInput, userId: string): Promise<boolean> {
        const sampleUser = await this.userRepository.findOne(userId);

        const school = await this.schoolService.addSchool(
            {
                schoolName: input?.schoolName,
                email: true,
                google: false,
                microsoft: false,
                classesAllowed: 10,
                fullProgrammedClassesAllowed: 10,
                leader: {
                    ...input?.leader
                }
            } as SchoolInput,
            [],
            sampleUser
        );

        if (!school) throw new HttpException(`SCHOOL: ${input?.schoolName} not created.`, ErrorStatusCodeEnum._535);

        await this.schoolRepository.update({ id: school?.id }, { enableAddClasses: true });

        const mainTeacher = await this.userRepository.findOne({ where: { email: input?.leader?.email } });

        if (!mainTeacher)
            throw new HttpException(`LEADER: ${input?.leader?.firstname} ${input?.leader?.lastname} not found.`, ErrorStatusCodeEnum._535);

        if (input?.teacherInput) {
            const teacher = await this.teacherService.addTeacher(
                {
                    email: input?.teacherInput?.email,
                    firstname: input?.teacherInput?.firstname,
                    lastname: input?.teacherInput?.lastname,
                    nameForChildren: input?.teacherInput?.nameForChildren,
                    role: TeacherRole.CLASS_TEACHER,
                    sendInvite: input?.teacherInput?.sendInvite,
                    schoolId: school?.id
                },
                sampleUser
            );

            if (!teacher)
                throw new HttpException(
                    `TEACHER: ${input?.teacherInput?.firstname} ${input?.teacherInput?.lastname} not found.`,
                    ErrorStatusCodeEnum._535
                );

            if (input?.teacherInput?.sendInvite) {
                const magicLink = await this.magicLinkService.getActiveMagicLinkForUser(teacher);

                if (!magicLink) throw new HttpException('TEACHER MAGIC LINK not found.', ErrorStatusCodeEnum._535);

                const acceptedTeacher = await this.usersService.acceptUserInvitation({
                    phoneNumber: null,
                    password: input?.leaderPassword,
                    resetPassToken: magicLink?.url,
                    socialLoginJwt: null,
                    verificationCode: null,
                    ...input?.teacherInput
                } as AcceptUserInvitationInput);

                if (!acceptedTeacher)
                    throw new HttpException(
                        `ACCCEPTED TEACHER: ${acceptedTeacher?.firstname} ${acceptedTeacher?.lastname} not found.`,
                        ErrorStatusCodeEnum._535
                    );
            }
        }

        const yearGroups = await this.yearGroupService.allYearGroup();
        const yearGroup = yearGroups?.[0] ?? null;

        if (!yearGroup) throw new HttpException('YEAR GROUP not found.', ErrorStatusCodeEnum._535);

        const schoolClass = await this.schoolClassService.createSchoolClass(
            {
                name: input?.className,
                yearGroup: yearGroup?.id,
                status: SchoolClassStatus.ACTIVE,
                isReadingLogsEnabled: input?.addReading,
                isRegistrationClass: true,
                mainTeacher: mainTeacher?.id,
                teachers: [],
                periodId: await this.periodService.getCurrentPeriodIndex(),
                readingTarget: input?.readingTarget ?? 5,
                readingStartDay: moment().day() === 1 ? 2 : 1,
                readingLaunchDate: new Date(),
                lastYearsInheritedClassId: null,
                wondeClassId: null,
                schoolId: school?.id,
                isFullProgramme: true,
                isReadyTeddy: false
            },
            sampleUser.id
        );

        if (!schoolClass) throw new HttpException(`SCHOOL CLASS: ${input?.className} not created.`, ErrorStatusCodeEnum._535);

        if (input?.topicName) {
            const topicDomains = await this.topicDomainService.allTopicDomains();

            if (topicDomains?.length === 0) throw new HttpException('TOPIC DOMAINs not found.', ErrorStatusCodeEnum._535);
            const topicDomain = topicDomains?.find((domain) => domain.title === 'Reading');

            if (!topicDomain) throw new HttpException('TOPIC DOMAIN not found.', ErrorStatusCodeEnum._535);
            const staticTopic = await this.topicService.addTopic(
                {
                    teacherTopicName: input?.topicName,
                    teacherDescription: '',
                    domainAndYearGroupIds: [{ domainId: topicDomain?.id, yearGroupId: yearGroup?.id }],
                    parentTopicName: input?.topicName,
                    video: '605069004',
                    teacherEmailBody: '',
                    isDemo: false,
                    isHidden: false
                } as TopicInput,
                [],
                sampleUser
            );

            if (!staticTopic) throw new HttpException(`STATIC TOPIC: ${input?.topicName} not created.`, ErrorStatusCodeEnum._535);

            if (input?.activityData?.length > 0) {
                for (const activity of input.activityData) {
                    const activitySteps: ActivityStepInput[] = [];

                    const staticActivity = await this.activityService.addActivity(
                        {
                            name: activity?.name,
                            activityType: ActivityType.STATIC,
                            order: activity?.order,
                            welcomeMessage: 'Welcome',
                            isHidden: false,
                            steps: activitySteps,
                            details: JSON.stringify({ activityComponentName: activity?.activityComponentName }),
                            topicId: staticTopic?.id
                        } as ActivityInput,
                        [],
                        sampleUser.id
                    );

                    if (!staticActivity)
                        throw new HttpException(`STATIC ACTIVITY: ${activity?.name} not created.`, ErrorStatusCodeEnum._535);
                }
            }

            const classTopic = await this.classTopicService.addClassTopic({
                releaseDate: new Date(),
                dueDate: null,
                teacherMessage: '',
                createdBy: sampleUser?.id,
                topicId: staticTopic?.id,
                classId: schoolClass?.id
            } as ClassTopicInput);

            if (!classTopic) throw new HttpException('CLASS TOPIC not created.', ErrorStatusCodeEnum._535);
        }

        const magicLink = await this.magicLinkService.getActiveMagicLinkForUser(mainTeacher);

        if (!magicLink) throw new HttpException('LEADER MAGIC LINK not found.', ErrorStatusCodeEnum._535);

        const acceptedLeader = await this.usersService.acceptUserInvitation({
            phoneNumber: null,
            password: input?.leaderPassword,
            resetPassToken: magicLink?.url,
            verificationCode: null,
            socialLoginJwt: null,
            ...input?.leader
        } as AcceptUserInvitationInput);

        if (!acceptedLeader)
            throw new HttpException(
                `ACCEPTED LEADER: ${acceptedLeader?.firstname} ${acceptedLeader?.lastname} not found.`,
                ErrorStatusCodeEnum._535
            );

        await this.inviteParentsWithPupil(
            {
                firstName: input?.pupilInput?.pupilFirstName,
                lastName: input?.pupilInput?.pupilLastName,
                classId: schoolClass?.id,
                dateOfBirth: new Date(),
                gender: Gender.MALE,
                yearGroup: yearGroup.id,
                isPupilPremium: true,
                upn: `${appConstants.testing.mockUPNPrefix}${nanoid()}`,
                parentDetails: [
                    {
                        email: input?.pupilInput?.parentEmailForInvitation,
                        firstname: input?.pupilInput?.parentFirstName,
                        lastname: input?.pupilInput?.parentLastName,
                        phoneNumber: input?.pupilInput?.parentPhoneNumberForInvitation
                    }
                ]
            } as InviteParentsWithPupil,
            sampleUser.id
        );

        const condition = input?.pupilInput?.parentEmailForInvitation
            ? { email: input?.pupilInput?.parentEmailForInvitation }
            : { phoneNumber: this.helperService.formatPhoneNumber(input?.pupilInput?.parentPhoneNumberForInvitation) };
        const parent = await this.userRepository.findOne({
            where: condition
        });

        if (!parent)
            throw new HttpException(`INVITED 1st CHILD: ${parent?.firstname} ${parent?.lastname} not found.`, ErrorStatusCodeEnum._535);

        if (input?.pupilInput?.pupil2FirstName && input?.pupilInput?.pupil2LastName) {
            await this.inviteParentsWithPupil(
                {
                    firstName: input?.pupilInput?.pupil2FirstName,
                    lastName: input?.pupilInput?.pupil2LastName,
                    classId: schoolClass?.id,
                    dateOfBirth: new Date(),
                    gender: Gender.MALE,
                    yearGroup: yearGroup.id,
                    isPupilPremium: true,
                    upn: `${appConstants.testing.mockUPNPrefix}${nanoid()}`,
                    parentDetails: [
                        {
                            email: input?.pupilInput?.parentEmailForInvitation,
                            firstname: input?.pupilInput?.parentFirstName,
                            lastname: input?.pupilInput?.parentLastName,
                            phoneNumber: input?.pupilInput?.parentPhoneNumberForInvitation
                        }
                    ]
                } as InviteParentsWithPupil,
                sampleUser.id
            );

            const condition = input?.pupilInput?.parentEmailForInvitation
                ? { email: input?.pupilInput?.parentEmailForInvitation }
                : { phoneNumber: this.helperService.formatPhoneNumber(input?.pupilInput?.parentPhoneNumberForInvitation) };
            const secondChildsParent = await this.userRepository.findOne({
                where: condition
            });

            if (!secondChildsParent)
                throw new HttpException(
                    `INVITED 2nd CHILD: ${secondChildsParent?.firstname} ${secondChildsParent?.lastname} not found.`,
                    ErrorStatusCodeEnum._535
                );
        }

        if (input?.addReading) await this.classTopicService.adminCreateThisWeekReadingTopic(schoolClass?.id);

        const releaseDate = moment().add(1, 'years').toDate();

        await this.adminService.adminReleasePupilTopics(releaseDate);

        if (input?.addReading) {
            const currentReadingTopic = await this.classTopicService.getCurrentClassReadingTopic(schoolClass?.id);

            await this.pupilTopicRepository.update(
                { classTopic: { id: currentReadingTopic?.id } },
                { releaseDate: currentReadingTopic?.releaseDate }
            );
        }

        if (input?.registerParent) {
            let magicLink = await this.magicLinkService.getActiveMagicLinkForUser(parent);

            const pupil = await this.pupilRepository.findOne({
                where: {
                    firstname: input?.pupilInput?.pupilFirstName,
                    lastname: input?.pupilInput?.pupilLastName,
                    school: { id: school?.id }
                }
            });

            magicLink = await this.magicLinkService.generateMagicLink({
                userId: parent?.id,
                pupilTopicId: null,
                pupilId: pupil?.id,
                topicId: null,
                schoolId: null,
                termId: null,
                reportType: null,
                trophyId: null,
                type: MagicLinkType.INVITATION
            });

            const acceptedParent = await this.usersService.acceptUserInvitation({
                phoneNumber: null,
                password: input?.leaderPassword,
                resetPassToken: magicLink?.url,
                verificationCode: null,
                email: parent?.email,
                firstname: parent?.firstname,
                lastname: parent?.lastname,
                nameForChildren: null
            } as AcceptUserInvitationInput);

            if (!acceptedParent)
                throw new HttpException(
                    `ACCEPTED PARENT: ${acceptedParent?.firstname} ${acceptedParent?.lastname} not found.`,
                    ErrorStatusCodeEnum._535
                );

            await this.acceptOrRejectPupilInvitation(pupil?.id, parent.id, false);
            await this.parentPupilRepository.update(
                { pupilId: pupil?.id, parentId: parent?.id },
                { showInterstitial: false, interstitialContext: { isReadingSectionShown: true, isTopicsSectionShown: true } }
            );

            if (input?.pupilInput?.pupil2FirstName && input?.pupilInput?.pupil2LastName) {
                const secondPupil = await this.pupilRepository.findOne({
                    where: {
                        firstname: input?.pupilInput?.pupil2FirstName,
                        lastname: input?.pupilInput?.pupil2LastName,
                        school: { id: school?.id }
                    }
                });

                await this.acceptOrRejectPupilInvitation(secondPupil?.id, parent.id, false);
                await this.parentPupilRepository.update(
                    { pupilId: secondPupil?.id, parentId: parent?.id },
                    { showInterstitial: false, interstitialContext: { isReadingSectionShown: true, isTopicsSectionShown: true } }
                );
            }
        }

        if (input?.addTopics) {
            const topicDomains = await this.topicDomainService.allTopicDomains();

            if (topicDomains?.length === 0) throw new HttpException('TOPIC DOMAINs for adding topics not found.', ErrorStatusCodeEnum._535);

            for (const topicDomain of topicDomains) {
                const staticTopic = await this.topicService.addTopic(
                    {
                        teacherTopicName: `${topicDomain?.subject?.name} Topic`,
                        teacherDescription: '',
                        domainAndYearGroupIds: [{ domainId: topicDomain?.id, yearGroupId: yearGroup?.id }],
                        parentTopicName: `${topicDomain?.subject?.name} Topic`,
                        video: '605069004',
                        teacherEmailBody: '',
                        isDemo: false,
                        isHidden: false
                    } as TopicInput,
                    [],
                    sampleUser
                );

                if (!staticTopic)
                    throw new HttpException(`STATIC TOPIC: ${topicDomain?.subject?.name} Topic not created.`, ErrorStatusCodeEnum._535);

                const activityData = [
                    { name: `${topicDomain?.subject?.name} Activity 1`, order: 1, activityComponentName: 'GuessTheAnimal' },
                    { name: `${topicDomain?.subject?.name} Activity 2`, order: 2, activityComponentName: 'ClapClap' },
                    { name: `${topicDomain?.subject?.name} Activity 3`, order: 3, activityComponentName: 'SoundsScavengerHunt' }
                ];

                for (const activity of activityData) {
                    const activitySteps: ActivityStepInput[] = [];

                    const staticActivity = await this.activityService.addActivity(
                        {
                            name: activity?.name,
                            activityType: ActivityType.STATIC,
                            order: activity?.order,
                            welcomeMessage: 'Welcome',
                            isHidden: false,
                            steps: activitySteps,
                            details: JSON.stringify({ activityComponentName: activity?.activityComponentName }),
                            topicId: staticTopic?.id
                        } as ActivityInput,
                        [],
                        sampleUser.id
                    );

                    if (!staticActivity)
                        throw new HttpException(
                            `STATIC ACTIVITY: ${activity?.name} not created for adding topics.`,
                            ErrorStatusCodeEnum._535
                        );
                }

                const classTopic = await this.classTopicService.addClassTopic({
                    releaseDate: new Date(),
                    dueDate: null,
                    teacherMessage: '',
                    createdBy: sampleUser?.id,
                    topicId: staticTopic?.id,
                    classId: schoolClass?.id
                } as ClassTopicInput);

                if (!classTopic) return false;
            }
        }

        return true;
    }

    public async getPupilPreviousMathscots(pupilId: string): Promise<PupilPreviousMathscotsOutput[]> {
        const pupilMathscots = await this.pupilMathscotRepository
            .createQueryBuilder('pupilMathscot')
            .leftJoin('pupilMathscot.pupil', 'pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('school.curentPeriod', 'schoolPeriod')
            .leftJoin('pupilMathscot.period', 'mathscotPeriod')
            .where('pupil.id = :id', { id: pupilId })
            .andWhere('mathscotPeriod.index < schoolPeriod.index')
            .select([
                'pupilMathscot.character',
                'pupilMathscot.colour',
                'pupilMathscot.items',
                'mathscotPeriod.shortName',
                'pupilMathscot.logCreatedAt'
            ])
            .orderBy('pupilMathscot.logCreatedAt', 'DESC')
            .getMany();

        const previousMathscots: PupilPreviousMathscotsOutput[] = [];

        if (pupilMathscots?.length === 0) {
            return [];
        }

        for (const pupilMathscot of pupilMathscots) {
            const { thumbnailImage, bigImage } = await this.mathscotItemService.getMathscotUrlsByInputWithoutSave({
                character: pupilMathscot?.character,
                colour: pupilMathscot?.colour,
                ids: pupilMathscot?.items,
                pupilId
            });

            previousMathscots.push({ period: pupilMathscot?.period?.shortName, thumbnailImage, bigImage });
        }

        return previousMathscots;
    }

    public async addParent(input: ParentInput, invitedByIdOrUser: string | LwpUser, manager?: EntityManager): Promise<LwpUser> {
        const userRepository: Repository<LwpUser> = manager ? manager.getRepository(LwpUser) : this.userRepository;

        const formattedPhone = input.phoneNumber ? this.helperService.formatPhoneNumber(input.phoneNumber) : null;

        if (!input.email && !formattedPhone) {
            throw new HttpException('Email or phone number is required.', ErrorStatusCodeEnum._535);
        }

        const conditions = [];

        if (input.email) conditions.push({ email: input.email });

        if (formattedPhone) conditions.push({ phoneNumber: formattedPhone });

        const parent = await userRepository.findOne({
            where: conditions,
            select: ['id', 'userStatus', 'email', 'firstname', 'lastname', 'type']
        });
        const invitedBy =
            typeof invitedByIdOrUser === 'string'
                ? await userRepository.findOne({ where: { id: invitedByIdOrUser }, select: ['id', 'type'] })
                : invitedByIdOrUser;

        if (parent) {
            if (input.email && formattedPhone && parent.email && parent.email !== input.email) {
                const supportEmailKey = invitedBy?.type === UserType.PARENT ? 'PARENT_SUPPORT_EMAIL' : 'TEACHER_SUPPORT_EMAIL';
                const supportEmail =
                    (await this.parameterService.getParameterByKey(supportEmailKey))?.value ?? 'hello@learningwithparents.com';

                throw new HttpException(
                    `Phone number is already in use. Please double check the phone number/email address and contact ${supportEmail} if you need any support.`,
                    ErrorStatusCodeEnum._535
                );
            }

            if (![UserType.PARENT, UserType.MAGICPARENT, UserType.TOPICACCESS].includes(parent.type)) {
                throw new HttpException(
                    'One of the parent details you entered is registered as a different type of user. Please check your details again.',
                    ErrorStatusCodeEnum._535
                );
            }

            if (
                parent?.userStatus === UserStatus.IMPORTED ||
                (invitedBy?.type !== UserType.PARENT && parent?.userStatus === UserStatus.REJECTED)
            ) {
                parent.userStatus = UserStatus.INVITED;

                await userRepository.save(parent);
            }

            return parent;
        }

        const newParent = new LwpUser();
        const { phoneNumber, email, firstname, lastname } = input;

        newParent.firstname = firstname;
        newParent.lastname = lastname;
        newParent.email = email || null;
        newParent.phoneNumber = phoneNumber ? this.helperService.formatPhoneNumber(phoneNumber) : null;
        newParent.type = UserType.PARENT;
        newParent.userStatus = UserStatus.INVITED;
        newParent.emailVerificationCode = email ? this.helperService.generateId(4, '') : null;
        newParent.phoneVerificationCode = phoneNumber ? this.helperService.generateId(4, '') : null;

        const shallowUser = this.shallowUserService.newShallowUser(invitedBy);

        newParent.logCreatedBy = shallowUser;
        newParent.logUpdatedBy = shallowUser;

        return await userRepository.save(newParent);
    }

    public async isUserTeacher(userInfo: string): Promise<boolean> {
        return !!(await this.userRepository.count({
            where: [
                { email: userInfo, type: UserType.TEACHER },
                { phoneNumber: this.helperService.formatPhoneNumber(userInfo), type: UserType.TEACHER }
            ]
        }));
    }

    public async inviteParentsWithPupil(input: InviteParentsWithPupil, invitedBy: string, manager?: EntityManager): Promise<void> {
        const { classId, firstName, lastName, gender, dateOfBirth, isPupilPremium, upn, yearGroup, parentDetails } = input;

        const schoolClassRepository: Repository<LwpSchoolClass> = manager
            ? manager.getRepository(LwpSchoolClass)
            : this.schoolClassRepository;
        const yearGroupRepository: Repository<StaticLwpYearGroup> = manager
            ? manager.getRepository(StaticLwpYearGroup)
            : this.yearGroupRepository;

        const schoolClass = await schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoin('schoolClass.period', 'period')
            .where('schoolClass.id = :schoolClassId', { schoolClassId: classId })
            .select(['schoolClass.id', 'period.index'])
            .getOne();

        const yearGroupData = await yearGroupRepository.findOne({ where: { id: yearGroup }, select: ['year'] });

        const pupilInput = new PupilInput();

        pupilInput.firstname = firstName;
        pupilInput.lastname = lastName;
        pupilInput.classId = classId;
        pupilInput.upn = upn;
        pupilInput.gender = gender;
        pupilInput.isPupilPremium = isPupilPremium;
        pupilInput.dateOfBirth = dateOfBirth;
        pupilInput.startedSchool =
            schoolClass?.period?.index && yearGroupData?.year
                ? `${schoolClass?.period?.index - this.helperService.getYearFromYearGroup(yearGroupData?.year)}`
                : null;

        const pupil = await this.addPupilHelperWithClassId(pupilInput, invitedBy, manager);

        for (const parentDetail of parentDetails) {
            const parentInput = new ParentInput();

            parentInput.firstname = parentDetail.firstname;
            parentInput.lastname = parentDetail.lastname;
            parentInput.email = parentDetail.email;
            parentInput.phoneNumber = this.helperService.formatPhoneNumber(parentDetail.phoneNumber);

            const parent = await this.addParent(parentInput, invitedBy, manager);

            await this.postInviteParentWithPupilWork(pupil, parent, input.classId, invitedBy, manager);
        }
    }

    public async getPupilPreviousPupilMathscotImage(pupilId: string): Promise<string> {
        const pupilMathscot = await this.pupilMathscotRepository
            .createQueryBuilder('pupilMathscot')
            .leftJoin('pupilMathscot.pupil', 'pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('school.curentPeriod', 'schoolPeriod')
            .leftJoin('pupilMathscot.period', 'period')
            .where('pupil.id = :id', { id: pupilId })
            .andWhere('period.index = schoolPeriod.index - 1')
            .select(['pupilMathscot.character', 'pupilMathscot.colour', 'pupilMathscot.items', 'pupilMathscot.logCreatedAt'])
            .orderBy('pupilMathscot.logCreatedAt', 'DESC')
            .getOne();

        if (pupilMathscot) {
            const pupilMathscotUrl = await this.mathscotItemService.getMathscotUrlsByInputWithoutSave({
                character: pupilMathscot?.character,
                colour: pupilMathscot?.colour,
                ids: pupilMathscot?.items,
                pupilId
            });

            if (pupilMathscotUrl?.bigImage) {
                return pupilMathscotUrl?.bigImage;
            }
        }

        return null;
    }

    public async pupilMathscotUrl(pupil: LwpPupil): Promise<MergeMathscotItems> {
        const currentMathscot = await this.pupilMathscotService.getPupilCurrentPupilMathscot(pupil.id);

        return currentMathscot
            ? await this.mathscotItemService.getMathscotUrlsByInputWithoutSave({
                  ids: currentMathscot?.items,
                  pupilId: pupil.id,
                  character: currentMathscot ? currentMathscot?.character : PupilMathscotsCharacter.MONKEY,
                  colour: currentMathscot ? currentMathscot?.colour : PupilMathscotsColour.NATURAL
              })
            : { itemIds: [], bigImage: '', thumbnailImage: '' };
    }

    public async inviteParentOfPupilHelper(
        parent: LwpUser,
        pupil: LwpPupil,
        sendOnPhone: boolean,
        isBulkProcess = false,
        invitedById: string
    ): Promise<LwpUser> {
        if (
            this.helperService.isChildNameExist(
                parent?.pupils?.map((p) => (p.status === PupilParentStatus.ACTIVE ? p.pupil : null)).filter((item) => item),
                pupil.firstname,
                pupil.lastname
            )
        ) {
            return parent;
        }

        const invitedBy = this.shallowUserService.newShallowUser(invitedById);

        await this.pupilParentService.updatePupilParentRelation({
            pupilId: pupil.id,
            parentId: parent.id,
            status: PupilParentStatus.INVITED,
            logUpdatedBy: invitedBy,
            invitedBy,
            importedStudentContactID: null
        });

        if (parent?.userStatus !== UserStatus.ACTIVE) {
            await this.sendParentNotification(parent?.id, pupil?.id, isBulkProcess, sendOnPhone);

            await this.userRepository.update(
                { id: parent?.id },
                {
                    userStatus: parent?.userStatus === UserStatus.ACCOUNTLESS ? UserStatus.ACCOUNTLESS : UserStatus.INVITED
                }
            );
        }

        return parent;
    }

    public async inviteParentOfPupil(parentId: string, pupilId: string, sendOnPhone: boolean, invitedById: string): Promise<LwpUser> {
        const parent = await this.userRepository.findOne({
            where: { id: parentId },
            relations: ['pupils', 'pupils.pupil', 'pupils.parent']
        });
        const pupil = await this.pupilRepository.findOne({ where: { id: pupilId }, relations: ['school'] });

        if (!parent) throw new HttpException('Parent not found', ErrorStatusCodeEnum._535);
        if (!pupil) throw new HttpException('Pupil not found', ErrorStatusCodeEnum._535);

        const updatedParent = await this.inviteParentOfPupilHelper(parent, pupil, sendOnPhone, false, invitedById);

        return updatedParent;
    }

    public async confirmAllParentDetails(input: string[], invitedById: string): Promise<boolean> {
        await this.pupilParentRepository.update({ id: In(input) }, { status: PupilParentStatus.INVITED, invitedBy: { id: invitedById } });

        // TypeORM does not support update ... from syntax.
        await this.userRepository.query(
            `
            update lwp_user lu
            set "userStatus" = 'INVITED'
            from lwp_pupil_parent lpp
            where
                lpp."parentId" = lu.id
                and lu."userStatus" IN ('IMPORTED', 'REJECTED')
                and lpp.id = any($1)
        `,
            [input]
        );

        return true;
    }

    public async confirmParentDetails(input: ConfirmParentDetailsInput, invitedById: string): Promise<boolean> {
        const supportEmail =
            (await this.parameterService.getParameterByKey('TEACHER_SUPPORT_EMAIL'))?.value ?? 'hello@learningwithparents.com';

        if (input?.email) {
            const parentWithEmail = await this.userRepository.findOne({ where: { email: input?.email }, select: ['id'] });

            if (parentWithEmail?.id && parentWithEmail?.id !== input?.parentId)
                throw new HttpException(
                    `Email address is already in use. Please double check the phone number/email address and contact ${supportEmail} if you need any support.`,
                    ErrorStatusCodeEnum._535
                );
        }

        if (input?.phoneNumber) {
            const parentWithPhone = await this.userRepository.findOne({
                where: { phoneNumber: this.helperService.formatPhoneNumber(input?.phoneNumber) },
                select: ['id']
            });

            if (parentWithPhone?.id && parentWithPhone?.id !== input?.parentId)
                throw new HttpException(
                    `Phone number is already in use. Please double check the phone number/email address and contact ${supportEmail} if you need any support.`,
                    ErrorStatusCodeEnum._535
                );
        }

        await this.userRepository.update(
            { id: input?.parentId },
            {
                email: input?.email?.trim().length ? input?.email : null,
                phoneNumber: input?.phoneNumber ? this.helperService.formatPhoneNumber(input?.phoneNumber) : null
            }
        );
        await this.confirmAllParentDetails([input?.pupilParentId], invitedById);

        return true;
    }

    public async inviteParentForPupil(input: InviteParentForPupilInput, invitedById: string): Promise<LwpUser> {
        if (!input?.email && !input?.phoneNumber) {
            throw new HttpException('Email or phone number is required.', ErrorStatusCodeEnum._535);
        }

        const pupil = await this.pupilRepository.findOne({ where: { id: input.pupilId }, select: ['id', 'firstname'] });

        if (!pupil) throw new HttpException('Invalid Pupil id', ErrorStatusCodeEnum._535);

        const invitedBy = await this.userRepository.findOne({ where: { id: invitedById }, select: ['id', 'type'] });

        let parentQueryBuilder = this.userRepository
            .createQueryBuilder('parent')
            .leftJoin('parent.pupils', 'pupilParent')
            .leftJoin('pupilParent.pupil', 'pupil');

        if (input?.email) {
            parentQueryBuilder = parentQueryBuilder.where('parent.email = :email', { email: input.email });
        } else {
            parentQueryBuilder = parentQueryBuilder.where('parent.phoneNumber = :phoneNumber', {
                phoneNumber: this.helperService.formatPhoneNumber(input.phoneNumber)
            });
        }

        let parent = await parentQueryBuilder
            .select([
                'parent.id',
                'parent.email',
                'parent.phoneNumber',
                'parent.type',
                'parent.userStatus',
                'pupilParent.id',
                'pupilParent.status',
                'pupilParent.parentId',
                'pupil.id',
                'pupil.firstname'
            ])
            .getOne();

        if (!parent) {
            parent = await this.addParent(input, invitedBy);
        }

        // if the parent already rejected the invitation then PARENT can not invite him again
        if (parent?.type === UserType.TEACHER) {
            throw new HttpException(
                `This email address cannot be used for a parent account. Please use a different email address.`,
                ErrorStatusCodeEnum._535
            );
        }

        // if the parent already rejected the invitation then PARENT can not invite him again
        if (
            invitedBy.type === UserType.PARENT &&
            (parent?.pupils?.find((pp) => pp.status === PupilParentStatus.REJECTED && pp?.parentId === parent?.id) ||
                parent?.userStatus === UserStatus.REJECTED)
        ) {
            throw new HttpException(
                `Cannot invite this user again as they have previously rejected an invitation. Please check the contact details carefully. If they are correct, please contact your teacher.`,
                ErrorStatusCodeEnum._535
            );
        }

        const pupilParent = (parent?.pupils || [])?.find((pp) => pp?.pupil?.id === input?.pupilId);

        // if the pupil already have child relation with this parent
        if (pupilParent?.id) {
            if (pupilParent?.status === PupilParentStatus.IMPORTED) {
                await this.confirmAllParentDetails([pupilParent?.id], invitedBy?.id);

                return parent;
            } else {
                const base = `${input?.email ?? input?.phoneNumber} is already listed as one of ${pupil.firstname}`;

                newrelic.addCustomAttribute('excludeFromErrorGroup', base);
                newrelic.addCustomAttribute('replaceInErrorGroup', '<Parent> is already listed as one of <Child>');

                throw new HttpException(`${base}'s parents. Go to the Details tab to see more.`, ErrorStatusCodeEnum._535);
            }
        }

        await this.pupilParentService.createPupilParentRelation({
            parent: parent,
            pupil,
            invitedBy,
            importedStudentContactID: null,
            status: PupilParentStatus.INVITED
        });

        // Send email for invite pupil here

        await this.sendParentNotification(parent?.id, input?.pupilId);

        return parent;
    }

    public async transferPupilToNewParent(input: TransferPupilParentInput, userId: string): Promise<void> {
        const pupilParent = await this.pupilParentRepository
            .createQueryBuilder('pupilParent')
            .select(['pupilParent.id', 'pupilParent.pupilId', 'pupilParent.parentId'])
            .where('pupilParent.id = :pupilParentId', { pupilParentId: input?.pupilParentId })
            .getOne();

        if (!pupilParent?.id) throw new HttpException('Pupil parent link not found.', ErrorStatusCodeEnum._535);

        await this.pupilParentService.deletePupilParentRelation(pupilParent.parentId, pupilParent.pupilId, userId);
        await this.inviteParentForPupil(
            {
                email: input?.email,
                phoneNumber: input?.phoneNumber,
                firstname: input.firstname,
                lastname: input.lastname,
                pupilId: pupilParent.pupilId
            },
            userId
        );
        await this.magicLinkRepository.delete({ user: { id: pupilParent?.parentId }, pupilId: pupilParent?.pupilId });
    }

    private feedbackLastItemSubqueryQb(pupilId: string): SelectQueryBuilder<LwpPupilFeedback> {
        return this.pupilFeedbackRepository
            .createQueryBuilder('sq_feedback')
            .distinctOn(['sq_feedback."normalisedBookName"', 'sq_feedback."readingType"'])
            .select([
                'sq_feedback."normalisedBookName"',
                'sq_feedback."isBookFinished"',
                'sq_feedback."pageNumber"',
                'sq_feedback."readingType"'
            ])
            .innerJoin('sq_feedback.pupils', 'sq_pupil')
            .where('sq_feedback.type = :type', { type: FeedbackType.READING })
            .andWhere('sq_pupil.id = :pupilId', { pupilId })
            .addOrderBy('sq_feedback."normalisedBookName"')
            .addOrderBy('sq_feedback."readingType"')
            .addOrderBy('sq_feedback."bookReadAt"', 'DESC')
            .addOrderBy('sq_feedback."logCreatedAt"', 'DESC');
    }

    public pupilBookHistoryBaseQuery(pupilId: string): SelectQueryBuilder<LwpPupilFeedback> {
        return this.pupilFeedbackRepository
            .createQueryBuilder('pupil_feedback')
            .select([
                'pupil_feedback."normalisedBookName" AS "bookName"',
                'pupil_feedback."readingType" AS "readingType"',
                'MAX(pupil_feedback."bookReadAt") AS "bookReadAt"',
                'COUNT(DISTINCT pupil_feedback.id) AS "logCount"',
                'bool_or(pupil_feedback."userType" <> \'TEACHER\') AS "isReadAtHome"',
                'bool_or(pupil_feedback."userType" = \'TEACHER\' AND NOT pupil_feedback."logOnReadingAsGroupTab") AS "isReadAtSchool"',
                'bool_or(pupil_feedback."userType" = \'TEACHER\' AND pupil_feedback."logOnReadingAsGroupTab") AS "isReadingWithGroup"',
                'CASE WHEN bool_or(pupil_feedback."isBookFinished") = TRUE THEN TRUE ELSE pupil_feedback_last_item."isBookFinished" END AS "isBookFinished"',
                'pupil_feedback_last_item."pageNumber"'
            ])
            .innerJoin('pupil_feedback.pupils', 'pupil')
            .leftJoin(
                `(${this.feedbackLastItemSubqueryQb(pupilId).getQuery()})`,
                'pupil_feedback_last_item',
                'pupil_feedback_last_item."normalisedBookName" = pupil_feedback."normalisedBookName" AND pupil_feedback_last_item."readingType" = pupil_feedback."readingType"'
            )
            .where('pupil_feedback.type = :type', { type: FeedbackType.READING })
            .andWhere('pupil_feedback.originalFeedbackId IS NULL')
            .andWhere('pupil_feedback."readingType" IN (:...bookReadingTypes)', { bookReadingTypes: BOOK_READING_TYPES })
            .andWhere('pupil.id = :pupilId', { pupilId })
            .addGroupBy('pupil_feedback."normalisedBookName"')
            .addGroupBy('pupil_feedback."readingType"')
            .addGroupBy('pupil_feedback_last_item."pageNumber"')
            .addGroupBy('pupil_feedback_last_item."isBookFinished"')
            .addOrderBy('MAX(pupil_feedback."bookReadAt")', 'DESC')
            .addOrderBy('MAX(pupil_feedback."logCreatedAt")', 'DESC');
    }

    private currentAcademicYearBookLogsBaseQuery(pupilId: string): SelectQueryBuilder<LwpPupilFeedback> {
        return this.pupilFeedbackRepository
            .createQueryBuilder('pupil_feedback')
            .innerJoin('pupil_feedback.pupils', 'pupil')
            .innerJoin('pupil.school', 'school')
            .innerJoin('school.curentPeriod', 'currentPeriod')
            .where('pupil_feedback.type = :type', { type: FeedbackType.READING })
            .andWhere('pupil_feedback.originalFeedbackId IS NULL')
            .andWhere('pupil_feedback."readingType" IN (:...bookReadingTypes)', { bookReadingTypes: BOOK_READING_TYPES })
            .andWhere('pupil.id = :pupilId', { pupilId })
            .andWhere('pupil_feedback.periodIndex = currentPeriod.index');
    }

    public async getPupilBookHistoryForTeacher(input: PupilBookHistoryInput): Promise<PupilBookHistoryOutput[]> {
        const pupilBookHistoryBaseQuery = this.pupilBookHistoryBaseQuery(input.pupilId);

        if (input?.isCurrentYearOnly) {
            pupilBookHistoryBaseQuery
                .leftJoin('pupil.school', 'school')
                .leftJoin('school.curentPeriod', 'currentPeriod')
                .andWhere('pupil_feedback.periodIndex = currentPeriod.index');
        }

        if (input?.bookName) {
            pupilBookHistoryBaseQuery.andWhere('pupil_feedback."normalisedBookName" ILIKE :bookName', {
                bookName: `%${input?.bookName.trim()}%`
            });
        }

        if (input.isSchoolBooksOnly) {
            pupilBookHistoryBaseQuery.andWhere('pupil_feedback."readingType" = :readingType', { readingType: ReadingType.SCHOOL_BOOK });
        }

        if (input.readAt && input.readAt.length > 0) {
            const conditions = [];

            input.readAt.forEach((readAtValue) => {
                switch (readAtValue) {
                    case BookReadAt.HOME:
                        conditions.push('pupil_feedback."userType" = :userTypeHome');
                        break;
                    case BookReadAt.SCHOOL:
                        conditions.push('(pupil_feedback."userType" = :userTypeSchool AND NOT pupil_feedback."logOnReadingAsGroupTab")');
                        break;
                    case BookReadAt.GROUP:
                        conditions.push('pupil_feedback."logOnReadingAsGroupTab" = true');
                        break;
                }
            });

            if (conditions.length > 0) {
                pupilBookHistoryBaseQuery.andWhere(`(${conditions.join(' OR ')})`, {
                    userTypeHome: UserType.PARENT,
                    userTypeSchool: UserType.TEACHER
                });
            }
        }

        const result: PupilBookHistoryOutput[] = await pupilBookHistoryBaseQuery.getRawMany();

        return result;
    }

    public async getPupilBookHistoryForParent(
        pupilId: string,
        type: PupilBookHistoryFilter,
        limit = 10,
        offset = 0
    ): Promise<PupilBookHistoryPaginatedOutput> {
        const pupilBookHistoryBaseQuery = this.pupilBookHistoryBaseQuery(pupilId);

        switch (type) {
            case PupilBookHistoryFilter.FINISHED:
                pupilBookHistoryBaseQuery.andWhere('pupil_feedback."isBookFinished" = true');
                break;
            case PupilBookHistoryFilter.NOT_FINISHED:
                pupilBookHistoryBaseQuery.andWhere('pupil_feedback."isBookFinished" = false');
                break;
        }

        const currentAcademicYearSummaryRaw = await this.currentAcademicYearBookLogsBaseQuery(pupilId)
            .select(['COUNT(DISTINCT pupil_feedback."normalisedBookName") AS "distinctBooks"'])
            .getRawOne();

        const currentAcademicYearSummary = {
            distinctBooks: Number(currentAcademicYearSummaryRaw?.distinctBooks || 0)
        } as PupilBookHistorySummaryOutput;

        const totalResult = await pupilBookHistoryBaseQuery
            .clone()
            .select('COUNT(DISTINCT (pupil_feedback."normalisedBookName", pupil_feedback."readingType")) as total')
            .groupBy()
            .getRawOne();

        const total = parseInt(totalResult.total, 10);

        const results: PupilBookHistoryOutput[] = await pupilBookHistoryBaseQuery.offset(offset).limit(limit).getRawMany();

        const pagination = new Pagination<PupilBookHistoryOutput>({
            results,
            total,
            limit,
            offset
        });

        return Object.assign(new PupilBookHistoryPaginatedOutput(), pagination, {
            currentAcademicYearSummary
        });
    }

    public async getPupilBookHistory(
        pupilId: string,
        bookName: string,
        readingType: ReadingType,
        readAt: BookReadAt,
        isCurrentYearOnly: boolean
    ): Promise<GetPupilBookHistoryOutput> {
        const pupilBookHistoryQuery = this.pupilFeedbackRepository
            .createQueryBuilder('lpf')
            .innerJoin('lpf.pupils', 'lp', 'lp.id = :pupilId', { pupilId })
            .where('TRIM(lpf.bookName) ILIKE :bookName', { bookName: bookName.trim() })
            .andWhere('lpf.readingType = :readingType', { readingType })
            .andWhere('lpf.originalFeedbackId IS NULL');

        if (isCurrentYearOnly) {
            pupilBookHistoryQuery
                .leftJoin('lp.school', 'school')
                .leftJoin('school.curentPeriod', 'currentPeriod')
                .andWhere('lpf.periodIndex = currentPeriod.index');
        }

        switch (readAt) {
            case BookReadAt.HOME:
                pupilBookHistoryQuery.andWhere('lpf."userType" = :userType', { userType: UserType.PARENT });
                break;
            case BookReadAt.SCHOOL:
                pupilBookHistoryQuery.andWhere('lpf."userType" = :userType AND NOT lpf."logOnReadingAsGroupTab"', {
                    userType: UserType.TEACHER
                });
                break;
            case BookReadAt.GROUP:
                pupilBookHistoryQuery.andWhere('lpf."logOnReadingAsGroupTab" = true');
                break;
        }

        const [result, total] = await pupilBookHistoryQuery
            .select(['lpf.id', 'lpf.bookReadAt', 'lpf.bookName', 'lpf.logCreatedAt', 'lpf.userType'])
            .limit(3)
            .getManyAndCount();

        return { result, total };
    }

    public async isActiveInCurrentAcademicYear(pupilId: string): Promise<boolean> {
        const count = await this.pupilRepository
            .createQueryBuilder('pupil')
            .innerJoin('pupil.classes', 'pupil_class')
            .leftJoin('pupil_class.period', 'period')
            .leftJoin('pupil.school', 'school')
            .leftJoin('school.curentPeriod', 'currentPeriod')
            .where('pupil.id = :pupilId', { pupilId })
            .andWhere('pupil_class.status = :status and pupil_class.isRegistrationClass = true', { status: SchoolClassStatus.ACTIVE })
            .andWhere('period.index >= currentPeriod.index')
            .andWhere('school.inactive = false')
            .getCount();

        return count > 0;
    }

    public async getPupilRecentBookLogs({ pupilId, readingType, bookName }: PupilRecentBookLogsInput): Promise<PupilBookHistoryOutput[]> {
        let pupilBookHistoryBaseQuery = this.pupilFeedbackRepository
            .createQueryBuilder('pupil_feedback')
            .innerJoin('pupil_feedback.pupils', 'pupil')
            .select([
                'pupil_feedback."normalisedBookName" AS "bookName"',
                'pupil_feedback."readingType" AS "readingType"',
                'CASE WHEN bool_or(pupil_feedback."isBookFinished") = TRUE THEN TRUE ELSE pupil_feedback_last_item."isBookFinished" END AS "isBookFinished"',
                'pupil_feedback_last_item."pageNumber"'
            ])
            .leftJoin(
                `(${this.feedbackLastItemSubqueryQb(pupilId).getQuery()})`,
                'pupil_feedback_last_item',
                'pupil_feedback_last_item."normalisedBookName" = pupil_feedback."normalisedBookName"'
            )
            .andWhere('pupil_feedback.type = :type', { type: FeedbackType.READING })
            .andWhere('pupil_feedback.originalFeedbackId IS NULL')
            .andWhere('pupil.id = :pupilId', { pupilId });

        if (readingType) {
            pupilBookHistoryBaseQuery = pupilBookHistoryBaseQuery.andWhere('pupil_feedback."readingType" = :readingType', { readingType });
        }

        pupilBookHistoryBaseQuery = pupilBookHistoryBaseQuery
            .addGroupBy('pupil_feedback."normalisedBookName"')
            .addGroupBy('pupil_feedback."readingType"')
            .addGroupBy('pupil_feedback_last_item."pageNumber"')
            .addGroupBy('pupil_feedback_last_item."isBookFinished"')
            .addOrderBy('MAX(pupil_feedback."bookReadAt")', 'DESC')
            .addOrderBy('MAX(pupil_feedback."logCreatedAt")', 'DESC');

        if (bookName) {
            pupilBookHistoryBaseQuery.andWhere('pupil_feedback."normalisedBookName" ILIKE :bookName', { bookName: `%${bookName}%` });
        }

        return await pupilBookHistoryBaseQuery.limit(3).getRawMany();
    }

    public async getPupilBooks(pupilId: string, readingMode?: ReadingMode): Promise<PupilBookOutput[]> {
        try {
            const pupilBookHistoryBaseQuery = this.pupilFeedbackRepository
                .createQueryBuilder('pupil_feedback')
                .innerJoin('pupil_feedback.pupils', 'pupil')
                .select([
                    'pupil_feedback."normalisedBookName" AS "bookName"',
                    'pupil_feedback."readingType" AS "readingType"',
                    'CASE WHEN bool_or(pupil_feedback."isBookFinished") = TRUE THEN TRUE ELSE pupil_feedback_last_item."isBookFinished" END AS "isBookFinished"',
                    'pupil_feedback_last_item."pageNumber"'
                ])
                .leftJoin(
                    `(${this.feedbackLastItemSubqueryQb(pupilId).getQuery()})`,
                    'pupil_feedback_last_item',
                    'pupil_feedback_last_item."normalisedBookName" = pupil_feedback."normalisedBookName"'
                )
                .andWhere('pupil_feedback.type = :type', { type: FeedbackType.READING })
                .andWhere('pupil_feedback.originalFeedbackId IS NULL')
                .andWhere('pupil.id = :pupilId', { pupilId })
                .addGroupBy('pupil_feedback."normalisedBookName"')
                .addGroupBy('pupil_feedback."readingType"')
                .addGroupBy('pupil_feedback_last_item."pageNumber"')
                .addGroupBy('pupil_feedback_last_item."isBookFinished"')
                .addOrderBy('CASE WHEN bool_or(pupil_feedback."isBookFinished") = TRUE THEN 0 ELSE 1 END')
                .addOrderBy('MAX(pupil_feedback."bookReadAt")', 'DESC')
                .addOrderBy('MAX(pupil_feedback."logCreatedAt")', 'DESC');

            if (readingMode) {
                pupilBookHistoryBaseQuery.andWhere('pupil_feedback."readingMode" = :readingMode', { readingMode });
            }

            const result = await pupilBookHistoryBaseQuery.getRawMany();

            return result;
        } catch (error) {
            console.error('Error fetching pupil books:', error);
            throw new HttpException('Failed to fetch pupil books', ErrorStatusCodeEnum._535);
        }
    }

    public async getParentInfoOfPupil(pupilId: string, pupilParentStatus: PupilParentStatus): Promise<ParentInfoOfPupilOutput[]> {
        const parentsInfo: ParentInfoOfPupilOutput[] = [];
        const parents = await this.userRepository
            .createQueryBuilder('parent')
            .leftJoin('parent.pupils', 'pupilParent')
            .where('pupilParent.pupilId = :pupilId', { pupilId })
            .andWhere('pupilParent.status = :pupilParentStatus', { pupilParentStatus })
            .select(['parent.firstname', 'parent.lastname', 'parent.email', 'parent.phoneNumber'])
            .getMany();

        for (const parent of parents) {
            parentsInfo.push({
                fullname: `${parent?.firstname} ${parent?.lastname}`,
                email: parent?.email,
                phoneNumber: parent?.phoneNumber
            });
        }

        return parentsInfo;
    }

    public async getSchoolSponsorProgram(pupilId: string): Promise<StaticLwpProgram> {
        const schoolSponorProgram = await this.pupilRepository
            .createQueryBuilder('pupil')
            .innerJoin('pupil.school', 'school')
            .innerJoin('school.schoolTags', 'schoolTags')
            .innerJoin('schoolTags.tag', 'staticSchoolTag')
            .innerJoin('staticSchoolTag.staticPrograms', 'staticPrograms')
            .where('pupil.id = :pupilId', { pupilId })
            .andWhere('schoolTags.isProgramTag = :isProgramTag', { isProgramTag: true })
            .select([
                'staticPrograms.id as id',
                'staticPrograms.logoFileName as "logoFileName"',
                'staticPrograms.characterFileName as "characterFileName"'
            ])
            .getRawOne();

        const lwpProgram = {
            logoFileName: schoolSponorProgram?.logoFileName,
            characterFileName: schoolSponorProgram?.characterFileName
        } as StaticLwpProgram;

        return lwpProgram;
    }

    /**
     * Retrieves pupils associated with a specific tag.
     * Only includes pupils who are active in the school's current academic year class.
     */

    private pupilsBaseQueryForPupilTag(tagId: string): SelectQueryBuilder<LwpPupil> {
        return this.pupilRepository
            .createQueryBuilder('pupil')
            .innerJoin('pupil.tags', 'tag')
            .innerJoin('pupil.school', 'pupilSchool')
            .innerJoin('pupil.classes', 'classes', 'classes.period.index >= pupilSchool.curentPeriod.index')
            .select(['pupil.id', 'pupil.firstname', 'pupil.lastname'])
            .where('tag.id = :tagId', { tagId })
            .orderBy('pupil.firstname', 'ASC')
            .addOrderBy('pupil.lastname', 'ASC');
    }

    public async getPupilsCountByTagId(tagId: string): Promise<number> {
        return this.pupilsBaseQueryForPupilTag(tagId).getCount();
    }

    public async getPupilsByTagId(tagId: string): Promise<LwpPupil[]> {
        return this.pupilsBaseQueryForPupilTag(tagId).getMany();
    }

    public async hasTopicsInCurrentAcademicYear(pupilId: string): Promise<boolean> {
        const { count } = await this.pupilRepository
            .createQueryBuilder('pupil')
            .innerJoin('pupil.school', 'school')
            .innerJoin('pupil.allTopics', 'pupilTopics', 'pupilTopics.period.index >= school.curentPeriod.index')
            .where('pupil.id = :pupilId')
            .setParameter('pupilId', pupilId)
            .select(['COUNT(DISTINCT pupilTopics.id) as count'])
            .getRawOne<{ count: number }>();

        return count > 0;
    }

    public async mergePupils(sourcePupilId: string, destinationPupilId: string, userId: string): Promise<void> {
        const { removeSourcePupilFromClasses, removeSourcePupilFromSchool } = behaviour.mergePupils;

        await this.connection.transaction(async (manager) => {
            const result = await manager.query(
                `
                    -- look up source and destination pupils, using an inner join to ensure they are in the same school (would return 0 rows otherwise)
                    -- also ensure the source and destination pupils are not the same
                    -- the remainder of this query MUST join on this cte to guarantee we take no action if these requirements are not met
                    with sourceAndDestinationPupils as (
                        select
                            lp_src.id as "sourcePupilId",
                            lp_dest.id as "destinationPupilId",
                            lp_src."schoolId" as "schoolId"
                        from lwp_pupil lp_src
                        join lwp_pupil lp_dest
                            on lp_dest.id = $2
                            and lp_dest.id != $1
                            and lp_dest."schoolId" = lp_src."schoolId"
                        where lp_src.id = $1
                    ),
                    -- reassign source pupil feedback entries to destination pupil
                    -- unless a corresponding feedback entry already exists for the destination pupil
                    reassignFeedbackEntries as (
                        insert into lwp_pupil_feedback_history(
                            "lwpPupilId",
                            "lwpPupilFeedbackId"
                        )
                        select
                            sadp."destinationPupilId" as "lwpPupilId",
                            lpfh."lwpPupilFeedbackId" as "lwpPupilFeedbackId"
                        from lwp_pupil_feedback_history lpfh
                        join sourceAndDestinationPupils sadp
                            on lpfh."lwpPupilId" = sadp."sourcePupilId"
                        on conflict do nothing
                        returning "lwpPupilFeedbackId" as id
                    ),
                    -- delete remaining source pupil feedback entries
                    -- (these will be the redundant ones for which the destination pupil already had a corresponding entry)
                    deleteRedundantFeedbackEntries as (
                        delete from lwp_pupil_feedback_history lpfh
                        using sourceAndDestinationPupils sadp
                        where lpfh."lwpPupilId" = sadp."sourcePupilId"
                        returning lpfh."lwpPupilFeedbackId" as id
                    ),
                    -- look up source reading pupil topics
                    sourceReadingPupilTopics as (
                        select
                            lpt.id,
                            lpt."pupilId",
                            lpt."releaseDate",
                            lpt."periodIndex"
                        from lwp_pupil_topic lpt
                        join static_lwp_topic slt on slt.id = lpt."topicId"
                            and slt."isReading" = true
                        join sourceAndDestinationPupils sadp
                            on sadp."sourcePupilId" = lpt."pupilId"
                    ),
                    -- look up destination reading pupil topics
                    destinationReadingPupilTopics as (
                        select
                            lpt.id,
                            lpt."pupilId",
                            lpt."releaseDate",
                            lpt."periodIndex"
                        from lwp_pupil_topic lpt
                        join static_lwp_topic slt on slt.id = lpt."topicId"
                            and slt."isReading" = true
                        join sourceAndDestinationPupils sadp
                            on sadp."destinationPupilId" = lpt."pupilId"
                    ),
                    -- find source reading pupil topics whose reading week does not intersect with those of the destination pupil
                    nonOverlappingSourceReadingPupilTopics as (
                        select
                            sprt.*
                        from sourceReadingPupilTopics sprt
                        where not exists (
                            select 1
                            from destinationReadingPupilTopics dprt
                            where sprt."releaseDate" <= dprt."releaseDate" + interval '6 days'
                                and dprt."releaseDate" <= sprt."releaseDate" + interval '6 days'
                                and not dprt."periodIndex" is distinct from sprt."periodIndex"
                        )
                    ),
                    -- reassign those reading topics from the source to the destination pupil
                    -- and clear classTopicId
                    reassignReadingPupilTopics as (
                        update lwp_pupil_topic lpt
                        set "pupilId" = sadp."destinationPupilId",
                            "classTopicId" = null
                        from sourceAndDestinationPupils sadp
                        join nonOverlappingSourceReadingPupilTopics sprt
                            on true
                        where lpt.id = sprt.id
                        returning lpt.id
                    ),
                    -- look up source activity pupil topics and activities
                    sourceActivityPupilTopicsAndActivities as (
                        select
                            lpt."pupilId",
                            lpt.id as "pupilTopicId",
                            lpt."periodIndex",
                            lpa.id as "pupilActivityId",
                            lpa."activityId" as "staticActivityId"
                        from lwp_pupil_topic lpt
                        join static_lwp_topic slt on slt.id = lpt."topicId"
                            and not slt."isReading"
                        left join lwp_pupil_activity lpa
                            on lpa."topicId" = lpt.id
                            and lpa."pupilId" = lpt."pupilId"
                        join sourceAndDestinationPupils sadp
                            on sadp."sourcePupilId" = lpt."pupilId"
                    ),
                    -- look up destination activity pupil topics and activities
                    destinationActivityPupilTopicsAndActivities as (
                        select
                            lpt."pupilId",
                            lpt.id as "pupilTopicId",
                            lpt."periodIndex",
                            lpa.id as "pupilActivityId",
                            lpa."activityId" as "staticActivityId"
                        from lwp_pupil_topic lpt
                        join static_lwp_topic slt on slt.id = lpt."topicId"
                            and not slt."isReading"
                        left join lwp_pupil_activity lpa
                            on lpa."topicId" = lpt.id
                            and lpa."pupilId" = lpt."pupilId"
                        join sourceAndDestinationPupils sadp
                            on sadp."destinationPupilId" = lpt."pupilId"
                    ),
                    -- find source activity pupil topics whose static activity was not assigned to the destination pupil
                    sourceActivityPupilTopicsToReassign as (
                        select distinct(saptaa."pupilTopicId") as "pupilTopicId"
                        from sourceActivityPupilTopicsAndActivities saptaa
                        left join destinationActivityPupilTopicsAndActivities daptaa
                            on daptaa."staticActivityId" = saptaa."staticActivityId"
                            and not daptaa."periodIndex" is distinct from saptaa."periodIndex"
                        where daptaa."pupilId" is null
                    ),
                    -- reassign those pupil topics from the source to the destination pupil
                    -- and clear classTopicId
                    reassignActivityPupilTopics as (
                        update lwp_pupil_topic lpt
                        set "pupilId" = sadp."destinationPupilId",
                            "classTopicId" = null
                        from sourceActivityPupilTopicsToReassign sapttr
                        join sourceAndDestinationPupils sadp
                            on true
                        where lpt.id = sapttr."pupilTopicId"
                        returning lpt.id
                    ),
                    -- find source activity pupil activities whose static activity was not assigned to the destination pupil
                    sourceActivityPupilActivitiesToReassign as (
                        select distinct(saptaa."pupilActivityId") as "pupilActivityId"
                        from sourceActivityPupilTopicsAndActivities saptaa
                        left join destinationActivityPupilTopicsAndActivities daptaa
                            on daptaa."staticActivityId" = saptaa."staticActivityId"
                            and not daptaa."periodIndex" is distinct from saptaa."periodIndex"
                        where daptaa."pupilId" is null
                    ),
                    -- reassign those pupil activities from the source to the destination pupil
                    reassignActivityPupilActivities as (
                        update lwp_pupil_activity lpa
                        set "pupilId" = sadp."destinationPupilId"
                        from sourceActivityPupilActivitiesToReassign sapatr
                        join sourceAndDestinationPupils sadp
                            on true
                        where lpa.id = sapatr."pupilActivityId"
                        returning lpa.id
                    ),
                    -- detach parents from source pupil
                    detachParentsFromSourcePupil as (
                        update lwp_pupil_parent lpp
                        set "deletedById" = $3
                        from sourceAndDestinationPupils sadp
                        where lpp."pupilId" = sadp."sourcePupilId"
                        returning lpp.id
                    ),
                    -- detach source pupil from classes (if the removeSourcePupilFromClasses behaviour flag is set to true)
                    detachSourcePupilFromClasses as (
                        delete from lwp_class_pupil lcp
                        using sourceAndDestinationPupils sadp
                        where lcp."lwpPupilId" = sadp."sourcePupilId"
                            and $4
                        returning lcp."lwpSchoolClassId" as id
                    ),
                    -- remove source pupil from school (if the removeSourcePupilFromSchool behaviour flag is set to true)
                    removeSourcePupilFromSchool as (
                        update lwp_pupil lp
                        set "deletedSchoolId" = lp."schoolId",
                            "schoolId" = null
                        from sourceAndDestinationPupils sadp
                        where lp.id = sadp."sourcePupilId"
                            and $5
                    )
                    -- record details of affected entities for auditing purposes
                    insert into log_pupil_merge_operation(
                        "userId",
                        "schoolId",
                        "sourcePupilId",
                        "destinationPupilId",
                        "reassignedPupilFeedbackIds",
                        "redundantPupilFeedbackIds",
                        "reassignedReadingPupilTopicIds",
                        "reassignedActivityPupilTopicIds",
                        "reassignedActivityPupilActivityIds",
                        "detachedParentIds",
                        "detachedClassIds",
                        "sourcePupilRemovedFromSchool"
                    )
                    select
                        $3 as "userId",
                        sadp."schoolId" as "schoolId",
                        sadp."sourcePupilId" as "sourcePupilId",
                        sadp."destinationPupilId" as "destinationPupilId",
                        (select coalesce(array_agg(distinct id), '{}'::bigint[]) from reassignFeedbackEntries) as "reassignedPupilFeedbackIds",
                        (select coalesce(array_agg(distinct id), '{}'::bigint[]) from deleteRedundantFeedbackEntries) as "redundantPupilFeedbackIds",
                        (select coalesce(array_agg(distinct id), '{}'::bigint[]) from reassignReadingPupilTopics) as "reassignedReadingPupilTopicIds",
                        (select coalesce(array_agg(distinct id), '{}'::bigint[]) from reassignActivityPupilTopics) as "reassignedActivityPupilTopicIds",
                        (select coalesce(array_agg(distinct id), '{}'::bigint[]) from reassignActivityPupilActivities) as "reassignedActivityPupilActivityIds",
                        (select coalesce(array_agg(distinct id), '{}'::bigint[]) from detachParentsFromSourcePupil) as "detachedParentIds",
                        (select coalesce(array_agg(distinct id), '{}'::bigint[]) from detachSourcePupilFromClasses) as "detachedClassIds",
                        $5 as "sourcePupilRemovedFromSchool"
                    from sourceAndDestinationPupils sadp
                    returning *
                    ;
                `,
                [sourcePupilId, destinationPupilId, userId, removeSourcePupilFromClasses, removeSourcePupilFromSchool]
            );

            if (!result.length) {
                throw new InternalServerErrorException(
                    'Merge operation failed; either the source or destination pupil does not exist, or they are not in the same school'
                );
            }

            await manager.query(
                `
                    update lwp_pupil lp
                    set "deletedById" = $2
                    where lp.id = $1
                `,
                [sourcePupilId, userId]
            );

            const destinationPupilReadingTopics = await manager.query(
                `
                    select
                        lpt.id
                    from lwp_pupil_topic lpt
                    join static_lwp_topic slt
                        on slt.id = lpt."topicId"
                        and slt."isReading"
                    where lpt."pupilId" = $1
                `,
                [destinationPupilId]
            );

            await this.pupilFeedbackService.updatePupilTopicStarCountReadingBatch(
                destinationPupilReadingTopics.map(({ id }) => id),
                manager
            );
        });
    }

    public async isPupilInSchoolClassOrGroupAcrossClasses(pupilId: string): Promise<boolean> {
        const pupilClassOrGroupQb = (): SelectQueryBuilder<LwpSchoolClass> =>
            this.schoolClassRepository
                .createQueryBuilder('schoolClass')
                .leftJoin('schoolClass.pupils', 'pupil')
                .leftJoin('schoolClass.school', 'school')
                .where('pupil.id = :pupilId', { pupilId })
                .andWhere('"schoolClass"."periodIndex" >= "school"."curentPeriodIndex"')
                .orderBy('"schoolClass"."periodIndex"', 'DESC')
                .addOrderBy('"schoolClass"."logCreatedAt"', 'DESC');

        const pupilClassCount = await pupilClassOrGroupQb()
            .andWhere('schoolClass.isRegistrationClass = :isReg', { isReg: true })
            .getCount();
        const pupilGroupCount = await pupilClassOrGroupQb()
            .andWhere('schoolClass.isGroupAcrossClasses = :isGroup', { isGroup: true })
            .getCount();

        return pupilClassCount > 0 || pupilGroupCount > 0;
    }

    public async getPupilRegistrationClassOrGroupAcrossClasses(pupilId: string): Promise<LwpSchoolClass> {
        const pupilClassOrGroupQb = (): SelectQueryBuilder<LwpSchoolClass> =>
            this.schoolClassRepository
                .createQueryBuilder('schoolClass')
                .leftJoin('schoolClass.pupils', 'pupil')
                .leftJoin('schoolClass.school', 'school')
                .where('pupil.id = :pupilId', { pupilId })
                .andWhere('"schoolClass"."periodIndex" >= "school"."curentPeriodIndex"')
                .orderBy('"schoolClass"."periodIndex"', 'DESC')
                .addOrderBy('"schoolClass"."logCreatedAt"', 'DESC');

        const pupilClass = await pupilClassOrGroupQb().andWhere('schoolClass.isRegistrationClass = :isReg', { isReg: true }).getOne();

        if (pupilClass) return pupilClass;

        return await pupilClassOrGroupQb().andWhere('schoolClass.isGroupAcrossClasses = :isGroup', { isGroup: true }).getOne();
    }
}
