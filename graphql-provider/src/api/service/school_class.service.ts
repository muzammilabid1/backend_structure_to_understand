import { HttpException, Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { PupilParentStatus, SubjectProgrammeType, UserStatus } from 'lwp-shared';
import newrelic from 'newrelic/index';
import { ClassTopicService } from 'src/api/service/class_topic.service';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { UserType } from 'src/auth/types/UserType';
import { Brackets, Connection, EntityManager, In, Repository, SelectQueryBuilder } from 'typeorm';

import { AcademicYearInfo } from '../dtos/AcademicYearInfo';
import { ClassPupilsForClassPupilsPageOutput } from '../dtos/ClassPupilsForClassPupilsPageOutput';
import { SchoolClassForFeedbackFilterOutput } from '../dtos/SchoolClassForFeedbackFilterOutput';
import { LwpClassTopic } from '../entities/class_topic';
import { ImportedSchoolClass } from '../entities/imported_school_class';
import { LogLwpPupilClassChange } from '../entities/log_lwp_pupil_class_change';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilTrophy } from '../entities/pupil_trophy';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { StaticLwpPeriod } from '../entities/static_period';
import { StaticLwpTopic } from '../entities/static_topic';
import { StaticLwpTopicDomain } from '../entities/topic_domain';
import { LwpUser } from '../entities/user';
import { LwpViewPupilStatus } from '../entities/views/pupil_status';
import {
    ClassPupilForRegisterTableOutput,
    ClassPupilsForRegisterTableOutput,
    ClassTopicContextOutput,
    ClassTopicOutput,
    CreateGroupAcrossClassesInput,
    ErrorStatusCodeEnum,
    GroupOutput,
    GroupWithinSchoolClassInput,
    LinkClassInput,
    OperationStatus,
    PupilStatus,
    ReadingTopicExistOuput,
    ScheduleClassesGroupsOutput,
    SchoolAllowedClassesInfo,
    SchoolClassAndGroupsOutput,
    SchoolClassInput,
    SchoolClassStatistics,
    SchoolClassStatus,
    UpdateGroupWithinSchoolClassInput,
    UpdateSchoolClassInput
} from '../model';
import { PupilClassActionType } from '../types/PupilClassActionType';
import { HelperService } from './helper.service';
import { LwpPupilFeedbackService } from './lwp_pupil_feedback.service';
import { NotificationService } from './notification.service';
import { PupilParentService } from './pupil_parent.service';
import { QueryBaseService } from './query_base.service';
import { StaticLwpPeriodService } from './static_period.service';
import { TeacherService } from './teacher.service';
import { YearGroupService } from './year_group.service';

export enum SchoolClassOperationType {
    ADD = 'ADD',
    ACTIVATE = 'ACTIVATE',
    UPDATE = 'UPDATE'
}

// Schools carrying this tag have their pre-admission Ready Teddy classes converted into
// groups across classes at the academic year switch; schools without it are left alone
// (e.g. single-form entry, where the class simply becomes the new registration class).
export const CREATE_GROUP_FOR_RT_CLASSES_TAG = 'CREATE_GROUP_FOR_RT_CLASSES';

@Injectable()
export class SchoolClassService {
    constructor(
        @InjectRepository(LwpSchoolClass)
        private schoolClassRepository: Repository<LwpSchoolClass>,
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        @InjectRepository(LwpSchool)
        private schoolRepository: Repository<LwpSchool>,
        @InjectRepository(LwpClassTopic)
        private classTopicRepository: Repository<LwpClassTopic>,
        @InjectRepository(ImportedSchoolClass)
        private importedSchoolClassRepository: Repository<ImportedSchoolClass>,
        @InjectRepository(LwpPupil)
        private pupilRepository: Repository<LwpPupil>,
        @InjectRepository(LwpPupilTrophy)
        private pupilTrophyRepository: Repository<LwpPupilTrophy>,
        @InjectRepository(LwpViewPupilStatus)
        private pupilStatusRepository: Repository<LwpViewPupilStatus>,
        @InjectRepository(StaticLwpSubject)
        private lwpSubjectsRepository: Repository<StaticLwpSubject>,
        @InjectRepository(LogLwpPupilClassChange)
        private logLwpPupilClassChangeRepository: Repository<LogLwpPupilClassChange>,
        @InjectRepository(StaticLwpTopic)
        private topicRepository: Repository<StaticLwpTopic>,
        @InjectEntityManager()
        private entityManager,
        private teacherService: TeacherService,
        private helperService: HelperService,
        private queryBaseService: QueryBaseService,
        private notificationService: NotificationService,
        private yearGroupService: YearGroupService,
        private periodService: StaticLwpPeriodService,
        private pupilParentService: PupilParentService,
        private connection: Connection,
        private pupilFeedbackService: LwpPupilFeedbackService,
        private shallowUserService: ShallowUserService,
        private classTopicService: ClassTopicService
    ) {}

    public async getSchoolClasses(schoolId: string, onlyRegistrationClasses?: boolean): Promise<LwpSchoolClass[]> {
        const school = await this.schoolRepository.findOne({ where: { id: schoolId }, relations: ['curentPeriod'] });

        if (!school) throw new HttpException('School not found.', ErrorStatusCodeEnum._535);

        const schoolClassesBase = this.queryBaseService
            .schoolClassesBase(schoolId)
            .select('classes')
            .leftJoin('classes.importedSchoolClass', 'importedSchoolClass')
            .leftJoin('classes.yearGroup', 'yearGroup')
            .leftJoinAndSelect('classes.period', 'period')
            .andWhere(
                new Brackets((qb) => {
                    qb.where(`period.index >= ${school?.curentPeriod?.index}`).orWhere(`period.isCurrentPeriod = ${true}`);
                })
            )
            .orderBy('yearGroup.year', 'ASC')
            .addOrderBy('classes.isRegistrationClass', 'DESC')
            .addOrderBy('classes.name', 'ASC')
            .andWhere('period.index IS NOT NULL');

        if (onlyRegistrationClasses) {
            schoolClassesBase.andWhere('classes.isRegistrationClass = :isRegistrationClass', { isRegistrationClass: true });
        }

        const schoolClasses = await schoolClassesBase.getRawMany();

        let newSchoolClasses: LwpSchoolClass[] = schoolClasses
            .map((schoolClass) => Object.assign({}, ...this.helperService.changeObjKeys(schoolClass, 'classes_')))
            .filter((schoolClass) => schoolClass.id !== null);

        const newPeriod: StaticLwpPeriod[] = schoolClasses
            .map((schoolClass) => Object.assign({}, ...this.helperService.changeObjKeys(schoolClass, 'period_')))
            .filter((schoolClass) => schoolClass.id !== null);

        if (!school?.curentPeriod?.isCurrentPeriod) {
            newSchoolClasses = newSchoolClasses.map((newSchoolClass, index) => {
                newSchoolClass.name = `${newPeriod[index]?.shortName}: ${newSchoolClass?.name}`;

                return newSchoolClass;
            });
        }

        return newSchoolClasses;
    }

    public async getSchoolClassesForUnassignedPupils(schoolId: string, isPreRegistrationClass?: boolean): Promise<LwpSchoolClass[]> {
        const school = await this.schoolRepository.findOne({ where: { id: schoolId }, relations: ['curentPeriod'] });

        if (!school) throw new HttpException('School not found.', ErrorStatusCodeEnum._535);

        const schoolClassesBase = this.queryBaseService
            .schoolClassesBase(schoolId)
            .select([
                'classes.id as id',
                'classes.name as name',
                `json_build_object('shortName', period."shortName",'index',period."index") as period`
            ])
            .leftJoin('classes.yearGroup', 'yearGroup')
            .leftJoin('classes.period', 'period')
            .andWhere('classes.isRegistrationClass = :isRegistrationClass', { isRegistrationClass: true })
            .andWhere(`period.index ${isPreRegistrationClass ? '>' : '='} :periodIndex`, { periodIndex: school?.curentPeriod?.index })
            .orderBy('yearGroup.year', 'ASC')
            .addOrderBy('classes.name', 'ASC');

        let schoolClasses = await schoolClassesBase.getRawMany();

        if (!school?.curentPeriod?.isCurrentPeriod) {
            schoolClasses = schoolClasses.map((newSchoolClass) => {
                newSchoolClass.name = `${newSchoolClass?.period?.shortName}: ${newSchoolClass?.name}`;

                return newSchoolClass;
            });
        }

        return schoolClasses;
    }

    public async getSchoolClassesForSchoolOverview(schoolId: string): Promise<LwpSchoolClass[]> {
        return await this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoin('schoolClass.school', 'school')
            .where('school.id = :schoolId', { schoolId })
            .andWhere('"schoolClass"."periodIndex" >= "school"."curentPeriodIndex"')
            .andWhere('schoolClass.isRegistrationClass = true')
            .orderBy('"schoolClass"."yearGroup"', 'ASC')
            .addOrderBy('schoolClass.name', 'ASC')
            .getMany();
    }

    public async getGroupsAcrossClassesForSchoolOverview(schoolId: string): Promise<LwpSchoolClass[]> {
        return await this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoin('schoolClass.school', 'school')
            .where('school.id = :schoolId', { schoolId })
            .andWhere('"schoolClass"."periodIndex" >= "school"."curentPeriodIndex"')
            .andWhere('schoolClass.isGroupAcrossClasses = true')
            .orderBy('"schoolClass"."yearGroup"', 'ASC')
            .addOrderBy('schoolClass.name', 'ASC')
            .getMany();
    }

    public async getSchoolClassesForClassOverview(schoolId: string, getGroups: boolean): Promise<LwpSchoolClass[]> {
        return await this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .where('"schoolClass"."schoolId" = :schoolId', { schoolId })
            .andWhere('schoolClass.isRegistrationClass = :isRegistrationClass', { isRegistrationClass: !getGroups })
            .orderBy('"schoolClass"."periodIndex"', 'DESC')
            .addOrderBy('"schoolClass"."yearGroup"', 'ASC')
            .addOrderBy('schoolClass.name', 'ASC')
            .getMany();
    }

    public async getClassByClassTopic(classTopicId: string): Promise<LwpSchoolClass> {
        const topicClass = await this.classTopicRepository
            .createQueryBuilder('classTopic')
            .leftJoinAndSelect('classTopic.class', 'class')
            .where('classTopic.id = :id', { id: classTopicId })
            .select('class')
            .getRawOne();

        const newTopicClass = this.helperService.changeObjKeys(topicClass, 'class_');

        if (newTopicClass) return Object.assign({}, ...newTopicClass);

        return newTopicClass;
    }

    public async sendTrophyMailToSchoolLeader(): Promise<void> {
        const schoolsWithId = await this.schoolRepository
            .createQueryBuilder('school')
            .leftJoin('school.classes', 'schoolClass')
            .leftJoin('schoolClass.mainTeacher', 'mainTeacher')
            .leftJoin('schoolClass.trophies', 'pupilTrophy')
            .leftJoin('pupilTrophy.trophy', 'staticTrophy')
            .where('school.lastTrophyLeaderEmailSent IS NULL')
            .andWhere('school.inactive = false')
            .andWhere('schoolClass.isRegistrationClass = :bool', { bool: true })
            .select('school.id')
            .getMany();

        for (const schoolWithId of schoolsWithId) {
            let emailSent = false;

            const school = await this.schoolRepository
                .createQueryBuilder('school')
                .leftJoinAndSelect('school.classes', 'schoolClass')
                .leftJoinAndSelect('schoolClass.mainTeacher', 'mainTeacher')
                .leftJoinAndSelect('schoolClass.trophies', 'pupilTrophy')
                .leftJoinAndSelect('pupilTrophy.trophy', 'staticTrophy')
                .where('school.id = :schoolId', { schoolId: schoolWithId?.id })
                .getOne();

            if (
                school?.classes?.some((sc) =>
                    sc?.trophies?.some((pt) => pt?.trophy?.isActive && pt?.trophy?.isTeacherMail && !pt?.lastCertificateDownloaded)
                )
            ) {
                for (const schoolClass of school.classes) {
                    if (
                        schoolClass?.trophies?.some(
                            (pt) => pt?.trophy?.isActive && pt?.trophy?.isTeacherMail && !pt?.lastCertificateDownloaded
                        )
                    ) {
                        const trophies = schoolClass?.trophies?.filter(
                            (pt) => pt?.trophy?.isActive && pt?.trophy?.isTeacherMail && !pt?.lastCertificateDownloaded
                        );

                        for (const pupilTrophy of trophies) {
                            if (schoolClass?.mainTeacher?.userStatus === UserStatus.ACTIVE) {
                                await this.notificationService.sendTrophyMailToTeacher(
                                    schoolClass?.mainTeacher,
                                    'Congratulations',
                                    schoolClass?.name,
                                    schoolClass?.id,
                                    pupilTrophy?.trophy?.title
                                );

                                await this.pupilTrophyRepository.update({ id: pupilTrophy?.id }, { lastCertificateEmailSent: new Date() });
                                emailSent = true;
                            }
                        }
                    }
                }
            }

            if (emailSent) {
                await this.schoolRepository.update({ id: school?.id }, { lastTrophyLeaderEmailSent: new Date() });
            }
        }
    }

    public async updateNoLinkedParentStatusOfPupils(): Promise<void> {
        await this.updateDeactivatedParentPupilRecords();
    }

    public async notifyNewRelicWhenPupilInMultipleClasses(): Promise<void> {
        const results = await this.entityManager
            .createQueryBuilder()
            .select('pupils_in_multiple_classes."schoolId"', 'schoolId')
            .addSelect('COUNT(*)', 'pupilCount')
            .from((subQuery) => {
                return subQuery
                    .select('pupil.id', 'pupilId')
                    .addSelect('pupil.schoolId', 'schoolId')
                    .from('lwp_pupil', 'pupil')
                    .innerJoin('pupil.classes', 'schoolClass')
                    .innerJoin('pupil.school', 'school')
                    .innerJoin('school.curentPeriod', 'schoolPeriod')
                    .innerJoin('schoolClass.period', 'classPeriod')
                    .where('schoolClass.isRegistrationClass = :isReg', { isReg: true })
                    .andWhere('classPeriod.index = schoolPeriod.index')
                    .groupBy('pupil.id')
                    .addGroupBy('pupil.schoolId')
                    .having('COUNT(DISTINCT schoolClass.id) > :count', { count: 1 });
            }, 'pupils_in_multiple_classes')
            .groupBy('pupils_in_multiple_classes."schoolId"')
            .getRawMany();

        if (results?.length === 0) return;

        const totalPupils = results.reduce((acc, curr) => acc + parseInt(curr.pupilCount, 10), 0);
        const schoolsWithPupilCount = results.map((r) => ({ schoolId: r?.schoolId, pupilCount: r?.pupilCount }));

        newrelic.noticeError(
            new Error(
                `Data integrity issue: ${totalPupils} pupils enrolled in multiple registration classes across ${results?.length} school(s)`
            ),
            {
                caught: true,
                handled: false,
                schoolsWithPupilCount
            }
        );
    }

