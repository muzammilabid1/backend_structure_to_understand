import { describe, expect, it } from 'vitest'

import { formatCount } from './formatNumber'

describe('formatCount', () => {
  it('groups thousands with a comma', () => {
    expect(formatCount(4821)).toBe('4,821')
  })

  it('leaves counts below a thousand ungrouped', () => {
    expect(formatCount(821)).toBe('821')
  })

  it('groups every thousand in a large count', () => {
    expect(formatCount(1234567)).toBe('1,234,567')
  })

  it('formats a zero count', () => {
    expect(formatCount(0)).toBe('0')
  })
})
