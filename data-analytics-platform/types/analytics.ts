/**
 * TypeScript interfaces for Analytics Summary Tables
 */

export interface AnalyticsSchoolImpactSummary {
  id: number;
  school_id: string | null; // null represents "All Schools"
  period_index: number; // Academic year (2022, 2023, 2024)
  period_month: number | null; // Future: monthly breakdowns (1-12)
  aggregation_level: 'yearly' | 'monthly';
  
  // Core metrics (All Students)
  total_active_pupils: number;
  pupils_with_feedback: number;
  total_feedback_entries: number;
  
  // Pupil Premium subset
  pp_total_active_pupils: number;
  pp_pupils_with_feedback: number;
  pp_total_feedback_entries: number;
  
  // Pre-computed percentages
  feedback_percentage: number;
  pp_feedback_percentage: number;
  average_feedbacks_per_student: number;
  pp_average_feedbacks_per_student: number;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  data_version: number;
}

export interface AnalyticsSummaryMetadata {
  id: number;
  table_name: string;
  last_refresh_started_at: Date | null;
  last_refresh_completed_at: Date | null;
  last_refresh_success: boolean | null;
  refresh_duration_seconds: number | null;
  records_processed: number | null;
  error_message: string | null;
  data_version: number;
  created_at: Date;
  updated_at: Date;
}

// API Response types (maintaining compatibility with existing frontend)
export interface KPIData {
  three_year_average: {
    total_active_pupils: number;
    percent_with_feedback: number;
  };
  year_breakdown: Array<{
    year: number;
    pupils_with_feedback: number;
    total_active_pupils: number;
    percent_with_feedback: number;
  }>;
}

export interface StudentTotalsResponse {
  data: Array<{
    student_type: 'all' | 'pp';
    year: number;
    pupils_with_feedback: number;
    total_active_pupils: number;
  }>;
}

export interface FeedbackPercentageResponse {
  data: Array<{
    student_type: 'all' | 'pp';
    year: number;
    pupils_with_feedback: number;
    total_active_pupils: number;
    percentage: number;
  }>;
}

export interface TotalFeedbacksResponse {
  data: Array<{
    student_type: 'all' | 'pp';
    year: number;
    total_feedbacks: number;
  }>;
}

export interface AverageFeedbacksResponse {
  data: Array<{
    student_type: 'all' | 'pp';
    year: number;
    total_active_pupils: number;
    total_feedbacks: number;
    average_feedbacks: number;
  }>;
}

export interface PPPercentageData {
  year: string;
  total_active_pupils: number;
  pp_total_active_pupils: number;
  pupil_premium_percentage: number;
}

export interface PPPercentageResponse {
  data: PPPercentageData[];
}

export interface ParentsRegisteredData {
  year: string;
  total_parents_registered: number;
}

export interface ParentsRegisteredResponse {
  all_students: ParentsRegisteredData[];
  pupil_premium: ParentsRegisteredData[];
}

// Helper types for filtering
export interface ImpactQueryParams {
  schoolId?: string;
  showAllSchools?: boolean;
}

// ETL result types
export interface ETLResult {
  status: 'SUCCESS' | 'FAILED';
  records_processed: number;
  duration_seconds: number;
} 