    public async updateDeactivatedParentPupilRecords(): Promise<void> {
        const limit = 1000;
        let fetchMore = false;

        while (!fetchMore) {
            const parents = await this.userRepository
                .createQueryBuilder('parent')
                .leftJoinAndSelect('parent.pupils', 'pupils')
                .where('parent.userStatus = :userStatus', { userStatus: UserStatus.DEACTIVATED })
                .andWhere('parent.type = :userType', { userType: UserType.PARENT })
                .andWhere('pupils.status = :status', { status: PupilParentStatus.ACTIVE })
                .take(limit)
                .getMany();

            if (parents?.length > 0) {
                for (const parent of parents) {
                    if (parent?.pupils?.length > 0) {
                        for (const pupilParent of parent.pupils) {
                            const { pupilId, parentId } = pupilParent;

                            await this.pupilParentService.updatePupilParentRelation({
                                pupilId: pupilId,
                                parentId: parentId,
                                status: PupilParentStatus.INVITED,
                                logUpdatedBy: null,
                                invitedBy: null,
                                importedStudentContactID: null
                            });
                        }
                    }
                }
            }

            if (parents?.length !== limit) {
                fetchMore = true;
            }
        }
    }

    public async sendTrophyMailToTeacher(): Promise<void> {
        await this.connection.transaction(async (manager) => {
            await manager.query(
                `SET LOCAL statement_timeout = ${process.env.ALLOW_SCHEDULING === 'true' || process.env.REPL === 'true' ? '0' : "'300s'"}`
            );

            await manager.getRepository(LwpPupilTrophy).query(`
                WITH generatable AS (
                    SELECT
                        (lu.*)::lwp_user AS "user",
                        lsc."schoolId" AS "schoolId",
                        lsc.id AS "classId",
                        slt.title AS "trophyName",
                        lsc."name" AS "className"
                    FROM
                        lwp_school_class lsc
                        JOIN lwp_pupil_trophy lpt ON lpt."schoolClassId" = lsc.id
                        JOIN static_lwp_trophy slt ON slt.id = lpt."trophyId"
                            AND slt."isActive"
                            AND slt."isTeacherMail"
                        JOIN lwp_class_teacher lct ON lct."lwpSchoolClassId" = lsc.id
                        JOIN lwp_user lu ON lu.id = lct."lwpUserId"
                            AND lu."userStatus" = 'ACTIVE'
                    WHERE
                        lsc."trophyEmailsPending"
                        AND lsc."isRegistrationClass"
                    group by lsc.id, lu.id, slt.id
                ),
                generatedNotifs AS (
                    INSERT INTO lwp_notification OVERRIDING USER VALUE
                        SELECT
                            (gen_notif_data ("user", 'email', 'sendTrophyMailToTeacher', FALSE, jsonb_build_object(
                                'CLASSID', "classId",
                                'TROPHYNAME', "trophyName",
                                'MESSAGE', 'Congratulations',
                                'CLASS', "className",
                                'CLASSNAME', "className"))
                            ).*
                        FROM
                            generatable
                            -- An inactive school's classes still have their pending flag cleared below, without an email.
                            JOIN lwp_school ls ON ls.id = generatable."schoolId"
                        WHERE
                            NOT ls.inactive
                        RETURNING
                            params -> 'CLASSID' AS "classId")
                UPDATE
                    lwp_school_class lsc
                SET
                    "trophyEmailsPending" = FALSE,
                    "lastTrophyTeacherEmailSent" = CASE WHEN EXISTS (
                        SELECT
                            1
                        FROM
                            generatedNotifs
                        WHERE
                            "classId"::bigint = lsc.id) THEN
                        CURRENT_TIMESTAMP
                    ELSE
                        "lastTrophyTeacherEmailSent"
                    END
                FROM
                    generatable
                WHERE
                    lsc.id = generatable."classId";
            `);
        });
    }

    public async schoolClass(classId: string): Promise<LwpSchoolClass> {
        const schoolClass = await this.schoolClassRepository.findOne({ where: { id: classId } });

        if (!schoolClass) throw new HttpException(`${classId} Class does not exist`, ErrorStatusCodeEnum._535);

        return schoolClass;
    }

    public async schoolClassHaveReadingTopics(classId: string): Promise<ReadingTopicExistOuput> {
        const schoolClass = await this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoinAndSelect('schoolClass.school', 'school')
            .leftJoinAndSelect('school.curentPeriod', 'curentPeriod')
            .where('schoolClass.id = :classId', { classId })
            .getOne();

        const readingClassTopicBase: SelectQueryBuilder<LwpClassTopic> = this.classTopicRepository
            .createQueryBuilder('classTopic')
            .leftJoinAndSelect('classTopic.topic', 'staticTopic')
            .leftJoinAndSelect('classTopic.class', 'schoolClass')
            .leftJoinAndSelect('schoolClass.period', 'period')
            .where('schoolClass.id = :classId', { classId })
            .andWhere('staticTopic.isReading = :isReading', { isReading: true })
            .andWhere('period.index = :periodIndex', { periodIndex: schoolClass?.school?.curentPeriod?.index });

        const readingClassTopicExist = await readingClassTopicBase.getCount();
        const releasedReadingClassTopicExist = await readingClassTopicBase
            .andWhere('classTopic.released = :bool', { bool: true })
            .getCount();

        return { readingTopicExist: readingClassTopicExist > 0, readingTopicReleased: releasedReadingClassTopicExist > 0 };
    }

    private mapSchoolClassesAndGroups(
        school: LwpSchool,
        schoolClasses: LwpSchoolClass[],
        isSchoolLeaderOrAdmin: boolean,
        teacherId: string
    ): SchoolClassAndGroupsOutput[] {
        const schoolClassAndGroupsOutput: SchoolClassAndGroupsOutput[] = [];

        for (const schoolClass of schoolClasses) {
            const isMyClass = schoolClass?.teachers?.some((teacher) => teacher?.id === teacherId);
            const schoolClassAndGroups: SchoolClassAndGroupsOutput = {
                id: schoolClass?.id,
                name: school?.curentPeriod?.isCurrentPeriod ? schoolClass?.name : `${schoolClass?.period?.index}: ${schoolClass?.name}`,
                isMyClass,
                isFullProgramme: schoolClass?.isFullProgramme,
                IsReadingLogsEnabled: schoolClass?.IsReadingLogsEnabled,
                status: schoolClass?.status,
                isGroupAcrossClasses: schoolClass?.isGroupAcrossClasses,
                groups: [],
                isPreAdmissionClass: schoolClass?.period?.index > school?.curentPeriod?.index,
                isReadyTeddyEnabled: schoolClass?.isReadyTeddyEnabled
            };

            if (schoolClass?.groups?.length) {
                for (const group of schoolClass.groups) {
                    const isMyGroup = group?.teachers?.some((teacher) => teacher?.id === teacherId);

                    if (!isSchoolLeaderOrAdmin && !isMyClass && !isMyGroup) continue;
                    const groupOutput: GroupOutput = {
                        id: group?.id,
                        name: school?.curentPeriod?.isCurrentPeriod ? group?.name : `${schoolClass?.period?.index}: ${group?.name}`,
                        isMyGroup,
                        hasTopics: !!group?.subjects?.length,
                        isReadingClass: !!group?.IsReadingLogsEnabled,
                        isPreAdmissionClass: schoolClass?.period?.index > school?.curentPeriod?.index,
                        isReadyTeddyEnabled: schoolClass?.isReadyTeddyEnabled
                    };

                    schoolClassAndGroups.groups.push(groupOutput);
                }
            }

            schoolClassAndGroupsOutput.push(schoolClassAndGroups);
        }

        return schoolClassAndGroupsOutput;
    }

    public async getGroupsAcrossClasses(
        schoolId: string,
        teacherId: string,
        isSchoolLeaderOrAdmin: boolean,
        myClasses: boolean
    ): Promise<SchoolClassAndGroupsOutput[]> {
        const school = await this.schoolRepository.findOne({ where: { id: schoolId }, relations: ['curentPeriod'] });

        if (!school) throw new HttpException('School not found.', ErrorStatusCodeEnum._535);

        let schoolClassesQuery = this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .innerJoin('schoolClass.school', 'school', 'school.id = :schoolId', { schoolId })
            .innerJoin('schoolClass.period', 'period')
            .leftJoin('schoolClass.teachers', 'teachers');

        if (myClasses) {
            schoolClassesQuery = schoolClassesQuery.andWhere(
                new Brackets((qb) => {
                    qb.where(`teachers.id = :teacherId`, { teacherId });
                })
            );
        }

        const schoolClasses = await schoolClassesQuery
            .andWhere(
                new Brackets((qb) => {
                    qb.where(`period.index = :periodIndex`, { periodIndex: school?.curentPeriod?.index }).orWhere(
                        `period.isCurrentPeriod = :isCurrentPeriod`,
                        { isCurrentPeriod: true }
                    );
                })
            )
            .andWhere('schoolClass.isGroupAcrossClasses = true')
            .orderBy('"schoolClass"."yearGroup"', 'ASC')
            .addOrderBy('schoolClass.name', 'ASC')
            .select([
                'schoolClass.id',
                'schoolClass.name',
                'schoolClass.isFullProgramme',
                'schoolClass.IsReadingLogsEnabled',
                'schoolClass.isGroupAcrossClasses',
                'schoolClass.status',
                'schoolClass.isReadyTeddyEnabled',
                'schoolClass.period',
                'period.index',
                'teachers.id'
            ])
            .getMany();

        return this.mapSchoolClassesAndGroups(school, schoolClasses, isSchoolLeaderOrAdmin, teacherId);
    }

    public async getSchoolClassesAndGroups(
        schoolId: string,
        teacherId: string,
        isSchoolLeaderOrAdmin: boolean,
        myClasses: boolean
    ): Promise<SchoolClassAndGroupsOutput[]> {
        const school = await this.schoolRepository.findOne({ where: { id: schoolId }, relations: ['curentPeriod'] });

        if (!school) throw new HttpException('School not found.', ErrorStatusCodeEnum._535);

        let schoolClassesQuery = this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .innerJoin('schoolClass.school', 'school', 'school.id = :schoolId', { schoolId })
            .innerJoin('schoolClass.period', 'period')
            .leftJoin('schoolClass.teachers', 'teachers')
            .leftJoin('schoolClass.yearGroup', 'yearGroup')
            .leftJoin('schoolClass.groups', 'group')
            .leftJoin('group.teachers', 'groupTeachers')
            .leftJoin('group.subjects', 'groupSubjects');

        if (myClasses) {
            schoolClassesQuery = schoolClassesQuery.andWhere(
                new Brackets((qb) => {
                    qb.where(`teachers.id = ${teacherId}`).orWhere(`groupTeachers.id = ${teacherId}`);
                })
            );
        }

        const schoolClasses = await schoolClassesQuery
            .andWhere(
                new Brackets((qb) => {
                    qb.where(`period.index = ${school?.curentPeriod?.index}`).orWhere(`period.isCurrentPeriod = ${true}`);
                })
            )
            .andWhere('schoolClass.isRegistrationClass = :isRegistrationClass', { isRegistrationClass: true })
            .andWhere('period.index IS NOT NULL')
            .orderBy('yearGroup.year', 'ASC')
            .addOrderBy('schoolClass.name', 'ASC')
            .addOrderBy('group.name', 'ASC')
            .select([
                'schoolClass.id',
                'schoolClass.name',
                'schoolClass.isFullProgramme',
                'schoolClass.IsReadingLogsEnabled',
                'schoolClass.status',
                'schoolClass.isReadyTeddyEnabled',
                'schoolClass.period',
                'period.index',
                'teachers.id',
                'group.id',
                'group.name',
                'group.IsReadingLogsEnabled',
                'groupTeachers.id',
                'groupSubjects.id'
            ])
            .getMany();

        return this.mapSchoolClassesAndGroups(school, schoolClasses, isSchoolLeaderOrAdmin, teacherId);
    }

    public async getPreAdmissionClasses(
        schoolId: string,
        teacherId: string,
        userType: UserType,
        isSchoolLeaderOrAdmin: boolean
    ): Promise<SchoolClassAndGroupsOutput[]> {
        const school = await this.schoolRepository.findOne({ where: { id: schoolId }, relations: ['curentPeriod'] });

        if (!school) throw new HttpException('School not found.', ErrorStatusCodeEnum._535);

        let preAdmissionSchoolClassesQuery = this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .innerJoin('schoolClass.school', 'school', 'school.id = :schoolId', { schoolId })
            .innerJoin('schoolClass.period', 'period')
            .leftJoin('schoolClass.teachers', 'teachers')
            .leftJoin('schoolClass.yearGroup', 'yearGroup')
            .leftJoin('schoolClass.groups', 'group')
            .leftJoin('group.teachers', 'groupTeachers')
            .leftJoin('group.subjects', 'groupSubjects');

        if (userType === UserType.TEACHER && !isSchoolLeaderOrAdmin) {
            preAdmissionSchoolClassesQuery = preAdmissionSchoolClassesQuery.andWhere(
                new Brackets((qb) => {
                    qb.where(`teachers.id = ${teacherId}`).orWhere(`groupTeachers.id = ${teacherId}`);
                })
            );
        }

        const schoolClasses = await preAdmissionSchoolClassesQuery
            .andWhere(`period.index > ${school?.curentPeriod?.index}`)
            .andWhere('schoolClass.isRegistrationClass = :isRegistrationClass', { isRegistrationClass: true })
            .andWhere('period.index IS NOT NULL')
            .orderBy('period.index', 'ASC')
            .addOrderBy('yearGroup.year', 'ASC')
            .addOrderBy('schoolClass.name', 'ASC')
            .addOrderBy('group.name', 'ASC')
            .select([
                'schoolClass.id',
                'schoolClass.name',
                'schoolClass.status',
                'schoolClass.isReadyTeddyEnabled',
                'schoolClass.period',
                'period.index',
                'teachers.id',
                'group.id',
                'group.name',
                'groupTeachers.id',
                'groupSubjects.id'
            ])
            .getMany();

        return this.mapSchoolClassesAndGroups(school, schoolClasses, isSchoolLeaderOrAdmin, teacherId);
    }

