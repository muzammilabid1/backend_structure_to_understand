import { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../../lib/database'

export interface TotalFeedbacksData {
  year: string
  total_feedbacks: number
}

export interface TotalFeedbacksResponse {
  all_students: TotalFeedbacksData[]
  pupil_premium: TotalFeedbacksData[]
}

// Strongly typed result from the raw SQL query
interface TotalFeedbacksQueryResult {
  student_type: 'all' | 'pp'
  year: number
  total_feedbacks: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TotalFeedbacksResponse | { error: string }>
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
    
    // Query for total feedbacks over the years with All vs PP split using Kysely with raw SQL
    const result = await sql<TotalFeedbacksQueryResult>`
      WITH year_data AS (
        SELECT unnest(${sql`ARRAY[${sql.join(years)}]`}::integer[]) AS period_index
      ),
      -- All students feedback entries
      all_feedback_entries AS (
        SELECT 
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
      -- Pupil Premium students feedback entries
      pp_feedback_entries AS (
        SELECT 
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
          AND lp."isPremium" = true
          AND (
            ${showAllSchools} = true
            OR lp."schoolId" = ${schoolId || null}
          )
      )
      SELECT
        'all' as student_type,
        yd.period_index AS year,
        COALESCE(afe.total_feedbacks, 0) AS total_feedbacks
      FROM year_data yd
      LEFT JOIN (
        SELECT 
          "periodIndex",
          COUNT(*) AS total_feedbacks
        FROM all_feedback_entries
        GROUP BY "periodIndex"
      ) afe ON yd.period_index = afe."periodIndex"
      
      UNION ALL
      
      SELECT
        'pp' as student_type,
        yd.period_index AS year,
        COALESCE(ppfe.total_feedbacks, 0) AS total_feedbacks
      FROM year_data yd
      LEFT JOIN (
        SELECT 
          "periodIndex",
          COUNT(*) AS total_feedbacks
        FROM pp_feedback_entries
        GROUP BY "periodIndex"
      ) ppfe ON yd.period_index = ppfe."periodIndex"
      
      ORDER BY student_type, year;
    `.execute(db)

    // Separate the results by student type
    const allStudentsRows = result.rows.filter(row => row.student_type === 'all')
    const ppStudentsRows = result.rows.filter(row => row.student_type === 'pp')

    // Transform results into the expected format
    const transformRows = (rows: TotalFeedbacksQueryResult[]): TotalFeedbacksData[] => {
      const results = rows.map(row => ({
        year: row.year.toString(),
        total_feedbacks: parseInt(row.total_feedbacks.toString()) || 0
      }))

      // Ensure we have data for all requested years
      return years.map(year => {
        const yearStr = year.toString()
        const existingData = results.find(r => r.year === yearStr)
        return existingData || {
          year: yearStr,
          total_feedbacks: 0
        }
      })
    }

    const responseData: TotalFeedbacksResponse = {
      all_students: transformRows(allStudentsRows),
      pupil_premium: transformRows(ppStudentsRows)
    }
    
    // Add response caching headers (4 hours TTL)
    res.setHeader('Cache-Control', 'public, s-maxage=14400, stale-while-revalidate=86400')
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=14400')
    
    res.status(200).json(responseData)
  } catch (error) {
    console.error('Error fetching total feedbacks data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 