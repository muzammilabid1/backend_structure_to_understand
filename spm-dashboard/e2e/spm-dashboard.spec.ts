import { type BrowserContext, expect, type Page, type Route, test } from '@playwright/test'
import { ImportStatus } from 'lwp-shared'

import type { IssueSeverity } from '../lib/spm/schoolIssues'
import type {
  SchoolForSpm,
  SpmEngagementMetric,
  SpmReadingLogTotals,
  SpmSchoolOption,
  SpmSchoolsOutput,
  SpmSummary,
  SpmTagsOutput,
} from '../types/spm'
import {
  ACCESS_TOKEN_COOKIE,
  addSessionCookies,
  REFRESH_TOKEN_COOKIE,
  signAccessToken,
  signExpiredAdminAccessToken,
  signParentAccessToken,
} from './support/session'

const metric = (activePercent: number | null): SpmEngagementMetric => ({
  activePercent,
  inactivePercent: activePercent === null ? null : 100 - activePercent,
})

const GREENFIELD_PRIMARY: SchoolForSpm = {
  id: '1',
  schoolName: 'Greenfield Primary',
  numOfTotalClassesAllowed: 3,
  numOfFullProgrammeClassesAllowed: 2,
  isMoneySkillsAvailable: false,
  isReadyTeddyAvailable: false,
  misIntegration: 'WONDE',
  importStatus: ImportStatus.FAILED,
  lastImportedAt: '2026-01-10T09:00:00.000Z',
  hasCurrentAcademicYearWondeData: true,
  ignoreAcademicYearCheckDuringImport: false,
  skipAutoWondeImport: false,
  currentAcademicYearIndex: 2025,
  spmData: {
    activatedClassCount: 2,
    hasUnconfirmedParentDetails: true,
    pupilsWithoutMisCount: 0,
    classesWithNoActiveTeacherCount: 0,
    parentsAwaitingInviteCount: 0,
    readingLogLaunchDate: '2026-01-05T09:00:00.000Z',
    mathsEnglishLaunchDate: '2026-01-06T09:00:00.000Z',
    moneySkillsLaunchDate: null,
    readyTeddyLaunchDate: null,
    readingLogCurrentTerm: metric(72),
    readingLogCurrentTermComment: metric(40),
    readingLogPreviousTermComment: metric(35),
    readingLogTargetByClass: [{ className: 'Class 3A', activePercent: 80 }],
    teacherFeedbackInUse: true,
    schoolReadingTarget: 3,
    topicsCurrentTerm: metric(65),
    activitiesCurrentTerm: metric(55),
    pupilPremiumPercent: 25,
    teacherFeedbackCount: 12,
    topicsSetCount: 8,
  },
}

const RIVERSIDE_ACADEMY: SchoolForSpm = {
  id: '2',
  schoolName: 'Riverside Academy',
  numOfTotalClassesAllowed: 4,
  numOfFullProgrammeClassesAllowed: 0,
  isMoneySkillsAvailable: true,
  isReadyTeddyAvailable: true,
  misIntegration: null,
  importStatus: null,
  lastImportedAt: null,
  hasCurrentAcademicYearWondeData: false,
  ignoreAcademicYearCheckDuringImport: false,
  skipAutoWondeImport: false,
  currentAcademicYearIndex: 2025,
  spmData: {
    activatedClassCount: 4,
    hasUnconfirmedParentDetails: false,
    pupilsWithoutMisCount: 0,
    classesWithNoActiveTeacherCount: 0,
    parentsAwaitingInviteCount: 0,
    readingLogLaunchDate: null,
    mathsEnglishLaunchDate: null,
    moneySkillsLaunchDate: '2026-02-01T09:00:00.000Z',
    readyTeddyLaunchDate: null,
    readingLogCurrentTerm: metric(null),
    readingLogCurrentTermComment: metric(null),
    readingLogPreviousTermComment: metric(null),
    readingLogTargetByClass: [],
    teacherFeedbackInUse: null,
    schoolReadingTarget: null,
    topicsCurrentTerm: metric(null),
    activitiesCurrentTerm: metric(null),
    pupilPremiumPercent: null,
    teacherFeedbackCount: null,
    topicsSetCount: null,
  },
}

const SCHOOLS_FIXTURE: SchoolForSpm[] = [GREENFIELD_PRIMARY, RIVERSIDE_ACADEMY]

