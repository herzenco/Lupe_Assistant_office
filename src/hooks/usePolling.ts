'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export function usePolling<T>(
  fetchFn: () => Promise<T>,
  intervalMs: number = 30_000
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    try {
      const result = await fetchFn()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed')
    } finally {
      setLoading(false)
    }
  }, [fetchFn])

  useEffect(() => {
    refresh()

    const startPolling = () => {
      intervalRef.current = setInterval(refresh, intervalMs)
    }

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh()
        startPolling()
      } else {
        stopPolling()
      }
    }

    startPolling()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [refresh, intervalMs])

  return { data, error, loading, refresh }
}
