import { describe, expect, it } from 'vitest'

import { toSummaryMetricCards } from './spmSummaryMetrics'

const summary = {
  schools: { activeCount: 19, totalCount: 67 },
  classes: { activatedCount: 67, contractedCount: 4180 },
  programmes: {
    launchedCount: 8,
    subscriptions: [
      { key: 'digitalReadingLog' as const, subscribedCount: 20, launchedCount: 5 },
      { key: 'mathsEnglish' as const, subscribedCount: 8, launchedCount: 2 },
      { key: 'moneySkills' as const, subscribedCount: 3, launchedCount: 1 },
    ],
  },
  readingLogs: { atHomeCount: 84210, atSchoolCount: 12455 },
}

describe('toSummaryMetricCards', () => {
  it('captions the schools card with the estate total', () => {
    expect(toSummaryMetricCards(summary)[0].metric).toEqual({
      value: 19,
      caption: 'of 67 schools',
    })
  })

  it('captions the classes card with the contracted total', () => {
    expect(toSummaryMetricCards(summary)[1].metric).toEqual({
      value: 67,
      caption: 'of 4180 contracted',
    })
  })

  it('captions the programmes card with the subscribed total', () => {
    expect(toSummaryMetricCards(summary)[2].metric).toEqual({
      value: 8,
      caption: 'of 31 subscribed',
    })
  })

  it('leaves every metric undefined until the summary loads', () => {
    expect(toSummaryMetricCards(undefined).every((card) => card.metric === undefined)).toBe(true)
  })

  it('titles a card for every wired metric', () => {
    expect(toSummaryMetricCards(summary).map((card) => card.title)).toEqual([
      'Schools active',
      'Classes activated',
      'Programmes launched',
    ])
  })
})