const SUMMARY_FIXTURE: SpmSummary = {
  schools: { activeCount: 2, totalCount: 2 },
  classes: { activatedCount: 6, contractedCount: 7 },
  programmes: {
    launchedCount: 3,
    subscriptions: [
      { key: 'digitalReadingLog', subscribedCount: 2, launchedCount: 2 },
      { key: 'mathsEnglish', subscribedCount: 1, launchedCount: 1 },
      { key: 'moneySkills', subscribedCount: 1, launchedCount: 0 },
      { key: 'readyTeddy', subscribedCount: 1, launchedCount: 0 },
    ],
  },
  readingLogs: { atHomeCount: 120, atSchoolCount: 80 },
}

const toSchoolsPage = (schools: SchoolForSpm[]): SpmSchoolsOutput => ({
  results: schools,
  total: schools.length,
  page_total: schools.length,
  limit: 25,
  offset: 0,
})

const SCHOOL_OPTIONS_FIXTURE: SpmSchoolOption[] = SCHOOLS_FIXTURE.map(({ id, schoolName }) => ({
  id,
  schoolName,
}))

const ALL_SCHOOLS_READING_LOGS: SpmReadingLogTotals = { atHomeCount: 120, atSchoolCount: 80 }

const READING_LOGS_BY_SCHOOL_ID: Record<string, SpmReadingLogTotals> = {
  '1': { atHomeCount: 30, atSchoolCount: 10 },
  '2': { atHomeCount: 90, atSchoolCount: 70 },
}

const toReadingLogsResponse = (url: URL): SpmReadingLogTotals => {
  const schoolId = url.searchParams.get('schoolId')

  return schoolId ? READING_LOGS_BY_SCHOOL_ID[schoolId] : ALL_SCHOOLS_READING_LOGS
}

const BOTH_SCHOOLS_TAG = { id: '7', name: 'SPM: Joanne', label: 'Joanne (2)' }
const GREENFIELD_ONLY_TAG = { id: '8', name: 'SPM: Amelia', label: 'Amelia (1)' }

const TAGS_FIXTURE: SpmTagsOutput = {
  results: [
    { id: BOTH_SCHOOLS_TAG.id, name: BOTH_SCHOOLS_TAG.name, schoolCount: 2 },
    { id: GREENFIELD_ONLY_TAG.id, name: GREENFIELD_ONLY_TAG.name, schoolCount: 1 },
  ],
}

const stubSchoolTags = async (page: Page): Promise<void> =>
  page.route('**/api/spm/tags', (route) => route.fulfill({ status: 200, json: TAGS_FIXTURE }))

/**
 * Narrows the fixture the way the route's SQL does, so a launch-filter test cannot pass by the stub
 * ignoring the parameter it is meant to be exercising.
 */
const filterFixtureByLaunch = (schools: SchoolForSpm[], query: URLSearchParams): SchoolForSpm[] => {
  const readingLogLaunch = query.get('digitalReadingLogLaunch')
  const moneySkillsLaunch = query.get('moneySkillsLaunch')

  return schools
    .filter((school) => {
      if (!readingLogLaunch) return true
      if (school.numOfTotalClassesAllowed === 0) return readingLogLaunch === 'notSubscribed'

      return school.spmData.readingLogLaunchDate
        ? readingLogLaunch === 'launched'
        : readingLogLaunch === 'notLaunched'
    })
    .filter((school) => {
      if (!moneySkillsLaunch) return true
      if (!school.isMoneySkillsAvailable) return moneySkillsLaunch === 'notSubscribed'

      return school.spmData.moneySkillsLaunchDate
        ? moneySkillsLaunch === 'launched'
        : moneySkillsLaunch === 'notLaunched'
    })
}

const stubDashboardData = async (page: Page, schools: SchoolForSpm[]): Promise<void> => {
  await page.route('**/api/spm/schools*', (route) => {
    const query = new URL(route.request().url()).searchParams
    const tagged =
      query.get('tagId') === GREENFIELD_ONLY_TAG.id
        ? schools.filter((school) => school.schoolName === 'Greenfield Primary')
        : schools

    route.fulfill({ status: 200, json: toSchoolsPage(filterFixtureByLaunch(tagged, query)) })
  })
  await page.route('**/api/spm/summary', (route) =>
    route.fulfill({ status: 200, json: SUMMARY_FIXTURE })
  )
  await page.route('**/api/spm/school-options', (route) =>
    route.fulfill({ status: 200, json: SCHOOL_OPTIONS_FIXTURE })
  )
  await page.route('**/api/spm/reading-logs*', (route) =>
    route.fulfill({ status: 200, json: toReadingLogsResponse(new URL(route.request().url())) })
  )
  await stubSchoolTags(page)
}

