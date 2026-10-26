import { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { getKPIData, PupilFactFilters } from '../../../lib/analytics-queries'
import { createDatabaseConnection } from '../../../lib/database'

export interface KPIData {
  three_year_average: {
    years: string
    percentage: number
    pupils_with_feedback: number
    total_active_pupils: number
  }
  year_breakdown: Array<{
    year: string
    percentage: number
    pupils_with_feedback: number
    total_active_pupils: number
  }>
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<KPIData | { error: string }>
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
    
    const kpiData = await getKPIData(db, filters)
    
    // Add response caching headers (2 hours for KPIs)
    res.setHeader('Cache-Control', 'public, max-age=7200, stale-while-revalidate=3600')
    res.setHeader('Vary', 'Accept-Encoding')
    
    res.status(200).json(kpiData)
  } catch (error) {
    console.error('Error fetching KPI data from pupil fact:', error)
    res.status(500).json({ error: 'Failed to fetch KPI data' })
  }
}
