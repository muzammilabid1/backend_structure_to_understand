import { ImportStatus } from 'lwp-shared'
import { describe, expect, it } from 'vitest'

import { LAUNCH_BADGE_COLOURS, PROGRAMME_COLOURS } from '@/lib/ui/designTokens'
import type { SchoolForSpm, SpmSchoolData } from '@/types/spm'

import { toSchoolIssues } from './schoolIssues'
import { type SchoolTableRow, toSchoolTableRow } from './schoolTableRows'

const noEngagement = { activePercent: null, inactivePercent: null }

const school: SchoolForSpm = {
  id: '1',
  schoolName: 'Maple Primary',
  numOfTotalClassesAllowed: 6,
  numOfFullProgrammeClassesAllowed: 4,
  isMoneySkillsAvailable: true,
  isReadyTeddyAvailable: true,
  misIntegration: 'WONDE',
  importStatus: ImportStatus.COMPLETE,
  lastImportedAt: '2026-08-01T00:00:00.000Z',
  hasCurrentAcademicYearWondeData: true,
  ignoreAcademicYearCheckDuringImport: false,
  skipAutoWondeImport: false,
  currentAcademicYearIndex: 2025,
  spmData: {
    activatedClassCount: 6,
    hasUnconfirmedParentDetails: false,
    pupilsWithoutMisCount: 0,
    classesWithNoActiveTeacherCount: 0,
    parentsAwaitingInviteCount: 0,
    readingLogLaunchDate: '2026-01-10T00:00:00.000Z',
    mathsEnglishLaunchDate: '2026-02-10T00:00:00.000Z',
    moneySkillsLaunchDate: null,
    readyTeddyLaunchDate: '2026-03-10T00:00:00.000Z',
    readingLogCurrentTerm: noEngagement,
    readingLogCurrentTermComment: noEngagement,
    readingLogPreviousTermComment: noEngagement,
    readingLogTargetByClass: [],
    teacherFeedbackInUse: null,
    schoolReadingTarget: null,
    topicsCurrentTerm: noEngagement,
    activitiesCurrentTerm: noEngagement,
    pupilPremiumPercent: null,
    teacherFeedbackCount: null,
    topicsSetCount: null,
  },
}

const withSchool = (overrides: Partial<SchoolForSpm>): SchoolForSpm => ({ ...school, ...overrides })

const withSpmData = (overrides: Partial<SpmSchoolData>): SchoolForSpm =>
  withSchool({ spmData: { ...school.spmData, ...overrides } })

const toLaunchStates = (row: SchoolTableRow) => row.launches.map((launch) => launch.state)

const toLaunchedOnLabels = (row: SchoolTableRow) =>
  row.launches.map((launch) => launch.launchedOn?.label ?? null)

describe('toSchoolTableRow', () => {
  it('marks activation complete when every contracted class is activated', () => {
    expect(toSchoolTableRow(school).classActivation).toBe('complete')
  })

  it('marks activation partial when only some contracted classes are activated', () => {
    expect(toSchoolTableRow(withSpmData({ activatedClassCount: 5 })).classActivation).toBe(
      'partial'
    )
  })

  it('marks activation none when no contracted class is activated', () => {
    expect(toSchoolTableRow(withSpmData({ activatedClassCount: 0 })).classActivation).toBe('none')
  })

  it('reports no activation status when the school contracted no classes', () => {
    expect(toSchoolTableRow(withSchool({ numOfTotalClassesAllowed: 0 })).classActivation).toBeNull()
  })

  it('orders the launch states by programme column', () => {
    expect(toLaunchStates(toSchoolTableRow(school))).toEqual([
      'launched',
      'launched',
      'notLaunched',
      'launched',
    ])
  })

  it('reports a subscribed programme with no launch date as not launched', () => {
    expect(toLaunchStates(toSchoolTableRow(withSpmData({ readingLogLaunchDate: null })))[0]).toBe(
      'notLaunched'
    )
  })

  it('reports Maths & English as not launched when it has no launch date', () => {
    expect(toLaunchStates(toSchoolTableRow(withSpmData({ mathsEnglishLaunchDate: null })))[1]).toBe(
      'notLaunched'
    )
  })

  it('reports Ready Teddy as not launched when it has no launch date', () => {
    expect(toLaunchStates(toSchoolTableRow(withSpmData({ readyTeddyLaunchDate: null })))[3]).toBe(
      'notLaunched'
    )
  })

  it('dates each launched programme', () => {
    expect(toLaunchedOnLabels(toSchoolTableRow(school))).toEqual([
      '10 Jan 2026',
      '10 Feb 2026',
      null,
      '10 Mar 2026',
    ])
  })

  it('carries the launch date the browser can read as a timestamp', () => {
    expect(toSchoolTableRow(school).launches[0].launchedOn?.iso).toBe('2026-01-10T00:00:00.000Z')
  })

  it('dates no programme the school has yet to launch', () => {
    expect(
      toLaunchedOnLabels(toSchoolTableRow(withSpmData({ readingLogLaunchDate: null })))[0]
    ).toBeNull()
  })

  it('dates no programme the school is not subscribed to, even when it launched one', () => {
    expect(
      toLaunchedOnLabels(toSchoolTableRow(withSchool({ isReadyTeddyAvailable: false })))[3]
    ).toBeNull()
  })

  it('reports an unsubscribed programme as not subscribed', () => {
    expect(
      toLaunchStates(toSchoolTableRow(withSchool({ numOfFullProgrammeClassesAllowed: 0 })))[1]
    ).toBe('notSubscribed')
  })

  it('reports Ready Teddy as not subscribed when the school lacks it', () => {
    expect(toLaunchStates(toSchoolTableRow(withSchool({ isReadyTeddyAvailable: false })))[3]).toBe(
      'notSubscribed'
    )
  })

  it('labels each launch badge for display', () => {
    expect(toSchoolTableRow(school).launches.map((launch) => launch.label)).toEqual([
      'Launched',
      'Launched',
      'Not launched',
      'Launched',
    ])
  })

  it('colours a launched badge green', () => {
    expect(toSchoolTableRow(school).launches[0].colour).toEqual(LAUNCH_BADGE_COLOURS.launched)
  })

  it('colours a badge for an unsubscribed programme neutral', () => {
    expect(
      toSchoolTableRow(withSchool({ numOfFullProgrammeClassesAllowed: 0 })).launches[1].colour
    ).toEqual(LAUNCH_BADGE_COLOURS.notSubscribed)
  })

  it('shows a pill only for the programmes the school subscribes to', () => {
    expect(
      toSchoolTableRow(withSchool({ isMoneySkillsAvailable: false })).programmes.map(
        (pill) => pill.abbreviation
      )
    ).toEqual(['DRL', 'M&E', 'RT'])
  })

  it('colours each pill from its programme token', () => {
    expect(toSchoolTableRow(school).programmes[0]).toEqual({
      key: 'digitalReadingLog',
      abbreviation: 'DRL',
      colour: PROGRAMME_COLOURS.digitalReadingLog.badge,
    })
  })

  it('carries the issues of the school it describes', () => {
    expect(toSchoolTableRow(withSchool({ importStatus: ImportStatus.FAILED })).issues).toEqual(
      toSchoolIssues(withSchool({ importStatus: ImportStatus.FAILED }))
    )
  })
})
