import { ImportStatus } from 'lwp-shared'
import { describe, expect, it } from 'vitest'

import type { SchoolForSpm, SpmSchoolData } from '@/types/spm'

import { type SchoolIssue, toSchoolIssues } from './schoolIssues'

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
  lastImportedAt: '2026-03-05T00:00:00.000Z',
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
    readingLogLaunchDate: null,
    mathsEnglishLaunchDate: null,
    moneySkillsLaunchDate: null,
    readyTeddyLaunchDate: null,
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

const withSpmData = (overrides: Partial<SpmSchoolData>): SchoolForSpm => ({
  ...school,
  spmData: { ...school.spmData, ...overrides },
})

/** A Wonde school no import has yet proved holds this academic year's data. */
const unconfirmedYear = (overrides: Partial<SchoolForSpm> = {}): SchoolForSpm =>
  withSchool({ hasCurrentAcademicYearWondeData: false, ...overrides })

const firstIssue = (school: SchoolForSpm): SchoolIssue => {
  const [issue] = toSchoolIssues(school)
  if (!issue) throw new Error(`${school.schoolName} raised no issue to assert on`)

  return issue
}

describe('toSchoolIssues', () => {
  it('raises no issue for a school with nothing wrong', () => {
    expect(toSchoolIssues(school)).toEqual([])
  })

  it('raises no issue while an import is still running', () => {
    expect(toSchoolIssues(withSchool({ importStatus: ImportStatus.IMPORTING_DATA }))).toEqual([])
  })

  it('ignores the import status of a school that is not on Wonde', () => {
    expect(toSchoolIssues(withSchool({ misIntegration: 'CSV', importStatus: null }))).toEqual([])
  })

  it('raises an error when the last sync failed', () => {
    expect(firstIssue(withSchool({ importStatus: ImportStatus.FAILED })).severity).toBe('error')
  })

  it('raises an error when Wonde permissions need updating', () => {
    expect(
      firstIssue(withSchool({ importStatus: ImportStatus.PERMISSION_NEED_UPDATING })).severity
    ).toBe('error')
  })

  it('leaves a wrong-academic-year status to the school flag that outlives it', () => {
    expect(toSchoolIssues(withSchool({ importStatus: ImportStatus.WRONG_ACADEMIC_YEAR }))).toEqual(
      []
    )
  })

  it('warns when an import is waiting on the school to check its pupil links', () => {
    expect(firstIssue(withSchool({ importStatus: ImportStatus.LINKING_PUPILS })).severity).toBe(
      'warning'
    )
  })

  it('warns when an import is waiting on the school to check its class links', () => {
    expect(firstIssue(withSchool({ importStatus: ImportStatus.LINKING_CLASSES })).severity).toBe(
      'warning'
    )
  })

  it('warns when an import is waiting on the school to check its data changes', () => {
    expect(firstIssue(withSchool({ importStatus: ImportStatus.DIFFING_ENTITIES })).severity).toBe(
      'warning'
    )
  })

  it('mutes the issue for a school that has never synced', () => {
    expect(firstIssue(withSchool({ importStatus: null })).severity).toBe('muted')
  })

  it('titles a waiting import as data the school still has to check', () => {
    expect(firstIssue(withSchool({ importStatus: ImportStatus.LINKING_PUPILS })).title).toBe(
      'Imported data waiting to be checked'
    )
  })

  it('dates the changes a waiting import brought in', () => {
    expect(firstIssue(withSchool({ importStatus: ImportStatus.LINKING_PUPILS })).explanation).toBe(
      'Wonde brought in changes on 5 Mar 2026. The school has not reviewed them, so the import cannot finish.'
    )
  })

  it('leaves the date out when a waiting import has never recorded one', () => {
    expect(
      firstIssue(withSchool({ importStatus: ImportStatus.LINKING_PUPILS, lastImportedAt: null }))
        .explanation
    ).toBe('Wonde has brought in changes the school has not reviewed, so the import cannot finish.')
  })

  it('dates the last sync attempt when the latest one failed', () => {
    expect(firstIssue(withSchool({ importStatus: ImportStatus.FAILED })).explanation).toBe(
      'Last sync attempt 5 Mar 2026. Pupil and class data stays as it is until a sync succeeds.'
    )
  })

  it('points a waiting import at the changes the school has to review', () => {
    expect(firstIssue(withSchool({ importStatus: ImportStatus.LINKING_PUPILS })).action).toEqual({
      label: 'Open data changes',
      url: 'https://platform.test/admin/school/1',
    })
  })

  it('points a failed sync at the school data page', () => {
    expect(firstIssue(withSchool({ importStatus: ImportStatus.FAILED })).action?.label).toBe(
      'Open school data page'
    )
  })

  it('raises no issue when every class has an active teacher', () => {
    expect(toSchoolIssues(withSpmData({ classesWithNoActiveTeacherCount: 0 }))).toEqual([])
  })

  it('raises an error when no teacher on a class has logged in lately', () => {
    expect(firstIssue(withSpmData({ classesWithNoActiveTeacherCount: 2 })).severity).toBe('error')
  })

  it('counts the classes left without an active teacher', () => {
    expect(firstIssue(withSpmData({ classesWithNoActiveTeacherCount: 2 })).count).toBe(2)
  })

  it('titles the inactive teachers with how many classes they leave', () => {
    expect(firstIssue(withSpmData({ classesWithNoActiveTeacherCount: 2 })).title).toBe(
      '2 classes have no active teacher'
    )
  })

  it('speaks of a single class without an active teacher in the singular', () => {
    expect(firstIssue(withSpmData({ classesWithNoActiveTeacherCount: 1 })).title).toBe(
      '1 class has no active teacher'
    )
  })

  it('says how long the teachers of those classes have been away', () => {
    expect(firstIssue(withSpmData({ classesWithNoActiveTeacherCount: 2 })).explanation).toBe(
      'No teacher on these classes has logged in for over 14 days.'
    )
  })

  it('offers a way in to the classes it counted', () => {
    expect(firstIssue(withSpmData({ classesWithNoActiveTeacherCount: 2 })).action?.label).toBe(
      'See the classes'
    )
  })

  it('raises no issue when every pupil is linked to the MIS', () => {
    expect(toSchoolIssues(withSpmData({ pupilsWithoutMisCount: 0 }))).toEqual([])
  })

  it('warns when pupils are not linked to the MIS', () => {
    expect(firstIssue(withSpmData({ pupilsWithoutMisCount: 11 })).severity).toBe('warning')
  })

  it('counts the unlinked pupils on the issue', () => {
    expect(firstIssue(withSpmData({ pupilsWithoutMisCount: 11 })).count).toBe(11)
  })

  it('titles the unlinked pupils with how many there are', () => {
    expect(firstIssue(withSpmData({ pupilsWithoutMisCount: 11 })).title).toBe(
      '11 pupils not linked to Wonde'
    )
  })

  it('speaks of a single unlinked pupil in the singular', () => {
    expect(firstIssue(withSpmData({ pupilsWithoutMisCount: 1 })).title).toBe(
      '1 pupil not linked to Wonde'
    )
  })

  it('says what unlinked pupils will miss', () => {
    expect(firstIssue(withSpmData({ pupilsWithoutMisCount: 11 })).explanation).toBe(
      'These pupils will not pick up class or year-group changes from the MIS.'
    )
  })

  it('offers a way to link the pupils it counted', () => {
    expect(firstIssue(withSpmData({ pupilsWithoutMisCount: 11 })).action?.label).toBe('Link pupils')
  })

  it('raises no issue when no parent is awaiting an invite', () => {
    expect(toSchoolIssues(withSpmData({ parentsAwaitingInviteCount: 0 }))).toEqual([])
  })

  it('warns when parents are awaiting an invite', () => {
    expect(firstIssue(withSpmData({ parentsAwaitingInviteCount: 3 })).severity).toBe('warning')
  })

  it('counts the invites never sent on the issue', () => {
    expect(firstIssue(withSpmData({ parentsAwaitingInviteCount: 3 })).count).toBe(3)
  })

  it('titles the awaiting parents with how many there are', () => {
    expect(firstIssue(withSpmData({ parentsAwaitingInviteCount: 3 })).title).toBe(
      '3 parents awaiting invite'
    )
  })

  it('speaks of a single awaiting parent in the singular', () => {
    expect(firstIssue(withSpmData({ parentsAwaitingInviteCount: 1 })).title).toBe(
      '1 parent awaiting invite'
    )
  })

  it('says what an unsent invitation costs the school', () => {
    expect(firstIssue(withSpmData({ parentsAwaitingInviteCount: 3 })).explanation).toBe(
      'The school set these parents up but never sent their invitation, so nothing has reached them.'
    )
  })

  it('points the SPM at the parents it counted', () => {
    expect(firstIssue(withSpmData({ parentsAwaitingInviteCount: 3 })).action).toEqual({
      label: 'See the parents',
      url: 'https://platform.test/admin/school/1',
    })
  })

  it('warns when parent details are waiting to be confirmed', () => {
    expect(firstIssue(withSpmData({ hasUnconfirmedParentDetails: true })).key).toBe('parentDetails')
  })

  it('says what unconfirmed parent details cost the school', () => {
    expect(firstIssue(withSpmData({ hasUnconfirmedParentDetails: true })).explanation).toBe(
      'Parents were imported but never confirmed, so nothing the school sends reaches home.'
    )
  })

  it('raises its issues worst first, so the errors lead', () => {
    const failingSchool = withSchool({ importStatus: ImportStatus.FAILED })
    const issues = toSchoolIssues({
      ...failingSchool,
      spmData: {
        ...failingSchool.spmData,
        classesWithNoActiveTeacherCount: 2,
        pupilsWithoutMisCount: 11,
        parentsAwaitingInviteCount: 3,
        hasUnconfirmedParentDetails: true,
      },
    })

    expect(issues.map((issue) => issue.key)).toEqual([
      'wondeSync',
      'teachersInactive',
      'misLinks',
      'parentsAwaitingInvite',
      'parentDetails',
    ])
  })

  it('raises an error when Wonde has never proved it holds this academic year', () => {
    expect(firstIssue(unconfirmedYear()).severity).toBe('error')
  })

  it('names the unconfirmed academic year as its own issue', () => {
    expect(firstIssue(unconfirmedYear()).key).toBe('wondeAcademicYear')
  })

  it('raises no academic-year issue for a school that opts out of the check', () => {
    expect(toSchoolIssues(unconfirmedYear({ ignoreAcademicYearCheckDuringImport: true }))).toEqual(
      []
    )
  })

  it('raises no academic-year issue for a school that is not on Wonde', () => {
    expect(toSchoolIssues(unconfirmedYear({ misIntegration: 'CSV' }))).toEqual([])
  })

  it('dates a sync attempt made since the academic year started', () => {
    expect(firstIssue(unconfirmedYear()).explanation).toBe(
      'Last sync attempt 5 Mar 2026. Wonde has not returned data for this academic year, so new classes and pupils will not arrive.'
    )
  })

  it('counts an attempt made on the first day of the academic year', () => {
    expect(
      firstIssue(unconfirmedYear({ lastImportedAt: '2025-09-01T00:00:00.000Z' })).explanation
    ).toContain('Last sync attempt 1 Sept 2025.')
  })

  it('reports no attempt when the last one predates the academic year', () => {
    expect(
      firstIssue(unconfirmedYear({ lastImportedAt: '2025-06-01T00:00:00.000Z' })).explanation
    ).toBe(
      'No sync has been attempted since this academic year started, so no new classes or pupils have arrived.'
    )
  })

  it('reports no attempt when the school has never imported', () => {
    expect(firstIssue(unconfirmedYear({ lastImportedAt: null })).explanation).toBe(
      'No sync has been attempted since this academic year started, so no new classes or pupils have arrived.'
    )
  })

  it('counts an attempt when the school has no academic year on record', () => {
    expect(firstIssue(unconfirmedYear({ currentAcademicYearIndex: null })).explanation).toContain(
      'Last sync attempt 5 Mar 2026.'
    )
  })

  it('says when nothing will clear the issue overnight', () => {
    expect(firstIssue(unconfirmedYear({ skipAutoWondeImport: true })).explanation).toContain(
      'Automatic overnight sync is off for this school.'
    )
  })

  it('raises both Wonde issues when a failed sync leaves the year unconfirmed', () => {
    expect(
      toSchoolIssues(unconfirmedYear({ importStatus: ImportStatus.FAILED })).map(
        (issue) => issue.key
      )
    ).toEqual(['wondeSync', 'wondeAcademicYear'])
  })

  it('points an unconfirmed academic year at the school data page', () => {
    expect(firstIssue(unconfirmedYear()).action?.label).toBe('Open school data page')
  })
})
