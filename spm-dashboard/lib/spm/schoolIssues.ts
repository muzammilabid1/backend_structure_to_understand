import type { ImportStatus } from 'lwp-shared'

import { formatDayMonthYear } from '@/lib/helpers/formatDate'
import { toSchoolAdminUrl } from '@/lib/spm/platformLinks'
import type { SchoolForSpm } from '@/types/spm'

export type IssueSeverity = 'error' | 'warning' | 'muted'
export type IssueKey =
  | 'wondeSync'
  | 'wondeAcademicYear'
  | 'teachersInactive'
  | 'misLinks'
  | 'parentsAwaitingInvite'
  | 'parentDetails'

export type IssueAction = {
  label: string
  url: string
}

export type SchoolIssue = {
  key: IssueKey
  severity: IssueSeverity
  /** How many of a thing the issue counts, where counting one is meaningful. */
  count: number | null
  title: string
  explanation: string
  action: IssueAction | null
}

type IssueCopy = {
  severity: IssueSeverity
  title: string
  toExplanation: (school: SchoolForSpm) => string
  actionLabel: string
}

// `lastImportedAt` dates the last attempt only, not status change
const toLastAttemptDisplayMessage = (lastImportedAt: string | null): string =>
  lastImportedAt ? `Last sync attempt ${formatDayMonthYear(lastImportedAt)}. ` : ''

const toFailedSyncExplanation = ({ lastImportedAt }: SchoolForSpm): string =>
  `${toLastAttemptDisplayMessage(lastImportedAt)}Pupil and class data stays as it is until a sync succeeds.`

const toUncheckedImportExplanation = ({ lastImportedAt }: SchoolForSpm): string =>
  lastImportedAt
    ? `Wonde brought in changes on ${formatDayMonthYear(lastImportedAt)}. The school has not reviewed them, so the import cannot finish.`
    : 'Wonde has brought in changes the school has not reviewed, so the import cannot finish.'

// The status behind the platform's "Data imported - please check to continue" banner. Three
// import statuses share it, and all three sit waiting on the school rather than on Wonde.
const UNCHECKED_IMPORT: IssueCopy = {
  severity: 'warning',
  title: 'Imported data waiting to be checked',
  toExplanation: toUncheckedImportExplanation,
  actionLabel: 'Open data changes',
}

const NEVER_SYNCED: IssueCopy = {
  severity: 'muted',
  title: 'Never synced with Wonde',
  toExplanation: () =>
    'No import has ever run for this school, so no pupils or classes came from the MIS.',
  actionLabel: 'Open school data page',
}

// Statuses absent from this map are either healthy or mid-sync, and need nothing from an SPM.
// WRONG_ACADEMIC_YEAR is absent deliberately: hasCurrentAcademicYearWondeData reports the same
// problem and survives the next import, where the status does not.
const WONDE_ISSUE_COPY: Partial<Record<ImportStatus, IssueCopy>> = {
  FAILED: {
    severity: 'error',
    title: 'Wonde sync failed',
    toExplanation: toFailedSyncExplanation,
    actionLabel: 'Open school data page',
  },
  PERMISSION_NEED_UPDATING: {
    severity: 'error',
    title: 'Wonde permissions need updating',
    toExplanation: () =>
      'Wonde will not release the school’s data until the school approves the connection again.',
    actionLabel: 'Open school data page',
  },
  LINKING_PUPILS: UNCHECKED_IMPORT,
  LINKING_CLASSES: UNCHECKED_IMPORT,
  DIFFING_ENTITIES: UNCHECKED_IMPORT,
}

const PARENT_DETAILS: IssueCopy = {
  severity: 'warning',
  title: 'Parent details need confirming',
  toExplanation: () =>
    'Parents were imported but never confirmed, so nothing the school sends reaches home.',
  actionLabel: 'Confirm parent details',
}

/**
 * Returns the assumed start of the academic year: 1 September of the year the index names.
 *
 * static_lwp_period carries a startDate, but admins type it in per environment and it is wrong
 * on some. The index is the calendar year the academic year starts in — the platform scopes all
 * year-bound data by it and the academic year rollover maintains it — so 1 September of that
 * year is a more reliable boundary than the recorded startDate.
 */
const toAssumedAcademicYearStart = (academicYearIndex: number): Date => {
  const SEPTEMBER_AS_DATE_MONTH = 8

  return new Date(Date.UTC(academicYearIndex, SEPTEMBER_AS_DATE_MONTH, 1))
}

const hasSyncAttemptThisAcademicYear = ({
  lastImportedAt,
  currentAcademicYearIndex,
}: SchoolForSpm): boolean => {
  if (!lastImportedAt) {
    return false
  }

  // Without an academic year the attempt cannot be placed, so it counts rather than claiming a gap.
  if (currentAcademicYearIndex === null) {
    return true
  }

  return new Date(lastImportedAt) >= toAssumedAcademicYearStart(currentAcademicYearIndex)
}

// The nightly re-import skips these schools, so nothing will clear the issue on its own.
const toAutoImportSentence = ({ skipAutoWondeImport }: SchoolForSpm): string =>
  skipAutoWondeImport ? ' Automatic overnight sync is off for this school.' : ''

