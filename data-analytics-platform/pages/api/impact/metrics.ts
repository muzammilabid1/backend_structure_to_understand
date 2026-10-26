import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

// EAV data structure from CSV
export interface ImpactMetricRow {
  metric_name: string
  year: number
  student_type: string
  value: number
  metadata?: {
    category: string
    description: string
    unit: string
    updated_at: string
  }
}

// Response format that includes both raw EAV data and transformed data for each chart
export interface ImpactMetricsResponse {
  raw_metrics: ImpactMetricRow[]
  transformed_data: {
    kpis: any
    feedback_percentage: any
    student_totals: any
    total_feedbacks: any
    average_feedbacks: any
    registered_pupils: any
    pp_percentage: any
    parents_registered: any
    pupils_watched_video: any
    photos_uploaded: any
    audio_clips_uploaded: any
    pupils_completed_activities: any
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ImpactMetricsResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get query parameters for school filtering
    const schoolId = req.query.schoolId as string
    const showAllSchools = req.query.showAllSchools === 'true'

    // Read CSV file
    const csvPath = path.join(process.cwd(), 'data', 'impact_dash_metrics.csv')
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'Metrics CSV file not found. Please upload the CSV first.' })
    }

    const csvContent = fs.readFileSync(csvPath, 'utf8')
    
    // Simple CSV parser
    const lines = csvContent.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    const metrics: ImpactMetricRow[] = lines.slice(1).map(line => {
      const values = parseCSVLine(line)
      
      // Expected format: metric_name,year,student_type,value
      if (values.length < 4) {
        return null // Skip incomplete rows
      }
      
      const metric_name = values[0]?.trim() || ''
      const year = parseFloat(values[1]?.trim() || '0')
      const student_type = values[2]?.trim() || ''
      const value = parseFloat(values[3]?.trim() || '0')
      
      // Generate metadata for each metric
      const metadata = {
        category: getMetricCategory(metric_name),
        description: getMetricDescription(metric_name),
        unit: getMetricUnit(metric_name),
        updated_at: new Date().toISOString()
      }
      
      return {
        metric_name,
        year,
        student_type,
        value,
        metadata
      } as ImpactMetricRow
    }).filter((row): row is ImpactMetricRow => !!(row && row.metric_name)) // Filter out null and empty rows

    // TODO: Apply school filtering when school_id column is added to CSV
    // For now, we'll work with all data since school filtering isn't implemented yet

    // Transform EAV data into chart-specific formats
    const transformedData = transformMetricsData(metrics)

    const response: ImpactMetricsResponse = {
      raw_metrics: metrics,
      transformed_data: transformedData
    }

    // Add caching headers
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=3600')
    
    res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching impact metrics:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Simple CSV line parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current)
  return result
}

