import { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../../lib/database'

export interface StudentTotalsData {
  year: string
  pupils_with_feedback: number
  total_active_pupils: number
}

export interface StudentTotalsResponse {
  all_students: StudentTotalsData[]
  pupil_premium: StudentTotalsData[]
}

// Strongly typed result from the raw SQL query
interface StudentTotalsQueryResult {
  student_type: 'all' | 'pp'
  year: number
  pupils_with_feedback: number
  total_active_pupils: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StudentTotalsResponse | { error: string }>
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
    
    // Query for student totals over the years with All vs PP split using Kysely with raw SQL
    const result = await sql<StudentTotalsQueryResult>`
      WITH year_data AS (
        SELECT unnest(${sql`ARRAY[${sql.join(years)}]`}::integer[]) AS period_index
      ),
      -- All students data
      all_pupils_with_feedback AS (
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
      -- Pupil Premium students data
      pp_pupils_with_feedback AS (
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
          AND lp."isPremium" = true
          AND (
            ${showAllSchools} = true
            OR lp."schoolId" = ${schoolId || null}
          )
      ),
      all_pp_pupils AS (
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
        'all' as student_type,
        yd.period_index AS year,
        COALESCE(apwf.pupils_with_feedback, 0) AS pupils_with_feedback,
        COALESCE(aap.total_active_pupils, 0) AS total_active_pupils
      FROM year_data yd
      LEFT JOIN (
        SELECT 
          "periodIndex",
          COUNT(*) AS pupils_with_feedback
        FROM all_pupils_with_feedback
        GROUP BY "periodIndex"
      ) apwf ON yd.period_index = apwf."periodIndex"
      LEFT JOIN (
        SELECT 
          "periodIndex",
          COUNT(*) AS total_active_pupils
        FROM all_active_pupils
        GROUP BY "periodIndex"
      ) aap ON yd.period_index = aap."periodIndex"
      
      UNION ALL
      
      SELECT
        'pp' as student_type,
        yd.period_index AS year,
        COALESCE(ppwf.pupils_with_feedback, 0) AS pupils_with_feedback,
        COALESCE(app.total_active_pupils, 0) AS total_active_pupils
      FROM year_data yd
      LEFT JOIN (
        SELECT 
          "periodIndex",
          COUNT(*) AS pupils_with_feedback
        FROM pp_pupils_with_feedback
        GROUP BY "periodIndex"
      ) ppwf ON yd.period_index = ppwf."periodIndex"
      LEFT JOIN (
        SELECT 
          "periodIndex",
          COUNT(*) AS total_active_pupils
        FROM all_pp_pupils
        GROUP BY "periodIndex"
      ) app ON yd.period_index = app."periodIndex"
      
      ORDER BY student_type, year;
    `.execute(db)

    // Separate the results by student type
    const allStudentsRows = result.rows.filter(row => row.student_type === 'all')
    const ppStudentsRows = result.rows.filter(row => row.student_type === 'pp')

    // Transform results into the expected format
    const transformRows = (rows: StudentTotalsQueryResult[]): StudentTotalsData[] => {
      const results = rows.map(row => ({
        year: row.year.toString(),
        pupils_with_feedback: parseInt(row.pupils_with_feedback.toString()) || 0,
        total_active_pupils: parseInt(row.total_active_pupils.toString()) || 0
      }))

      // Ensure we have data for all requested years
      return years.map(year => {
        const yearStr = year.toString()
        const existingData = results.find(r => r.year === yearStr)
        return existingData || {
          year: yearStr,
          pupils_with_feedback: 0,
          total_active_pupils: 0
        }
      })
    }

    const responseData: StudentTotalsResponse = {
      all_students: transformRows(allStudentsRows),
      pupil_premium: transformRows(ppStudentsRows)
    }
    
    // Add response caching headers (4 hours TTL)
    res.setHeader('Cache-Control', 'public, s-maxage=14400, stale-while-revalidate=86400')
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=14400')
    
    res.status(200).json(responseData)
  } catch (error) {
    console.error('Error fetching student totals data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 