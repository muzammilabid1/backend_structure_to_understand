import { formatDayMonthYear } from '@/lib/helpers/formatDate'
import { type SchoolIssue, toSchoolIssues } from '@/lib/spm/schoolIssues'
import { type BadgeColour, LAUNCH_BADGE_COLOURS, PROGRAMME_COLOURS } from '@/lib/ui/designTokens'
import type { LaunchState, ProgrammeKey, SchoolForSpm } from '@/types/spm'

export type ClassActivation = 'complete' | 'partial' | 'none'

export type ProgrammePill = {
  key: ProgrammeKey
  abbreviation: string
  colour: BadgeColour
}

export type LaunchBadge = {
  state: LaunchState
  label: string
  colour: BadgeColour
  launchedOn: LaunchedOn | null
}

export type LaunchedOn = {
  iso: string
  label: string
}

export type SchoolTableRow = {
  id: string
  schoolName: string
  activatedClassCount: number
  contractedClassCount: number
  classActivation: ClassActivation | null
  programmes: ProgrammePill[]
  launches: LaunchBadge[]
  issues: SchoolIssue[]
}

type TableProgramme = {
  key: ProgrammeKey
  abbreviation: string
  launchHeading: string
  isSubscribed: (school: SchoolForSpm) => boolean
  toLaunchDate: (school: SchoolForSpm) => string | null
}

const TABLE_PROGRAMMES: TableProgramme[] = [
  {
    key: 'digitalReadingLog',
    abbreviation: 'DRL',
    launchHeading: 'DRL launch',
    isSubscribed: (school) => school.numOfTotalClassesAllowed > 0,
    toLaunchDate: (school) => school.spmData.readingLogLaunchDate,
  },
  {
    key: 'mathsEnglish',
    abbreviation: 'M&E',
    launchHeading: 'M&E launch',
    isSubscribed: (school) => school.numOfFullProgrammeClassesAllowed > 0,
    toLaunchDate: (school) => school.spmData.mathsEnglishLaunchDate,
  },
  {
    key: 'moneySkills',
    abbreviation: 'MS',
    launchHeading: 'MS launch',
    isSubscribed: (school) => school.isMoneySkillsAvailable,
    toLaunchDate: (school) => school.spmData.moneySkillsLaunchDate,
  },
  {
    key: 'readyTeddy',
    abbreviation: 'RT',
    launchHeading: 'RT launch',
    isSubscribed: (school) => school.isReadyTeddyAvailable,
    toLaunchDate: (school) => school.spmData.readyTeddyLaunchDate,
  },
]

export const LAUNCH_HEADINGS = TABLE_PROGRAMMES.map(({ launchHeading }) => launchHeading)

/** The filter chips label themselves from the same table as the columns they narrow. */
export const LAUNCH_FILTER_PROGRAMMES = TABLE_PROGRAMMES.map(({ key, abbreviation }) => ({
  key,
  abbreviation,
}))

export const LAUNCH_LABELS: Record<LaunchState, string> = {
  launched: 'Launched',
  notLaunched: 'Not launched',
  notSubscribed: 'Not subscribed',
}

const toClassActivation = (school: SchoolForSpm): ClassActivation | null => {
  const contractedClassCount = school.numOfTotalClassesAllowed
  if (contractedClassCount === 0) {
    return null
  }

  const activatedClassCount = school.spmData.activatedClassCount
  if (activatedClassCount === 0) {
    return 'none'
  }

  return activatedClassCount >= contractedClassCount ? 'complete' : 'partial'
}

const toLaunchState = (school: SchoolForSpm, programme: TableProgramme): LaunchState => {
  if (!programme.isSubscribed(school)) {
    return 'notSubscribed'
  }

  return programme.toLaunchDate(school) ? 'launched' : 'notLaunched'
}

const toLaunchedOn = (launchDate: string | null, state: LaunchState): LaunchedOn | null =>
  state === 'launched' && launchDate
    ? { iso: launchDate, label: formatDayMonthYear(launchDate) }
    : null

const toLaunchBadge = (school: SchoolForSpm, programme: TableProgramme): LaunchBadge => {
  const state = toLaunchState(school, programme)

  return {
    state,
    label: LAUNCH_LABELS[state],
    colour: LAUNCH_BADGE_COLOURS[state],
    launchedOn: toLaunchedOn(programme.toLaunchDate(school), state),
  }
}

const toProgrammePill = ({ key, abbreviation }: TableProgramme): ProgrammePill => ({
  key,
  abbreviation,
  colour: PROGRAMME_COLOURS[key].badge,
})

export const toSchoolTableRow = (school: SchoolForSpm): SchoolTableRow => ({
  id: school.id,
  schoolName: school.schoolName,
  activatedClassCount: school.spmData.activatedClassCount,
  contractedClassCount: school.numOfTotalClassesAllowed,
  classActivation: toClassActivation(school),
  programmes: TABLE_PROGRAMMES.filter((programme) => programme.isSubscribed(school)).map(
    toProgrammePill
  ),
  launches: TABLE_PROGRAMMES.map((programme) => toLaunchBadge(school, programme)),
  issues: toSchoolIssues(school),
})
