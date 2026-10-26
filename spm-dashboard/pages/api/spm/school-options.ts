import type { NextApiRequest, NextApiResponse } from 'next'

import { getSpmSchoolOptions } from '@/lib/db/spmSchoolQueries'
import type { SpmSchoolOption } from '@/types/spm'

// `private` because middleware restricts this route to ADMIN sessions, so no shared cache may hold it.
const CACHE_CONTROL = 'private, max-age=300'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SpmSchoolOption[] | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const schools = await getSpmSchoolOptions()

    res.setHeader('Cache-Control', CACHE_CONTROL)
    res.status(200).json(schools)
  } catch (error) {
    console.error('Error fetching SPM school options:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
