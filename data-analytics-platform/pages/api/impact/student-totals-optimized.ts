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

interface StudentTotalsQueryResult {
  year: number
  total_active_pupils: number
  pupils_with_feedback: number
  pp_total_active_pupils: number
  pp_pupils_with_feedback: number
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
    
    // Use raw SQL to query the summary table
    const result = await sql<StudentTotalsQueryResult>`
      SELECT 
        period_index as year,
        total_active_pupils,
        pupils_with_feedback,
        pp_total_active_pupils,
        pp_pupils_with_feedback
      FROM analytics_school_impact_summary 
      WHERE aggregation_level = 'yearly'
        AND (
          ${showAllSchools || !schoolId} = true AND school_id IS NULL
          OR school_id = ${schoolId || null}
        )
      ORDER BY period_index
    `.execute(db)
    
    const yearlyData = result.rows
    
    // Transform data to match the existing API contract
    const responseData: StudentTotalsResponse = {
      all_students: yearlyData.map((row: StudentTotalsQueryResult) => ({
        year: row.year.toString(),
        pupils_with_feedback: row.pupils_with_feedback || 0,
        total_active_pupils: row.total_active_pupils || 0
      })),
      pupil_premium: yearlyData.map((row: StudentTotalsQueryResult) => ({
        year: row.year.toString(),
        pupils_with_feedback: row.pp_pupils_with_feedback || 0,
        total_active_pupils: row.pp_total_active_pupils || 0
      }))
    }
    
    // Add response caching headers (longer TTL for student totals - 6 hours)
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=43200')
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=21600')
    
    res.status(200).json(responseData)
  } catch (error) {
    console.error('Error fetching student totals data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 