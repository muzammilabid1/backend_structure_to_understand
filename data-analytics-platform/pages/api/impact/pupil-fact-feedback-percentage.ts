import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '../../../lib/database'
import { getFeedbackPercentageData, type PupilFactFilters, type FeedbackPercentageData } from '../../../lib/analytics-queries'

export interface FeedbackPercentageResponse {
  all_students: Array<{
    year: number
    percentage: number
    pupils_with_feedback: number
    total_active_pupils: number
  }>
  pupil_premium: Array<{
    year: number
    percentage: number
    pupils_with_feedback: number
    total_active_pupils: number
  }>
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
    
    const data = await getFeedbackPercentageData(db, filters)
    
    // Add response caching headers (4 hours for feedback percentages)
    res.setHeader('Cache-Control', 'public, max-age=14400, stale-while-revalidate=7200')
    res.setHeader('Vary', 'Accept-Encoding')
    
    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching feedback percentage data from pupil fact:', error)
    res.status(500).json({ error: 'Failed to fetch feedback percentage data' })
  }
}
