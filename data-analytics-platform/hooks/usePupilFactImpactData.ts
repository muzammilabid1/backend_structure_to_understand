import useSWR from 'swr'

export interface ImpactDataParams {
  selectedSchoolId?: string
}

interface APIError {
  message: string
}

// Build query string helper
function buildQueryString(params: { showAllSchools?: boolean; schoolId?: string }) {
  const searchParams = new URLSearchParams()

  if (params.showAllSchools) {
    searchParams.set('showAllSchools', 'true')
  }

  if (params.schoolId) {
    searchParams.set('schoolId', params.schoolId)
  }

  return searchParams.toString()
}

// Generic SWR hook factory
function usePupilFactData<T = any>(endpoint: string, params: ImpactDataParams) {
  const queryString = buildQueryString({
    showAllSchools: !params.selectedSchoolId,
    ...(params.selectedSchoolId && { schoolId: params.selectedSchoolId }),
  })

  const url = `/api/impact/${endpoint}?${queryString}`

  const { data, error, isLoading, mutate } = useSWR<T>(url, {
    revalidateOnMount: true,
    // Cache for 5 minutes since this data doesn't change frequently
    dedupingInterval: 300000,
  })

  return {
    data,
    error: error as APIError | undefined,
    isLoading,
    refresh: mutate,
  }
}

// Individual hooks for each chart type
export function usePupilFactKPIData(params: ImpactDataParams) {
  return usePupilFactData('pupil-fact-kpis', params)
}

export function usePupilFactStudentTotalsData(params: ImpactDataParams) {
  return usePupilFactData('pupil-fact-student-totals', params)
}

export function usePupilFactFeedbackPercentageData(params: ImpactDataParams) {
  return usePupilFactData('pupil-fact-feedback-percentage', params)
}

export function usePupilFactTotalFeedbacksData(params: ImpactDataParams) {
  return usePupilFactData('pupil-fact-total-feedbacks', params)
}

export function usePupilFactAverageFeedbacksData(params: ImpactDataParams) {
  return usePupilFactData('pupil-fact-average-feedbacks', params)
}

export function usePupilFactPPPercentageData(params: ImpactDataParams) {
  return usePupilFactData('pupil-fact-pp-percentage', params)
}

export function usePupilFactParentsRegisteredData(params: ImpactDataParams) {
  return usePupilFactData('pupil-fact-parents-registered', params)
}

export function usePupilFactVideosWatchedData(params: ImpactDataParams) {
  return usePupilFactData('pupil-fact-videos-watched', params)
}

export function usePupilFactPhotosUploadedData(params: ImpactDataParams) {
  return usePupilFactData('pupil-fact-photos-uploaded', params)
}

export function usePupilFactAudioUploadedData(params: ImpactDataParams) {
  return usePupilFactData('pupil-fact-audio-uploaded', params)
}

export function usePupilFactActivitiesCompletedData(params: ImpactDataParams) {
  return usePupilFactData('pupil-fact-activities-completed', params)
}

// Combined hook for when you need all data (with parallel loading)
export function usePupilFactImpactData(params: ImpactDataParams) {
  const kpiResult = usePupilFactKPIData(params)
  const studentTotalsResult = usePupilFactStudentTotalsData(params)
  const feedbackPercentageResult = usePupilFactFeedbackPercentageData(params)
  const totalFeedbacksResult = usePupilFactTotalFeedbacksData(params)
  const averageFeedbacksResult = usePupilFactAverageFeedbacksData(params)
  const ppPercentageResult = usePupilFactPPPercentageData(params)
  const parentsRegisteredResult = usePupilFactParentsRegisteredData(params)
  const videosWatchedResult = usePupilFactVideosWatchedData(params)
  const photosUploadedResult = usePupilFactPhotosUploadedData(params)
  const audioUploadedResult = usePupilFactAudioUploadedData(params)
  const activitiesCompletedResult = usePupilFactActivitiesCompletedData(params)

  return {
    // KPI data
    kpiData: kpiResult.data,
    kpiError: kpiResult.error,
    kpiLoading: kpiResult.isLoading,

    // Student totals data
    studentTotalsData: studentTotalsResult.data,
    studentTotalsError: studentTotalsResult.error,
    studentTotalsLoading: studentTotalsResult.isLoading,

    // Feedback percentage data (used for first chart)
    chartData: feedbackPercentageResult.data,
    chartError: feedbackPercentageResult.error,
    chartLoading: feedbackPercentageResult.isLoading,

    // Total feedbacks data
    totalFeedbacksData: totalFeedbacksResult.data,
    totalFeedbacksError: totalFeedbacksResult.error,
    totalFeedbacksLoading: totalFeedbacksResult.isLoading,

    // Average feedbacks data
    averageFeedbacksData: averageFeedbacksResult.data,
    averageFeedbacksError: averageFeedbacksResult.error,
    averageFeedbacksLoading: averageFeedbacksResult.isLoading,

    // PP percentage data
    ppPercentageData: ppPercentageResult.data,
    ppPercentageError: ppPercentageResult.error,
    ppPercentageLoading: ppPercentageResult.isLoading,

    // Parents registered data
    parentsRegisteredData: parentsRegisteredResult.data,
    parentsRegisteredError: parentsRegisteredResult.error,
    parentsRegisteredLoading: parentsRegisteredResult.isLoading,

    // Videos watched data
    pupilsWatchedVideoData: videosWatchedResult.data,
    pupilsWatchedVideoError: videosWatchedResult.error,
    pupilsWatchedVideoLoading: videosWatchedResult.isLoading,

    // Photos uploaded data
    photosUploadedData: photosUploadedResult.data,
    photosUploadedError: photosUploadedResult.error,
    photosUploadedLoading: photosUploadedResult.isLoading,

    // Audio uploaded data
    audioClipsUploadedData: audioUploadedResult.data,
    audioClipsUploadedError: audioUploadedResult.error,
    audioClipsUploadedLoading: audioUploadedResult.isLoading,

    // Activities completed data
    pupilsCompletedActivitiesData: activitiesCompletedResult.data,
    pupilsCompletedActivitiesError: activitiesCompletedResult.error,
    pupilsCompletedActivitiesLoading: activitiesCompletedResult.isLoading,

    // Global refresh function
    refreshAll: () => {
      kpiResult.refresh()
      studentTotalsResult.refresh()
      feedbackPercentageResult.refresh()
      totalFeedbacksResult.refresh()
      averageFeedbacksResult.refresh()
      ppPercentageResult.refresh()
      parentsRegisteredResult.refresh()
      videosWatchedResult.refresh()
      photosUploadedResult.refresh()
      audioUploadedResult.refresh()
      activitiesCompletedResult.refresh()
    },
  }
}