    public async getScheduleClassesGroups(
        schoolId: string,
        topicId: string,
        teacherId: string,
        isSchoolLeaderOrAdmin: boolean,
        subjectIds: string[]
    ): Promise<ScheduleClassesGroupsOutput[]> {
        const school = await this.schoolRepository.findOne({ where: { id: schoolId }, relations: ['curentPeriod'] });

        const topic: { id: string; isReadyTeddy: boolean; isMoneySkills: boolean } = await this.topicRepository
            .createQueryBuilder('topic')
            .leftJoin('topic.domainsAndYearGroups', 'domainsAndYearGroups')
            .leftJoin('domainsAndYearGroups.domain', 'domain')
            .leftJoin('domain.subject', 'subject')
            .where('topic.id = :topicId', { topicId })
            .select([
                'topic.id AS id',
                `COALESCE(BOOL_OR(subject.programmeType = '${SubjectProgrammeType.READY_TEDDY}'), false) AS "isReadyTeddy"`,
                `COALESCE(BOOL_OR(subject.programmeType = '${SubjectProgrammeType.MONEY_SKILLS}'), false) AS "isMoneySkills"`
            ])
            .groupBy('topic.id')
            .getRawOne();

        if (!school) throw new HttpException('School not found.', ErrorStatusCodeEnum._535);

        let schoolClassesQuery = this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .innerJoinAndSelect('schoolClass.school', 'school', 'school.id = :schoolId', { schoolId })
            .innerJoinAndSelect('schoolClass.period', 'period')
            .innerJoinAndSelect('schoolClass.yearGroup', 'yearGroup')
            .leftJoinAndSelect('schoolClass.teachers', 'teachers')
            .leftJoinAndSelect('schoolClass.groups', 'group')
            .leftJoinAndSelect('group.subjects', 'subjects')
            .leftJoin('group.teachers', 'groupTeachers')
            .select([
                'schoolClass.id',
                'school.id',
                'schoolClass.name',
                'period.index',
                'group',
                'subjects.id',
                'groupTeachers.id',
                'teachers.id',
                'yearGroup.year'
            ]);

        if (!isSchoolLeaderOrAdmin) {
            schoolClassesQuery = schoolClassesQuery.andWhere(
                new Brackets((qb) => {
                    qb.where(`teachers.id = ${teacherId}`).orWhere(`groupTeachers.id = ${teacherId}`);
                })
            );
        }

        if (topic.isReadyTeddy) {
            schoolClassesQuery = schoolClassesQuery.andWhere('schoolClass.isReadyTeddyEnabled = true');
        } else if (topic.isMoneySkills) {
            schoolClassesQuery = schoolClassesQuery
                .andWhere('(schoolClass.isFullProgramme = true OR schoolClass.IsReadingLogsEnabled = true)')
                .andWhere('school.isMoneySkillsAvailable = true');
        } else {
            schoolClassesQuery = schoolClassesQuery.andWhere('schoolClass.isFullProgramme = true');
        }

        const schoolClasses = await schoolClassesQuery
            .andWhere(
                new Brackets((qb) => {
                    qb.where(`period.index >= ${school?.curentPeriod?.index}`).orWhere(`period.isCurrentPeriod = ${true}`);
                })
            )
            .andWhere('schoolClass.parentClassId IS NULL')
            .andWhere('period.index IS NOT NULL')
            .orderBy('yearGroup.year', 'ASC')
            .addOrderBy('schoolClass.name', 'ASC')
            .addOrderBy('group.name', 'ASC')
            .getMany();

        const schoolClassAndGroupsOutput: ScheduleClassesGroupsOutput[] = [];

        for (const schoolClass of schoolClasses) {
            const isMyClass = schoolClass?.teachers?.some((teacher) => teacher?.id === teacherId);

            const schoolClassAndGroups: ScheduleClassesGroupsOutput = {
                id: schoolClass?.id,
                name: school?.curentPeriod?.isCurrentPeriod ? schoolClass?.name : `${schoolClass?.period?.index}: ${schoolClass?.name}`,
                isMyClass: isMyClass,
                isMyGroup: null,
                year: schoolClass?.yearGroup.year
            };

            schoolClassAndGroupsOutput.push(schoolClassAndGroups);

            schoolClass.groups = schoolClass.groups.filter((group) =>
                subjectIds.every((subjectId) => group.subjects.some((sub) => sub.id === subjectId))
            );

            for (const group of schoolClass.groups) {
                const isMyGroup = group?.teachers?.some((teacher) => teacher?.id === teacherId);

                if (!isSchoolLeaderOrAdmin && !isMyClass && !isMyGroup) continue;

                const groupOutput: GroupOutput = {
                    id: group?.id,
                    name: school?.curentPeriod?.isCurrentPeriod ? group?.name : `${schoolClass?.period?.index}: ${group?.name}`,
                    isMyGroup,
                    schoolClass: schoolClass?.name
                };

                schoolClassAndGroupsOutput.push({ ...groupOutput, isMyClass: null, year: schoolClass?.yearGroup.year });
            }
        }

        return schoolClassAndGroupsOutput;
    }

    public async getPreviouslySetTopicDate(topicId: string, classId: string): Promise<Date | null> {
        const classTopic = await this.classTopicRepository.findOne({
            where: { class: { id: classId }, topic: { id: topicId } },
            order: { releaseDate: 'DESC' },
            select: ['releaseDate']
        });

        return classTopic ? new Date(classTopic.releaseDate) : null;
    }

    public async isValidClassId(classId: string): Promise<boolean> {
        return !!(await this.schoolClassRepository.count({ where: { id: classId } }));
    }

    public async checkSchoolClassLicenseLimit(
        school: LwpSchool,
        operationType: SchoolClassOperationType,
        isFullProgramme: boolean,
        manager?: EntityManager
    ): Promise<void> {
        const allowedClasses = await this.remainingAllowedSchoolClassesCount(
            school.id,
            school.numOfTotalClassesAllowed,
            school.numOfFullProgrammeClassesAllowed,
            manager
        );

        if (
            (operationType === SchoolClassOperationType.ADD || operationType === SchoolClassOperationType.ACTIVATE) &&
            allowedClasses.total === 0
        )
            throw new HttpException('School class license limit exceeded.', ErrorStatusCodeEnum._535);

        if (isFullProgramme) {
            if (allowedClasses?.fullProgramme === 0)
                throw new HttpException('Full programme school class license limit exceeded.', ErrorStatusCodeEnum._535);
        }
    }

    public async hideSchoolClass(classId: string): Promise<boolean> {
        await this.schoolClassRepository.update({ id: classId }, { status: SchoolClassStatus.HIDDEN });

        return true;
    }

    public async createSchoolClass(input: SchoolClassInput, contextUserId: string): Promise<LwpSchoolClass> {
        const {
            name,
            yearGroup,
            mainTeacher,
            schoolId,
            teachers,
            lastYearsInheritedClassId,
            isReadingLogsEnabled,
            readingTarget,
            readingStartDay,
            readingLaunchDate,
            isRegistrationClass,
            isFullProgramme,
            isReadyTeddy,
            periodId,
            status
        } = input;

        const schoolClass = new LwpSchoolClass();
        const classTeachers: LwpUser[] = [];
        const school = await this.schoolRepository.findOne({ where: { id: schoolId } });

        if (isReadyTeddy && !school.isReadyTeddyAvailable)
            throw new HttpException('Ready Teddy is not available for this school.', ErrorStatusCodeEnum._535);

        const isPureReadyTeddy = isReadyTeddy && !isReadingLogsEnabled && !isFullProgramme;

        if (!isPureReadyTeddy) await this.checkSchoolClassLicenseLimit(school, SchoolClassOperationType.ADD, isFullProgramme);

        const year = await this.yearGroupService.getYearGroup(yearGroup);
        const shallowUser = this.shallowUserService.newShallowUser(contextUserId);

        schoolClass.name = name;
        schoolClass.yearGroup = year;
        schoolClass.logCreatedBy = shallowUser;
        schoolClass.logUpdatedBy = shallowUser;
        schoolClass.isRegistrationClass = isRegistrationClass;
        if (status) schoolClass.status = status;
        if (isFullProgramme || isFullProgramme === false) schoolClass.isFullProgramme = isFullProgramme;

        if (isReadyTeddy || isReadyTeddy === false) schoolClass.isReadyTeddyEnabled = isReadyTeddy;

        if (isReadingLogsEnabled && isRegistrationClass) {
            schoolClass.IsReadingLogsEnabled = isReadingLogsEnabled;
            if (readingTarget && readingTarget !== 0) {
                schoolClass.readingTarget = readingTarget;
            }

            if (readingStartDay != null) {
                schoolClass.readingStartDay = readingStartDay;
            }

            if (readingLaunchDate != null) {
                schoolClass.readingLaunchDate = readingLaunchDate;
            }
        }

        // school validation
        schoolClass.school = school;
        if (!schoolClass.school) throw new HttpException(`${schoolId} school not found.`, ErrorStatusCodeEnum._535);

        // main teacher validation
        schoolClass.mainTeacher = await this.userRepository.findOne({ where: { id: mainTeacher } });
        if (!schoolClass.mainTeacher) throw new HttpException(`${mainTeacher} main teacher not found.`, ErrorStatusCodeEnum._535);

        // adding main teacher in class teachers
        classTeachers.push(schoolClass.mainTeacher);

        // teachers are optional and by default the main teacher will be class teacher
        if (teachers) {
            for (const id of teachers) {
                const teacher = await this.userRepository.findOne({ where: { id, school: { id: schoolId }, type: UserType.TEACHER } });

                if (!teacher) throw new HttpException(`${id} teacher not found.`, ErrorStatusCodeEnum._535);
                if (!classTeachers.filter((t) => t.id === teacher.id).length) classTeachers.push(teacher);
            }
        }

        schoolClass.teachers = classTeachers;

        schoolClass.period = await (periodId ? this.periodService.getStaticPeriod(periodId) : this.periodService.getCurrentPeriod());

        if (lastYearsInheritedClassId) {
            const lastYearsInheritedSchoolClass = await this.schoolClassRepository.findOne({
                where: { id: lastYearsInheritedClassId },
                relations: ['pupils']
            });

            for (const pupil of lastYearsInheritedSchoolClass.pupils) {
                if (!schoolClass.pupils) {
                    schoolClass.pupils = [];
                }

                schoolClass.pupils.push(pupil);
            }
        }

        return await this.schoolClassRepository.save(schoolClass);
    }

    public async createGroupAcrossClasses(input: CreateGroupAcrossClassesInput, contextUserId: string): Promise<void> {
        const shallowUser = this.shallowUserService.newShallowUser(contextUserId);
        const mainTeacher = await this.userRepository.findOne({ where: { id: input.mainTeacher }, select: ['id'] });
        const otherTeachers = input.teachers ? await this.userRepository.find({ where: { id: In(input.teachers) }, select: ['id'] }) : [];
        const classTeachers = [mainTeacher, ...otherTeachers];
        const school = await this.schoolRepository
            .createQueryBuilder('school')
            .leftJoin('school.curentPeriod', 'period')
            .where('school.id = :schoolId', { schoolId: input.schoolId })
            .select(['school.id', 'period.index'])
            .getOne();
        const schoolClass = new LwpSchoolClass();

        schoolClass.name = input.name;
        schoolClass.yearGroup = await this.yearGroupService.getYearGroup(input.yearGroup);
        schoolClass.isGroupAcrossClasses = true;
        schoolClass.school = school;
        schoolClass.mainTeacher = mainTeacher;
        schoolClass.teachers = classTeachers;
        schoolClass.period = school?.curentPeriod;
        schoolClass.pupils = input.pupilIds ? await this.pupilRepository.find({ where: { id: In(input.pupilIds) }, select: ['id'] }) : [];
        schoolClass.isStatsNeedUpdate = true;
        schoolClass.logCreatedBy = shallowUser;
        schoolClass.logUpdatedBy = shallowUser;

        const savedSchoolClass = await this.schoolClassRepository.save(schoolClass);

        await this.helperService.updateGroupAcrossClassesLicenseDetails([savedSchoolClass.id]);

        if (savedSchoolClass?.pupils?.length) {
            const addedLogs = [];

            for (const pupil of savedSchoolClass.pupils) {
                const log = new LogLwpPupilClassChange();

                log.pupilId = pupil.id;
                log.classId = savedSchoolClass.id;
                log.action = PupilClassActionType.ADDED;
                log.logCreatedById = contextUserId;
                log.status = savedSchoolClass.status;
                addedLogs.push(log);
            }

            await this.logLwpPupilClassChangeRepository.save(addedLogs);
        }
    }