// Transform EAV metrics into chart-specific formats
function transformMetricsData(metrics: ImpactMetricRow[]) {
  const years = [2021, 2022, 2023, 2024, 2025]

  // Helper to get metric values by name and student type
  const getMetricValue = (metricName: string, studentType: string, year: number): number => {
    const metric = metrics.find(m => 
      m.metric_name === metricName && 
      m.student_type === studentType && 
      m.year === year
    )
    return metric ? metric.value : 0
  }

  // Helper to create year-value pairs for a specific metric and student type
  const createYearValuePairs = (metricName: string, studentType: string = 'all') => {
    return years.map(year => ({
      year: year.toString(),
      value: getMetricValue(metricName, studentType, year)
    }))
  }

  return {
    // KPIs - calculate 3-year averages
    kpis: {
      three_year_average: {
        percentage: calculateAverage(years.map(year => getMetricValue('pupils_active', 'percentage_pp', year))).toFixed(1),
        total_active_pupils: Math.round(calculateAverage(years.map(year => getMetricValue('pupils_active', 'all', year)))),
        pupils_with_feedback: Math.round(calculateAverage(years.map(year => getMetricValue('pupils_active', 'all', year))))
      },
      year_breakdown: years.map(year => ({
        year: year.toString(),
        percentage: getMetricValue('pupils_active', 'percentage_pp', year),
        total_active_pupils: getMetricValue('pupils_active', 'all', year),
        pupils_with_feedback: getMetricValue('pupils_active', 'all', year)
      }))
    },

    // Feedback percentage - using pupils_active percentage data
    feedback_percentage: {
      all_students: years.map(year => ({
        year: year.toString(),
        percentage: getMetricValue('pupils_active', 'percentage_pp', year)
      })),
      pupil_premium: years.map(year => ({
        year: year.toString(),
        percentage: 100 // PP students are 100% PP by definition
      }))
    },

    // Student totals
    student_totals: {
      all_students: years.map(year => ({
        year: year.toString(),
        pupils_with_feedback: getMetricValue('pupils_active', 'all', year),
        total_active_pupils: getMetricValue('pupils_active', 'all', year)
      })),
      pupil_premium: years.map(year => ({
        year: year.toString(),
        pupils_with_feedback: getMetricValue('pupils_active', 'pupil_premium', year),
        total_active_pupils: getMetricValue('pupils_active', 'pupil_premium', year)
      }))
    },

    // Total feedbacks - using activities_completed data
    total_feedbacks: {
      all_students: years.map(year => ({
        year: year.toString(),
        total_feedbacks: getMetricValue('activities_completed', 'all', year)
      })),
      pupil_premium: years.map(year => ({
        year: year.toString(),
        total_feedbacks: getMetricValue('activities_completed', 'pupil_premium', year)
      }))
    },

    // Average feedbacks
    average_feedbacks: {
      all_students: years.map(year => ({
        year: year.toString(),
        average_per_all_students: getMetricValue('average_entries_per_student', 'all', year)
      })),
      pupil_premium: years.map(year => ({
        year: year.toString(),
        average_per_all_students: getMetricValue('average_entries_per_student', 'pupil_premium', year)
      }))
    },

    // Registered pupils - using pupils_active as proxy
    registered_pupils: {
      all_students: years.map(year => ({
        year: year.toString(),
        cumulative_pupils: getMetricValue('pupils_active', 'all', year)
      })),
      pupil_premium: years.map(year => ({
        year: year.toString(),
        cumulative_pupils: getMetricValue('pupils_active', 'pupil_premium', year)
      }))
    },

    // PP percentage - transform to match expected format
    pp_percentage: {
      data: years.map(year => ({
        year: year.toString(),
        pupil_premium_percentage: getMetricValue('pupils_active', 'percentage_pp', year),
        total_active_pupils: getMetricValue('pupils_active', 'all', year),
        pp_total_active_pupils: getMetricValue('pupils_active', 'pupil_premium', year)
      }))
    },

    // Parents registered - transform to match expected format
    parents_registered: {
      all_students: years.map(year => ({
        year: year.toString(),
        total_parents_registered: getMetricValue('parents_registered', 'all', year)
      })),
      pupil_premium: years.map(year => ({
        year: year.toString(),
        total_parents_registered: getMetricValue('parents_registered', 'pupil_premium', year)
      }))
    },

    // Pupils watched video
    pupils_watched_video: {
      all_students: years.map(year => ({
        year: year.toString(),
        pupils_watched_video: getMetricValue('pupils_watched_video', 'all', year)
      })),
      pupil_premium: years.map(year => ({
        year: year.toString(),
        pupils_watched_video: getMetricValue('pupils_watched_video', 'pupil_premium', year)
      }))
    },

    // Photos uploaded
    photos_uploaded: {
      all_students: years.map(year => ({
        year: year.toString(),
        total_photos: getMetricValue('photos_uploaded', 'all', year)
      })),
      pupil_premium: years.map(year => ({
        year: year.toString(),
        total_photos: getMetricValue('photos_uploaded', 'pupil_premium', year)
      }))
    },

    // Audio clips uploaded
    audio_clips_uploaded: {
      all_students: years.map(year => ({
        year: year.toString(),
        total_audio_clips: getMetricValue('audio_clips_uploaded', 'all', year)
      })),
      pupil_premium: years.map(year => ({
        year: year.toString(),
        total_audio_clips: getMetricValue('audio_clips_uploaded', 'pupil_premium', year)
      }))
    },

    // Pupils completed activities - transform to match expected format
    pupils_completed_activities: {
      all_students: years.map(year => ({
        year: year.toString(),
        total_completed: getMetricValue('pupils_completed_activity', 'all', year)
      })),
      pupil_premium: years.map(year => ({
        year: year.toString(),
        total_completed: getMetricValue('pupils_completed_activity', 'pupil_premium', year)
      }))
    }
  }
}

// Helper function to calculate average
function calculateAverage(numbers: number[]): number {
  const sum = numbers.reduce((a, b) => a + b, 0)
  return sum / numbers.length
}

// Helper functions to generate metadata for metrics
function getMetricCategory(metricName: string): string {
  const categoryMap: Record<string, string> = {
    'pupils_active': 'engagement',
    'parents_registered': 'registration',
    'pupils_watched_video': 'engagement',
    'pupils_completed_activity': 'engagement',
    'pupils_recorded_reading': 'reading',
    'activities_completed': 'volume',
    'comments_left': 'engagement',
    'average_star_rating': 'quality',
    'photos_uploaded': 'media',
    'audio_clips_uploaded': 'media',
    'average_entries_per_student': 'engagement',
    'average_activity_entries_per_student': 'engagement'
  }
  return categoryMap[metricName] || 'unknown'
}

function getMetricDescription(metricName: string): string {
  const descriptionMap: Record<string, string> = {
    'pupils_active': 'Number of pupils who completed an activity or recorded reading',
    'parents_registered': 'Cumulative number of parents registered',
    'pupils_watched_video': 'Number of pupils who watched instructional videos',
    'pupils_completed_activity': 'Number of pupils who completed activities',
    'pupils_recorded_reading': 'Number of pupils who recorded reading sessions',
    'activities_completed': 'Total number of activity completions',
    'comments_left': 'Number of comments left by pupils and parents',
    'average_star_rating': 'Average star rating given by pupils',
    'photos_uploaded': 'Number of photos uploaded with feedback',
    'audio_clips_uploaded': 'Number of audio clips uploaded with feedback',
    'average_entries_per_student': 'Average number of entries per student (all types)',
    'average_activity_entries_per_student': 'Average number of activity entries per student'
  }
  return descriptionMap[metricName] || 'Unknown metric'
}

function getMetricUnit(metricName: string): string {
  const unitMap: Record<string, string> = {
    'pupils_active': 'count',
    'parents_registered': 'count',
    'pupils_watched_video': 'count',
    'pupils_completed_activity': 'count',
    'pupils_recorded_reading': 'count',
    'activities_completed': 'count',
    'comments_left': 'count',
    'average_star_rating': 'rating',
    'photos_uploaded': 'count',
    'audio_clips_uploaded': 'count',
    'average_entries_per_student': 'average',
    'average_activity_entries_per_student': 'average'
  }
  return unitMap[metricName] || 'count'
}
