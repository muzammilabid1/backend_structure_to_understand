import { describe, expect, test } from 'vitest'

import { getInitials } from './getInitials'

describe('getInitials', () => {
  test('takes the first letter of the first and last name', () => {
    expect(getInitials('Sarah Mitchell')).toBe('SM')
  })

  test('uppercases lowercase names', () => {
    expect(getInitials('sarah mitchell')).toBe('SM')
  })

  test('returns a single initial for a one-word name', () => {
    expect(getInitials('Sarah')).toBe('S')
  })

  test('ignores names beyond the second', () => {
    expect(getInitials('Sarah Jane Mitchell')).toBe('SJ')
  })

  test('ignores repeated whitespace between names', () => {
    expect(getInitials('Sarah   Mitchell')).toBe('SM')
  })

  test('ignores surrounding whitespace', () => {
    expect(getInitials('  Sarah Mitchell  ')).toBe('SM')
  })

  test('returns an empty string for an empty name', () => {
    expect(getInitials('')).toBe('')
  })

  test('returns an empty string for whitespace only', () => {
    expect(getInitials('   ')).toBe('')
  })
})
