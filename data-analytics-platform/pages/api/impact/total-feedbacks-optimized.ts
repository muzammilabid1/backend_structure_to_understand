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

interface TotalFeedbacksQueryResult {
  year: number
  total_feedback_entries: number
  pp_total_feedback_entries: number
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
    
    // Use raw SQL to query the summary table
    const result = await sql<TotalFeedbacksQueryResult>`
      SELECT 
        period_index as year,
        total_feedback_entries,
        pp_total_feedback_entries
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
    const responseData: TotalFeedbacksResponse = {
      all_students: yearlyData.map((row: TotalFeedbacksQueryResult) => ({
        year: row.year.toString(),
        total_feedbacks: row.total_feedback_entries || 0
      })),
      pupil_premium: yearlyData.map((row: TotalFeedbacksQueryResult) => ({
        year: row.year.toString(),
        total_feedbacks: row.pp_total_feedback_entries || 0
      }))
    }
    
    // Add response caching headers (longer TTL - 6 hours)
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=43200')
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=21600')
    
    res.status(200).json(responseData)
  } catch (error) {
    console.error('Error fetching total feedbacks data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 