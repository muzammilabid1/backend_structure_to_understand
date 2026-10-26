import { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../../lib/database'

export interface RegisteredPupilsData {
  year: string
  total_registered_pupils: number
}

export interface RegisteredPupilsResponse {
  all_students: RegisteredPupilsData[]
  pupil_premium: RegisteredPupilsData[]
}

// Strongly typed result from the raw SQL query
interface RegisteredPupilsQueryResult {
  student_type: 'all' | 'pp'
  year: number
  total_registered_pupils: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RegisteredPupilsResponse | { error: string }>
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
    
    // Query for registered pupils over the years with All vs PP split using Kysely with raw SQL
    const result = await sql<RegisteredPupilsQueryResult>`
      WITH year_data AS (
        SELECT unnest(${sql`ARRAY[${sql.join(years)}]`}::integer[]) AS period_index
      ),
      -- All registered pupils (cumulative by end of academic year)
      all_registered_pupils AS (
        SELECT 
          yd.period_index,
          COUNT(DISTINCT lp.id) as total_registered_pupils
        FROM year_data yd
        LEFT JOIN lwp_pupil lp ON EXTRACT(YEAR FROM lp."logCreatedAt") <= yd.period_index
        LEFT JOIN lwp_school ls ON ls.id = lp."schoolId"
          AND NOT ls."isTestSchool"
        WHERE 
          (lp.id IS NULL OR (
            ${showAllSchools} = true
            OR lp."schoolId" = ${schoolId || null}
          ))
        GROUP BY yd.period_index
      ),
      -- Pupil Premium registered pupils (cumulative by end of academic year)
      pp_registered_pupils AS (
        SELECT 
          yd.period_index,
          COUNT(DISTINCT lp.id) as total_registered_pupils
        FROM year_data yd
        LEFT JOIN lwp_pupil lp ON EXTRACT(YEAR FROM lp."logCreatedAt") <= yd.period_index
          AND lp."isPremium" = true
        LEFT JOIN lwp_school ls ON ls.id = lp."schoolId"
          AND NOT ls."isTestSchool"
        WHERE 
          (lp.id IS NULL OR (
            ${showAllSchools} = true
            OR lp."schoolId" = ${schoolId || null}
          ))
        GROUP BY yd.period_index
      )
      SELECT 
        'all' as student_type,
        arp.period_index as year,
        arp.total_registered_pupils
      FROM all_registered_pupils arp
      
      UNION ALL
      
      SELECT 
        'pp' as student_type,
        prp.period_index as year,
        prp.total_registered_pupils
      FROM pp_registered_pupils prp
      
      ORDER BY student_type, year
    `.execute(db)

    // Transform the result into the required format
    const allStudents: RegisteredPupilsData[] = []
    const pupilPremium: RegisteredPupilsData[] = []

    result.rows.forEach(row => {
      const formattedData = {
        year: row.year.toString(),
        total_registered_pupils: row.total_registered_pupils
      }

      if (row.student_type === 'all') {
        allStudents.push(formattedData)
      } else {
        pupilPremium.push(formattedData)
      }
    })

    // Ensure we have data for all years (fill with 0 if missing)
    years.forEach(year => {
      const yearStr = year.toString()
      
      if (!allStudents.find(item => item.year === yearStr)) {
        allStudents.push({ year: yearStr, total_registered_pupils: 0 })
      }
      
      if (!pupilPremium.find(item => item.year === yearStr)) {
        pupilPremium.push({ year: yearStr, total_registered_pupils: 0 })
      }
    })

    // Sort by year
    allStudents.sort((a, b) => parseInt(a.year) - parseInt(b.year))
    pupilPremium.sort((a, b) => parseInt(a.year) - parseInt(b.year))

    res.status(200).json({
      all_students: allStudents,
      pupil_premium: pupilPremium
    })

  } catch (error) {
    console.error('Error fetching registered pupils data:', error)
    res.status(500).json({ error: 'Failed to fetch registered pupils data' })
  }
} 