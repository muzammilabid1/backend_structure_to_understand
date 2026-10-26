import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { parse } from 'csv-parse';
import prompt from 'prompt';
import { SchoolService } from 'src/api/service/school.service';
import { SchoolClassService } from 'src/api/service/school_class.service';
import { StaticLwpPeriodService } from 'src/api/service/static_period.service';
import { AppModule } from 'src/app.module';
import { UsersService } from 'src/auth/service/user.service';
import type { EntityManager } from 'typeorm';

type Properties = {
    inputCsvPath: string;
    userId: string;
    academicYear: string;
    isDryRun: boolean;
};

@Module({
    imports: [AppModule]
})
class ScriptModule {}

((): void => {
    if (!process.stdin.isTTY) {
        printErrorAndExit(new Error('Must be run interactively'));
    }

    prompt.start();

    prompt.get(
        [
            {
                name: 'inputCsvPath',
                description: 'Path to the CSV file containing school licence data',
                required: true,
                type: 'string'
            },
            {
                name: 'userId',
                description: 'ID of the LwP User ID to whom to attribute the changes',
                required: true,
                type: 'string'
            },
            {
                name: 'academicYear',
                description: 'The new academic year (period index) (e.g. 2025)',
                required: true,
                type: 'string'
            },
            {
                name: 'isDryRun',
                description: 'Whether to perform a dry run of the update',
                required: true,
                default: true,
                type: 'boolean'
            }
        ],
        (err, result) => {
            if (err) {
                printErrorAndExit(err);
            }

            void parseCsvAndUpdateSchoolLicences(result as unknown as Properties)
                .catch((err) => {
                    printErrorAndExit(err);
                })
                .then(() => {
                    process.exit(0);
                });
        }
    );
})();

const parseCsvAndUpdateSchoolLicences = async (props: Properties): Promise<void> => {
    const app = await NestFactory.createApplicationContext(ScriptModule);
    const userService = app.get(UsersService);
    const staticLwpPeriodService = app.get(StaticLwpPeriodService);
    const schoolService = app.get(SchoolService);
    const schoolClassService = app.get(SchoolClassService);

    const user = await userService.findById(props.userId);

    if (!user) {
        throw new Error('User not found');
    }

    if (props.isDryRun) {
        console.log('Dry run enabled, no changes will be made this time.\n');
    }

    const newPeriodIndex = parseInt(props.academicYear);

    if (!Number.isSafeInteger(newPeriodIndex)) {
        throw new Error('Invalid academic year');
    }

    const oldPeriodIndex = newPeriodIndex - 1;

    await schoolService.entityManager.transaction(async (manager) => {
        if (props.isDryRun) {
            console.log(
                `Dry run enabled, skipping updates to global academic years (would change from ${oldPeriodIndex} to ${newPeriodIndex})`
            );
        } else {
            await staticLwpPeriodService.updateStaticPeriod(
                {
                    index: oldPeriodIndex,
                    isCurrentPeriod: false,
                    isPreviousPeriod: true
                },
                user.id,
                manager
            );

            await staticLwpPeriodService.updateStaticPeriod(
                {
                    index: newPeriodIndex,
                    isCurrentPeriod: true,
                    isPreviousPeriod: false
                },
                user.id,
                manager
            );
        }

        const allActiveSchools = await schoolService.getSchools(manager);

        for (const school of allActiveSchools) {
            if (!school.isTestSchool) {
                // Must run before the school's period is advanced, while these classes still qualify
                // as pre-admission.
                const convertedClasses = await schoolClassService.convertPreAdmissionClassesToGroups(
                    school.id,
                    newPeriodIndex,
                    user.id,
                    manager,
                    props.isDryRun
                );

                if (convertedClasses.length) {
                    const classNames = convertedClasses.map((schoolClass) => schoolClass.name).join(', ');

                    console.log(
                        `${props.isDryRun ? 'Dry run enabled, would convert' : 'Converted'} ${convertedClasses.length} pre-admission Ready Teddy class(es) ` +
                            `to groups across classes for ${school.schoolName}: ${classNames}`
                    );
                }

                if (props.isDryRun) {
                    console.log(`Dry run enabled, skipping update to ${school.schoolName} academic year`);
                } else {
                    // Conversion is already handled above.
                    const convertPreAdmissionClasses = false;

                    await schoolService.changeSchoolPeriod(school.id, newPeriodIndex, user.id, convertPreAdmissionClasses, manager);
                }

                await updateSchoolLicence(manager, schoolService, user.id, props.academicYear, props.isDryRun, {
                    schoolName: school.schoolName,
                    schoolUrn: school.urn,
                    numFullProgrammeClasses: '0',
                    totalLicences: '0'
                });
            }
        }

        await pipeline(
            createReadStream(props.inputCsvPath, { encoding: 'utf8' }),
            parse({
                skip_empty_lines: true,
                columns: true
            }),
            async function* (parsed) {
                for await (const row of parsed) {
                    yield await updateSchoolLicence(manager, schoolService, user.id, props.academicYear, props.isDryRun, row);
                }
            }
        );
    });
};

type Row = {
    schoolName?: string;
    schoolUrn?: string;
    numFullProgrammeClasses?: string;
    totalLicences?: string;
    moneySkillsEnabled?: string;
};

const updateSchoolLicence = async (
    manager: EntityManager,
    schoolService: SchoolService,
    userId: string,
    periodIndex: string,
    isDryRun: boolean,
    row: Row
): Promise<void> => {
    const numFullProgrammeClasses = parseInt(row.numFullProgrammeClasses || '0');
    const totalNumClasses = parseInt(row.totalLicences || '0');
    const moneySkillsEnabled = row.moneySkillsEnabled?.toLowerCase() === 'true';

    if (!Number.isSafeInteger(numFullProgrammeClasses) || !Number.isSafeInteger(totalNumClasses)) {
        throw new Error('Invalid licence data');
    }

    const school = await schoolService.getSchoolByNameAndOrUrn(row.schoolName, row.schoolUrn, manager);

    if (!school) {
        console.log('================================================================');
        console.log(`No school found for name ${row.schoolName} and/or URN ${row.schoolUrn}; skipping...`);

        return;
    }

    if (isDryRun) {
        console.log('================================================================');
        console.log(
            `Proposing to update school ${school.id} (${school.schoolName}) with the following license info for period ${periodIndex}:`
        );
        console.log(`Num Full Programme classes allowed: ${numFullProgrammeClasses}`);
        console.log(`Total number of classes allowed: ${totalNumClasses}`);
        console.log(`Money Skills enabled: ${moneySkillsEnabled}`);
        console.log('');
    } else {
        if (moneySkillsEnabled) {
            await schoolService.enableMoneySkillsForSchool(school.id, userId, false, manager);
        }

        await schoolService.updateSchoolClassLicence(
            {
                schoolId: school.id,
                fullProgrammedClassesAllowed: numFullProgrammeClasses,
                classesAllowed: totalNumClasses
            },
            userId,
            periodIndex,
            manager
        );
    }
};

const printErrorAndExit = (err: unknown): void => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
};
