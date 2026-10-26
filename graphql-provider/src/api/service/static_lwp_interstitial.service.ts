import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { InterstitialLastActionType, InterstitialUserOption, UserStatus } from 'lwp-shared';
import { map } from 'rxjs/operators';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { UserType } from 'src/auth/types/UserType';
import { EntityManager, Repository } from 'typeorm';

import { ShowInterstitialOutput } from '../dtos/ShowInterstitialOutput';
import { LwpUserInterstitial } from '../entities/lwp_user_interstitial';
import { StaticLwpInterstitial } from '../entities/static_lwp_interstitial';
import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { LwpUser } from '../entities/user';
import {
    AddInterstitialInput,
    ErrorStatusCodeEnum,
    OperationStatus,
    SubmitInterstitialInput,
    TypeFormContext,
    UpdateInterstitialInput
} from '../model';
import { ParameterService } from './parameter.service';

// interface FormData {
//     id: string;
//     title: string;
//     fields: Array<{
//         id: string;
//         title: string;
//         type: string;
//     }>;
// }

@Injectable()
export class StaticLwpInterstitialService {
    constructor(
        @InjectEntityManager()
        private entityManager: EntityManager,
        @InjectRepository(StaticLwpInterstitial)
        private staticLwpInterstitialRepository: Repository<StaticLwpInterstitial>,
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        @InjectRepository(LwpUserInterstitial)
        private userInterstitialRepository: Repository<LwpUserInterstitial>,
        @InjectRepository(StaticLwpSubject)
        private subjectRepository: Repository<StaticLwpSubject>,
        @InjectRepository(StaticLwpSchoolTag)
        private schoolTagRepository: Repository<StaticLwpSchoolTag>,
        private httpService: HttpService,
        private paramterService: ParameterService,
        private shallowUserService: ShallowUserService
    ) {}

    public async getInterstitialForm(interstitialFormId: string): Promise<StaticLwpInterstitial> {
        const interstitialForm = await this.staticLwpInterstitialRepository.findOne({
            where: { id: interstitialFormId }
        });

        if (!interstitialForm) throw new HttpException('Interstitial Form not found.', ErrorStatusCodeEnum._535);

        return interstitialForm;
    }

    public async getAllInterstitialForm(): Promise<StaticLwpInterstitial[]> {
        const interstitialForms = await this.staticLwpInterstitialRepository.find({ order: { name: 'ASC' }, relations: ['subject'] });

        return interstitialForms;
    }

    private async getSubjectBySubjectId(subjectId?: string): Promise<StaticLwpSubject> {
        if (!subjectId) return null;
        const subject = await this.subjectRepository.findOne({ where: { id: subjectId }, select: ['id'] });

        if (!subject) throw new HttpException('Subject not found.', ErrorStatusCodeEnum._535);

        return subject;
    }

    private async getSchoolTagsByIds(schoolTagsIds: string[]): Promise<StaticLwpSchoolTag[]> {
        if (!schoolTagsIds?.length) return [];

        const schoolTags = await this.schoolTagRepository.findByIds(schoolTagsIds, { select: ['id'] });

        return schoolTags;
    }

    public async addInterstitialForm(input: AddInterstitialInput, userId: string): Promise<StaticLwpInterstitial> {
        const interstitialForm = new StaticLwpInterstitial();

        interstitialForm.heading = input.heading;
        interstitialForm.text = input?.text ?? null;
        interstitialForm.type = input.type;
        interstitialForm.lastAction = InterstitialLastActionType.CREATED;
        interstitialForm.lastActionAt = new Date();
        interstitialForm.averageTime = input?.averageTime;
        interstitialForm.typeformId = input.typeformId;
        interstitialForm.userOptions = input.userOptions;
        interstitialForm.showQuestion = input.showQuestion;
        interstitialForm.subject = await this.getSubjectBySubjectId(input.subjectId);

        interstitialForm.schoolTags = await this.getSchoolTagsByIds(input?.schoolTagsIds);

        const user = this.shallowUserService.newShallowUser(userId);

        interstitialForm.logCreatedBy = user;
        interstitialForm.logUpdatedBy = user;

        if (input?.name) interstitialForm.name = input?.name;

        const savedInterstitialForm = await this.staticLwpInterstitialRepository.save(interstitialForm);

        const typeFormAccessTokenParameter = await this.paramterService.getParameterByKey('TYPEFORM_ACCESS_TOKEN');

        const typeFormContext = await this.getInterstitialFormContextFromTypeForm(
            interstitialForm?.typeformId,
            typeFormAccessTokenParameter?.value
        );

        await this.staticLwpInterstitialRepository.update({ id: savedInterstitialForm?.id }, { context: typeFormContext });

        return savedInterstitialForm;
    }

