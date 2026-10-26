import { sql } from 'kysely'

import { db } from '@/lib/db/database'
import type {
  ActivePercentRow,
  ClassActivePercentRow,
  LaunchDateRow,
  ReadingTarget,
  SchoolId,
  ViewSchoolMetricRows,
} from '@/lib/spm/spmSchools'
import type { ProgrammeKey, SpmReadingLogTotals } from '@/types/spm'

/**
 * kysely-codegen introspects tables and ordinary views only, so the materialised views created by
 * `1788973041294-CreateSpmDashboardMaterialisedViews` never appear in `schema.gen.ts`. These two
 * types are maintained by hand against that migration and
 * `1791189059994-AddNoActiveTeacherCountToSpmSchoolMetrics`, which rebuilt the metrics view.
 */
type SpmSchoolMetricsView = {
  schoolId: SchoolId
  activatedClassCount: number
  hasUnconfirmedParentDetails: boolean
  readingLogLaunchDate: Date | null
  mathsEnglishLaunchDate: Date | null
  moneySkillsLaunchDate: Date | null
  readyTeddyLaunchDate: Date | null
  readingLogCurrentTermActivePercent: number | null
  readingLogCurrentTermCommentActivePercent: number | null
  readingLogPreviousTermCommentActivePercent: number | null
  teacherFeedbackInUse: boolean | null
  schoolReadingTarget: ReadingTarget | null
  topicsCurrentTermActivePercent: number | null
  activitiesCurrentTermActivePercent: number | null
  pupilPremiumPercent: number | null
  teacherFeedbackCount: number | null
  topicsSetCount: number | null
  readingLogAtHomeCount: number
  readingLogAtSchoolCount: number
  classesWithNoActiveTeacherCount: number
  refreshedAt: Date
}

type SpmSchoolClassReadingTargetsView = {
  schoolId: SchoolId
  classId: string
  className: string
  activePercent: number | null
  refreshedAt: Date
}

export type SpmSchoolMetricsRow = SpmSchoolMetricsView

export const dbViews = db.withTables<{
  lwp_view_spm_school_metrics: SpmSchoolMetricsView
  lwp_view_spm_school_class_reading_targets: SpmSchoolClassReadingTargetsView
}>()

const LAUNCH_DATE_COLUMN = {
  digitalReadingLog: 'readingLogLaunchDate',
  mathsEnglish: 'mathsEnglishLaunchDate',
  moneySkills: 'moneySkillsLaunchDate',
  readyTeddy: 'readyTeddyLaunchDate',
} as const satisfies Record<ProgrammeKey, keyof SpmSchoolMetricsView>

/**
 * The launched schools for one programme, as an uncorrelated set to test membership against. The
 * view dates a launch at the 3rd parent feedback entry in the current period (or, for Ready Teddy, a
 * pre-admission period ahead of it), so a school launched since the last refresh reads as not
 * launched, which is what its table badge already shows.
 */
export const selectLaunchedSchoolIds = (programme: ProgrammeKey) =>
  dbViews
    .selectFrom('lwp_view_spm_school_metrics')
    .where(LAUNCH_DATE_COLUMN[programme], 'is not', null)
    .select('schoolId')

export async function getSpmSchoolMetricRows(
  schoolIds: SchoolId[]
): Promise<SpmSchoolMetricsRow[]> {
  return dbViews
    .selectFrom('lwp_view_spm_school_metrics')
    .where('schoolId', 'in', schoolIds)
    .selectAll()
    .execute()
}

export async function getSpmClassTargetRows(
  schoolIds: SchoolId[]
): Promise<ClassActivePercentRow[]> {
  return dbViews
    .selectFrom('lwp_view_spm_school_class_reading_targets')
    .where('schoolId', 'in', schoolIds)
    .select(['schoolId', 'className', 'activePercent'])
    .orderBy('className')
    .execute()
}

// Postgres sum() widens to numeric, which node-pg hands back as a string, so the total is cast in SQL.
export async function getReadingLogTotalsFromView(
  schoolId: string | null
): Promise<SpmReadingLogTotals | undefined> {
  const metrics = dbViews.selectFrom('lwp_view_spm_school_metrics')

  return (schoolId === null ? metrics : metrics.where('schoolId', '=', schoolId))
    .select((eb) => [
      sql<number>`coalesce(${eb.fn.sum('readingLogAtHomeCount')}, 0)::int`.as('atHomeCount'),
      sql<number>`coalesce(${eb.fn.sum('readingLogAtSchoolCount')}, 0)::int`.as('atSchoolCount'),
    ])
    .executeTakeFirst()
}

