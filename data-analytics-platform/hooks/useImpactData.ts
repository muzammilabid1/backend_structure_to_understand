import useSWR from 'swr'
import { usePupilFactImpactData } from './usePupilFactImpactData'
import { KPIData } from '../pages/api/impact/kpis'
import { FeedbackPercentageResponse } from '../pages/api/impact/feedback-percentage'
import { StudentTotalsResponse } from '../pages/api/impact/student-totals'
import { TotalFeedbacksResponse } from '../pages/api/impact/total-feedbacks'
import { AverageFeedbacksResponse } from '../pages/api/impact/average-feedbacks'
import { RegisteredPupilsResponse } from '../pages/api/impact/registered-pupils'
import { PPPercentageResponse } from '../pages/api/impact/pp-percentage'
import { ParentsRegisteredResponse } from '../pages/api/impact/parents-registered'
import { PupilsWatchedVideoResponse } from '../pages/api/impact/pupils-watched-video'
import { PhotosUploadedResponse } from '../pages/api/impact/photos-uploaded'
import { AudioClipsUploadedResponse } from '../pages/api/impact/audio-clips-uploaded'
import { PupilsCompletedActivitiesResponse } from '../pages/api/impact/pupils-completed-activities'
import { ImpactMetricsResponse } from '../pages/api/impact/metrics'
import { School } from '../pages/api/schools'
import { buildQueryString } from '../lib/swr-config'

interface ImpactDataParams {
  selectedSchoolId?: string // undefined means "all schools"
}

// Hook for schools list
export function useSchools() {
  const { data, error, isLoading } = useSWR<School[]>('/api/schools', {
    revalidateOnMount: true,
    // Schools don't change often, so longer cache
    dedupingInterval: 300000, // 5 minutes
  })

  return {
    schools: data || [],
    schoolsError: error,
    schoolsLoading: isLoading
  }
}

// Hook for KPI data (fast, loads first)
export function useKPIData(params: ImpactDataParams) {
  const queryString = buildQueryString({
    showAllSchools: !params.selectedSchoolId, // true if no school selected
    ...(params.selectedSchoolId && { schoolId: params.selectedSchoolId })
  })
  
  const { data, error, isLoading, mutate } = useSWR<KPIData>(
    `/api/impact/kpis?${queryString}`,
    {
      // KPIs should load quickly, no need for background revalidation
      revalidateOnMount: true,
    }
  )

  return {
    kpiData: data,
    kpiError: error,
    kpiLoading: isLoading,
    refreshKPIs: mutate
  }
}

// Hook for chart data (slower, loads after KPIs)
export function useChartData(params: ImpactDataParams) {
  const queryString = buildQueryString({
    showAllSchools: !params.selectedSchoolId, // true if no school selected
    ...(params.selectedSchoolId && { schoolId: params.selectedSchoolId })
  })
  
  const { data, error, isLoading, mutate } = useSWR<FeedbackPercentageResponse>(
    `/api/impact/feedback-percentage?${queryString}`,
    {
      // Chart data can revalidate in background
      revalidateOnMount: true,
    }
  )

  return {
    chartData: data,
    chartError: error,
    chartLoading: isLoading,
    refreshChart: mutate
  }
}

// Hook for student totals data
export function useStudentTotalsData(params: ImpactDataParams) {
  const queryString = buildQueryString({
    showAllSchools: !params.selectedSchoolId, // true if no school selected
    ...(params.selectedSchoolId && { schoolId: params.selectedSchoolId })
  })
  
  const { data, error, isLoading, mutate } = useSWR<StudentTotalsResponse>(
    `/api/impact/student-totals?${queryString}`,
    {
      // Student totals data can revalidate in background
      revalidateOnMount: true,
    }
  )

  return {
    studentTotalsData: data,
    studentTotalsError: error,
    studentTotalsLoading: isLoading,
    refreshStudentTotals: mutate
  }
}

// Hook for total feedbacks data
export function useTotalFeedbacksData(params: ImpactDataParams) {
  const queryString = buildQueryString({
    showAllSchools: !params.selectedSchoolId, // true if no school selected
    ...(params.selectedSchoolId && { schoolId: params.selectedSchoolId })
  })
  
  const { data, error, isLoading, mutate } = useSWR<TotalFeedbacksResponse>(
    `/api/impact/total-feedbacks?${queryString}`,
    {
      // Total feedbacks data can revalidate in background
      revalidateOnMount: true,
    }
  )

  return {
    totalFeedbacksData: data,
    totalFeedbacksError: error,
    totalFeedbacksLoading: isLoading,
    refreshTotalFeedbacks: mutate
  }
}

