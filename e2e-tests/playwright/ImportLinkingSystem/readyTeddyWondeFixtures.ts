/* Shared fixtures for the Ready Teddy year-switch / Wonde-review journeys.
 *
 * Both the assertion spec (ready-teddy-wonde-review.spec.ts) and the recorded walkthrough
 * (ready-teddy-wonde-review.walkthrough.spec.ts) drive the same school through the same
 * rollover, so the seeding, the routing predicates and the teardown live here rather than
 * being duplicated. Nothing in this module asserts anything about the journey itself -
 * that belongs to the specs.
 */
import type { Schema } from '@lwp/postgres-client';
import { expect, type Page } from '@playwright/test';
import { type Kysely, type Selectable, sql } from 'kysely';
import { ImportStatus } from 'lwp-shared';

import { admin, generateFirstName, generateLastName, generateSchoolName, generateUserEmail, generateUPN, password } from '../constants';
import { createUtils } from '../dbUtils';
import { changeSchoolPeriod, getTokenFromLogin, reimportCachedData } from '../graphql';

// Mirrors CREATE_GROUP_FOR_RT_CLASSES_TAG in graphql-provider school_class.service.
export const CONVERSION_TAG = 'CREATE_GROUP_FOR_RT_CLASSES';
const TAG_MARKER_COLOR = 'rtwtest';

export type Fixtures = {
    schoolId: string;
    leaderId: string;
    leaderEmail: string;
    importedSchoolId: string;
    classId: string;
    className: string;
    pupils: Array<Selectable<Schema.LwpPupil>>;
    parentIds: string[];
    oldPeriodIndex: number;
    newPeriodIndex: number;
    createdTagId: string | null;
};

/* The login endpoint is rate limited, so a suite that logs in once per operation trips it. One
 * admin token is fetched lazily here and shared by every caller that needs one. */
let cachedAdminToken: string | null = null;

export const adminAccessToken = async (): Promise<string> => {
    if (!cachedAdminToken) {
        const login = await getTokenFromLogin(admin, password);

        cachedAdminToken = login.accessToken;
    }

    return cachedAdminToken;
};


/* The helpers close over the connection, so they are handed one rather than opening their own:
 * a spec owns its Kysely instance and destroys it in afterAll. */
