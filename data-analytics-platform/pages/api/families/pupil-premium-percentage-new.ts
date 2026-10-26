import type { NextApiRequest, NextApiResponse } from 'next'
import { createPostgresClient } from '@lwp/postgres-client'
import { sql } from 'kysely'
import fs from 'fs'
import path from 'path'

export interface PPPercentageNewItem {
  year: string
  total_active_pupils: number
  pp_active_pupils: number
  pp_percentage: number
}

export type PPPercentageNewResponse = PPPercentageNewItem[]

// Create database connection using the postgres client
function createDatabaseConnection() {
  return createPostgresClient({
    host: process.env.PGHOST_SNAPSHOT ,
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGAPPUSER,
    password: process.env.PGAPPPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGHOST !== 'localhost' 
      ? {
          ca: fs.readFileSync(
            path.resolve(process.cwd(), '..', 'graphql-provider', 'lib', 'eu-west-2-bundle.pem')
          ).toString(),
          rejectUnauthorized: false
        }
      : false,
  })
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PPPercentageNewResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const db = createDatabaseConnection()
    
    console.log('Families API - PP Percentage New - Database Connection:', {
      host: process.env.PGHOST_SNAPSHOT || process.env.PGHOST,
      source: process.env.PGHOST_SNAPSHOT ? 'SNAPSHOT' : 'MAIN'
    })
    
    // Get query parameters  
    const schoolId = req.query.schoolId as string
    const showAllSchools = req.query.showAllSchools === 'true'
    
    // Query for pupil premium percentage among pupils with parent feedback
    // Starting from 2023-2024 academic year
    let query = sql`
      SELECT 
        "timeKey" as year,
        COUNT(*) FILTER (WHERE "parentCommentsLeftCount" > 0) as total_active_pupils,
        COUNT(*) FILTER (WHERE "parentCommentsLeftCount" > 0 AND "isPupilPremium" = true) as pp_active_pupils
      FROM analytics_pupil_fact 
      WHERE "isActive" = true
        AND "timeGrain" = 'yearly'
        AND "timeKey" >= 2023
    `
    
    // Add school filter if specified
    if (!showAllSchools && schoolId) {
      query = sql`${query} AND "schoolId" = ${schoolId}::text`
    }
    
    query = sql`${query}
      GROUP BY "timeKey"
      ORDER BY "timeKey"
    `
    
    console.log('Families API - PP Percentage New - Executing query with filters:', { 
      schoolId, 
      showAllSchools,
      query: query.compile(db).sql 
    })
    
    const result = await query.execute(db)
    
    console.log('Families API - PP Percentage New - Raw result:', {
      rowCount: result.rows.length,
      rawRows: result.rows.slice(0, 3) // Show first 3 rows
    })
    
    // Transform the results, calculate percentages, and format as academic years
    const data: PPPercentageNewResponse = result.rows.map((row: any) => {
      const year = Number(row.year)
      const academicYear = `${year}-${year + 1}` // e.g., 2022 becomes "2022-2023"
      const total = Number(row.total_active_pupils || 0)
      const pp = Number(row.pp_active_pupils || 0)
      const percentage = total > 0 ? Math.round((pp / total) * 100 * 100) / 100 : 0
      
      return {
        year: academicYear,
        total_active_pupils: total,
        pp_active_pupils: pp,
        pp_percentage: percentage
      }
    })
    
    console.log('Families API - PP Percentage New - Final data:', {
      rowCount: data.length,
      sampleData: data.slice(0, 2)
    })
    
    // Add response caching headers
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200')
    res.setHeader('Vary', 'Accept-Encoding')
    
    res.status(200).json(data)
    
  } catch (error) {
    console.error('Families API - PP Percentage New - Error:', error)
    res.status(500).json({ error: 'Failed to fetch pupil premium percentage data' })
  }
}
