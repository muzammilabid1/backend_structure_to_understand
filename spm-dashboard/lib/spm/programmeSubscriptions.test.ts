import { describe, expect, it } from 'vitest'

import { PROGRAMME_COLOURS } from '@/lib/ui/designTokens'

import {
  toProgrammeSubscriptionRows,
  toProgrammeSubscriptionsSubtitle,
} from './programmeSubscriptions'

const summary = {
  schools: { activeCount: 19, totalCount: 62 },
  classes: { activatedCount: 67, contractedCount: 4180 },
  programmes: {
    launchedCount: 8,
    subscriptions: [
      { key: 'digitalReadingLog' as const, subscribedCount: 58, launchedCount: 40 },
      { key: 'mathsEnglish' as const, subscribedCount: 44, launchedCount: 31 },
      { key: 'moneySkills' as const, subscribedCount: 31, launchedCount: 12 },
      { key: 'readyTeddy' as const, subscribedCount: 12, launchedCount: 3 },
    ],
  },
  readingLogs: { atHomeCount: 2989, atSchoolCount: 1832 },
}

describe('toProgrammeSubscriptionRows', () => {
  it('labels each programme for display', () => {
    expect(toProgrammeSubscriptionRows(summary).map((row) => row.label)).toEqual([
      'Digital Reading Log',
      'Maths & English',
      'Money Skills',
      'Ready Teddy',
    ])
  })

  it('keeps the order the summary supplies', () => {
    expect(toProgrammeSubscriptionRows(summary).map((row) => row.key)).toEqual([
      'digitalReadingLog',
      'mathsEnglish',
      'moneySkills',
      'readyTeddy',
    ])
  })

  it('takes the bar colour from the programme token', () => {
    expect(toProgrammeSubscriptionRows(summary)[0].colour).toBe(
      PROGRAMME_COLOURS.digitalReadingLog.line
    )
  })

  it('measures each programme against the estate school count', () => {
    expect(toProgrammeSubscriptionRows(summary)[1].schoolCount).toBe(62)
  })

  it('fills the bar by the share of schools subscribed', () => {
    expect(toProgrammeSubscriptionRows(summary)[2].subscribedFillPercent).toBeCloseTo(50)
  })

  it('surfaces the launched count for each programme', () => {
    expect(toProgrammeSubscriptionRows(summary).map((row) => row.launchedCount)).toEqual([
      40, 31, 12, 3,
    ])
  })

  it('fills the launched segment by the share of schools launched, not of those subscribed', () => {
    expect(toProgrammeSubscriptionRows(summary)[1].launchedFillPercent).toBeCloseTo(50)
  })

  it('fills the bar completely when every school is subscribed', () => {
    const everySchool = {
      ...summary,
      programmes: {
        ...summary.programmes,
        subscriptions: [
          { key: 'digitalReadingLog' as const, subscribedCount: 62, launchedCount: 62 },
        ],
      },
    }

    expect(toProgrammeSubscriptionRows(everySchool)[0].subscribedFillPercent).toBe(100)
  })

  it('leaves the bar empty when the estate has no schools', () => {
    const noSchools = { ...summary, schools: { activeCount: 0, totalCount: 0 } }

    expect(toProgrammeSubscriptionRows(noSchools)[0].subscribedFillPercent).toBe(0)
  })

  it('leaves the launched segment empty when the estate has no schools', () => {
    const noSchools = { ...summary, schools: { activeCount: 0, totalCount: 0 } }

    expect(toProgrammeSubscriptionRows(noSchools)[0].launchedFillPercent).toBe(0)
  })
})

describe('toProgrammeSubscriptionsSubtitle', () => {
  it('names the estate the bars are measured against', () => {
    expect(toProgrammeSubscriptionsSubtitle(summary)).toBe(
      'Signed up and launched, each of 62 live schools'
    )
  })

  it('claims no estate count until the summary loads', () => {
    expect(toProgrammeSubscriptionsSubtitle(undefined)).toBe('Signed up and launched per programme')
  })
})