type DashboardOptions = { schools?: SchoolForSpm[] }

const openDashboardAsAdmin = async (
  page: Page,
  context: BrowserContext,
  { schools = SCHOOLS_FIXTURE }: DashboardOptions = {}
): Promise<void> => {
  await addSessionCookies(context, { accessToken: signAccessToken() })
  await stubDashboardData(page, schools)

  await page.goto('/dashboard')
}

/** The schools table stays out of the page until an SPM is picked, so most tests must pick one. */
const pickSpm = async (page: Page, label: string): Promise<void> =>
  page.getByRole('button', { name: label }).click()

const showAllSchoolsButton = (page: Page) => page.getByRole('button', { name: 'Show all schools' })

const schoolsFilterPrompt = (page: Page) => page.locator('[data-test="schools-filter-prompt"]')

const schoolsTable = (page: Page) => page.locator('[data-test="spm-school-list"]')

/** Each launch chip opens a menu; 'any' is the option that clears the filter. */
const pickLaunchState = async (
  page: Page,
  programme: string,
  state: 'launched' | 'notLaunched' | 'notSubscribed' | 'any'
): Promise<void> => {
  await page.locator(`[data-test="spm-launch-filter-${programme}"]`).click()

  if (state === 'any') {
    await page.getByRole('menuitem', { name: 'Any' }).click()

    return
  }

  await page.locator(`[data-test="spm-launch-option-${programme}-${state}"]`).click()
}

/**
 * What a session that expires mid-visit meets: the access token lapses, then the fetch is refused
 * the way the real API route refuses it. The cookie has to lapse too, not only the response — the
 * landing page sends a valid admin token straight back to the dashboard, so a 401 against a live
 * token would bounce the browser between the two. There is no second chance to stub, because the
 * dashboard no longer retries behind a refresh.
 */
const expireSessionThenRefuse =
  (context: BrowserContext) =>
  async (route: Route): Promise<void> => {
    await addSessionCookies(context, { accessToken: signExpiredAdminAccessToken() })
    await route.fulfill({ status: 401, json: { error: 'Unauthorized' } })
  }

/**
 * The page request itself has to carry a valid admin token, or the middleware refuses it before any
 * React runs and the client's reaction is never reached. Only the data fetches are refused.
 */
const openDashboardWithRefusedFetches = async (
  page: Page,
  context: BrowserContext,
  { refreshToken }: { refreshToken?: string } = {}
): Promise<void> => {
  await addSessionCookies(context, { accessToken: signAccessToken(), refreshToken })

  await page.route('**/api/spm/schools*', expireSessionThenRefuse(context))
  await page.route('**/api/spm/summary', expireSessionThenRefuse(context))
  await stubSchoolTags(page)
}

