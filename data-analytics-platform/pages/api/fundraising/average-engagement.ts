import type { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../../lib/database'

export type AverageEngagementMetric = 'readingSessions' | 'topicsCompleted' | 'activitiesCompleted'

export interface AverageEngagementDataPoint {
  // Subject name (e.g. 'Maths'), or 'All' for the deduplicated cross-subject average.
  // For reading sessions this is always 'Reading Log'.
  subject: string
  allAverage: number
  premiumAverage: number
}

export interface AverageEngagementResponse {
  metric: AverageEngagementMetric
  data: AverageEngagementDataPoint[]
}

const VALID_METRICS: AverageEngagementMetric[] = [
  'readingSessions',
  'topicsCompleted',
  'activitiesCompleted',
]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AverageEngagementResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const metric = req.query?.metric as AverageEngagementMetric

  if (!metric || !VALID_METRICS.includes(metric)) {
    return res.status(400).json({
      error: `Missing or invalid 'metric' query param. Valid values: ${VALID_METRICS.join(', ')}`,
    })
  }

  try {
    let data: AverageEngagementDataPoint[] = []

    if (metric === 'readingSessions') {
      // Average reading sessions completed per child, All pupils vs Pupil Premium.
      const result = await sql<AverageEngagementDataPoint>`
        WITH current_year AS (SELECT MAX("timeKey") AS "timeKey" FROM analytics_pupil_fact),
        per_pupil AS (
          SELECT
            "pupilId",
            "isPupilPremium",
            MAX(COALESCE("topicsCompletedCount", 0)) AS total
          FROM analytics_pupil_fact
          WHERE "timeKey" = (SELECT "timeKey" FROM current_year)
            AND "subject" = 'Reading'
            AND "subjectId" = 0
            AND "topicsSetCount" > 0
          GROUP BY "pupilId", "isPupilPremium"
        )
        SELECT
          'Reading Log' AS subject,
          COALESCE(ROUND(AVG(total), 1), 0) AS "allAverage",
          COALESCE(ROUND(AVG(total) FILTER (WHERE "isPupilPremium"), 1), 0) AS "premiumAverage"
        FROM per_pupil
      `.execute(db)
      data = result?.rows ?? []
    } else if (metric === 'topicsCompleted') {
      // Average topics completed per child, broken down by subject with an 'All' row,
      // All pupils vs Pupil Premium.
      const result = await sql<AverageEngagementDataPoint>`
        WITH current_year AS (SELECT MAX("timeKey") AS "timeKey" FROM analytics_pupil_fact),
        per_pupil_subject AS (
          SELECT
            "pupilId",
            "isPupilPremium",
            "subject",
            MAX(COALESCE("topicsCompletedCount", 0)) AS total
          FROM analytics_pupil_fact
          WHERE "timeKey" = (SELECT "timeKey" FROM current_year)
            AND "subjectId" <> 0
            AND "topicsSetCount" > 0
          GROUP BY "pupilId", "isPupilPremium", "subject"
        ),
        combined AS (
          SELECT "subject", "pupilId", "isPupilPremium", total FROM per_pupil_subject
          UNION ALL
          SELECT 'All' AS subject, "pupilId", "isPupilPremium", SUM(total) AS total
          FROM per_pupil_subject
          GROUP BY "pupilId", "isPupilPremium"
        )
        SELECT
          subject,
          COALESCE(ROUND(AVG(total), 1), 0) AS "allAverage",
          COALESCE(ROUND(AVG(total) FILTER (WHERE "isPupilPremium"), 1), 0) AS "premiumAverage"
        FROM combined
        GROUP BY subject
        ORDER BY
          CASE WHEN subject = 'All' THEN 0 ELSE 1 END,
          subject
      `.execute(db)
      data = result?.rows ?? []
    } else if (metric === 'activitiesCompleted') {
      // Average activities completed per child, broken down by subject with an 'All' row,
      // All pupils vs Pupil Premium.
      const result = await sql<AverageEngagementDataPoint>`
        WITH current_year AS (SELECT MAX("timeKey") AS "timeKey" FROM analytics_pupil_fact),
        per_pupil_subject AS (
          SELECT
            "pupilId",
            "isPupilPremium",
            "subject",
            MAX(COALESCE("activitiesCompletedCount", 0)) AS total
          FROM analytics_pupil_fact
          WHERE "timeKey" = (SELECT "timeKey" FROM current_year)
            AND "subjectId" <> 0
            AND "activitiesSetCount" > 0
          GROUP BY "pupilId", "isPupilPremium", "subject"
        ),
        combined AS (
          SELECT "subject", "pupilId", "isPupilPremium", total FROM per_pupil_subject
          UNION ALL
          SELECT 'All' AS subject, "pupilId", "isPupilPremium", SUM(total) AS total
          FROM per_pupil_subject
          GROUP BY "pupilId", "isPupilPremium"
        )
        SELECT
          subject,
          COALESCE(ROUND(AVG(total), 1), 0) AS "allAverage",
          COALESCE(ROUND(AVG(total) FILTER (WHERE "isPupilPremium"), 1), 0) AS "premiumAverage"
        FROM combined
        GROUP BY subject
        ORDER BY
          CASE WHEN subject = 'All' THEN 0 ELSE 1 END,
          subject
      `.execute(db)
      data = result?.rows ?? []
    }

    res.setHeader('Cache-Control', 'public, max-age=14400, stale-while-revalidate=7200')
    res.setHeader('Vary', 'Accept-Encoding')

    return res.status(200).json({ metric, data })
  } catch (error) {
    console.error(`Error fetching average engagement for metric '${metric}':`, error)
    return res
      .status(500)
      .json({ error: `Failed to fetch average engagement for metric: ${metric}` })
  }
}
