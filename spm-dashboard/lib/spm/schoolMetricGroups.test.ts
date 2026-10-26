import { ImportStatus } from 'lwp-shared'
import { describe, expect, it } from 'vitest'

import type { SchoolForSpm, SpmSchoolData } from '@/types/spm'

import {
  READING_LOG_TARGET_SUCCESS_THRESHOLD,
  READING_LOG_TARGET_WARNING_THRESHOLD,
  type SchoolMetricGroup,
  toSchoolMetricGroups,
} from './schoolMetricGroups'

const toEngagement = (activePercent: number | null) => ({
  activePercent,
  inactivePercent: activePercent === null ? null : 100 - activePercent,
})

const noEngagement = toEngagement(null)

/** Every metric populated, so a test can null out the single field it is about. */
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
    readyTeddyLaunchDate: null,
    readingLogCurrentTerm: toEngagement(72),
    readingLogCurrentTermComment: toEngagement(40),
    readingLogPreviousTermComment: toEngagement(35),
    readingLogTargetByClass: [{ className: 'Class 3A', activePercent: 80 }],
    teacherFeedbackInUse: true,
    schoolReadingTarget: 3,
    topicsCurrentTerm: toEngagement(65),
    activitiesCurrentTerm: toEngagement(55),
    pupilPremiumPercent: 25,
    teacherFeedbackCount: 12,
    topicsSetCount: 8,
  },
}

const withSchool = (overrides: Partial<SchoolForSpm>): SchoolForSpm => ({ ...school, ...overrides })

const withSpmData = (overrides: Partial<SpmSchoolData>): SchoolForSpm =>
  withSchool({ spmData: { ...school.spmData, ...overrides } })

const toGroupLabels = (groups: SchoolMetricGroup[]) => groups.map((group) => group.label)

const findGroup = (target: SchoolForSpm, label: string): SchoolMetricGroup | undefined =>
  toSchoolMetricGroups(target).find((group) => group.label === label)

const toPillLabels = (target: SchoolForSpm, label: string) =>
  findGroup(target, label)?.pills.map((pill) => pill.label)

const toClassTargetTone = (activePercent: number | null) =>
  findGroup(
    withSpmData({ readingLogTargetByClass: [{ className: '3A', activePercent }] }),
    'Reading target'
  )?.pills[0].tone

