import { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../../lib/database'

export interface AudioClipsUploadedData {
  year: string
  total_audio_clips: number
}

export interface AudioClipsUploadedResponse {
  all_students: AudioClipsUploadedData[]
  pupil_premium: AudioClipsUploadedData[]
}

interface AudioClipsUploadedQueryResult {
  year: number
  total_audio_clips: number
  pp_total_audio_clips: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AudioClipsUploadedResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get query parameters
    const schoolId = req.query.schoolId as string
    const showAllSchools = req.query.showAllSchools === 'true'
    
    // Build the SQL query with school filtering
    const result = await sql<AudioClipsUploadedQueryResult>`
      WITH audio_data AS (
        SELECT
          lpf."periodIndex" as year,
          COUNT(distinct lpfm.id) as total_audio_clips,
          COUNT(distinct lpfm.id) filter (where lp."isPremium" = true) as pp_total_audio_clips
        FROM lwp_pupil_feedback lpf
        LEFT JOIN lwp_pupil_feedback_media lpfm ON lpfm."feedbackId" = lpf."id" AND lpfm."type" = 'AUDIO'
        JOIN lwp_user lu ON lu.id = lpf."userId" AND lu.type = 'PARENT'
        JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id
        JOIN lwp_pupil lp ON lpfh."lwpPupilId" = lp."id"
        JOIN lwp_school ls ON lp."schoolId" = ls."id" AND NOT ls."isTestSchool"
        WHERE lpf."periodIndex" IN (2022, 2023, 2024)
          AND (
            ${showAllSchools || !schoolId} = true 
            OR ls.id = ${schoolId || null}
          )
        GROUP BY lpf."periodIndex"
        ORDER BY lpf."periodIndex"
      )
      SELECT 
        year,
        total_audio_clips,
        pp_total_audio_clips
      FROM audio_data
    `.execute(db)
    
    const yearlyData = result.rows
    
    // Transform data to match the existing API contract
    const responseData: AudioClipsUploadedResponse = {
      all_students: yearlyData.map((row: AudioClipsUploadedQueryResult) => ({
        year: row.year.toString(),
        total_audio_clips: row.total_audio_clips || 0
      })),
      pupil_premium: yearlyData.map((row: AudioClipsUploadedQueryResult) => ({
        year: row.year.toString(),
        total_audio_clips: row.pp_total_audio_clips || 0
      }))
    }
    
    // Add response caching headers (longer TTL - 6 hours)
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=43200')
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=21600')
    
    res.status(200).json(responseData)
  } catch (error) {
    console.error('Error fetching audio clips uploaded data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
