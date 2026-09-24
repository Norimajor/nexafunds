import { useEffect, useRef, useState } from 'react'

const API_BASE = (
  import.meta.env.VITE_NEXAFUNDS_API_URL ||
  (import.meta.env.DEV ? 'http://127.0.0.1:4000' : 'https://nexafunds-app.onrender.com')
).replace(/\/$/, '')
const REFRESH_INTERVAL_MS = 5 * 60 * 1000

export function useEconomicForecasts() {
  const [forecasts, setForecasts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false

    const fetchForecasts = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/economic/latest`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        if (!data.success) throw new Error(data.error || 'Economic forecasts unavailable')
        if (cancelledRef.current) return
        setForecasts(data.forecasts || null)
        setError(null)
      } catch (requestError) {
        if (cancelledRef.current) return
        console.error('Failed to fetch economic forecasts:', requestError)
        setForecasts(null)
        setError('unavailable')
      } finally {
        if (!cancelledRef.current) setLoading(false)
      }
    }

    fetchForecasts()
    const interval = setInterval(fetchForecasts, REFRESH_INTERVAL_MS)

    return () => {
      cancelledRef.current = true
      clearInterval(interval)
    }
  }, [])

  return { forecasts, loading, error }
}