    /**
     * Converts a school's pre-admission Ready Teddy classes into groups across classes in place, so
     * that the cohort and its teachers carry over into the new academic year.
     *
     * Only schools tagged {@link CREATE_GROUP_FOR_RT_CLASSES_TAG} are converted; for any other
     * school this is a no-op (e.g. single-form entry, where the pre-admission class simply
     * becomes the new registration class).
     *
     * Must run *before* the school's period is advanced, while the classes still satisfy
     * `period.index > school.curentPeriod.index`.
     */
    public async convertPreAdmissionClassesToGroups(
        schoolId: string,
        newPeriodIndex: number,
        contextUserId: string,
        manager?: EntityManager,
        dryRun = false
    ): Promise<LwpSchoolClass[]> {
        const schoolClassRepository: Repository<LwpSchoolClass> = manager?.getRepository(LwpSchoolClass) ?? this.schoolClassRepository;

        const preAdmissionClasses = await schoolClassRepository
            .createQueryBuilder('schoolClass')
            .innerJoin('schoolClass.school', 'school', 'school.id = :schoolId', { schoolId })
            .innerJoin('school.curentPeriod', 'currentPeriod')
            .innerJoin('schoolClass.period', 'period')
            .where('period.index > currentPeriod.index')
            .andWhere('period.index = :newPeriodIndex', { newPeriodIndex }) // the cohort becoming current
            .andWhere(
                'schoolClass.isReadyTeddyEnabled = :isReadyTeddyEnabled and schoolClass.IsReadingLogsEnabled = :IsReadingLogsEnabled and schoolClass.isFullProgramme = :isFullProgramme',
                { isReadyTeddyEnabled: true, IsReadingLogsEnabled: false, isFullProgramme: false }
            )
            .andWhere('schoolClass.isRegistrationClass = :isRegistrationClass', { isRegistrationClass: true })
            .andWhere('schoolClass.status = :status', { status: SchoolClassStatus.ACTIVE })
            .andWhere((qb) => {
                const schoolTagSubQuery = qb
                    .subQuery()
                    .select('1')
                    .from('lwp_school_static_tags', 'lsst')
                    .innerJoin('static_lwp_school_tag', 'tag', 'tag.id = lsst."tagId"')
                    .where('lsst."schoolId" = school.id')
                    .andWhere('tag.name = :createGroupForRtClassesTag')
                    .getQuery();

                return `EXISTS ${schoolTagSubQuery}`;
            })
            .setParameter('createGroupForRtClassesTag', CREATE_GROUP_FOR_RT_CLASSES_TAG)
            .select(['schoolClass.id', 'schoolClass.name', 'schoolClass.isGroupAcrossClasses', 'schoolClass.isRegistrationClass'])
            .getMany();

        if (!preAdmissionClasses.length || dryRun) return preAdmissionClasses;

        const shallowUser = this.shallowUserService.newShallowUser(contextUserId);

        for (const schoolClass of preAdmissionClasses) {
            schoolClass.isGroupAcrossClasses = true;
            schoolClass.isRegistrationClass = false;
            // Marks the group so the licence recompute keeps its Ready Teddy licence rather than
            // deriving it from the pupils' (not yet assigned) registration classes. Scoped to the
            // period being converted for, so the exemption lapses at the next rollover.
            schoolClass.convertedFromPreAdmissionPeriodIndex = newPeriodIndex;
            schoolClass.logUpdatedBy = shallowUser;
        }

        return await schoolClassRepository.save(preAdmissionClasses);
    }

    public async createGroupWithinSchoolClass(input: GroupWithinSchoolClassInput, contextUserId: string): Promise<LwpSchoolClass> {
        const {
            classId,
            inviteImportedTeachers,
            mainTeacher,
            name,
            pupilIds,
            skipGroupPupils,
            subjectIds,
            isReadingLogEnabled,
            teacherIds
        } = input;

        const parentSchoolClass = await this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoinAndSelect('schoolClass.school', 'school')
            .leftJoinAndSelect('schoolClass.period', 'period')
            .leftJoinAndSelect('schoolClass.yearGroup', 'yearGroup')
            .where('schoolClass.id = :classId', { classId })
            .getOne();

        if (!parentSchoolClass) throw new HttpException(`Invalid class id.`, ErrorStatusCodeEnum._535);

        const schoolClass = new LwpSchoolClass();
        let classTeachers: LwpUser[] = [];

        const shallowUser = this.shallowUserService.newShallowUser(contextUserId);

        if (subjectIds.length) {
            schoolClass.subjects = await this.lwpSubjectsRepository.find({ where: { id: In(subjectIds) }, select: ['id'] });
        }

        schoolClass.name = name;
        schoolClass.yearGroup = parentSchoolClass?.yearGroup;
        schoolClass.logCreatedBy = shallowUser;
        schoolClass.logUpdatedBy = shallowUser;
        schoolClass.skipGroupPupils = skipGroupPupils;
        schoolClass.isStatsNeedUpdate = true;

        schoolClass.parentClass = parentSchoolClass;
        schoolClass.isRegistrationClass = false;

        schoolClass.school = parentSchoolClass?.school;
        schoolClass.IsReadingLogsEnabled = isReadingLogEnabled;

        // main teacher validation
        schoolClass.mainTeacher = await this.userRepository.findOne({ where: { id: mainTeacher } });
        if (!schoolClass.mainTeacher) throw new HttpException(`${mainTeacher} main teacher not found.`, ErrorStatusCodeEnum._535);

        // teachers are optional and by default the main teacher will be class teacher
        if (teacherIds?.length > 0) {
            classTeachers = await this.userRepository.find({
                where: { id: In(teacherIds), school: { id: parentSchoolClass?.school?.id }, type: UserType.TEACHER }
            });
        }

        if (pupilIds?.length > 0) {
            schoolClass.pupils = await this.pupilRepository.find({ where: { id: In(pupilIds) }, select: ['id'] });
        }

        // adding main teacher in class teachers
        classTeachers.push(schoolClass.mainTeacher);

        if (inviteImportedTeachers) {
            const importedTeachers = classTeachers.filter((teacher) => teacher?.userStatus === UserStatus.IMPORTED);

            if (importedTeachers?.length > 0)
                await this.teacherService.inviteImportedTeachers(
                    importedTeachers.map((teacher) => teacher?.id),
                    parentSchoolClass?.school?.id,
                    contextUserId
                );
        }

        schoolClass.period = parentSchoolClass?.period;
        schoolClass.teachers = classTeachers;

        const createdGroup = await this.schoolClassRepository.save(schoolClass);

        if (createdGroup?.pupils?.length) {
            const addedLogs = [];

            for (const pupil of createdGroup.pupils) {
                const log = new LogLwpPupilClassChange();

                log.pupilId = pupil.id;
                log.classId = createdGroup.id;
                log.action = PupilClassActionType.ADDED;
                log.logCreatedById = contextUserId;
                log.status = createdGroup.status;
                addedLogs.push(log);
            }

            await this.logLwpPupilClassChangeRepository.save(addedLogs);
        }

        return createdGroup;
    }

    public async updateGroupWithinSchoolClass(input: UpdateGroupWithinSchoolClassInput): Promise<LwpSchoolClass> {
        const { name, groupId, mainTeacher, teacherIds } = input;
        const schoolClass = await this.schoolClassRepository.findOne({ where: { id: groupId }, relations: ['school'] });

        if (!schoolClass) throw new HttpException(`Group not found.`, ErrorStatusCodeEnum._535);

        if (name) schoolClass.name = name;
        schoolClass.mainTeacher = await this.userRepository.findOne({ where: { id: mainTeacher } });
        if (!schoolClass.mainTeacher) throw new HttpException(`${mainTeacher} main teacher not found.`, ErrorStatusCodeEnum._535);

        if (!schoolClass?.teachers) {
            schoolClass.teachers = [];
        }

        // teachers are optional and by default the main teacher will be class teacher
        const classTeachers = await this.userRepository.find({
            where: { id: In(teacherIds), school: { id: schoolClass?.school?.id }, type: UserType.TEACHER }
        });

        schoolClass.teachers = [schoolClass?.mainTeacher, ...classTeachers];

        return await this.schoolClassRepository.save(schoolClass);
    }

    public async updateSchoolClass(input: UpdateSchoolClassInput, contextUserId: string): Promise<LwpSchoolClass> {
        return await this.connection.transaction(async (manager) => {
            const {
                id,
                name,
                yearGroup,
                mainTeacher,
                teachers,
                isReadingLogsEnabled,
                lastYearsInheritedClassId,
                readingStartDay,
                readingTarget,
                isRegistrationClass,
                isLocked,
                readingLaunchDate,
                isFullProgramme,
                status,
                isReadyTeddy
            } = input;

            const schoolClassRepository = manager.getRepository(LwpSchoolClass);
            const classTopicRepository = manager.getRepository(LwpClassTopic);
            const userRepository = manager.getRepository(LwpUser);

            const schoolClass = await schoolClassRepository.findOne({
                where: { id },
                relations: ['school', 'pupils', 'importedSchoolClass', 'period']
            });

            if (!schoolClass) throw new HttpException(`School class not found.`, ErrorStatusCodeEnum._535);

            const updateSchoolGroupAcrossClassesLicenses =
                schoolClass.isRegistrationClass &&
                ((isFullProgramme != null && schoolClass.isFullProgramme !== isFullProgramme) ||
                    (isReadyTeddy != null && schoolClass.isReadyTeddyEnabled !== isReadyTeddy) ||
                    (isReadingLogsEnabled != null && schoolClass.IsReadingLogsEnabled !== isReadingLogsEnabled));
            const isActivatingSchoolClass = schoolClass?.status !== SchoolClassStatus.ACTIVE && status === SchoolClassStatus.ACTIVE;

            const effectiveIsReadyTeddy = isReadyTeddy ?? schoolClass.isReadyTeddyEnabled;
            const effectiveIsReadingLogs = isReadingLogsEnabled ?? schoolClass.IsReadingLogsEnabled;
            const effectiveIsFullProgramme = isFullProgramme ?? schoolClass.isFullProgramme;
            const isPureReadyTeddy = effectiveIsReadyTeddy && !effectiveIsReadingLogs && !effectiveIsFullProgramme;

            if (((!schoolClass?.isFullProgramme && isFullProgramme) || isActivatingSchoolClass) && !isPureReadyTeddy) {
                if (effectiveIsReadyTeddy && !schoolClass.school.isReadyTeddyAvailable)
                    throw new HttpException('Ready Teddy is not available for this school.', ErrorStatusCodeEnum._535);

                await this.checkSchoolClassLicenseLimit(
                    schoolClass?.school,
                    isActivatingSchoolClass ? SchoolClassOperationType.ACTIVATE : SchoolClassOperationType.UPDATE,
                    schoolClass?.isFullProgramme && isFullProgramme ? false : isFullProgramme, //If the class is already a Full Programme class, do not count it towards the license limit check.
                    manager
                );
            }

            const oldReadingLogStatus = schoolClass?.IsReadingLogsEnabled;

            if (name) schoolClass.name = name;
            if (isReadingLogsEnabled || isReadingLogsEnabled === false)
                schoolClass.IsReadingLogsEnabled = isRegistrationClass === false ? false : isReadingLogsEnabled;
            if (isRegistrationClass || isRegistrationClass === false) schoolClass.isRegistrationClass = isRegistrationClass;
            if (isFullProgramme || isFullProgramme === false) schoolClass.isFullProgramme = isFullProgramme;
            if (isReadyTeddy || isReadyTeddy === false) schoolClass.isReadyTeddyEnabled = isReadyTeddy;
            if (status) schoolClass.status = status;
            if (isLocked || isLocked === false) schoolClass.isLocked = isLocked;
            if (isReadingLogsEnabled && readingTarget !== undefined && readingTarget !== schoolClass.readingTarget) {
                schoolClass.readingTarget = readingTarget;

                await this.classTopicService.updateReadingTargetForFutureClassTopics(manager, schoolClass.id, readingTarget);
            }

            if (isReadingLogsEnabled && readingLaunchDate?.valueOf() !== schoolClass.readingLaunchDate?.valueOf()) {
                const readingStaticTopic = await manager.getRepository(StaticLwpTopic).findOne({ where: { isReading: true } });

                if ((await classTopicRepository.count({ where: { class: schoolClass, released: true, topic: readingStaticTopic } })) > 0) {
                    throw new HttpException(
                        "You can't change the reading launch date once reading topics have been released.",
                        ErrorStatusCodeEnum._535
                    );
                }

                await classTopicRepository.delete({ class: schoolClass, released: false, topic: readingStaticTopic });

                schoolClass.readingLaunchDate = isReadingLogsEnabled
                    ? await this.helperService.getTopicReleaseDate(readingLaunchDate)
                    : schoolClass?.readingLaunchDate;

                // This is an update. Definitionally, every time the start day changes, the launch date must also change.
                if (readingStartDay != null)
                    schoolClass.readingStartDay = isReadingLogsEnabled ? readingStartDay : schoolClass?.readingStartDay;
            }

            if (typeof yearGroup === 'string') {
                const year = await this.yearGroupService.getYearGroup(yearGroup);

                if (!year) throw new HttpException('year does not exist', ErrorStatusCodeEnum._535);
                schoolClass.yearGroup = year;
            }

            // update main teacher validation
            if (mainTeacher) {
                schoolClass.mainTeacher = await userRepository.findOne({ where: { id: mainTeacher } });
                if (!schoolClass.mainTeacher) throw new HttpException(`${mainTeacher} main teacher not found.`, ErrorStatusCodeEnum._535);
                if (!schoolClass?.teachers) {
                    schoolClass.teachers = [];
                }

                // adding main teacher in class teachers
                schoolClass.teachers.push(schoolClass?.mainTeacher);
            }

            // teachers are optional and by default the main teacher will be class teacher
            if (teachers) {
                const classTeachers: LwpUser[] = [];

                for (const id of teachers) {
                    const teacher = await userRepository.findOne({
                        where: { id, school: { id: schoolClass?.school?.id }, type: UserType.TEACHER }
                    });

                    if (!teacher) throw new HttpException(`${id} teacher not found.`, ErrorStatusCodeEnum._535);
                    classTeachers.push(teacher);
                }

                if (!schoolClass?.teachers) {
                    schoolClass.teachers = [];
                }

                schoolClass.teachers = [schoolClass?.mainTeacher, ...classTeachers];
            }

            if (lastYearsInheritedClassId) {
                const lastYearsInheritedSchoolClass = await schoolClassRepository.findOne({
                    where: { id: lastYearsInheritedClassId },
                    relations: ['pupils']
                });

                if (!schoolClass.pupils) {
                    schoolClass.pupils = [];
                }

                for (const pupil of lastYearsInheritedSchoolClass.pupils) {
                    schoolClass.pupils.push(pupil);
                }
            }

            if (oldReadingLogStatus && !isReadingLogsEnabled) {
                const releasedReadingTopicCount = await classTopicRepository
                    .createQueryBuilder('classTopic')
                    .leftJoinAndSelect('classTopic.topic', 'topic')
                    .where('classTopic.class = :classId', { classId: schoolClass?.id })
                    .andWhere('topic.isReading = :isReading', { isReading: true })
                    .andWhere('classTopic.released = :bool', { bool: true })
                    .getCount();

                if (releasedReadingTopicCount === 0) {
                    const readingTopicIds = await classTopicRepository
                        .createQueryBuilder('classTopic')
                        .leftJoinAndSelect('classTopic.topic', 'topic')
                        .where('classTopic.class = :classId', { classId: schoolClass?.id })
                        .andWhere('topic.isReading = :isReading', { isReading: true })
                        .select('classTopic.id')
                        .getMany();

                    if (readingTopicIds?.length > 0)
                        await classTopicRepository.delete({ id: In(readingTopicIds.map((topic) => topic?.id)) });
                }
            }

            schoolClass.logUpdatedBy = this.shallowUserService.newShallowUser(contextUserId);

            const savedSchoolClass = await schoolClassRepository.save(schoolClass);

            // Update all group across classes license details in the school if the class's license details have changed
            if (updateSchoolGroupAcrossClassesLicenses) {
                await this.updateAllGroupAcrossClassesLicenseDetails(schoolClass?.school?.id);
            }

            return savedSchoolClass;
        });
    }

