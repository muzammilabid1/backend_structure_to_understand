import type { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { getPPPercentageData, type PupilFactFilters, type PPPercentageData } from '../../../lib/analytics-queries'
import { createDatabaseConnection } from '../../../lib/database'

export interface PPPercentageResponseItem {
  year: string
  pp_percentage: number
  total_active_pupils: number
  pp_active_pupils: number
}

export type PPPercentageResponse = PPPercentageResponseItem[]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PPPercentageResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const db = createDatabaseConnection()
    
    // Debug: Log which database we're connecting to
    const connectionInfo = {
      host: process.env.PGHOST_SNAPSHOT || process.env.PGHOST,
      database: process.env.PGDATABASE,
      user: process.env.PGAPPUSER,
      source: process.env.PGHOST_SNAPSHOT ? 'SNAPSHOT' : 'MAIN'
    }
    console.log('Database Connection Info:', connectionInfo)
    
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
    
    const data = await getPPPercentageData(db, filters)
    
    console.log('PP Percentage API Result:', {
      dataLength: data.length,
      data: data
    })
    
    // Add response caching headers (4 hours for PP percentage)
    res.setHeader('Cache-Control', 'public, max-age=14400, stale-while-revalidate=7200')
    res.setHeader('Vary', 'Accept-Encoding')
    
    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching PP percentage data from pupil fact:', error)
    res.status(500).json({ error: 'Failed to fetch PP percentage data' })
  }
}
