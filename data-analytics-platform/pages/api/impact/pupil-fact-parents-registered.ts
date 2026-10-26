import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '../../../lib/database'
import { getGenericCountData, type PupilFactFilters, type GenericCountData } from '../../../lib/analytics-queries'

export interface ParentsRegisteredResponse {
  all_students: Array<{
    year: number
    total_parents_registered: number
  }>
  pupil_premium: Array<{
    year: number
    total_parents_registered: number
  }>
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
      'activeParentsCount', 
      'total_parents_registered'
    )
    const responseData: ParentsRegisteredResponse = {
      all_students: data.all_students.map(({ year, total_parents_registered }) => ({
        year,
        total_parents_registered,
      })),
      pupil_premium: data.pupil_premium.map(({ year, total_parents_registered }) => ({
        year,
        total_parents_registered,
      })),
    }
    
    // Add response caching headers (4 hours for parents registered)
    res.setHeader('Cache-Control', 'public, max-age=14400, stale-while-revalidate=7200')
    res.setHeader('Vary', 'Accept-Encoding')
    
    res.status(200).json(responseData)
  } catch (error) {
    console.error('Error fetching parents registered data from pupil fact:', error)
    res.status(500).json({ error: 'Failed to fetch parents registered data' })
  }
}
