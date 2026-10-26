import { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../../lib/database'

export interface PPPercentageData {
  year: string
  total_active_pupils: number
  pp_total_active_pupils: number
  pupil_premium_percentage: number
}

export interface PPPercentageResponse {
  data: PPPercentageData[]
}

interface PPPercentageQueryResult {
  year: number
  total_active_pupils: number
  pp_total_active_pupils: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PPPercentageResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get query parameters
    const schoolId = req.query.schoolId as string
    const showAllSchools = req.query.showAllSchools === 'true'

    // Fixed years: 2021-2025 (academic years 2021-2022, 2022-2023, etc.)
    const years = [2021, 2022, 2023, 2024, 2025]
    
    // Query for PP percentage over the years using normal tables
    const result = await sql<PPPercentageQueryResult>`
      WITH year_data AS (
        SELECT unnest(${sql`ARRAY[${sql.join(years)}]`}::integer[]) AS period_index
      ),
      -- All active pupils
      all_active_pupils AS (
        SELECT DISTINCT
          lp.id AS pupil_id,
          lp."schoolId",
          lpf."periodIndex"
        FROM
          lwp_pupil_feedback lpf
          JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id
          JOIN lwp_pupil lp ON lp.id = lpfh."lwpPupilId"
          JOIN lwp_school ls ON ls.id = lp."schoolId"
          AND NOT ls."isTestSchool"
        WHERE
          lpf."periodIndex" = ANY(${sql`ARRAY[${sql.join(years)}]`}::integer[])
          AND (
            ${showAllSchools} = true
            OR lp."schoolId" = ${schoolId || null}
          )
      ),
      -- Pupil Premium active pupils
      pp_active_pupils AS (
        SELECT DISTINCT
          lp.id AS pupil_id,
          lp."schoolId",
          lpf."periodIndex"
        FROM
          lwp_pupil_feedback lpf
          JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id
          JOIN lwp_pupil lp ON lp.id = lpfh."lwpPupilId"
          JOIN lwp_school ls ON ls.id = lp."schoolId"
          AND NOT ls."isTestSchool"
        WHERE
          lpf."periodIndex" = ANY(${sql`ARRAY[${sql.join(years)}]`}::integer[])
          AND lp."isPremium" = true
          AND (
            ${showAllSchools} = true
            OR lp."schoolId" = ${schoolId || null}
          )
      )
      SELECT
        yd.period_index AS year,
        COALESCE(aap.total_active_pupils, 0) AS total_active_pupils,
        COALESCE(ppap.pp_total_active_pupils, 0) AS pp_total_active_pupils
      FROM year_data yd
      LEFT JOIN (
        SELECT 
          "periodIndex",
          COUNT(*) AS total_active_pupils
        FROM all_active_pupils
        GROUP BY "periodIndex"
      ) aap ON yd.period_index = aap."periodIndex"
      LEFT JOIN (
        SELECT 
          "periodIndex",
          COUNT(*) AS pp_total_active_pupils
        FROM pp_active_pupils
        GROUP BY "periodIndex"
      ) ppap ON yd.period_index = ppap."periodIndex"
      
      ORDER BY year;
    `.execute(db)
    
    const yearlyData = result.rows
    
    // Transform data and calculate percentage
    const responseData: PPPercentageResponse = {
      data: yearlyData.map((row: PPPercentageQueryResult) => {
        const totalPupils = row.total_active_pupils || 0
        const ppPupils = row.pp_total_active_pupils || 0
        const percentage = totalPupils > 0 ? (ppPupils / totalPupils) * 100 : 0
        
        return {
          year: row.year.toString(),
          total_active_pupils: totalPupils,
          pp_total_active_pupils: ppPupils,
          pupil_premium_percentage: Math.round(percentage * 100) / 100 // Round to 2 decimal places
        }
      })
    }
    
    // Add response caching headers (4 hours TTL, same as student totals)
    res.setHeader('Cache-Control', 'public, s-maxage=14400, stale-while-revalidate=86400')
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=14400')
    
    res.status(200).json(responseData)
  } catch (error) {
    console.error('Error fetching PP percentage data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
