import { expect, test } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import { password, generateSchoolName, generateFirstName, generateLastName, generateUserEmail } from './constants';
import { login } from './utils';
import { UserStatus, UserType } from 'lwp-shared';

test.describe('Admin creates an inactive class and verifies it appears for the school leader', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Admin creates an inactive class and verifies it appears for the school leader', async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const timestamp = new Date().getTime();
        const schoolClassName = `Inactive Class ${timestamp}`;

        const user = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();
        const school = await utils.createSchool({
            schoolName: mySchoolName,
            curentPeriodIndex: currentPeriod.index,
            numOfFullProgrammeClassesAllowed: 10,
            numOfTotalClassesAllowed: 30,
            enableAddClasses: true,
            logCreatedById: user.id,
            logUpdatedById: user.id,
            isReadyTeddyAvailable: true
        });
        const leader = await utils.createUser({
            firstname: leaderFirstName,
            lastname: leaderlastName,
            email: schoolEmail,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });
        await utils.createClass(school.id, {
            name: schoolClassName,
            isRegistrationClass: true,
            isFullProgramme: false,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index + 1,
            IsReadingLogsEnabled: false,
            isReadyTeddyEnabled: true,
            readingTarget: 1,
            status: 'INACTIVE',
            logCreatedById: user.id,
            logUpdatedById: user.id
        });

        // Verify the inactive class is visible to the school leader
        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await expect(page.locator('[data-test="inactive-ready-teddy-class-name"]', { hasText: schoolClassName })).toBeVisible();
    });
});
