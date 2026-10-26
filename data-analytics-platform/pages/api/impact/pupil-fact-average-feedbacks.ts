import type { NextApiRequest, NextApiResponse } from 'next'
import { getAverageFeedbacksData, type PupilFactFilters, type AverageFeedbacksData } from '../../../lib/analytics-queries'
import { createDatabaseConnection } from '../../../lib/database'

export interface AverageFeedbacksResponse {
  all_students: Array<{
    year: number
    total_active_pupils: number
    total_feedbacks: number
    average_per_all_students: number
  }>
  pupil_premium: Array<{
    year: number
    total_active_pupils: number
    total_feedbacks: number
    average_per_all_students: number
  }>
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AverageFeedbacksResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const db = createDatabaseConnection()
    
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
    
    const data = await getAverageFeedbacksData(db, filters)
    
    // Add response caching headers (4 hours for average feedbacks)
    res.setHeader('Cache-Control', 'public, max-age=14400, stale-while-revalidate=7200')
    res.setHeader('Vary', 'Accept-Encoding')
    
    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching average feedbacks data from pupil fact:', error)
    res.status(500).json({ error: 'Failed to fetch average feedbacks data' })
  }
}
