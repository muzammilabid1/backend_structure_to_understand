import type { ImportStatus } from 'lwp-shared'

/**
 * SPM data derived per school. Mirrors the `SpmSchoolData` GraphQL type served by
 * graphql-provider's `getSchoolsForSpm`, which is the reviewed source of truth for
 * these calculations; the queries in `lib/db/spmSchoolQueries.ts` replicate it against
 * Postgres directly.
 */
export interface SpmEngagementMetric {
  activePercent: number | null
  inactivePercent: number | null
}

export interface SpmClassTargetMetric {
  className: string
  activePercent: number | null
}

export interface SpmSchoolData {
  activatedClassCount: number
  hasUnconfirmedParentDetails: boolean
  pupilsWithoutMisCount: number
  classesWithNoActiveTeacherCount: number
  parentsAwaitingInviteCount: number
  readingLogLaunchDate: string | null
  mathsEnglishLaunchDate: string | null
  moneySkillsLaunchDate: string | null
  readyTeddyLaunchDate: string | null
  readingLogCurrentTerm: SpmEngagementMetric
  readingLogCurrentTermComment: SpmEngagementMetric
  readingLogPreviousTermComment: SpmEngagementMetric
  readingLogTargetByClass: SpmClassTargetMetric[]
  teacherFeedbackInUse: boolean | null
  schoolReadingTarget: number | null
  topicsCurrentTerm: SpmEngagementMetric
  activitiesCurrentTerm: SpmEngagementMetric
  pupilPremiumPercent: number | null
  teacherFeedbackCount: number | null
  topicsSetCount: number | null
}

export interface SchoolForSpm {
  id: string
  schoolName: string
  numOfTotalClassesAllowed: number
  numOfFullProgrammeClassesAllowed: number
  isMoneySkillsAvailable: boolean
  isReadyTeddyAvailable: boolean
  misIntegration: string | null
  importStatus: ImportStatus | null
  lastImportedAt: string | null // The last wonde import attempt, includes success and failures
  hasCurrentAcademicYearWondeData: boolean
  ignoreAcademicYearCheckDuringImport: boolean
  skipAutoWondeImport: boolean
  currentAcademicYearIndex: number | null
  spmData: SpmSchoolData
}

export interface SpmSchoolsOutput {
  results: SchoolForSpm[]
  total: number
  page_total: number
  limit: number
  offset: number
}

export type ProgrammeKey = 'digitalReadingLog' | 'mathsEnglish' | 'moneySkills' | 'readyTeddy'

export const PROGRAMME_KEYS: readonly ProgrammeKey[] = [
  'digitalReadingLog',
  'mathsEnglish',
  'moneySkills',
  'readyTeddy',
]

/**
 * Whether a school has launched one programme. Not-subscribed wins over launched: a school that is
 * not signed up reports `notSubscribed` whatever its feedback says. The table badge, the filter
 * chips and the SQL predicates behind the filter all read this one definition.
 */
export type LaunchState = 'launched' | 'notLaunched' | 'notSubscribed'

export interface SpmProgrammeSubscription {
  key: ProgrammeKey
  subscribedCount: number
  launchedCount: number
}

/** Teacher group-reading entries count as logged at school, so the two counts sum to every reading log. */
export interface SpmReadingLogTotals {
  atHomeCount: number
  atSchoolCount: number
}

export interface SpmSchoolOption {
  id: string
  schoolName: string
}

export interface SpmSummary {
  schools: {
    activeCount: number
    totalCount: number
  }
  classes: {
    activatedCount: number
    contractedCount: number
  }
  programmes: {
    launchedCount: number
    subscriptions: SpmProgrammeSubscription[]
  }
  readingLogs: SpmReadingLogTotals
}

/** A School Partnership Manager, named by the `SPM: ...` school tag that identifies their schools. */
export interface SpmTag {
  id: string
  name: string
  schoolCount: number
}

export interface SpmTagsOutput {
  results: SpmTag[]
}