    public async getClassPupilsForRegisterTable(id: string): Promise<ClassPupilsForRegisterTableOutput> {
        const classPupilsOutput: ClassPupilForRegisterTableOutput[] = [];
        const classTopicsOutput: ClassTopicOutput[] = [];

        const classTopicsAndPupilTopics = await this.schoolClassRepository.query(
            `
            select
                lct.id as "id",
                base."topicReleaseDate" as "releaseDate",
                base."topicReadingTarget" as "readingTarget",
                topic_class."name" as "schoolClassName",
                topic_class."id" as "topicClassId",
                topic_class."isRegistrationClass" as "isRegistrationClass",
                slt."teacherTopicName" as "staticTopicName",
                case when slt."isReading" is true then array[]::text[] else coalesce(array_agg(distinct sls1."name") filter (where sls1."name" is not null), array[]::text[]) end as "staticTopicSubjects",
                slt."isReading" as "isReadingTopic",
                coalesce(slac."activityCount", 0) as "staticTopicActivitiesCount",
                array_agg(to_jsonb (base.*)) as "pupilTopics"
            from (
                select
                    lp.id as "pupil_id",
                    lpt.id as "id",
                    lpt."classTopicId" as "classTopicId",
                    lpt."topicId" as "staticTopicId",
                    lpt."watchedVideo" as "watchedVideo",
                    COALESCE(lpt."silverStars", 0) as "silverStars",
                    COALESCE(lpt."earnedGoldStar", FALSE) as "earnedGoldStar",
                    COUNT(DISTINCT lpa.id) as "totalEarnedStars",
                    lsc.id as "pupilClassId",
                    coalesce(lct."releaseDate", lpt."releaseDate") as "topicReleaseDate",
                    coalesce(lct."readingTarget", lpt."readingTarget") as "topicReadingTarget"
                from
                    lwp_class_pupil lcp
                    join lwp_pupil lp on lcp."lwpPupilId" = lp.id
                    join lwp_school_class lsc on lcp."lwpSchoolClassId" = lsc.id
                    left join lwp_class_subjects lcs on lsc.id = lcs."lwpSchoolClassId"
                    join lwp_pupil_topic lpt on lp.id = lpt."pupilId"
                        and lsc."periodIndex" <= lpt."periodIndex"
                    join static_lwp_topic slt1 on lpt."topicId" = slt1."id"
                    -- Conditionally joining static_lwp_topic_domain_year_group only if slt1."isReading" is false, only join when not a reading topic
                    left join static_lwp_topic_domain_year_group sltdyg on slt1."id" = sltdyg."topicId" and slt1."isReading" is false
                    left join static_lwp_topic_domain sltd on sltdyg."domainId" = sltd."id"
                    left join static_lwp_subject sls on sltd."subjectId" = sls."id"
                    left join lwp_pupil_activity lpa on lpt.id = lpa."topicId"
                        and lpa."earnedStar" = true
                    left join lwp_class_topic lct on lpt."classTopicId" = lct.id
                where
                    lcp."lwpSchoolClassId" = $1
                    and
                    (lsc."isRegistrationClass" IS true OR lcs."staticLwpSubjectId" = sls."id" OR lsc."IsReadingLogsEnabled" IS true)
                    and (
                        lsc."isGroupAcrossClasses" is false
                        or slt1."isReading" is true
                        or lct."classId" = $1
                    )
                group by
                    lp.id,
                    lpt.id,
                    lsc.id,
                    lct.id
                order by
                    lp.id asc
            ) base
            join lwp_school_class pupil_class on base."pupilClassId" = pupil_class.id
            join static_lwp_topic slt on base."staticTopicId" = slt.id
            left join static_lwp_topic_domain_year_group sltdyg1 on slt."id" = sltdyg1."topicId" and slt."isReading" is false
            left join static_lwp_topic_domain sltd1 on sltdyg1."domainId" = sltd1."id"
            left join static_lwp_subject sls1 
                on sltd1."subjectId" = sls1."id" 
                and (
                    pupil_class."isRegistrationClass" IS true
                    or exists (
                        select 1 
                        from lwp_school_class school_class 
                        join lwp_class_subjects lcs1 on lcs1."lwpSchoolClassId" = school_class."id"
                        where school_class."id" = $1 
                            and lcs1."staticLwpSubjectId" = sls1."id"
                    )
                )
            left join (select "topicId", count(1) as "activityCount" from static_lwp_activity sla where sla."isHidden" = false group by "topicId") slac on slt.id = slac."topicId"
            left join lwp_class_topic lct on base."classTopicId" = lct.id
            left join lwp_school_class topic_class on lct."classId" = topic_class.id
            group by
                lct.id, 
                base."topicReleaseDate",
                base."topicReadingTarget",
                slt.id,
                slac."activityCount",
                topic_class.id
            order by base."topicReleaseDate" desc;
        `,
            [id]
        );

        classTopicsOutput.push(...classTopicsAndPupilTopics);

        const pupilData = await this.schoolClassRepository.query(
            `
            SELECT
                lp.id,
                CONCAT(lp.firstname, ' ', lp.lastname) AS "fullname",
                lvps."pupilStatus",
                COUNT(lpp.id) > 0 AND COUNT(lpp.id) = SUM(CASE WHEN lpp."status" = 'REJECTED' THEN 1 ELSE 0 END) AS "allParentsRejected",
                COUNT(lpp.id) > 0 AND COUNT(lpp.id) = SUM(CASE WHEN lpp."status" IN ('REJECTED', 'IMPORTED') THEN 1 ELSE 0 END) AS "allParentsRejectedOrImported",
                CASE WHEN COUNT(lpp.id) > 0 AND COUNT(CASE WHEN lpp."status" = 'INVITED' THEN 1 ELSE NULL END) > 0 AND COUNT(CASE WHEN lpp."status" = 'ACTIVE' THEN NULL ELSE 1 END) = COUNT(lpp.id)
                    THEN true
                    ELSE false
                END AS "allParentsNotActiveAndAtLeastOneInvited",
                CASE WHEN COUNT(lpp.id) = 0 THEN true ELSE false END AS "noParents"
            FROM
                lwp_pupil lp
            JOIN
                lwp_view_pupil_status lvps on lvps."pupilId" = lp.id
            JOIN
                lwp_class_pupil lcp ON lcp."lwpPupilId" = lp.id AND lcp."lwpSchoolClassId" = $1
            LEFT JOIN
                lwp_pupil_parent lpp ON lpp."pupilId" = lp.id
            LEFT JOIN
                lwp_user lu ON lu.id = lpp."parentId"
            GROUP BY
                lp.firstname,
                lp.lastname,
                lp.id,
                lvps."pupilStatus"
            ORDER BY
                lp.firstname ASC,
                lp.lastname ASC;
        `,
            [id]
        );

        classPupilsOutput.push(...pupilData);

        return { classTopics: classTopicsOutput, pupils: classPupilsOutput };
    }

    public async getClassPupilsForClassPupilsPage(id: string): Promise<ClassPupilsForClassPupilsPageOutput[]> {
        const classPupilsOutput: ClassPupilsForClassPupilsPageOutput[] = [];

        const pupilData = await this.schoolClassRepository.query(
            `
            SELECT
                lp.id,
                CONCAT(lp.firstname, ' ', lp.lastname) AS "fullname",
                lvps."pupilStatus",
                COUNT(lpp.id) > 0 AND COUNT(lpp.id) = SUM(CASE WHEN lpp."status" = 'REJECTED' THEN 1 ELSE 0 END) AS "allParentsRejected",
                COUNT(lpp.id) > 0 AND COUNT(lpp.id) = SUM(CASE WHEN lpp."status" IN ('REJECTED', 'IMPORTED') THEN 1 ELSE 0 END) AS "allParentsRejectedOrImported",
                CASE WHEN COUNT(lpp.id) > 0 AND COUNT(CASE WHEN lpp."status" = 'INVITED' THEN 1 ELSE NULL END) > 0 AND COUNT(CASE WHEN lpp."status" = 'ACTIVE' THEN NULL ELSE 1 END) = COUNT(lpp.id)
                    THEN true
                    ELSE false
                END AS "allParentsNotActiveAndAtLeastOneInvited",
                CASE WHEN COUNT(lpp.id) = 0 THEN true ELSE false END AS "noParents",
                COUNT(DISTINCT CASE WHEN lpp."status" = '${PupilParentStatus.ACTIVE}' THEN lpp.id ELSE NULL END) AS "activeParentsCount",
                COUNT(DISTINCT CASE WHEN lpp."status" = '${PupilParentStatus.INVITED}' THEN lpp.id ELSE NULL END) AS "invitedParentsCount",
                COUNT(DISTINCT CASE WHEN lpp."status" = '${PupilParentStatus.IMPORTED}' THEN lpp.id ELSE NULL END) AS "importedParentsCount",
                COUNT(DISTINCT CASE WHEN lpp."status" = '${PupilParentStatus.REJECTED}' THEN lpp.id ELSE NULL END) AS "rejectedParentsCount",
                COALESCE(
                        jsonb_agg(
                            DISTINCT jsonb_build_object(
                                'id', lpt.id,
                                'name', lpt.name,
                                'color', lpt.color
                            )
                        ) FILTER (WHERE lpt.id IS NOT NULL),
                        '[]'
                    ) AS "tags"
            FROM
                lwp_pupil lp
            JOIN
                lwp_view_pupil_status lvps ON lvps."pupilId" = lp.id
            JOIN
                lwp_class_pupil lcp ON lcp."lwpPupilId" = lp.id AND lcp."lwpSchoolClassId" = $1
            LEFT JOIN
                lwp_pupil_parent lpp ON lpp."pupilId" = lp.id
            LEFT JOIN
                lwp_user lu ON lu.id = lpp."parentId"
            LEFT JOIN
                lwp_pupil_tag_pupil lptp ON lptp."lwpPupilId" = lp.id
            LEFT JOIN
                lwp_pupil_tag lpt ON lpt.id = lptp."lwpPupilTagId"
            GROUP BY
                lp.firstname,
                lp.lastname,
                lp.id,
                lvps."pupilStatus"
            ORDER BY
                lp.firstname ASC,
                lp.lastname ASC;
            `,
            [id]
        );

        classPupilsOutput.push(...pupilData);

        return classPupilsOutput;
    }

    public async getClassPupils(classId: string, pupilName?: string): Promise<LwpPupil[]> {
        const pupilQueryBuilder = this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoin('pupil.classes', 'schoolClass')
            .where('schoolClass.id = :classId', { classId });

        // Add a conditional search filter
        if (pupilName) {
            pupilQueryBuilder.andWhere("LOWER(CONCAT(pupil.firstname, ' ', pupil.lastname)) LIKE LOWER(:pupilName)", {
                pupilName: `%${pupilName}%`
            });
        }

        pupilQueryBuilder.orderBy('pupil.firstname', 'ASC').addOrderBy('pupil.lastname', 'ASC');

        return await pupilQueryBuilder.getMany();
    }

    public async getMISRegistrationClassPupils(wondeClassId: string, classId?: string): Promise<string[]> {
        const pupilNames: string[] = [];

        const importedSchoolClass = await this.importedSchoolClassRepository
            .createQueryBuilder('importedSchoolClass')
            .leftJoinAndSelect('importedSchoolClass.students', 'student')
            .leftJoinAndSelect('student.lwpPupil', 'lwpPupil')
            .leftJoinAndSelect('lwpPupil.classes', 'pupilClasses')
            .where('importedSchoolClass.id = :wondeClassId', { wondeClassId })
            .getOne();

        if (classId) {
            if (importedSchoolClass?.students?.length > 0) {
                for (const student of importedSchoolClass.students) {
                    if (student?.lwpPupil?.id && student?.lwpPupil?.classes?.length > 0) {
                        for (const pupilSchoolClass of student.lwpPupil.classes) {
                            if (pupilSchoolClass?.id !== classId && pupilSchoolClass?.isRegistrationClass) {
                                pupilNames.push(`${student?.lwpPupil?.firstname} ${student?.lwpPupil?.lastname}`);
                            }
                        }
                    }
                }
            }
        } else {
            if (importedSchoolClass?.students?.length > 0) {
                for (const student of importedSchoolClass.students) {
                    if (student?.lwpPupil?.id && student?.lwpPupil?.classes?.length > 0) {
                        for (const pupilSchoolClass of student.lwpPupil.classes) {
                            if (pupilSchoolClass?.isRegistrationClass) {
                                pupilNames.push(`${student?.lwpPupil?.firstname} ${student?.lwpPupil?.lastname}`);
                            }
                        }
                    }
                }
            }
        }

        return pupilNames;
    }

    public async getClassPupilsForAdmin(classId: string): Promise<LwpPupil[]> {
        return this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoinAndSelect('pupil.classes', 'classes')
            .where('classes.id = :classId', { classId })
            .getMany()
            .then((pupils) => pupils?.sort((a, b) => (a.firstname > b.firstname ? 1 : b.firstname > a.firstname ? -1 : 0)));
    }

    public async getClassReadingLogs(classId: string): Promise<LwpPupil[]> {
        // Need to optimize this query
        const rawClassPupils = await this.pupilFeedbackService
            .joinToReadingFeedback(
                this.schoolClassRepository
                    .createQueryBuilder('classes')
                    .leftJoinAndSelect('classes.pupils', 'pupils')
                    .leftJoinAndSelect('pupils.allTopics', 'pupilTopic')
            )
            .andWhere('readingFeedback.id IS NOT NULL')
            .andWhere('classes.id = :classId', { classId })
            .andWhere('classes.IsReadingLogsEnabled = :bool', { bool: true })
            .select('pupils')
            .getRawMany();

        const newClassPupils: LwpPupil[] = rawClassPupils.map((pupil) =>
            Object.assign({}, ...this.helperService.changeObjKeys(pupil, 'pupils_'))
        );

        return newClassPupils;
    }

    public async assignTeacherToClass(teacherId: string, classId: string): Promise<OperationStatus> {
        const teacher = await this.userRepository.findOne({ where: { id: teacherId }, relations: ['classes'] });
        const schoolClass = await this.schoolClassRepository.findOne({ where: { id: classId }, relations: ['teachers', 'school'] });

        schoolClass.teachers.push(teacher);
        await this.schoolClassRepository.save(schoolClass);

        await this.notificationService.sendTeacherAssignedToClass(teacher, schoolClass, true);

        return { status: 'ok', msg: 'Teacher assigned to Class' } as OperationStatus;
    }

