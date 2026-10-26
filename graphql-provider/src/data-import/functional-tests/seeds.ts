import type { Schema } from '@lwp/postgres-client';
import { type Kysely, sql } from 'kysely';
import type { ImportStatus } from 'src/data-import/types/import-status';

export const createTestSchool = async (db: Kysely<Schema.DB>): Promise<Schema.LwpSchool> => {
    const x = await db
        .insertInto('lwp_school')
        .values([
            {
                schoolName: 'Data imports test school',
                isTestSchool: true
            }
        ])
        .returningAll()
        .executeTakeFirst();

    return x as unknown as Schema.LwpSchool;
};

export const updateTestSchool = async (
    db: Kysely<Schema.DB>,
    id: string,
    fields: Partial<Pick<Schema.LwpSchool, 'importStatus' | 'importedSchoolId'>>
): Promise<void> => {
    await db.updateTable('lwp_school').set(fields).where('isTestSchool', '=', true).where('id', '=', id).execute();
};

export const deleteTestSchool = async (db: Kysely<Schema.DB>, id: string): Promise<void> => {
    await db.deleteFrom('lwp_school').where('isTestSchool', '=', true).where('id', '=', id).execute();
};

export const createTestImportedSchool = async (db: Kysely<Schema.DB>, platformSchoolId: string): Promise<Schema.ImportedSchool> => {
    const importedSchool = await db
        .insertInto('imported_school')
        .values([
            {
                id: crypto.randomUUID(),
                lwpSchoolId: platformSchoolId
            }
        ])
        .returningAll()
        .executeTakeFirst();

    await updateTestSchool(db, platformSchoolId, { importedSchoolId: String(importedSchool.id) });

    return importedSchool as unknown as Schema.ImportedSchool;
};

export const updateTestImportedSchool = async (db: Kysely<Schema.DB>, id: string, fields: { lwpSchoolId: string }): Promise<void> => {
    await db.updateTable('imported_school').set(fields).where('id', '=', id).execute();
};

export const deleteTestImportedSchool = async (db: Kysely<Schema.DB>, id: string): Promise<void> => {
    await db.deleteFrom('imported_school').where('id', '=', id).execute();
};

