import { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../../lib/database'

export interface PhotosUploadedData {
  year: string
  total_photos: number
}

export interface PhotosUploadedResponse {
  all_students: PhotosUploadedData[]
  pupil_premium: PhotosUploadedData[]
}

interface PhotosUploadedQueryResult {
  year: number
  total_photos: number
  pp_total_photos: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PhotosUploadedResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get query parameters
    const schoolId = req.query.schoolId as string
    const showAllSchools = req.query.showAllSchools === 'true'
    
    // Build the SQL query with school filtering
    const result = await sql<PhotosUploadedQueryResult>`
      WITH photo_data AS (
        SELECT
          lpf."periodIndex" as year,
          COUNT(distinct lpfm.id) as total_photos,
          COUNT(distinct lpfm.id) filter (where lp."isPremium" = true) as pp_total_photos
        FROM lwp_pupil_feedback lpf
        LEFT JOIN lwp_pupil_feedback_media lpfm ON lpfm."feedbackId" = lpf."id" AND lpfm."type" = 'PHOTO'
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
        total_photos,
        pp_total_photos
      FROM photo_data
    `.execute(db)
    
    const yearlyData = result.rows
    
    // Transform data to match the existing API contract
    const responseData: PhotosUploadedResponse = {
      all_students: yearlyData.map((row: PhotosUploadedQueryResult) => ({
        year: row.year.toString(),
        total_photos: row.total_photos || 0
      })),
      pupil_premium: yearlyData.map((row: PhotosUploadedQueryResult) => ({
        year: row.year.toString(),
        total_photos: row.pp_total_photos || 0
      }))
    }
    
    // Add response caching headers (longer TTL - 6 hours)
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=43200')
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=21600')
    
    res.status(200).json(responseData)
  } catch (error) {
    console.error('Error fetching photos uploaded data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
