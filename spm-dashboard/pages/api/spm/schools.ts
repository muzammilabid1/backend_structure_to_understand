import type { NextApiRequest, NextApiResponse } from 'next'

import { requireAdminToken } from '@/lib/auth/requireAdminToken'
import { DEFAULT_PAGE_LIMIT, getSchoolsForSpm } from '@/lib/db/spmSchoolQueries'
import { parseLaunchFilters } from '@/lib/spm/launchFilters'
import { parseSpmTagId } from '@/lib/spm/spmTags'
import type { SpmSchoolsOutput } from '@/types/spm'

const parseNonNegativeInt = (value: string | string[] | undefined, fallback: number): number => {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(raw ?? '', 10)

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SpmSchoolsOutput | { error: string }>
): Promise<void> {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!(await requireAdminToken(req))) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const limit = parseNonNegativeInt(req.query.limit, DEFAULT_PAGE_LIMIT)
  const offset = parseNonNegativeInt(req.query.offset, 0)
  const tagId = parseSpmTagId(req.query.tagId)

  // An unreadable tagId must not fall back to every school: a filter that silently widens its
  // result set is worse than one that fails.
  if (req.query.tagId !== undefined && tagId === null) {
    return res.status(400).json({ error: 'tagId must be a numeric SPM tag id' })
  }

  const parsedLaunchFilters = parseLaunchFilters(req.query)

  if (parsedLaunchFilters.kind === 'unreadable') {
    return res.status(400).json({
      error: `${parsedLaunchFilters.param} must be launched, notLaunched or notSubscribed`,
    })
  }

  try {
    const page = await getSchoolsForSpm({
      limit,
      offset,
      tagId,
      launchFilters: parsedLaunchFilters.filters,
    })

    res.status(200).json(page)
  } catch (error) {
    console.error('Error fetching SPM schools:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