const getRandomUpn = (isTemporary: boolean = false): string => {
    let upn = Array(13)
        .fill(null)
        .map(() => Math.random().toString().slice(2, 3))
        .join('');

    if (isTemporary) {
        upn = `${upn.slice(0, 12)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
    }

    return upn;
};

const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Harry', 'Ian', 'Jack'];

const getRandomFirstName = (): string => {
    return firstNames[Math.floor(Math.random() * firstNames.length)];
};

const lastNames = ['Smith', 'Jones', 'Brown', 'Davis', 'Wilson', 'Wright', 'Martin', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore'];

const getRandomLastName = (): string => {
    return lastNames[Math.floor(Math.random() * lastNames.length)];
};

type Nullish<T> = T | null | undefined;

const getRandomDateOfBirth = (): string => {
    const date = new Date();

    date.setTime(date.getTime() + Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30));

    return date.toISOString().slice(0, 10);
};

export const createTestPupils = async (
    db: Kysely<Schema.DB>,
    platformSchoolId: string,
    fields: Array<
        Partial<Pick<Schema.LwpPupil, 'importedStudentId' | 'UPN' | 'firstname' | 'lastname'>> & {
            dateOfBirth?: string | null;
        }
    >
): Promise<Array<Schema.LwpPupil>> => {
    const rows = await db
        .insertInto('lwp_pupil')
        .values(
            fields.map((field) => ({
                UPN: getRandomUpn(),
                firstname: getRandomFirstName(),
                lastname: getRandomLastName(),
                dateOfBirth: getRandomDateOfBirth(),
                ...field,
                schoolId: platformSchoolId
            }))
        )
        .returningAll()
        .execute();

    return rows as unknown as Array<Schema.LwpPupil>;
};

export const deleteTestPupils = async (db: Kysely<Schema.DB>, schoolId: string): Promise<void> => {
    await db.deleteFrom('lwp_pupil').where('schoolId', '=', schoolId).execute();
};

export const createTestImportedClasses = async (
    db: Kysely<Schema.DB>,
    importedSchoolId: string,
    records: Array<Partial<Pick<Schema.ImportedSchoolClass, 'id' | 'name' | 'yearGroup'>>>
): Promise<Array<Schema.ImportedSchoolClass>> => {
    const rows = await db
        .insertInto('imported_school_class')
        .values(
            records.map((fields) => ({
                id: crypto.randomUUID(),
                name: fields.name ?? crypto.randomUUID(),
                ...fields,
                schoolId: importedSchoolId
            }))
        )
        .returningAll()
        .execute();

    return rows as unknown as Array<Schema.ImportedSchoolClass>;
};

export const createTestImportedPupils = async (
    db: Kysely<Schema.DB>,
    importedSchoolId: string,
    fields: Array<
        Partial<Pick<Schema.ImportedStudent, 'id' | 'UPN' | 'forename' | 'surname' | 'lwpPupilId'>> & { dateOfBirth: string | null }
    >
): Promise<Array<Schema.ImportedStudent>> => {
    const rows = await db
        .insertInto('imported_student')
        .values(
            fields.map((field) => ({
                id: crypto.randomUUID(),
                UPN: getRandomUpn(),
                forename: getRandomFirstName(),
                surname: getRandomLastName(),
                dateOfBirth: getRandomDateOfBirth(),
                ...field,
                schoolId: importedSchoolId
            }))
        )
        .returningAll()
        .execute();

    return rows as unknown as Array<Schema.ImportedStudent>;
};

export const deleteTestImportedPupils = async (db: Kysely<Schema.DB>, importedSchoolId: string): Promise<void> => {
    await db.deleteFrom('imported_student').where('schoolId', '=', importedSchoolId).execute();
};

export const deleteTestImportedClasses = async (db: Kysely<Schema.DB>, importedSchoolId: string): Promise<void> => {
    await db.deleteFrom('imported_school_class').where('schoolId', '=', importedSchoolId).execute();
};

export const setSchoolImportStatus = async (db: Kysely<Schema.DB>, id: string, importStatus: ImportStatus | null): Promise<void> => {
    await db.updateTable('lwp_school').set('importStatus', importStatus).where('isTestSchool', '=', true).where('id', '=', id).execute();
};

export const deleteTestPupilLinks = async (db: Kysely<Schema.DB>, importedSchoolId: string): Promise<void> => {
    await db
        .deleteFrom('imported_school_data_proposed_link')
        .where('platformSchoolId', 'in', (qb) =>
            qb
                .selectFrom('imported_school')
                .select(sql<string>`"lwpSchoolId"::varchar`.as('platformSchoolId'))
                .where('id', '=', importedSchoolId)
        )
        .execute();
};

export const deleteTestPupilChanges = async (db: Kysely<Schema.DB>, importedSchoolId: string): Promise<void> => {
    await db
        .deleteFrom('imported_school_data_proposed_change')
        .where('platformSchoolId', 'in', (qb) =>
            qb
                .selectFrom('imported_school')
                .select(sql<string>`"lwpSchoolId"::varchar`.as('platformSchoolId'))
                .where('id', '=', importedSchoolId)
        )
        .execute();
};

export const setSchoolPeriod = async (db: Kysely<Schema.DB>, platformSchoolId: string, periodIndex: number): Promise<void> => {
    await db.updateTable('lwp_school').set({ curentPeriodIndex: periodIndex }).where('id', '=', platformSchoolId).execute();
};

export const setImportedSchoolPeriod = async (db: Kysely<Schema.DB>, importedSchoolId: string, periodIndex: number): Promise<void> => {
    await db.updateTable('imported_school').set({ periodIndex }).where('id', '=', importedSchoolId).execute();
};

/**
 * Give a pupil a parent. Only a parent whose link is something other than IMPORTED makes the pupil
 * eligible to be offered as a link candidate at all, so most tests need one.
 */
export const createTestParent = async (
    db: Kysely<Schema.DB>,
    pupilId: string,
    fields: { email?: Nullish<string>; phoneNumber?: Nullish<string>; status?: string; importedContactId?: Nullish<string> } = {}
): Promise<Schema.LwpUser> => {
    const parent = await db
        .insertInto('lwp_user')
        .values([
            {
                firstname: 'Test',
                lastname: 'Parent',
                type: 'PARENT',
                userStatus: 'ACTIVE',
                email: fields.email ?? null,
                phoneNumber: fields.phoneNumber ?? null,
                importedContactId: fields.importedContactId ?? null
            }
        ])
        .returningAll()
        .executeTakeFirst();

    await db
        .insertInto('lwp_pupil_parent')
        .values([{ pupilId, parentId: String(parent.id), status: fields.status ?? 'ACTIVE' }])
        .execute();

    return parent as unknown as Schema.LwpUser;
};

export const createTestImportedContact = async (
    db: Kysely<Schema.DB>,
    importedSchoolId: string,
    importedStudentId: string,
    fields: { email?: Nullish<string>; phoneNumber?: Nullish<string>; lwpUserId?: Nullish<string> } = {}
): Promise<Schema.ImportedContact> => {
    const contact = await db
        .insertInto('imported_contact')
        .values([
            {
                id: crypto.randomUUID(),
                schoolId: importedSchoolId,
                forename: 'Test',
                surname: 'Contact',
                email: fields.email ?? null,
                phoneNumber: fields.phoneNumber ?? null,
                lwpUserId: fields.lwpUserId ?? null
            }
        ])
        .returningAll()
        .executeTakeFirst();

    await db
        .insertInto('imported_student_contact')
        .values([{ schoolId: importedSchoolId, importedStudentId, importedContactId: String(contact.id) }])
        .execute();

    return contact as unknown as Schema.ImportedContact;
};

export const createTestPlatformClass = async (
    db: Kysely<Schema.DB>,
    platformSchoolId: string,
    fields: { name: string; periodIndex: number; importedSchoolClassId?: Nullish<string>; isRegistrationClass?: boolean }
): Promise<Schema.LwpSchoolClass> => {
    const row = await db
        .insertInto('lwp_school_class')
        .values([
            {
                name: fields.name,
                schoolId: platformSchoolId,
                periodIndex: fields.periodIndex,
                isRegistrationClass: fields.isRegistrationClass ?? true,
                status: 'ACTIVE',
                importedSchoolClassId: fields.importedSchoolClassId ?? null
            }
        ])
        .returningAll()
        .executeTakeFirst();

    return row as unknown as Schema.LwpSchoolClass;
};

export const addPupilToPlatformClass = async (db: Kysely<Schema.DB>, classId: string, pupilId: string): Promise<void> => {
    await db
        .insertInto('lwp_class_pupil')
        .values([{ lwpSchoolClassId: classId, lwpPupilId: pupilId }])
        .execute();
};

export const addImportedPupilToImportedClass = async (
    db: Kysely<Schema.DB>,
    importedClassId: string,
    importedStudentId: string
): Promise<void> => {
    await db
        .insertInto('imported_school_class_student')
        .values([{ importedSchoolClassId: importedClassId, importedStudentId }])
        .execute();
};

export const getLinks = async (
    db: Kysely<Schema.DB>,
    platformSchoolId: string,
    entityType: 'PUPIL' | 'CLASS'
): Promise<
    Array<{ importedEntityId: string; platformEntityId: string; status: string; isHighConfidence: boolean; matchCriteria: number }>
> => {
    const rows = await db
        .selectFrom('imported_school_data_proposed_link')
        .select(['importedEntityId', 'platformEntityId', 'status', 'isHighConfidence', 'matchCriteria'])
        .where('platformSchoolId', '=', platformSchoolId)
        .where('entityType', '=', entityType)
        .execute();

    return rows.map((r) => ({ ...r, platformEntityId: String(r.platformEntityId) }));
};

/** Remove everything a test created, in an order the foreign keys accept. */
export const cleanUpSchool = async (db: Kysely<Schema.DB>, platformSchoolId: string, importedSchoolId: string): Promise<void> => {
    const parentIds = await db
        .selectFrom('lwp_pupil_parent')
        .innerJoin('lwp_pupil', 'lwp_pupil.id', 'lwp_pupil_parent.pupilId')
        .select('lwp_pupil_parent.parentId')
        .where('lwp_pupil.schoolId', '=', platformSchoolId)
        .execute();

    await db.deleteFrom('imported_school_data_proposed_link').where('platformSchoolId', '=', platformSchoolId).execute();
    await db.deleteFrom('imported_school_data_proposed_change').where('platformSchoolId', '=', platformSchoolId).execute();
    await db
        .deleteFrom('lwp_class_pupil')
        .where('lwpSchoolClassId', 'in', (qb) => qb.selectFrom('lwp_school_class').select('id').where('schoolId', '=', platformSchoolId))
        .execute();
    await db
        .deleteFrom('lwp_pupil_parent')
        .where('pupilId', 'in', (qb) => qb.selectFrom('lwp_pupil').select('id').where('schoolId', '=', platformSchoolId))
        .execute();
    await db.updateTable('imported_school_class').set({ lwpSchoolClassId: null }).where('schoolId', '=', importedSchoolId).execute();
    await db.deleteFrom('lwp_pupil').where('schoolId', '=', platformSchoolId).execute();
    await db.deleteFrom('lwp_school_class').where('schoolId', '=', platformSchoolId).execute();

    if (parentIds.length > 0) {
        await db
            .deleteFrom('lwp_user')
            .where(
                'id',
                'in',
                parentIds.map((p) => String(p.parentId))
            )
            .execute();
    }

    await db.updateTable('lwp_school').set({ importedSchoolId: null }).where('id', '=', platformSchoolId).execute();
    await db.deleteFrom('imported_school').where('id', '=', importedSchoolId).execute();
    await db.deleteFrom('lwp_school').where('id', '=', platformSchoolId).execute();
};
