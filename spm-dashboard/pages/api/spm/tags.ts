import { sql, type SqlBool } from 'kysely'
import type { NextApiRequest, NextApiResponse } from 'next'

import { db } from '@/lib/db/database'
import { SPM_TAG_NAME_PATTERN } from '@/lib/spm/spmTags'
import type { SpmTag, SpmTagsOutput } from '@/types/spm'

// `private` because middleware restricts this route to ADMIN sessions, so no shared cache may hold it.
const CACHE_CONTROL = 'private, max-age=60'

/**
 * The SPM tags, each with the number of live schools carrying it. The pattern is bound as a
 * parameter rather than interpolated, so no tag matching reaches Postgres as literal SQL.
 */
async function getSpmTags(): Promise<SpmTag[]> {
  return db
    .selectFrom('static_lwp_school_tag as t')
    .leftJoin('lwp_school_static_tags as lst', 'lst.tagId', 't.id')
    .leftJoin('lwp_school as s', (join) =>
      join
        .onRef('s.id', '=', 'lst.schoolId')
        .on('s.inactive', '=', false)
        .on('s.isTestSchool', '=', false)
    )
    .where(sql<SqlBool>`t.name ~* ${SPM_TAG_NAME_PATTERN}`)
    .groupBy(['t.id', 't.name'])
    .orderBy('t.name')
    .select((eb) => [
      't.id',
      't.name',
      sql<number>`${eb.fn.count('s.id').distinct()}::int`.as('schoolCount'),
    ])
    .execute()
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SpmTagsOutput | { error: string }>
): Promise<void> {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const results = await getSpmTags()

    res.setHeader('Cache-Control', CACHE_CONTROL)
    res.status(200).json({ results })
  } catch (error) {
    console.error('Error fetching SPM tags:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
