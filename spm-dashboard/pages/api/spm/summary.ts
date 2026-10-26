import type { NextApiRequest, NextApiResponse } from 'next'

import { requireAdminToken } from '@/lib/auth/requireAdminToken'
import { getSpmSummary } from '@/lib/db/spmSummaryQueries'
import type { SpmSummary } from '@/types/spm'

// `private` because middleware restricts this route to ADMIN sessions, so no shared cache may hold it.
const CACHE_CONTROL = 'private, max-age=60'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SpmSummary | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!(await requireAdminToken(req))) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const summary = await getSpmSummary()

    res.setHeader('Cache-Control', CACHE_CONTROL)
    res.status(200).json(summary)
  } catch (error) {
    console.error('Error fetching SPM summary:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
