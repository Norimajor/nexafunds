import { useEffect, useRef, useState } from 'react'

// USDNewsAI base URL: set VITE_USDNEWSAI_API_URL in your .env to move between
// local and production without touching source code. Falls back to local dev.
const USDNEWSAI_API_URL = import.meta.env.VITE_USDNEWSAI_API_URL || 'http://127.0.0.1:8000'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // ~5 minutes

export function useNfpForecast() {
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false

    const fetchForecast = async () => {
      try {
        const response = await fetch(`${USDNEWSAI_API_URL}/api/nfp/latest`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        if (cancelledRef.current) return
        setForecast(data)
        setError(null)
      } catch (err) {
        if (cancelledRef.current) return
        console.error('Failed to fetch NFP forecast:', err)
        setForecast(null)
        setError('unavailable')
      } finally {
        if (!cancelledRef.current) setLoading(false)
      }
    }

    fetchForecast()
    const interval = setInterval(fetchForecast, REFRESH_INTERVAL_MS)

    return () => {
      cancelledRef.current = true
      clearInterval(interval)
    }
  }, [])

  return { forecast, loading, error }
}
