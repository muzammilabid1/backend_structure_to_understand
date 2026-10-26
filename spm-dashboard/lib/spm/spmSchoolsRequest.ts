import { LAUNCH_FILTER_PARAM, type LaunchFilters } from '@/lib/spm/launchFilters'
import { isSchoolsFilterActive, type SchoolsFilter, toSelectedTagId } from '@/lib/spm/schoolsFilter'
import { PROGRAMME_KEYS, type SpmSchoolsOutput } from '@/types/spm'

export const SPM_SCHOOLS_PAGE_LIMIT = 25

type SchoolsPageRequest = {
  pageIndex: number
  filter: SchoolsFilter
  launchFilters: LaunchFilters
}

export const buildSchoolsPageUrl = ({
  pageIndex,
  filter,
  launchFilters,
}: SchoolsPageRequest): string => {
  const query = new URLSearchParams({
    limit: String(SPM_SCHOOLS_PAGE_LIMIT),
    offset: String(pageIndex * SPM_SCHOOLS_PAGE_LIMIT),
  })

  const tagId = toSelectedTagId(filter)
  if (tagId) {
    query.set('tagId', tagId)
  }

  PROGRAMME_KEYS.forEach((programme) => {
    const state = launchFilters[programme]
    if (state) {
      query.set(LAUNCH_FILTER_PARAM[programme], state)
    }
  })

  return `/api/spm/schools?${query.toString()}`
}

type SchoolsPageKeyRequest = SchoolsPageRequest & {
  previousPage: SpmSchoolsOutput | null
}

/** A null key is how SWR's infinite hook is told not to fetch, here and at the end of the list. */
export const toSchoolsPageKey = ({
  pageIndex,
  previousPage,
  filter,
  launchFilters,
}: SchoolsPageKeyRequest): string | null => {
  if (!isSchoolsFilterActive(filter)) {
    return null
  }

  if (previousPage && previousPage.offset + previousPage.page_total >= previousPage.total) {
    return null
  }

  return buildSchoolsPageUrl({ pageIndex, filter, launchFilters })
}
