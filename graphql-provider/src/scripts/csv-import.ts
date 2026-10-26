import crypto from 'node:crypto';
import { formatWithOptions } from 'node:util';

import { NestFactory } from '@nestjs/core';
import chalk from 'chalk';
import { parse } from 'csv-parse';
import { readFileSync } from 'fs';
import { emailRegex, phoneRegex } from 'lwp-shared/validations/user';
import prompt from 'prompt';
import { ImportedContact } from 'src/api/entities/imported_contact';
import { ImportedSchool } from 'src/api/entities/imported_school';
import { ImportedSchoolClass } from 'src/api/entities/imported_school_class';
import { ImportedStudent } from 'src/api/entities/imported_student';
import { LwpSchool } from 'src/api/entities/school';
import { StaticLwpYearGroup } from 'src/api/entities/year_group';
import { ImportedType, WondeGender } from 'src/api/model';
import { HelperService } from 'src/api/service/helper.service';
import { BaseModule } from 'src/base.module';
import { Connection } from 'typeorm';

process.env.ALLOW_SCHEDULING = 'false';

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
};

const emailValidationRegex = new RegExp(emailRegex);
const phoneValidationRegex = new RegExp(phoneRegex);

function bootstrap(): void {
    if (!process.stdin.isTTY) {
        console.log('Must be run interactively');

        return;
    }

    prompt.start();

    prompt.get(
        [
            {
                name: 'schoolId',
                description: 'LWP school ID to import into',
                required: true,
                type: 'string'
            },
            {
                name: 'importFilePath',
                description: 'Path to CSV file to import',
                required: true
            }
        ],
        // We don't actually care about the result of this being parsed by prompt:
        // it shouldn't be doing that anyway. This code is CLI-run, so if it
        // crashes, it crashes; it doesn't affect the rest of the app.
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        async (err, result) => {
            if (err) {
                console.log(err);

                return;
            }

            const lwpSchoolId = result.schoolId as string;

            const app = await NestFactory.createApplicationContext(BaseModule);

            const helperService = app.get(HelperService);

            const connection = app.get(Connection);
            const runner = connection.createQueryRunner('master');

            await runner.connect();
            await runner.startTransaction();

            const manager = runner.manager;

            const lwpSchoolRepository = manager.getRepository(LwpSchool);
            const thisSchool = await lwpSchoolRepository.findOne(lwpSchoolId);

            if (!thisSchool) {
                console.error("That school ID doesn't exist");
                process.exit(1);
            }

            const importedSchoolRepository = manager.getRepository(ImportedSchool);
            let importedSchool = await importedSchoolRepository.findOne({ where: { proposedSchool: thisSchool } });

            if (!importedSchool) {
                importedSchool = await importedSchoolRepository.save(
                    importedSchoolRepository.create({
                        id: `CSV-${crypto.randomUUID()}`,
                        name: thisSchool.schoolName,
                        proposedSchool: thisSchool
                    })
                );
            }

            console.log(`Importing into school ${thisSchool.schoolName}`);

            const importedStudentRepository = manager.getRepository(ImportedStudent);
            const importedSchoolClassRepository = manager.getRepository(ImportedSchoolClass);
            const importedContactRepository = manager.getRepository(ImportedContact);
            const staticLwpYearGroupRepository = manager.getRepository(StaticLwpYearGroup);

            await importedStudentRepository.delete({ school: importedSchool });
            await importedSchoolClassRepository.delete({ school: importedSchool });
            await importedContactRepository.delete({ school: importedSchool });

            const fileContent = readFileSync(result.importFilePath as string);
            const parser = parse(fileContent, {
                columns: [
                    'id',
                    'forename',
                    'surname',
                    'dateOfBirth',
                    'UPN',
                    'gender',
                    'isPremium',
                    'ncYear',
                    'className',
                    'classYearGroup',
                    'parent1Email',
                    'parent1Phone',
                    'parent1Forename',
                    'parent1Surname',
                    'parent2Email',
                    'parent2Phone',
                    'parent2Forename',
                    'parent2Surname'
                ],
                relax_column_count_less: true,
                trim: true,
                fromLine: 2,
                bom: true,
                on_record: (record) => {
                    // Only date-parse the DOB field
                    record.dateOfBirth = record.dateOfBirth ? new Date(record.dateOfBirth) : null;
                    record.isPremium = /^(?:true|1|on|yes|premium)$/i.test(record.isPremium);
                    record.gender = /^(?:m|male)$/i.test(record.gender)
                        ? WondeGender.MALE
                        : /^(?:f|female)$/i.test(record.gender)
                          ? WondeGender.FEMALE
                          : WondeGender.OTHER;
                    record.UPN = record.UPN || null;

                    [1, 2].forEach((idx) => {
                        const lcEmail = (record[`parent${idx}Email`] as string).toLowerCase();
                        const phoneNoSpace = (record[`parent${idx}Phone`] as string).replace(/ /g, '');

                        record[`parent${idx}Email`] = emailValidationRegex.test(lcEmail) ? lcEmail : null;
                        record[`parent${idx}Phone`] = phoneValidationRegex.test(phoneNoSpace)
                            ? helperService.formatPhoneNumber(phoneNoSpace)
                            : null;
                    });

                    return record;
                }
            });

            const usedIds = new Set();
            const usedUpns = new Set();

            for await (const untypedRecord of parser) {
                const record = untypedRecord as CSVRow;

                if (record.id && usedIds.has(record.id)) {
                    console.error(`Error - duplicate ID in dataset for ID ${record.id}`);
                    process.exit(1);
                } else if (record.id) {
                    usedIds.add(record.id);
                }

                if (record.UPN && usedUpns.has(record.UPN)) {
                    console.error(`Error - duplicate UPN in dataset for UPN ${record.UPN}`);
                    process.exit(1);
                } else if (record.UPN) {
                    usedUpns.add(record.UPN);
                }

                const id = `CSV_${thisSchool.id}_${record.id || crypto.randomUUID()}`;

                let matchingStudent = await importedStudentRepository
                    .createQueryBuilder('ws')
                    .innerJoin('ws.school', 'school', 'school.id = :schoolId', { schoolId: importedSchool.id })
                    .where((qb) => {
                        qb.where('ws.id = :id', { id })
                            .orWhere('ws.UPN = :upn', { upn: record.UPN || false })
                            .orWhere({
                                forename: record.forename,
                                surname: record.surname,
                                dateOfBirth: record.dateOfBirth
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
                        isPremium: record.isPremium
                    });
                    await matchingStudent.reload();
                } else {
                    matchingStudent = await importedStudentRepository.save(
                        importedStudentRepository.create({
                            ...record,
                            id,
                            importedFrom: ImportedType.CSV,
                            school: importedSchool
                        })
                    );
                }

                const yearGroup = record.ncYear.replace(/(?:^Year\s+|-)/i, '');
                const ygShortMatch = yearGroup.toUpperCase();

                let matchingClass: ImportedSchoolClass | undefined;

                if (record.className) {
                    matchingClass = await importedSchoolClassRepository
                        .createQueryBuilder('wsc')
                        .innerJoin('wsc.school', 'school', 'school.id = :schoolId', { schoolId: importedSchool.id })
                        .where('wsc.name = :name', { name: record.className })
                        .getOne();

                    if (!matchingClass) {
                        matchingClass = await importedSchoolClassRepository.save(
                            importedSchoolClassRepository.create({
                                id: `CSV_${thisSchool.id}_${crypto.randomUUID()}`,
                                name: record.className,
                                yearGroup: await staticLwpYearGroupRepository
                                    .createQueryBuilder()
                                    .where({ year: yearGroup })
                                    .orWhere({ shortName: ygShortMatch })
                                    .getOneOrFail(),
                                school: importedSchool,
                                importedFrom: ImportedType.CSV
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
                            await matchingParent.reload();
                        } else {
                            matchingParent = await importedContactRepository.save(
                                importedContactRepository.create({
                                    ...importDetails,
                                    id: `CSV_${thisSchool.id}_${crypto.randomUUID()}`,
                                    school: importedSchool,
                                    importedFrom: ImportedType.CSV
                                })
                            );
                        }

                        matchingParents.push(matchingParent);
                    }
                }

                console.log(
                    formatWithOptions(
                        { colors: true },
                        `---
            Student: %j
            Parent 1: %j
            Parent 2: %j
            Class: %j`,
                        matchingStudent,
                        matchingParents[0],
                        matchingParents[1],
                        matchingClass
                    )
                );
            }

            console.log(`---`);

            prompt.get(
                {
                    name: 'confirm',
                    description: `Do you want to write this to the database to imported school ${importedSchool.name} (${importedSchool.id})?`,
                    pattern: /y[es]*|n[o]?/i,
                    messages: {
                        pattern: 'Must respond yes or no'
                    },
                    default: 'no'
                },
                function (err, confirm) {
                    if (!err && (confirm.confirm as string).at(0).toLowerCase() === 'y') {
                        runner
                            .commitTransaction()
                            .then(() => {
                                console.log(chalk.green('Done!'));
                                process.exit(0);
                            })
                            .catch((err) => {
                                console.error(err);
                                process.exit(1);
                            });
                    } else {
                        if (err) console.error(err);

                        runner
                            .rollbackTransaction()
                            .then(() => {
                                process.exit(1);
                            })
                            .catch((err) => {
                                console.error(err);
                                process.exit(1);
                            });
                    }
                }
            );
        }
    );
}

bootstrap();
