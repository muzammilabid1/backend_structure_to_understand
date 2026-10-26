import type { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../../lib/database'

export type PupilDataBySubjectBarMetric =
  | 'pupilsWatchedVideo'
  | 'pupilsClickedActivity'
  | 'totalActivitiesEngaged'
export type PupilDataBySubjectMilestoneMetric =
  | 'activitiesCompleted'
  | 'topicsCompleted'
  | 'readingSessions'

export interface PupilDataBySubjectBarDataPoint {
  subject: string
  allCount: number
  premiumCount: number
}

export interface PupilDataBySubjectMilestoneDataPoint {
  threshold: number
  allCount: number
  premiumCount: number
}

export type PupilDataBySubjectResponse =
  | { metric: PupilDataBySubjectBarMetric; data: PupilDataBySubjectBarDataPoint[] }
  | { metric: PupilDataBySubjectMilestoneMetric; data: PupilDataBySubjectMilestoneDataPoint[] }

const VALID_METRICS = [
  'pupilsWatchedVideo',
  'pupilsClickedActivity',
  'totalActivitiesEngaged',
  'activitiesCompleted',
  'topicsCompleted',
  'readingSessions',
]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PupilDataBySubjectResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const metric = req.query?.metric as
    | PupilDataBySubjectBarMetric
    | PupilDataBySubjectMilestoneMetric

  const rawSubjectId = req.query?.subjectId

  const subjectId: number | null = typeof rawSubjectId === 'string' ? parseInt(rawSubjectId) : null

  if (subjectId !== null && isNaN(subjectId))
    return res.status(400).json({ error: 'Invalid subjectId' })

  if (!metric || !VALID_METRICS.includes(metric)) {
    return res.status(400).json({
      error: `Missing or invalid 'metric' query param. Valid values: ${VALID_METRICS.join(', ')}`,
    })
  }

  try {
    let data: PupilDataBySubjectBarDataPoint[] | PupilDataBySubjectMilestoneDataPoint[] = []

    if (metric === 'pupilsWatchedVideo') {
      const result = await sql<PupilDataBySubjectBarDataPoint>`
        WITH current_year AS (SELECT MAX("timeKey") AS "timeKey" FROM analytics_pupil_fact)
        SELECT
          COALESCE(subject, 'All') AS subject,
          COUNT(DISTINCT "pupilId") FILTER (WHERE "videosWatchedCount" > 0) AS "allCount",
          COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium" AND "videosWatchedCount" > 0) AS "premiumCount"
        FROM analytics_pupil_fact
        WHERE "timeKey" = (SELECT "timeKey" FROM current_year) AND "subjectId" IS NOT NULL AND "subjectId" <> 0
        GROUP BY ROLLUP(subject)
        ORDER BY subject NULLS FIRST
      `.execute(db)
      data = result?.rows || []
    } else if (metric === 'pupilsClickedActivity') {
      const result = await sql<PupilDataBySubjectBarDataPoint>`
        WITH current_year AS (SELECT MAX("timeKey") AS "timeKey" FROM analytics_pupil_fact)
        SELECT
          COALESCE(subject, 'All') AS subject,
          COUNT(DISTINCT "pupilId") FILTER (WHERE "activitiesAccessedCount" > 0) AS "allCount",
          COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium" AND "activitiesAccessedCount" > 0) AS "premiumCount"
        FROM analytics_pupil_fact
        WHERE "timeKey" = (SELECT "timeKey" FROM current_year) AND "subjectId" IS NOT NULL AND "subjectId" <> 0
        GROUP BY ROLLUP(subject)
        ORDER BY subject NULLS FIRST
      `.execute(db)
      data = result?.rows || []
    } else if (metric === 'totalActivitiesEngaged') {
      const result = await sql<PupilDataBySubjectBarDataPoint>`
        WITH current_year AS (SELECT MAX("timeKey") AS "timeKey" FROM analytics_pupil_fact)
        SELECT
          COALESCE(subject, 'All') AS subject,
          COALESCE(SUM("activitiesCompletedCount"), 0) AS "allCount",
          COALESCE(SUM("activitiesCompletedCount") FILTER (WHERE "isPupilPremium"), 0) AS "premiumCount"
        FROM analytics_pupil_fact
        WHERE "timeKey" = (SELECT "timeKey" FROM current_year) AND "subjectId" IS NOT NULL AND "subjectId" <> 0
        GROUP BY ROLLUP(subject)
        ORDER BY subject NULLS FIRST
      `.execute(db)
      data = result?.rows || []
    } else if (metric === 'activitiesCompleted') {
      const result = await sql<PupilDataBySubjectMilestoneDataPoint>`
        WITH current_year AS (SELECT MAX("timeKey") AS "timeKey" FROM analytics_pupil_fact),
        pupil_totals AS (
          SELECT 
            "pupilId", 
            "isPupilPremium", 
            SUM("activitiesCompletedCount") AS total
          FROM analytics_pupil_fact
          WHERE "timeKey" = (SELECT "timeKey" FROM current_year) AND "subjectId" IS NOT NULL AND "subjectId" <> 0
          ${subjectId ? sql`AND "subjectId" = ${subjectId}` : sql``}
          GROUP BY "pupilId", "isPupilPremium"
        )
        SELECT
          t.threshold::int AS threshold,
          COUNT(DISTINCT pt."pupilId") FILTER (WHERE pt.total >= t.threshold) AS "allCount",
          COUNT(DISTINCT pt."pupilId") FILTER (WHERE pt."isPupilPremium" AND pt.total >= t.threshold) AS "premiumCount"
        FROM pupil_totals pt
        CROSS JOIN generate_series(1, 5) AS t(threshold)
        GROUP BY t.threshold
        ORDER BY t.threshold
      `.execute(db)
      data = result?.rows || []
    } else if (metric === 'topicsCompleted') {
      const result = await sql<PupilDataBySubjectMilestoneDataPoint>`
        WITH current_year AS (SELECT MAX("timeKey") AS "timeKey" FROM analytics_pupil_fact),
        pupil_totals AS (
          SELECT
            "pupilId",
            "isPupilPremium",
            SUM("topicsCompletedCount") AS total
          FROM analytics_pupil_fact
          WHERE "timeKey" = (SELECT "timeKey" FROM current_year) AND "subjectId" IS NOT NULL AND "subjectId" <> 0
          ${subjectId ? sql`AND "subjectId" = ${subjectId}` : sql``}
          GROUP BY "pupilId", "isPupilPremium"
        )
        SELECT
          t.threshold::int AS threshold,
          COUNT(DISTINCT pt."pupilId") FILTER (WHERE pt.total >= t.threshold) AS "allCount",
          COUNT(DISTINCT pt."pupilId") FILTER (WHERE pt."isPupilPremium" AND pt.total >= t.threshold) AS "premiumCount"
        FROM pupil_totals pt
        CROSS JOIN generate_series(1, 5) AS t(threshold)
        GROUP BY t.threshold
        ORDER BY t.threshold
      `.execute(db)
      data = result?.rows || []
    } else if (metric === 'readingSessions') {
      const result = await sql<PupilDataBySubjectMilestoneDataPoint>`
        WITH current_year AS (SELECT MAX("timeKey") AS "timeKey" FROM analytics_pupil_fact),
        pupil_totals AS (
          SELECT
            "pupilId",
            "isPupilPremium",
            SUM("topicsCompletedCount") AS total
          FROM analytics_pupil_fact
          WHERE "timeKey" = (SELECT "timeKey" FROM current_year) AND "subject" = 'Reading' AND "subjectId" = 0
          GROUP BY "pupilId", "isPupilPremium"
        )
        SELECT
          t.threshold::int AS threshold,
          COUNT(DISTINCT pt."pupilId") FILTER (WHERE pt.total >= t.threshold) AS "allCount",
          COUNT(DISTINCT pt."pupilId") FILTER (WHERE pt."isPupilPremium" AND pt.total >= t.threshold) AS "premiumCount"
        FROM pupil_totals pt
        CROSS JOIN generate_series(1, 5) AS t(threshold)
        GROUP BY t.threshold
        ORDER BY t.threshold
      `.execute(db)
      data = result?.rows || []
    }

    res.setHeader('Cache-Control', 'public, max-age=14400, stale-while-revalidate=7200')
    res.setHeader('Vary', 'Accept-Encoding')

    return res.status(200).json({ metric, data } as PupilDataBySubjectResponse)
  } catch (error) {
    console.error(`Error fetching pupil data by subject for metric '${metric}':`, error)
    return res
      .status(500)
      .json({ error: `Failed to fetch pupil data by subject for metric: ${metric}` })
  }
}