// Hook for average feedbacks data
export function useAverageFeedbacksData(params: ImpactDataParams) {
  const queryString = buildQueryString({
    showAllSchools: !params.selectedSchoolId, // true if no school selected
    ...(params.selectedSchoolId && { schoolId: params.selectedSchoolId })
  })
  
  const { data, error, isLoading, mutate } = useSWR<AverageFeedbacksResponse>(
    `/api/impact/average-feedbacks?${queryString}`,
    {
      // Average feedbacks data can revalidate in background
      revalidateOnMount: true,
    }
  )

  return {
    averageFeedbacksData: data,
    averageFeedbacksError: error,
    averageFeedbacksLoading: isLoading,
    refreshAverageFeedbacks: mutate
  }
}

// Hook for registered pupils data
export function useRegisteredPupilsData(params: ImpactDataParams) {
  const queryString = buildQueryString({
    showAllSchools: !params.selectedSchoolId, // true if no school selected
    ...(params.selectedSchoolId && { schoolId: params.selectedSchoolId })
  })
  
  const { data, error, isLoading, mutate } = useSWR<RegisteredPupilsResponse>(
    `/api/impact/registered-pupils?${queryString}`,
    {
      // Registered pupils data can revalidate in background
      revalidateOnMount: true,
    }
  )

  return {
    registeredPupilsData: data,
    registeredPupilsError: error,
    registeredPupilsLoading: isLoading,
    refreshRegisteredPupils: mutate
  }
}

// Hook for PP percentage data
export function usePPPercentageData(params: ImpactDataParams) {
  const queryString = buildQueryString({
    showAllSchools: !params.selectedSchoolId, // true if no school selected
    ...(params.selectedSchoolId && { schoolId: params.selectedSchoolId })
  })
  
  const { data, error, isLoading, mutate } = useSWR<PPPercentageResponse>(
    `/api/impact/pp-percentage?${queryString}`,
    {
      // PP percentage data can revalidate in background
      revalidateOnMount: true,
    }
  )

  return {
    ppPercentageData: data,
    ppPercentageError: error,
    ppPercentageLoading: isLoading,
    refreshPPPercentage: mutate
  }
}

// Hook for parents registered data
export function useParentsRegisteredData(params: ImpactDataParams) {
  const queryString = buildQueryString({
    showAllSchools: !params.selectedSchoolId, // true if no school selected
    ...(params.selectedSchoolId && { schoolId: params.selectedSchoolId })
  })
  
  const { data, error, isLoading, mutate } = useSWR<ParentsRegisteredResponse>(
    `/api/impact/parents-registered?${queryString}`,
    {
      // Parents registered data can revalidate in background
      revalidateOnMount: true,
    }
  )

  return {
    parentsRegisteredData: data,
    parentsRegisteredError: error,
    parentsRegisteredLoading: isLoading,
    refreshParentsRegistered: mutate
  }
}

// Hook for pupils watched video data
export function usePupilsWatchedVideoData(params: ImpactDataParams) {
  const queryString = buildQueryString({
    showAllSchools: !params.selectedSchoolId, // true if no school selected
    ...(params.selectedSchoolId && { schoolId: params.selectedSchoolId })
  })
  
  const { data, error, isLoading, mutate } = useSWR<PupilsWatchedVideoResponse>(
    `/api/impact/pupils-watched-video?${queryString}`,
    {
      // Pupils watched video data can revalidate in background
      revalidateOnMount: true,
    }
  )

  return {
    pupilsWatchedVideoData: data,
    pupilsWatchedVideoError: error,
    pupilsWatchedVideoLoading: isLoading,
    refreshPupilsWatchedVideo: mutate
  }
}

// Hook for photos uploaded data
export function usePhotosUploadedData(params: ImpactDataParams) {
  const queryString = buildQueryString({
    showAllSchools: !params.selectedSchoolId, // true if no school selected
    ...(params.selectedSchoolId && { schoolId: params.selectedSchoolId })
  })
  
  const { data, error, isLoading, mutate } = useSWR<PhotosUploadedResponse>(
    `/api/impact/photos-uploaded?${queryString}`,
    {
      // Photos uploaded data can revalidate in background
      revalidateOnMount: true,
    }
  )

  return {
    photosUploadedData: data,
    photosUploadedError: error,
    photosUploadedLoading: isLoading,
    refreshPhotosUploaded: mutate
  }
}

