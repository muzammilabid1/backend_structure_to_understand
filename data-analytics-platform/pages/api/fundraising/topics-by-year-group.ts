import type { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../../lib/database'

export interface TopicsByYearGroupDataPoint {
  classYearGroup: string
  topicsCompletedByAllPupils: number
  topicsCompletedByPupilPremium: number
}

export interface TopicsByYearGroupResponse {
  data: TopicsByYearGroupDataPoint[]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TopicsByYearGroupResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rawSubjectId = req.query?.subjectId
  const subjectId: number | null = typeof rawSubjectId === 'string' ? parseInt(rawSubjectId) : null

  if (subjectId !== null && isNaN(subjectId)) {
    return res.status(400).json({ error: 'Invalid subjectId' })
  }

  try {
    const result = await sql<TopicsByYearGroupDataPoint>`
      WITH current_year AS (SELECT MAX("timeKey") AS "timeKey" FROM analytics_pupil_fact),
      year_group_data AS (
        SELECT
          COALESCE("classYearGroup", 'Unknown') AS "classYearGroup",
          SUM("topicsCompletedCount") AS "topicsCompletedByAllPupils",
          SUM(CASE WHEN "isPupilPremium" THEN "topicsCompletedCount" ELSE 0 END) AS "topicsCompletedByPupilPremium"
        FROM analytics_pupil_fact
        WHERE "timeKey" = (SELECT "timeKey" FROM current_year)
          AND "subjectId" IS NOT NULL
          AND "subjectId" <> 0
          ${subjectId ? sql`AND "subjectId" = ${subjectId}` : sql``}
        GROUP BY "classYearGroup"
      )
      SELECT
        COALESCE("classYearGroup", 'All') AS "classYearGroup",
        SUM("topicsCompletedByAllPupils") AS "topicsCompletedByAllPupils",
        SUM("topicsCompletedByPupilPremium") AS "topicsCompletedByPupilPremium"
      FROM year_group_data
      GROUP BY ROLLUP("classYearGroup")
      ORDER BY
        CASE
          WHEN "classYearGroup" IS NULL THEN 0      -- "All" first (ROLLUP row)
          WHEN "classYearGroup" = 'Unknown' THEN 2  -- "Unknown" last
          ELSE 1                                    -- everything else in the middle
        END,
        "classYearGroup" ASC
    `.execute(db)

    const data = result?.rows ?? []

    res.setHeader('Cache-Control', 'public, max-age=14400, stale-while-revalidate=7200')
    res.setHeader('Vary', 'Accept-Encoding')

    return res.status(200).json({ data })
  } catch (error) {
    console.error('Error fetching topics by year group:', error)
    return res.status(500).json({ error: 'Failed to fetch topics by year group' })
  }
}
