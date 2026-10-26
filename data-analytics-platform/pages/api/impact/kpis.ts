import { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../../lib/database'

export interface KPIData {
  three_year_average: {
    years: string
    percentage: number
    pupils_with_feedback: number
    total_active_pupils: number
  }
  year_breakdown: {
    year: string
    percentage: number
    pupils_with_feedback: number
    total_active_pupils: number
  }[]
}

// Strongly typed result from the raw SQL query
interface KPIQueryResult {
  type: 'breakdown' | 'average'
  year: number | null
  pupils_with_feedback: number
  total_active_pupils: number
  percent_with_feedback: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<KPIData | { error: string }>
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
    
    // Query for 3-year data with averages using Kysely with raw SQL
    const result = await sql<KPIQueryResult>`
      WITH year_data AS (
        SELECT unnest(${sql`ARRAY[${sql.join(years)}]`}::integer[]) AS period_index
      ),
      pupils_with_feedback AS (
        SELECT DISTINCT
          lp.id AS pupil_id,
          lp."schoolId",
          lpf."periodIndex"
        FROM
          lwp_pupil_feedback lpf
          JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id
          JOIN lwp_user lu ON lu.id = lpf."logCreatedById"
          AND lu."userStatus" IN ('ACTIVE', 'ACCOUNTLESS')
          AND lu.type = 'PARENT'
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
      yearly_stats AS (
        SELECT
          yd.period_index AS year,
          COALESCE(pwf.pupils_with_feedback, 0) AS pupils_with_feedback,
          COALESCE(aap.total_active_pupils, 0) AS total_active_pupils,
          ROUND(
            COALESCE(pwf.pupils_with_feedback, 0)::numeric / 
            NULLIF(COALESCE(aap.total_active_pupils, 0), 0) * 100,
            2
          ) AS percent_with_feedback
        FROM year_data yd
        LEFT JOIN (
          SELECT 
            "periodIndex",
            COUNT(*) AS pupils_with_feedback
          FROM pupils_with_feedback
          GROUP BY "periodIndex"
        ) pwf ON yd.period_index = pwf."periodIndex"
        LEFT JOIN (
          SELECT 
            "periodIndex",
            COUNT(*) AS total_active_pupils
          FROM all_active_pupils
          GROUP BY "periodIndex"
        ) aap ON yd.period_index = aap."periodIndex"
      )
      SELECT 
        'breakdown' as type,
        year,
        pupils_with_feedback,
        total_active_pupils,
        percent_with_feedback
      FROM yearly_stats
      UNION ALL
      SELECT 
        'average' as type,
        NULL as year,
        ROUND(AVG(pupils_with_feedback)) as pupils_with_feedback,
        ROUND(AVG(total_active_pupils)) as total_active_pupils,
        ROUND(AVG(percent_with_feedback), 2) as percent_with_feedback
      FROM yearly_stats
      ORDER BY type, year;
    `.execute(db)

    // Separate breakdown and average results
    const breakdownRows = result.rows.filter((row: KPIQueryResult) => row.type === 'breakdown')
    const averageRow = result.rows.find((row: KPIQueryResult) => row.type === 'average')
    
    const kpiData: KPIData = {
      three_year_average: {
        years: '2022-2024',
        percentage: parseFloat(averageRow?.percent_with_feedback?.toString() || '0') || 0,
        pupils_with_feedback: parseInt(averageRow?.pupils_with_feedback?.toString() || '0') || 0,
        total_active_pupils: parseInt(averageRow?.total_active_pupils?.toString() || '0') || 0
      },
      year_breakdown: breakdownRows.map((row: KPIQueryResult) => ({
        year: row.year?.toString() || '',
        percentage: parseFloat(row.percent_with_feedback?.toString() || '0') || 0,
        pupils_with_feedback: parseInt(row.pupils_with_feedback?.toString() || '0') || 0,
        total_active_pupils: parseInt(row.total_active_pupils?.toString() || '0') || 0
      }))
    }
    
    // Add response caching headers (shorter TTL for KPIs - 2 hours)
    res.setHeader('Cache-Control', 'public, s-maxage=7200, stale-while-revalidate=14400')
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=7200')
    
    res.status(200).json(kpiData)
  } catch (error) {
    console.error('Error fetching KPI data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 