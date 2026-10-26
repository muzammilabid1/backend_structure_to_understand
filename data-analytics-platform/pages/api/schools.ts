import { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../lib/database'

export interface School {
  id: string
  schoolName: string
}

// Strongly typed result from the raw SQL query
interface SchoolQueryResult {
  id: string
  schoolName: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<School[] | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Use Kysely with raw SQL and strong typing
    const result = await sql<SchoolQueryResult>`
      SELECT id, "schoolName"
      FROM lwp_school
      WHERE NOT "isTestSchool"
      ORDER BY "schoolName" ASC;
    `.execute(db)

    const schools: School[] = result.rows.map((row: SchoolQueryResult) => ({
      id: row.id,
      schoolName: row.schoolName
    }))
    
    // Add response caching headers (longer TTL since schools don't change often - 24 hours)
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800')
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=86400')
    
    res.status(200).json(schools)
  } catch (error) {
    console.error('Error fetching schools:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 