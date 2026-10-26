import type { Schema } from '@lwp/postgres-client'
import type { Selectable, SelectType } from 'kysely'

import { toEngagementMetric, toIsoStringOrNull } from '@/lib/spm/spmSchoolMapping'
import type { SchoolForSpm, SpmClassTargetMetric, SpmSchoolData } from '@/types/spm'

export type SchoolId = SelectType<Schema.LwpSchool['id']>
export type ReadingTarget = SelectType<Schema.LwpSchoolClass['readingTarget']>

type ClassName = SelectType<Schema.LwpSchoolClass['name']>
type FeedbackLogDate = SelectType<Schema.LwpPupilFeedback['logCreatedAt']>

export type SchoolIdRow = { schoolId: SchoolId }

export type ActiveSchoolRow = Selectable<
  Pick<
    Schema.LwpSchool,
    | 'id'
    | 'schoolName'
    | 'numOfTotalClassesAllowed'
    | 'numOfFullProgrammeClassesAllowed'
    | 'isMoneySkillsAvailable'
    | 'isReadyTeddyAvailable'
    | 'misIntegration'
    | 'importStatus'
    | 'lastImportedAt'
    | 'hasCurrentAcademicYearWondeData'
    | 'ignoreAcademicYearCheckDuringImport'
    | 'skipAutoWondeImport'
    | 'curentPeriodIndex'
  >
>

export type ActiveClassCountRow = SchoolIdRow & { activeClassCount: number }
export type LaunchDateRow = SchoolIdRow & { launchDate: FeedbackLogDate }
export type ActivePercentRow = SchoolIdRow & { activePercent: number | null }
export type ClassActivePercentRow = ActivePercentRow & { className: ClassName }
export type TeacherFeedbackInUseRow = SchoolIdRow & { isInUse: boolean }
export type TeacherFeedbackCountRow = SchoolIdRow & { teacherFeedbackCount: number }
export type TopicsSetCountRow = SchoolIdRow & { topicsSetCount: number }
export type PupilPremiumRow = SchoolIdRow & { premiumPercent: number | null }
export type PupilsWithoutMisRow = SchoolIdRow & { pupilsWithoutMisCount: number }
export type ClassesWithNoActiveTeacherRow = SchoolIdRow & {
  classesWithNoActiveTeacherCount: number
}
export type ParentsAwaitingInviteRow = SchoolIdRow & { parentsAwaitingInviteCount: number }
export type ReadingTargetRow = SchoolIdRow & { readingTarget: ReadingTarget }

/** One entry per metric query, all scoped to the same page of schools. */
export type SpmSchoolMetricRows = {
  classCounts: ActiveClassCountRow[]
  unconfirmedParentSchoolIds: SchoolIdRow[]
  pupilsWithoutMis: PupilsWithoutMisRow[]
  classesWithNoActiveTeacher: ClassesWithNoActiveTeacherRow[]
  parentsAwaitingInvite: ParentsAwaitingInviteRow[]
  readingLogLaunchDates: LaunchDateRow[]
  mathsEnglishLaunchDates: LaunchDateRow[]
  moneySkillsLaunchDates: LaunchDateRow[]
  readyTeddyLaunchDates: LaunchDateRow[]
  readingLogCurrentTerm: ActivePercentRow[]
  readingLogCurrentTermComment: ActivePercentRow[]
  readingLogPreviousTermComment: ActivePercentRow[]
  readingLogTargetByClass: ClassActivePercentRow[]
  teacherFeedbackInUse: TeacherFeedbackInUseRow[]
  schoolReadingTargets: ReadingTargetRow[]
  topicsCurrentTerm: ActivePercentRow[]
  activitiesCurrentTerm: ActivePercentRow[]
  pupilPremium: PupilPremiumRow[]
  teacherFeedbackCounts: TeacherFeedbackCountRow[]
  topicsSetCounts: TopicsSetCountRow[]
}

/**
 * The metrics the materialised views do not carry yet, which are still computed per request.
 */
export type LiveSchoolMetricRows = Pick<
  SpmSchoolMetricRows,
  'pupilsWithoutMis' | 'parentsAwaitingInvite'
>

export type ViewSchoolMetricRows = Omit<SpmSchoolMetricRows, keyof LiveSchoolMetricRows>

const toValueBySchool = <TRow extends SchoolIdRow, TValue>(
  rows: TRow[],
  getValue: (row: TRow) => TValue
): Map<SchoolId, TValue> => new Map(rows.map((row) => [row.schoolId, getValue(row)]))

const toActivePercentBySchool = (rows: ActivePercentRow[]): Map<SchoolId, number | null> =>
  toValueBySchool(rows, (row) => row.activePercent)

const toLaunchDateBySchool = (rows: LaunchDateRow[]): Map<SchoolId, FeedbackLogDate> =>
  toValueBySchool(rows, (row) => row.launchDate)

const toTargetByClassBySchool = (
  rows: ClassActivePercentRow[]
): Map<SchoolId, SpmClassTargetMetric[]> => {
  const targetByClass = new Map<SchoolId, SpmClassTargetMetric[]>()

  rows.forEach((row) => {
    const classes = targetByClass.get(row.schoolId) ?? []
    classes.push({ className: row.className, activePercent: row.activePercent })
    targetByClass.set(row.schoolId, classes)
  })

  return targetByClass
}

