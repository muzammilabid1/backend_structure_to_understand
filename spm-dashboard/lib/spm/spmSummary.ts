import type {
  ProgrammeKey,
  SpmProgrammeSubscription,
  SpmReadingLogTotals,
  SpmSummary,
} from '@/types/spm'

export type SpmSchoolTotalsRow = {
  schoolCount: number
  activeSchoolCount: number
  activatedClassCount: number
  contractedClassCount: number
  digitalReadingLogSubscribedCount: number
  mathsEnglishSubscribedCount: number
  moneySkillsSubscribedCount: number
  readyTeddySubscribedCount: number
  digitalReadingLogLaunchedCount: number
  mathsEnglishLaunchedCount: number
  moneySkillsLaunchedCount: number
  readyTeddyLaunchedCount: number
  launchedProgrammeCount: number
}

type ProgrammeCountFields = {
  key: ProgrammeKey
  subscribedField: keyof SpmSchoolTotalsRow
  launchedField: keyof SpmSchoolTotalsRow
}

const PROGRAMME_COUNT_FIELDS = [
  {
    key: 'digitalReadingLog',
    subscribedField: 'digitalReadingLogSubscribedCount',
    launchedField: 'digitalReadingLogLaunchedCount',
  },
  {
    key: 'mathsEnglish',
    subscribedField: 'mathsEnglishSubscribedCount',
    launchedField: 'mathsEnglishLaunchedCount',
  },
  {
    key: 'moneySkills',
    subscribedField: 'moneySkillsSubscribedCount',
    launchedField: 'moneySkillsLaunchedCount',
  },
  {
    key: 'readyTeddy',
    subscribedField: 'readyTeddySubscribedCount',
    launchedField: 'readyTeddyLaunchedCount',
  },
] as const satisfies readonly ProgrammeCountFields[]

const toProgrammeSubscriptions = (
  schoolTotals: SpmSchoolTotalsRow | undefined
): SpmProgrammeSubscription[] =>
  PROGRAMME_COUNT_FIELDS.map(({ key, subscribedField, launchedField }) => ({
    key,
    subscribedCount: schoolTotals?.[subscribedField] ?? 0,
    launchedCount: schoolTotals?.[launchedField] ?? 0,
  }))

export const toSpmSummary = (
  schoolTotals: SpmSchoolTotalsRow | undefined,
  readingLogTotals: SpmReadingLogTotals | undefined
): SpmSummary => ({
  schools: {
    activeCount: schoolTotals?.activeSchoolCount ?? 0,
    totalCount: schoolTotals?.schoolCount ?? 0,
  },
  classes: {
    activatedCount: schoolTotals?.activatedClassCount ?? 0,
    contractedCount: schoolTotals?.contractedClassCount ?? 0,
  },
  programmes: {
    launchedCount: schoolTotals?.launchedProgrammeCount ?? 0,
    subscriptions: toProgrammeSubscriptions(schoolTotals),
  },
  readingLogs: {
    atHomeCount: readingLogTotals?.atHomeCount ?? 0,
    atSchoolCount: readingLogTotals?.atSchoolCount ?? 0,
  },
})
