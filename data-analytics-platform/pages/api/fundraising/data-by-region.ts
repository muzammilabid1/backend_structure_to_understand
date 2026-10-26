import type { NextApiRequest, NextApiResponse } from 'next'
import { sql, type RawBuilder } from 'kysely'
import { db } from '../../../lib/database'

export type RegionMetric =
  | 'activePupils'
  | 'pupilsWatchedVideo'
  | 'pupilsOfferedTopic'
  | 'topicsCompleted'
  | 'pupilsCompletedActivity'
  | 'pupilsClickedActivity'
  | 'readingSessions'

export interface RegionDataPoint {
  region: string
  allPupils?: number
  premiumPupils?: number
  topicsCompletedByAllPupils?: number
  topicsCompletedByPremiumPupils?: number
  readingSessionsByAllPupils?: number
  readingSessionsByPremiumPupils?: number
}

export interface RegionDataResponse {
  metric: RegionMetric
  data: RegionDataPoint[]
}

type FilterMetric = Exclude<RegionMetric, 'activePupils' | 'topicsCompleted' | 'readingSessions'>

// Each metric maps to a hardcoded SQL condition — no user input reaches SQL
const METRIC_FILTERS: Record<FilterMetric, RawBuilder<number>> = {
  pupilsWatchedVideo: sql<number>`apf."videosWatchedCount" > 0`,
  pupilsOfferedTopic: sql<number>`apf."topicsSetCount" > 0`,
  pupilsCompletedActivity: sql<number>`apf."activitiesCompletedCount" > 0`,
  pupilsClickedActivity: sql<number>`apf."activitiesAccessedCount" > 0`,
}

