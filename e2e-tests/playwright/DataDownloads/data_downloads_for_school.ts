import { type Schema } from '@lwp/postgres-client';
import { expect, test, type Page } from '@playwright/test';
import { type Kysely } from 'kysely';
import { UserStatus, UserType } from 'lwp-shared';

import { generateClassName, generateFirstName, generateLastName, generateSchoolName, generateUserEmail, password } from '../constants';
import { createDb } from '../db';
import { createUtils } from '../dbUtils';
import { adminOrTeacherSignOut, login, openSideDrawer, schoolSettingsPage, waitForLoading } from '../utils';

/**
 * School data downloads, on a school leader's Analytics & reports page.
 *
 * Covers which reports a leader is offered - published or not, and matching their school's
 * subject type - and which academic years they can download them for.
 */
test.describe('School data downloads', () => {
    // Reports this spec creates for itself, rather than depending on which queries a database
    // happens to have been seeded with.
    const anyYearReport = 'ZZ E2E classes for the chosen year';
    const currentYearOnlyReport = 'ZZ E2E classes this year only';
    const topicsReport = 'ZZ E2E topic classes';
    const readingReport = 'ZZ E2E reading classes';
    const seededReports = [anyYearReport, currentYearOnlyReport, topicsReport, readingReport];

    // Reads back the academic year the download was asked for, exactly as the real reports do, so
    // the rows change with the year chosen.
    const classesForChosenYearSql = `
        SELECT lsc."name" AS "Class name", lsc."periodIndex" AS "Academic year"
        FROM lwp_school_class lsc
        JOIN lwp_school ls ON ls.id = lsc."schoolId"
        WHERE ls.id = current_setting('lwp.school_id')::bigint
          AND lsc."periodIndex" = coalesce(current_setting('lwp.period_index', TRUE)::int, ls."curentPeriodIndex")
        ORDER BY lsc."name"
    `;

    // Pinned to the year the school is in now, which is why it is not offered for last year.
    const classesForCurrentYearSql = `
        SELECT lsc."name" AS "Class name"
        FROM lwp_school_class lsc
        JOIN lwp_school ls ON ls.id = lsc."schoolId"
        WHERE ls.id = current_setting('lwp.school_id')::bigint
          AND lsc."periodIndex" = ls."curentPeriodIndex"
        ORDER BY lsc."name"
    `;

    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;
    let sampleUser: { id: string; password: string };
    let currentPeriod: { index: number; shortName: string };
    let previousPeriod: { index: number; shortName: string };

    const createdSchoolIds: string[] = [];
    const createdLeaderIds: string[] = [];
    let previouslyPublishedIds: string[] = [];

    /** Publishing is what decides whether a leader is offered a report at all. */
    const setReportStatus = async (names: string[], status: string) => {
        await db.updateTable('static_lwp_data_query').set({ status }).where('name', 'in', names).execute();
    };

    /**
     * A school with an active registration class in each year given, and a leader to sign in as.
     * The class flags decide the school's subject type, and so which reports it is offered.
     */
    const createSchoolWithLeader = async ({
        periodIndexes = [] as number[],
        isDownloadSchoolData = true,
        isFullProgramme = true,
        isReadingLogsEnabled = true
    }) => {
        const leaderFirstName = generateFirstName();
        const leaderLastName = generateLastName();
        const email = generateUserEmail(leaderFirstName, leaderLastName);

        const school = await utils.createSchool({
            schoolName: `${generateSchoolName()} School`,
            curentPeriodIndex: currentPeriod.index,
            numOfFullProgrammeClassesAllowed: 10,
            numOfTotalClassesAllowed: 30,
            enableAddClasses: true,
            isDownloadSchoolData,
            logCreatedById: sampleUser.id,
            logUpdatedById: sampleUser.id
        });

        createdSchoolIds.push(school.id);

        const leader = await utils.createUser({
            firstname: leaderFirstName,
            lastname: leaderLastName,
            email,
            type: UserType.TEACHER,
            userStatus: UserStatus.ACTIVE,
            isSchoolLeader: true,
            schoolId: school.id,
            password: sampleUser.password,
            nameForChildren: `Mr ${leaderFirstName}`
        });

        createdLeaderIds.push(leader.id);

        // The feature tour draws an overlay over the page and swallows the first click.
        await utils.addUserTooltipHistory(leader.id, 'topic-library-tooltip');
        await utils.addUserTooltipHistory(leader.id, 'school-reading-log-tooltip');

        const classNames: Record<number, string> = {};

        for (const periodIndex of periodIndexes) {
            classNames[periodIndex] = `${generateClassName()} ${periodIndex}`;

            await utils.createClass(school.id, {
                name: classNames[periodIndex],
                isRegistrationClass: true,
                isFullProgramme,
                IsReadingLogsEnabled: isReadingLogsEnabled,
                mainTeacherId: leader.id,
                yearGroup: 1,
                periodIndex,
                status: 'ACTIVE',
                logCreatedById: sampleUser.id,
                logUpdatedById: sampleUser.id
            });
        }

        return { email, classNames };
    };

    const openConfiguration = async (page: Page, email: string) => {
        await login(page, email, password);
        await page.waitForURL(/\/school/);
        await waitForLoading(page);
        await schoolSettingsPage(page, 'school-settings-configuration');
        await waitForLoading(page);
    };

    const openDataDownloads = async (page: Page) => {
        await openSideDrawer(page);
        await page.getByTestId('sidebar-school-analytics-and-reports-btn').click();
        await waitForLoading(page);
        await page.getByTestId('school-data-downloads').click();
        await waitForLoading(page);
    };

    test.beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);

        sampleUser = await db.selectFrom('lwp_user').where('id', '=', '1').select(['id', 'password']).executeTakeFirstOrThrow();
        currentPeriod = await db
            .selectFrom('static_lwp_period')
            .where('isCurrentPeriod', '=', true)
            .select(['index', 'shortName'])
            .executeTakeFirstOrThrow();
        previousPeriod = await db
            .selectFrom('static_lwp_period')
            .where('index', '=', currentPeriod.index - 1)
            .select(['index', 'shortName'])
            .executeTakeFirstOrThrow();

        // Whatever else the database holds would show up alongside this spec's own reports, so
        // hide it for the duration and put it back afterwards.
        previouslyPublishedIds = (
            await db
                .selectFrom('static_lwp_data_query')
                .where('type', '=', 'LEADER')
                .where('status', '=', 'PUBLISHED')
                .select('id')
                .execute()
        ).map((row) => row.id);

        if (previouslyPublishedIds.length) {
            await db
                .updateTable('static_lwp_data_query')
                .set({ status: 'HIDDEN' })
                .where('id', 'in', previouslyPublishedIds)
                .execute();
        }

        await db
            .insertInto('static_lwp_data_query')
            .values([
                {
                    name: anyYearReport,
                    query: classesForChosenYearSql,
                    type: 'LEADER',
                    category: 'BOTH',
                    status: 'HIDDEN',
                    order: 99,
                    isAvailableForPreviousYear: true
                },
                {
                    name: currentYearOnlyReport,
                    query: classesForCurrentYearSql,
                    type: 'LEADER',
                    category: 'BOTH',
                    status: 'HIDDEN',
                    order: 99,
                    isAvailableForPreviousYear: false
                },
                {
                    name: topicsReport,
                    query: classesForCurrentYearSql,
                    type: 'LEADER',
                    category: 'TOPICS',
                    status: 'HIDDEN',
                    order: 99,
                    isAvailableForPreviousYear: false
                },
                {
                    name: readingReport,
                    query: classesForCurrentYearSql,
                    type: 'LEADER',
                    category: 'READING',
                    status: 'HIDDEN',
                    order: 99,
                    isAvailableForPreviousYear: false
                }
            ])
            .execute();
    });

    test.afterAll(async () => {
        for (const leaderId of createdLeaderIds) await utils.deleteUser(leaderId);
        for (const schoolId of createdSchoolIds) await utils.deleteSchool(schoolId);

        await db.deleteFrom('static_lwp_data_query').where('name', 'in', seededReports).execute();

        if (previouslyPublishedIds.length) {
            await db
                .updateTable('static_lwp_data_query')
                .set({ status: 'PUBLISHED' })
                .where('id', 'in', previouslyPublishedIds)
                .execute();
        }

        await db.destroy();
    });

    test('the downloads setting only appears once a report is published', async ({ page }) => {
        await setReportStatus(seededReports, 'HIDDEN');

        const { email } = await createSchoolWithLeader({ periodIndexes: [currentPeriod.index] });

        await openConfiguration(page, email);

        // Nothing published, so the school has no downloads to offer and the section is not drawn.
        await expect(page.getByRole('heading', { name: 'School data downloads' })).toBeHidden();

        await setReportStatus([anyYearReport], 'PUBLISHED');

        await page.reload();
        await waitForLoading(page);

        await expect(page.getByRole('heading', { name: 'School data downloads' })).toBeVisible();
    });

    test('enabling the setting reveals the downloads tab', async ({ page }) => {
        await setReportStatus(seededReports, 'PUBLISHED');

        const { email } = await createSchoolWithLeader({
            periodIndexes: [currentPeriod.index],
            isDownloadSchoolData: false
        });

        await openConfiguration(page, email);

        await expect(page.getByRole('heading', { name: 'School data downloads' })).toBeVisible();

        await page.locator('input[name="isDownloadSchoolData"]').check();
        await page.locator('.school-data-download-btn').click();
        await expect(page.locator('.MuiAlert-message')).toContainText('Settings updated');

        await openSideDrawer(page);
        await page.getByTestId('sidebar-school-analytics-and-reports-btn').click();
        await waitForLoading(page);

        await expect(page.getByTestId('school-data-downloads')).toBeVisible();
    });

    test('a school is only offered the reports for its subject type', async ({ page }) => {
        await setReportStatus(seededReports, 'PUBLISHED');

        // Full programme only, so the school counts as a topic school.
        const topicSchool = await createSchoolWithLeader({
            periodIndexes: [currentPeriod.index],
            isFullProgramme: true,
            isReadingLogsEnabled: false
        });

        await openConfiguration(page, topicSchool.email);
        await openDataDownloads(page);

        await expect(page.getByRole('heading', { name: topicsReport })).toBeVisible();
        await expect(page.getByRole('heading', { name: readingReport })).toBeHidden();

        expect(await downloadReport(page, topicsReport, currentPeriod.shortName)).toContain(
            topicSchool.classNames[currentPeriod.index]
        );

        await adminOrTeacherSignOut(page);

        // Reading logs only, so this one counts as a reading school.
        const readingSchool = await createSchoolWithLeader({
            periodIndexes: [currentPeriod.index],
            isFullProgramme: false,
            isReadingLogsEnabled: true
        });

        await openConfiguration(page, readingSchool.email);
        await openDataDownloads(page);

        await expect(page.getByRole('heading', { name: readingReport })).toBeVisible();
        await expect(page.getByRole('heading', { name: topicsReport })).toBeHidden();

        expect(await downloadReport(page, readingReport, currentPeriod.shortName)).toContain(
            readingSchool.classNames[currentPeriod.index]
        );
    });

    test('a school with last year behind it is offered both years', async ({ page }) => {
        await setReportStatus(seededReports, 'PUBLISHED');

        const { email, classNames } = await createSchoolWithLeader({
            periodIndexes: [currentPeriod.index, previousPeriod.index]
        });
        const thisYearClassName = classNames[currentPeriod.index];
        const lastYearClassName = classNames[previousPeriod.index];

        await openConfiguration(page, email);
        await openDataDownloads(page);

        const currentYearButton = page.getByTestId('download-current-academic-year');
        const previousYearButton = page.getByTestId('download-previous-academic-year');

        // Both years are offered, each labelled with the year it covers.
        await expect(currentYearButton).toContainText(currentPeriod.shortName);
        await expect(previousYearButton).toContainText(previousPeriod.shortName);

        // This year starts selected, and shows both reports.
        await expect(currentYearButton).toHaveClass(/btn_group_active/);
        await expect(page.getByRole('heading', { name: currentYearOnlyReport })).toBeVisible();
        await expect(page.getByRole('heading', { name: anyYearReport })).toBeVisible();

        // Switching to last year drops the report that is not marked for it.
        await previousYearButton.click();
        await expect(previousYearButton).toHaveClass(/btn_group_active/);
        await expect(page.getByRole('heading', { name: currentYearOnlyReport })).toBeHidden();
        await expect(page.getByRole('heading', { name: anyYearReport })).toBeVisible();

        // Last year's download names last year, and holds only last year's class.
        const previousYearCsv = await downloadReport(page, anyYearReport, previousPeriod.shortName);

        expect(previousYearCsv).toContain(lastYearClassName);
        expect(previousYearCsv).not.toContain(thisYearClassName);

        // This year's names this year, and holds only this year's class - so the year chosen really
        // does reach the query.
        await currentYearButton.click();

        const currentYearCsv = await downloadReport(page, anyYearReport, currentPeriod.shortName);

        expect(currentYearCsv).toContain(thisYearClassName);
        expect(currentYearCsv).not.toContain(lastYearClassName);
    });

    test('a school that arrived this year is offered no choice of year', async ({ page }) => {
        await setReportStatus(seededReports, 'PUBLISHED');

        const { email, classNames } = await createSchoolWithLeader({ periodIndexes: [currentPeriod.index] });
        const thisYearClassName = classNames[currentPeriod.index];

        await openConfiguration(page, email);
        await openDataDownloads(page);

        // Nothing to choose between, so the year buttons are not drawn at all.
        await expect(page.getByTestId('download-current-academic-year')).toBeHidden();
        await expect(page.getByTestId('download-previous-academic-year')).toBeHidden();

        // Every report is still listed, because this year is the only year on offer.
        await expect(page.getByRole('heading', { name: currentYearOnlyReport })).toBeVisible();
        await expect(page.getByRole('heading', { name: anyYearReport })).toBeVisible();

        // And downloading still runs for the year the school is in, even with no buttons to pick it.
        const csv = await downloadReport(page, anyYearReport, currentPeriod.shortName);

        expect(csv).toContain(thisYearClassName);
    });
});

/**
 * Downloads one report and returns the CSV. The academic year is part of the filename, so this
 * also shows which year the report ran for.
 */
const downloadReport = async (page: Page, reportName: string, shortName: string): Promise<string> => {
    const card = page.locator('.school_data_container', { hasText: reportName });
    const downloadPromise = page.waitForEvent('download');

    await card.getByRole('button', { name: 'Download CSV' }).click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain(shortName);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];

    for await (const chunk of stream) chunks.push(chunk as Buffer);

    return Buffer.concat(chunks).toString('utf8');
};