export const createReadyTeddyFixtures = (db: Kysely<Schema.DB>) => {
    const utils = createUtils(db);

    /* Mirrors DataImportService.isReviewRequiredForSchool: is the school routed to the
     * review-based import (true) or the regular legacy Wonde sync (false)? Ready Teddy
     * provision alone decides it - every import is reviewed, not just the first of the
     * academic year, because reception pupils and whole reception classes arrive in the
     * MIS throughout it. */
    const reviewRequired = async (schoolId: string): Promise<boolean> => {
        const result = await sql<{ required: boolean }>`
            select exists (
                select 1
                from lwp_school ls
                join lwp_school_class lsc
                    on lsc."schoolId" = ls.id
                    and lsc."isReadyTeddyEnabled" = true
                    and lsc.status = 'ACTIVE'
                    and (lsc."isRegistrationClass" = true or lsc."isGroupAcrossClasses" = true)
                    and lsc."periodIndex" >= ls."curentPeriodIndex"
                where ls.id = ${schoolId}
            ) as required
        `.execute(db);

        return result.rows[0].required;
    };

    /* Mirrors the school-selection expression the nightly cron inlines in
     * SchoolService.reimportSchoolsWondeData - a second implementation of the routing
     * predicate, asserted separately so the two cannot drift apart unnoticed. */
    const cronWouldUseReviewImport = async (schoolId: string): Promise<boolean> => {
        const result = await sql<{ required: boolean }>`
            select exists (
                    select 1
                    from lwp_school_class lsc
                    where lsc."schoolId" = school.id
                        and lsc."isReadyTeddyEnabled" = true
                        and lsc.status = 'ACTIVE'
                        and (lsc."isRegistrationClass" = true or lsc."isGroupAcrossClasses" = true)
                        and lsc."periodIndex" >= school."curentPeriodIndex"
                ) as required
            from lwp_school school where school.id = ${schoolId}
        `.execute(db);

        return result.rows[0].required;
    };

    /* Both routing implementations, which must always agree. */
    const expectRouting = async (schoolId: string, requiresReview: boolean): Promise<void> => {
        expect(await reviewRequired(schoolId)).toBe(requiresReview);
        expect(await cronWouldUseReviewImport(schoolId)).toBe(requiresReview);
    };

    /* Pre-rollover Ready Teddy school: still on the previous academic year with last year's
     * sync COMPLETE, a pre-admission Ready Teddy class on the incoming year, and its


    /* Pre-rollover Ready Teddy school: still on the previous academic year with last year's
     * sync COMPLETE, a pre-admission Ready Teddy class on the incoming year, and its
     * Wonde-shadow school. Tagged schools get their cohort converted at the year switch. */
    const seedSchool = async (input: { tagged: boolean }): Promise<Fixtures> => {
        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();
        const newPeriodIndex = currentPeriod.index;
        const oldPeriodIndex = newPeriodIndex - 1;

        await db
            .selectFrom('static_lwp_period')
            .where('index', '=', oldPeriodIndex)
            .select('index')
            .executeTakeFirstOrThrow(() => new Error(`static period ${oldPeriodIndex} must exist to seed a pre-rollover school`));

        const passwordDonor = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();

        const school = await utils.createSchool({
            schoolName: generateSchoolName(),
            curentPeriodIndex: oldPeriodIndex,
            isReadyTeddyAvailable: true,
            numOfFullProgrammeClassesAllowed: 5,
            numOfTotalClassesAllowed: 10,
            enableAddClasses: true,
            importStatus: ImportStatus.COMPLETE,
            logCreatedById: passwordDonor.id,
            logUpdatedById: passwordDonor.id
        });

        const leaderFirstname = generateFirstName();
        const leaderLastname = generateLastName();
        const leaderEmail = generateUserEmail(leaderFirstname, leaderLastname);
        const leader = await utils.createUser({
            firstname: leaderFirstname,
            lastname: leaderLastname,
            email: leaderEmail,
            type: 'TEACHER',
            userStatus: 'ACTIVE',
            isSchoolLeader: true,
            schoolId: school.id,
            password: passwordDonor.password,
            nameForChildren: `Mr ${leaderFirstname}`
        });

        const importedSchool = await utils.createImportedSchool({
            id: `rtw${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
            name: school.schoolName,
            lwpSchoolId: school.id,
            importedFrom: 'WONDE',
            periodIndex: newPeriodIndex
        });

        await db
            .updateTable('lwp_school')
            .set({ importedSchoolId: importedSchool.id, misIntegration: 'Wonde' })
            .where('id', '=', school.id)
            .execute();

        let createdTagId: string | null = null;

        if (input.tagged) {
            const existingTag = await db.selectFrom('static_lwp_school_tag').where('name', '=', CONVERSION_TAG).select('id').executeTakeFirst();
            let tagId = existingTag?.id;

            if (!tagId) {
                const tag = await db
                    .insertInto('static_lwp_school_tag')
                    .values({ name: CONVERSION_TAG, color: TAG_MARKER_COLOR })
                    .returning('id')
                    .executeTakeFirstOrThrow();

                tagId = tag.id;
                createdTagId = tag.id;
            }

            await db.insertInto('lwp_school_static_tags').values({ schoolId: school.id, tagId, isProgramTag: false }).execute();
        }

        // The pre-admission Ready Teddy cohort, on the incoming academic year.
        const className = 'Reception (Ready Teddy)';
        const schoolClass = await utils.createClass(school.id, {
            name: className,
            periodIndex: newPeriodIndex,
            isReadyTeddyEnabled: true,
            IsReadingLogsEnabled: false,
            isFullProgramme: false,
            isRegistrationClass: true,
            isGroupAcrossClasses: false,
            status: 'ACTIVE'
        });

        const pupils: Array<Selectable<Schema.LwpPupil>> = [];
        const parentIds: string[] = [];

        for (let i = 0; i < 3; i++) {
            const pupil = await utils.createPupil(school.id, {
                firstname: generateFirstName(),
                lastname: generateLastName(),
                UPN: generateUPN(),
                dateOfBirth: `2022-03-${String(i + 10).padStart(2, '0')}`,
                gender: 'MALE'
            });

            pupils.push(pupil);
            await utils.addPupilToClass(pupil.id, schoolClass.id);

            /* A registered parent, as a Ready Teddy cohort has by the end of its pre-admission year.
             * It also keeps the pupil's identity stable across the relink: that deletes and recreates
             * imported pupils with no parent and no feedback at all, which would take their group
             * membership with them. */
            const parentFirstname = generateFirstName();
            const parentLastname = generateLastName();
            const parent = await utils.createUser({
                firstname: parentFirstname,
                lastname: parentLastname,
                email: generateUserEmail(parentFirstname, parentLastname),
                type: 'PARENT',
                userStatus: 'ACTIVE',
                schoolId: school.id,
                password: passwordDonor.password
            });

            parentIds.push(parent.id);
            await utils.addParentToPupil(pupil.id, parent.id, false);
        }

        return {
            schoolId: school.id,
            leaderId: leader.id,
            leaderEmail,
            importedSchoolId: importedSchool.id,
            classId: schoolClass.id,
            className,
            pupils,
            parentIds,
            oldPeriodIndex,
            newPeriodIndex,
            createdTagId
        };
    };


    // Matches how the import pipeline stores it: a JSON string inside the json column.
    const importedStudentDetails = (): string => JSON.stringify(JSON.stringify({ import_nc_year: '1' }));

    const seedImportedStudent = async (
        fixtures: Fixtures,
        fields: { forename: string; surname: string; UPN: string; dateOfBirth: string }
    ): Promise<Selectable<Schema.ImportedStudent>> => {
        const id = `rtw${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

        return await utils.createImportedStudent(fixtures.importedSchoolId, {
            id,
            mis_id: id,
            schoolId: fixtures.importedSchoolId,
            importedFrom: 'WONDE',
            initials: '[Unknown]',
            gender: 'MALE',
            isPremium: false,
            details: importedStudentDetails(),
            ...fields
        });
    };

    /* The real year switch, exactly as operations runs it: the admin changeSchoolPeriod
     * mutation converts tagged schools' pre-admission cohorts, advances the period, and
     * resets the import status. The nightly sync would then park the school at
     * WRONG_ACADEMIC_YEAR until the MIS holds the new year's data - simulated here so the


    /* The real year switch, exactly as operations runs it: the admin changeSchoolPeriod
     * mutation converts tagged schools' pre-admission cohorts, advances the period, and
     * resets the import status. The nightly sync would then park the school at
     * WRONG_ACADEMIC_YEAR until the MIS holds the new year's data - simulated here so the
     * leader sees the sync prompt. */
    const rollOverSchool = async (fixtures: Fixtures): Promise<void> => {
        const accessToken = await adminAccessToken();

        await changeSchoolPeriod(accessToken, fixtures.schoolId, fixtures.newPeriodIndex);

        const school = await db
            .selectFrom('lwp_school')
            .where('id', '=', fixtures.schoolId)
            .select(['curentPeriodIndex', 'importStatus'])
            .executeTakeFirstOrThrow();

        expect(school.curentPeriodIndex).toBe(fixtures.newPeriodIndex);
        expect(school.importStatus).toBeNull();

        await db
            .updateTable('lwp_school')
            .set({ importStatus: ImportStatus.WRONG_ACADEMIC_YEAR })
            .where('id', '=', fixtures.schoolId)
            .execute();
    };

    /* Fake the Wonde sync: when the leader's click fires resyncWondeData, hand the school
     * to the review state machine instead of pulling from Wonde (the imported rows are

     * to the review state machine instead of pulling from Wonde (the imported rows are
     * already seeded), then answer with the real resulting status. */
    const interceptWondeSync = async (page: Page, fixtures: Fixtures): Promise<void> => {
        await page.route('**/graphql', async (route) => {
            if (route.request().postDataJSON()?.operationName !== 'resyncWondeData') return route.fallback();

            await db
                .updateTable('lwp_school')
                .set({ importStatus: ImportStatus.DATA_IMPORTED, lastImportedAt: new Date() })
                .where('id', '=', fixtures.schoolId)
                .execute();

            const accessToken = await adminAccessToken();

            await reimportCachedData(accessToken, fixtures.importedSchoolId, fixtures.schoolId);

            const school = await db
                .selectFrom('lwp_school')
                .where('id', '=', fixtures.schoolId)
                .select(['importStatus', 'lastImportedAt'])
                .executeTakeFirstOrThrow();

            await route.fulfill({
                json: {
                    data: {
                        resyncWondeData: {
                            __typename: 'ResyncWondeDataOutPut',
                            importStatus: school.importStatus,
                            lastImportedAt: school.lastImportedAt
                        }
                    }
                }
            });
        });
    };

    const cleanup = async (fixtures: Fixtures): Promise<void> => {
        await db.deleteFrom('imported_school_data_proposed_link').where('platformSchoolId', '=', fixtures.schoolId).execute();
        await db.deleteFrom('imported_school_data_proposed_change').where('platformSchoolId', '=', fixtures.schoolId).execute();
        await db
            .updateTable('lwp_pupil')
            .set({ importedStudentId: null })
            .where('schoolId', '=', fixtures.schoolId)
            .execute();
        await db.deleteFrom('imported_student').where('schoolId', '=', fixtures.importedSchoolId).execute();
        await sql`
            delete from lwp_class_pupil
            where "lwpSchoolClassId" in (select id from lwp_school_class where "schoolId" = ${fixtures.schoolId})
        `.execute(db);
        await sql`
            delete from log_lwp_pupil_class_change
            where "pupilId" in (select id from lwp_pupil where "schoolId" = ${fixtures.schoolId})
        `.execute(db);
        await sql`
            delete from lwp_pupil_parent
            where "pupilId" in (select id from lwp_pupil where "schoolId" = ${fixtures.schoolId})
        `.execute(db);
        await db.deleteFrom('lwp_school_class').where('schoolId', '=', fixtures.schoolId).execute();
        await db.deleteFrom('imported_school_class').where('schoolId', '=', fixtures.importedSchoolId).execute();
        await db.deleteFrom('lwp_pupil').where('schoolId', '=', fixtures.schoolId).execute();
        if (fixtures.parentIds.length) await db.deleteFrom('lwp_user').where('id', 'in', fixtures.parentIds).execute();
        await db.deleteFrom('lwp_school_static_tags').where('schoolId', '=', fixtures.schoolId).execute();
        if (fixtures.createdTagId) await db.deleteFrom('static_lwp_school_tag').where('id', '=', fixtures.createdTagId).execute();
        await db.updateTable('lwp_school').set({ importedSchoolId: null }).where('id', '=', fixtures.schoolId).execute();
        await db.deleteFrom('imported_school').where('id', '=', fixtures.importedSchoolId).execute();
        await utils.deleteUser(fixtures.leaderId);
        await utils.deleteSchool(fixtures.schoolId);
    };

    return {
        // The raw dbUtils, so a spec can seed MIS rows specific to its own journey.
        utils,
        reviewRequired,
        cronWouldUseReviewImport,
        expectRouting,
        seedSchool,
        seedImportedStudent,
        rollOverSchool,
        interceptWondeSync,
        cleanup
    };
};