const toAcademicYearExplanation = (school: SchoolForSpm): string => {
  const detail = hasSyncAttemptThisAcademicYear(school)
    ? `${toLastAttemptDisplayMessage(school.lastImportedAt)}Wonde has not returned data for this academic year, so new classes and pupils will not arrive.`
    : 'No sync has been attempted since this academic year started, so no new classes or pupils have arrived.'

  return `${detail}${toAutoImportSentence(school)}`
}

const ACADEMIC_YEAR: IssueCopy = {
  severity: 'error',
  title: 'No Wonde data for this academic year',
  toExplanation: toAcademicYearExplanation,
  actionLabel: 'Open school data page',
}

const isWondeSchool = (school: SchoolForSpm): boolean =>
  !!school.misIntegration && school.misIntegration !== 'CSV'

const toAction = (schoolId: string, label: string): IssueAction | null => {
  const url = toSchoolAdminUrl(schoolId)

  return url ? { label, url } : null
}

const toIssue = (school: SchoolForSpm, key: IssueKey, copy: IssueCopy): SchoolIssue => ({
  key,
  severity: copy.severity,
  count: null,
  title: copy.title,
  explanation: copy.toExplanation(school),
  action: toAction(school.id, copy.actionLabel),
})

const toWondeIssue = (school: SchoolForSpm): SchoolIssue | null => {
  if (!isWondeSchool(school)) {
    return null
  }

  // ImportStatus has no "not started" member, so a null importStatus means no sync has ever run.
  const copy = school.importStatus ? WONDE_ISSUE_COPY[school.importStatus] : NEVER_SYNCED

  return copy ? toIssue(school, 'wondeSync', copy) : null
}

/**
 * `hasCurrentAcademicYearWondeData` latches true once an import proves Wonde holds this year's
 * data, and the academic-year rollover resets it. A school that opts out of the check never sets
 * it, so the flag says nothing about that school.
 */
const toWondeAcademicYearIssue = (school: SchoolForSpm): SchoolIssue | null => {
  if (!isWondeSchool(school) || school.ignoreAcademicYearCheckDuringImport) {
    return null
  }

  return school.hasCurrentAcademicYearWondeData
    ? null
    : toIssue(school, 'wondeAcademicYear', ACADEMIC_YEAR)
}

// Must match the interval in lwp_view_spm_school_metrics
// (migration 1791189059994-AddNoActiveTeacherCountToSpmSchoolMetrics).
const INACTIVE_TEACHER_DAYS = 14

const toInactiveTeacherTitle = (classCount: number): string =>
  classCount === 1
    ? '1 class has no active teacher'
    : `${classCount} classes have no active teacher`

const toTeachersInactiveIssue = (school: SchoolForSpm): SchoolIssue | null => {
  const classCount = school.spmData.classesWithNoActiveTeacherCount
  if (classCount === 0) {
    return null
  }

  return {
    key: 'teachersInactive',
    severity: 'error',
    count: classCount,
    title: toInactiveTeacherTitle(classCount),
    explanation: `No teacher on these classes has logged in for over ${INACTIVE_TEACHER_DAYS} days.`,
    action: toAction(school.id, 'See the classes'),
  }
}

const toUnlinkedPupilTitle = (pupilCount: number): string =>
  `${pupilCount} ${pupilCount === 1 ? 'pupil' : 'pupils'} not linked to Wonde`

/**
 * Counted separately from the copy table because the title reads off the count. The count itself
 * only ever covers schools connected to an MIS: see getPupilsWithoutMisCounts.
 */
const toMisLinksIssue = (school: SchoolForSpm): SchoolIssue | null => {
  const pupilCount = school.spmData.pupilsWithoutMisCount
  if (pupilCount === 0) {
    return null
  }

  return {
    key: 'misLinks',
    severity: 'warning',
    count: pupilCount,
    title: toUnlinkedPupilTitle(pupilCount),
    explanation: 'These pupils will not pick up class or year-group changes from the MIS.',
    action: toAction(school.id, 'Link pupils'),
  }
}

const toAwaitingInviteTitle = (linkCount: number): string =>
  `${linkCount} ${linkCount === 1 ? 'parent' : 'parents'} awaiting invite`

const toParentsAwaitingInviteIssue = (school: SchoolForSpm): SchoolIssue | null => {
  const linkCount = school.spmData.parentsAwaitingInviteCount
  if (linkCount === 0) {
    return null
  }

  return {
    key: 'parentsAwaitingInvite',
    severity: 'warning',
    count: linkCount,
    title: toAwaitingInviteTitle(linkCount),
    explanation:
      'The school set these parents up but never sent their invitation, so nothing has reached them.',
    action: toAction(school.id, 'See the parents'),
  }
}

const toParentDetailsIssue = (school: SchoolForSpm): SchoolIssue | null =>
  school.spmData.hasUnconfirmedParentDetails
    ? toIssue(school, 'parentDetails', PARENT_DETAILS)
    : null

export const toSchoolIssues = (school: SchoolForSpm): SchoolIssue[] =>
  [
    toWondeIssue(school),
    toWondeAcademicYearIssue(school),
    toTeachersInactiveIssue(school),
    toMisLinksIssue(school),
    toParentsAwaitingInviteIssue(school),
    toParentDetailsIssue(school),
  ].filter((issue): issue is SchoolIssue => issue !== null)
