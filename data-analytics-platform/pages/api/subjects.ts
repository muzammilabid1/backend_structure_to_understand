import { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../lib/database'
import { IStaticLwpSubject } from '@/types/entities/IStaticLwpSubject'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IStaticLwpSubject[] | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Use Kysely with raw SQL and strong typing
    const result = await sql<IStaticLwpSubject>`
      SELECT id, "name"
      FROM static_lwp_subject
      ORDER BY "name" ASC;
    `.execute(db)

    const subjects = result?.rows as IStaticLwpSubject[]

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800')
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=86400')

    res.status(200).json(subjects)
  } catch (error) {
    console.error('Error fetching subjects:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
