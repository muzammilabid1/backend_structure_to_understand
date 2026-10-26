import { describe, expect, it } from 'vitest'

import { type SpmSchoolMetricsRow, toSpmSchoolMetricRows } from './spmViewQueries'

const REFRESHED_AT = new Date('2026-09-20T05:00:00.000Z')

const emptyMetricsRow: SpmSchoolMetricsRow = {
  schoolId: '1',
  activatedClassCount: 0,
  hasUnconfirmedParentDetails: false,
  readingLogLaunchDate: null,
  mathsEnglishLaunchDate: null,
  moneySkillsLaunchDate: null,
  readyTeddyLaunchDate: null,
  readingLogCurrentTermActivePercent: null,
  readingLogCurrentTermCommentActivePercent: null,
  readingLogPreviousTermCommentActivePercent: null,
  teacherFeedbackInUse: null,
  schoolReadingTarget: null,
  topicsCurrentTermActivePercent: null,
  activitiesCurrentTermActivePercent: null,
  pupilPremiumPercent: null,
  teacherFeedbackCount: null,
  topicsSetCount: null,
  readingLogAtHomeCount: 0,
  readingLogAtSchoolCount: 0,
  classesWithNoActiveTeacherCount: 0,
  refreshedAt: REFRESHED_AT,
}

const populatedMetricsRow: SpmSchoolMetricsRow = {
  schoolId: '2',
  activatedClassCount: 4,
  hasUnconfirmedParentDetails: true,
  readingLogLaunchDate: new Date('2026-01-05T09:00:00.000Z'),
  mathsEnglishLaunchDate: new Date('2026-01-06T09:00:00.000Z'),
  moneySkillsLaunchDate: new Date('2026-01-07T09:00:00.000Z'),
  readyTeddyLaunchDate: new Date('2026-01-08T09:00:00.000Z'),
  readingLogCurrentTermActivePercent: 61,
  readingLogCurrentTermCommentActivePercent: 42,
  readingLogPreviousTermCommentActivePercent: 37,
  teacherFeedbackInUse: true,
  schoolReadingTarget: 3,
  topicsCurrentTermActivePercent: 55,
  activitiesCurrentTermActivePercent: 48,
  pupilPremiumPercent: 21,
  teacherFeedbackCount: 12,
  topicsSetCount: 9,
  readingLogAtHomeCount: 300,
  readingLogAtSchoolCount: 40,
  classesWithNoActiveTeacherCount: 2,
  refreshedAt: REFRESHED_AT,
}

const classTargetRows = [
  { schoolId: '2', className: 'Class A', activePercent: 70 },
  { schoolId: '2', className: 'Class B', activePercent: null },
]

