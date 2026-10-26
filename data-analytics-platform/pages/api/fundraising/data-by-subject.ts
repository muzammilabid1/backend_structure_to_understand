import type { NextApiRequest, NextApiResponse } from 'next'
import { sql, type RawBuilder } from 'kysely'
import { db } from '../../../lib/database'

export type SubjectMetric =
  | 'partnerSchools'
  | 'schoolsWithReleasedTopic'
  | 'classesRegistered'
  | 'teachersAndLeaders'
  | 'pupilsAccessedSite'
  | 'parentsRegistered'
  | 'schoolsUsingOneProgramme'

export interface SubjectDataPoint {
  subject: string
  count?: number
  teacherCount?: number
  leaderCount?: number
}

export interface SubjectDataResponse {
  metric: SubjectMetric
  data: SubjectDataPoint[]
}

type FilterMetric = Exclude<
  SubjectMetric,
  | 'classesRegistered'
  | 'teachersAndLeaders'
  | 'pupilsAccessedSite'
  | 'parentsRegistered'
  | 'schoolsUsingOneProgramme'
>

// Each metric maps to a hardcoded filter column — no user input reaches SQL
const METRIC_FILTERS: Record<FilterMetric, RawBuilder<boolean>> = {
  partnerSchools: sql<boolean>`asf."isSignedUp"`,
  schoolsWithReleasedTopic: sql<boolean>`asf."isReleased"`,
}