    public async getSchoolClassStatistics(classId: string): Promise<SchoolClassStatistics> {
        const classStatistics = new SchoolClassStatistics();

        const statsQuery = (
            await this.pupilStatusRepository.query(
                `
            SELECT
                coalesce(max(active), 0) AS "activeCount",
                coalesce(max(registered), 0) AS "registeredCount",
                coalesce(max(missing), 0) AS "missingCount"
            FROM
                crosstab (concat ('SELECT
                1,
                lvps."pupilStatus",
                count(1)
            FROM
                lwp_class_pupil lcp
                JOIN lwp_view_pupil_status lvps ON lvps."pupilId" = lcp."lwpPupilId"
            WHERE
                lcp."lwpSchoolClassId" = ', $1::bigint, '
            GROUP BY
                lvps."pupilStatus"'), $$VALUES ('ACTIVE'::text), ('REGISTERED'), ('MISSING') $$) AS ct (row_name int,
                    active int,
                    registered int,
                    missing int)`,
                [classId]
            )
        )[0];

        classStatistics.active = statsQuery.activeCount;

        classStatistics.registered = statsQuery.registeredCount;

        classStatistics.missing = statsQuery.missingCount;

        return classStatistics;
    }

    public async getSchoolClassStatisticsPupils(classId: string, status: PupilStatus): Promise<string[]> {
        const statsQuery = await this.pupilStatusRepository
            .createQueryBuilder('status')
            .innerJoinAndSelect('status.pupil', 'pupil')
            .innerJoin('pupil.classes', 'class', 'class.id = :classId', { classId })
            .where('status.pupilStatus = :status', { status })
            .select(['pupil.firstname'])
            .getRawMany();

        return statsQuery?.map((item) => item.pupil_firstname);
    }

    public async changeReadingLogsStatus(IsReadingLogsEnabled: boolean, classId: string): Promise<LwpSchoolClass> {
        const schoolClass = await this.schoolClass(classId);

        schoolClass.IsReadingLogsEnabled = IsReadingLogsEnabled;

        return await this.schoolClassRepository.save(schoolClass);
    }

    public getUptoDatePupils(schoolClass: LwpSchoolClass): UptoDateAndEngagedPupils {
        const uptoDatePupils: LwpPupil[] = [];
        const engagingPupils: LwpPupil[] = [];
        const registeredPupils: LwpPupil[] = [];

        schoolClass.pupils.map((pupil) => {
            let totalPupilActivitiesCount = 0;
            let completedPupilActivitiesCount = 0;

            pupil.allTopics.map((topic) => {
                topic.activities.map((activity) => {
                    totalPupilActivitiesCount = totalPupilActivitiesCount + 1;
                    if (activity?.feedbacks?.length) {
                        completedPupilActivitiesCount = completedPupilActivitiesCount + 1;
                    }
                });
            });

            const completedPupilActivitiesPercentage = (completedPupilActivitiesCount * 100) / totalPupilActivitiesCount;

            if (completedPupilActivitiesPercentage === 100) {
                uptoDatePupils.push(pupil);
            } else if (completedPupilActivitiesPercentage >= 50) {
                engagingPupils.push(pupil);
            } else {
                registeredPupils.push(pupil);
            }
        });

        return { uptoDatePupils, engagingPupils, registeredPupils };
    }

    public async getPupilClasses(pupilId: string, groupsOnly = false): Promise<LwpSchoolClass[]> {
        const pupilClassesQuery = this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoin('schoolClass.pupils', 'pupils')
            .where('pupils.id = :pupilId', { pupilId });

        if (groupsOnly) {
            pupilClassesQuery
                .leftJoin('schoolClass.school', 'school')
                .andWhere('"schoolClass"."periodIndex" >= "school"."curentPeriodIndex"');
        }

        return await pupilClassesQuery
            .andWhere('schoolClass.isRegistrationClass = :bool', { bool: !groupsOnly })
            .orderBy('"schoolClass"."periodIndex"', 'DESC')
            .addOrderBy('"schoolClass"."logCreatedAt"', 'DESC')
            .getMany();
    }

    public async getPupilCurrentClass(pupilId: string): Promise<LwpSchoolClass> {
        const currentPeriodIndex = await this.periodService.getCurrentPeriodIndex();
        const pupilClassesBase = await this.queryBaseService.pupilClassesBase(pupilId);
        const pupilClass = await pupilClassesBase
            .select('class')
            .leftJoinAndSelect('class.period', 'period')
            .andWhere('period.index = :periodIndex', { periodIndex: currentPeriodIndex })
            .orderBy('class.logCreatedAt', 'DESC')
            .getOne();

        return pupilClass;
    }

    public async getClassByPupilTopic(pupilTopicId: string): Promise<LwpSchoolClass> {
        const pupilParentBase = await this.queryBaseService.pupilTopicClassBase(pupilTopicId);
        const topicClass = await pupilParentBase.select('class').getRawOne();
        const newTopicClass = Object.assign({}, ...this.helperService.changeObjKeys(topicClass, 'class_'));

        if (newTopicClass?.id) return newTopicClass;

        return null;
    }

    public async getTeacherClasses(teacherId: string): Promise<LwpSchoolClass[]> {
        const schoolClassesBase = await this.queryBaseService.teacherClassesBase(teacherId);
        const schoolClasses = await schoolClassesBase.select('classes').distinct().getRawMany();

        const newTeacherClasses: LwpSchoolClass[] = schoolClasses
            .map((teacherClass) => Object.assign({}, ...this.helperService.changeObjKeys(teacherClass, 'classes_')))
            .filter((teacherClass) => teacherClass.id !== null);

        return newTeacherClasses;
    }

    public async getTeacherMainClasses(teacherId: string): Promise<LwpSchoolClass[]> {
        const teacherMainClassesBase = this.queryBaseService.teacherMainClassesBase(teacherId);
        const teacherMainClasses = await teacherMainClassesBase.select('mainClasses').getRawMany();

        const newTeacherMainClasses: LwpSchoolClass[] = teacherMainClasses
            .map((teacherClass) => Object.assign({}, ...this.helperService.changeObjKeys(teacherClass, 'mainClasses_')))
            .filter((teacherClass) => teacherClass.id !== null);

        return newTeacherMainClasses;
    }

    public async getClassYearGroup(schoolClassId: string): Promise<StaticLwpTopicDomain> {
        const classYearGroupBase = await this.queryBaseService.schoolClassYearGroupBase(schoolClassId);
        const yearGroup = await classYearGroupBase.select('yearGroup').getRawOne();
        const newYearGroup = Object.assign({}, ...this.helperService.changeObjKeys(yearGroup, 'yearGroup_'));

        if (newYearGroup?.id) return newYearGroup;

        return null;
    }

    public async getClassNumOfPupils(schoolClassId: string): Promise<number> {
        const pupilCount = await this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoinAndSelect('pupil.classes', 'schoolClass')
            .where('schoolClass.id = :id', { id: schoolClassId })
            .getCount();

        return pupilCount ?? 0;
    }

    public async getClassGroups(schoolClassId: string): Promise<LwpSchoolClass[]> {
        return await this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoin('schoolClass.parentClass', 'parentClass', 'parentClass.id = :schoolClassId', { schoolClassId })
            .leftJoin('schoolClass.school', 'school')
            .where('parentClass.id IS NOT NULL')
            .andWhere('"schoolClass"."periodIndex" >= school."curentPeriodIndex"')
            .orderBy('schoolClass.name', 'ASC')
            .getMany();
    }

    public async getSubjects(schoolClass: LwpSchoolClass): Promise<StaticLwpSubject[]> {
        const classDetails = await this.schoolClassRepository.findOne({ where: { id: schoolClass.id }, relations: ['subjects'] });

        return classDetails.subjects ?? [];
    }

    public async getAttentionRequiredPupilsCountOfSchoolClass(schoolClassId: string): Promise<number> {
        return await this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoin('pupil.classes', 'schoolClass')
            .leftJoin('pupil.parents', 'excludedPupilParent', 'excludedPupilParent.status IN (:...excludedStatuses)', {
                excludedStatuses: [PupilParentStatus.ACTIVE, PupilParentStatus.INVITED]
            })
            .where('schoolClass.id = :schoolClassId', { schoolClassId })
            .andWhere('excludedPupilParent.id IS NULL')
            .orderBy('pupil.firstname', 'ASC')
            .addOrderBy('pupil.lastname', 'ASC')
            .getCount();
    }

    public async getParentClass(schoolClassId: string): Promise<LwpSchoolClass> {
        const schoolClass = await this.schoolClassRepository.findOne({ where: { id: schoolClassId }, relations: ['parentClass'] });

        return schoolClass?.parentClass?.id ? schoolClass?.parentClass : null;
    }

    public async getClassImportedClass(schoolClassId: string): Promise<ImportedSchoolClass> {
        const classImportedClassBase = await this.queryBaseService.schoolClassImportedClassBase(schoolClassId);
        const importedClass = await classImportedClassBase.select('importedSchoolClass').getRawOne();
        const newImportedClass = Object.assign({}, ...this.helperService.changeObjKeys(importedClass, 'importedSchoolClass_'));

        if (newImportedClass?.id) return newImportedClass;

        return null;
    }

    public async getSchoolClassName(schoolClassId: string): Promise<string> {
        const schoolClass = await this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoin('schoolClass.period', 'period')
            .where('schoolClass.id = :schoolClassId', { schoolClassId })
            .select(['schoolClass.name', 'period.shortName', 'period.index'])
            .getOne();

        const currentPeriodIndex = await this.periodService.getCurrentPeriodIndex();

        return schoolClass?.period?.index < currentPeriodIndex
            ? `${schoolClass?.period?.shortName}: ${schoolClass?.name}`
            : schoolClass?.name;
    }

