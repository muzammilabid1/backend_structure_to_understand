import { describe, expect, it } from 'vitest'

import { STATUS_COLOURS, SURFACE_COLOURS } from '@/lib/ui/designTokens'

import { toReadingPlaceChart } from './readingPlaceChart'

const readingLogs = { atHomeCount: 2989, atSchoolCount: 1832 }

describe('toReadingPlaceChart', () => {
  it('totals the two places', () => {
    expect(toReadingPlaceChart(readingLogs).totalCount).toBe(4821)
  })

  it('leads with the at school segment', () => {
    expect(toReadingPlaceChart(readingLogs).segments[0]).toEqual({
      label: 'At school',
      count: 1832,
      percent: 38,
      colour: STATUS_COLOURS.warning,
    })
  })

  it('follows with the at home segment', () => {
    expect(toReadingPlaceChart(readingLogs).segments[1]).toEqual({
      label: 'At home',
      count: 2989,
      percent: 62,
      colour: SURFACE_COLOURS.accentTint,
    })
  })

  it('keeps the two shares on 100% when the at school share rounds up', () => {
    const percents = toReadingPlaceChart({ atSchoolCount: 1, atHomeCount: 2 }).segments.map(
      (segment) => segment.percent
    )

    expect(percents[0] + percents[1]).toBe(100)
  })

  it('keeps the two shares on 100% when the at school share rounds down', () => {
    const percents = toReadingPlaceChart({ atSchoolCount: 2, atHomeCount: 1 }).segments.map(
      (segment) => segment.percent
    )

    expect(percents[0] + percents[1]).toBe(100)
  })

  it('reports no share for either place when nothing has been logged', () => {
    expect(
      toReadingPlaceChart({ atHomeCount: 0, atSchoolCount: 0 }).segments.map(
        (segment) => segment.percent
      )
    ).toEqual([0, 0])
  })

  it('gives the whole share to at home when no reading is logged in school', () => {
    expect(toReadingPlaceChart({ atHomeCount: 40, atSchoolCount: 0 }).segments[1].percent).toBe(100)
  })
})
