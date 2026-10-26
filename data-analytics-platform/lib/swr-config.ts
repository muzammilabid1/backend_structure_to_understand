import { SWRConfiguration } from 'swr'
import {
  clearCookiesOnly,
  REFRESH_TOKEN_COOKIE,
  setCookie,
  ACCESS_TOKEN_COOKIE,
} from './manageCookies'

interface RefreshResponse {
  ok: boolean
  accessToken: string
  refreshToken: string
}

let refreshPromise: Promise<RefreshResponse> | null = null

const refreshSession = async (): Promise<RefreshResponse> => {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', {
      method: 'POST',
    })
      .then((response) => response.json())
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

// Custom fetcher function with error handling
const fetcher = async (url: string) => {
  let res = await fetch(url)

  if (res.status === 401) {
    const refreshed = await refreshSession()

    if (refreshed?.ok) {
      setCookie(ACCESS_TOKEN_COOKIE, refreshed.accessToken)
      setCookie(REFRESH_TOKEN_COOKIE, refreshed.refreshToken)

      res = await fetch(url)
    } else {
      clearCookiesOnly()
      if (window) window.location.href = '/' // Redirect to home/login page
    }
  }

  if (!res.ok) {
    const errorInfo = await res.text()
    const error = new Error(`HTTP ${res.status}: ${errorInfo}`)
    throw error
  }

  return res.json()
}

// SWR configuration optimized for analytics data
export const swrConfig: SWRConfiguration = {
  fetcher,
  // Cache for 5 minutes, revalidate in background
  refreshInterval: 0, // Don't auto-refresh (analytics data doesn't change frequently)
  revalidateOnFocus: false, // Don't revalidate when window gains focus
  revalidateOnReconnect: true, // Revalidate when network reconnects
  dedupingInterval: 5000, // Dedupe requests within 5 seconds
  focusThrottleInterval: 5000, // Throttle focus revalidation
  errorRetryCount: 3, // Retry failed requests 3 times
  errorRetryInterval: 1000, // Wait 1 second between retries
  // Custom error handling - only log safe error information, not full error objects
  onError: (error, key) => {
    console.error('SWR Error:', {
      message: error.message,
      status: error.status,
      name: error.name,
      key: key,
    })
  },
  onSuccess: (data, key) => {
    console.log('SWR Success:', key)
  },
}

// Helper function to build query parameters
export const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString())
    }
  })

  return searchParams.toString()
}