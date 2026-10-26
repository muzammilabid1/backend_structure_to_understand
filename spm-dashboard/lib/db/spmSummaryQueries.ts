import { sql } from 'kysely'

import { db } from '@/lib/db/database'
import { dbViews, getReadingLogTotalsFromView } from '@/lib/db/spmViewQueries'
import { type SpmSchoolTotalsRow, toSpmSummary } from '@/lib/spm/spmSummary'
import type { SpmSummary } from '@/types/spm'

/**
 * The estate counts every live school, so `lwp_school` is read live and the nightly metrics view is
 * joined onto it: a school created since the last refresh is counted as unlaunched rather than
 * dropped from the totals.
 */
const selectLiveSchoolsWithMetrics = () =>
  dbViews
    .selectFrom('lwp_school as ls')
    .leftJoin('lwp_view_spm_school_metrics as m', 'm.schoolId', 'ls.id')
    .where('ls.inactive', '=', false)
    .where('ls.isTestSchool', '=', false)
    .select((eb) => [
      'ls.numOfTotalClassesAllowed as contractedClassCount',
      eb.fn.coalesce('m.activatedClassCount', sql<number>`0`).as('activatedClassCount'),
      eb('ls.numOfTotalClassesAllowed', '>', 0).as('isReadingLogSubscribed'),
      eb('ls.numOfFullProgrammeClassesAllowed', '>', 0).as('isMathsEnglishSubscribed'),
      eb.fn
        .coalesce('ls.isMoneySkillsAvailable', sql<boolean>`false`)
        .as('isMoneySkillsSubscribed'),
      'ls.isReadyTeddyAvailable as isReadyTeddySubscribed',
      eb('m.readingLogLaunchDate', 'is not', null).as('isReadingLogLaunched'),
      eb('m.mathsEnglishLaunchDate', 'is not', null).as('isMathsEnglishLaunched'),
      eb('m.moneySkillsLaunchDate', 'is not', null).as('isMoneySkillsLaunched'),
      eb('m.readyTeddyLaunchDate', 'is not', null).as('isReadyTeddyLaunched'),
    ])

const READING_LOG_FLAGS = {
  subscribed: 'isReadingLogSubscribed',
  launched: 'isReadingLogLaunched',
} as const

const MATHS_ENGLISH_FLAGS = {
  subscribed: 'isMathsEnglishSubscribed',
  launched: 'isMathsEnglishLaunched',
} as const

const MONEY_SKILLS_FLAGS = {
  subscribed: 'isMoneySkillsSubscribed',
  launched: 'isMoneySkillsLaunched',
} as const

const READY_TEDDY_FLAGS = {
  subscribed: 'isReadyTeddySubscribed',
  launched: 'isReadyTeddyLaunched',
} as const

const PROGRAMME_FLAG_PAIRS = [
  READING_LOG_FLAGS,
  MATHS_ENGLISH_FLAGS,
  MONEY_SKILLS_FLAGS,
  READY_TEDDY_FLAGS,
] as const

type ProgrammeFlagPair = (typeof PROGRAMME_FLAG_PAIRS)[number]

// Postgres count() and sum() widen to bigint and numeric, which node-pg hands back as strings.
async function getSchoolTotals(): Promise<SpmSchoolTotalsRow | undefined> {
  return db
    .selectFrom(selectLiveSchoolsWithMetrics().as('liveSchools'))
    .select((eb) => {
      const countLaunchedSchools = ({ subscribed, launched }: ProgrammeFlagPair) =>
        eb.fn
          .countAll()
          .filterWhere((filterEb) =>
            filterEb.and([filterEb(subscribed, '=', true), filterEb(launched, '=', true)])
          )

      const schoolCount = sql<number>`${eb.fn.countAll()}::int`.as('schoolCount')

      const activeSchoolCount = sql<number>`${eb.fn.countAll().filterWhere('activatedClassCount', '>', 0)}::int`.as(
        'activeSchoolCount'
      )

      const activatedClassCount = sql<number>`coalesce(${eb.fn.sum('activatedClassCount')}, 0)::int`.as(
        'activatedClassCount'
      )

      const contractedClassCount = sql<number>`coalesce(${eb.fn.sum('contractedClassCount')}, 0)::int`.as(
        'contractedClassCount'
      )

      const digitalReadingLogSubscribedCount = sql<number>`${eb.fn
        .countAll()
        .filterWhere('isReadingLogSubscribed', '=', true)}::int`.as('digitalReadingLogSubscribedCount')

      const mathsEnglishSubscribedCount = sql<number>`${eb.fn
        .countAll()
        .filterWhere('isMathsEnglishSubscribed', '=', true)}::int`.as('mathsEnglishSubscribedCount')

      const moneySkillsSubscribedCount = sql<number>`${eb.fn
        .countAll()
        .filterWhere('isMoneySkillsSubscribed', '=', true)}::int`.as('moneySkillsSubscribedCount')

      const readyTeddySubscribedCount = sql<number>`${eb.fn
        .countAll()
        .filterWhere('isReadyTeddySubscribed', '=', true)}::int`.as('readyTeddySubscribedCount')

      const digitalReadingLogLaunchedCount = sql<number>`${countLaunchedSchools(
        READING_LOG_FLAGS
      )}::int`.as('digitalReadingLogLaunchedCount')

      const mathsEnglishLaunchedCount = sql<number>`${countLaunchedSchools(
        MATHS_ENGLISH_FLAGS
      )}::int`.as('mathsEnglishLaunchedCount')

      const moneySkillsLaunchedCount = sql<number>`${countLaunchedSchools(
        MONEY_SKILLS_FLAGS
      )}::int`.as('moneySkillsLaunchedCount')

      const readyTeddyLaunchedCount = sql<number>`${countLaunchedSchools(
        READY_TEDDY_FLAGS
      )}::int`.as('readyTeddyLaunchedCount')

      const launchedProgrammeCount = sql<number>`(${sql.join(
        PROGRAMME_FLAG_PAIRS.map(countLaunchedSchools),
        sql` + `
      )})::int`.as('launchedProgrammeCount')

      return [
        schoolCount,
        activeSchoolCount,
        activatedClassCount,
        contractedClassCount,
        digitalReadingLogSubscribedCount,
        mathsEnglishSubscribedCount,
        moneySkillsSubscribedCount,
        readyTeddySubscribedCount,
        digitalReadingLogLaunchedCount,
        mathsEnglishLaunchedCount,
        moneySkillsLaunchedCount,
        readyTeddyLaunchedCount,
        launchedProgrammeCount,
      ]
    })
    .executeTakeFirst()
}

export async function getSpmSummary(): Promise<SpmSummary> {
  const [schoolTotals, readingLogTotals] = await Promise.all([
    getSchoolTotals(),
    getReadingLogTotalsFromView(null),
  ])

  return toSpmSummary(schoolTotals, readingLogTotals)
}