const mapPresent = <TRow>(
  metricRows: SpmSchoolMetricsRow[],
  toRow: (row: SpmSchoolMetricsRow) => TRow | null
): TRow[] => metricRows.flatMap((row) => toRow(row) ?? [])

const toLaunchDateRows = (
  metricRows: SpmSchoolMetricsRow[],
  getLaunchDate: (row: SpmSchoolMetricsRow) => Date | null
): LaunchDateRow[] =>
  mapPresent(metricRows, (row) => {
    const launchDate = getLaunchDate(row)

    return launchDate === null ? null : { schoolId: row.schoolId, launchDate }
  })

const toActivePercentRows = (
  metricRows: SpmSchoolMetricsRow[],
  getActivePercent: (row: SpmSchoolMetricsRow) => number | null
): ActivePercentRow[] =>
  metricRows.map((row) => ({ schoolId: row.schoolId, activePercent: getActivePercent(row) }))

/**
 * One view row per school carries what the fifteen live queries each returned as their own row set,
 * so the metrics row is split back out into those row types rather than the mapper being rewritten.
 */
export const toSpmSchoolMetricRows = (
  metricRows: SpmSchoolMetricsRow[],
  classTargetRows: ClassActivePercentRow[]
): ViewSchoolMetricRows => ({
  classCounts: metricRows.map((row) => ({
    schoolId: row.schoolId,
    activeClassCount: row.activatedClassCount,
  })),
  unconfirmedParentSchoolIds: mapPresent(metricRows, (row) =>
    row.hasUnconfirmedParentDetails ? { schoolId: row.schoolId } : null
  ),
  readingLogLaunchDates: toLaunchDateRows(metricRows, (row) => row.readingLogLaunchDate),
  mathsEnglishLaunchDates: toLaunchDateRows(metricRows, (row) => row.mathsEnglishLaunchDate),
  moneySkillsLaunchDates: toLaunchDateRows(metricRows, (row) => row.moneySkillsLaunchDate),
  readyTeddyLaunchDates: toLaunchDateRows(metricRows, (row) => row.readyTeddyLaunchDate),
  readingLogCurrentTerm: toActivePercentRows(
    metricRows,
    (row) => row.readingLogCurrentTermActivePercent
  ),
  readingLogCurrentTermComment: toActivePercentRows(
    metricRows,
    (row) => row.readingLogCurrentTermCommentActivePercent
  ),
  readingLogPreviousTermComment: toActivePercentRows(
    metricRows,
    (row) => row.readingLogPreviousTermCommentActivePercent
  ),
  readingLogTargetByClass: classTargetRows,
  teacherFeedbackInUse: mapPresent(metricRows, (row) =>
    row.teacherFeedbackInUse === null
      ? null
      : { schoolId: row.schoolId, isInUse: row.teacherFeedbackInUse }
  ),
  schoolReadingTargets: mapPresent(metricRows, (row) =>
    row.schoolReadingTarget === null
      ? null
      : { schoolId: row.schoolId, readingTarget: row.schoolReadingTarget }
  ),
  topicsCurrentTerm: toActivePercentRows(metricRows, (row) => row.topicsCurrentTermActivePercent),
  activitiesCurrentTerm: toActivePercentRows(
    metricRows,
    (row) => row.activitiesCurrentTermActivePercent
  ),
  pupilPremium: metricRows.map((row) => ({
    schoolId: row.schoolId,
    premiumPercent: row.pupilPremiumPercent,
  })),
  teacherFeedbackCounts: mapPresent(metricRows, (row) =>
    row.teacherFeedbackCount === null
      ? null
      : { schoolId: row.schoolId, teacherFeedbackCount: row.teacherFeedbackCount }
  ),
  classesWithNoActiveTeacher: metricRows.map((row) => ({
    schoolId: row.schoolId,
    classesWithNoActiveTeacherCount: row.classesWithNoActiveTeacherCount,
  })),
  topicsSetCounts: mapPresent(metricRows, (row) =>
    row.topicsSetCount === null
      ? null
      : { schoolId: row.schoolId, topicsSetCount: row.topicsSetCount }
  ),
})
