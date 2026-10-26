import { sql } from 'kysely'
import type { AnalyticsPupilFactTable, AnalyticsQueryBuilder } from './analytics-db'

export interface PupilFactFilters {
  schoolId?: string
  showAllSchools?: boolean
  timeKeys?: number[]
  timeGrain?: 'weekly' | 'monthly' | 'yearly'
}

export interface ChartDataPoint {
  year: number
  [key: string]: any
}

export interface StudentTotalsData {
  all_students: Array<{
    year: number
    total_active_pupils: number
    pupils_with_feedback: number
  }>
  pupil_premium: Array<{
    year: number
    total_active_pupils: number
    pupils_with_feedback: number
  }>
}

export interface FeedbackPercentageData {
  all_students: Array<{
    year: number
    percentage: number
    pupils_with_feedback: number
    total_active_pupils: number
  }>
  pupil_premium: Array<{
    year: number
    percentage: number
    pupils_with_feedback: number
    total_active_pupils: number
  }>
}

export interface TotalFeedbacksData {
  all_students: Array<{
    year: number
    total_feedbacks: number
  }>
  pupil_premium: Array<{
    year: number
    total_feedbacks: number
  }>
}

export interface AverageFeedbacksData {
  all_students: Array<{
    year: number
    total_active_pupils: number
    total_feedbacks: number
    average_per_all_students: number
  }>
  pupil_premium: Array<{
    year: number
    total_active_pupils: number
    total_feedbacks: number
    average_per_all_students: number
  }>
}

export interface PPPercentageData {
  year: string
  pp_percentage: number
  total_active_pupils: number
  pp_active_pupils: number
}

export interface GenericCountData {
  all_students: Array<{
    year: number
    [countField: string]: number
  }>
  pupil_premium: Array<{
    year: number
    [countField: string]: number
  }>
}

/**
 * Base query builder for analytics_pupil_fact table with common filters
 */
export function buildBaseQuery(db: AnalyticsQueryBuilder, filters: PupilFactFilters) {
  let query = db
    .selectFrom('analytics_pupil_fact')
    .where('isActive', '=', true)
    .where('timeGrain', '=', filters.timeGrain || 'yearly')

  // Apply school filter
  if (!filters.showAllSchools && filters.schoolId) {
    query = query.where('schoolId', '=', filters.schoolId)
  }

  // Apply time filter if specified
  if (filters.timeKeys && filters.timeKeys.length > 0) {
    query = query.where('timeKey', 'in', filters.timeKeys)
  }

  return query
}

/**
 * Get student totals data (total active pupils by year and PP status)
 */
export async function getStudentTotalsData(
  db: AnalyticsQueryBuilder,
  filters: PupilFactFilters
): Promise<StudentTotalsData> {
  const results = await buildBaseQuery(db, filters)
    .select(['timeKey as year', 'isPupilPremium'])
    .select((eb) => [
      eb.fn.count('pupilId').distinct().as('total_active_pupils'),
      eb.fn
        .count('pupilId')
        .distinct()
        .filterWhere('parentFeedbackEntries', '>', 0)
        .as('pupils_with_feedback'),
    ])
    .groupBy(['timeKey', 'isPupilPremium'])
    .orderBy('timeKey')
    .execute()

  const all_students = results
    .filter((r) => !r.isPupilPremium)
    .map((r) => ({
      year: r.year,
      total_active_pupils: Number(r.total_active_pupils),
      pupils_with_feedback: Number(r.pupils_with_feedback || 0),
    }))

  const pupil_premium = results
    .filter((r) => r.isPupilPremium)
    .map((r) => ({
      year: r.year,
      total_active_pupils: Number(r.total_active_pupils),
      pupils_with_feedback: Number(r.pupils_with_feedback || 0),
    }))

  return { all_students, pupil_premium }
}

/**
 * Get feedback percentage data (% of students with feedback by year and PP status)
 */
export async function getFeedbackPercentageData(
  db: AnalyticsQueryBuilder,
  filters: PupilFactFilters
): Promise<FeedbackPercentageData> {
  const results = await buildBaseQuery(db, filters)
    .select(['timeKey as year', 'isPupilPremium'])
    .select((eb) => [
      eb.fn.count('pupilId').distinct().as('total_active_pupils'),
      eb.fn
        .count('pupilId')
        .distinct()
        .filterWhere('parentFeedbackEntries', '>', 0)
        .as('pupils_with_feedback'),
    ])
    .groupBy(['timeKey', 'isPupilPremium'])
    .orderBy('timeKey')
    .execute()

  const processData = (isPP: boolean) =>
    results
      .filter((r) => r.isPupilPremium === isPP)
      .map((r) => {
        const total = Number(r.total_active_pupils)
        const withFeedback = Number(r.pupils_with_feedback)
        return {
          year: r.year,
          total_active_pupils: total,
          pupils_with_feedback: withFeedback,
          percentage: total > 0 ? Math.round((withFeedback / total) * 100 * 100) / 100 : 0,
        }
      })

  return {
    all_students: processData(false),
    pupil_premium: processData(true),
  }
}

/**
 * Get total feedbacks data (sum of feedback entries by year and PP status)
 */
