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
    // Simple connection to SNAPSHOT database
    const pool = new Pool({
      host: process.env.PGHOST_SNAPSHOT || process.env.PGHOST,
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGAPPUSER,
      password: process.env.PGAPPPASSWORD,
      database: process.env.PGDATABASE,
      ssl: process.env.PGHOST !== 'localhost' ? { rejectUnauthorized: false } : false,
    })

    console.log('Simple DB Connection Info:', {
      host: process.env.PGHOST_SNAPSHOT || process.env.PGHOST,
      database: process.env.PGDATABASE,
      user: process.env.PGAPPUSER,
      source: process.env.PGHOST_SNAPSHOT ? 'SNAPSHOT' : 'MAIN'
    })

    const client = await pool.connect()
    
    // Test the exact PP percentage query
    const ppQuery = `
      SELECT 
        "timeKey" as year,
        COUNT(DISTINCT "pupilId") as total_active_pupils,
        COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium" = true) as pp_active_pupils
      FROM analytics_pupil_fact 
      WHERE "isActive" = true
        AND "timeGrain" = 'yearly'
      GROUP BY "timeKey"
      ORDER BY "timeKey"
    `
    
    console.log('Executing PP Query:', ppQuery)
    const result = await client.query(ppQuery)
    
    client.release()
    await pool.end()

    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length
    })

  } catch (error) {
    console.error('Simple DB test error:', error)
    res.status(500).json({ 
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
