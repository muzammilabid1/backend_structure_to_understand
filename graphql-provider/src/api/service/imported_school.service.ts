import crypto from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { parse } from 'csv-parse';
import { FileUpload } from 'graphql-upload';
import { ImportStatus } from 'lwp-shared';
import { emailRegex, phoneRegex } from 'lwp-shared/validations/user';
import { Readable } from 'stream';
import { Connection, Repository } from 'typeorm';

import { ParentChangesResult } from '../dtos/ImportedSchoolCheckResult';
import { ImportedContact } from '../entities/imported_contact';
import { ImportedSchool } from '../entities/imported_school';
import { ImportedSchoolClass } from '../entities/imported_school_class';
import { ImportedStudent } from '../entities/imported_student';
import { ImportedStudentContact } from '../entities/imported_student_contact';
import { LwpSchool } from '../entities/school';
import { StaticLwpPeriod } from '../entities/static_period';
import { ImportedType, WondeGender } from '../model';
import { HelperService } from './helper.service';
import { StaticLwpPeriodService } from './static_period.service';

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
export class ImportedSchoolService {
    constructor(
        @InjectRepository(ImportedSchool)
        private importedSchoolRepository: Repository<ImportedSchool>,
        @InjectRepository(LwpSchool)
        private schoolRepository: Repository<LwpSchool>,
        private helperService: HelperService,
        private staticPeriodService: StaticLwpPeriodService,
        private connection: Connection
    ) {}

    public async getImportedSchoolClasses(wondeSchoolId: string): Promise<ImportedSchoolClass[]> {
        const importedSchool = await this.importedSchoolRepository
            .createQueryBuilder('importedSchool')
            .leftJoinAndSelect('importedSchool.classes', 'classes')
            .where('importedSchool.id = :id', { id: wondeSchoolId })
            .orderBy('classes.name', 'ASC')
            .getOne();

        if (importedSchool?.classes) return importedSchool.classes;

        return null;
    }

    public async getImportedSchoolContacts(wondeSchoolId: string): Promise<ImportedContact[]> {
        const importedSchool = await this.importedSchoolRepository
            .createQueryBuilder('importedSchool')
            .leftJoinAndSelect('importedSchool.importedContacts', 'importedContacts')
            .where('importedSchool.id = :id', { id: wondeSchoolId })
            .orderBy('importedContacts.forename', 'ASC')
            .getOne();

        if (importedSchool?.importedContacts) return importedSchool.importedContacts;

        return null;
    }

    public async getWondeSchoolStudentContacts(wondeSchoolId: string): Promise<ImportedStudentContact[]> {
        const importedSchool = await this.importedSchoolRepository
            .createQueryBuilder('importedSchool')
            .leftJoinAndSelect('importedSchool.importedStudentContacts', 'importedStudentContacts')
            .where('importedSchool.id = :id', { id: wondeSchoolId })
            .getOne();

        if (importedSchool?.importedStudentContacts) return importedSchool.importedStudentContacts;

        return null;
    }

    public async getImportedSchoolStudents(wondeSchoolId: string): Promise<ImportedStudent[]> {
        const importedSchool = await this.importedSchoolRepository
            .createQueryBuilder('importedSchool')
            .leftJoinAndSelect('importedSchool.importedStudents', 'importedStudents')
            .where('importedSchool.id = :id', { id: wondeSchoolId })
            .orderBy('importedStudents.forename', 'ASC')
            .getOne();

        if (importedSchool?.importedStudents) return importedSchool.importedStudents;

        return null;
    }

    public async getLwpSchool(wondeSchoolId: string): Promise<LwpSchool> {
        const importedSchool = await this.importedSchoolRepository
            .createQueryBuilder('importedSchool')
            .leftJoinAndSelect('importedSchool.lwpSchool', 'lwpSchool')
            .where('importedSchool.id = :id', { id: wondeSchoolId })
            .getOne();

        return importedSchool?.lwpSchool ? importedSchool?.lwpSchool : null;
    }

    public async getWondeSchoolPeriod(wondeSchoolId: string): Promise<StaticLwpPeriod> {
        const importedSchool = await this.importedSchoolRepository
            .createQueryBuilder('importedSchool')
            .leftJoinAndSelect('importedSchool.period', 'period')
            .where('importedSchool.id = :id', { id: wondeSchoolId })
            .getOne();

        return importedSchool?.period ? importedSchool?.period : null;
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
            const currentPeriodIndex = await this.staticPeriodService.getCurrentPeriodIndex(manager);

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

            await manager.update(LwpSchool, thisSchool.id, {
                importStatus: ImportStatus.DATA_IMPORTED,
                lastImportedAt: () => 'CURRENT_TIMESTAMP'
            });

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
}
