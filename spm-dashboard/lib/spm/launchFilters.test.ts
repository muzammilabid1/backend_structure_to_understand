import { describe, expect, it } from 'vitest'

import {
  clearLaunchFilter,
  isAnyLaunchFilterActive,
  NO_LAUNCH_FILTERS,
  parseLaunchFilters,
  parseLaunchState,
  setLaunchFilter,
  toLaunchFilter,
} from './launchFilters'

const READING_LOG_NOT_LAUNCHED = { digitalReadingLog: 'notLaunched' } as const

describe('isAnyLaunchFilterActive', () => {
  it('filters nothing by default', () => {
    expect(isAnyLaunchFilterActive(NO_LAUNCH_FILTERS)).toBe(false)
  })

  it('is active once a programme is picked', () => {
    expect(isAnyLaunchFilterActive(READING_LOG_NOT_LAUNCHED)).toBe(true)
  })
})

describe('toLaunchFilter', () => {
  it('reads back the state picked for a programme', () => {
    expect(toLaunchFilter(READING_LOG_NOT_LAUNCHED, 'digitalReadingLog')).toBe('notLaunched')
  })

  it('has no state for an unpicked programme', () => {
    expect(toLaunchFilter(READING_LOG_NOT_LAUNCHED, 'moneySkills')).toBeNull()
  })
})

describe('setLaunchFilter', () => {
  it('picks a state for a programme', () => {
    expect(setLaunchFilter(NO_LAUNCH_FILTERS, 'moneySkills', 'launched')).toEqual({
      moneySkills: 'launched',
    })
  })

  it('replaces the state already picked for that programme', () => {
    expect(setLaunchFilter(READING_LOG_NOT_LAUNCHED, 'digitalReadingLog', 'launched')).toEqual({
      digitalReadingLog: 'launched',
    })
  })

  it('leaves the other programmes alone', () => {
    expect(setLaunchFilter(READING_LOG_NOT_LAUNCHED, 'readyTeddy', 'notSubscribed')).toEqual({
      digitalReadingLog: 'notLaunched',
      readyTeddy: 'notSubscribed',
    })
  })
})

describe('clearLaunchFilter', () => {
  it('drops the programme it is given', () => {
    expect(clearLaunchFilter(READING_LOG_NOT_LAUNCHED, 'digitalReadingLog')).toEqual({})
  })

  it('keeps the programmes it is not given', () => {
    const both = { ...READING_LOG_NOT_LAUNCHED, moneySkills: 'launched' } as const

    expect(clearLaunchFilter(both, 'digitalReadingLog')).toEqual({ moneySkills: 'launched' })
  })
})

describe('parseLaunchState', () => {
  it('reads a launch state', () => {
    expect(parseLaunchState('notSubscribed')).toBe('notSubscribed')
  })

  it('collapses a repeated parameter to its first value', () => {
    expect(parseLaunchState(['launched', 'notLaunched'])).toBe('launched')
  })

  it('refuses a state it does not know', () => {
    expect(parseLaunchState('halfLaunched')).toBeNull()
  })

  it('refuses an empty value', () => {
    expect(parseLaunchState('')).toBeNull()
  })

  it('reads no state from an absent parameter', () => {
    expect(parseLaunchState(undefined)).toBeNull()
  })
})

describe('parseLaunchFilters', () => {
  it('filters nothing when no parameter is given', () => {
    expect(parseLaunchFilters({})).toEqual({ kind: 'ok', filters: {} })
  })

  it('reads a filter for each programme parameter', () => {
    expect(
      parseLaunchFilters({
        digitalReadingLogLaunch: 'notLaunched',
        readyTeddyLaunch: 'notSubscribed',
      })
    ).toEqual({
      kind: 'ok',
      filters: { digitalReadingLog: 'notLaunched', readyTeddy: 'notSubscribed' },
    })
  })

  it('names the unreadable parameter rather than widening the result', () => {
    expect(parseLaunchFilters({ moneySkillsLaunch: 'nearly' })).toEqual({
      kind: 'unreadable',
      param: 'moneySkillsLaunch',
    })
  })

  it('refuses the whole request when one of several parameters is unreadable', () => {
    expect(
      parseLaunchFilters({ digitalReadingLogLaunch: 'launched', moneySkillsLaunch: 'nearly' }).kind
    ).toBe('unreadable')
  })
})
