import { describe, expect, it } from 'vitest'

import { toEngagementMetric, toIsoStringOrNull } from './spmSchoolMapping'

describe('toEngagementMetric', () => {
  it('carries the active share it was given', () => {
    expect(toEngagementMetric(40).activePercent).toBe(40)
  })

  it('derives the inactive share as the complement', () => {
    expect(toEngagementMetric(40).inactivePercent).toBe(60)
  })

  it('reports no active share when the query matched no row', () => {
    expect(toEngagementMetric(undefined).activePercent).toBeNull()
  })

  it('reports no inactive share when the query matched no row', () => {
    expect(toEngagementMetric(undefined).inactivePercent).toBeNull()
  })

  it('reports no shares when the row carries no percentage', () => {
    expect(toEngagementMetric(null)).toEqual({ activePercent: null, inactivePercent: null })
  })

  it('keeps an active share of zero distinct from a missing one', () => {
    expect(toEngagementMetric(0)).toEqual({ activePercent: 0, inactivePercent: 100 })
  })

  it('gives the whole share to inactive when every pupil is engaged', () => {
    expect(toEngagementMetric(100)).toEqual({ activePercent: 100, inactivePercent: 0 })
  })
})

describe('toIsoStringOrNull', () => {
  it('serialises a date as an ISO string', () => {
    expect(toIsoStringOrNull(new Date('2026-08-01T09:30:00.000Z'))).toBe('2026-08-01T09:30:00.000Z')
  })

  it('reports no date when the column is null', () => {
    expect(toIsoStringOrNull(null)).toBeNull()
  })

  it('reports no date when the query matched no row', () => {
    expect(toIsoStringOrNull(undefined)).toBeNull()
  })
})
