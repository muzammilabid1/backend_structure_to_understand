import { describe, expect, it } from 'vitest'

import { toSpmSummary } from './spmSummary'

const schoolTotalsRow = {
  schoolCount: 40,
  activeSchoolCount: 12,
  activatedClassCount: 96,
  contractedClassCount: 150,
  digitalReadingLogSubscribedCount: 20,
  mathsEnglishSubscribedCount: 8,
  moneySkillsSubscribedCount: 3,
  readyTeddySubscribedCount: 5,
  digitalReadingLogLaunchedCount: 14,
  mathsEnglishLaunchedCount: 6,
  moneySkillsLaunchedCount: 1,
  readyTeddyLaunchedCount: 2,
  launchedProgrammeCount: 8,
}

const readingLogTotalsRow = {
  atHomeCount: 84210,
  atSchoolCount: 12455,
}

describe('toSpmSummary', () => {
  it('maps school totals onto the schools group', () => {
    expect(toSpmSummary(schoolTotalsRow, readingLogTotalsRow).schools).toEqual({
      activeCount: 12,
      totalCount: 40,
    })
  })

  it('maps class totals onto the classes group', () => {
    expect(toSpmSummary(schoolTotalsRow, readingLogTotalsRow).classes).toEqual({
      activatedCount: 96,
      contractedCount: 150,
    })
  })

  it('maps the launched programme total onto the programmes group', () => {
    expect(toSpmSummary(schoolTotalsRow, readingLogTotalsRow).programmes.launchedCount).toBe(8)
  })

  it('maps each programme subscription count onto the programmes group', () => {
    expect(
      toSpmSummary(schoolTotalsRow, readingLogTotalsRow).programmes.subscriptions.map(
        ({ key, subscribedCount }) => ({ key, subscribedCount })
      )
    ).toEqual([
      { key: 'digitalReadingLog', subscribedCount: 20 },
      { key: 'mathsEnglish', subscribedCount: 8 },
      { key: 'moneySkills', subscribedCount: 3 },
      { key: 'readyTeddy', subscribedCount: 5 },
    ])
  })

  it('maps each programme launched count onto the programmes group', () => {
    expect(
      toSpmSummary(schoolTotalsRow, readingLogTotalsRow).programmes.subscriptions.map(
        ({ key, launchedCount }) => ({ key, launchedCount })
      )
    ).toEqual([
      { key: 'digitalReadingLog', launchedCount: 14 },
      { key: 'mathsEnglish', launchedCount: 6 },
      { key: 'moneySkills', launchedCount: 1 },
      { key: 'readyTeddy', launchedCount: 2 },
    ])
  })

  it('maps reading log totals onto the reading logs group', () => {
    expect(toSpmSummary(schoolTotalsRow, readingLogTotalsRow).readingLogs).toEqual({
      atHomeCount: 84210,
      atSchoolCount: 12455,
    })
  })

  it('returns zero counts when the totals queries matched no rows', () => {
    expect(toSpmSummary(undefined, undefined)).toEqual({
      schools: { activeCount: 0, totalCount: 0 },
      classes: { activatedCount: 0, contractedCount: 0 },
      programmes: {
        launchedCount: 0,
        subscriptions: [
          { key: 'digitalReadingLog', subscribedCount: 0, launchedCount: 0 },
          { key: 'mathsEnglish', subscribedCount: 0, launchedCount: 0 },
          { key: 'moneySkills', subscribedCount: 0, launchedCount: 0 },
          { key: 'readyTeddy', subscribedCount: 0, launchedCount: 0 },
        ],
      },
      readingLogs: { atHomeCount: 0, atSchoolCount: 0 },
    })
  })

  it('keeps an active count of zero distinct from a missing row', () => {
    expect(
      toSpmSummary({ ...schoolTotalsRow, activeSchoolCount: 0 }, readingLogTotalsRow).schools
        .totalCount
    ).toBe(40)
  })

  it('keeps school totals when only the reading log query matched no rows', () => {
    expect(toSpmSummary(schoolTotalsRow, undefined).schools.totalCount).toBe(40)
  })
})