describe('toSchoolMetricGroups', () => {
  it('orders the groups the way they are displayed', () => {
    expect(toGroupLabels(toSchoolMetricGroups(school))).toEqual([
      'Pupil premium',
      'Reading log',
      'Teacher input',
      'Topics',
      'Reading target',
    ])
  })

  it('reports no groups at all for a school with no metrics', () => {
    const withoutMetrics = withSpmData({
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
    })

    expect(toSchoolMetricGroups(withoutMetrics)).toEqual([])
  })

  describe('pupil premium', () => {
    it('labels the pupil premium share', () => {
      expect(toPillLabels(school, 'Pupil premium')).toEqual(['PP 25%'])
    })

    it('drops the group when no pupil premium share is known', () => {
      expect(findGroup(withSpmData({ pupilPremiumPercent: null }), 'Pupil premium')).toBeUndefined()
    })

    it('keeps a pupil premium share of zero', () => {
      expect(toPillLabels(withSpmData({ pupilPremiumPercent: 0 }), 'Pupil premium')).toEqual([
        'PP 0%',
      ])
    })
  })

  describe('reading log', () => {
    it('labels the active share of the current term', () => {
      expect(toPillLabels(school, 'Reading log')?.[0]).toBe('Active 40%')
    })

    it('labels the inactive share as the complement', () => {
      expect(toPillLabels(school, 'Reading log')?.[1]).toBe('Inactive 60%')
    })

    it('labels the previous term either side of the split', () => {
      expect(toPillLabels(school, 'Reading log')?.slice(2)).toEqual([
        'Prev active 35%',
        'Prev inactive 65%',
      ])
    })

    it('omits the previous term when last term has no engagement', () => {
      const withoutPreviousTerm = withSpmData({ readingLogPreviousTermComment: noEngagement })

      expect(toPillLabels(withoutPreviousTerm, 'Reading log')).toEqual([
        'Active 40%',
        'Inactive 60%',
      ])
    })

    it('drops the group when the current term has no engagement', () => {
      const withoutCurrentTerm = withSpmData({ readingLogCurrentTermComment: noEngagement })

      expect(findGroup(withoutCurrentTerm, 'Reading log')).toBeUndefined()
    })

    it('drops the group for a school that contracted no reading log classes', () => {
      expect(findGroup(withSchool({ numOfTotalClassesAllowed: 0 }), 'Reading log')).toBeUndefined()
    })

    it('greens the active share', () => {
      expect(findGroup(school, 'Reading log')?.pills[0].tone).toBe('success')
    })

    it('mutes the previous term against the current one', () => {
      expect(findGroup(school, 'Reading log')?.pills[2].tone).toBe('muted')
    })
  })

  describe('teacher input', () => {
    it('reports teacher feedback in use', () => {
      expect(toPillLabels(school, 'Teacher input')?.[0]).toBe('Teacher feedback: in use')
    })

    it('reports teacher feedback not in use', () => {
      expect(toPillLabels(withSpmData({ teacherFeedbackInUse: false }), 'Teacher input')?.[0]).toBe(
        'Teacher feedback: not in use'
      )
    })

    it('greens teacher feedback that is in use', () => {
      expect(findGroup(school, 'Teacher input')?.pills[0].tone).toBe('success')
    })

    it('leaves teacher feedback that is not in use untoned', () => {
      expect(
        findGroup(withSpmData({ teacherFeedbackInUse: false }), 'Teacher input')?.pills[0].tone
      ).toBe('neutral')
    })

    it('counts the teacher comments', () => {
      expect(toPillLabels(school, 'Teacher input')).toContain('Teacher comments: 12')
    })

    it('omits the comment count when it is unknown', () => {
      expect(toPillLabels(withSpmData({ teacherFeedbackCount: null }), 'Teacher input')).toEqual([
        'Teacher feedback: in use',
        'Target: 3/wk',
      ])
    })

    it('reports the weekly reading target', () => {
      expect(toPillLabels(school, 'Teacher input')).toContain('Target: 3/wk')
    })

    it('omits the weekly reading target when the school has not set one', () => {
      expect(toPillLabels(withSpmData({ schoolReadingTarget: null }), 'Teacher input')).toEqual([
        'Teacher feedback: in use',
        'Teacher comments: 12',
      ])
    })

    it('drops the group when it is unknown whether teacher feedback is in use', () => {
      expect(
        findGroup(withSpmData({ teacherFeedbackInUse: null }), 'Teacher input')
      ).toBeUndefined()
    })

    it('drops the group for a school that contracted no reading log classes', () => {
      expect(
        findGroup(withSchool({ numOfTotalClassesAllowed: 0 }), 'Teacher input')
      ).toBeUndefined()
    })
  })

  describe('topics', () => {
    it('labels the active topic share', () => {
      expect(toPillLabels(school, 'Topics')?.[0]).toBe('Topics active 65%')
    })

    it('labels the inactive topic share as the complement', () => {
      expect(toPillLabels(school, 'Topics')?.[1]).toBe('Topics inactive 35%')
    })

    it('labels both activity shares', () => {
      expect(toPillLabels(school, 'Topics')?.slice(2, 4)).toEqual([
        'Activities active 55%',
        'Activities inactive 45%',
      ])
    })

    it('omits the activity shares when no activities have been assigned', () => {
      expect(toPillLabels(withSpmData({ activitiesCurrentTerm: noEngagement }), 'Topics')).toEqual([
        'Topics active 65%',
        'Topics inactive 35%',
        'Topics set: 8',
      ])
    })

    it('counts the topics set', () => {
      expect(toPillLabels(school, 'Topics')).toContain('Topics set: 8')
    })

    it('omits the topics set count when it is unknown', () => {
      expect(toPillLabels(withSpmData({ topicsSetCount: null }), 'Topics')).not.toContain(
        'Topics set: 8'
      )
    })

    it('drops the group when no topic engagement is known', () => {
      expect(findGroup(withSpmData({ topicsCurrentTerm: noEngagement }), 'Topics')).toBeUndefined()
    })

    it('keeps the group for a school that contracted no reading log classes', () => {
      expect(findGroup(withSchool({ numOfTotalClassesAllowed: 0 }), 'Topics')).toBeDefined()
    })

    it('sets the activity shares apart from the topic ones', () => {
      expect(findGroup(school, 'Topics')?.pills[2].tone).toBe('accent')
    })
  })

  describe('reading target', () => {
    it('labels a pill per class', () => {
      const withTwoClasses = withSpmData({
        readingLogTargetByClass: [
          { className: 'Class 3A', activePercent: 80 },
          { className: 'Class 4B', activePercent: 20 },
        ],
      })

      expect(toPillLabels(withTwoClasses, 'Reading target')).toEqual([
        'Class 3A: 80%',
        'Class 4B: 20%',
      ])
    })

    it('drops the group when no class has a reading target', () => {
      expect(
        findGroup(withSpmData({ readingLogTargetByClass: [] }), 'Reading target')
      ).toBeUndefined()
    })

    it('drops the group for a school that contracted no reading log classes', () => {
      expect(
        findGroup(withSchool({ numOfTotalClassesAllowed: 0 }), 'Reading target')
      ).toBeUndefined()
    })

    it('greens a class that met the success threshold', () => {
      expect(toClassTargetTone(READING_LOG_TARGET_SUCCESS_THRESHOLD)).toBe('success')
    })

    it('warns on a class just short of the success threshold', () => {
      expect(toClassTargetTone(READING_LOG_TARGET_SUCCESS_THRESHOLD - 1)).toBe('warning')
    })

    it('warns on a class that met the warning threshold', () => {
      expect(toClassTargetTone(READING_LOG_TARGET_WARNING_THRESHOLD)).toBe('warning')
    })

    it('errors on a class just short of the warning threshold', () => {
      expect(toClassTargetTone(READING_LOG_TARGET_WARNING_THRESHOLD - 1)).toBe('error')
    })

    it('treats a class with no known share as having earned nothing', () => {
      expect(toClassTargetTone(null)).toBe('error')
    })

    it('labels a class with no known share as zero', () => {
      const withUnknownShare = withSpmData({
        readingLogTargetByClass: [{ className: 'Class 3A', activePercent: null }],
      })

      expect(toPillLabels(withUnknownShare, 'Reading target')).toEqual(['Class 3A: 0%'])
    })
  })
})