const VALID_METRICS: RegionMetric[] = [
  ...(Object.keys(METRIC_FILTERS) as FilterMetric[]),
  'activePupils',
  'topicsCompleted',
  'readingSessions',
]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RegionDataResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { metric }: { metric?: RegionMetric } = req.query

  if (!metric || !VALID_METRICS.includes(metric as RegionMetric)) {
    return res.status(400).json({
      error: `Missing or invalid 'metric' query param. Valid values: ${VALID_METRICS.join(', ')}`,
    })
  }

  let data: RegionDataPoint[] = []

  try {
    if (metric === 'activePupils') {
      const result = await sql<RegionDataPoint>`
        with current_year as (select max("timeKey") as "timeKey" from analytics_pupil_fact),
        region_data as (
          select 
            COALESCE(asf.region, 'Unknown') AS region,
            COUNT(DISTINCT apf."pupilId") 
                  FILTER (
                    WHERE 
                      (
                        apf."videosWatchedCount" > 0 OR apf."activitiesCompletedCount" > 0 OR apf."parentFeedbackEntries" > 0 OR apf."teacherFeedbackEntries" > 0
                      )
                  ) AS "allPupils",
              COUNT(DISTINCT apf."pupilId") 
                  FILTER (
                    WHERE 
                      apf."isPupilPremium" 
                      AND (
                        apf."videosWatchedCount" > 0 OR apf."activitiesCompletedCount" > 0 OR apf."parentFeedbackEntries" > 0 OR apf."teacherFeedbackEntries" > 0
                      )
                  ) AS "premiumPupils"
          FROM analytics_pupil_fact apf
          JOIN analytics_school_fact asf
              ON asf."schoolId" = apf."schoolId"
              AND asf."timeKey" = apf."timeKey"
          WHERE apf."timeKey" = (select "timeKey" from current_year)
          group by asf.region
        )
        select 
          COALESCE(region, 'All') as region,
          sum("allPupils") as "allPupils",
          sum("premiumPupils") as "premiumPupils"
        from region_data
        group by rollup(region)
        order by 
          case 
            when region is null then 0              -- "All" first (rollup row)
            when region = 'Unknown' then 2          -- "Unknown" last
            else 1                                  -- everything else in middle
          end,
          region asc;
      `.execute(db)

      data = result.rows
    } else if (metric === 'topicsCompleted') {
      const result = await sql<RegionDataPoint>`
        with current_year as (select max("timeKey") as "timeKey" from analytics_pupil_fact),
        school_with_region as (
          select 
            "schoolId",
            "timeKey",
            COALESCE(region, 'Unknown') AS region
          from analytics_school_fact
          group by "schoolId", "timeKey", region
        ),
        region_data as (
          select
            swr.region AS region,
            SUM(apf."topicsCompletedCount") AS "topicsCompletedByAllPupils",
            SUM(CASE WHEN apf."isPupilPremium" THEN apf."topicsCompletedCount" ELSE 0 END) AS "topicsCompletedByPremiumPupils"
          FROM analytics_pupil_fact apf
          JOIN school_with_region swr
              ON swr."schoolId" = apf."schoolId"
              AND swr."timeKey" = apf."timeKey"
          WHERE
              apf."timeKey" = (select "timeKey" from current_year)
              and apf."subjectId" IS NOT NULL
              and apf."subjectId" <> 0
          GROUP BY swr.region
        )
        select
          COALESCE(region, 'All') AS region,
          SUM("topicsCompletedByAllPupils") AS "topicsCompletedByAllPupils",
          SUM("topicsCompletedByPremiumPupils") AS "topicsCompletedByPremiumPupils"
        from region_data
        group by rollup(region)
        order by
          case
            when region is null then 0      -- "All" first (rollup row)
            when region = 'Unknown' then 2  -- "Unknown" last
            else 1                          -- everything else in middle
          end,
          region asc;
    `.execute(db)

      data = result.rows
    } else if (metric === 'readingSessions') {
      const result = await sql<RegionDataPoint>`
        with current_year as (select max("timeKey") as "timeKey" from analytics_pupil_fact),
        school_with_region as (
          select 
            "schoolId",
            "timeKey",
            COALESCE(region, 'Unknown') AS region
          from analytics_school_fact
          group by "schoolId", "timeKey", region
        ),
        region_data as (
          select
            swr.region AS region,
            SUM(apf."parentFeedbackEntries" + apf."teacherFeedbackEntries") AS "readingSessionsByAllPupils",
            SUM(CASE WHEN apf."isPupilPremium" THEN apf."parentFeedbackEntries" + apf."teacherFeedbackEntries" ELSE 0 END) AS "readingSessionsByPremiumPupils"
          FROM analytics_pupil_fact apf
          JOIN school_with_region swr
              ON swr."schoolId" = apf."schoolId"
              AND swr."timeKey" = apf."timeKey"
          WHERE
            apf."timeKey" = (select "timeKey" from current_year)
            and apf."subject" = 'Reading'
            and apf."subjectId" = 0
          GROUP BY swr.region
        )
        select
          COALESCE(region, 'All') AS region,
          SUM("readingSessionsByAllPupils") AS "readingSessionsByAllPupils",
          SUM("readingSessionsByPremiumPupils") AS "readingSessionsByPremiumPupils"
        from region_data
        group by rollup(region)
        order by
          case
            when region is null then 0      -- "All" first (rollup row)
            when region = 'Unknown' then 2  -- "Unknown" last
            else 1                          -- everything else in middle
          end,
          region asc;
    `.execute(db)

      data = result.rows
    } else {
      const filter = METRIC_FILTERS[metric as FilterMetric]
      const result = await sql<RegionDataPoint>`
        with current_year as (select max("timeKey") as "timeKey" from analytics_pupil_fact),
        region_data as (
          select
            COALESCE(asf.region, 'Unknown') AS region,
            COUNT(DISTINCT apf."pupilId") FILTER (WHERE ${filter}) AS "allPupils",
            COUNT(DISTINCT apf."pupilId") FILTER (WHERE apf."isPupilPremium" AND ${filter}) AS "premiumPupils"
          FROM analytics_pupil_fact apf
          JOIN analytics_school_fact asf
              ON asf."schoolId" = apf."schoolId"
              AND asf."timeKey" = apf."timeKey"
          WHERE
              apf."timeKey" = (select "timeKey" from current_year)
              and apf."subjectId" IS NOT NULL
              and apf."subjectId" <> 0
          GROUP BY asf.region
        )
        select
          COALESCE(region, 'All') AS region,
          sum("allPupils") AS "allPupils",
          sum("premiumPupils") AS "premiumPupils"
        from region_data
        group by rollup(region)
        order by
          case
            when region is null then 0      -- "All" first (rollup row)
            when region = 'Unknown' then 2  -- "Unknown" last
            else 1                          -- everything else in middle
          end,
          region asc;
        `.execute(db)

      data = result.rows
    }

    res.setHeader('Cache-Control', 'public, max-age=14400, stale-while-revalidate=7200')
    res.setHeader('Vary', 'Accept-Encoding')

    return res.status(200).json({ metric, data })
  } catch (error) {
    console.error(`Error fetching region data for metric '${metric}':`, error)
    return res.status(500).json({ error: `Failed to fetch region data for metric: ${metric}` })
  }
}
