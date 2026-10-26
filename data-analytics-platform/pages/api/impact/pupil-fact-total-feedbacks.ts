import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '../../../lib/database'
import { getTotalFeedbacksData, type PupilFactFilters, type TotalFeedbacksData } from '../../../lib/analytics-queries'

export interface TotalFeedbacksResponse {
  all_students: Array<{
    year: number
    total_feedbacks: number
  }>
  pupil_premium: Array<{
    year: number
    total_feedbacks: number
  }>
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
    
    // Get available years from database dynamically
    const availableYearsResult = await db
      .selectFrom('analytics_pupil_fact')
      .select('timeKey')
      .where('timeGrain', '=', 'yearly')
      .distinct()
      .orderBy('timeKey')
      .execute()
    
    const timeKeys = availableYearsResult.map(row => row.timeKey)
    
    if (timeKeys.length === 0) {
      return res.status(404).json({ error: 'No analytics data available' })
    }
    
    const filters: PupilFactFilters = {
      schoolId: schoolId || undefined,
      showAllSchools,
      timeKeys,
      timeGrain: 'yearly'
    }
    
    const data = await getTotalFeedbacksData(db, filters)
    
    // Add response caching headers (4 hours for total feedbacks)
    res.setHeader('Cache-Control', 'public, max-age=14400, stale-while-revalidate=7200')
    res.setHeader('Vary', 'Accept-Encoding')
    
    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching total feedbacks data from pupil fact:', error)
    res.status(500).json({ error: 'Failed to fetch total feedbacks data' })
  }
}