test.describe('SPM dashboard', () => {
  test.describe('rendering for an admin', () => {
    test('renders a row per school', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context)
      await pickSpm(page, BOTH_SCHOOLS_TAG.label)

      await expect(page.getByRole('heading', { name: 'My schools dashboard' })).toBeVisible()

      const greenfieldRow = page.getByRole('row', { name: /Greenfield Primary/ })
      await expect(greenfieldRow).toBeVisible()
      await expect(greenfieldRow.getByText('2 / 3')).toBeVisible()
      await expect(page.getByRole('row', { name: /Riverside Academy/ })).toBeVisible()
    })

    test('shows a launch state for every programme column', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context)
      await pickSpm(page, BOTH_SCHOOLS_TAG.label)

      // Greenfield subscribes to the reading log and maths & english, both launched, and to neither
      // money skills nor ready teddy
      const greenfieldRow = page.getByRole('row', { name: /Greenfield Primary/ })
      await expect(greenfieldRow.getByText('Launched', { exact: true })).toHaveCount(2)
      await expect(greenfieldRow.getByText('Not subscribed', { exact: true })).toHaveCount(2)
    })

    test('dates each launched programme in its column', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context)
      await pickSpm(page, BOTH_SCHOOLS_TAG.label)

      // Greenfield launched the reading log on 5 January and maths & english the day after, so a
      // column reading the wrong programme's date fails here.
      const greenfieldRow = page.getByRole('row', { name: /Greenfield Primary/ })
      await expect(greenfieldRow.getByText('5 Jan 2026')).toBeVisible()
      await expect(greenfieldRow.getByText('6 Jan 2026')).toBeVisible()
    })

    test('dates no programme a school has not launched', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context)
      await pickSpm(page, BOTH_SCHOOLS_TAG.label)

      // Riverside launched only money skills, so its row carries exactly one date.
      const riversideRow = page.getByRole('row', { name: /Riverside Academy/ })
      await expect(riversideRow.locator('time')).toHaveCount(1)
    })

    test('keeps every school row the same height whatever it has launched', async ({
      page,
      context,
    }) => {
      await openDashboardAsAdmin(page, context)
      await pickSpm(page, BOTH_SCHOOLS_TAG.label)
      await expect(page.locator('[data-test="spm-school-row"]')).toHaveCount(2)

      // Greenfield has launched two programmes and Riverside one, so the launch cells must reserve
      // the date line whether or not they have a date to put in it.
      const rowHeights = await page
        .locator('[data-test="spm-school-row"]')
        .evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height))

      expect(new Set(rowHeights).size).toBe(1)
    })

    test('totals every school reading log until a school is picked', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context)

      await expect(page.locator('[data-test="spm-reading-total-logs"]')).toHaveText('200')
    })

    test('narrows the reading place split to the selected school', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context)

      await page.locator('[data-test="spm-school-filter"]').click()
      await page.getByRole('option', { name: 'Riverside Academy' }).click()

      await expect(page.locator('[data-test="spm-reading-total-logs"]')).toHaveText('160')
    })

    test('expands a school to reveal its engagement detail', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context)
      await pickSpm(page, BOTH_SCHOOLS_TAG.label)

      const toggle = page.getByRole('button', { name: /Greenfield Primary/ })
      await expect(page.getByText('Topics set: 8')).toBeHidden()

      await toggle.click()

      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      await expect(page.getByText('Topics set: 8')).toBeVisible()
    })

    test('shows the reading log split of an expanded school', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context)
      await pickSpm(page, BOTH_SCHOOLS_TAG.label)

      await page.getByRole('button', { name: /Greenfield Primary/ }).click()

      await expect(page.getByText('Prev active 35%')).toBeVisible()
    })

    test('shows the reading target of every class in an expanded school', async ({
      page,
      context,
    }) => {
      await openDashboardAsAdmin(page, context)
      await pickSpm(page, BOTH_SCHOOLS_TAG.label)

      await page.getByRole('button', { name: /Greenfield Primary/ }).click()

      await expect(page.getByText('Class 3A: 80%')).toBeVisible()
    })

    // Riverside Academy carries no metric at all, so every metric group is dropped.
    test('explains that a school with nothing to report has no engagement data', async ({
      page,
      context,
    }) => {
      await openDashboardAsAdmin(page, context)
      await pickSpm(page, BOTH_SCHOOLS_TAG.label)

      await page.getByRole('button', { name: /Riverside Academy/ }).click()

      await expect(page.locator('[data-test="spm-school-metrics-empty"]')).toBeVisible()
    })

    test('labels an SPM chip with the tag name stripped of its prefix', async ({
      page,
      context,
    }) => {
      await openDashboardAsAdmin(page, context)

      await expect(page.getByRole('button', { name: BOTH_SCHOOLS_TAG.label })).toBeVisible()
    })

    test('narrows the table to the tagged school when an SPM chip is picked', async ({
      page,
      context,
    }) => {
      await openDashboardAsAdmin(page, context)

      const filteredRequest = page.waitForRequest((request) =>
        request.url().includes(`/api/spm/schools?limit=25&offset=0&tagId=${GREENFIELD_ONLY_TAG.id}`)
      )
      await pickSpm(page, GREENFIELD_ONLY_TAG.label)
      await filteredRequest

      await expect(page.getByRole('row', { name: /Greenfield Primary/ })).toBeVisible()
      await expect(page.getByRole('row', { name: /Riverside Academy/ })).toBeHidden()
    })
  })

  test.describe('the issues column', () => {
    const issuePill = (page: Page, schoolName: RegExp, severity: IssueSeverity) =>
      page
        .getByRole('row', { name: schoolName })
        .locator(`[data-test="spm-school-issue"][data-severity="${severity}"]`)

    const academicYearPill = (page: Page, schoolName: RegExp) =>
      page
        .getByRole('row', { name: schoolName })
        .locator('[data-test="spm-school-issue"][data-issue="wondeAcademicYear"]')

    // Greenfield carries a parent issue of its own, which would otherwise share the cell and make
    // an assertion about the import status ambiguous.
    const wondeSchoolsWith = (importStatus: ImportStatus | null): SchoolForSpm[] => [
      {
        ...GREENFIELD_PRIMARY,
        importStatus,
        spmData: { ...GREENFIELD_PRIMARY.spmData, hasUnconfirmedParentDetails: false },
      },
    ]

    const openWithImport = async (
      page: Page,
      context: BrowserContext,
      importStatus: ImportStatus | null
    ) => {
      await openDashboardAsAdmin(page, context, { schools: wondeSchoolsWith(importStatus) })
      await pickSpm(page, BOTH_SCHOOLS_TAG.label)
    }

    test('flags a failed import as an error', async ({ page, context }) => {
      await openWithImport(page, context, ImportStatus.FAILED)

      await expect(issuePill(page, /Greenfield Primary/, 'error')).toHaveAttribute(
        'aria-label',
        'Wonde sync failed'
      )
    })

    // An import parked on LINKING_PUPILS is waiting on the school, not on Wonde, so it needs an SPM
    // to chase it rather than leaving the row looking healthy.
    test('warns when an import is waiting on the school to check its data', async ({
      page,
      context,
    }) => {
      await openWithImport(page, context, ImportStatus.LINKING_PUPILS)

      await expect(issuePill(page, /Greenfield Primary/, 'warning')).toHaveAttribute(
        'aria-label',
        'Imported data waiting to be checked'
      )
    })

    test('explains a waiting import when its pill is hovered', async ({ page, context }) => {
      await openWithImport(page, context, ImportStatus.DIFFING_ENTITIES)

      await issuePill(page, /Greenfield Primary/, 'warning').hover()

      await expect(page.getByRole('tooltip')).toContainText(
        'The school has not reviewed them, so the import cannot finish.'
      )
    })

    test('offers a way in to the data a waiting import is stuck on', async ({ page, context }) => {
      await openWithImport(page, context, ImportStatus.DIFFING_ENTITIES)

      await issuePill(page, /Greenfield Primary/, 'warning').hover()

      await expect(page.getByRole('link', { name: 'Open data changes' })).toBeVisible()
    })

    test('raises no issue while an import is still running', async ({ page, context }) => {
      await openWithImport(page, context, ImportStatus.IMPORTING_DATA)

      await expect(
        page.getByRole('row', { name: /Greenfield Primary/ }).getByText('All clear')
      ).toBeVisible()
    })

    test('mutes the issue for a school that has never synced', async ({ page, context }) => {
      await openWithImport(page, context, null)

      await expect(issuePill(page, /Greenfield Primary/, 'muted')).toHaveAttribute(
        'aria-label',
        'Never synced with Wonde'
      )
    })

    test('warns when parent details are waiting to be confirmed', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context)
      await pickSpm(page, BOTH_SCHOOLS_TAG.label)

      await expect(
        page
          .getByRole('row', { name: /Greenfield Primary/ })
          .locator('[data-test="spm-school-issue"][data-issue="parentDetails"]')
      ).toHaveAttribute('aria-label', 'Parent details need confirming')
    })

    test('counts the pupils an MIS link issue covers on its pill', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context, {
        schools: [
          {
            ...GREENFIELD_PRIMARY,
            spmData: { ...GREENFIELD_PRIMARY.spmData, pupilsWithoutMisCount: 11 },
          },
        ],
      })
      await pickSpm(page, BOTH_SCHOOLS_TAG.label)

      await expect(
        page
          .getByRole('row', { name: /Greenfield Primary/ })
          .locator('[data-test="spm-school-issue"][data-issue="misLinks"]')
      ).toHaveText('11')
    })

    test('flags classes whose teachers have all gone quiet as an error', async ({
      page,
      context,
    }) => {
      await openDashboardAsAdmin(page, context, {
        schools: [
          {
            ...GREENFIELD_PRIMARY,
            importStatus: ImportStatus.COMPLETE,
            spmData: {
              ...GREENFIELD_PRIMARY.spmData,
              hasUnconfirmedParentDetails: false,
              classesWithNoActiveTeacherCount: 2,
            },
          },
        ],
      })
      await pickSpm(page, BOTH_SCHOOLS_TAG.label)

      await expect(
        page
          .getByRole('row', { name: /Greenfield Primary/ })
          .locator('[data-test="spm-school-issue"][data-severity="error"]')
      ).toHaveAttribute('aria-label', '2 classes have no active teacher')
    })

    test('counts the parents awaiting an invite on its pill', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context, {
        schools: [
          {
            ...GREENFIELD_PRIMARY,
            spmData: { ...GREENFIELD_PRIMARY.spmData, parentsAwaitingInviteCount: 3 },
          },
        ],
      })
      await pickSpm(page, BOTH_SCHOOLS_TAG.label)

      await expect(
        page
          .getByRole('row', { name: /Greenfield Primary/ })
          .locator('[data-test="spm-school-issue"][data-issue="parentsAwaitingInvite"]')
      ).toHaveText('3')
    })

    // Riverside is on no MIS at all, so its empty import status says nothing about its health.
    test('raises no import issue for a school that is not on Wonde', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context)
      await pickSpm(page, BOTH_SCHOOLS_TAG.label)

      await expect(
        page.getByRole('row', { name: /Riverside Academy/ }).getByText('All clear')
      ).toBeVisible()
    })

    // The pills carry no words, so the column cannot be read without the key beside the table.
    test('names every issue type in the key above the table', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context)
      await pickSpm(page, BOTH_SCHOOLS_TAG.label)

      await expect(page.locator('[data-test="spm-issue-key"]')).toContainText('Wonde sync')
    })

    test('names the academic year issue in the key above the table', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context)
      await pickSpm(page, BOTH_SCHOOLS_TAG.label)

      await expect(page.locator('[data-test="spm-issue-key"]')).toContainText('Wonde academic year')
    })

    // The flag outlives the import status, so it is the one an SPM can still act on days later.
    const openWithUnconfirmedYear = async (page: Page, context: BrowserContext) => {
      await openDashboardAsAdmin(page, context, {
        schools: [
          {
            ...wondeSchoolsWith(ImportStatus.COMPLETE)[0],
            hasCurrentAcademicYearWondeData: false,
          },
        ],
      })
      await pickSpm(page, BOTH_SCHOOLS_TAG.label)
    }

    test('flags an unconfirmed academic year as an error', async ({ page, context }) => {
      await openWithUnconfirmedYear(page, context)

      await expect(academicYearPill(page, /Greenfield Primary/)).toHaveAttribute(
        'aria-label',
        'No Wonde data for this academic year'
      )
    })

    test('dates the last sync attempt when the academic year pill is hovered', async ({
      page,
      context,
    }) => {
      await openWithUnconfirmedYear(page, context)

      await academicYearPill(page, /Greenfield Primary/).hover()

      await expect(page.getByRole('tooltip')).toContainText('Last sync attempt 10 Jan 2026.')
    })
  })

  // The unfiltered query spans every school on the platform, so nothing may fetch it by default.
  test.describe('the schools filter gate', () => {
    test('leaves the schools table out of the page until schools are asked for', async ({
      page,
      context,
    }) => {
      const schoolsRequests: string[] = []
      page.on('request', (request) => {
        if (request.url().includes('/api/spm/schools')) schoolsRequests.push(request.url())
      })

      await openDashboardAsAdmin(page, context)
      await expect(page.getByRole('button', { name: BOTH_SCHOOLS_TAG.label })).toBeVisible()

      await expect(schoolsFilterPrompt(page)).toBeVisible()
      await expect(schoolsTable(page)).toBeHidden()
      expect(schoolsRequests).toEqual([])
    })

    test('offers no launch filter until schools are asked for', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context)
      await expect(page.getByRole('button', { name: BOTH_SCHOOLS_TAG.label })).toBeVisible()

      await expect(page.locator('[data-test="launch-filter-bar"]')).toBeHidden()
    })

    test('offers a launch filter once schools are asked for', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context)

      await showAllSchoolsButton(page).click()

      await expect(page.locator('[data-test="spm-launch-filter-digitalReadingLog"]')).toBeVisible()
    })

    test('asks the route for the picked launch state', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context)
      await showAllSchoolsButton(page).click()

      const filteredRequest = page.waitForRequest((request) =>
        request.url().includes('digitalReadingLogLaunch=notLaunched')
      )
      await pickLaunchState(page, 'digitalReadingLog', 'notLaunched')

      await expect(await filteredRequest).toBeTruthy()
    })

    test('narrows the table to the schools in the picked launch state', async ({
      page,
      context,
    }) => {
      await openDashboardAsAdmin(page, context)
      await showAllSchoolsButton(page).click()
      await expect(page.locator('[data-test="spm-school-row"]')).toHaveCount(2)

      await pickLaunchState(page, 'digitalReadingLog', 'notLaunched')

      await expect(page.getByRole('row', { name: /Riverside Academy/ })).toHaveCount(1)
    })

    test('drops the launch filter again when it is cleared', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context)
      await showAllSchoolsButton(page).click()
      await pickLaunchState(page, 'digitalReadingLog', 'notLaunched')
      await expect(page.locator('[data-test="spm-school-row"]')).toHaveCount(1)

      await pickLaunchState(page, 'digitalReadingLog', 'any')

      await expect(page.locator('[data-test="spm-school-row"]')).toHaveCount(2)
    })

    test('narrows to the schools matching every picked launch state', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context)
      await showAllSchoolsButton(page).click()

      await pickLaunchState(page, 'digitalReadingLog', 'notLaunched')
      await pickLaunchState(page, 'moneySkills', 'notLaunched')

      await expect(page.locator('[data-test="spm-schools-empty"]')).toHaveText(
        'No schools match the launch filters.'
      )
    })

    test('loads the schools table once an SPM is picked', async ({ page, context }) => {
      await openDashboardAsAdmin(page, context)

      await pickSpm(page, BOTH_SCHOOLS_TAG.label)

      await expect(schoolsTable(page)).toBeVisible()
      await expect(schoolsFilterPrompt(page)).toBeHidden()
    })

    test('takes the schools table away again when the picked SPM chip is unpicked', async ({
      page,
      context,
    }) => {
      await openDashboardAsAdmin(page, context)

      const chip = page.getByRole('button', { name: BOTH_SCHOOLS_TAG.label })
      await chip.click()
      await expect(schoolsTable(page)).toBeVisible()

      await chip.click()

      await expect(schoolsTable(page)).toBeHidden()
      await expect(schoolsFilterPrompt(page)).toBeVisible()
    })

    test('loads every school unfiltered when all schools are asked for', async ({
      page,
      context,
    }) => {
      await openDashboardAsAdmin(page, context)

      const unfilteredRequest = page.waitForRequest(
        (request) =>
          request.url().includes('/api/spm/schools?limit=25&offset=0') &&
          !request.url().includes('tagId')
      )
      await showAllSchoolsButton(page).click()
      await unfilteredRequest

      await expect(page.getByRole('row', { name: /Greenfield Primary/ })).toBeVisible()
      await expect(page.getByRole('row', { name: /Riverside Academy/ })).toBeVisible()
    })

    test('takes the schools table away again when all schools are unpicked', async ({
      page,
      context,
    }) => {
      await openDashboardAsAdmin(page, context)

      await showAllSchoolsButton(page).click()
      await expect(schoolsTable(page)).toBeVisible()

      await showAllSchoolsButton(page).click()

      await expect(schoolsTable(page)).toBeHidden()
      await expect(schoolsFilterPrompt(page)).toBeVisible()
    })

    test('narrows an unfiltered table to one SPM when a chip is picked', async ({
      page,
      context,
    }) => {
      await openDashboardAsAdmin(page, context)
      await showAllSchoolsButton(page).click()
      await expect(page.getByRole('row', { name: /Riverside Academy/ })).toBeVisible()

      await pickSpm(page, GREENFIELD_ONLY_TAG.label)

      await expect(page.getByRole('row', { name: /Riverside Academy/ })).toBeHidden()
    })

    test('releases the all-schools button when an SPM chip is picked', async ({
      page,
      context,
    }) => {
      await openDashboardAsAdmin(page, context)
      await showAllSchoolsButton(page).click()

      await pickSpm(page, GREENFIELD_ONLY_TAG.label)

      await expect(showAllSchoolsButton(page)).toHaveAttribute('aria-pressed', 'false')
    })
  })

  // Pages are behind the same gate as the API routes — the matcher covers everything but static
  // assets — but a person gets a page rather than JSON, so a refused page request goes to the
  // landing page, which is the one route the gate lets past.
  test.describe('page requests', () => {
    test('sends a page request carrying no session to the landing page', async ({ context }) => {
      await context.clearCookies()

      const response = await context.request.get('/dashboard', { maxRedirects: 0 })

      expect(response.status()).toBe(307)
      expect(new URL(response.headers()['location'], response.url()).pathname).toBe('/')
    })

    // The landing page is the exception, and has to be: it is where a refused request is sent, and
    // it is what tells a signed-out admin to sign in on the platform and come back.
    test('serves the landing page without a session', async ({ context }) => {
      await context.clearCookies()

      const response = await context.request.get('/', { maxRedirects: 0 })

      expect(response.status()).toBe(200)
    })

    test('sends a page request whose access token has expired to the landing page', async ({
      context,
    }) => {
      await addSessionCookies(context, { accessToken: signExpiredAdminAccessToken() })

      const response = await context.request.get('/dashboard', { maxRedirects: 0 })

      expect(response.status()).toBe(307)
      expect(new URL(response.headers()['location'], response.url()).pathname).toBe('/')
    })

    // The browser-level half of the gate: the redirect above, followed to the page it lands on.
    test('shows a signed-out admin the way back to the platform', async ({ page, context }) => {
      await addSessionCookies(context, { accessToken: signExpiredAdminAccessToken() })

      await page.goto('/dashboard')

      await expect(page).toHaveURL('/')
      const signInLink = page.getByRole('link', { name: 'Sign in to the Dashboard' })
      await expect(signInLink).toBeVisible()
      await expect(signInLink).toHaveAttribute('href', process.env.HOSTED_URL || '#')
    })

    // The landing page is only for a session that fails the gate. A signed-in admin who opens it
    // has nothing to do there, so they go straight on to the dashboard.
    test('sends a signed-in admin from the landing page to the dashboard', async ({
      page,
      context,
    }) => {
      await addSessionCookies(context, { accessToken: signAccessToken() })
      await stubDashboardData(page)

      await page.goto('/')

      await expect(page).toHaveURL('/dashboard')
    })

    // Refusing a request is not the same as ending a session, and nothing in this app clears a
    // session cookie at all any more.
    test('leaves the refresh token in place when it refuses a page request', async ({
      context,
    }) => {
      await addSessionCookies(context, {
        accessToken: signExpiredAdminAccessToken(),
        refreshToken: 'not-a-live-refresh-token',
      })

      await context.request.get('/dashboard', { maxRedirects: 0 })

      const cookies = await context.cookies()

      expect(cookies.find(({ name }) => name === REFRESH_TOKEN_COOKIE)).toBeDefined()
    })

    // A non-admin token is a real session of the main platform, which shares this cookie domain.
    // Refusing it must not tear that session down.
    test('leaves the access token of a refused non-admin session', async ({ context }) => {
      await addSessionCookies(context, { accessToken: signParentAccessToken() })

      await context.request.get('/api/spm/schools', { maxRedirects: 0 })

      const cookies = await context.cookies()

      expect(cookies.find(({ name }) => name === ACCESS_TOKEN_COOKIE)).toBeDefined()
    })
  })

  // What the client owns once a fetch is refused: there is no refresh to ask for any more, so it
  // sends the browser to the landing page and leaves the session alone. lib/swr-config.ts.
  test.describe('client-side session expiry', () => {
    test('sends the browser to the landing page when a fetch is refused', async ({
      page,
      context,
    }) => {
      await openDashboardWithRefusedFetches(page, context, {
        refreshToken: 'a-refresh-token',
      })

      await page.goto('/dashboard')

      await expect(page).toHaveURL('/')
    })

    // The platform owns the session, and an expired access token on this host says nothing about
    // whether the refresh token is still good. Clearing either here would end a live session.
    test('leaves the session cookies in place when a fetch is refused', async ({
      page,
      context,
    }) => {
      await openDashboardWithRefusedFetches(page, context, {
        refreshToken: 'a-refresh-token',
      })

      await page.goto('/dashboard')
      await expect(page).toHaveURL('/')

      const cookies = await context.cookies()

      expect(cookies.find(({ name }) => name === ACCESS_TOKEN_COOKIE)).toBeDefined()
      expect(cookies.find(({ name }) => name === REFRESH_TOKEN_COOKIE)).toBeDefined()
    })
  })
})