export const toSchoolsForSpm = (
  schools: ActiveSchoolRow[],
  metrics: SpmSchoolMetricRows
): SchoolForSpm[] => {
  const activeClassCounts = toValueBySchool(metrics.classCounts, (row) => row.activeClassCount)
  const unconfirmedParentSchoolIds = new Set(
    metrics.unconfirmedParentSchoolIds.map(({ schoolId }) => schoolId)
  )
  const pupilsWithoutMisCounts = toValueBySchool(
    metrics.pupilsWithoutMis,
    (row) => row.pupilsWithoutMisCount
  )
  const classesWithNoActiveTeacherCounts = toValueBySchool(
    metrics.classesWithNoActiveTeacher,
    (row) => row.classesWithNoActiveTeacherCount
  )
  const parentsAwaitingInviteCounts = toValueBySchool(
    metrics.parentsAwaitingInvite,
    (row) => row.parentsAwaitingInviteCount
  )
  const readingLogLaunchDates = toLaunchDateBySchool(metrics.readingLogLaunchDates)
  const mathsEnglishLaunchDates = toLaunchDateBySchool(metrics.mathsEnglishLaunchDates)
  const moneySkillsLaunchDates = toLaunchDateBySchool(metrics.moneySkillsLaunchDates)
  const readyTeddyLaunchDates = toLaunchDateBySchool(metrics.readyTeddyLaunchDates)
  const readingLogCurrentTerm = toActivePercentBySchool(metrics.readingLogCurrentTerm)
  const readingLogCurrentTermComment = toActivePercentBySchool(metrics.readingLogCurrentTermComment)
  const readingLogPreviousTermComment = toActivePercentBySchool(
    metrics.readingLogPreviousTermComment
  )
  const readingLogTargetByClass = toTargetByClassBySchool(metrics.readingLogTargetByClass)
  const teacherFeedbackInUse = toValueBySchool(metrics.teacherFeedbackInUse, (row) => row.isInUse)
  const schoolReadingTargets = toValueBySchool(
    metrics.schoolReadingTargets,
    (row) => row.readingTarget
  )
  const topicsCurrentTerm = toActivePercentBySchool(metrics.topicsCurrentTerm)
  const activitiesCurrentTerm = toActivePercentBySchool(metrics.activitiesCurrentTerm)
  const pupilPremiumPercents = toValueBySchool(metrics.pupilPremium, (row) => row.premiumPercent)
  const teacherFeedbackCounts = toValueBySchool(
    metrics.teacherFeedbackCounts,
    (row) => row.teacherFeedbackCount
  )
  const topicsSetCounts = toValueBySchool(metrics.topicsSetCounts, (row) => row.topicsSetCount)

  return schools.map((school) => {
    const spmData: SpmSchoolData = {
      activatedClassCount: activeClassCounts.get(school.id) ?? 0,
      hasUnconfirmedParentDetails: unconfirmedParentSchoolIds.has(school.id),
      pupilsWithoutMisCount: pupilsWithoutMisCounts.get(school.id) ?? 0,
      classesWithNoActiveTeacherCount: classesWithNoActiveTeacherCounts.get(school.id) ?? 0,
      parentsAwaitingInviteCount: parentsAwaitingInviteCounts.get(school.id) ?? 0,
      readingLogLaunchDate: toIsoStringOrNull(readingLogLaunchDates.get(school.id)),
      mathsEnglishLaunchDate: toIsoStringOrNull(mathsEnglishLaunchDates.get(school.id)),
      moneySkillsLaunchDate: toIsoStringOrNull(moneySkillsLaunchDates.get(school.id)),
      readyTeddyLaunchDate: toIsoStringOrNull(readyTeddyLaunchDates.get(school.id)),
      readingLogCurrentTerm: toEngagementMetric(readingLogCurrentTerm.get(school.id)),
      readingLogCurrentTermComment: toEngagementMetric(readingLogCurrentTermComment.get(school.id)),
      readingLogPreviousTermComment: toEngagementMetric(
        readingLogPreviousTermComment.get(school.id)
      ),
      readingLogTargetByClass: readingLogTargetByClass.get(school.id) ?? [],
      teacherFeedbackInUse: teacherFeedbackInUse.get(school.id) ?? null,
      schoolReadingTarget: schoolReadingTargets.get(school.id) ?? null,
      topicsCurrentTerm: toEngagementMetric(topicsCurrentTerm.get(school.id)),
      activitiesCurrentTerm: toEngagementMetric(activitiesCurrentTerm.get(school.id)),
      pupilPremiumPercent: pupilPremiumPercents.get(school.id) ?? null,
      teacherFeedbackCount: teacherFeedbackCounts.get(school.id) ?? null,
      topicsSetCount: topicsSetCounts.get(school.id) ?? null,
    }

    return {
      id: school.id,
      schoolName: school.schoolName,
      numOfTotalClassesAllowed: school.numOfTotalClassesAllowed,
      numOfFullProgrammeClassesAllowed: school.numOfFullProgrammeClassesAllowed,
      isMoneySkillsAvailable: school.isMoneySkillsAvailable ?? false,
      isReadyTeddyAvailable: school.isReadyTeddyAvailable,
      misIntegration: school.misIntegration,
      importStatus: school.importStatus as SchoolForSpm['importStatus'],
      lastImportedAt: toIsoStringOrNull(school.lastImportedAt),
      hasCurrentAcademicYearWondeData: school.hasCurrentAcademicYearWondeData,
      ignoreAcademicYearCheckDuringImport: school.ignoreAcademicYearCheckDuringImport,
      skipAutoWondeImport: school.skipAutoWondeImport,
      currentAcademicYearIndex: school.curentPeriodIndex,
      spmData,
    }
  })
}
