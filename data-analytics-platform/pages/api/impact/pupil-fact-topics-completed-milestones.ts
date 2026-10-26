import type { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../../lib/database'

export interface TopicsCompletedMilestonesGraphData {
  name: string
  numberOfPupils: number
  numberOfPremiumPupils: number
}

export interface PupilsTopicsCompletedMilestonesResponse {
  graphData: Array<TopicsCompletedMilestonesGraphData>
  allPupilsCount: number
  premiumPupilCount: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PupilsTopicsCompletedMilestonesResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get query parameters
    const subjectId: number | null = req?.query?.subjectId
      ? parseInt(req.query.subjectId as string)
      : null

    // if subjectId is provided, but not a valid number, then subjectId will be NaN, NaN is falsy, so we can check for that and return an error
    if (subjectId !== null && isNaN(subjectId))
      return res.status(400).json({ error: 'Invalid subjectId' })

    // Current academic year only
    const result = await sql<PupilsTopicsCompletedMilestonesResponse>`
        with current_year as (select max("timeKey") as "timeKey" from analytics_pupil_fact),
        base as (
            select 
                apf."pupilId",
                coalesce(apf."isPupilPremium",false) as "isPupilPremium",
                apf."topicsCompletedCount"
            FROM analytics_pupil_fact apf
            where
                apf."timeKey" = (select "timeKey" from current_year)
                and apf."subjectId" is not null
                and apf."subjectId" <> 0
                ${subjectId ? sql`and apf."subjectId" = ${subjectId}` : sql``}
        ),
        pupils_count as (
            select 
                COUNT(DISTINCT "pupilId") as "allPupilsCount",
                COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium") as "premiumPupilCount"
            FROM base
        ),
        pupil_completed_at_least_1_topic as (
        select 
                '1' AS "name",
                COUNT(DISTINCT "pupilId") FILTER (WHERE "topicsCompletedCount" >= 1) "numberOfPupils",
                COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium" AND "topicsCompletedCount" >= 1) "numberOfPremiumPupils",
                calculate_percentage(COUNT(DISTINCT "pupilId")::int, COUNT(DISTINCT "pupilId") FILTER (WHERE "topicsCompletedCount" >= 1)::int) AS "percentageOfPupils",
                calculate_percentage(COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium")::int, COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium" AND "topicsCompletedCount" >= 1)::int) AS "percentageOfPremiumPupils"
            from base
        ),
        pupil_completed_at_least_2_topic as (
        select 
                '2' AS "name",
                COUNT(DISTINCT "pupilId") FILTER (WHERE "topicsCompletedCount" >= 2) "numberOfPupils",
                COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium" AND "topicsCompletedCount" >= 2) "numberOfPremiumPupils",
                calculate_percentage(COUNT(DISTINCT "pupilId")::int, COUNT(DISTINCT "pupilId") FILTER (WHERE "topicsCompletedCount" >= 2)::int) AS "percentageOfPupils",
                calculate_percentage(COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium")::int, COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium" AND "topicsCompletedCount" >= 2)::int) AS "percentageOfPremiumPupils"
            from base
        ),
        pupil_completed_at_least_3_topic as (
        select 
                '3' AS "name",
                COUNT(DISTINCT "pupilId") FILTER (WHERE "topicsCompletedCount" >= 3) "numberOfPupils",
                COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium" AND "topicsCompletedCount" >= 3) "numberOfPremiumPupils",
                calculate_percentage(COUNT(DISTINCT "pupilId")::int, COUNT(DISTINCT "pupilId") FILTER (WHERE "topicsCompletedCount" >= 3)::int) AS "percentageOfPupils",
                calculate_percentage(COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium")::int, COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium" AND "topicsCompletedCount" >= 3)::int) AS "percentageOfPremiumPupils"
            from base
        ),
        pupil_completed_at_least_4_topic as (
        select 
                '4' AS "name",
                COUNT(DISTINCT "pupilId") FILTER (WHERE "topicsCompletedCount" >= 4) "numberOfPupils",
                COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium" AND "topicsCompletedCount" >= 4) "numberOfPremiumPupils",
                calculate_percentage(COUNT(DISTINCT "pupilId")::int, COUNT(DISTINCT "pupilId") FILTER (WHERE "topicsCompletedCount" >= 4)::int) AS "percentageOfPupils",
                calculate_percentage(COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium")::int, COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium" AND "topicsCompletedCount" >= 4)::int) AS "percentageOfPremiumPupils"
            from base
        ),
        pupil_completed_at_least_5_topic as (
        select 
                '5' AS "name",
                COUNT(DISTINCT "pupilId") FILTER (WHERE "topicsCompletedCount" >= 5) "numberOfPupils",
                COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium" AND "topicsCompletedCount" >= 5) "numberOfPremiumPupils",
                calculate_percentage(COUNT(DISTINCT "pupilId")::int, COUNT(DISTINCT "pupilId") FILTER (WHERE "topicsCompletedCount" >= 5)::int) AS "percentageOfPupils",
                calculate_percentage(COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium")::int, COUNT(DISTINCT "pupilId") FILTER (WHERE "isPupilPremium" AND "topicsCompletedCount" >= 5)::int) AS "percentageOfPremiumPupils"
            from base
        )
        select
            (
                SELECT COALESCE(
                    jsonb_agg(topic1.*) || jsonb_agg(topic2.*) || jsonb_agg(topic3.*) || jsonb_agg(topic4.*) || jsonb_agg(topic5.*),
                    jsonb_build_array()
                )
                FROM 
                    pupil_completed_at_least_1_topic topic1,
                    pupil_completed_at_least_2_topic topic2,
                    pupil_completed_at_least_3_topic topic3,
                    pupil_completed_at_least_4_topic topic4,
                    pupil_completed_at_least_5_topic topic5
            ) AS "graphData",
            "allPupilsCount",
            "premiumPupilCount"
        from pupils_count
      `.execute(db)

    // Add response caching headers (4 hours for total feedbacks)
    res.setHeader('Cache-Control', 'public, max-age=14400, stale-while-revalidate=7200')
    res.setHeader('Vary', 'Accept-Encoding')

    res.status(200).json(result?.rows[0])
  } catch (error) {
    console.error('Error fetching pupil fact topics completed milestones data:', error)
    res.status(500).json({ error: 'Failed to fetch pupil fact topics completed milestones data' })
  }
}
