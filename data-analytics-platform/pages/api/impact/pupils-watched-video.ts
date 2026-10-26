import { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../../lib/database'

export interface PupilsWatchedVideoData {
  year: string
  pupils_watched_video: number
  total_pupils: number
}

export interface PupilsWatchedVideoResponse {
  all_students: PupilsWatchedVideoData[]
  pupil_premium: PupilsWatchedVideoData[]
}

// Strongly typed result from the raw SQL query
interface PupilsWatchedVideoQueryResult {
  student_type: 'all' | 'pp'
  year: number
  pupils_watched_video: number
  total_pupils: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PupilsWatchedVideoResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get query parameters
    const schoolId = req.query.schoolId as string
    const showAllSchools = req.query.showAllSchools === 'true'

    // Fixed years: 2021-2025 (academic years 2021-2022, 2022-2023, etc.)
    const years = [2021, 2022, 2023, 2024, 2025]
    
    // Query for pupils who watched video over the years with All vs PP split using Kysely with raw SQL
    const result = await sql<PupilsWatchedVideoQueryResult>`
      WITH year_data AS (
        SELECT unnest(${sql`ARRAY[${sql.join(years)}]`}::integer[]) AS period_index
      ),
      -- All pupils who watched video by academic year (based on topic release date)
      all_pupils_video AS (
        SELECT 
          yd.period_index,
          COUNT(DISTINCT CASE WHEN lpt."watchedVideo" = true THEN lpt."pupilId" END) as pupils_watched_video,
          COUNT(DISTINCT lpt."pupilId") as total_pupils
        FROM year_data yd
        LEFT JOIN lwp_pupil_topic lpt ON EXTRACT(YEAR FROM lpt."releaseDate") = yd.period_index
        LEFT JOIN lwp_pupil lp ON lp.id = lpt."pupilId"
        LEFT JOIN lwp_school ls ON ls.id = lp."schoolId"
          AND NOT ls."isTestSchool"
        LEFT JOIN lwp_school_static_tags lsst ON lsst."schoolId" = lp."schoolId"
          AND lsst."tagId" = 3
        WHERE 
          (lpt.id IS NULL OR (
            ${showAllSchools} = true
            OR lp."schoolId" = ${schoolId || null}
          ))
        GROUP BY yd.period_index
      ),
      -- Pupil Premium pupils who watched video by academic year (based on topic release date)
      pp_pupils_video AS (
        SELECT 
          yd.period_index,
          COUNT(DISTINCT CASE WHEN lpt."watchedVideo" = true THEN lpt."pupilId" END) as pupils_watched_video,
          COUNT(DISTINCT lpt."pupilId") as total_pupils
        FROM year_data yd
        LEFT JOIN lwp_pupil_topic lpt ON EXTRACT(YEAR FROM lpt."releaseDate") = yd.period_index
        LEFT JOIN lwp_pupil lp ON lp.id = lpt."pupilId"
          AND lp."isPremium" = true
        LEFT JOIN lwp_school ls ON ls.id = lp."schoolId"
          AND NOT ls."isTestSchool"
        LEFT JOIN lwp_school_static_tags lsst ON lsst."schoolId" = lp."schoolId"
          AND lsst."tagId" = 3
        WHERE 
          (lpt.id IS NULL OR (
            ${showAllSchools} = true
            OR lp."schoolId" = ${schoolId || null}
          ))
        GROUP BY yd.period_index
      )
      SELECT 
        'all' as student_type,
        apv.period_index as year,
        COALESCE(apv.pupils_watched_video, 0) as pupils_watched_video,
        COALESCE(apv.total_pupils, 0) as total_pupils
      FROM all_pupils_video apv
      
      UNION ALL
      
      SELECT 
        'pp' as student_type,
        ppv.period_index as year,
        COALESCE(ppv.pupils_watched_video, 0) as pupils_watched_video,
        COALESCE(ppv.total_pupils, 0) as total_pupils
      FROM pp_pupils_video ppv
      
      ORDER BY student_type, year
    `.execute(db)

    // Transform the result into the required format
    const allStudents: PupilsWatchedVideoData[] = []
    const pupilPremium: PupilsWatchedVideoData[] = []

    result.rows.forEach(row => {
      const formattedData = {
        year: row.year.toString(),
        pupils_watched_video: row.pupils_watched_video || 0,
        total_pupils: row.total_pupils || 0
      }

      if (row.student_type === 'all') {
        allStudents.push(formattedData)
      } else {
        pupilPremium.push(formattedData)
      }
    })

    // Ensure we have data for all years (fill with 0 if missing)
    years.forEach(year => {
      const yearStr = year.toString()
      
      if (!allStudents.find(item => item.year === yearStr)) {
        allStudents.push({ year: yearStr, pupils_watched_video: 0, total_pupils: 0 })
      }
      
      if (!pupilPremium.find(item => item.year === yearStr)) {
        pupilPremium.push({ year: yearStr, pupils_watched_video: 0, total_pupils: 0 })
      }
    })

    // Sort by year
    allStudents.sort((a, b) => parseInt(a.year) - parseInt(b.year))
    pupilPremium.sort((a, b) => parseInt(a.year) - parseInt(b.year))

    // Add response caching headers (6 hours cache)
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=43200')
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=21600')

    res.status(200).json({
      all_students: allStudents,
      pupil_premium: pupilPremium
    })

  } catch (error) {
    console.error('Error fetching pupils watched video data:', error)
    res.status(500).json({ error: 'Failed to fetch pupils watched video data' })
  }
}
