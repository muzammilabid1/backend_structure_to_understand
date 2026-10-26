import { describe, expect, test } from 'vitest'

import { formatDayMonthYear } from './formatDate'

describe('formatDayMonthYear', () => {
  test('formats an ISO timestamp as day, short month and year', () => {
    expect(formatDayMonthYear('2024-01-05T12:00:00.000Z')).toBe('5 Jan 2024')
  })

  test('omits the leading zero on single-digit days', () => {
    expect(formatDayMonthYear('2024-03-09T12:00:00.000Z')).toBe('9 Mar 2024')
  })

  test('keeps both digits on double-digit days', () => {
    expect(formatDayMonthYear('2024-03-19T12:00:00.000Z')).toBe('19 Mar 2024')
  })

  test('formats a date-only ISO string', () => {
    expect(formatDayMonthYear('2024-12-25')).toBe('25 Dec 2024')
  })

  test.each`
    isoDate                       | expected
    ${'2024-01-15T12:00:00.000Z'} | ${'15 Jan 2024'}
    ${'2024-02-15T12:00:00.000Z'} | ${'15 Feb 2024'}
    ${'2024-03-15T12:00:00.000Z'} | ${'15 Mar 2024'}
    ${'2024-04-15T12:00:00.000Z'} | ${'15 Apr 2024'}
    ${'2024-05-15T12:00:00.000Z'} | ${'15 May 2024'}
    ${'2024-06-15T12:00:00.000Z'} | ${'15 Jun 2024'}
    ${'2024-07-15T12:00:00.000Z'} | ${'15 Jul 2024'}
    ${'2024-08-15T12:00:00.000Z'} | ${'15 Aug 2024'}
    ${'2024-09-15T12:00:00.000Z'} | ${'15 Sept 2024'}
    ${'2024-10-15T12:00:00.000Z'} | ${'15 Oct 2024'}
    ${'2024-11-15T12:00:00.000Z'} | ${'15 Nov 2024'}
    ${'2024-12-15T12:00:00.000Z'} | ${'15 Dec 2024'}
  `(
    'abbreviates the month without a trailing period for $isoDate',
    ({ isoDate, expected }: { isoDate: string; expected: string }) => {
      expect(formatDayMonthYear(isoDate)).toBe(expected)
    }
  )

  test('uses the en-GB month abbreviation for September', () => {
    expect(formatDayMonthYear('2024-09-15T12:00:00.000Z')).toBe('15 Sept 2024')
  })

  test('separates parts with plain ASCII spaces', () => {
    expect(formatDayMonthYear('2024-01-05T12:00:00.000Z')).toMatch(
      /^\d{1,2} [A-Z][a-z]{2,3} \d{4}$/
    )
  })

  test('throws on an unparseable date string', () => {
    expect(() => formatDayMonthYear('not-a-date')).toThrow(RangeError)
  })
})