    public async updateInterstitialForm(input: UpdateInterstitialInput): Promise<StaticLwpInterstitial> {
        const interstitialForm = await this.staticLwpInterstitialRepository.findOne({ where: { id: input.id } });

        interstitialForm.text = input.text;
        interstitialForm.heading = input.heading;
        if (input.type) interstitialForm.type = input.type;
        if (input.averageTime) interstitialForm.averageTime = input.averageTime;
        if (input.name) interstitialForm.name = input?.name;
        if (input.typeformId) interstitialForm.typeformId = input.typeformId;
        if (input.userOptions) interstitialForm.userOptions = input.userOptions;

        interstitialForm.subject = await this.getSubjectBySubjectId(input.subjectId);
        interstitialForm.schoolTags = await this.getSchoolTagsByIds(input.schoolTagsIds);

        const typeFormAccessTokenParameter = await this.paramterService.getParameterByKey('TYPEFORM_ACCESS_TOKEN');

        const typeFormContext = await this.getInterstitialFormContextFromTypeForm(
            interstitialForm?.typeformId,
            typeFormAccessTokenParameter?.value
        );

        interstitialForm.context = typeFormContext;
        interstitialForm.showQuestion = input.showQuestion;

        return await this.staticLwpInterstitialRepository.save(interstitialForm);
    }

