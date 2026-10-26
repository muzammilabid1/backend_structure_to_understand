import type { NextApiRequest, NextApiResponse } from 'next'
import { Pool } from 'pg'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Create a direct connection without the @lwp/postgres-client wrapper
    const pool = new Pool({
      host: process.env.PGHOST_SNAPSHOT || process.env.PGHOST,
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGAPPUSER,
      password: process.env.PGAPPPASSWORD,
      database: process.env.PGDATABASE,
      ssl: process.env.PGHOST !== 'localhost' ? { rejectUnauthorized: false } : false,
    })

    console.log('Direct DB Connection Info:', {
      host: process.env.PGHOST_SNAPSHOT || process.env.PGHOST,
      database: process.env.PGDATABASE,
      user: process.env.PGAPPUSER,
      source: process.env.PGHOST_SNAPSHOT ? 'SNAPSHOT' : 'MAIN'
    })

    // Test basic connection
    const client = await pool.connect()
    
    // Test if analytics_pupil_fact table exists
    const tableExistsResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'analytics_pupil_fact'
      )
    `)
    
    // Get count of rows in the table
    let rowCount = 0
    let sampleData = []
    
    if (tableExistsResult.rows[0].exists) {
      const countResult = await client.query('SELECT COUNT(*) FROM analytics_pupil_fact')
      rowCount = parseInt(countResult.rows[0].count)
      
      // Get a few sample rows
      const sampleResult = await client.query(`
        SELECT "timeKey", "timeGrain", "isActive", "isPupilPremium" 
        FROM analytics_pupil_fact 
        WHERE "timeGrain" = 'yearly' AND "isActive" = true
        LIMIT 5
      `)
      sampleData = sampleResult.rows
    }
    
    // Test the actual PP percentage query
    const ppResult = await client.query(`
      SELECT 
        "timeKey" as year,
        COUNT(DISTINCT "pupilId") as total_active_pupils,
        COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium" = true) as pp_active_pupils
      FROM analytics_pupil_fact 
      WHERE "isActive" = true
        AND "timeGrain" = 'yearly'
      GROUP BY "timeKey"
      ORDER BY "timeKey"
    `)

    client.release()
    await pool.end()

    res.status(200).json({
      connection: 'success',
      tableExists: tableExistsResult.rows[0].exists,
      totalRows: rowCount,
      sampleData,
      ppQueryResults: ppResult.rows,
      ppQueryCount: ppResult.rows.length
    })

  } catch (error) {
    console.error('Direct DB test error:', error)
    res.status(500).json({ 
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
