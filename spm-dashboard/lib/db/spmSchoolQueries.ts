import type { Schema } from '@lwp/postgres-client'
import {
  type ExpressionBuilder,
  type ExpressionWrapper,
  type NotNull,
  sql,
  type SqlBool,
} from 'kysely'
import { PupilParentStatus, UserStatus } from 'lwp-shared'

import { db } from '@/lib/db/database'
import {
  getSpmClassTargetRows,
  getSpmSchoolMetricRows,
  selectLaunchedSchoolIds,
  toSpmSchoolMetricRows,
} from '@/lib/db/spmViewQueries'
import type { LaunchFilters } from '@/lib/spm/launchFilters'
import {
  type ActiveSchoolRow,
  type LiveSchoolMetricRows,
  type ParentsAwaitingInviteRow,
  type PupilsWithoutMisRow,
  type SchoolId,
  toSchoolsForSpm,
} from '@/lib/spm/spmSchools'
import {
  type LaunchState,
  PROGRAMME_KEYS,
  type ProgrammeKey,
  type SpmSchoolOption,
  type SpmSchoolsOutput,
} from '@/types/spm'

/**
 * A school is live to the dashboard when it is neither inactive nor a test school
 */
export const selectLiveSchools = () =>
  db
    .selectFrom('lwp_school as s')
    .where('s.inactive', '=', false)
    .where('s.isTestSchool', '=', false)

export async function getSpmSchoolOptions(): Promise<SpmSchoolOption[]> {
  return selectLiveSchools().select(['s.id', 's.schoolName']).orderBy('s.schoolName').execute()
}

// Matches graphql-provider's DEFAULT_SPM_PAGE_LIMIT.
export const DEFAULT_PAGE_LIMIT = 25

type SpmPagination = { limit: number; offset: number }

/** A null `tagId` is no SPM filter at all, which is every live school. */
export type SpmSchoolsQuery = SpmPagination & {
  tagId: string | null
  launchFilters: LaunchFilters
}

type SchoolsFrom = Schema.DB & { s: Schema.LwpSchool }

type SchoolPredicate = (
  eb: ExpressionBuilder<SchoolsFrom, 's'>
) => ExpressionWrapper<SchoolsFrom, 's', SqlBool>

/**
 * A correlated EXISTS rather than a join to `lwp_school_static_tags`: a school may carry the tag
 * only once, but a join still fans the row out through the planner's row estimates, and the page
 * query's LIMIT/OFFSET must count schools, not tag rows. `tagId` is bound as a parameter, so a
 * caller-supplied value never reaches Postgres as SQL text.
 */
const isTaggedSchool =
  (tagId: string): SchoolPredicate =>
  (eb) =>
    eb.exists(
      eb
        .selectFrom('lwp_school_static_tags as lst')
        .whereRef('lst.schoolId', '=', 's.id')
        .where('lst.tagId', '=', tagId)
        .select('lst.id')
    )

/**
 * `is true` rather than a coalesce for the nullable availability flags: a null reads as false, which
 * is what the mapper's `?? false` does, and it keeps `eb.not(...)` correct for a null.
 *
 * Launched is read from the nightly materialised view rather than aggregated live, so the filter
 * agrees with the launch badge, which reads the same launch dates.
 */
const PROGRAMME_LAUNCH_PREDICATES: Record<
  ProgrammeKey,
  { isSubscribed: SchoolPredicate; hasLaunched: SchoolPredicate }
> = {
  digitalReadingLog: {
    isSubscribed: (eb) => eb('s.numOfTotalClassesAllowed', '>', 0),
    hasLaunched: (eb) => eb('s.id', 'in', selectLaunchedSchoolIds('digitalReadingLog')),
  },
  mathsEnglish: {
    isSubscribed: (eb) => eb('s.numOfFullProgrammeClassesAllowed', '>', 0),
    hasLaunched: (eb) => eb('s.id', 'in', selectLaunchedSchoolIds('mathsEnglish')),
  },
  moneySkills: {
    isSubscribed: (eb) => eb('s.isMoneySkillsAvailable', 'is', true),
    hasLaunched: (eb) => eb('s.id', 'in', selectLaunchedSchoolIds('moneySkills')),
  },
  readyTeddy: {
    isSubscribed: (eb) => eb('s.isReadyTeddyAvailable', 'is', true),
    hasLaunched: (eb) => eb('s.id', 'in', selectLaunchedSchoolIds('readyTeddy')),
  },
}

/**
 * The three states partition the live schools exactly as the table badge does
 * (`lib/spm/schoolTableRows.ts`), where not-subscribed wins over launched: a school that is not
 * signed up is never reported as launched, whatever its feedback says.
 */
const toLaunchStatePredicate = (programme: ProgrammeKey, state: LaunchState): SchoolPredicate => {
  const { isSubscribed, hasLaunched } = PROGRAMME_LAUNCH_PREDICATES[programme]

  switch (state) {
    case 'launched':
      return (eb) => eb.and([isSubscribed(eb), hasLaunched(eb)])
    case 'notLaunched':
      return (eb) => eb.and([isSubscribed(eb), eb.not(hasLaunched(eb))])
    case 'notSubscribed':
      return (eb) => eb.not(isSubscribed(eb))
  }
}

type SpmSchoolFilters = Pick<SpmSchoolsQuery, 'tagId' | 'launchFilters'>

const toSchoolPredicates = ({ tagId, launchFilters }: SpmSchoolFilters): SchoolPredicate[] => [
  ...(tagId === null ? [] : [isTaggedSchool(tagId)]),
  ...PROGRAMME_KEYS.flatMap((programme) => {
    const state = launchFilters[programme]

    return state === undefined ? [] : [toLaunchStatePredicate(programme, state)]
  }),
]

