import { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../../lib/database'

export interface AverageFeedbacksData {
  year: string
  average_per_engaged_student: number  // Total feedbacks / students with feedback
  average_per_all_students: number     // Total feedbacks / all active students
  total_feedbacks: number
  pupils_with_feedback: number
  total_active_pupils: number
}

export interface AverageFeedbacksResponse {
  all_students: AverageFeedbacksData[]
  pupil_premium: AverageFeedbacksData[]
}

interface AverageFeedbacksQueryResult {
  year: number
  total_feedback_entries: number
  pupils_with_feedback: number
  total_active_pupils: number
  pp_total_feedback_entries: number
  pp_pupils_with_feedback: number
  pp_total_active_pupils: number
  average_feedbacks_per_student: number
  pp_average_feedbacks_per_student: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AverageFeedbacksResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get query parameters
    const schoolId = req.query.schoolId as string
    const showAllSchools = req.query.showAllSchools === 'true'
    
    // Use raw SQL to query the summary table
    const result = await sql<AverageFeedbacksQueryResult>`
      SELECT 
        period_index as year,
        total_feedback_entries,
        pupils_with_feedback,
        total_active_pupils,
        pp_total_feedback_entries,
        pp_pupils_with_feedback,
        pp_total_active_pupils,
        average_feedbacks_per_student,
        pp_average_feedbacks_per_student
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
    const responseData: AverageFeedbacksResponse = {
      all_students: yearlyData.map((row: AverageFeedbacksQueryResult) => {
        const totalFeedbacks = row.total_feedback_entries || 0
        const pupilsWithFeedback = row.pupils_with_feedback || 0
        const totalActivePupils = row.total_active_pupils || 0
        
        return {
          year: row.year.toString(),
          average_per_engaged_student: pupilsWithFeedback > 0 ? 
            Math.round((totalFeedbacks / pupilsWithFeedback) * 100) / 100 : 0,
          average_per_all_students: totalActivePupils > 0 ? 
            Math.round((totalFeedbacks / totalActivePupils) * 100) / 100 : 0,
          total_feedbacks: totalFeedbacks,
          pupils_with_feedback: pupilsWithFeedback,
          total_active_pupils: totalActivePupils
        }
      }),
      pupil_premium: yearlyData.map((row: AverageFeedbacksQueryResult) => {
        const totalFeedbacks = row.pp_total_feedback_entries || 0
        const pupilsWithFeedback = row.pp_pupils_with_feedback || 0
        const totalActivePupils = row.pp_total_active_pupils || 0
        
        return {
          year: row.year.toString(),
          average_per_engaged_student: pupilsWithFeedback > 0 ? 
            Math.round((totalFeedbacks / pupilsWithFeedback) * 100) / 100 : 0,
          average_per_all_students: totalActivePupils > 0 ? 
            Math.round((totalFeedbacks / totalActivePupils) * 100) / 100 : 0,
          total_feedbacks: totalFeedbacks,
          pupils_with_feedback: pupilsWithFeedback,
          total_active_pupils: totalActivePupils
        }
      })
    }
    
    // Add response caching headers (longer TTL - 6 hours)
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=43200')
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=21600')
    
    res.status(200).json(responseData)
  } catch (error) {
    console.error('Error fetching average feedbacks data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 