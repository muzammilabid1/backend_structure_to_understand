import { test, expect } from '@playwright/test';
import type { Schema } from '@lwp/postgres-client';
import { type Kysely } from 'kysely';
import { createDb } from './db';
import { createUtils } from './dbUtils';
import { createSchoolAndDummyWondeData, getTokenFromLogin, getUserNotificationHistory } from './graphql';
import {
    admin,
    password,
    generateSchoolName,
    generateFirstName,
    generateLastName,
    generateUserEmail,
    generateClassName,
    generateTopicName,
    generateUPN
} from './constants';
import {
    acceptFeatureTooltipPrompt,
    acceptPupilInvitation,
    addParentFromParentsCarerTable,
    adminOrTeacherSignOut,
    formatDate,
    getInputBoxByName,
    getTextAreaBoxByName,
    login,
    openSideDrawer,
    parentSignOut,
    safeClick,
    waitForLoading
} from './utils';
import { PupilParentStatus, UserStatus, UserType } from 'lwp-shared';

test.describe('Parents carer table teacher operations', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
    });

    test.afterAll(async () => {
        await db.destroy();
    });

    test('Parents carer table teacher operations', async ({ page }) => {
        const mySchoolName: string = `${generateSchoolName()} School`;
        const myClassName: string = `${generateClassName()} Class`;
        const myClass2Name: string = `${generateClassName()} Class`;
        const myTopicName: string = `${generateTopicName()} Topic`;
        const leaderFirstName: string = generateFirstName();
        const leaderlastName: string = generateLastName();
        const schoolEmail: string = generateUserEmail(leaderFirstName, leaderlastName);
        const mySchoolName2: string = `${generateSchoolName()} School`;
        const leaderFirstName2: string = generateFirstName();
        const leaderlastName2: string = generateLastName();
        const schoolEmail2: string = generateUserEmail(leaderFirstName2, leaderlastName2);
        let pupilFirstName: string = generateFirstName();
        let pupilLastName: string = generateLastName();
        let pupil2FirstName: string = generateFirstName();
        let pupil2LastName: string = generateLastName();
        let topicMagicId: string | null = null;
        let rejectPupilTopicMagicId: string | null = null;
        const today: Date = new Date();
        const todayDate = formatDate();
        const timestamp = new Date().getTime();
        const parentInfo = {
            linked: {
                firstname: 'Linked',
                lastname: 'Parent',
                emailOrPhone: `linked${timestamp}@example.com`
            },
            invited: {
                firstname: 'Invited',
                lastname: 'Parent',
                emailOrPhone: `invited${timestamp}@example.com`
            },
            awaitingInvite: {
                firstname: 'AwaitingInvite',
                lastname: 'Parent',
                emailOrPhone: `awaitinginvite${timestamp}@example.com`
            },
            rejected: {
                firstname: 'Rejected',
                lastname: 'Parent',
                emailOrPhone: `Rejected${timestamp}@example.com`
            },
            newInvited: {
                firstname: 'NewInvited',
                lastname: 'Parent',
                emailOrPhone: `newinvited${timestamp}@example.com`
            },
            imported: {
                firstname: 'imported',
                lastname: 'Parent',
                emailOrPhone: `imported${timestamp}@example.com`
            }
        };

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
            logUpdatedById: user.id
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
        await utils.addUserTooltipHistory(leader.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(leader.id, 'school-reading-log-tooltip');
        const schoolClass = await utils.createClass(school.id, {
            name: myClassName,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const staticTopic = await utils.createStaticTopic({
            isReading: false,
            teacherTopicName: myTopicName,
            parentTopicName: myTopicName,
            isPublished: true,
            video: '605069004',
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await db
            .insertInto('static_lwp_topic_domain_year_group')
            .values({
                domainId: '2',
                topicId: staticTopic.id,
                yearGroupId: '1'
            })
            .executeTakeFirstOrThrow();
        const staticActivity1 = await utils.createStaticActivity({
            name: `${myTopicName} one`,
            activityType: 'LEGACY',
            order: 1,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const staticActivity2 = await utils.createStaticActivity({
            name: `${myTopicName} two`,
            activityType: 'LEGACY',
            order: 2,
            topicId: staticTopic.id,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const classTopic1 = await utils.createClassTopic(schoolClass.id, {
            topicId: staticTopic?.id,
            releaseDate: todayDate,
            released: true
        });
        const pupil1 = await utils.createPupil(school.id, {
            firstname: pupilFirstName,
            lastname: pupilLastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const importedParent = await utils.createUser({
            firstname: parentInfo.imported.firstname,
            lastname: parentInfo.imported.lastname,
            email: parentInfo.imported.emailOrPhone,
            type: UserType.PARENT,
            userStatus: UserStatus.IMPORTED
        });
        await utils.addParentToPupil(pupil1.id, importedParent.id, true, PupilParentStatus.IMPORTED);
        await utils.addPupilToClass(pupil1.id, schoolClass.id);
        const pupilTopic1 = await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: pupil1.id,
            classTopicId: classTopic1.id,
            topicId: staticTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false
        });
        await utils.createPupilActivity({
            pupilId: pupil1.id,
            topicId: pupilTopic1.id,
            activityId: staticActivity1.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        await utils.createPupilActivity({
            pupilId: pupil1.id,
            topicId: pupilTopic1.id,
            activityId: staticActivity2.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });

        const linkedParent = await utils.createUser({
            firstname: parentInfo.linked.firstname,
            lastname: parentInfo.linked.lastname,
            email: parentInfo.linked.emailOrPhone,
            type: UserType.PARENT,
            userStatus: UserStatus.INVITED
        });
        await utils.addParentToPupil(pupil1.id, linkedParent.id, true, PupilParentStatus.INVITED);
        const invitedParent = await utils.createUser({
            firstname: parentInfo.invited.firstname,
            lastname: parentInfo.invited.lastname,
            email: parentInfo.invited.emailOrPhone,
            type: UserType.PARENT,
            userStatus: UserStatus.INVITED
        });
        await utils.addParentToPupil(pupil1.id, invitedParent.id, true, PupilParentStatus.INVITED);
        const awaitingInviteParent = await utils.createUser({
            firstname: parentInfo.awaitingInvite.firstname,
            lastname: parentInfo.awaitingInvite.lastname,
            email: parentInfo.awaitingInvite.emailOrPhone,
            type: UserType.PARENT,
            userStatus: UserStatus.INVITED
        });
        await utils.addParentToPupil(pupil1.id, awaitingInviteParent.id, true, PupilParentStatus.INVITED);
        const rejectedParent = await utils.createUser({
            firstname: parentInfo.rejected.firstname,
            lastname: parentInfo.rejected.lastname,
            email: parentInfo.rejected.emailOrPhone,
            type: UserType.PARENT,
            userStatus: UserStatus.INVITED
        });
        await utils.addParentToPupil(pupil1.id, rejectedParent.id, true, PupilParentStatus.INVITED);

        // Linked parent accepts pupil invitation via magic link
        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: myClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('week-by-week-expanded-view-pupil-name-list').getByText(`${pupilFirstName} ${pupilLastName}`).click();
        await waitForLoading(page);
        await page.getByTestId('pupil-details-details-tab').click();
        await waitForLoading(page);
        let parentRow = page
            .getByTestId('parents-carer-parent-name')
            .getByText(`${parentInfo.linked.firstname} ${parentInfo.linked.lastname}`)
            .locator('..')
            .locator('..');
        await parentRow.getByText('more_horiz').click();
        await page.getByText('Send invitations immediately').click();
        await page.getByRole('button', { name: 'Send now' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Invitation sent' })).toBeVisible();
        await waitForLoading(page);
        parentRow = page
            .getByTestId('parents-carer-parent-name')
            .getByText(`${parentInfo.rejected.firstname} ${parentInfo.rejected.lastname}`)
            .locator('..')
            .locator('..');
        await parentRow.getByText('more_horiz').click();
        await page.getByText('Send invitations immediately').click();
        await page.getByRole('button', { name: 'Send now' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Invitation sent' })).toBeVisible();
        await waitForLoading(page);
        parentRow = page
            .getByTestId('parents-carer-parent-name')
            .getByText(`${parentInfo.invited.firstname} ${parentInfo.invited.lastname}`)
            .locator('..')
            .locator('..');
        await parentRow.getByText('more_horiz').click();
        await page.getByText('Send invitations immediately').click();
        await page.getByRole('button', { name: 'Send now' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Invitation sent' })).toBeVisible();
        await waitForLoading(page);
        await adminOrTeacherSignOut(page);
        const linkedParentMagicLink = await db
            .selectFrom('lwp_magic_link')
            .where('type', '=', 'TOPICACCESS')
            .where('isUsed', '=', false)
            .where('userId', '=', linkedParent.id)
            .where('expiryTime', '>', new Date())
            .select(['url'])
            .executeTakeFirst();
        const rejectedParentMagicLink = await db
            .selectFrom('lwp_magic_link')
            .where('type', '=', 'REJECT_INVITATION')
            .where('isUsed', '=', false)
            .where('userId', '=', rejectedParent.id)
            .where('expiryTime', '>', new Date())
            .select(['url'])
            .executeTakeFirst();
        await page.goto(`/magic/${linkedParentMagicLink?.url}`);
        await page.waitForURL(/\/welcome/);
        await waitForLoading(page);
        await page.getByRole('button', { name: 'Next' }).click();
        await getInputBoxByName(page, 'policy').check();
        await page.getByRole('button', { name: 'Get started' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Pupil invitation accepted!' })).toBeVisible();
        await waitForLoading(page);
        await parentSignOut(page);
        await page.goto(`/magic/${rejectedParentMagicLink?.url}`);
        await waitForLoading(page);
        await page.getByRole('heading', { name: 'Thanks for letting us know!' }).click();
        await page.goto('/');

        // Verify correct status badges for each parent type
        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: myClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('week-by-week-expanded-view-pupil-name-list').getByText(`${pupilFirstName} ${pupilLastName}`).click();
        await waitForLoading(page);
        await page.getByTestId('pupil-details-details-tab').click();
        await waitForLoading(page);
        await expect(
            page
                .getByRole('row')
                .filter({
                    has: page
                        .getByTestId('parents-carer-parent-name')
                        .getByText(`${parentInfo.linked.firstname} ${parentInfo.linked.lastname}`)
                })
                .getByTestId('parents-carer-badge-name')
                .getByText('Linked')
        ).toBeVisible();
        await expect(
            page
                .getByRole('row')
                .filter({
                    has: page
                        .getByTestId('parents-carer-parent-name')
                        .getByText(`${parentInfo.awaitingInvite.firstname} ${parentInfo.awaitingInvite.lastname}`)
                })
                .getByTestId('parents-carer-badge-name')
                .getByText('Awaiting invite')
        ).toBeVisible();
        await expect(
            page
                .getByRole('row')
                .filter({
                    has: page
                        .getByTestId('parents-carer-parent-name')
                        .getByText(`${parentInfo.invited.firstname} ${parentInfo.invited.lastname}`)
                })
                .getByTestId('parents-carer-badge-name')
                .getByText('Invited')
        ).toBeVisible();
        await expect(
            page
                .getByRole('row')
                .filter({
                    has: page
                        .getByTestId('parents-carer-parent-name')
                        .getByText(`${parentInfo.rejected.firstname} ${parentInfo.rejected.lastname}`)
                })
                .getByTestId('parents-carer-badge-name')
                .getByText('Rejected invitation')
        ).toBeVisible();
        await expect(
            page
                .getByRole('row')
                .filter({
                    has: page
                        .getByTestId('parents-carer-parent-name')
                        .getByText(`${parentInfo.imported.firstname} ${parentInfo.imported.lastname}`)
                })
                .getByTestId('parents-carer-badge-name')
                .getByText('Not yet invited')
        ).toBeVisible();

        // Verify available actions for each parent status
        await page
            .getByTestId('parents-carer-parent-name')
            .getByText(`${parentInfo.linked.firstname} ${parentInfo.linked.lastname}`)
            .locator('..')
            .locator('..')
            .getByText('more_horiz')
            .click();
        await expect(page.getByText('Remove parent')).toBeVisible();
        await page.mouse.click(0, 0);
        await page
            .getByTestId('parents-carer-parent-name')
            .getByText(`${parentInfo.invited.firstname} ${parentInfo.invited.lastname}`)
            .locator('..')
            .locator('..')
            .getByText('more_horiz')
            .click();
        await expect(page.getByText('Edit parent')).toBeVisible();
        await expect(page.getByText('Send a reminder')).toBeVisible();
        await expect(page.getByText('Remove parent')).toBeVisible();
        await page.mouse.click(0, 0);
        await page
            .getByTestId('parents-carer-parent-name')
            .getByText(`${parentInfo.awaitingInvite.firstname} ${parentInfo.awaitingInvite.lastname}`)
            .locator('..')
            .locator('..')
            .getByText('more_horiz')
            .click();
        await expect(page.getByText('Send invitations immediately')).toBeVisible();
        await expect(page.getByText('Edit parent')).toBeVisible();
        await expect(page.getByText('Remove parent')).toBeVisible();
        await page.mouse.click(0, 0);
        await page
            .getByTestId('parents-carer-parent-name')
            .getByText(`${parentInfo.rejected.firstname} ${parentInfo.rejected.lastname}`)
            .locator('..')
            .locator('..')
            .getByText('more_horiz')
            .click();
        await expect(page.getByText('Reconfirm details')).toBeVisible();
        await expect(page.getByText('Remove parent')).toBeVisible();
        await page.mouse.click(0, 0);
        await page
            .getByTestId('parents-carer-parent-name')
            .getByText(`${parentInfo.imported.firstname} ${parentInfo.imported.lastname}`)
            .locator('..')
            .locator('..')
            .getByText('more_horiz')
            .click();
        await expect(page.getByText('Confirm details')).toBeVisible();
        await expect(page.getByText('Remove parent')).toBeVisible();
        await page.mouse.click(0, 0);

        // Teacher confirms parent details and triggers invitation
        await page
            .getByTestId('parents-carer-parent-name')
            .getByText(`${parentInfo.imported.firstname} ${parentInfo.imported.lastname}`)
            .locator('..')
            .locator('..')
            .getByText('more_horiz')
            .click();
        await page.getByText('Confirm details').click();
        await page.getByTestId('dialog-primary-btn').click();
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Parent details confirmed.' })).toBeVisible();
        await page
            .getByTestId('parents-carer-parent-name')
            .getByText(`${parentInfo.imported.firstname} ${parentInfo.imported.lastname}`)
            .locator('..')
            .locator('..')
            .getByText('more_horiz')
            .click();
        await page.getByText('Send invitations immediately').click();
        await page.getByRole('button', { name: 'Send now' }).click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Invitation sent' })).toBeVisible();
        await waitForLoading(page);
        await adminOrTeacherSignOut(page);

        const importedParentMagicLink = await db
            .selectFrom('lwp_magic_link')
            .where('type', '=', 'TOPICACCESS')
            .where('isUsed', '=', false)
            .where('userId', '=', importedParent.id)
            .where('expiryTime', '>', new Date())
            .select(['url'])
            .executeTakeFirst();

        await page.goto(`/magic/${importedParentMagicLink?.url}`);
        await page.waitForURL(/\/welcome/);
        await waitForLoading(page);
        await parentSignOut(page);

        // Teacher updates existing parent details
        await login(page, schoolEmail, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: myClassName }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('week-by-week-expanded-view-pupil-name-list').getByText(`${pupilFirstName} ${pupilLastName}`).click();
        await waitForLoading(page);
        await page.getByTestId('pupil-details-details-tab').click();
        await waitForLoading(page);
        await page
            .getByTestId('parents-carer-parent-name')
            .getByText(`${parentInfo.imported.firstname} ${parentInfo.imported.lastname}`)
            .locator('..')
            .locator('..')
            .getByText('more_horiz')
            .click();
        await page.getByText('Edit parent').click();
        await page.getByTestId('update-non-active-parent-lastname-input').fill('Parents');
        await page.getByTestId('dialog-primary-btn').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'Parent details updated successfully.' })).toBeVisible();
        await waitForLoading(page);
        await adminOrTeacherSignOut(page);

        // Verify magic link becomes invalid
        await page.goto(`/magic/${importedParentMagicLink?.url}`);
        await page.waitForURL(/\/magic/);
        await waitForLoading(page);
        await expect(page.getByText('This link is invalid')).toBeVisible();
        await page.goto('/');

        const newSchool = await utils.createSchool({
            schoolName: mySchoolName2,
            curentPeriodIndex: currentPeriod.index,
            numOfFullProgrammeClassesAllowed: 10,
            numOfTotalClassesAllowed: 30,
            enableAddClasses: true,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const newLeader = await utils.createUser({
            firstname: leaderFirstName2,
            lastname: leaderlastName2,
            email: schoolEmail2,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: newSchool.id,
            password: user.password,
            nameForChildren: `Mr ${leaderFirstName2}`
        });
        await utils.addUserTooltipHistory(newLeader.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(newLeader.id, 'school-reading-log-tooltip');
        const newSchoolClass = await utils.createClass(newSchool.id, {
            name: myClass2Name,
            isRegistrationClass: true,
            isFullProgramme: true,
            mainTeacherId: leader.id,
            yearGroup: 1,
            periodIndex: currentPeriod.index,
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        const classTopic2 = await utils.createClassTopic(newSchoolClass.id, {
            topicId: staticTopic?.id,
            releaseDate: todayDate,
            released: true
        });
        const pupil2 = await utils.createPupil(newSchool.id, {
            firstname: pupil2FirstName,
            lastname: pupil2LastName,
            dateOfBirth: new Date(),
            startedSchool: '2024',
            isPremium: true,
            gender: 'MALE',
            UPN: generateUPN(),
            logCreatedById: user.id,
            logUpdatedById: user.id
        });
        await utils.addPupilToClass(pupil2.id, newSchoolClass.id);
        const pupilTopic2 = await utils.createPupilTopic({
            releaseDate: todayDate,
            pupilId: pupil2.id,
            classTopicId: classTopic2.id,
            topicId: staticTopic.id,
            watchedVideo: false,
            periodIndex: currentPeriod.index,
            silverStars: 0,
            earnedGoldStar: false
        });
        await utils.createPupilActivity({
            pupilId: pupil2.id,
            topicId: pupilTopic2.id,
            activityId: staticActivity1.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });
        await utils.createPupilActivity({
            pupilId: pupil2.id,
            topicId: pupilTopic2.id,
            activityId: staticActivity2.id,
            earnedStar: false,
            mathscotActivityItemIds: JSON.stringify([88, 188, 224])
        });

        // Teacher links multiple parent types to a pupil in another school
        await utils.addParentToPupil(pupil2.id, linkedParent.id, true, PupilParentStatus.ACTIVE);
        await utils.addParentToPupil(pupil2.id, importedParent.id, true, PupilParentStatus.IMPORTED);
        await utils.addParentToPupil(pupil2.id, rejectedParent.id, true, PupilParentStatus.REJECTED);
        await utils.addParentToPupil(pupil2.id, invitedParent.id, true, PupilParentStatus.INVITED);
        await utils.addParentToPupil(pupil2.id, awaitingInviteParent.id, true, PupilParentStatus.INVITED);

        // Teacher updates existing parent details in another school
        await login(page, schoolEmail2, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await page.getByRole('link', { name: myClass2Name }).click();
        await page.waitForURL(/\/class/);
        await waitForLoading(page);
        await page.getByTestId('week-by-week-expanded-view-pupil-name-list').getByText(`${pupil2FirstName} ${pupil2LastName}`).click();
        await waitForLoading(page);
        await page.getByTestId('pupil-details-details-tab').click();
        await waitForLoading(page);
        await page
            .getByTestId('parents-carer-parent-name')
            .getByText(`${parentInfo.invited.firstname} ${parentInfo.invited.lastname}`)
            .locator('..')
            .locator('..')
            .getByText('more_horiz')
            .click();
        await page.getByText('Edit parent').click();
        await page.getByTestId('transfer-pupil-to-new-parent-firstname-input').fill(parentInfo.newInvited.firstname);
        await page.getByTestId('transfer-pupil-to-new-parent-lastname-input').fill(parentInfo.newInvited.lastname);
        await page.getByTestId('transfer-pupil-to-new-parent-email-input').fill(parentInfo.newInvited.emailOrPhone);
        await page.getByTestId('dialog-primary-btn').click();
        await waitForLoading(page);
        await expect(page.locator('.MuiAlert-message').filter({ hasText: 'New parent created successfully.' })).toBeVisible();
        await waitForLoading(page);
        await adminOrTeacherSignOut(page);
    });
});
