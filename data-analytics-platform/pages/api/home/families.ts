import type { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../../lib/database'

export interface HomeFamiliesResponse {
  year: string
  all_active_pupils: number
  pp_active_pupils: number
  all_feedback_entries: number
  active_families_percentage: number
  pp_percentage: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HomeFamiliesResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const result = await sql`
      WITH current_year AS (SELECT MAX("timeKey") AS "timeKey" FROM analytics_pupil_fact)
      SELECT
        apf."timeKey" as year,
        COUNT(DISTINCT apf."pupilId") FILTER (WHERE "parentCommentsLeftCount" > 0) as all_active_pupils,
        COUNT(DISTINCT apf."pupilId") FILTER (WHERE "parentCommentsLeftCount" > 0 AND "isPupilPremium" = true) as pp_active_pupils,
        SUM("parentFeedbackEntries" + "teacherFeedbackEntries") as all_feedback_entries,
        calculate_percentage(
          COUNT(DISTINCT apf."pupilId")::int,
          COUNT(DISTINCT apf."pupilId") FILTER (WHERE "parentCommentsLeftCount" > 0)::int
        ) as active_families_percentage,
        calculate_percentage(
          COUNT(DISTINCT apf."pupilId") FILTER (WHERE "isPupilPremium" = true)::int,
          COUNT(DISTINCT apf."pupilId") FILTER (WHERE "parentCommentsLeftCount" > 0 AND "isPupilPremium" = true)::int
        ) as pp_percentage
      FROM analytics_pupil_fact apf
      WHERE apf."timeKey" = (SELECT "timeKey" FROM current_year)
      GROUP BY apf."timeKey"
    `.execute(db)

    if (!result.rows.length) {
      return res.status(404).json({ error: 'No data found' })
    }

    const row = result.rows[0] as {
      year: string
      all_active_pupils: string
      pp_active_pupils: string
      all_feedback_entries: string
      active_families_percentage: string
      pp_percentage: string
    }

    const year = Number(row.year)

    const data: HomeFamiliesResponse = {
      year: `${year}-${year + 1}`,
      all_active_pupils: Number(row.all_active_pupils || 0),
      pp_active_pupils: Number(row.pp_active_pupils || 0),
      all_feedback_entries: Number(row.all_feedback_entries || 0),
      active_families_percentage: Number(row.active_families_percentage || 0),
      pp_percentage: Number(row.pp_percentage || 0),
    }

    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200')
    res.setHeader('Vary', 'Accept-Encoding')

    return res.status(200).json(data)
  } catch (error) {
    console.error('Home Families KPI - Error:', error)
    return res.status(500).json({ error: 'Failed to fetch home families data' })
  }
}
