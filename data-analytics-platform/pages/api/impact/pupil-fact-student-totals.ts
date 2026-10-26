import type { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { getStudentTotalsData, type PupilFactFilters, type StudentTotalsData } from '../../../lib/analytics-queries'
import { createDatabaseConnection } from '../../../lib/database'

export interface StudentTotalsResponse {
  all_students: Array<{
    year: number
    total_active_pupils: number
    pupils_with_feedback: number
  }>
  pupil_premium: Array<{
    year: number
    total_active_pupils: number
    pupils_with_feedback: number
  }>
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StudentTotalsResponse | { error: string }>
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
    const availableYearsResult = await sql<{timeKey: number}>`
      SELECT DISTINCT "timeKey" 
      FROM analytics_pupil_fact 
      WHERE "timeGrain" = 'yearly'
      ORDER BY "timeKey"
    `.execute(db)
    
    const timeKeys = availableYearsResult.rows.map((row: any) => row.timeKey)
    
    if (timeKeys.length === 0) {
      return res.status(404).json({ error: 'No analytics data available' })
    }
    
    const filters: PupilFactFilters = {
      schoolId: schoolId || undefined,
      showAllSchools,
      timeKeys,
      timeGrain: 'yearly'
    }
    
    const data = await getStudentTotalsData(db, filters)
    
    // Add response caching headers (4 hours for student totals)
    res.setHeader('Cache-Control', 'public, max-age=14400, stale-while-revalidate=7200')
    res.setHeader('Vary', 'Accept-Encoding')
    
    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching student totals data from pupil fact:', error)
    res.status(500).json({ error: 'Failed to fetch student totals data' })
  }
}