// Hook for audio clips uploaded data
export function useAudioClipsUploadedData(params: ImpactDataParams) {
  const queryString = buildQueryString({
    showAllSchools: !params.selectedSchoolId, // true if no school selected
    ...(params.selectedSchoolId && { schoolId: params.selectedSchoolId })
  })
  
  const { data, error, isLoading, mutate } = useSWR<AudioClipsUploadedResponse>(
    `/api/impact/audio-clips-uploaded?${queryString}`,
    {
      // Audio clips uploaded data can revalidate in background
      revalidateOnMount: true,
    }
  )

  return {
    audioClipsUploadedData: data,
    audioClipsUploadedError: error,
    audioClipsUploadedLoading: isLoading,
    refreshAudioClipsUploaded: mutate
  }
}

// Hook for pupils completed activities data
export function usePupilsCompletedActivitiesData(params: ImpactDataParams) {
  const queryString = buildQueryString({
    showAllSchools: !params.selectedSchoolId, // true if no school selected
    ...(params.selectedSchoolId && { schoolId: params.selectedSchoolId })
  })
  
  const { data, error, isLoading, mutate } = useSWR<PupilsCompletedActivitiesResponse>(
    `/api/impact/pupils-completed-activities?${queryString}`,
    {
      // Pupils completed activities data can revalidate in background
      revalidateOnMount: true,
    }
  )

  return {
    pupilsCompletedActivitiesData: data,
    pupilsCompletedActivitiesError: error,
    pupilsCompletedActivitiesLoading: isLoading,
    refreshPupilsCompletedActivities: mutate
  }
}

// NEW: Unified hook that uses the CSV-based metrics endpoint
export function useUnifiedImpactData(params: ImpactDataParams) {
  const queryString = buildQueryString({
    showAllSchools: !params.selectedSchoolId, // true if no school selected
    ...(params.selectedSchoolId && { schoolId: params.selectedSchoolId })
  })
  
  const { data, error, isLoading, mutate } = useSWR<ImpactMetricsResponse>(
    `/api/impact/metrics?${queryString}`,
    {
      revalidateOnMount: true,
      // Cache for 5 minutes since this is file-based
      dedupingInterval: 300000,
    }
  )

  // Extract transformed data for each chart
  const transformedData = data?.transformed_data

  return {
    // Raw metrics data
    rawMetrics: data?.raw_metrics || [],
    
    // KPI data (matches original format)
    kpiData: transformedData?.kpis,
    kpiError: error,
    kpiLoading: isLoading,
    
    // Chart data (matches original formats)
    chartData: transformedData?.feedback_percentage,
    chartError: error,
    chartLoading: isLoading,
    
    // Student totals data
    studentTotalsData: transformedData?.student_totals,
    studentTotalsError: error,
    studentTotalsLoading: isLoading,
    
    // Total feedbacks data
    totalFeedbacksData: transformedData?.total_feedbacks,
    totalFeedbacksError: error,
    totalFeedbacksLoading: isLoading,
    
    // Average feedbacks data
    averageFeedbacksData: transformedData?.average_feedbacks,
    averageFeedbacksError: error,
    averageFeedbacksLoading: isLoading,
    
    // Registered pupils data
    registeredPupilsData: transformedData?.registered_pupils,
    registeredPupilsError: error,
    registeredPupilsLoading: isLoading,
    
    // PP percentage data
    ppPercentageData: transformedData?.pp_percentage,
    ppPercentageError: error,
    ppPercentageLoading: isLoading,
    
    // Parents registered data
    parentsRegisteredData: transformedData?.parents_registered,
    parentsRegisteredError: error,
    parentsRegisteredLoading: isLoading,
    
    // Pupils watched video data
    pupilsWatchedVideoData: transformedData?.pupils_watched_video,
    pupilsWatchedVideoError: error,
    pupilsWatchedVideoLoading: isLoading,
    
    // Photos uploaded data
    photosUploadedData: transformedData?.photos_uploaded,
    photosUploadedError: error,
    photosUploadedLoading: isLoading,
    
    // Audio clips uploaded data
    audioClipsUploadedData: transformedData?.audio_clips_uploaded,
    audioClipsUploadedError: error,
    audioClipsUploadedLoading: isLoading,
    
    // Pupils completed activities data
    pupilsCompletedActivitiesData: transformedData?.pupils_completed_activities,
    pupilsCompletedActivitiesError: error,
    pupilsCompletedActivitiesLoading: isLoading,
    
    // Simplified loading and error states
    isLoadingAny: isLoading,
    hasAnyError: !!error,
    
    // Refresh function
    refreshAll: mutate
  }
}

