import { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'kysely'
import { db } from '../../../lib/database'

export interface KPIData {
  three_year_average: {
    years: string
    percentage: number
    pupils_with_feedback: number
    total_active_pupils: number
  }
  year_breakdown: {
    year: string
    percentage: number
    pupils_with_feedback: number
    total_active_pupils: number
  }[]
}

interface KPIQueryResult {
  year: number
  pupils_with_feedback: number
  total_active_pupils: number
  feedback_percentage: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<KPIData | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get query parameters  
    const schoolId = req.query.schoolId as string
    const showAllSchools = req.query.showAllSchools === 'true'
    
    // Use raw SQL to query the summary table
    const result = await sql<KPIQueryResult>`
      SELECT 
        period_index as year,
        pupils_with_feedback,
        total_active_pupils,
        feedback_percentage
      FROM analytics_school_impact_summary 
      WHERE aggregation_level = 'yearly'
        AND (
          ${showAllSchools || !schoolId} = true AND school_id IS NULL
          OR school_id = ${schoolId || null}
        )
      ORDER BY period_index
    `.execute(db)
    
    const yearlyData = result.rows
    
    // Calculate three-year averages
    const totalPupils = yearlyData.reduce((sum: number, row: KPIQueryResult) => sum + row.total_active_pupils, 0)
    const totalWithFeedback = yearlyData.reduce((sum: number, row: KPIQueryResult) => sum + row.pupils_with_feedback, 0)
    const avgPupils = Math.round(totalPupils / yearlyData.length)
    const avgWithFeedback = Math.round(totalWithFeedback / yearlyData.length)
    const avgPercentage = totalPupils > 0 ? 
      Math.round((totalWithFeedback / totalPupils) * 100 * 100) / 100 : 0
    
    const kpiData: KPIData = {
      three_year_average: {
        years: '2022-2024',
        percentage: avgPercentage,
        pupils_with_feedback: avgWithFeedback,
        total_active_pupils: avgPupils
      },
      year_breakdown: yearlyData.map((row: KPIQueryResult) => ({
        year: row.year?.toString() || '',
        percentage: Number(row.feedback_percentage) || 0,
        pupils_with_feedback: row.pupils_with_feedback || 0,
        total_active_pupils: row.total_active_pupils || 0
      }))
    }
    
    // Add response caching headers (shorter TTL for KPIs - 2 hours)
    res.setHeader('Cache-Control', 'public, s-maxage=7200, stale-while-revalidate=14400')
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=7200')
    
    res.status(200).json(kpiData)
  } catch (error) {
    console.error('Error fetching KPI data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 