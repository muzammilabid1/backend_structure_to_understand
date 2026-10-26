import { type LaunchState, PROGRAMME_KEYS, type ProgrammeKey } from '@/types/spm'

/** One launch state per programme at most, and programmes left out are unfiltered. */
export type LaunchFilters = Partial<Record<ProgrammeKey, LaunchState>>

export const NO_LAUNCH_FILTERS: LaunchFilters = {}

/**
 * The query parameter each programme's filter travels under. One table, read by the client building
 * the URL and by the route parsing it, so the two cannot drift.
 */
export const LAUNCH_FILTER_PARAM: Record<ProgrammeKey, string> = {
  digitalReadingLog: 'digitalReadingLogLaunch',
  mathsEnglish: 'mathsEnglishLaunch',
  moneySkills: 'moneySkillsLaunch',
  readyTeddy: 'readyTeddyLaunch',
}

/** Menu order for the filter chips, and the values the route admits. */
export const LAUNCH_STATES: readonly LaunchState[] = ['launched', 'notLaunched', 'notSubscribed']

const isLaunchState = (value: string): value is LaunchState =>
  LAUNCH_STATES.includes(value as LaunchState)

export const isAnyLaunchFilterActive = (filters: LaunchFilters): boolean =>
  PROGRAMME_KEYS.some((key) => filters[key] !== undefined)

export const toLaunchFilter = (
  filters: LaunchFilters,
  programme: ProgrammeKey
): LaunchState | null => filters[programme] ?? null

export const setLaunchFilter = (
  filters: LaunchFilters,
  programme: ProgrammeKey,
  state: LaunchState
): LaunchFilters => ({ ...filters, [programme]: state })

export const clearLaunchFilter = (filters: LaunchFilters, programme: ProgrammeKey): LaunchFilters =>
  PROGRAMME_KEYS.reduce<LaunchFilters>((kept, key) => {
    const state = filters[key]

    return key === programme || !state ? kept : { ...kept, [key]: state }
  }, {})

/**
 * Mirrors `parseSpmTagId`: collapses a repeated parameter to its first value and admits only the
 * three states, so the route can tell "absent" from "present but unreadable" and fail closed.
 */
export const parseLaunchState = (value: string | string[] | undefined): LaunchState | null => {
  const raw = Array.isArray(value) ? value[0] : value

  return raw && isLaunchState(raw) ? raw : null
}

type LaunchFilterQuery = Partial<Record<string, string | string[]>>

export type LaunchFiltersParseResult =
  | { kind: 'ok'; filters: LaunchFilters }
  | { kind: 'unreadable'; param: string }

/**
 * Absent is no filter; present but unreadable is refused by the caller. A launch filter that
 * silently widened its result set would be worse than one that fails, the same reasoning the SPM
 * tag parameter follows.
 */
export const parseLaunchFilters = (query: LaunchFilterQuery): LaunchFiltersParseResult => {
  const unreadable = PROGRAMME_KEYS.find((key) => {
    const raw = query[LAUNCH_FILTER_PARAM[key]]

    return raw !== undefined && parseLaunchState(raw) === null
  })

  if (unreadable) {
    return { kind: 'unreadable', param: LAUNCH_FILTER_PARAM[unreadable] }
  }

  const filters = PROGRAMME_KEYS.reduce<LaunchFilters>((parsed, key) => {
    const state = parseLaunchState(query[LAUNCH_FILTER_PARAM[key]])

    return state ? { ...parsed, [key]: state } : parsed
  }, {})

  return { kind: 'ok', filters }
}
