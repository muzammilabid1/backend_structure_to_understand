import { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../../lib/database'

export interface FeedbackPercentageData {
  year: string
  percentage: number
  pupils_with_feedback: number
  total_active_pupils: number
}

export interface FeedbackPercentageResponse {
  all_students: FeedbackPercentageData[]
  pupil_premium: FeedbackPercentageData[]
}

interface FeedbackPercentageQueryResult {
  year: number
  pupils_with_feedback: number
  total_active_pupils: number
  feedback_percentage: number
  pp_pupils_with_feedback: number
  pp_total_active_pupils: number
  pp_feedback_percentage: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FeedbackPercentageResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get query parameters
    const schoolId = req.query.schoolId as string
    const showAllSchools = req.query.showAllSchools === 'true'
    
    // Use raw SQL to query the summary table
    const result = await sql<FeedbackPercentageQueryResult>`
      SELECT 
        period_index as year,
        pupils_with_feedback,
        total_active_pupils,
        feedback_percentage,
        pp_pupils_with_feedback,
        pp_total_active_pupils,
        pp_feedback_percentage
      FROM analytics_school_impact_summary 
      WHERE aggregation_level = 'yearly'
        AND (
          ${showAllSchools || !schoolId} = true AND school_id IS NULL
          OR school_id = ${schoolId || null}
        )
      ORDER BY period_index
    `.execute(db)
    
    const yearlyData = result.rows
    
    // Fixed years for fallback (ensuring we have data for all years)
    const years = [2021, 2022, 2023, 2024, 2025]
    
    // Transform results into the expected format
    const transformData = (
      dataExtractor: (row: FeedbackPercentageQueryResult) => {
        pupils_with_feedback: number
        total_active_pupils: number
        percentage: number
      }
    ): FeedbackPercentageData[] => {
      const results = yearlyData.map(row => {
        const data = dataExtractor(row)
        return {
          year: row.year.toString(),
          percentage: Number(data.percentage) || 0,
          pupils_with_feedback: data.pupils_with_feedback || 0,
          total_active_pupils: data.total_active_pupils || 0
        }
      })

      // Ensure we have data for all requested years
      return years.map(year => {
        const yearStr = year.toString()
        const existingData = results.find(r => r.year === yearStr)
        return existingData || {
          year: yearStr,
          percentage: 0,
          pupils_with_feedback: 0,
          total_active_pupils: 0
        }
      })
    }

    const responseData: FeedbackPercentageResponse = {
      all_students: transformData(row => ({
        pupils_with_feedback: row.pupils_with_feedback,
        total_active_pupils: row.total_active_pupils,
        percentage: row.feedback_percentage
      })),
      pupil_premium: transformData(row => ({
        pupils_with_feedback: row.pp_pupils_with_feedback,
        total_active_pupils: row.pp_total_active_pupils,
        percentage: row.pp_feedback_percentage
      }))
    }
    
    // Add response caching headers (4 hours TTL)
    res.setHeader('Cache-Control', 'public, s-maxage=14400, stale-while-revalidate=86400')
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=14400')
    
    res.status(200).json(responseData)
  } catch (error) {
    console.error('Error fetching feedback percentage data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 