async function getActiveSchoolsPage({
  limit = DEFAULT_PAGE_LIMIT,
  offset = 0,
  tagId,
  launchFilters,
}: SpmSchoolsQuery): Promise<ActiveSchoolRow[]> {
  const liveSchools = selectLiveSchools().select([
    's.id',
    's.schoolName',
    's.numOfTotalClassesAllowed',
    's.numOfFullProgrammeClassesAllowed',
    's.isMoneySkillsAvailable',
    's.isReadyTeddyAvailable',
    's.misIntegration',
    's.importStatus',
    's.lastImportedAt',
    's.hasCurrentAcademicYearWondeData',
    's.ignoreAcademicYearCheckDuringImport',
    's.skipAutoWondeImport',
    's.curentPeriodIndex',
  ])

  const filtered = toSchoolPredicates({ tagId, launchFilters }).reduce(
    (query, predicate) => query.where(predicate),
    liveSchools
  )

  return filtered.orderBy('s.schoolName').limit(limit).offset(offset).execute()
}

async function getActiveSchoolsTotal(filters: SpmSchoolFilters): Promise<number> {
  const liveSchools = selectLiveSchools().select(sql<number>`count(*)::int`.as('total'))

  const filtered = toSchoolPredicates(filters).reduce(
    (query, predicate) => query.where(predicate),
    liveSchools
  )

  const row = await filtered.executeTakeFirst()

  return row?.total ?? 0
}

/**
 * Replicates the platform's own pupilsWithoutMISCount (graphql-provider
 * pupil.service.ts schoolPupilsWithoutMISBaseQuery): a pupil at a school connected to an MIS who
 * carries no imported student of their own never picks up that school's MIS changes.
 */
async function getPupilsWithoutMisCounts(schoolIds: SchoolId[]): Promise<PupilsWithoutMisRow[]> {
  return db
    .selectFrom('lwp_pupil as lp')
    .innerJoin('lwp_school as ls', 'ls.id', 'lp.schoolId')
    .where('lp.schoolId', 'in', schoolIds)
    .where('ls.importedSchoolId', 'is not', null)
    .where('lp.importedStudentId', 'is', null)
    .groupBy('ls.id')
    .select((eb) => [
      'ls.id as schoolId',
      sql<number>`${eb.fn.count('lp.id')}::int`.as('pupilsWithoutMisCount'),
    ])
    .execute()
}

// A parent in one of these states can still be reached; the rest have gone from the platform.
const INVITABLE_PARENT_STATUSES = [UserStatus.ACTIVE, UserStatus.INVITED, UserStatus.ACCOUNTLESS]

/**
 * Replicates the provider's own awaiting-invite predicate, which getParentsContext
 * (pupil.service.ts:2819) and getAwaitingInvitedPupils (pupil.service.ts:377) state identically: the
 * school has set the parent up but has never sent their invitation. Counted per pupil-parent link,
 * because that is what an invitation is sent against; a parent of two pupils at the school is two
 * invitations.
 */
async function getParentsAwaitingInviteCounts(
  schoolIds: SchoolId[]
): Promise<ParentsAwaitingInviteRow[]> {
  return db
    .selectFrom('lwp_pupil as lp')
    .innerJoin('lwp_pupil_parent as lpp', 'lpp.pupilId', 'lp.id')
    .innerJoin('lwp_user as lu', 'lu.id', 'lpp.parentId')
    .where('lp.schoolId', 'in', schoolIds)
    .where('lpp.status', '=', PupilParentStatus.INVITED)
    .where('lpp.lastInvitationEmailSent', 'is', null)
    .where('lu.userStatus', 'in', INVITABLE_PARENT_STATUSES)
    .groupBy('lp.schoolId')
    .select((eb) => [
      'lp.schoolId as schoolId',
      sql<number>`${eb.fn.count('lpp.id')}::int`.as('parentsAwaitingInviteCount'),
    ])
    .$narrowType<{ schoolId: NotNull }>()
    .execute()
}

async function getLiveSchoolMetricRows(schoolIds: SchoolId[]): Promise<LiveSchoolMetricRows> {
  const [pupilsWithoutMis, parentsAwaitingInvite] = await Promise.all([
    getPupilsWithoutMisCounts(schoolIds),
    getParentsAwaitingInviteCounts(schoolIds),
  ])

  return { pupilsWithoutMis, parentsAwaitingInvite }
}

/**
 * Identity, paging and the tag filter read `lwp_school` live; every metric outside
 * `LiveSchoolMetricRows` comes from the nightly materialised views, so a school created since the
 * last refresh is listed with no metrics rather than missing from the page.
 */
export async function getSchoolsForSpm({
  limit,
  offset,
  tagId,
  launchFilters,
}: SpmSchoolsQuery): Promise<SpmSchoolsOutput> {
  const [schools, total] = await Promise.all([
    getActiveSchoolsPage({ limit, offset, tagId, launchFilters }),
    getActiveSchoolsTotal({ tagId, launchFilters }),
  ])

  if (!schools.length) {
    return { results: [], total, page_total: 0, limit, offset }
  }

  const schoolIds = schools.map((school) => school.id)

  const [metricRows, classTargetRows, liveMetricRows] = await Promise.all([
    getSpmSchoolMetricRows(schoolIds),
    getSpmClassTargetRows(schoolIds),
    getLiveSchoolMetricRows(schoolIds),
  ])

  const results = toSchoolsForSpm(schools, {
    ...toSpmSchoolMetricRows(metricRows, classTargetRows),
    ...liveMetricRows,
  })

  return { results, total, page_total: results.length, limit, offset }
}
