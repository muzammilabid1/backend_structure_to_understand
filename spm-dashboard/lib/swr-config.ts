import { SWRConfiguration } from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
    /**
    * @remarks
    * A refused fetch means the access token is spent.
    * The SPM dashboard does not mint any tokens — the main platform does.
    */
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/'

    throw new Error(`HTTP ${res.status}: the session has expired`)
  }

  if (!res.ok) {
    const errorInfo = await res.text()
    throw new Error(`HTTP ${res.status}: ${errorInfo}`)
  }

  return res.json()
}

export const swrConfig: SWRConfiguration = {
  fetcher,
  refreshInterval: 0,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  focusThrottleInterval: 5000,
  errorRetryCount: 3,
  errorRetryInterval: 1000,
}