export async function getTotalFeedbacksData(
  db: AnalyticsQueryBuilder,
  filters: PupilFactFilters
): Promise<TotalFeedbacksData> {
  const results = await buildBaseQuery(db, filters)
    .select(['timeKey as year', 'isPupilPremium'])
    .select((eb) => eb.fn.sum('parentFeedbackEntries').as('total_feedbacks'))
    .groupBy(['timeKey', 'isPupilPremium'])
    .orderBy('timeKey')
    .execute()

  const all_students = results
    .filter((r) => !r.isPupilPremium)
    .map((r) => ({
      year: r.year,
      total_feedbacks: Number(r.total_feedbacks || 0),
    }))

  const pupil_premium = results
    .filter((r) => r.isPupilPremium)
    .map((r) => ({
      year: r.year,
      total_feedbacks: Number(r.total_feedbacks || 0),
    }))

  return { all_students, pupil_premium }
}

/**
 * Get average feedbacks data (average feedback entries per student by year and PP status)
 */
export async function getAverageFeedbacksData(
  db: AnalyticsQueryBuilder,
  filters: PupilFactFilters
): Promise<AverageFeedbacksData> {
  const results = await buildBaseQuery(db, filters)
    .select(['timeKey as year', 'isPupilPremium'])
    .select((eb) => [
      eb.fn.count('pupilId').distinct().as('total_active_pupils'),
      eb.fn.sum('parentFeedbackEntries').as('total_feedbacks'),
    ])
    .groupBy(['timeKey', 'isPupilPremium'])
    .orderBy('timeKey')
    .execute()

  const processData = (isPP: boolean) =>
    results
      .filter((r) => r.isPupilPremium === isPP)
      .map((r) => {
        const total_pupils = Number(r.total_active_pupils)
        const total_feedbacks = Number(r.total_feedbacks || 0)
        return {
          year: r.year,
          total_active_pupils: total_pupils,
          total_feedbacks: total_feedbacks,
          average_per_all_students:
            total_pupils > 0 ? Math.round((total_feedbacks / total_pupils) * 10) / 10 : 0,
        }
      })

  return {
    all_students: processData(false),
    pupil_premium: processData(true),
  }
}

/**
 * Get PP percentage data (% of active students who are Pupil Premium)
 */
export async function getPPPercentageData(
  db: AnalyticsQueryBuilder,
  filters: PupilFactFilters
): Promise<PPPercentageData[]> {
  const results = await buildBaseQuery(db, filters)
    .select(['timeKey as year'])
    .select((eb) => [
      eb.fn.count('pupilId').distinct().as('total_active_pupils'),
      eb.fn
        .count('pupilId')
        .distinct()
        .filterWhere('isPupilPremium', '=', true)
        .as('pp_active_pupils'),
    ])
    .groupBy('timeKey')
    .orderBy('timeKey')
    .execute()

  return results.map((r) => {
    const total = Number(r.total_active_pupils)
    const pp = Number(r.pp_active_pupils)
    return {
      year: r.year.toString(),
      total_active_pupils: total,
      pp_active_pupils: pp,
      pp_percentage: total > 0 ? Math.round((pp / total) * 100 * 100) / 100 : 0,
    }
  })
}

/**
 * Generic function for count-based metrics (parents registered, videos watched, etc.)
 */
export async function getGenericCountData(
  db: AnalyticsQueryBuilder,
  filters: PupilFactFilters,
  countColumn: keyof AnalyticsPupilFactTable,
  outputFieldName: string
): Promise<GenericCountData> {
  const results = await buildBaseQuery(db, filters)
    .select(['timeKey as year', 'isPupilPremium'])
    .select((eb) => eb.fn.sum(countColumn).as('count_value'))
    .groupBy(['timeKey', 'isPupilPremium'])
    .orderBy('timeKey')
    .execute()

  const all_students = results
    .filter((r) => !r.isPupilPremium)
    .map((r) => ({
      year: r.year,
      [outputFieldName]: Number(r.count_value || 0),
    }))

  const pupil_premium = results
    .filter((r) => r.isPupilPremium)
    .map((r) => ({
      year: r.year,
      [outputFieldName]: Number(r.count_value || 0),
    }))

  return { all_students, pupil_premium }
}

/**
 * Get KPI data (3-year averages and year breakdown)
 */
export async function getKPIData(db: AnalyticsQueryBuilder, filters: PupilFactFilters) {
  const feedbackData = await getFeedbackPercentageData(db, filters)

  // Calculate three-year averages
  const allStudentsData = feedbackData.all_students
  const totalPupils = allStudentsData.reduce((sum, year) => sum + year.total_active_pupils, 0)
  const totalWithFeedback = allStudentsData.reduce(
    (sum, year) => sum + year.pupils_with_feedback,
    0
  )

  const avgPupils = Math.round(totalPupils / allStudentsData.length)
  const avgWithFeedback = Math.round(totalWithFeedback / allStudentsData.length)
  const avgPercentage =
    totalPupils > 0 ? Math.round((totalWithFeedback / totalPupils) * 100 * 100) / 100 : 0

  return {
    three_year_average: {
      years: '2022-2024',
      percentage: avgPercentage,
      pupils_with_feedback: avgWithFeedback,
      total_active_pupils: avgPupils,
    },
    year_breakdown: allStudentsData.map((year) => ({
      year: year.year.toString(),
      percentage: year.percentage,
      pupils_with_feedback: year.pupils_with_feedback,
      total_active_pupils: year.total_active_pupils,
    })),
  }
}
