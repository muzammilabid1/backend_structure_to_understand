import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '../../../lib/database'
import { getGenericCountData, type PupilFactFilters, type GenericCountData } from '../../../lib/analytics-queries'

export interface VideosWatchedResponse {
  all_students: Array<{
    year: number
    total_watched: number
  }>
  pupil_premium: Array<{
    year: number
    total_watched: number
  }>
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VideosWatchedResponse | { error: string }>
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
    
    const data = await getGenericCountData(
      db, 
      filters, 
      'videosWatchedCount', 
      'total_watched'
    )
    const responseData: VideosWatchedResponse = {
      all_students: data.all_students.map(({ year, total_watched }) => ({
        year,
        total_watched,
      })),
      pupil_premium: data.pupil_premium.map(({ year, total_watched }) => ({
        year,
        total_watched,
      })),
    }
    
    // Add response caching headers (4 hours for videos watched)
    res.setHeader('Cache-Control', 'public, max-age=14400, stale-while-revalidate=7200')
    res.setHeader('Vary', 'Accept-Encoding')
    
    res.status(200).json(responseData)
  } catch (error) {
    console.error('Error fetching videos watched data from pupil fact:', error)
    res.status(500).json({ error: 'Failed to fetch videos watched data' })
  }
}
