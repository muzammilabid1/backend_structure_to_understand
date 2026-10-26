import type { NextApiRequest, NextApiResponse } from 'next'
import { createPostgresClient } from '@lwp/postgres-client'
import { sql } from 'kysely'
import fs from 'fs'
import path from 'path'

export interface PupilsWithParentFeedbackItem {
  year: string
  all_active_pupils: number
  pp_active_pupils: number
}

export type PupilsWithParentFeedbackResponse = PupilsWithParentFeedbackItem[]

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
  res: NextApiResponse<PupilsWithParentFeedbackResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const db = createDatabaseConnection()
    
    console.log('Families API - Pupils With Parent Feedback - Database Connection:', {
      host: process.env.PGHOST_SNAPSHOT || process.env.PGHOST,
      source: process.env.PGHOST_SNAPSHOT ? 'SNAPSHOT' : 'MAIN'
    })
    
    // Get query parameters  
    const schoolId = req.query.schoolId as string
    const showAllSchools = req.query.showAllSchools === 'true'
    
    // Query for pupils with at least 1 parent feedback (parentCommentsLeftCount > 0)
    // Starting from 2023-2024 academic year
    let query = sql`
      SELECT 
        "timeKey" as year,
        COUNT(*) FILTER (WHERE "parentCommentsLeftCount" > 0) as all_active_pupils,
        COUNT(*) FILTER (WHERE "parentCommentsLeftCount" > 0 AND "isPupilPremium" = true) as pp_active_pupils
      FROM analytics_pupil_fact 
      WHERE "isActive" = true
        AND "timeGrain" = 'yearly'
        AND "timeKey" >= 2023
    `
    
    // Add school filter if specified
    if (!showAllSchools && schoolId) {
      query = sql`${query} AND "schoolId" = ${schoolId}::bigint`
    }
    
    query = sql`${query}
      GROUP BY "timeKey"
      ORDER BY "timeKey"
    `
    
    console.log('Families API - Pupils With Parent Feedback - Executing query with filters:', { 
      schoolId, 
      showAllSchools,
      query: query.compile(db).sql 
    })
    
    const result = await query.execute(db)
    
    console.log('Families API - Pupils With Parent Feedback - Raw result:', {
      rowCount: result.rows.length,
      rawRows: result.rows.slice(0, 3) // Show first 3 rows
    })
    
    // Transform the results and format as academic years
    const data: PupilsWithParentFeedbackResponse = result.rows.map((row: any) => {
      const year = Number(row.year)
      const academicYear = `${year}-${year + 1}` // e.g., 2022 becomes "2022-2023"
      
      return {
        year: academicYear,
        all_active_pupils: Number(row.all_active_pupils || 0),
        pp_active_pupils: Number(row.pp_active_pupils || 0)
      }
    })
    
    console.log('Families API - Pupils With Parent Feedback - Final data:', {
      rowCount: data.length,
      sampleData: data.slice(0, 2)
    })
    
    // Add response caching headers
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200')
    res.setHeader('Vary', 'Accept-Encoding')
    
    res.status(200).json(data)
    
  } catch (error) {
    console.error('Families API - Pupils With Parent Feedback - Error:', error)
    res.status(500).json({ error: 'Failed to fetch pupils with parent feedback data' })
  }
}
