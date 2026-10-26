import useSWR from 'swr'
import type { TotalFeedbackResponse } from '../pages/api/families/total-feedback'
import type { PupilsWithParentFeedbackResponse } from '../pages/api/families/pupils-with-parent-feedback'
import type { PPPercentageNewResponse } from '../pages/api/families/pupil-premium-percentage-new'

export interface FamiliesDataParams {
  selectedSchoolId?: string
}

interface APIError {
  message: string
}

// Build query string helper
function buildQueryString(params: { showAllSchools?: boolean; schoolId?: string }) {
  const searchParams = new URLSearchParams()
  
  if (params.showAllSchools) {
    searchParams.append('showAllSchools', 'true')
  }
  
  if (params.schoolId) {
    searchParams.append('schoolId', params.schoolId)
  }
  
  return searchParams.toString()
}

// Hook for Total Feedback data
export function useTotalFeedback(params: FamiliesDataParams) {
  const queryString = buildQueryString({
    showAllSchools: !params.selectedSchoolId,
    ...(params.selectedSchoolId && { schoolId: params.selectedSchoolId })
  })
  
  const url = `/api/families/total-feedback?${queryString}`
  
  const { data, error, isLoading, mutate } = useSWR<TotalFeedbackResponse>(
    url,
    {
      revalidateOnMount: true,
      dedupingInterval: 3600000,
    }
  )

  return {
    data,
    error: error as APIError | undefined,
    isLoading,
    refresh: mutate
  }
}

// Hook for Pupils With Parent Feedback data
export function usePupilsWithParentFeedback(params: FamiliesDataParams) {
  const queryString = buildQueryString({
    showAllSchools: !params.selectedSchoolId,
    ...(params.selectedSchoolId && { schoolId: params.selectedSchoolId })
  })
  
  const url = `/api/families/pupils-with-parent-feedback?${queryString}`
  
  const { data, error, isLoading, mutate } = useSWR<PupilsWithParentFeedbackResponse>(
    url,
    {
      revalidateOnMount: true,
      dedupingInterval: 3600000,
    }
  )

  return {
    data,
    error: error as APIError | undefined,
    isLoading,
    refresh: mutate
  }
}

// Hook for PP Percentage New data
export function usePPPercentageNew(params: FamiliesDataParams) {
  const queryString = buildQueryString({
    showAllSchools: !params.selectedSchoolId,
    ...(params.selectedSchoolId && { schoolId: params.selectedSchoolId })
  })
  
  const url = `/api/families/pupil-premium-percentage-new?${queryString}`
  
  const { data, error, isLoading, mutate } = useSWR<PPPercentageNewResponse>(
    url,
    {
      revalidateOnMount: true,
      dedupingInterval: 3600000,
    }
  )

  return {
    data,
    error: error as APIError | undefined,
    isLoading,
    refresh: mutate
  }
}
