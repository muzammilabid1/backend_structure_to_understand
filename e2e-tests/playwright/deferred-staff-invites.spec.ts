import { expect, test } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Insertable, type Kysely } from 'kysely';
import { UserStatus, UserType } from 'lwp-shared';

import { admin, password, generateFirstName, generateLastName, generateSchoolName } from './constants';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import { getTokenFromLogin, sendStaffInvites } from './graphql';
import { getInputBoxByName, login, schoolSettingsPage, waitForLoading } from './utils';

/**
 * E2E coverage for the deferred staff-invite feature (LEA-6312): invite modes on Add School / Add Teacher,
 * the not-invited warning icons, and the per-school + cross-school "Send invites" flows, plus the server-side
 * guard on the sendStaffInvites mutation.
 *
 * Everything runs in a single test block against one seeded fixture. The data is arranged so the scenarios
 * do not tread on each other: read-only checks (tag scoping) run before the invites that would consume the
 * imported staff, and each invite path targets a distinct school.
 */
test.describe('Deferred staff invites', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    const ts = new Date().getTime();
    const email = (label: string): string => `dsi.${label}.${ts}@example.com`.toLowerCase();
    // Mirror the modal's row-slug so we can target a specific invitee checkbox by name.
    const rowSlug = (firstname: string, lastname: string): string => `${firstname}-${lastname}`.trim().toLowerCase().replace(/\s+/g, '-');

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('invite modes, not-invited icons, and Send invites (per-school, cross-school, backend guard)', async ({ page }) => {
        // ---- Seed ------------------------------------------------------------------------------------------
        const adminUser = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
        const currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select('index')
            .executeTakeFirstOrThrow();

        const makeSchool = (name: string, extra: Partial<Insertable<Schema.LwpSchool>> = {}) =>
            utils.createSchool({
                schoolName: name,
                curentPeriodIndex: currentPeriod.index,
                numOfFullProgrammeClassesAllowed: 10,
                numOfTotalClassesAllowed: 30,
                enableAddClasses: true,
                isReadyTeddyAvailable: true,
                inactive: false,
                isTestSchool: false,
                logCreatedById: adminUser.id,
                logUpdatedById: adminUser.id,
                ...extra
            });

        const makeUser = (
            schoolId: string | null,
            firstname: string,
            lastname: string,
            userStatus: UserStatus,
            isSchoolLeader = false,
            type: UserType = UserType.TEACHER
        ) =>
            utils.createUser({
                firstname,
                lastname,
                email: email(`${firstname}.${lastname}`),
                type,
                userStatus,
                isSchoolLeader,
                schoolId,
                password: adminUser.password,
                nameForChildren: `Mx ${firstname}`
            });

        // School Alpha (tag "Alpha"): an active leader (for the non-admin radio check), two imported teachers
        // and one active teacher.
        const alphaName = `${generateSchoolName()} Alpha ${ts}`;
        const schoolAlpha = await makeSchool(alphaName);
        const alphaTagName = `Alpha ${ts}`;
        await utils.createSchoolTag({ name: alphaTagName, color: '#F28D00' }, schoolAlpha.id);

        const leaderAlphaFirst = generateFirstName();
        const leaderAlphaLast = generateLastName();
        const leaderAlpha = await makeUser(schoolAlpha.id, leaderAlphaFirst, leaderAlphaLast, UserStatus.ACTIVE, true);
        const alphaImported1 = await makeUser(schoolAlpha.id, generateFirstName(), generateLastName(), UserStatus.IMPORTED);
        const alphaImported2 = await makeUser(schoolAlpha.id, generateFirstName(), generateLastName(), UserStatus.IMPORTED);
        await makeUser(schoolAlpha.id, generateFirstName(), generateLastName(), UserStatus.ACTIVE);

        // School Beta (tag "Beta"): imported teacher + imported leader. Used for cross-school invite and to
        // prove the tag filter excludes it.
        const betaName = `${generateSchoolName()} Beta ${ts}`;
        const schoolBeta = await makeSchool(betaName);
        const betaTagName = `Beta ${ts}`;
        await utils.createSchoolTag({ name: betaTagName, color: '#0057D8' }, schoolBeta.id);
        const betaImported = await makeUser(schoolBeta.id, generateFirstName(), generateLastName(), UserStatus.IMPORTED);
        const betaLeaderImported = await makeUser(schoolBeta.id, generateFirstName(), generateLastName(), UserStatus.IMPORTED, true);

        // School Gamma (no tag): one imported teacher. Also part of the cross-school invite.
        const gammaName = `${generateSchoolName()} Gamma ${ts}`;
        const schoolGamma = await makeSchool(gammaName);
        const gammaImported = await makeUser(schoolGamma.id, generateFirstName(), generateLastName(), UserStatus.IMPORTED);

        // School Epsilon (active): a reserved imported teacher for the backend-guard check.
        const schoolEpsilon = await makeSchool(`${generateSchoolName()} Epsilon ${ts}`);
        const epsilonImported = await makeUser(schoolEpsilon.id, generateFirstName(), generateLastName(), UserStatus.IMPORTED);

        // Inactive school + a parent: both must be rejected by the backend guard.
        const schoolInactive = await makeSchool(`${generateSchoolName()} Inactive ${ts}`, { inactive: true });
        const inactiveImported = await makeUser(schoolInactive.id, generateFirstName(), generateLastName(), UserStatus.IMPORTED);
        const parent = await makeUser(null, generateFirstName(), generateLastName(), UserStatus.IMPORTED, false, UserType.PARENT);

        const statusOf = async (userId: string): Promise<string> =>
            (await db.selectFrom('lwp_user').where('id', '=', userId).select('userStatus').executeTakeFirstOrThrow()).userStatus;

        // ---- Scenario 1: Add School invite mode drives the school-level not-invited icon -------------------
        await login(page, admin, password);
        await page.goto('/admin/schools/active');
        await waitForLoading(page);

        // 1a. "Don't send invite" -> leader stays IMPORTED and the school shows the warning icon.
        const doNotSendSchoolName = `${generateSchoolName()} DoNotSend ${ts}`;
        const dnsLeaderFirst = generateFirstName();
        const dnsLeaderLast = generateLastName();
        await page.getByTestId('add-school-button').click();
        await page.getByTestId('add-school-name-input').fill(doNotSendSchoolName);
        await page.getByTestId('add-school-leader-first-name-input').fill(dnsLeaderFirst);
        await page.getByTestId('add-school-leader-last-name-input').fill(dnsLeaderLast);
        await page.getByTestId('add-school-email-input').fill(email('dns-leader'));
        await page.getByTestId('add-school-alias-input').fill(`Mx ${dnsLeaderFirst}`);
        await page.getByTestId('add-school-full-programme-classes-allowed-input').fill('5');
        await page.getByTestId('add-school-total-classes-allowed-input').fill('10');
        await page.getByTestId('add-school-invite-mode-do-not-send').click();
        await page.getByTestId('add-school-submit-button').click();
        await waitForLoading(page);

        const dnsSchool = await db
            .selectFrom('lwp_school')
            .where('schoolName', '=', doNotSendSchoolName)
            .select('id')
            .executeTakeFirstOrThrow();
        const dnsLeader = await db
            .selectFrom('lwp_user')
            .where('email', '=', email('dns-leader'))
            .select(['id', 'userStatus'])
            .executeTakeFirstOrThrow();
        expect(dnsLeader.userStatus).toBe(UserStatus.IMPORTED);
        await expect(page.getByTestId(`school-uninvited-icon-${dnsSchool.id}`)).toBeVisible();

        // 1b. "Send invite now" -> leader is INVITED and the school shows no icon.
        const sendNowSchoolName = `${generateSchoolName()} SendNow ${ts}`;
        const snLeaderFirst = generateFirstName();
        const snLeaderLast = generateLastName();
        await page.getByTestId('add-school-button').click();
        await page.getByTestId('add-school-name-input').fill(sendNowSchoolName);
        await page.getByTestId('add-school-leader-first-name-input').fill(snLeaderFirst);
        await page.getByTestId('add-school-leader-last-name-input').fill(snLeaderLast);
        await page.getByTestId('add-school-email-input').fill(email('sn-leader'));
        await page.getByTestId('add-school-alias-input').fill(`Mx ${snLeaderFirst}`);
        await page.getByTestId('add-school-full-programme-classes-allowed-input').fill('5');
        await page.getByTestId('add-school-total-classes-allowed-input').fill('10');
        await page.getByTestId('add-school-invite-mode-send-now').click();
        await page.getByTestId('add-school-submit-button').click();
        await waitForLoading(page);

        const snSchool = await db
            .selectFrom('lwp_school')
            .where('schoolName', '=', sendNowSchoolName)
            .select('id')
            .executeTakeFirstOrThrow();
        const snLeader = await db
            .selectFrom('lwp_user')
            .where('email', '=', email('sn-leader'))
            .select('userStatus')
            .executeTakeFirstOrThrow();
        expect(snLeader.userStatus).toBe(UserStatus.INVITED);
        await expect(page.getByTestId(`school-uninvited-icon-${snSchool.id}`)).toHaveCount(0);

        // ---- Scenario 2: Add Teacher invite mode (admin) + admin-only SEND_LATER option -------------------
        // 2a. Admin adds a teacher with "Don't send invite" -> IMPORTED with a not-invited row icon.
        await page.goto(`/admin/school/${schoolAlpha.id}`);
        await waitForLoading(page);
        await page.getByTestId('staff-school-overview-tab').click();
        await waitForLoading(page);

        const addedTeacherFirst = generateFirstName();
        const addedTeacherLast = generateLastName();
        await page.getByText('Add a teacher', { exact: true }).click();
        await getInputBoxByName(page, 'firstname').fill(addedTeacherFirst);
        await getInputBoxByName(page, 'lastname').fill(addedTeacherLast);
        await getInputBoxByName(page, 'nameForChildren').fill(`Mx ${addedTeacherFirst}`);
        await getInputBoxByName(page, 'email').fill(email('added-teacher'));
        await page.locator('[data-test="dialog-content"] [role="combobox"]').click();
        await page.getByRole('option', { name: 'Class teacher' }).click();
        // Admin sees all three modes.
        await expect(page.getByTestId('add-teacher-invite-mode-send-later')).toBeVisible();
        await page.getByTestId('add-teacher-invite-mode-do-not-send').click();
        await page.getByTestId('dialog-primary-btn').click();
        await waitForLoading(page);

        const addedTeacher = await db
            .selectFrom('lwp_user')
            .where('email', '=', email('added-teacher'))
            .select(['id', 'userStatus'])
            .executeTakeFirstOrThrow();
        expect(addedTeacher.userStatus).toBe(UserStatus.IMPORTED);
        await expect(page.getByTestId(`staff-uninvited-icon-${addedTeacher.id}`)).toBeVisible();

        // 2b. A school leader (non-admin) does not get the "Send invite later" option.
        await page.goto('/logout');
        await waitForLoading(page);
        await login(page, leaderAlpha.email, password);
        await schoolSettingsPage(page, 'school-settings-teachers');
        await page.getByTestId('add-teacher-list').click();
        await expect(page.getByTestId('add-teacher-invite-mode-send-now')).toBeVisible();
        await expect(page.getByTestId('add-teacher-invite-mode-do-not-send')).toBeVisible();
        await expect(page.getByTestId('add-teacher-invite-mode-send-later')).toHaveCount(0);

        // Back to admin for the remaining scenarios.
        await page.goto('/logout');
        await waitForLoading(page);
        await login(page, admin, password);

        // ---- Scenario 5: tag filter scopes the cross-school Send invites list (read-only) -----------------
        // Run before any invites so both Alpha and Beta still have imported staff.
        await page.goto(`/admin/schools/active?tags=${encodeURIComponent(JSON.stringify([alphaTagName]))}`);
        await waitForLoading(page);
        await page.getByTestId('schools-send-invites-button').click();
        await expect(page.getByTestId('send-invites-modal')).toBeVisible();
        // Alpha's imported staff are listed...
        await expect(page.getByTestId(`send-invites-row-${rowSlug(alphaImported1.firstname, alphaImported1.lastname)}`)).toBeVisible();
        // ...Beta's are not, because Beta is filtered out of view.
        await expect(page.getByTestId(`send-invites-row-${rowSlug(betaImported.firstname, betaImported.lastname)}`)).toHaveCount(0);
        await page.getByTestId('dialog-cancel-btn').click();
        await expect(page.getByTestId('send-invites-modal')).toHaveCount(0);

        // ---- Scenario 3: per-school Send invites, default tick state, with one invitee unchecked ----------
        await page.goto(`/admin/school/${schoolAlpha.id}`);
        await waitForLoading(page);
        await page.getByTestId('staff-school-overview-tab').click();
        await waitForLoading(page);
        await page.getByTestId('staff-send-invites-button').click();
        await expect(page.getByTestId('send-invites-modal')).toBeVisible();

        // Default tick state: outstanding invites start ticked, but the teacher added with "Don't send
        // invite" in scenario 2a is listed unticked, so a bulk send never contacts them by accident.
        const alphaImported2Row = page.getByTestId(`send-invites-row-${rowSlug(alphaImported2.firstname, alphaImported2.lastname)}`);
        const addedTeacherSlug = rowSlug(addedTeacherFirst, addedTeacherLast);
        await expect(page.getByTestId(`send-invites-row-${rowSlug(alphaImported1.firstname, alphaImported1.lastname)}`)).toBeChecked();
        await expect(alphaImported2Row).toBeChecked();
        await expect(page.getByTestId(`send-invites-row-${addedTeacherSlug}`)).not.toBeChecked();
        await expect(page.getByTestId(`send-invites-mode-${addedTeacherSlug}`)).toHaveText('Marked as do not invite');
        await expect(page.getByTestId('send-invites-count')).toHaveText('2 invitations will be sent.');

        // Uncheck alphaImported2 - it must NOT be invited.
        await alphaImported2Row.click();
        await expect(page.getByTestId('send-invites-count')).toHaveText('1 invitation will be sent.');
        await page.getByTestId('dialog-primary-btn').click();
        await expect(page.getByTestId('send-invites-modal')).toHaveCount(0);
        await waitForLoading(page);

        expect(await statusOf(alphaImported1.id)).toBe(UserStatus.INVITED);
        // The unchecked teacher stays imported and keeps its icon.
        expect(await statusOf(alphaImported2.id)).toBe(UserStatus.IMPORTED);
        // Left alone because it was unticked by default, not by hand.
        expect(await statusOf(addedTeacher.id)).toBe(UserStatus.IMPORTED);
        await expect(page.getByTestId(`staff-uninvited-icon-${alphaImported1.id}`)).toHaveCount(0);
        await expect(page.getByTestId(`staff-uninvited-icon-${alphaImported2.id}`)).toBeVisible();
        await expect(page.getByTestId(`staff-uninvited-icon-${addedTeacher.id}`)).toBeVisible();

        // ---- Scenario 6: backend guard on sendStaffInvites (GraphQL level) --------------------------------
        // A parent and an inactive-school teacher must be rejected even though both are IMPORTED; only the
        // valid active-school teacher is invited.
        const { accessToken } = await getTokenFromLogin(admin, password);
        await sendStaffInvites(accessToken, [epsilonImported.id, parent.id, inactiveImported.id]);
        expect(await statusOf(epsilonImported.id)).toBe(UserStatus.INVITED);
        expect(await statusOf(parent.id)).toBe(UserStatus.IMPORTED);
        expect(await statusOf(inactiveImported.id)).toBe(UserStatus.IMPORTED);

        // ---- Scenario 4: cross-school Send invites clears icons across schools -----------------------------
        await page.goto('/admin/schools/active');
        await waitForLoading(page);
        await page.getByTestId('schools-send-invites-button').click();
        await expect(page.getByTestId('send-invites-modal')).toBeVisible();
        // The leader added with "Don't send invite" in scenario 1a is listed unticked, so "invite everyone"
        // leaves them alone here too.
        await expect(page.getByTestId(`send-invites-row-${rowSlug(dnsLeaderFirst, dnsLeaderLast)}`)).not.toBeChecked();
        // Ticking a "Don't send invite" row by hand opts that person in explicitly.
        await page.getByTestId(`send-invites-row-${rowSlug(addedTeacherFirst, addedTeacherLast)}`).click();
        // Invite everyone still ticked across the active schools.
        await page.getByTestId('dialog-primary-btn').click();
        await waitForLoading(page);
        // Unlike the per-school send above, this one scales with however many uninvited staff the environment
        // has accumulated, and every invite mints a magic link and sends an email - so allow real time for it.
        await expect(page.getByTestId('send-invites-modal')).toHaveCount(0);
        await waitForLoading(page);

        expect(await statusOf(betaImported.id)).toBe(UserStatus.INVITED);
        expect(await statusOf(betaLeaderImported.id)).toBe(UserStatus.INVITED);
        expect(await statusOf(gammaImported.id)).toBe(UserStatus.INVITED);
        expect(await statusOf(alphaImported2.id)).toBe(UserStatus.INVITED);
        // Opted in by hand above.
        expect(await statusOf(addedTeacher.id)).toBe(UserStatus.INVITED);
        // Never opted in, so still uninvited and its school still flags it.
        expect(await statusOf(dnsLeader.id)).toBe(UserStatus.IMPORTED);
        await expect(page.getByTestId(`school-uninvited-icon-${schoolBeta.id}`)).toHaveCount(0);
        await expect(page.getByTestId(`school-uninvited-icon-${schoolGamma.id}`)).toHaveCount(0);
        await expect(page.getByTestId(`school-uninvited-icon-${dnsSchool.id}`)).toBeVisible();
    });
});
