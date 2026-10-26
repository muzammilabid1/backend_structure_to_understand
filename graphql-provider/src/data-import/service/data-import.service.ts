import crypto from 'node:crypto';

import { HttpService } from '@nestjs/axios';
import { ConflictException, forwardRef, HttpException, Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { parse } from 'csv-parse';
import { FileUpload } from 'graphql-upload';
import { PupilSourceType } from 'lwp-shared';
import { emailRegex, phoneRegex } from 'lwp-shared/validations/user';
import { ConfigService } from 'nestjs-config';
import newrelic from 'newrelic';
import { map } from 'rxjs/operators';
import { ParentChangesResult } from 'src/api/dtos/ImportedSchoolCheckResult';
import { ImportedContact } from 'src/api/entities/imported_contact';
import { ImportedSchool } from 'src/api/entities/imported_school';
import { ImportedSchoolClass } from 'src/api/entities/imported_school_class';
import { ImportedSchoolDataProposedChange } from 'src/api/entities/imported_school_data_proposed_change';
import { ImportedStudent } from 'src/api/entities/imported_student';
import { ImportedStudentContact } from 'src/api/entities/imported_student_contact';
import { LwpSchool } from 'src/api/entities/school';
import { StaticLwpPeriod } from 'src/api/entities/static_period';
import { LwpUser } from 'src/api/entities/user';
import { ErrorStatusCodeEnum, ImportedType, SchoolClassStatus, WondeGender, WondeSchoolResponse } from 'src/api/model';
import { HelperService } from 'src/api/service/helper.service';
import { LwpPupilFeedbackService } from 'src/api/service/lwp_pupil_feedback.service';
import { StaticLwpPeriodService } from 'src/api/service/static_period.service';
import { WondeService } from 'src/api/service/wonde.service';
import { YearGroupService } from 'src/api/service/year_group.service';
import { ClassChangeService } from 'src/data-import/service/class-change.service';
import { ClassLinkService } from 'src/data-import/service/class-link.service';
import { EntityChangeService } from 'src/data-import/service/entity-change.service';
import { EntityLinkService } from 'src/data-import/service/entity-link.service';
import { ImportStatusService } from 'src/data-import/service/import-status.service';
import { PupilChangeService } from 'src/data-import/service/pupil-change.service';
import { PupilLinkService } from 'src/data-import/service/pupil-link.service';
import { ChangeOperation } from 'src/data-import/types/change-operation';
import type { ClassChange } from 'src/data-import/types/class-change';
import type { ClassLink } from 'src/data-import/types/class-link';
import { DataImportLinkAction } from 'src/data-import/types/data-import-link-action';
import { EntityType } from 'src/data-import/types/entity-type';
import { ImportStatus } from 'src/data-import/types/import-status';
import type { PupilChange } from 'src/data-import/types/pupil-change';
import type { PupilLink } from 'src/data-import/types/pupil-link';
import { Readable } from 'stream';
import { Connection, type EntityManager, Repository, SelectQueryBuilder } from 'typeorm';

import { PendingPupilDataChangeOutput } from '../dtos/PendingPupilDataChangeOutput';
import { UpdateClassLinkRequestsInput } from '../dtos/UpdateClassLinkRequestsInput';
import { UpdateEntityChangeRequestsInput } from '../dtos/UpdateEntityChangeRequestsInput';
import { UpdatePupilLinkRequestsInput } from '../dtos/UpdatePupilLinkRequestsInput';
import { ChangeStatus } from '../types/change-status';

const emailValidationRegex = new RegExp(emailRegex);
const phoneValidationRegex = new RegExp(phoneRegex);

type CSVRow = {
    id?: string;
    forename: string;
    surname: string;
    dateOfBirth?: Date;
    UPN?: string;
    gender?: WondeGender;
    isPremium?: boolean;
    ncYear?: string;
    className: string;
    parent1Email?: string;
    parent1Phone?: string;
    parent1Forename: string;
    parent1Surname: string;
    parent2Email?: string;
    parent2Phone?: string;
    parent2Forename?: string;
    parent2Surname?: string;
    isPupilPreRegistration?: boolean;
    isClassActive?: boolean;
};

@Injectable()
export class DataImportService {
    constructor(
        private readonly connection: Connection,
        private readonly importStatusService: ImportStatusService,
        private readonly entityLinkService: EntityLinkService,
        private readonly pupilLinkService: PupilLinkService,
        private readonly classLinkService: ClassLinkService,
        private readonly entityChangeService: EntityChangeService,
        private readonly pupilChangeService: PupilChangeService,
        private readonly classChangeService: ClassChangeService,
        private configService: ConfigService,
        private httpService: HttpService,
        private helperService: HelperService,
        @InjectRepository(ImportedSchool)
        private importedSchoolRepository: Repository<ImportedSchool>,
        @InjectRepository(LwpSchool)
        private lwpSchoolRepository: Repository<LwpSchool>,
        @InjectRepository(ImportedStudent)
        private importedStudentRepository: Repository<ImportedStudent>,
        @InjectRepository(ImportedSchoolDataProposedChange)
        private importedSchoolDataProposedChangeRepository: Repository<ImportedSchoolDataProposedChange>,
        private pupilFeedbackService: LwpPupilFeedbackService,
        private yearGroupService: YearGroupService,
        private periodService: StaticLwpPeriodService,
        @Inject(forwardRef(() => WondeService))
        private readonly wondeService: WondeService
    ) {}

    /**
     * Whether the school's MIS sync should go through this service's review flow rather than the
     * legacy one: the school has Ready Teddy provision (an active Ready Teddy registration class —
     * including pre-admission ones in a future period — or a Ready Teddy group across classes).
     *
     * Every import is reviewed, not just the first of the academic year: Ready Teddy schools add
     * reception pupils, and whole reception classes, to their MIS throughout the year, and those
     * arrivals need the same linking decisions as the ones present at the start of it.
     */
    public async isReviewRequiredForSchool(lwpSchoolId: string): Promise<boolean> {
        const [{ isReviewRequired }] = await this.connection.query(
            `
                select exists (
                    select 1
                    from lwp_school ls
                    join lwp_school_class lsc
                        on lsc."schoolId" = ls.id
                        and lsc."isReadyTeddyEnabled" = true
                        and lsc.status = $2
                        and (lsc."isRegistrationClass" = true or lsc."isGroupAcrossClasses" = true)
                        and lsc."periodIndex" >= ls."curentPeriodIndex"
                    where ls.id = $1
                ) as "isReviewRequired"
            `,
            [lwpSchoolId, SchoolClassStatus.ACTIVE]
        );

        return isReviewRequired;
    }

    public async processImportedData(importedSchoolId: string, isCompleteImport: boolean = true): Promise<void> {
        let reviewCompleted = false;

        try {
            await this.connection.transaction(async (manager) => {
                await manager.query("SET LOCAL statement_timeout = '300s'");

                const importStatus = await this.importStatusService.getImportStatus(manager, importedSchoolId);

                switch (importStatus) {
                    case ImportStatus.IMPORTING_DATA:
                        throw new ConflictException('Cannot process data; import still in progress');

                    case ImportStatus.DATA_IMPORTED:
                        await this.entityLinkService.deleteStaleLinks(manager, importedSchoolId);
                        await this.entityChangeService.deleteStaleChanges(manager, importedSchoolId);

                        await this.pupilLinkService.refreshLinks(manager, importedSchoolId);

                    // fallthrough
                    case ImportStatus.LINKING_PUPILS:
                        /* Pending links are the only thing that can hold this phase open: a row
                         * without one has nothing for the leader to decide (zero-candidate rows
                         * are created after the class gate below, never shown). Checking
                         * hasImplicitPendingCreateOperations here as well would wedge the review
                         * open on rows it cannot show. */
                        if (await this.entityLinkService.hasPendingLinks(manager, EntityType.PUPIL, importedSchoolId)) {
                            return this.importStatusService.setImportStatus(manager, importedSchoolId, ImportStatus.LINKING_PUPILS);
                        }

                        await this.pupilChangeService.applyAutomaticUpdates(manager, importedSchoolId);

                        await this.classLinkService.refreshLinks(manager, importedSchoolId);

                    // fallthrough
                    case ImportStatus.LINKING_CLASSES:
                        // Same reasoning as the pupil gate: pending links only.
                        if (await this.entityLinkService.hasPendingLinks(manager, EntityType.CLASS, importedSchoolId)) {
                            return this.importStatusService.setImportStatus(manager, importedSchoolId, ImportStatus.LINKING_CLASSES);
                        }

                        /* Both linking steps are done - only now are the zero-candidate rows
                         * created. They carry no pending links so the linking screens never show
                         * them, and creating them any earlier would put real pupils - possibly
                         * duplicates of stale parentless records the completion relink is about
                         * to replace - on the platform while the review is still open, where
                         * teachers can act on them (invite parents) mid-import. */
                        await this.pupilLinkService.autoCreateUnmatchedPupils(manager, importedSchoolId);
                        await this.classLinkService.autoCreateUnmatchedClasses(manager, importedSchoolId);

                    // Diffing temporarily disabled; imports run the linking steps only.
                    // await this.pupilChangeService.generateChanges(manager, importedSchoolId, isCompleteImport);

                    // fallthrough
                    case ImportStatus.DIFFING_ENTITIES:
                        // Diffing temporarily disabled. Unconditionally advance to COMPLETE and
                        // ignore any pending changes.
                        await this.importStatusService.setImportStatus(manager, importedSchoolId, ImportStatus.COMPLETE);

                        reviewCompleted = true;

                        return;

                    default:
                        return;
                }
            });
        } catch (err) {
            const msg = 'Error processing imported school data';

            Logger.error(msg, err);

            await this.importStatusService.setImportStatus(null, importedSchoolId, ImportStatus.FAILED);

            throw err instanceof HttpException ? err : new InternalServerErrorException(msg);
        }

        if (reviewCompleted) await this.relinkAfterReview(importedSchoolId);
    }

    /**
     * The review's linking steps establish the links but never place a pupil in a class: registration
     * class membership is only ever written by the legacy relink, or by an approved `registrationClass`
     * change - which the review's (currently disabled) diffing step would generate. So run the legacy
     * relink once as the review completes, rather than leaving the leader looking at a school of
     * pupils in no class until the overnight import.
     *
     * Only the relink runs, not a full {@link WondeService.importWondeSchoolData}: this import pulled
     * the MIS rows minutes ago, so re-pulling them would cost a second Wonde fetch and, if that failed,
     * would leave the school short of COMPLETE - dropping it straight back into the review the leader
     * has just finished.
     *
     * Failures are logged rather than thrown: the review itself completed, and the nightly sync retries.
     */
    private async relinkAfterReview(importedSchoolId: string): Promise<void> {
        try {
            const importedSchool = await this.importedSchoolRepository
                .createQueryBuilder('importedSchool')
                .leftJoin('importedSchool.lwpSchool', 'lwpSchool')
                .where('importedSchool.id = :importedSchoolId', { importedSchoolId })
                .select(['importedSchool.id', 'lwpSchool.id'])
                .getOne();

            const lwpSchoolId = importedSchool?.lwpSchool?.id;

            if (!lwpSchoolId) throw new Error(`Imported school ${importedSchoolId} is not linked to a platform school`);

            await this.wondeService.reLinkingLwpWithWonde(importedSchoolId, lwpSchoolId);
        } catch (err) {
            Logger.error(`Failed to relink data after the import review for imported school ${importedSchoolId}`, err);

            newrelic.noticeError(err, { caught: true, handled: true, importedSchoolId });
        }
    }

    public getPendingPupilLinks(importedSchoolId: string): Promise<Array<PupilLink>> {
        return this.entityLinkService.getPendingLinks(EntityType.PUPIL, importedSchoolId);
    }

    public async selectPupilLink(importedSchoolId: string, importedPupilId: string, platformPupilId: string): Promise<void> {
        await this.connection.transaction(async (manager) => {
            await this.assertImportStatus(
                manager,
                importedSchoolId,
                ImportStatus.LINKING_PUPILS,
                'Cannot change pupil links during this phase of the import'
            );
            await this.pupilLinkService.selectLink(manager, importedSchoolId, importedPupilId, platformPupilId);
        });
    }

    public async rejectPupilLinks(importedSchoolId: string, importedPupilId: string): Promise<void> {
        await this.connection.transaction(async (manager) => {
            await this.assertImportStatus(
                manager,
                importedSchoolId,
                ImportStatus.LINKING_PUPILS,
                'Cannot change pupil links during this phase of the import'
            );
            await this.pupilLinkService.rejectLinks(manager, importedSchoolId, importedPupilId);
        });
    }

    public getPendingClassLinks(importedSchoolId: string): Promise<Array<ClassLink>> {
        return this.entityLinkService.getPendingLinks(EntityType.CLASS, importedSchoolId);
    }

    public pendingPupilDataChangesQueryBuilder(
        manager: EntityManager,
        importedSchoolId: string,
        countOnly: boolean = false,
        includeRejectedChanges: boolean = false
    ): SelectQueryBuilder<unknown> {
        const baseQuery = manager
            .createQueryBuilder()
            .from('imported_school_data_proposed_change', 'isdpc')
            .innerJoin('imported_school', 'is1', 'is1."lwpSchoolId"::varchar = isdpc.platformSchoolId')
            .innerJoin('lwp_school', 'ls_school', 'ls_school.id = is1."lwpSchoolId"')
            .leftJoin('lwp_pupil', 'lp', 'lp.id = isdpc.platformEntityId')
            .leftJoin('lwp_school', 'ls', 'ls.id = lp.schoolId')
            .leftJoin('lwp_class_pupil', 'lcp', 'lcp.lwpPupilId = lp.id')
            .leftJoin(
                'lwp_school_class',
                'lsc',
                'lsc.id = lcp.lwpSchoolClassId AND lsc.isRegistrationClass = true AND lsc.periodIndex = ls.curentPeriodIndex'
            )
            .andWhere('is1.id = :importedSchoolId', { importedSchoolId })
            .andWhere('(lsc.id is null or (lsc."isRegistrationClass"))');

        if (includeRejectedChanges) {
            baseQuery.andWhere('isdpc.status IN (:...rejectedStatus) AND isdpc.operation != :operation', {
                rejectedStatus: [ChangeStatus.REJECTED, ChangeStatus.PENDING],
                operation: ChangeOperation.CREATE
            });
        } else {
            baseQuery.andWhere('isdpc.status = :status', { status: ChangeStatus.PENDING });
        }

        if (countOnly) {
            return baseQuery.select('COALESCE(COUNT(DISTINCT isdpc."platformEntityId"), 0)', 'count');
        }

        return baseQuery
            .select([
                'isdpc."platformEntityId" as "platformEntityId"',
                'any_value(lp.firstname) as firstname',
                'any_value(lp.lastname) as lastname',
                'any_value(lp."UPN") as "UPN"',
                'any_value(lp."dateOfBirth") as "dateOfBirth"',
                'any_value(lsc.name) as "schoolClassName"',
                'any_value(lsc.id) as "schoolClassId"',
                'any_value(isdpc.operation) as operation',
                'COUNT(distinct(isdpc.id)) as "changeCount"'
            ])
            .addSelect(
                `
                    JSONB_AGG(DISTINCT
                        JSONB_BUILD_OBJECT(
                            'id', isdpc.id,
                            'fieldName', isdpc.fieldName,
                            'proposedValue', isdpc."proposedValue",
                            'status', isdpc."status",
                            'rejectedImportedAt', isdpc."rejectedImportedAt",
                            'registrationClassName', CASE 
                                WHEN isdpc.fieldName = 'registrationClass' 
                                    AND isdpc."proposedValue"#>>'{}' ~ '^[0-9]+$'
                                THEN (
                                    SELECT rc.name 
                                    FROM lwp_school_class rc 
                                    WHERE rc.id = (isdpc."proposedValue"#>>'{}')::bigint
                                )
                                ELSE NULL
                            END
                        )
                    )
                `,
                'changes'
            )
            .groupBy('isdpc.platformEntityId');
    }

    public async getPendingPupilDataChanges(
        importedSchoolId: string,
        includeRejectedChanges: boolean
    ): Promise<PendingPupilDataChangeOutput[]> {
        return await this.connection.transaction(async (manager) => {
            const pendingPupilDataChanges: PendingPupilDataChangeOutput[] = [];
            const countOnly = false;
            const rawPupilPendingChanges = await this.pendingPupilDataChangesQueryBuilder(
                manager,
                importedSchoolId,
                countOnly,
                includeRejectedChanges
            ).getRawMany();

            for (const rawPupilPendingChange of rawPupilPendingChanges) {
                pendingPupilDataChanges.push({
                    changeCount: rawPupilPendingChange?.changeCount,
                    operation: rawPupilPendingChange?.operation,
                    pupil: {
                        id: rawPupilPendingChange?.platformEntityId,
                        firstname: rawPupilPendingChange.firstname,
                        lastname: rawPupilPendingChange.lastname,
                        UPN: rawPupilPendingChange?.UPN,
                        dateOfBirth: rawPupilPendingChange?.dateOfBirth ? new Date(rawPupilPendingChange?.dateOfBirth)?.toString() : null,
                        sourceType: PupilSourceType.PLATFORM,
                        pupilClass: rawPupilPendingChange?.schoolClassId
                            ? {
                                  id: rawPupilPendingChange?.schoolClassId,
                                  name: rawPupilPendingChange?.schoolClassName
                              }
                            : null
                    },
                    proposedChange: rawPupilPendingChange?.changes.map((proposedChange) => ({
                        id: proposedChange?.id,
                        fieldName: proposedChange?.fieldName,
                        proposedValue: proposedChange?.proposedValue,
                        registrationClassName: proposedChange?.registrationClassName,
                        status: proposedChange?.status,
                        rejectedImportedAt: proposedChange?.rejectedImportedAt ? new Date(proposedChange?.rejectedImportedAt) : null
                    }))
                });
            }

            return pendingPupilDataChanges;
        });
    }

    public async selectClassLink(importedSchoolId: string, importedClassId: string, platformClassId: string): Promise<void> {
        await this.connection.transaction(async (manager) => {
            await this.assertImportStatus(
                manager,
                importedSchoolId,
                ImportStatus.LINKING_CLASSES,
                'Cannot change class links during this phase of the import'
            );
            await this.classLinkService.selectLink(manager, importedSchoolId, importedClassId, platformClassId);
        });
    }

    public async rejectClassLinks(importedSchoolId: string, importedClassId: string): Promise<void> {
        await this.connection.transaction(async (manager) => {
            await this.assertImportStatus(
                manager,
                importedSchoolId,
                ImportStatus.LINKING_CLASSES,
                'Cannot change class links during this phase of the import'
            );
            await this.classLinkService.rejectLinks(manager, importedSchoolId, importedClassId);
        });
    }

    public async getPendingPupilChanges(operation: ChangeOperation, importedSchoolId: string): Promise<Array<PupilChange>> {
        return (await this.pupilChangeService.getPendingChanges(importedSchoolId, operation)) as Array<PupilChange>;
    }

    public async selectPupilChange(importedSchoolId: string, id: string, userId: string): Promise<void> {
        await this.connection.transaction(async (manager) => {
            await this.assertImportStatus(
                manager,
                importedSchoolId,
                ImportStatus.DIFFING_ENTITIES,
                'Cannot review pupil changes during this phase of the import'
            );
            await this.pupilChangeService.selectChange(manager, importedSchoolId, id, userId);
        });
    }

    public async rejectPupilChange(importedSchoolId: string, id: string): Promise<void> {
        await this.connection.transaction(async (manager) => {
            await this.assertImportStatus(
                manager,
                importedSchoolId,
                ImportStatus.DIFFING_ENTITIES,
                'Cannot review pupil changes during this phase of the import'
            );
            await this.pupilChangeService.rejectChange(manager, importedSchoolId, id);
        });
    }

    public async getPendingClassChanges(operation: ChangeOperation, importedSchoolId: string): Promise<Array<ClassChange>> {
        return (await this.classChangeService.getPendingChanges(importedSchoolId, operation)) as Array<ClassChange>;
    }

    public async getPendingImportActionsCount(importedSchoolId: string, importStatus: ImportStatus): Promise<number> {
        return await this.connection.transaction(async (manager) => {
            switch (importStatus) {
                case ImportStatus.LINKING_PUPILS:
                    return await this.entityLinkService.pendingPupilLinksQueryBuilder(manager, importedSchoolId).getCount();

                case ImportStatus.LINKING_CLASSES:
                    return await this.entityLinkService.pendingClassLinksQueryBuilder(manager, importedSchoolId).getCount();

                case ImportStatus.DIFFING_ENTITIES:
                    const countResult = await this.pendingPupilDataChangesQueryBuilder(manager, importedSchoolId, true).getRawOne();

                    return countResult?.count ? parseInt(countResult.count, 10) : 0;

                default:
                    return 0;
            }
        });
    }

    public async selectClassChange(importedSchoolId: string, id: string, userId: string): Promise<void> {
        await this.connection.transaction(async (manager) => {
            await this.assertImportStatus(
                manager,
                importedSchoolId,
                ImportStatus.DIFFING_ENTITIES,
                'Cannot review class changes during this phase of the import'
            );
            await this.classChangeService.selectChange(manager, importedSchoolId, id, userId);
        });
    }

    public async rejectClassChange(importedSchoolId: string, id: string): Promise<void> {
        await this.connection.transaction(async (manager) => {
            await this.assertImportStatus(
                manager,
                importedSchoolId,
                ImportStatus.DIFFING_ENTITIES,
                'Cannot review class changes during this phase of the import'
            );
            await this.classChangeService.rejectChange(manager, importedSchoolId, id);
        });
    }

    private async assertImportStatus(
        manager: EntityManager,
        importedSchoolId: string,
        importStatus: ImportStatus,
        errorMessage: string
    ): Promise<void> {
        if ((await this.importStatusService.getImportStatus(manager, importedSchoolId)) !== importStatus) {
            throw new ConflictException(errorMessage);
        }
    }

    /** These methods are used to interact with the Wonde API **/

    private getAuthHeaderForWonde(): AxiosRequestConfig {
        const wondeApiToken = this.configService.get('key.wonde_api_token');

        return {
            headers: { authorization: `Bearer ${wondeApiToken}` }
        };
    }

    private getWondeApi(s: string): string {
        return `https://api.wonde.com/v1.0/${s}`;
    }

    public async reLinkingLwpWithWonde(wondeSchoolId: string, lwpSchoolId: string, _contextUserId?: string): Promise<void> {
        console.log(`Beginning transaction for importedSchool ${wondeSchoolId}, LwpSchool ${lwpSchoolId}`);
        await this.processImportedData(wondeSchoolId, false);
        console.log(`Ended transaction for importedSchool ${wondeSchoolId}, LwpSchool ${lwpSchoolId}`);
    }

    public async handleUpdatePupilLinkRequests(input: UpdatePupilLinkRequestsInput[], importedSchoolId: string): Promise<ImportStatus> {
        try {
            await this.updatePupilLinkRequests(input, importedSchoolId);
            await this.processImportedData(importedSchoolId, false);
            const importedStatus = await this.lwpSchoolRepository.findOneOrFail({
                where: { importedSchoolId },
                select: ['importStatus']
            });

            return importedStatus?.importStatus;
        } catch (error) {
            throw new HttpException(error?.message, ErrorStatusCodeEnum._535);
        }
    }

    public async updateEntityChangeRequests(
        input: UpdateEntityChangeRequestsInput,
        importedSchoolId: string,
        userId: string
    ): Promise<boolean> {
        try {
            const { type, actions } = input;

            if (actions.length === 0) {
                throw new HttpException('No IDs provided for entity change requests', ErrorStatusCodeEnum._535);
            }

            await this.connection.transaction(async (manager) => {
                if (type === EntityType.PUPIL) {
                    for (const action of actions) {
                        if (action.accept) {
                            await this.pupilChangeService.selectChange(manager, importedSchoolId, action.id, userId);
                        } else {
                            await this.pupilChangeService.rejectChange(manager, importedSchoolId, action.id);
                        }
                    }
                }

                if (type === EntityType.CLASS) {
                    for (const action of actions) {
                        if (action.accept) {
                            await this.classChangeService.selectChange(manager, importedSchoolId, action.id, userId);
                        } else {
                            await this.classChangeService.rejectChange(manager, importedSchoolId, action.id);
                        }
                    }
                }
            });

            await this.processImportedData(importedSchoolId);

            return true;
        } catch (error) {
            throw new HttpException(error?.message, ErrorStatusCodeEnum._535);
        }
    }

    public async updatePupilLinkRequests(input: UpdatePupilLinkRequestsInput[], importedSchoolId: string): Promise<void> {
        await this.connection.transaction(async (manager) => {
            await this.assertImportStatus(
                manager,
                importedSchoolId,
                ImportStatus.LINKING_PUPILS,
                'Cannot change pupil links during this phase of the import'
            );
            for (const pupilIdsToLink of input) {
                try {
                    if (pupilIdsToLink?.platformPupilId) {
                        await this.pupilLinkService.selectLink(
                            manager,
                            importedSchoolId,
                            pupilIdsToLink.importedStudentId,
                            pupilIdsToLink.platformPupilId
                        );
                    } else {
                        await this.pupilLinkService.rejectLinks(manager, importedSchoolId, pupilIdsToLink.importedStudentId);

                        /* CREATE needs no action of its own: rejecting the candidates leaves the
                         * row with no live links, and the auto-create sweep builds the pupil once
                         * both linking gates have passed. Creating here would put a real pupil -
                         * possibly a duplicate of a stale parentless record the completion relink
                         * is about to replace - on the platform mid-review, where teachers can act
                         * on it (e.g. invite parents) before the import is done. */
                        if (pupilIdsToLink.action === DataImportLinkAction.IGNORE) {
                            await manager.query(
                                `
                                    insert into imported_school_data_proposed_change(
                                        "platformSchoolId",
                                        "status",
                                        "operation",
                                        "entityType",
                                        "platformEntityId",
                                        "fieldName",
                                        "proposedValue"
                                    )
                                    values
                                        (
                                            (
                                                select is1."lwpSchoolId"::varchar from imported_student ims
                                                join imported_school is1 on is1.id = ims."schoolId"
                                                where ims.id = $4
                                            ),
                                            $1,
                                            $2,
                                            $3,
                                            null,
                                            null,
                                            (
                                                select to_jsonb(ims) from imported_student ims
                                                where id = $4
                                            )
                                        )
                                `,
                                [ChangeStatus.REJECTED, ChangeOperation.CREATE, EntityType.PUPIL, pupilIdsToLink.importedStudentId]
                            );
                        }
                    }
                } catch (error) {
                    console.error('PUPIL LINK ERROR', error);
                    newrelic.noticeError(new Error(error?.message), {
                        caught: true,
                        handled: false,
                        importedStudentId: pupilIdsToLink.importedStudentId,
                        platformPupilId: pupilIdsToLink.platformPupilId,
                        importedSchoolId
                    });

                    continue;
                }
            }
        });
    }

    public async handleUpdateClassLinkRequests(input: UpdateClassLinkRequestsInput[], importedSchoolId: string): Promise<ImportStatus> {
        try {
            await this.updateClassLinkRequests(input, importedSchoolId);
            await this.processImportedData(importedSchoolId, false);
            const importedStatus = await this.lwpSchoolRepository.findOneOrFail({
                where: { importedSchoolId },
                select: ['importStatus']
            });

            return importedStatus?.importStatus;
        } catch (error) {
            throw new HttpException(error?.message, ErrorStatusCodeEnum._535);
        }
    }

    public async updateClassLinkRequests(input: UpdateClassLinkRequestsInput[], importedSchoolId: string): Promise<void> {
        await this.connection.transaction(async (manager) => {
            await this.assertImportStatus(
                manager,
                importedSchoolId,
                ImportStatus.LINKING_CLASSES,
                'Cannot change class links during this phase of the import'
            );
            for (const schoolClassToLink of input) {
                try {
                    if (schoolClassToLink?.platformSchoolClassId) {
                        await this.classLinkService.selectLink(
                            manager,
                            importedSchoolId,
                            schoolClassToLink.importedSchoolClassId,
                            schoolClassToLink.platformSchoolClassId
                        );
                    } else {
                        await this.classLinkService.rejectLinks(manager, importedSchoolId, schoolClassToLink.importedSchoolClassId);

                        /* CREATE needs no action of its own - see the pupil branch above: the
                         * auto-create sweep builds the class once both linking gates have passed. */
                        if (schoolClassToLink.action === DataImportLinkAction.IGNORE) {
                            await manager.query(
                                `
                                    insert into imported_school_data_proposed_change(
                                        "platformSchoolId",
                                        "status",
                                        "operation",
                                        "entityType",
                                        "platformEntityId",
                                        "fieldName",
                                        "proposedValue"
                                    )
                                    values
                                        (
                                            (
                                                select is1."lwpSchoolId"::varchar from imported_school_class isc
                                                join imported_school is1 on is1.id = isc."schoolId"
                                                where isc.id = $4
                                            ),
                                            $1,
                                            $2,
                                            $3,
                                            null,
                                            null,
                                            (
                                                select to_jsonb(isc) from imported_school_class isc
                                                where id = $4
                                            )
                                        )
                                `,
                                [ChangeStatus.REJECTED, ChangeOperation.CREATE, EntityType.CLASS, schoolClassToLink.importedSchoolClassId]
                            );
                        }
                    }
                } catch (error) {
                    console.error('CLASS LINK ERROR', error);
                    newrelic.noticeError(new Error(error?.message), {
                        caught: true,
                        handled: false,
                        importedSchoolClassId: schoolClassToLink.importedSchoolClassId,
                        platformSchoolClassId: schoolClassToLink.platformSchoolClassId,
                        importedSchoolId
                    });

                    continue;
                }
            }
        });
    }

    /**
     * The review-system counterpart of WondeService.importWondeSchoolData: the same pull and the
     * same permission and academic-year gates, all delegated to WondeService so they exist once,
     * but a school that passes them enters the human-reviewed linking flow instead of the legacy
     * relink, and is never marked COMPLETE here - completing the review does that.
     */
    public async importWondeSchoolData(wondeSchoolId: string, lwpSchoolId: string, contextUser?: string | LwpUser): Promise<void> {
        const conextUserId = typeof contextUser === 'string' ? contextUser : contextUser?.id;
        let canLink = true;
        let isDataFromCurrentAcademicYear = true;
        const isTestSchool = wondeSchoolId === 'A1930499544';

        try {
            await this.wondeService.notifyNewRelicIfCurrentlyInProgress(lwpSchoolId, conextUserId);

            const lwpSchool = await this.lwpSchoolRepository
                .createQueryBuilder('lwpSchool')
                .leftJoin('lwpSchool.curentPeriod', 'period')
                .where('lwpSchool.id = :id', { id: lwpSchoolId })
                .select([
                    'lwpSchool.id',
                    'lwpSchool.ignoreAcademicYearCheckDuringImport',
                    'lwpSchool.hasCurrentAcademicYearWondeData',
                    'period.index'
                ])
                .getOne();

            await this.lwpSchoolRepository.update(
                { id: lwpSchoolId },
                {
                    lastImportedAt: new Date(),
                    importStatus: ImportStatus.IMPORTING_DATA
                }
            );

            // It will delete old wonde data associated with $lwpSchool
            console.log('> Deleting old wonde data');
            await this.wondeService.deleteWondeData(lwpSchoolId, false);

            // It will import new wonde data and associate it with $lwpSchool
            console.log('> Updating shadow database');
            await this.wondeService.pullWondeSchoolData(wondeSchoolId, lwpSchoolId, true);

            await this.importStatusService.setImportStatus(null, wondeSchoolId, ImportStatus.DATA_IMPORTED);

            if (!lwpSchool?.ignoreAcademicYearCheckDuringImport && !lwpSchool?.hasCurrentAcademicYearWondeData) {
                // It will check if the new wonde data is current
                console.log('> Checking if the new wonde data is current');
                isDataFromCurrentAcademicYear = await this.wondeService.isWondeDataCurrent(wondeSchoolId, lwpSchool?.curentPeriod?.index);
            }

            if (!isDataFromCurrentAcademicYear && !isTestSchool) canLink = false;

            if (canLink) {
                // Hand the freshly pulled data to the review pipeline (link refresh, then any
                // pending links wait for a human; nothing here marks the school COMPLETE).
                await this.reLinkingLwpWithWonde(wondeSchoolId, lwpSchoolId, conextUserId);
            }

            console.log('> Saving the result of the wonde operation');
            await this.lwpSchoolRepository.update({ id: lwpSchoolId }, { lastImportedAt: new Date() });
        } catch (err) {
            const errorMessage = err?.message || 'Unknown error occurred';

            await this.lwpSchoolRepository.update(
                { id: lwpSchoolId },
                {
                    lastImportedAt: new Date(),
                    importStatus: ImportStatus.FAILED
                }
            );
            console.error('Wonde import failed:', { lwpSchoolId, error: errorMessage });
            throw err;
        }
    }

    /**
     * importSchoolData takes an ID of a school, and a CSV file to import data from,
     * and imports the CSV file's data into the proposed imported school.
     *
     * @param {string} lwpSchoolId the LWP school to import
     * @param {FileUpload} importFile the file to import from
     * @return {Promise<string[]>} string array of validation errors; empty if complete success
     * @memberof ImportedSchoolService
     */
    public async importSchoolData(lwpSchoolId: string, importFile: FileUpload): Promise<string[]> {
        const importStream = importFile.createReadStream() as Readable;
        const runner = this.connection.createQueryRunner('master');

        await runner.connect();
        await runner.startTransaction();

        const validationErrors = [];

        try {
            const manager = runner.manager;

            const lwpSchoolRepository = manager.getRepository(LwpSchool);
            const thisSchool = await lwpSchoolRepository.findOne(lwpSchoolId);

            if (!thisSchool) {
                console.error("That school ID doesn't exist");
                process.exit(1);
            }

            const importedSchoolRepository = manager.getRepository(ImportedSchool);
            const currentPeriodIndex = await this.periodService.getCurrentPeriodIndex(manager);

            let importedSchool = await importedSchoolRepository.findOne({ where: { proposedSchool: thisSchool } });

            if (!importedSchool) {
                importedSchool = await importedSchoolRepository.save(
                    importedSchoolRepository.create({
                        id: `CSV-${crypto.randomUUID()}`,
                        importedFrom: ImportedType.CSV,
                        name: thisSchool.schoolName,
                        proposedSchool: thisSchool,
                        period: { index: currentPeriodIndex } as StaticLwpPeriod
                    })
                );
            }

            console.log(`Importing into school ${thisSchool.schoolName}`);

            thisSchool.misIntegration = 'CSV';
            thisSchool.skipAutoWondeImport = true;
            await manager.save(thisSchool);
            const getDigest = (value: string): string => crypto.createHash('sha256').update(value).digest('base64');

            const importedStudentRepository = manager.getRepository(ImportedStudent);
            const importedSchoolClassRepository = manager.getRepository(ImportedSchoolClass);
            const importedContactRepository = manager.getRepository(ImportedContact);
            const importedStudentContactRepository = manager.getRepository(ImportedStudentContact);

            await importedStudentRepository.delete({ school: importedSchool });
            await importedSchoolClassRepository.delete({ school: importedSchool });
            await importedContactRepository.delete({ school: importedSchool });
            await importedStudentContactRepository.delete({ school: importedSchool });

            const parsedStream = importStream.pipe(
                parse({
                    columns: true,
                    relax_column_count_less: true,
                    trim: true,
                    bom: true,
                    on_record: (record) => {
                        // Only date-parse the DOB field

                        if (record.dateOfBirth) {
                            const original = record.dateOfBirth;

                            record.dateOfBirth = new Date(record.dateOfBirth);
                            if (isNaN(record.dateOfBirth)) record.dateOfBirth = null;

                            if (record.dateOfBirth === null) {
                                validationErrors.push(`Date of birth "${original}" didn't look like a valid date`);
                            }
                        }

                        record.isPremium = record.isPremium ? /^(?:true|t|1|yes|y|on|premium)$/i.test(record.isPremium) : null;
                        record.isPupilPreRegistration = /^(?:true|t|1|yes|y|on)$/i.test(record.isPupilPreRegistration);
                        record.isClassActive = /^(?:true|t|1|yes|y|on)$/i.test(record.isClassActive);
                        record.gender = /^(?:m|male)$/i.test(record.gender)
                            ? WondeGender.MALE
                            : /^(?:f|female)$/i.test(record.gender)
                              ? WondeGender.FEMALE
                              : WondeGender.OTHER;
                        record.UPN = record.UPN || null;

                        [1, 2].forEach((idx) => {
                            const lcEmail = (record[`parent${idx}Email`] as string | null)?.toLowerCase();
                            const phoneNoSpace = (record[`parent${idx}Phone`] as string | null)?.replace(/ /g, '');

                            record[`parent${idx}Email`] = emailValidationRegex.test(lcEmail) ? lcEmail : null;
                            record[`parent${idx}Phone`] = phoneValidationRegex.test(phoneNoSpace)
                                ? this.helperService.formatPhoneNumber(phoneNoSpace)
                                : null;

                            if (record[`parent${idx}Email`] === null && lcEmail) {
                                validationErrors.push(`Email "${lcEmail}" didn't look like a valid email`);
                            }

                            if (record[`parent${idx}Phone`] === null && phoneNoSpace) {
                                validationErrors.push(`Phone "${phoneNoSpace}" didn't look like a valid phone`);
                            }
                        });

                        return record;
                    }
                })
            );

            const usedIds = new Set();
            const usedUpns = new Set();

            for await (const untypedRecord of parsedStream) {
                const record = untypedRecord as CSVRow;
                const isPupilPreRegistration = record?.isPupilPreRegistration || false;
                const isClassActive = record?.isClassActive || false;

                if (!record.id && !record.UPN && !record.dateOfBirth) {
                    throw new Error(
                        `Error - no identifying characteristic specified for ${record.forename} ${record.surname} in ${record.className}`
                    );
                }

                if (record.id && usedIds.has(record.id)) {
                    throw new Error(`Error - duplicate ID in dataset for ID ${record.id}`);
                } else if (record.id) {
                    usedIds.add(record.id);
                }

                if (record.UPN && usedUpns.has(record.UPN)) {
                    throw new Error(`Error - duplicate UPN in dataset for UPN ${record.UPN}`);
                } else if (record.UPN) {
                    usedUpns.add(record.UPN);
                }

                const id = `CSV_${importedSchool.id}_${
                    record.id || record.UPN || getDigest(`F${record.forename};S${record.surname};D${record.dateOfBirth}`)
                }`;

                let matchingStudent = await importedStudentRepository
                    .createQueryBuilder('ws')
                    .innerJoin('ws.school', 'school', 'school.id = :schoolId', { schoolId: importedSchool.id })
                    .where((qb) => {
                        qb.where('ws.id = :id', { id })
                            .orWhere('ws.UPN = :upn', { upn: record.UPN || false })
                            .orWhere({
                                forename: record.forename,
                                surname: record.surname,
                                dateOfBirth: record.dateOfBirth,
                                isPreRegistration: isPupilPreRegistration
                            });
                    })
                    .orderBy(`CASE WHEN ws.id = :id THEN 1 WHEN ws.UPN = :upn THEN 2 ELSE 3 END`)
                    .getOne();

                if (matchingStudent) {
                    await importedStudentRepository.update(matchingStudent, {
                        dateOfBirth: record.dateOfBirth,
                        UPN: record.UPN,
                        forename: record.forename,
                        surname: record.surname,
                        gender: record.gender,
                        isPremium: record.isPremium,
                        isPreRegistration: isPupilPreRegistration
                    });
                } else {
                    const yearGroup = record.ncYear?.replace(/(?:^Year\s+|-)/i, '')?.toUpperCase() || 'Unknown';

                    matchingStudent = await importedStudentRepository.save(
                        importedStudentRepository.create({
                            ...record,
                            id,
                            importedFrom: ImportedType.CSV,
                            school: importedSchool,
                            details: JSON.stringify({ import_nc_year: yearGroup }),
                            isPreRegistration: isPupilPreRegistration
                        })
                    );
                }

                const periodIndex = isPupilPreRegistration ? currentPeriodIndex + 1 : currentPeriodIndex;

                if (record.className) {
                    let matchingClass = await importedSchoolClassRepository
                        .createQueryBuilder('wsc')
                        .innerJoin('wsc.school', 'school', 'school.id = :schoolId', { schoolId: importedSchool.id })
                        .innerJoin('wsc.period', 'period', 'period.index = :periodIndex', { periodIndex })
                        .where('wsc.name = :name', { name: record.className })
                        .getOne();

                    if (!matchingClass) {
                        matchingClass = await importedSchoolClassRepository.save(
                            importedSchoolClassRepository.create({
                                id: `CSV_${importedSchool.id}_${getDigest(`C${record.className};P${periodIndex}`)}`,
                                name: record.className,
                                school: importedSchool,
                                importedFrom: ImportedType.CSV,
                                period: { index: periodIndex } as StaticLwpPeriod,
                                linkedClassShouldBeActive: isClassActive
                            })
                        );
                    }

                    await manager.query(
                        'INSERT INTO imported_school_class_student ("importedSchoolClassId", "importedStudentId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [matchingClass.id, matchingStudent.id]
                    );
                }

                const matchingParents = [];

                for (let i = 1; i <= 2; i++) {
                    if (record[`parent${i}Forename`]) {
                        let matchingParent = await importedContactRepository
                            .createQueryBuilder('wc')
                            .innerJoin('wc.school', 'school', 'school.id = :schoolId', { schoolId: importedSchool.id })
                            .where([{ email: record[`parent${i}Email`] || false }, { phoneNumber: record[`parent${i}Phone`] || false }])
                            .getOne();

                        const importDetails = {
                            email: record[`parent${i}Email`],
                            phoneNumber: record[`parent${i}Phone`],
                            forename: record[`parent${i}Forename`],
                            surname: record[`parent${i}Surname`]
                        };

                        if (matchingParent) {
                            await importedContactRepository.update(matchingParent, importDetails);
                        } else {
                            matchingParent = await importedContactRepository.save(
                                importedContactRepository.create({
                                    ...importDetails,
                                    id: `CSV_${importedSchool.id}_${getDigest(`E${importDetails.email};P${importDetails.phoneNumber}`)}}`,
                                    school: importedSchool,
                                    importedFrom: ImportedType.CSV
                                })
                            );
                        }

                        const importedStudentContact = new ImportedStudentContact();

                        importedStudentContact.pupil_report = false;
                        importedStudentContact.parental_responsibility = true;
                        importedStudentContact.correspondence = false;
                        importedStudentContact.email_notification = null;
                        importedStudentContact.sms_notification = null;
                        importedStudentContact.mail_notification = null;
                        importedStudentContact.push_notification = null;
                        importedStudentContact.in_touch_communication = null;
                        importedStudentContact.priority = 1;
                        importedStudentContact.relationship = 'Unknown';
                        importedStudentContact.importedStudent = matchingStudent;
                        importedStudentContact.importedContact = matchingParent;
                        importedStudentContact.school = importedSchool;

                        await manager.save(importedStudentContact);

                        matchingParents.push(matchingParent);
                    }
                }
            }

            await manager.update(LwpSchool, thisSchool.id, { importStatus: ImportStatus.DATA_IMPORTED });

            await runner.commitTransaction();
            console.log('Finished import successfully.');
        } catch (e) {
            await runner.rollbackTransaction();
            throw e;
        } finally {
            await runner.release();
        }

        return validationErrors;
    }

    /**
     * promoteProposedSchool promotes the "proposed" imported school for a school to
     * the actual live imported school for a school, and removes the old imported data.
     *
     * @param {string} lwpSchoolId the school ID for which to promote the proposed school
     * @return {Promise<boolean>}
     * @memberof ImportedSchoolService
     */
    public async promoteProposedSchool(lwpSchoolId: string): Promise<boolean> {
        await this.connection.transaction(async (manager) => {
            const importedSchoolRepo = manager.getRepository(ImportedSchool);

            const proposedImportedSchool = await importedSchoolRepo.findOneOrFail({ where: { proposedSchool: { id: lwpSchoolId } } });
            const currentImportedSchool = await importedSchoolRepo.findOne({ where: { lwpSchool: { id: lwpSchoolId } } });

            await importedSchoolRepo.delete({ lwpSchool: { id: lwpSchoolId } });

            await importedSchoolRepo.update(
                { id: proposedImportedSchool.id },
                {
                    proposedSchool: null,
                    lwpSchool: { id: lwpSchoolId }
                }
            );

            if (currentImportedSchool) {
                for (const options of [
                    {
                        lwpTable: 'lwp_school_class',
                        importedColumn: 'importedSchoolClassId',
                        importedTable: 'imported_school_class'
                    },
                    {
                        lwpTable: 'lwp_pupil',
                        importedColumn: 'importedStudentId',
                        importedTable: 'imported_student'
                    },
                    {
                        lwpTable: 'lwp_user',
                        importedColumn: 'importedContactId',
                        importedTable: 'imported_contact'
                    }
                ]) {
                    await manager.query(
                        `
                        UPDATE ${options.lwpTable}
                        SET "${options.importedColumn}" = REPLACE("${options.importedColumn}", $1::varchar, $2::varchar)
                        WHERE
                            "${options.importedColumn}" LIKE CONCAT('CSV_', $1::varchar, '_%')
                            AND EXISTS (
                                SELECT
                                    1
                                FROM
                                    ${options.importedTable} it
                                WHERE
                                    it.id = REPLACE("${options.importedColumn}", $1::varchar, $2::varchar)
                            );`,
                        [currentImportedSchool.id, proposedImportedSchool.id]
                    );
                }
            }

            await manager.getRepository(LwpSchool).update(lwpSchoolId, {
                importedSchoolId: proposedImportedSchool.id,
                lastImportedAt: () => 'CURRENT_TIMESTAMP',
                importStatus: ImportStatus.DATA_IMPORTED
            });
        });

        return true;
    }

    /**
     * warnOnParentChange warns when the LwpSchool contains a child with parents whose details
     * are entirely different to the details of the parents in the proposed imported school.
     *
     * @param {string} lwpSchoolId the LWP school ID
     * @return null if no pupils need warning, or the details if they do
     * @memberof WondeService
     */
    public async warnOnParentChange(lwpSchoolId: string): Promise<null | ParentChangesResult[]> {
        const parentChangeQuery = await this.connection.query(
            `
                SELECT
                    import_data.*,
                    array_agg(concat(lu.firstname, ' ', lu.lastname)) AS "lu_names",
                    array_agg(lu.email)::varchar[] AS "lu_emails",
                    array_agg(lu."phoneNumber") AS "lu_phones"
                FROM (
                    SELECT
                        is2.id,
                        concat(is2.forename, ' ', is2.surname) AS "pupilName",
                        coalesce(lp_wID.id, lp_UPN.id) AS "pupilId",
                        array_agg(concat(ic.forename, ' ', ic.surname)) AS "ic_names",
                        array_agg(ic.email) AS "ic_emails",
                        array_agg(ic."phoneNumber") AS "ic_phones"
                    FROM
                        imported_student is2
                        JOIN imported_school is3 ON is2."schoolId" = is3.id and is3."proposedSchoolId" = $1
                        JOIN imported_student_contact isc ON isc."importedStudentId" = is2.id
                        JOIN imported_contact ic ON ic.id = isc."importedContactId"
                        LEFT JOIN lwp_pupil lp_wID ON is2.id = lp_wID."importedStudentId"
                                AND lp_wID."schoolId" = $1
                        LEFT JOIN lwp_pupil lp_UPN ON is2."UPN" = lp_UPN."UPN"
                                AND lp_UPN."schoolId" = $1
                            AND is2."UPN" IS NOT NULL
                            AND is2."UPN" != '[Unknown]'
                    GROUP BY
                        is2.id,
                        lp_wID.id,
                        lp_UPN.id) import_data
                    JOIN lwp_pupil_parent lpp ON import_data."pupilId" = lpp."pupilId"
                    JOIN lwp_user lu ON lu.id = lpp."parentId"
                GROUP BY
                    import_data.id,
                    import_data."pupilId",
                    import_data."pupilName",
                    import_data.ic_names,
                    import_data.ic_emails,
                    import_data.ic_phones
                HAVING
                    NOT ic_names && array_agg(concat(lu.firstname, lu.lastname))
                    AND NOT ic_emails && array_agg(lu.email)::varchar[]
                    AND NOT ic_phones && array_agg(lu."phoneNumber")
            `,
            [lwpSchoolId]
        );

        if (parentChangeQuery && Array.isArray(parentChangeQuery) && parentChangeQuery.length > 0) {
            return parentChangeQuery.map((data) => {
                return {
                    pupilId: data.pupilId,
                    pupilName: data.pupilName,
                    importedNames: data.ic_names,
                    importedEmails: data.ic_emails,
                    importedPhones: data.ic_phones,
                    lwpNames: data.lu_names,
                    lwpEmails: data.lu_emails,
                    lwpPhones: data.lu_phones
                };
            });
        }

        return null;
    }

    /**
     * warnOnMissedMatch warns when the LwpSchool may contain a duplicate
     * child, with the same proposed imported date of birth and a similar name.
     *
     * @param {string} lwpSchoolId the LWP school ID
     * @return null if no pupils need warning, or an array of arrays of confusable pairs if they do
     * @memberof WondeService
     */
    public async warnOnMissedMatch(lwpSchoolId: string): Promise<null | [string, string][]> {
        const missedMatchQuery = await this.connection.query(
            `
                SELECT
                    concat(lp.firstname, ' ', lp.lastname) as p1_name,
                    concat(is3.forename, ' ', is3.surname) as p2_name
                FROM
                    lwp_pupil lp
                    JOIN imported_student is2 ON lp."importedStudentId" = is2.id
                    JOIN imported_school isc2 ON isc2.id = is2."schoolId"
                    JOIN imported_school isc3 ON isc2."lwpSchoolId" = isc3."proposedSchoolId"
                    JOIN imported_student is3 ON is3."dateOfBirth" IS NOT DISTINCT FROM is2."dateOfBirth"
                        AND is3."schoolId" = isc3.id
                WHERE
                    lp."schoolId" = $1
                    AND (daitch_mokotoff (concat(is3.forename, is3.surname)) && daitch_mokotoff (concat(lp.firstname, lp.lastname))
                        OR levenshtein_less_equal (concat(is3.forename, is3.surname), concat(lp.firstname, lp.lastname), 3) <= 3)
                    AND is3."UPN" != is2."UPN"
                    AND REGEXP_REPLACE(is3.id, '^CSV_[^_]+_', '') != REGEXP_REPLACE(is2.id, '^CSV_[^_]+_', '')
            `,
            [lwpSchoolId]
        );

        if (missedMatchQuery && Array.isArray(missedMatchQuery) && missedMatchQuery.length > 0) {
            return missedMatchQuery.map((data) => {
                return [data.p1_name, data.p2_name];
            });
        }

        return null;
    }

    public async getWondeSchoolData(wondeSchoolId: string): Promise<WondeSchoolResponse> {
        const wondeHeader = this.getAuthHeaderForWonde();

        const wondeResponse = await this.httpService
            .get(this.getWondeApi(`schools/${wondeSchoolId}`), wondeHeader)
            .pipe(map((d: AxiosResponse) => d.data))
            .toPromise();

        return wondeResponse?.data;
    }
}
