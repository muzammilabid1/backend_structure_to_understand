import { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../../lib/database'

export interface ParentsRegisteredData {
  year: string
  total_parents_registered: number
}

export interface ParentsRegisteredResponse {
  all_students: ParentsRegisteredData[]
  pupil_premium: ParentsRegisteredData[]
}

interface ParentsRegisteredQueryResult {
  student_type: 'all' | 'pp'
  year: number
  total_parents_registered: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParentsRegisteredResponse | { error: string }>
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
    
    // Query for cumulative parent registrations over the years with All vs PP split
    const result = await sql<ParentsRegisteredQueryResult>`
      WITH year_data AS (
        SELECT unnest(${sql`ARRAY[${sql.join(years)}]`}::integer[]) AS period_index
      ),
      -- All registered parents (cumulative by end of academic year)
      all_registered_parents AS (
        SELECT 
          yd.period_index,
          COUNT(DISTINCT lu.id) as total_parents_registered
        FROM year_data yd
        LEFT JOIN lwp_user lu ON EXTRACT(YEAR FROM lu."logCreatedAt") <= yd.period_index
          AND lu."userStatus" IN ('ACTIVE', 'ACCOUNTLESS')
          AND lu.type = 'PARENT'
        LEFT JOIN lwp_pupil_parent lpp ON lpp."parentId" = lu.id
          AND lpp.status = 'ACTIVE'
        LEFT JOIN lwp_pupil lp ON lpp."pupilId" = lp.id
        LEFT JOIN lwp_school ls ON ls.id = lp."schoolId"
          AND NOT ls."isTestSchool"
        WHERE 
          (lu.id IS NULL OR (
            ${showAllSchools} = true
            OR lp."schoolId" = ${schoolId || null}
          ))
        GROUP BY yd.period_index
      ),
      -- Pupil Premium registered parents (cumulative by end of academic year)
      pp_registered_parents AS (
        SELECT 
          yd.period_index,
          COUNT(DISTINCT lu.id) as total_parents_registered
        FROM year_data yd
        LEFT JOIN lwp_user lu ON EXTRACT(YEAR FROM lu."logCreatedAt") <= yd.period_index
          AND lu."userStatus" IN ('ACTIVE', 'ACCOUNTLESS')
          AND lu.type = 'PARENT'
        LEFT JOIN lwp_pupil_parent lpp ON lpp."parentId" = lu.id
          AND lpp.status = 'ACTIVE'
        LEFT JOIN lwp_pupil lp ON lpp."pupilId" = lp.id
          AND lp."isPremium" = true
        LEFT JOIN lwp_school ls ON ls.id = lp."schoolId"
          AND NOT ls."isTestSchool"
        WHERE 
          (lu.id IS NULL OR (
            ${showAllSchools} = true
            OR lp."schoolId" = ${schoolId || null}
          ))
        GROUP BY yd.period_index
      )
      SELECT 
        'all' as student_type,
        arp.period_index as year,
        arp.total_parents_registered
      FROM all_registered_parents arp
      
      UNION ALL
      
      SELECT 
        'pp' as student_type,
        prp.period_index as year,
        prp.total_parents_registered
      FROM pp_registered_parents prp
      
      ORDER BY student_type, year
    `.execute(db)
    
    const yearlyData = result.rows
    
    // Separate the results by student type
    const allStudentsRows = yearlyData.filter(row => row.student_type === 'all')
    const ppStudentsRows = yearlyData.filter(row => row.student_type === 'pp')

    // Transform results into the expected format
    const transformRows = (rows: ParentsRegisteredQueryResult[]): ParentsRegisteredData[] => {
      const results = rows.map(row => ({
        year: row.year.toString(),
        total_parents_registered: parseInt(row.total_parents_registered.toString()) || 0
      }))

      // Ensure we have data for all requested years
      return years.map(year => {
        const yearStr = year.toString()
        const existingData = results.find(r => r.year === yearStr)
        return existingData || {
          year: yearStr,
          total_parents_registered: 0
        }
      })
    }

    const responseData: ParentsRegisteredResponse = {
      all_students: transformRows(allStudentsRows),
      pupil_premium: transformRows(ppStudentsRows)
    }
    
    // Add response caching headers (4 hours TTL)
    res.setHeader('Cache-Control', 'public, s-maxage=14400, stale-while-revalidate=86400')
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=14400')
    
    res.status(200).json(responseData)
  } catch (error) {
    console.error('Error fetching parents registered data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