describe('toSpmSchoolMetricRows', () => {
  it('reports the activated class count for every school in the view', () => {
    expect(toSpmSchoolMetricRows([emptyMetricsRow, populatedMetricsRow], []).classCounts).toEqual([
      { schoolId: '1', activeClassCount: 0 },
      { schoolId: '2', activeClassCount: 4 },
    ])
  })

  it('omits a school from every optional metric when its view row holds nulls', () => {
    const metrics = toSpmSchoolMetricRows([emptyMetricsRow], [])

    expect({
      unconfirmedParentSchoolIds: metrics.unconfirmedParentSchoolIds,
      readingLogLaunchDates: metrics.readingLogLaunchDates,
      mathsEnglishLaunchDates: metrics.mathsEnglishLaunchDates,
      moneySkillsLaunchDates: metrics.moneySkillsLaunchDates,
      readyTeddyLaunchDates: metrics.readyTeddyLaunchDates,
      teacherFeedbackInUse: metrics.teacherFeedbackInUse,
      schoolReadingTargets: metrics.schoolReadingTargets,
      teacherFeedbackCounts: metrics.teacherFeedbackCounts,
      topicsSetCounts: metrics.topicsSetCounts,
    }).toEqual({
      unconfirmedParentSchoolIds: [],
      readingLogLaunchDates: [],
      mathsEnglishLaunchDates: [],
      moneySkillsLaunchDates: [],
      readyTeddyLaunchDates: [],
      teacherFeedbackInUse: [],
      schoolReadingTargets: [],
      teacherFeedbackCounts: [],
      topicsSetCounts: [],
    })
  })

  it('keeps a null percent as a row with no value, not a missing row', () => {
    expect(toSpmSchoolMetricRows([emptyMetricsRow], []).readingLogCurrentTerm).toEqual([
      { schoolId: '1', activePercent: null },
    ])
  })

  it('maps each launch date onto its own programme', () => {
    const metrics = toSpmSchoolMetricRows([populatedMetricsRow], [])

    expect({
      readingLog: metrics.readingLogLaunchDates,
      mathsEnglish: metrics.mathsEnglishLaunchDates,
      moneySkills: metrics.moneySkillsLaunchDates,
      readyTeddy: metrics.readyTeddyLaunchDates,
    }).toEqual({
      readingLog: [{ schoolId: '2', launchDate: new Date('2026-01-05T09:00:00.000Z') }],
      mathsEnglish: [{ schoolId: '2', launchDate: new Date('2026-01-06T09:00:00.000Z') }],
      moneySkills: [{ schoolId: '2', launchDate: new Date('2026-01-07T09:00:00.000Z') }],
      readyTeddy: [{ schoolId: '2', launchDate: new Date('2026-01-08T09:00:00.000Z') }],
    })
  })

  it('maps each engagement percent onto its own metric', () => {
    const metrics = toSpmSchoolMetricRows([populatedMetricsRow], [])

    expect({
      readingLogCurrentTerm: metrics.readingLogCurrentTerm,
      readingLogCurrentTermComment: metrics.readingLogCurrentTermComment,
      readingLogPreviousTermComment: metrics.readingLogPreviousTermComment,
      topicsCurrentTerm: metrics.topicsCurrentTerm,
      activitiesCurrentTerm: metrics.activitiesCurrentTerm,
      pupilPremium: metrics.pupilPremium,
    }).toEqual({
      readingLogCurrentTerm: [{ schoolId: '2', activePercent: 61 }],
      readingLogCurrentTermComment: [{ schoolId: '2', activePercent: 42 }],
      readingLogPreviousTermComment: [{ schoolId: '2', activePercent: 37 }],
      topicsCurrentTerm: [{ schoolId: '2', activePercent: 55 }],
      activitiesCurrentTerm: [{ schoolId: '2', activePercent: 48 }],
      pupilPremium: [{ schoolId: '2', premiumPercent: 21 }],
    })
  })

  it('maps each populated count and flag onto its own metric', () => {
    const metrics = toSpmSchoolMetricRows([populatedMetricsRow], [])

    expect({
      unconfirmedParentSchoolIds: metrics.unconfirmedParentSchoolIds,
      teacherFeedbackInUse: metrics.teacherFeedbackInUse,
      schoolReadingTargets: metrics.schoolReadingTargets,
      teacherFeedbackCounts: metrics.teacherFeedbackCounts,
      topicsSetCounts: metrics.topicsSetCounts,
      classesWithNoActiveTeacher: metrics.classesWithNoActiveTeacher,
    }).toEqual({
      unconfirmedParentSchoolIds: [{ schoolId: '2' }],
      teacherFeedbackInUse: [{ schoolId: '2', isInUse: true }],
      schoolReadingTargets: [{ schoolId: '2', readingTarget: 3 }],
      teacherFeedbackCounts: [{ schoolId: '2', teacherFeedbackCount: 12 }],
      topicsSetCounts: [{ schoolId: '2', topicsSetCount: 9 }],
      classesWithNoActiveTeacher: [{ schoolId: '2', classesWithNoActiveTeacherCount: 2 }],
    })
  })

  it('keeps a school reporting teacher feedback in use as false', () => {
    expect(
      toSpmSchoolMetricRows([{ ...populatedMetricsRow, teacherFeedbackInUse: false }], [])
        .teacherFeedbackInUse
    ).toEqual([{ schoolId: '2', isInUse: false }])
  })

  it('passes the class target rows through unchanged', () => {
    expect(
      toSpmSchoolMetricRows([populatedMetricsRow], classTargetRows).readingLogTargetByClass
    ).toEqual(classTargetRows)
  })
})
