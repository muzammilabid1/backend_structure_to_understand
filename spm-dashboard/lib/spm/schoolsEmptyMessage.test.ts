import { describe, expect, it } from 'vitest'

import { NO_LAUNCH_FILTERS } from '@/lib/spm/launchFilters'

import { toSchoolsEmptyMessage } from './schoolsEmptyMessage'

describe('toSchoolsEmptyMessage', () => {
  it('blames the assignment when no launch filter is narrowing the table', () => {
    expect(toSchoolsEmptyMessage(NO_LAUNCH_FILTERS)).toBe('You have no schools assigned to you.')
  })

  it('blames the launch filters when one is narrowing the table', () => {
    expect(toSchoolsEmptyMessage({ digitalReadingLog: 'notLaunched' })).toBe(
      'No schools match the launch filters.'
    )
  })
})