const VALID_METRICS: SubjectMetric[] = [
  ...(Object.keys(METRIC_FILTERS) as FilterMetric[]),
  'classesRegistered',
  'teachersAndLeaders',
  'pupilsAccessedSite',
  'parentsRegistered',
  'schoolsUsingOneProgramme',
]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SubjectDataResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { metric }: { metric?: SubjectMetric } = req.query

  if (!metric || !VALID_METRICS.includes(metric as SubjectMetric)) {
    return res.status(400).json({
      error: `Missing or invalid 'metric' query param. Valid values: ${VALID_METRICS.join(', ')}`,
    })
  }

  try {
    let data: SubjectDataPoint[] = []

    if (metric === 'classesRegistered') {
      const result = await sql<SubjectDataPoint>`
        WITH current_year AS (SELECT MAX("timeKey") AS "timeKey" FROM analytics_school_fact)
        SELECT
          asf.subject,
          SUM(asf."numberOfClasses") AS count
        FROM analytics_school_fact asf
        WHERE asf."timeKey" = (SELECT "timeKey" FROM current_year)
        GROUP BY asf.subject
        ORDER BY asf.subject
      `.execute(db)

      data = result?.rows ?? []
    } else if (metric === 'teachersAndLeaders') {
      const result = await sql<SubjectDataPoint>`
        WITH current_year AS (SELECT MAX("timeKey") AS "timeKey" FROM analytics_school_fact)
        SELECT
          asf.subject,
          SUM(asf."numberOfTeachers") AS "teacherCount",
          SUM(asf."numberOfSchoolLeaders") AS "leaderCount"
        FROM analytics_school_fact asf
        WHERE asf."timeKey" = (SELECT "timeKey" FROM current_year)
        GROUP BY asf.subject
        ORDER BY asf.subject
      `.execute(db)

      data = result?.rows ?? []
    } else if (metric === 'pupilsAccessedSite') {
      // Counts distinct pupils broken down by subject where:
      //   - activeParentsCount > 0: pupil has at least one active parent
      //   - parentFeedbackEntries > 0 OR videosWatchedCount > 0: site was accessed
      // Conditions are applied inside FILTER rather than WHERE so that all subjects
      // always appear in the result and the check is scoped to each group's own rows.
      // ROLLUP deduplicates pupils who appear under multiple subjects in the "All" row.
      const result = await sql<SubjectDataPoint>`
        WITH current_year AS (SELECT MAX("timeKey") AS "timeKey" FROM analytics_pupil_fact)
        SELECT
          COALESCE(apf.subject, 'All') AS subject,
          COUNT(DISTINCT apf."pupilId") FILTER (
            WHERE apf."activeParentsCount" > 0
              AND (apf."parentFeedbackEntries" > 0 OR apf."videosWatchedCount" > 0)
          ) AS count
        FROM analytics_pupil_fact apf
        WHERE apf."timeKey" = (SELECT "timeKey" FROM current_year)
        GROUP BY ROLLUP(apf."subject")
        ORDER BY apf."subject" NULLS FIRST
      `.execute(db)
      
      data = result?.rows ?? []
    } else if (metric === 'parentsRegistered') {
      // Sums pre-aggregated registered parent counts per subject from analytics_school_fact.
      const result = await sql<SubjectDataPoint>`
        WITH current_year AS (SELECT MAX("timeKey") AS "timeKey" FROM analytics_school_fact)
        SELECT
          asf.subject,
          SUM(asf."registeredParentsCount") AS count
        FROM analytics_school_fact asf
        WHERE asf."timeKey" = (SELECT "timeKey" FROM current_year)
        GROUP BY asf.subject
        ORDER BY asf.subject
      `.execute(db)

      data = result?.rows ?? []
    } else if (metric === 'schoolsUsingOneProgramme') {
      // Counts schools actively using exactly 1 core programme (Reading or FULL_PROGRAMME).
      // A school qualifies when it has at least 1 released topic AND at least 3 parent
      // feedback entries for that programme.
      const result = await sql<SubjectDataPoint>`
        WITH current_year AS (SELECT MAX("timeKey") AS "timeKey" FROM analytics_school_fact),
        pupil_feedback AS (
          SELECT "schoolId", "subjectId", "timeKey", SUM("parentFeedbackEntries") AS "parentFeedbackEntries"
          FROM analytics_pupil_fact
          GROUP BY "schoolId", "subjectId", "timeKey"
        ),
        school_programmes AS (
          SELECT
            asf."schoolId",
            asf."programmeType",
            STRING_AGG(asf.subject, '/' ORDER BY asf.subject) AS subject,
            BOOL_OR(asf."isReleased") AS "isReleasedTopic",
            COALESCE(SUM(pf."parentFeedbackEntries"), 0) AS "parentFeedbackEntries"
          FROM analytics_school_fact asf
          LEFT JOIN pupil_feedback pf
            ON pf."schoolId" = asf."schoolId"
            AND pf."subjectId" = asf."subjectId"
            AND pf."timeKey" = asf."timeKey"
          WHERE asf."timeKey" = (SELECT "timeKey" FROM current_year)
            AND asf."subjectId" <> -1 -- Exclude "All" aggregate rows
          GROUP BY
            asf."schoolId",
            asf."programmeType"
        ),
        single_programme_schools AS (
          SELECT
            "schoolId",
            MAX(subject) FILTER (
              WHERE "isReleasedTopic" = true AND "parentFeedbackEntries" >= 3
            ) AS subject
          FROM school_programmes
          GROUP BY "schoolId"
          HAVING COUNT(*) FILTER (
            WHERE "isReleasedTopic" = true AND "parentFeedbackEntries" >= 3
          ) = 1
        )
        SELECT
          COALESCE(subject, 'All') AS subject,
          COUNT(DISTINCT "schoolId") AS count
        FROM single_programme_schools
        GROUP BY ROLLUP(subject)
        ORDER BY subject NULLS FIRST
      `.execute(db)

      data = result?.rows ?? []
    } else {
      const filter = METRIC_FILTERS[metric as FilterMetric]

      const result = await sql<SubjectDataPoint>`
        WITH current_year AS (SELECT MAX("timeKey") AS "timeKey" FROM analytics_school_fact)
        SELECT
          COALESCE(asf.subject, 'All') AS subject,
          COUNT(DISTINCT asf."schoolId") FILTER (WHERE ${filter}) AS count
        FROM analytics_school_fact asf
        where asf."timeKey" = (SELECT "timeKey" FROM current_year)
          and asf."subjectId" <> -1 -- Exclude "All" aggregate rows
        GROUP BY ROLLUP(asf.subject)
        ORDER BY asf.subject NULLS FIRST
      `.execute(db)

      data = result?.rows ?? []
    }

    res.setHeader('Cache-Control', 'public, max-age=14400, stale-while-revalidate=7200')
    res.setHeader('Vary', 'Accept-Encoding')

    return res.status(200).json({ metric, data })
  } catch (error) {
    console.error(`Error fetching subject data for metric '${metric}':`, error)
    return res.status(500).json({ error: `Failed to fetch subject data for metric: ${metric}` })
  }
}
