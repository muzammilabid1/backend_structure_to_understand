import type { Schema } from '@lwp/postgres-client';
import { type Kysely, sql } from 'kysely';
import { UserStatus, UserType } from 'lwp-shared';
import { SchoolClassStatus } from 'src/api/model';
import { createDb } from 'src/data-import/functional-tests/utils';

/**
 * Checks "classesWithNoActiveTeacherCount" in lwp_view_spm_school_metrics against a real database, because the
 * rule lives entirely in the view's SQL (1791189059994-AddNoActiveTeacherCountToSpmSchoolMetrics) and the
 * dashboard's own e2e suite stubs the api that reads it.
 *
 * Each scenario gets a school of its own, so one view refresh in beforeAll serves every test and a failure names
 * the case that broke. Teacher lastAccess values are relative to now(), so the 14-day boundary holds on any date.
 *
 * The refresh rebuilds the view for the whole database. The assertions only look at the schools created here.
 */
jest.setTimeout(180000);

type TeacherLastAccess = Date | null;

type PeriodRole = 'current' | 'previous';

type ClassSetup = {
    teachers: TeacherLastAccess[];
    periodIndex?: number;
    isRegistrationClass?: boolean;
    status?: SchoolClassStatus;
};

const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

describe('lwp_view_spm_school_metrics classesWithNoActiveTeacherCount', () => {
    let db: Kysely<Schema.DB>;

    const tag = `NOACTIVETEACHER-${Date.now()}`;
    const createdPeriodIndexes: number[] = [];
    const schoolIds: string[] = [];
    const classIds: string[] = [];
    const teacherIds: string[] = [];
    const schoolIdByScenario = new Map<string, string>();

    let currentPeriodIndex: number;

    const ensurePeriod = async (index: number, role: PeriodRole): Promise<void> => {
        const existing = await db.selectFrom('static_lwp_period').where('index', '=', index).select('index').executeTakeFirst();

        if (existing) return;

        await db
            .insertInto('static_lwp_period')
            .values({
                index,
                shortName: `${index}`,
                longName: `Academic year ${index}`,
                startDate: new Date(`${index}-01-01`),
                endDate: new Date(`${index}-12-31`),
                isCurrentPeriod: role === 'current',
                isPreviousPeriod: role === 'previous'
            })
            .execute();
        createdPeriodIndexes.push(index);
    };

    const createTeacher = async (schoolId: string, lastAccess: TeacherLastAccess): Promise<string> => {
        const teacher = await db
            .insertInto('lwp_user')
            .values({
                firstname: 'Quiet',
                lastname: 'Teacher',
                email: `${tag}-${teacherIds.length}@example.com`,
                type: UserType.TEACHER,
                userStatus: UserStatus.ACTIVE,
                schoolId,
                lastAccess
            })
            .returning('id')
            .executeTakeFirstOrThrow();

        teacherIds.push(teacher.id);

        return teacher.id;
    };

    const createClass = async (schoolId: string, setup: ClassSetup): Promise<void> => {
        const schoolClass = await db
            .insertInto('lwp_school_class')
            .values({
                name: `${tag} class ${classIds.length}`,
                schoolId,
                periodIndex: setup.periodIndex ?? currentPeriodIndex,
                isRegistrationClass: setup.isRegistrationClass ?? true,
                status: setup.status ?? SchoolClassStatus.ACTIVE
            })
            .returning('id')
            .executeTakeFirstOrThrow();

        classIds.push(schoolClass.id);

        for (const lastAccess of setup.teachers) {
            const teacherId = await createTeacher(schoolId, lastAccess);

            await db.insertInto('lwp_class_teacher').values({ lwpSchoolClassId: schoolClass.id, lwpUserId: teacherId }).execute();
        }
    };

    const createScenario = async (scenario: string, classes: ClassSetup[]): Promise<void> => {
        const school = await db
            .insertInto('lwp_school')
            .values({ schoolName: `${tag} ${scenario}`, curentPeriodIndex: currentPeriodIndex })
            .returning('id')
            .executeTakeFirstOrThrow();

        schoolIds.push(school.id);
        schoolIdByScenario.set(scenario, school.id);

        for (const setup of classes) {
            await createClass(school.id, setup);
        }
    };

    const getNoActiveTeacherCount = async (scenario: string): Promise<number | undefined> => {
        const { rows } = await sql<{ classesWithNoActiveTeacherCount: number }>`
            SELECT "classesWithNoActiveTeacherCount" FROM lwp_view_spm_school_metrics WHERE "schoolId" = ${schoolIdByScenario.get(scenario)}
        `.execute(db);

        return rows[0]?.classesWithNoActiveTeacherCount;
    };

    beforeAll(async () => {
        db = await createDb();

        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirst();

        currentPeriodIndex = currentPeriod?.index ?? new Date().getFullYear();
        await ensurePeriod(currentPeriodIndex, 'current');
        await ensurePeriod(currentPeriodIndex - 1, 'previous');

        await createScenario('all teachers quiet', [{ teachers: [daysAgo(20), daysAgo(30)] }]);
        await createScenario('one teacher still active', [{ teachers: [daysAgo(20), daysAgo(3)] }]);
        await createScenario('teacher never logged in', [{ teachers: [null] }]);
        await createScenario('no teacher assigned', [{ teachers: [] }]);
        await createScenario('either side of the 14 days', [{ teachers: [daysAgo(13)] }, { teachers: [daysAgo(15)] }]);
        await createScenario('several quiet classes', [
            { teachers: [daysAgo(20)] },
            { teachers: [daysAgo(40)] },
            { teachers: [daysAgo(1)] }
        ]);
        await createScenario('quiet classes outside the current registration classes', [
            { teachers: [daysAgo(20)], periodIndex: currentPeriodIndex - 1 },
            { teachers: [daysAgo(20)], isRegistrationClass: false },
            { teachers: [daysAgo(20)], status: SchoolClassStatus.INACTIVE }
        ]);

        await sql`SELECT refresh_spm_dashboard_views()`.execute(db);
    });

    afterAll(async () => {
        if (classIds.length) await db.deleteFrom('lwp_class_teacher').where('lwpSchoolClassId', 'in', classIds).execute();
        if (teacherIds.length) await db.deleteFrom('lwp_user').where('id', 'in', teacherIds).execute();
        if (classIds.length) await db.deleteFrom('lwp_school_class').where('id', 'in', classIds).execute();
        if (schoolIds.length) await db.deleteFrom('lwp_school').where('id', 'in', schoolIds).execute();
        if (createdPeriodIndexes.length) await db.deleteFrom('static_lwp_period').where('index', 'in', createdPeriodIndexes).execute();

        // Leave the view without the deleted schools, so the next reader does not see them until 05:00
        await sql`SELECT refresh_spm_dashboard_views()`.execute(db);
        await db.destroy();
    });

    it('counts a class whose teachers have all been away for more than 14 days', async () => {
        await expect(getNoActiveTeacherCount('all teachers quiet')).resolves.toBe(1);
    });

    it('does not count a class with one teacher active in the last 14 days', async () => {
        await expect(getNoActiveTeacherCount('one teacher still active')).resolves.toBe(0);
    });

    it('treats a teacher who has never logged in as active', async () => {
        await expect(getNoActiveTeacherCount('teacher never logged in')).resolves.toBe(0);
    });

    it('does not count a class with no teacher, which is a staffing gap', async () => {
        await expect(getNoActiveTeacherCount('no teacher assigned')).resolves.toBe(0);
    });

    it('counts a teacher last seen 15 days ago as inactive and one seen 13 days ago as active', async () => {
        await expect(getNoActiveTeacherCount('either side of the 14 days')).resolves.toBe(1);
    });

    it('counts each quiet class in a school', async () => {
        await expect(getNoActiveTeacherCount('several quiet classes')).resolves.toBe(2);
    });

    it('ignores classes from another period, non-registration classes and classes that are not active', async () => {
        await expect(getNoActiveTeacherCount('quiet classes outside the current registration classes')).resolves.toBe(0);
    });
});
