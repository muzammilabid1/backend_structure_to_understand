import { describe, expect, it } from 'vitest'

import { NO_LAUNCH_FILTERS } from '@/lib/spm/launchFilters'
import { NO_SCHOOLS_FILTER } from '@/lib/spm/schoolsFilter'
import type { SpmSchoolsOutput } from '@/types/spm'

import { buildSchoolsPageUrl, toSchoolsPageKey } from './spmSchoolsRequest'

const ALL_SCHOOLS = { kind: 'all' } as const
const TAGGED_SCHOOLS = { kind: 'tag', tagId: '42' } as const
const NOT_LAUNCHED_READING_LOG = { digitalReadingLog: 'notLaunched' } as const

describe('buildSchoolsPageUrl', () => {
  it('requests the first page', () => {
    expect(
      buildSchoolsPageUrl({ pageIndex: 0, filter: ALL_SCHOOLS, launchFilters: NO_LAUNCH_FILTERS })
    ).toBe('/api/spm/schools?limit=25&offset=0')
  })

  it('offsets by a whole page per page index', () => {
    expect(
      buildSchoolsPageUrl({ pageIndex: 3, filter: ALL_SCHOOLS, launchFilters: NO_LAUNCH_FILTERS })
    ).toBe('/api/spm/schools?limit=25&offset=75')
  })

  it('carries the selected tag', () => {
    expect(
      buildSchoolsPageUrl({
        pageIndex: 0,
        filter: TAGGED_SCHOOLS,
        launchFilters: NO_LAUNCH_FILTERS,
      })
    ).toBe('/api/spm/schools?limit=25&offset=0&tagId=42')
  })

  it('carries a launch filter', () => {
    expect(
      buildSchoolsPageUrl({
        pageIndex: 0,
        filter: ALL_SCHOOLS,
        launchFilters: NOT_LAUNCHED_READING_LOG,
      })
    ).toBe('/api/spm/schools?limit=25&offset=0&digitalReadingLogLaunch=notLaunched')
  })

  it('carries a launch filter for every picked programme', () => {
    expect(
      buildSchoolsPageUrl({
        pageIndex: 0,
        filter: ALL_SCHOOLS,
        launchFilters: { ...NOT_LAUNCHED_READING_LOG, moneySkills: 'launched' },
      })
    ).toBe(
      '/api/spm/schools?limit=25&offset=0&digitalReadingLogLaunch=notLaunched&moneySkillsLaunch=launched'
    )
  })

  it('carries a launch filter alongside the selected tag', () => {
    expect(
      buildSchoolsPageUrl({
        pageIndex: 0,
        filter: TAGGED_SCHOOLS,
        launchFilters: NOT_LAUNCHED_READING_LOG,
      })
    ).toBe('/api/spm/schools?limit=25&offset=0&tagId=42&digitalReadingLogLaunch=notLaunched')
  })
})

describe('toSchoolsPageKey', () => {
  const page = (offset: number, pageTotal: number, total: number): SpmSchoolsOutput => ({
    results: [],
    total,
    page_total: pageTotal,
    limit: 25,
    offset,
  })

  it('asks for nothing until schools are asked for', () => {
    expect(
      toSchoolsPageKey({
        pageIndex: 0,
        previousPage: null,
        filter: NO_SCHOOLS_FILTER,
        launchFilters: NO_LAUNCH_FILTERS,
      })
    ).toBeNull()
  })

  it('requests the first page once an SPM is picked', () => {
    expect(
      toSchoolsPageKey({
        pageIndex: 0,
        previousPage: null,
        filter: TAGGED_SCHOOLS,
        launchFilters: NO_LAUNCH_FILTERS,
      })
    ).toBe('/api/spm/schools?limit=25&offset=0&tagId=42')
  })

  it('requests the unfiltered first page once all schools are asked for', () => {
    expect(
      toSchoolsPageKey({
        pageIndex: 0,
        previousPage: null,
        filter: ALL_SCHOOLS,
        launchFilters: NO_LAUNCH_FILTERS,
      })
    ).toBe('/api/spm/schools?limit=25&offset=0')
  })

  it('requests the next page while schools remain', () => {
    expect(
      toSchoolsPageKey({
        pageIndex: 1,
        previousPage: page(0, 25, 40),
        filter: TAGGED_SCHOOLS,
        launchFilters: NO_LAUNCH_FILTERS,
      })
    ).toBe('/api/spm/schools?limit=25&offset=25&tagId=42')
  })

  it('stops once the previous page reached the total', () => {
    expect(
      toSchoolsPageKey({
        pageIndex: 2,
        previousPage: page(25, 15, 40),
        filter: TAGGED_SCHOOLS,
        launchFilters: NO_LAUNCH_FILTERS,
      })
    ).toBeNull()
  })
})
