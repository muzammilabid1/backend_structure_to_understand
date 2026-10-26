export type SchoolsFilter = { kind: 'unset' } | { kind: 'all' } | { kind: 'tag'; tagId: string }

export const NO_SCHOOLS_FILTER: SchoolsFilter = { kind: 'unset' }

export const isSchoolsFilterActive = (filter: SchoolsFilter): boolean => filter.kind !== 'unset'

export const isAllSchoolsFilterActive = (filter: SchoolsFilter): boolean => filter.kind === 'all'

export const isTagFilterActive = (filter: SchoolsFilter, tagId: string): boolean =>
  filter.kind === 'tag' && filter.tagId === tagId

export const toSelectedTagId = (filter: SchoolsFilter): string | null =>
  filter.kind === 'tag' ? filter.tagId : null

export const toggleAllSchools = (filter: SchoolsFilter): SchoolsFilter =>
  isAllSchoolsFilterActive(filter) ? NO_SCHOOLS_FILTER : { kind: 'all' }

export const toggleSchoolsTag = (filter: SchoolsFilter, tagId: string): SchoolsFilter =>
  isTagFilterActive(filter, tagId) ? NO_SCHOOLS_FILTER : { kind: 'tag', tagId }
