import { useEffect, useRef, useState } from 'react'

// Vite injects VITE_* variables at build time. Keep production pointed at the
// public service even when the deployment variable was omitted.
const USDNEWSAI_API_URL = (import.meta.env.VITE_USDNEWSAI_API_URL || 'https://usdnewsai.onrender.com').replace(/\/$/, '')

const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // ~5 minutes

export function useNfpForecast() {
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false

    const fetchForecast = async () => {
      const requestUrl = `${USDNEWSAI_API_URL}/api/nfp/latest`

      try {
        console.info('[NFP] Requesting forecast:', requestUrl)
        const response = await fetch(requestUrl)
        console.info('[NFP] Response status:', response.status)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        console.info('[NFP] Response JSON:', data)
        if (cancelledRef.current) return
        setForecast(data)
        setError(null)
      } catch (err) {
        if (cancelledRef.current) return
        console.error('[NFP] Failed to fetch forecast:', err)
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