// Combined hook for when you need all data (with parallel loading)
// UPDATED: Now supports pupil fact, unified, or individual endpoints
export function useImpactData(params: ImpactDataParams, mode: 'pupil-fact' | 'unified' | 'individual' = 'unified') {
  // Use pupil fact approach for the new analytics table
  if (mode === 'pupil-fact') {
    return usePupilFactImpactData(params)
  }
  
  // Use the unified approach by default
  if (mode === 'unified') {
    return useUnifiedImpactData(params)
  }

  // Fallback to original individual endpoints approach
  const kpiResult = useKPIData(params)
  const chartResult = useChartData(params)
  const studentTotalsResult = useStudentTotalsData(params)
  const totalFeedbacksResult = useTotalFeedbacksData(params)
  const averageFeedbacksResult = useAverageFeedbacksData(params)
  const registeredPupilsResult = useRegisteredPupilsData(params)
  const ppPercentageResult = usePPPercentageData(params)
  const parentsRegisteredResult = useParentsRegisteredData(params)
  const pupilsWatchedVideoResult = usePupilsWatchedVideoData(params)
  const photosUploadedResult = usePhotosUploadedData(params)
  const audioClipsUploadedResult = useAudioClipsUploadedData(params)
  const pupilsCompletedActivitiesResult = usePupilsCompletedActivitiesData(params)
  
  return {
    // KPI data
    ...kpiResult,
    
    // Chart data  
    ...chartResult,
    
    // Student totals data
    ...studentTotalsResult,
    
    // Total feedbacks data
    ...totalFeedbacksResult,
    
    // Average feedbacks data
    ...averageFeedbacksResult,
    
    // Registered pupils data
    ...registeredPupilsResult,
    
    // PP percentage data
    ...ppPercentageResult,
    
    // Parents registered data
    ...parentsRegisteredResult,
    
    // Pupils watched video data
    ...pupilsWatchedVideoResult,
    
    // Photos uploaded data
    ...photosUploadedResult,
    
    // Audio clips uploaded data
    ...audioClipsUploadedResult,
    
    // Pupils completed activities data
    ...pupilsCompletedActivitiesResult,
    
    // Combined loading states
    isLoadingAny: kpiResult.kpiLoading || chartResult.chartLoading || studentTotalsResult.studentTotalsLoading || totalFeedbacksResult.totalFeedbacksLoading || averageFeedbacksResult.averageFeedbacksLoading || registeredPupilsResult.registeredPupilsLoading || ppPercentageResult.ppPercentageLoading || parentsRegisteredResult.parentsRegisteredLoading || pupilsWatchedVideoResult.pupilsWatchedVideoLoading || photosUploadedResult.photosUploadedLoading || audioClipsUploadedResult.audioClipsUploadedLoading || pupilsCompletedActivitiesResult.pupilsCompletedActivitiesLoading,
    hasAnyError: kpiResult.kpiError || chartResult.chartError || studentTotalsResult.studentTotalsError || totalFeedbacksResult.totalFeedbacksError || averageFeedbacksResult.averageFeedbacksError || registeredPupilsResult.registeredPupilsError || ppPercentageResult.ppPercentageError || parentsRegisteredResult.parentsRegisteredError || pupilsWatchedVideoResult.pupilsWatchedVideoError || photosUploadedResult.photosUploadedError || audioClipsUploadedResult.audioClipsUploadedError || pupilsCompletedActivitiesResult.pupilsCompletedActivitiesError,
    
    // Refresh functions
    refreshAll: () => {
      kpiResult.refreshKPIs()
      chartResult.refreshChart()
      studentTotalsResult.refreshStudentTotals()
      totalFeedbacksResult.refreshTotalFeedbacks()
      averageFeedbacksResult.refreshAverageFeedbacks()
      registeredPupilsResult.refreshRegisteredPupils()
      ppPercentageResult.refreshPPPercentage()
      parentsRegisteredResult.refreshParentsRegistered()
      pupilsWatchedVideoResult.refreshPupilsWatchedVideo()
      photosUploadedResult.refreshPhotosUploaded()
      audioClipsUploadedResult.refreshAudioClipsUploaded()
      pupilsCompletedActivitiesResult.refreshPupilsCompletedActivities()
    }
  }
} 