    public async deleteInterstitialForm(interstitialFormId: string, userId: string): Promise<OperationStatus> {
        await this.resetInterstitialForm(interstitialFormId, userId, false);

        const res = await this.staticLwpInterstitialRepository.delete(interstitialFormId);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async releaseInterstitialForm(interstitialFormId: string, userId: string): Promise<boolean> {
        await this.entityManager.transaction(async (transactionalEntityManager) => {
            // Fetch interstitial form by ID, excluding soft-deleted records
            const interstitialForm = await transactionalEntityManager
                .createQueryBuilder(StaticLwpInterstitial, 'form')
                .leftJoin('form.subject', 'subject')
                .leftJoin('form.schoolTags', 'schoolTags')
                .select(['form.id', 'form.userOptions', 'subject.id', 'schoolTags.id'])
                .where('form.id = :id', { id: interstitialFormId })
                .getOne();

            if (!interstitialForm?.id) {
                throw new HttpException('Interstitial Form not found', ErrorStatusCodeEnum._535);
            }

            const userOptions: InterstitialUserOption[] = interstitialForm.userOptions;

            // Check if there are any new users prefixed options
            const newPrefixedOptions = userOptions
                .filter(
                    (option: InterstitialUserOption) =>
                        option === InterstitialUserOption.NEW_PARENT || option === InterstitialUserOption.NEW_TEACHER
                )
                .map((option: InterstitialUserOption) =>
                    option === InterstitialUserOption.NEW_PARENT ? InterstitialUserOption.PARENT : InterstitialUserOption.TEACHER
                );

            // Filter out NEW_PARENT and NEW_TEACHER from the userOptions
            const filteredUserOptions = userOptions.filter(
                (option: InterstitialUserOption) => option === InterstitialUserOption.PARENT || option === InterstitialUserOption.TEACHER
            );

            // Get school tags IDs if they exist (pass null if empty to handle both filter and non-filter cases)
            const schoolTagIds = interstitialForm?.schoolTags?.length > 0 ? interstitialForm?.schoolTags?.map((tag) => tag.id) : null;

            if (!interstitialForm?.subject?.id) {
                await transactionalEntityManager.query(
                    `
                        WITH currentPeriod AS (
                            SELECT "startDate", "endDate"
                            FROM static_lwp_period slp
                            WHERE slp."isCurrentPeriod" = true
                        ),
                        newUsers AS (
                            SELECT lu."id", lu."type"
                            FROM lwp_user lu
                            JOIN log_lwp_entity_status_change llesc
                                ON llesc."entityId" = lu."id"
                                AND llesc."entityType" = 'lwp_user'
                            WHERE
                            llesc."logCreatedAt" >= (SELECT "startDate" FROM currentPeriod)
                            AND llesc."logCreatedAt" < (SELECT "endDate" FROM currentPeriod)
                            AND llesc."newStatus" IN ('${UserStatus.ACTIVE}', '${UserStatus.ACCOUNTLESS}')
                            AND llesc."previousStatus" = '${UserStatus.INVITED}'
                        ),
                        tagged_schools AS (
                            SELECT DISTINCT lslt."schoolId"
                            FROM lwp_school_static_tags lslt
                            WHERE lslt."tagId" = ANY($6::bigint[])
                        ),
                        targeted_users AS (
                            SELECT DISTINCT id FROM lwp_user WHERE type = ANY($1::text[])
                            UNION
                            SELECT DISTINCT id FROM newUsers WHERE type = ANY($2::text[])
                        )
                        INSERT INTO lwp_user_interstitial ("userId", "interstitialId", "logCreatedById", "logUpdatedById")
                        SELECT tu.id, $3, $4, $4
                        FROM targeted_users tu
                        JOIN lwp_user lu ON lu."id" = tu."id"
                        WHERE
                            (
                                $6::bigint[] IS NULL
                                OR (
                                    lu."type" = $5 -- TEACHER
                                    AND lu."schoolId" IN (SELECT "schoolId" FROM tagged_schools)
                                )
                                OR (
                                    lu."type" <> $5 -- PARENT
                                    AND EXISTS (
                                        SELECT 1
                                        FROM lwp_pupil_parent lpp
                                        JOIN lwp_pupil lp ON lp.id = lpp."pupilId"
                                        WHERE lpp."parentId" = lu.id
                                        AND lp."schoolId" IN (SELECT "schoolId" FROM tagged_schools)
                                    )
                                )
                            )
                        ON CONFLICT ("userId", "interstitialId")
                        DO UPDATE SET "logUpdatedById" = $4;
                    `,
                    [filteredUserOptions, newPrefixedOptions, interstitialFormId, userId, UserType.TEACHER, schoolTagIds]
                );
            } else {
                await transactionalEntityManager.query(
                    `
                    WITH currentPeriod AS (
                        SELECT "startDate", "endDate"
                        FROM static_lwp_period
                        WHERE "isCurrentPeriod" = true
                    ),
                    filtered_parents AS (
                        SELECT lu."id"
                        FROM lwp_user lu
                        JOIN lwp_pupil_parent lpp ON lpp."parentId" = lu."id"
                        JOIN lwp_pupil lp ON lp."id" = lpp."pupilId"
                        JOIN lwp_school ls ON ls."id" = lp."schoolId"
                        JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp."id" AND lpt."periodIndex" = ls."curentPeriodIndex"
                        JOIN static_lwp_topic_domain_year_group sltdyg ON sltdyg."topicId" = lpt."topicId"
                        JOIN static_lwp_topic_domain sltd ON sltd."id" = sltdyg."domainId"
                        WHERE lu."type" = 'PARENT' AND sltd."subjectId" = $1
                    ),
                    filtered_teachers AS (
                        SELECT lu."id"
                        FROM lwp_user lu
                        JOIN lwp_school ls ON ls."id" = lu."schoolId"
                        JOIN lwp_class_teacher lct ON lct."lwpUserId" = lu."id"
                        JOIN lwp_school_class lsc ON lsc."id" = lct."lwpSchoolClassId" AND lsc."periodIndex" = ls."curentPeriodIndex"
                        JOIN lwp_class_topic lctopic ON lctopic."classId" = lct."lwpSchoolClassId"
                        JOIN static_lwp_topic_domain_year_group sltdyg ON sltdyg."topicId" = lctopic."topicId"
                        JOIN static_lwp_topic_domain sltd ON sltd."id" = sltdyg."domainId"
                        WHERE lu."type" = 'TEACHER' AND sltd."subjectId" = $1
                    ),
                    new_parents_subject_filtered AS (
                        SELECT lu."id"
                        FROM lwp_user lu
                        JOIN log_lwp_entity_status_change llesc ON llesc."entityId" = lu."id" AND llesc."entityType" = 'lwp_user'
                        JOIN lwp_pupil_parent lpp ON lpp."parentId" = lu."id"
                        JOIN lwp_pupil lp ON lp."id" = lpp."pupilId"
                        JOIN lwp_school ls ON ls."id" = lp."schoolId"
                        JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp."id" AND lpt."periodIndex" = ls."curentPeriodIndex"
                        JOIN static_lwp_topic_domain_year_group sltdyg ON sltdyg."topicId" = lpt."topicId"
                        JOIN static_lwp_topic_domain sltd ON sltd."id" = sltdyg."domainId"
                        WHERE lu."type" = 'PARENT' AND sltd."subjectId" = $1
                            AND llesc."logCreatedAt" >= (SELECT "startDate" FROM currentPeriod)
                            AND llesc."logCreatedAt" < (SELECT "endDate" FROM currentPeriod)
                            AND llesc."newStatus" IN ('${UserStatus.ACTIVE}', '${UserStatus.ACCOUNTLESS}')
                            AND llesc."previousStatus" = '${UserStatus.INVITED}'
                    ),
                    new_teachers_subject_filtered AS (
                        SELECT lu."id"
                        FROM lwp_user lu
                        JOIN log_lwp_entity_status_change llesc ON llesc."entityId" = lu."id" AND llesc."entityType" = 'lwp_user'
                        JOIN lwp_school ls ON ls."id" = lu."schoolId"
                        JOIN lwp_class_teacher lct ON lct."lwpUserId" = lu."id"
                        JOIN lwp_school_class lsc ON lsc."id" = lct."lwpSchoolClassId" AND lsc."periodIndex" = ls."curentPeriodIndex"
                        JOIN lwp_class_topic lctopic ON lctopic."classId" = lct."lwpSchoolClassId"
                        JOIN static_lwp_topic_domain_year_group sltdyg ON sltdyg."topicId" = lctopic."topicId"
                        JOIN static_lwp_topic_domain sltd ON sltd."id" = sltdyg."domainId"
                        WHERE lu."type" = 'TEACHER' AND sltd."subjectId" = $1
                            AND llesc."logCreatedAt" >= (SELECT "startDate" FROM currentPeriod)
                            AND llesc."logCreatedAt" < (SELECT "endDate" FROM currentPeriod)
                            AND llesc."newStatus" IN ('${UserStatus.ACTIVE}', '${UserStatus.ACCOUNTLESS}')
                            AND llesc."previousStatus" = '${UserStatus.INVITED}'
                    ),
                    tagged_schools AS (
                        SELECT DISTINCT lslt."schoolId"
                        FROM lwp_school_static_tags lslt
                        WHERE lslt."tagId" = ANY($7::bigint[])
                    ),
                    targeted_users AS (
                        SELECT DISTINCT id FROM filtered_parents WHERE 'PARENT' = ANY($2::text[])
                        UNION
                        SELECT DISTINCT id FROM filtered_teachers WHERE 'TEACHER' = ANY($2::text[])
                        UNION
                        SELECT DISTINCT id FROM new_parents_subject_filtered WHERE 'PARENT' = ANY($3::text[])
                        UNION
                        SELECT DISTINCT id FROM new_teachers_subject_filtered WHERE 'TEACHER' = ANY($3::text[])
                    )
                    INSERT INTO lwp_user_interstitial ("userId", "interstitialId", "logCreatedById", "logUpdatedById")
                    SELECT tu.id, $4, $5, $5
                    FROM targeted_users tu
                    JOIN lwp_user lu ON lu."id" = tu."id"
                    WHERE
                        $7::bigint[] IS NULL
                        OR (
                            lu."type" = $6 -- TEACHER
                            AND lu."schoolId" IN (SELECT "schoolId" FROM tagged_schools)
                        )
                        OR (
                            lu."type" <> $6 -- PARENT
                            AND EXISTS (
                                SELECT 1
                                FROM lwp_pupil_parent lpp
                                JOIN lwp_pupil lp ON lp.id = lpp."pupilId"
                                WHERE lpp."parentId" = lu.id
                                AND lp."schoolId" IN (SELECT "schoolId" FROM tagged_schools)
                            )
                        )
                    ON CONFLICT ("userId", "interstitialId")
                    DO UPDATE SET "logUpdatedById" = $5;
                    `,
                    [
                        interstitialForm?.subject?.id,
                        filteredUserOptions,
                        newPrefixedOptions,
                        interstitialFormId,
                        userId,
                        UserType.TEACHER,
                        schoolTagIds
                    ]
                );
            }

            // Update interstitial form with last action and last action time
            await transactionalEntityManager.update(StaticLwpInterstitial, interstitialFormId, {
                lastAction: InterstitialLastActionType.RELEASED,
                lastActionAt: new Date(),
                logUpdatedBy: { id: userId }
            });
        });

        return true;
    }

    public async assignReleasedInterstitials(userId: string, userType: UserType): Promise<void> {
        const newUserType = userType === 'PARENT' ? InterstitialUserOption.NEW_PARENT : InterstitialUserOption.NEW_TEACHER;

        await this.staticLwpInterstitialRepository.query(
            `
                    WITH targeted_interstitials AS (
                        SELECT sli.id
                        FROM static_lwp_interstitial sli
                        WHERE sli."lastAction" = 'RELEASED'
                        AND (
                            sli."userOptions" ? $2
                            OR (
                                sli."userOptions" ? $3
                                AND EXISTS (
                                    SELECT 1
                                    FROM log_lwp_entity_status_change llesc
                                    JOIN static_lwp_period slp on slp."isCurrentPeriod" = true
                                    WHERE llesc."entityType" = 'lwp_user'
                                        AND llesc."entityId" = $1
                                        AND llesc."newStatus" in ('ACTIVE', 'ACCOUNTLESS')
                                        AND llesc."previousStatus" = 'INVITED'
                                        AND llesc."logCreatedAt" >= slp."startDate"
                                        AND llesc."logCreatedAt" < slp."endDate"
                                )
                            )
                        )
                        AND sli."subjectId" IS NULL
                    )
                    INSERT INTO lwp_user_interstitial ("userId", "interstitialId", "logCreatedById", "logUpdatedById")
                    SELECT $1, ti.id, $1, $1
                    FROM targeted_interstitials ti
                    JOIN lwp_user lu on lu.id = $1
                    LEFT JOIN static_lwp_interstitial_school_tags slit on slit."staticLwpInterstitialId" = ti."id"
                    WHERE (
                        slit."staticLwpInterstitialId" IS NULL
                        OR (
                            lu.type = $4 -- TEACHER
                            AND EXISTS (
                                SELECT 1
                                FROM lwp_school_static_tags lsst
                                WHERE 
                                    lsst."schoolId" = lu."schoolId"
                                    AND lsst."tagId" = slit."staticLwpSchoolTagId"
                            )
                        )
                        OR (
                            lu.type <> $4 -- PARENT
                            AND EXISTS (
                                SELECT 1 
                                FROM lwp_pupil_parent lpp
                                JOIN lwp_pupil lp ON lp.id = lpp."pupilId"
                                JOIN lwp_school_static_tags lsst 
                                    ON lsst."schoolId" = lp."schoolId" 
                                    AND lsst."tagId" = slit."staticLwpSchoolTagId"
                                WHERE lpp."parentId" = lu.id
                            )
                        )
                    )
                    GROUP BY ti.id   
                    ON CONFLICT DO NOTHING
                    ;
                `,
            [userId, userType, newUserType, UserType.TEACHER]
        );
    }

    public async resetInterstitialForm(interstitialFormId: string, userId: string, showError = true): Promise<boolean> {
        await this.entityManager.transaction(async (transactionalEntityManager) => {
            // Delete the user interstitials and set deletedById
            const updateResult = await transactionalEntityManager
                .createQueryBuilder(LwpUserInterstitial, 'userInterstitial')
                .delete()
                .from(LwpUserInterstitial)
                .where(`"interstitialId" = :id`, { id: interstitialFormId })
                .execute();

            // Check if any rows were affected
            if (updateResult?.affected > 0) {
                // Update the interstitial form to mark as cleared
                await transactionalEntityManager.update(StaticLwpInterstitial, interstitialFormId, {
                    lastAction: InterstitialLastActionType.CLEARED,
                    lastActionAt: new Date()
                });
            } else {
                // If no rows were updated, no users were associated with the form
                if (showError) throw new HttpException('There are no users released with this form.', ErrorStatusCodeEnum._535);
            }
        });

        return true;
    }

    public async submittedInterstitialForm(input: SubmitInterstitialInput): Promise<boolean> {
        const user = await this.userRepository.findOne({ where: { id: input?.userId } });

        if (!user) throw new HttpException('User not found.', ErrorStatusCodeEnum._535);

        const userInterstitial = await this.getUserInterstitialForm(user?.id);

        if (userInterstitial?.id) {
            userInterstitial.completed = true;

            await this.userInterstitialRepository.save(userInterstitial);
        }

        return true;
    }

    async getFormDetails(url: string, accessToken: string, throwError = true): Promise<number> {
        const headers = {
            Authorization: `Bearer ${accessToken}`
        };

        try {
            const response = await this.httpService
                .get(url, { headers })
                .pipe(map((response) => response.data))
                .toPromise();

            return response?.fields?.length ?? 0;
        } catch ({ ...error }) {
            console.error('Error fetching form details:', error);
            if (throwError) throw new HttpException('Typeform api response failed', error?.response?.status);
        }
    }

    public async getInterstitialFormContextFromTypeForm(
        typeformId: string,
        accessToken: string,
        throwError = true
    ): Promise<TypeFormContext> {
        const numOfQuestionsUrl = `https://api.typeform.com/forms/${typeformId}`;
        // const estimatedTimeUrl = `https://api.typeform.com/insights/${typeformId}/summary`;

        const numOfQuestions = await this.getFormDetails(numOfQuestionsUrl, accessToken, throwError);
        // const estimatedTime = await this.getFormDetails(estimatedTimeUrl);

        return {
            numOfQuestions,
            estimatedTime: null
        };
    }

    public getInterstitialFormContext(context: TypeFormContext, averageTime: number): TypeFormContext {
        return {
            numOfQuestions: context?.numOfQuestions,
            estimatedTime: context?.estimatedTime ?? averageTime
        };
    }

    public async getUserInterstitialForm(userId: string): Promise<LwpUserInterstitial> {
        const userInterstitial = await this.userInterstitialRepository
            .createQueryBuilder('userInterstitial')
            .leftJoinAndSelect('userInterstitial.interstitial', 'staticInterstitial')
            .leftJoinAndSelect('userInterstitial.user', 'user')
            .where('user.id = :userId', { userId })
            .andWhere('staticInterstitial.lastAction = :lastAction', { lastAction: InterstitialLastActionType.RELEASED })
            .andWhere('userInterstitial.completed = :bool', { bool: false })
            .orderBy('staticInterstitial.logCreatedBy', 'DESC')
            .getOne();

        return userInterstitial?.id ? userInterstitial : null;
    }

    public async updateAllInterstitialFormsContext(): Promise<boolean> {
        const typeFormAccessTokenParameter = await this.paramterService.getParameterByKey('TYPEFORM_ACCESS_TOKEN');

        const siteForms = await this.staticLwpInterstitialRepository.find({
            where: { lastAction: InterstitialLastActionType.RELEASED, showQuestion: true }
        });

        for (const siteForm of siteForms) {
            const siteFormContext = await this.getInterstitialFormContextFromTypeForm(
                siteForm?.typeformId,
                typeFormAccessTokenParameter?.value,
                false
            );

            const context: TypeFormContext = {
                numOfQuestions: siteFormContext?.numOfQuestions,
                estimatedTime: siteFormContext?.estimatedTime ?? siteForm?.averageTime
            };

            await this.staticLwpInterstitialRepository.update({ id: siteForm?.id }, { context });
        }

        return true;
    }

    public async getUserInterstitialFormData(userId: string): Promise<ShowInterstitialOutput> {
        const userInterstitial = await this.userInterstitialRepository
            .createQueryBuilder('userInterstitial')
            .leftJoinAndSelect('userInterstitial.interstitial', 'staticInterstitial')
            .leftJoinAndSelect('userInterstitial.user', 'user')
            .where('user.id = :userId', { userId })
            .andWhere('staticInterstitial.lastAction = :lastAction', { lastAction: InterstitialLastActionType.RELEASED })
            .andWhere('userInterstitial.completed = :bool', { bool: false })
            .orderBy('staticInterstitial.logCreatedBy', 'DESC')
            .getOne();

        if (!userInterstitial?.id) return null;

        const lwpUserInterstitialOutput = {
            optedOut: userInterstitial?.optedOut,
            userInterstitialId: userInterstitial?.id,
            ...userInterstitial?.interstitial
        };

        return lwpUserInterstitialOutput as ShowInterstitialOutput;
    }

    public async getInterstitialSchoolTags(interstitialId: string): Promise<StaticLwpSchoolTag[]> {
        const interstitial = await this.staticLwpInterstitialRepository.findOne(interstitialId, {
            relations: ['schoolTags'],
            select: ['id']
        });

        return interstitial?.schoolTags ?? [];
    }
}
