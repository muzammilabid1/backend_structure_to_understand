import { describe, expect, it } from 'vitest'

import { toReadingLogsKey } from './readingLogsKey'

describe('toReadingLogsKey', () => {
  it('omits the school filter when no school is selected', () => {
    expect(toReadingLogsKey(null)).toBe('/api/spm/reading-logs')
  })

  it('filters by the selected school', () => {
    expect(toReadingLogsKey('school-1')).toBe('/api/spm/reading-logs?schoolId=school-1')
  })

  it('encodes a school id that would otherwise break the query string', () => {
    expect(toReadingLogsKey('a&b=c')).toBe('/api/spm/reading-logs?schoolId=a%26b%3Dc')
  })
})
