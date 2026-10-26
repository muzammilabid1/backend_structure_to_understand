import { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../../lib/database'

export interface PupilsCompletedActivitiesData {
  year: string
  total_completed: number
}

export interface PupilsCompletedActivitiesResponse {
  all_students: PupilsCompletedActivitiesData[]
  pupil_premium: PupilsCompletedActivitiesData[]
}

interface PupilsCompletedActivitiesQueryResult {
  year: number
  total_completed: number
  pp_completed: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PupilsCompletedActivitiesResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get query parameters
    const schoolId = req.query.schoolId as string
    const showAllSchools = req.query.showAllSchools === 'true'
    
    // Build the SQL query with school filtering
    const result = await sql<PupilsCompletedActivitiesQueryResult>`
      WITH completed_activities AS (
        SELECT DISTINCT
          lpt."periodIndex" as year,
          lp.id as pupil_id,
          lp."isPremium"
        FROM lwp_pupil_activity lpa
        JOIN lwp_pupil_topic lpt ON lpt.id = lpa."topicId"
        JOIN lwp_pupil lp ON lp.id = lpa."pupilId"
        JOIN lwp_school ls ON lp."schoolId" = ls."id" AND NOT ls."isTestSchool"
        WHERE lpt."periodIndex" IN (2022, 2023, 2024)
          AND (
            ${showAllSchools || !schoolId} = true 
            OR ls.id = ${schoolId || null}
          )
          AND (
            -- Has a rating
            lpa.rating IS NOT NULL
            OR
            -- Has feedback with comments or photos
            EXISTS (
              SELECT 1 FROM lwp_pupil_feedback lpf
              WHERE lpf."activityId" = lpa.id
              AND (
                lpf."pupilComment" IS NOT NULL
                OR lpf."parentComment" IS NOT NULL  
                OR lpf."comment" IS NOT NULL
                OR EXISTS (
                  SELECT 1 FROM lwp_pupil_feedback_media lpfm 
                  WHERE lpfm."feedbackId" = lpf.id
                )
              )
            )
          )
      )
      SELECT
        year,
        COUNT(DISTINCT pupil_id) as total_completed,
        COUNT(DISTINCT pupil_id) FILTER (WHERE "isPremium" = true) as pp_completed
      FROM completed_activities
      GROUP BY year
      ORDER BY year
    `.execute(db)
    
    const yearlyData = result.rows
    
    // Transform data to match the existing API contract
    const responseData: PupilsCompletedActivitiesResponse = {
      all_students: yearlyData.map((row: PupilsCompletedActivitiesQueryResult) => ({
        year: row.year.toString(),
        total_completed: row.total_completed || 0
      })),
      pupil_premium: yearlyData.map((row: PupilsCompletedActivitiesQueryResult) => ({
        year: row.year.toString(),
        total_completed: row.pp_completed || 0
      }))
    }
    
    // Add response caching headers (longer TTL - 6 hours)
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=43200')
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=21600')
    
    res.status(200).json(responseData)
  } catch (error) {
    console.error('Error fetching pupils completed activities data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