    public async deleteSchoolClass(schoolClassId: string, deletedBy: string | LwpUser, manager?: EntityManager): Promise<OperationStatus> {
        const schoolClassRepository: Repository<LwpSchoolClass> = manager?.getRepository(LwpSchoolClass) ?? this.schoolClassRepository;
        const logLwpPupilClassChangeRepository: Repository<LogLwpPupilClassChange> =
            manager?.getRepository(LogLwpPupilClassChange) ?? this.logLwpPupilClassChangeRepository;

        const shallowUser = this.shallowUserService.newShallowUser(deletedBy);

        const schoolClass = await schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoin('schoolClass.pupils', 'pupils')
            .leftJoin('schoolClass.groups', 'groups')
            .leftJoin('groups.pupils', 'groupPupils')
            .where('schoolClass.id = :schoolClassId', { schoolClassId })
            .select(['schoolClass.id', 'schoolClass.status', 'pupils.id', 'groups.id', 'groups.status', 'groupPupils.id'])
            .getOne();

        if (!schoolClass) throw new HttpException('School class does not exist', ErrorStatusCodeEnum._535);

        const schoolClassAndGroups = [schoolClass, ...(schoolClass?.groups || [])];
        const removedLogs: LogLwpPupilClassChange[] = [];

        for (const classOrGroup of schoolClassAndGroups) {
            if (classOrGroup?.pupils?.length) {
                for (const pupil of classOrGroup.pupils) {
                    const log = new LogLwpPupilClassChange();

                    log.pupilId = pupil.id;
                    log.classId = classOrGroup.id;
                    log.status = classOrGroup.status;
                    log.action = PupilClassActionType.REMOVED;
                    log.logCreatedById = shallowUser.id;
                    removedLogs.push(log);
                }
            }
        }

        if (removedLogs.length) await logLwpPupilClassChangeRepository.save(removedLogs);

        const res = await schoolClassRepository.update({ id: schoolClassId }, { deletedBy: shallowUser });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async remainingAllowedSchoolClassesCount(
        schoolId: string,
        numOfTotalClassesAllowed: number,
        numOfFullProgrammeClassesAllowed: number,
        manager?: EntityManager
    ): Promise<SchoolAllowedClassesInfo> {
        const classCounts = await (manager?.getRepository(LwpSchoolClass) ?? this.schoolClassRepository)
            .createQueryBuilder('schoolClass')
            .leftJoin('schoolClass.school', 'school')
            .where('school.id = :schoolId', { schoolId })
            .andWhere('schoolClass.status = :status', { status: SchoolClassStatus.ACTIVE })
            .andWhere('schoolClass.isRegistrationClass = true')
            .andWhere('schoolClass.period.index >= school.curentPeriod.index')
            .select([
                `COALESCE(COUNT(1) FILTER (WHERE schoolClass.isFullProgramme), 0) AS "fullProgrammeClassCount"`,
                `COALESCE(COUNT(1) FILTER (
                    WHERE schoolClass.isFullProgramme
                      AND NOT schoolClass.IsReadingLogsEnabled
                      ), 0) AS "onlyFullProgrammeClassCount"`,
                `COALESCE(COUNT(1) FILTER (WHERE schoolClass.IsReadingLogsEnabled), 0) AS "readingClassCount"`
            ])
            .getRawOne();

        const remainingFullProgrammeClasses = Math.max(0, numOfFullProgrammeClassesAllowed - classCounts.fullProgrammeClassCount);

        const remainingTotalClasses = Math.max(
            0,
            numOfTotalClassesAllowed - classCounts.readingClassCount - classCounts.onlyFullProgrammeClassCount
        );

        return { fullProgramme: remainingFullProgrammeClasses, total: remainingTotalClasses };
    }

    public async getAllowedClassesInfo(schoolId: string): Promise<SchoolAllowedClassesInfo> {
        const school = await this.schoolRepository.findOne({ where: { id: schoolId }, relations: ['curentPeriod'] });

        return await this.remainingAllowedSchoolClassesCount(
            school?.id,
            school?.numOfTotalClassesAllowed,
            school?.numOfFullProgrammeClassesAllowed
        );
    }

    public async isPreAdmissionClass(schoolClassId: string): Promise<boolean> {
        const [{ isPreAdmissionClass }] = await this.schoolClassRepository.query(
            `
            SELECT sc."periodIndex" > s."curentPeriodIndex" AS "isPreAdmissionClass"
            FROM lwp_school_class sc
            JOIN lwp_school s ON sc."schoolId" = s.id
            WHERE sc.id = $1
            `,
            [schoolClassId]
        );

        return isPreAdmissionClass ?? false;
    }

    public async getSchoolClassAcademicYearInfo(schoolClassId: string): Promise<AcademicYearInfo> {
        const result = await this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoin('schoolClass.school', 'school')
            .leftJoin('schoolClass.period', 'period')
            .leftJoin('school.curentPeriod', 'currentPeriod')
            .where('schoolClass.id = :schoolClassId', { schoolClassId })
            .select([
                'period.shortName as "shortName"',
                'CASE WHEN period.index = currentPeriod.index THEN true ELSE false END as "isInCurrentAcademicYear"',
                'CASE WHEN period.index < currentPeriod.index THEN true ELSE false END as "isInPreviousAcademicYear"'
            ])
            .getRawOne<{ shortName: string; isInCurrentAcademicYear: boolean; isInPreviousAcademicYear: boolean }>();

        return {
            shortName: result?.shortName || '',
            isInCurrentAcademicYear: result?.isInCurrentAcademicYear || false,
            isInPreviousAcademicYear: result?.isInPreviousAcademicYear || false
        };
    }

    public async getClassTopicContext(classId: string): Promise<ClassTopicContextOutput> {
        const classTopicContextData = await this.schoolClassRepository
            .createQueryBuilder('lsc')
            .leftJoin('lsc.topics', 'topics')
            .leftJoin('topics.topic', 'static_topic')
            .where('(lsc.id = :classId OR lsc.parentClassId = :classId)', { classId })
            .select([
                `coalesce(bool_or(NOT static_topic."isReading"), false) AS "hasTopics"`,
                `coalesce(
                    bool_or(
                        CASE
                            -- When the class is a group across classes, it has no own reading topics.
                            -- Instead, check if any of the pupils' registration classes have reading logs enabled
                            -- and at least one released reading topic.
                            WHEN lsc."isGroupAcrossClasses" = true THEN (
                                SELECT bool_or(slt."isReading")
                                FROM lwp_class_pupil lcp
                                JOIN lwp_class_pupil lcp2 ON lcp2."lwpPupilId" = lcp."lwpPupilId"
                                JOIN lwp_school_class lsc2 ON lsc2.id = lcp2."lwpSchoolClassId" AND lsc2."isRegistrationClass" = true AND lsc2."IsReadingLogsEnabled" = true
                                JOIN lwp_class_topic lct ON lct."classId" = lsc2.id AND lct.released = true
                                JOIN static_lwp_topic slt ON slt.id = lct."topicId" AND slt."isReading" = true
                                WHERE lcp."lwpSchoolClassId" = lsc.id
                            )
                            -- When classId belongs to a class group and reading logs are enabled, check if the parent class contains reading topics
                            WHEN lsc.parentClassId IS NOT NULL AND lsc."IsReadingLogsEnabled" = true THEN (
                                SELECT bool_or(static_topics."isReading")
                                FROM lwp_class_topic lct
                                INNER JOIN static_lwp_topic static_topics ON lct."topicId" = static_topics.id AND static_topics."isReading"
                                WHERE lct."classId" = lsc.parentClassId
                            )
                            WHEN lsc."IsReadingLogsEnabled" = true THEN static_topic."isReading"
                            ELSE false
                        END
                    ),
                    false
                ) AS "hasReadingTopic"`
            ])
            .getRawOne();

        return classTopicContextData;
    }

    public async linkLwpClassToWondeClass(linkClassInput: LinkClassInput): Promise<boolean> {
        const { linkClassInputs } = linkClassInput;

        // let index = 1;

        // validating linkClassInputs START
        const valueArr = linkClassInputs.map((item) => {
            return item.importedSchoolClassId;
        });
        const isDuplicate = valueArr.some((item, idx) => {
            return valueArr.indexOf(item) != idx && item !== 'not_in_mis';
        });

        if (isDuplicate)
            throw new HttpException('You can not associate one lwp class with more than one wonde class', ErrorStatusCodeEnum._535);
        // validating linkClassInputs END

        try {
            for (const input of linkClassInputs) {
                const { lwpSchoolClassId, importedSchoolClassId } = input;

                // If wondeSchoolId is null then go to next iteration
                if (!importedSchoolClassId) {
                    continue;
                }

                // Find lwpSchoolClass from lwp_school_class table
                const lwpSchoolClass = await this.schoolClassRepository.findOne({
                    where: { id: lwpSchoolClassId },
                    relations: ['importedSchoolClass']
                });

                // Remove Relation if not_in_mis is selected
                if (importedSchoolClassId === 'not_in_mis' && lwpSchoolClass) {
                    const wsc = lwpSchoolClass?.importedSchoolClass;

                    if (wsc) {
                        wsc.lwpSchoolClass = null;
                        await this.importedSchoolClassRepository.save(wsc);
                    }

                    lwpSchoolClass.importedSchoolClass = null;
                    lwpSchoolClass.importedSchoolClassId = null;
                    await this.schoolClassRepository.save(lwpSchoolClass);

                    continue;
                }

                // Find importedSchoolClass from wonde_school_class table
                const importedSchoolClass = await this.importedSchoolClassRepository.findOne({
                    where: { id: importedSchoolClassId },
                    relations: ['lwpSchoolClass']
                });

                // Go to next iteration if any of 2 classes are not found
                if (!importedSchoolClass || !lwpSchoolClass) {
                    continue;
                }

                // Removing relation between importedSchoolClass and lwpSchoolClass
                // if user want to associate importedSchoolClass with other lwpSchoolClass
                if (importedSchoolClass.lwpSchoolClass?.id !== lwpSchoolClassId) {
                    importedSchoolClass.lwpSchoolClass = null;
                    await this.importedSchoolClassRepository.save(importedSchoolClass);

                    lwpSchoolClass.importedSchoolClass = null;
                    lwpSchoolClass.importedSchoolClassId = null;
                    await this.schoolClassRepository.save(lwpSchoolClass);
                }

                // Associating ImportedSchoolClass with LwpSchoolClass
                importedSchoolClass.lwpSchoolClass = lwpSchoolClass;
                await this.importedSchoolClassRepository.save(importedSchoolClass);

                // Associating LwpSchoolClass with ImportedSchoolClass
                lwpSchoolClass.importedSchoolClass = importedSchoolClass;
                lwpSchoolClass.importedSchoolClassId = importedSchoolClass.id;
                await this.schoolClassRepository.save(lwpSchoolClass);
            }

            return true;
        } catch (err) {
            if (err.code === '23505') {
                throw new HttpException('Something went wrong in class linking', ErrorStatusCodeEnum._535);
            } else {
                throw new HttpException(`${err.message}`, ErrorStatusCodeEnum._535);
            }
        }
    }

    public async getClassesAndGroupsForFeedbackFilter(
        periodIndex: string,
        teacherId: string,
        schoolId: string,
        isAdminOrSchoolLeader: boolean
    ): Promise<SchoolClassForFeedbackFilterOutput[]> {
        const schoolClass = this.schoolClassRepository
            .createQueryBuilder('lsc')
            .select([
                'lsc.name as name',
                'lsc.id as id',
                'yearGroup.year as year',
                'lsc."isGroupAcrossClasses" as "isGroupAcrossClasses"',
                'COALESCE(bool_or(teachers.id = :teacherId), false) as "isMyClass"',
                `COALESCE(bool_or(CASE WHEN lsc."isGroupAcrossClasses" = true THEN lsc."IsReadingLogsEnabled" = true ELSE topics.released = true AND topics.readingTarget is not null END), false) as "hasReadingTopics"`,
                `COALESCE(
                    (
                        SELECT COUNT(*)
                        FROM lwp_class_topic topic_count
                        WHERE topic_count."classId" = lsc.id
                            AND topic_count.released = true
                            AND topic_count."readingTarget" IS NULL
                    ),
                    0
                    ) as "topicCount"`,
                `COALESCE(bool_or(topics.released = true AND topics.readingTarget is null and DATE(topics.releaseDate) >= current_date - interval '13 days' AND (topics.dueDate IS NULL OR DATE(topics.dueDate) >= current_date)), false) as "hasCurrentTopic"`,
                `COALESCE(bool_or(lsc."isReadyTeddyEnabled"), false) as "isReadyTeddyEnabled"`,
                `(
                    SELECT COALESCE(jsonb_agg(subject_data ORDER BY subject_data->>'name'), jsonb_build_array())
                        FROM (
                            SELECT DISTINCT jsonb_build_object('id', class_subject.id, 'name', class_subject.name, 'programmeType', class_subject."programmeType") as subject_data
                            FROM lwp_class_topic subject_topic
                            INNER JOIN static_lwp_topic_domain_year_group subject_dyg ON subject_dyg."topicId" = subject_topic."topicId"
                            INNER JOIN static_lwp_topic_domain subject_domain ON subject_domain.id = subject_dyg."domainId"
                            INNER JOIN static_lwp_subject class_subject ON class_subject.id = subject_domain."subjectId"
                            WHERE subject_topic."classId" = lsc.id
                                AND subject_topic.released = true
                                AND subject_topic."readingTarget" IS NULL
                        ) as subject_rows
                ) as "subjects"`,
                `(
                    SELECT COALESCE(jsonb_agg(subquery.group_data), jsonb_build_array())
                        FROM (
                            SELECT jsonb_build_object(
                                'id', class_group.id,
                                'name', class_group.name,
                                'hasReadingTopics', COALESCE(bool_or(class_group."IsReadingLogsEnabled"), false),
                                'topicCount', COALESCE(SUM(CASE WHEN group_topic.released = true AND group_topic."readingTarget" IS NULL THEN 1 END), 0),
                                'hasCurrentTopic', COALESCE(bool_or(group_topic.released = true AND group_topic."readingTarget" is null AND DATE(group_topic."releaseDate") >= current_date - interval '13 days' AND (group_topic."dueDate" IS NULL OR DATE(group_topic."dueDate") >= current_date)), false),
                                'isReadyTeddyEnabled', COALESCE(bool_or(class_group."isReadyTeddyEnabled"), false),
                                'subjects', (
                                    SELECT COALESCE(jsonb_agg(subject_data ORDER BY subject_data->>'name'), jsonb_build_array())
                                    FROM (
                                        SELECT DISTINCT jsonb_build_object('id', class_subject.id, 'name', class_subject.name, 'programmeType', class_subject."programmeType") as subject_data
                                        FROM lwp_class_topic subject_topic
                                        INNER JOIN static_lwp_topic_domain_year_group subject_dyg ON subject_dyg."topicId" = subject_topic."topicId"
                                        INNER JOIN static_lwp_topic_domain subject_domain ON subject_domain.id = subject_dyg."domainId"
                                        INNER JOIN static_lwp_subject class_subject ON class_subject.id = subject_domain."subjectId"
                                        WHERE subject_topic."classId" = class_group.id
                                            AND subject_topic.released = true
                                            AND subject_topic."readingTarget" IS NULL
                                    ) as subject_rows
                                )
                            ) as group_data
                            FROM lwp_school_class class_group
                            LEFT JOIN lwp_class_teacher group_teacher ON group_teacher."lwpSchoolClassId" = class_group.id
                            LEFT JOIN lwp_class_topic group_topic ON group_topic."classId" = class_group.id
                            WHERE class_group."parentClassId" = lsc.id
                            ${isAdminOrSchoolLeader ? '' : 'AND group_teacher."lwpUserId" = :teacherId'}
                            GROUP BY class_group.id
                        ) as subquery
                ) as "classGroups"`
            ])
            .leftJoin('lsc.teachers', 'teachers')
            .leftJoin('lsc.school', 'school')
            .leftJoin('lsc.topics', 'topics')
            .innerJoin('lsc.yearGroup', 'yearGroup')
            .leftJoin('lsc.groups', 'classGroup')
            .leftJoin('classGroup.teachers', 'groupTeachers')
            .where('school.id = :schoolId')
            .andWhere('lsc.parentClassId IS NULL')
            .andWhere('lsc.status = :status', { status: SchoolClassStatus.ACTIVE })
            .setParameters({ teacherId, schoolId });

        if (!isAdminOrSchoolLeader) {
            schoolClass.andWhere(
                new Brackets((qb) => {
                    qb.where(`teachers.id = :teacherId`).orWhere(`groupTeachers.id = :teacherId`);
                })
            );
        }

        if (periodIndex) {
            schoolClass.andWhere('lsc.period.index = :periodIndex', { periodIndex: periodIndex });
        } else {
            schoolClass.andWhere('lsc.period.index >= school.curentPeriod.index');
        }

        const classData = await schoolClass
            .orderBy('yearGroup.year', 'ASC')
            .addOrderBy('lsc.name', 'ASC')
            .groupBy('lsc.id, yearGroup.year')
            .getRawMany();

        return classData;
    }

    public async getSubjectsForClassGroupCreation(classId: string): Promise<StaticLwpSubject[]> {
        const classDetails = await this.schoolClassRepository.findOne({
            where: { id: classId },
            relations: ['school'],
            select: ['id', 'isReadyTeddyEnabled', 'isFullProgramme', 'isRegistrationClass', 'IsReadingLogsEnabled']
        });

        if (!classDetails) throw new HttpException('Class not found.', ErrorStatusCodeEnum._535);

        if (!classDetails.isRegistrationClass) throw new HttpException('Class is not a registration class.', ErrorStatusCodeEnum._535);

        const subjects = this.lwpSubjectsRepository
            .createQueryBuilder('subjects')
            .leftJoin('subjects.topicDomain', 'topicDomain')
            .leftJoin('topicDomain.topicsAndYearGroups', 'topicsAndYearGroups')
            .leftJoin('topicsAndYearGroups.topic', 'topic')
            .select(['subjects.id', 'subjects.name']);

        const { isReadyTeddyEnabled, isFullProgramme, IsReadingLogsEnabled } = classDetails;

        const isMoneySkillsAvailable = classDetails?.school?.isMoneySkillsAvailable;

        /**
         * Get subjects based on the class type
         * 1. If ready teddy, full program and money skills are false, return an empty array.
         * 2. If ready teddy is true then include subjects with programmeType {SubjectProgrammeType.READY_TEDDY}.
         * 3. If full programme is true then include subjects with programmeType {SubjectProgrammeType.FULL_PROGRAMME}.
         * 4. If money skills is enabled and either full programme or reading logs are enabled, then include subjects with programmeType {SubjectProgrammeType.MONEY_SKILLS}.
         * 5. If all are true then include all subjects.
         */

        if (!(isReadyTeddyEnabled || isFullProgramme || isMoneySkillsAvailable)) return [];

        subjects.where(
            new Brackets((qb) => {
                if (isReadyTeddyEnabled) {
                    qb.orWhere('subjects.programmeType = :readyTeddy', { readyTeddy: SubjectProgrammeType.READY_TEDDY });
                }

                if (isFullProgramme) {
                    qb.orWhere('subjects.programmeType = :fullProgramme', { fullProgramme: SubjectProgrammeType.FULL_PROGRAMME });
                }

                if (isMoneySkillsAvailable && (IsReadingLogsEnabled || isFullProgramme)) {
                    qb.orWhere('subjects.programmeType = :moneySkills', { moneySkills: SubjectProgrammeType.MONEY_SKILLS });
                }
            })
        );

        // return subjects which contain topics
        return await subjects.andWhere('topic.id IS NOT NULL').orderBy('subjects.name', 'ASC').getMany();
    }

    public async hasClassesThisYear(teacherId: string): Promise<boolean> {
        const teacherClassesCount = await this.schoolClassRepository
            .createQueryBuilder('classes')
            .innerJoin('classes.period', 'period')
            .innerJoin('classes.teachers', 'classTeachers', 'classTeachers.id = :teacherId', { teacherId })
            .innerJoin('classes.school', 'school')
            .where(
                new Brackets((qb) => {
                    qb.where(`period.index >= school.curentPeriod.index`).orWhere(`period.isCurrentPeriod = ${true}`);
                })
            )
            .getCount();

        return teacherClassesCount > 0;
    }

    public async getClassGroupsForAddingPupil(classId: string, schoolId: string, teacherId?: string): Promise<LwpSchoolClass[]> {
        const groupsQuery = this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoin('schoolClass.school', 'school')
            .where('"schoolClass"."schoolId" = :schoolId', { schoolId })
            .andWhere('"schoolClass"."periodIndex" >= school."curentPeriodIndex"');

        if (teacherId) {
            groupsQuery.innerJoin('schoolClass.teachers', 'schoolTeachers').andWhere('"schoolTeachers"."id" = :teacherId', { teacherId });
        }

        groupsQuery
            .andWhere(
                new Brackets((qb) => {
                    qb.where('"schoolClass"."parentClassId" = :classId').orWhere('schoolClass.isGroupAcrossClasses = true');
                })
            )
            .orderBy('"schoolClass"."parentClassId"', 'ASC')
            .setParameters({ classId });

        return await groupsQuery.getMany();
    }

    public async updateAllGroupAcrossClassesLicenseDetails(schoolId?: string): Promise<void> {
        const groupAcrossClassesQuery = this.schoolClassRepository
            .createQueryBuilder('schoolClass')
            .leftJoin('schoolClass.school', 'school')
            .select(['schoolClass.id'])
            .where('"schoolClass"."isGroupAcrossClasses" = true')
            .andWhere('"schoolClass"."periodIndex" >= school."curentPeriodIndex"');

        if (schoolId) groupAcrossClassesQuery.andWhere('"schoolClass"."schoolId" = :schoolId', { schoolId });

        const groupAcrossClasses = await groupAcrossClassesQuery.getMany();

        await this.helperService.updateGroupAcrossClassesLicenseDetails(groupAcrossClasses.map((c) => c.id));
    }

    /**
     * Fetches pupils and class topics for the group-across-classes activity grid register table.
     *
     * Behaves similarly to `getClassPupilsForRegisterTable` for registration classes, with
     * one key difference in how reading topics are handled:
     *
     * - **Non-reading topics**: Only topics created by the group class itself (`classId = id`)
     *   are included, one row per topic as normal.
     *
     * - **Reading topics**: Since a group class cannot create its own reading topics, reading
     *   topics are sourced from each pupil's registration class. Topics that share the same
     *   `releaseDate` and `readingTarget` are merged into a single row using a synthetic
     *   `bigint` id derived from `hashtext(releaseDate + readingTarget)`. The `pupilTopics`
     *   array is a union of all pupils across the merged topics. Class-specific fields
     *   (`topicClassId`, `schoolClassName`, `isRegistrationClass`) are `null` for merged
     *   reading topic rows.
     *
     * @param id - The id of the group-across-classes school class
     * @returns classTopics and pupils shaped identically to `ClassPupilsForRegisterTableOutput`,
     * corresponding to the `getClassPupilsForRegisterTable` query used for registration classes
     */
    public async getActivityGridDataForGroupAcrossClasses(id: string): Promise<ClassPupilsForRegisterTableOutput> {
        const classPupilsOutput: ClassPupilForRegisterTableOutput[] = [];
        const classTopicsOutput: ClassTopicOutput[] = [];

        const classTopicsAndPupilTopics = await this.schoolClassRepository.query(
            `
                with activity_counts as (
                    select "topicId", count(1) as "activityCount"
                    from static_lwp_activity
                    where "isHidden" = false
                        and "topicId" in (
                            select lpt."topicId"
                            from lwp_class_topic lct
                            join lwp_pupil_topic lpt on lpt."classTopicId" = lct.id
                            where lct."classId" = $1
                        )
                    group by "topicId"
                )
                select
                    merged."topicId"                        as "id",
                    merged."releaseDate",
                    merged."readingTarget",
                    merged."schoolClassName",
                    merged."topicClassId",
                    merged."isRegistrationClass",
                    merged."staticTopicName",
                    merged."staticTopicSubjects",
                    merged."isReadingTopic",
                    merged."staticTopicActivitiesCount",
                    array_agg(
                        to_jsonb(merged.*)
                        - 'topicId'
                        - 'releaseDate'
                        - 'readingTarget'
                        - 'schoolClassName'
                        - 'topicClassId'
                        - 'isRegistrationClass'
                        - 'staticTopicName'
                        - 'staticTopicSubjects'
                        - 'isReadingTopic'
                        - 'staticTopicActivitiesCount'
                    ) as "pupilTopics"
                from (

                    select
                        lct.id                                                                      as "topicId",
                        coalesce(lct."releaseDate", lpt."releaseDate")                              as "releaseDate",
                        coalesce(lct."readingTarget", lpt."readingTarget")                          as "readingTarget",
                        topic_class."name"                                                          as "schoolClassName",
                        topic_class."id"                                                            as "topicClassId",
                        topic_class."isRegistrationClass"                                           as "isRegistrationClass",
                        slt."teacherTopicName"                                                      as "staticTopicName",
                        coalesce(
                            array_agg(distinct sls1."name") filter (where sls1."name" is not null),
                            array[]::text[]
                        )                                                                           as "staticTopicSubjects",
                        false                                                                       as "isReadingTopic",
                        coalesce(ac."activityCount", 0)::bigint                                    as "staticTopicActivitiesCount",
                        lp.id                                                                       as "pupil_id",
                        lpt.id                                                                      as "id",
                        lpt."classTopicId"                                                          as "classTopicId",
                        lpt."topicId"                                                               as "staticTopicId",
                        lpt."watchedVideo"                                                          as "watchedVideo",
                        coalesce(lpt."silverStars", 0)                                              as "silverStars",
                        coalesce(lpt."earnedGoldStar", false)                                       as "earnedGoldStar",
                        count(distinct lpa.id)                                                      as "totalEarnedStars",
                        lsc.id                                                                      as "pupilClassId"
                    from
                        lwp_class_pupil lcp
                        join lwp_pupil lp on lcp."lwpPupilId" = lp.id
                        join lwp_school_class lsc on lcp."lwpSchoolClassId" = lsc.id
                        join lwp_class_subjects lcs on lsc.id = lcs."lwpSchoolClassId"
                        join lwp_pupil_topic lpt on lp.id = lpt."pupilId"
                            and lsc."periodIndex" <= lpt."periodIndex"
                        join static_lwp_topic slt on lpt."topicId" = slt."id"
                            and slt."isReading" is false
                        join lwp_class_topic lct on lpt."classTopicId" = lct.id
                            and lct."classId" = $1
                        join lwp_school_class topic_class on lct."classId" = topic_class.id
                        left join static_lwp_topic_domain_year_group sltdyg on slt."id" = sltdyg."topicId"
                        left join static_lwp_topic_domain sltd on sltdyg."domainId" = sltd."id"
                        left join static_lwp_subject sls on sltd."subjectId" = sls."id"
                        left join static_lwp_subject sls1
                            on sls1."id" = sls."id"
                            and exists (
                                select 1
                                from lwp_class_subjects lcs1
                                where lcs1."lwpSchoolClassId" = $1
                                    and lcs1."staticLwpSubjectId" = sls1."id"
                            )
                        left join lwp_pupil_activity lpa on lpt.id = lpa."topicId"
                            and lpa."earnedStar" = true
                        left join activity_counts ac on slt.id = ac."topicId"
                    where
                        lcp."lwpSchoolClassId" = $1
                        and lcs."staticLwpSubjectId" = sls."id"
                    group by
                        lp.id,
                        lpt.id,
                        lsc.id,
                        lct.id,
                        slt.id,
                        ac."activityCount",
                        topic_class.id

                    UNION ALL

                    select
                        abs(hashtext(
                            coalesce(lct."releaseDate", lpt."releaseDate")::text || '|' ||
                            coalesce(lct."readingTarget", lpt."readingTarget")::text
                        ))::bigint                                                                  as "topicId",
                        coalesce(lct."releaseDate", lpt."releaseDate")                              as "releaseDate",
                        coalesce(lct."readingTarget", lpt."readingTarget")                          as "readingTarget",
                        null::text                                                                  as "schoolClassName",
                        null::bigint                                                                as "topicClassId",
                        null::boolean                                                               as "isRegistrationClass",
                        slt."teacherTopicName"                                                      as "staticTopicName",
                        array[]::text[]                                                             as "staticTopicSubjects",
                        true                                                                        as "isReadingTopic",
                        0::bigint                                                                   as "staticTopicActivitiesCount",
                        lp.id                                                                       as "pupil_id",
                        lpt.id                                                                      as "id",
                        lpt."classTopicId"                                                          as "classTopicId",
                        lpt."topicId"                                                               as "staticTopicId",
                        lpt."watchedVideo"                                                          as "watchedVideo",
                        coalesce(lpt."silverStars", 0)                                              as "silverStars",
                        coalesce(lpt."earnedGoldStar", false)                                       as "earnedGoldStar",
                        0::bigint                                                                   as "totalEarnedStars",
                        lsc.id                                                                      as "pupilClassId"
                    from
                        lwp_class_pupil lcp
                        join lwp_pupil lp on lcp."lwpPupilId" = lp.id
                        join lwp_class_pupil lcp_reg on lcp_reg."lwpPupilId" = lp.id
                        join lwp_school_class lsc on lcp_reg."lwpSchoolClassId" = lsc.id
                            and lsc."isRegistrationClass" is true
                        join lwp_pupil_topic lpt on lp.id = lpt."pupilId"
                            and lsc."periodIndex" <= lpt."periodIndex"
                        join static_lwp_topic slt on lpt."topicId" = slt."id"
                            and slt."isReading" is true
                        left join lwp_class_topic lct on lpt."classTopicId" = lct.id
                    where
                        lcp."lwpSchoolClassId" = $1
                    group by
                        lp.id,
                        lpt.id,
                        lsc.id,
                        lct.id,
                        slt.id

                ) merged
                group by
                    merged."topicId",
                    merged."releaseDate",
                    merged."readingTarget",
                    merged."schoolClassName",
                    merged."topicClassId",
                    merged."isRegistrationClass",
                    merged."staticTopicName",
                    merged."staticTopicSubjects",
                    merged."isReadingTopic",
                    merged."staticTopicActivitiesCount"
                order by merged."releaseDate" desc;
            `,
            [id]
        );

        classTopicsOutput.push(...classTopicsAndPupilTopics);

        const pupilData = await this.schoolClassRepository.query(
            `
                SELECT
                    lp.id,
                    CONCAT(lp.firstname, ' ', lp.lastname) AS "fullname",
                    lvps."pupilStatus",
                    COUNT(lpp.id) > 0 AND COUNT(lpp.id) = SUM(CASE WHEN lpp."status" = 'REJECTED' THEN 1 ELSE 0 END) AS "allParentsRejected",
                    COUNT(lpp.id) > 0 AND COUNT(lpp.id) = SUM(CASE WHEN lpp."status" IN ('REJECTED', 'IMPORTED') THEN 1 ELSE 0 END) AS "allParentsRejectedOrImported",
                    CASE WHEN COUNT(lpp.id) > 0 AND COUNT(CASE WHEN lpp."status" = 'INVITED' THEN 1 ELSE NULL END) > 0 AND COUNT(CASE WHEN lpp."status" = 'ACTIVE' THEN NULL ELSE 1 END) = COUNT(lpp.id)
                        THEN true
                        ELSE false
                    END AS "allParentsNotActiveAndAtLeastOneInvited",
                    CASE WHEN COUNT(lpp.id) = 0 THEN true ELSE false END AS "noParents"
                FROM
                    lwp_pupil lp
                JOIN
                    lwp_view_pupil_status lvps on lvps."pupilId" = lp.id
                JOIN
                    lwp_class_pupil lcp ON lcp."lwpPupilId" = lp.id AND lcp."lwpSchoolClassId" = $1
                LEFT JOIN
                    lwp_pupil_parent lpp ON lpp."pupilId" = lp.id
                LEFT JOIN
                    lwp_user lu ON lu.id = lpp."parentId"
                GROUP BY
                    lp.firstname,
                    lp.lastname,
                    lp.id,
                    lvps."pupilStatus"
                ORDER BY
                    lp.firstname ASC,
                    lp.lastname ASC;
            `,
            [id]
        );

        classPupilsOutput.push(...pupilData);

        return { classTopics: classTopicsOutput, pupils: classPupilsOutput };
    }

    public anyPupilInClassHasTopic = async (staticTopicId: string, classId: string): Promise<boolean> => {
        try {
            const result = await this.schoolClassRepository
                .createQueryBuilder('schoolClass')
                .innerJoin('schoolClass.pupils', 'pupils')
                .innerJoin('pupils.allTopics', 'pupilTopics')
                .where('schoolClass.id = :id', { id: classId })
                .andWhere('"pupilTopics"."topicId" = :staticTopicId', { staticTopicId })
                .andWhere('"schoolClass"."periodIndex" <= "pupilTopics"."periodIndex"')
                .select('1')
                .limit(1)
                .getRawOne();

            return !!result;
        } catch (error) {
            newrelic.noticeError(error, { caught: true, handled: false });

            throw new HttpException('Failed to check if topic has already been assigned to pupils in this class', ErrorStatusCodeEnum._535);
        }
    };
}

interface UptoDateAndEngagedPupils {
    uptoDatePupils: LwpPupil[];
    engagingPupils: LwpPupil[];
    registeredPupils: LwpPupil[];
}
