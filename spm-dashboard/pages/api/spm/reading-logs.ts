import type { NextApiRequest, NextApiResponse } from 'next'

import { getReadingLogTotals } from '@/lib/db/spmReadingLogQueries'
import type { SpmReadingLogTotals } from '@/types/spm'

// `private` because middleware restricts this route to ADMIN sessions, so no shared cache may hold it.
const CACHE_CONTROL = 'private, max-age=60'

const EMPTY_TOTALS: SpmReadingLogTotals = { atHomeCount: 0, atSchoolCount: 0 }

const parseSchoolId = (value: string | string[] | undefined): string | null => {
  const schoolId = Array.isArray(value) ? value[0] : value

  return schoolId ? schoolId : null
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SpmReadingLogTotals | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const totals = await getReadingLogTotals(parseSchoolId(req.query.schoolId))

    res.setHeader('Cache-Control', CACHE_CONTROL)
    res.status(200).json(totals ?? EMPTY_TOTALS)
  } catch (error) {
    console.error('Error fetching SPM reading log totals:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
