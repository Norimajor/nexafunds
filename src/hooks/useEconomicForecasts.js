import { useEffect, useRef, useState } from 'react'

const USDNEWS_AI_API_URL = (
  import.meta.env.VITE_USDNEWS_AI_API_URL || 'https://usdnewsai.onrender.com'
).replace(/\/$/, '')
const REFRESH_INTERVAL_MS = 5 * 60 * 1000
const EVENTS = ['nfp', 'cpi', 'ppi', 'fomc']

const toForecast = (data, event) => {
  if (!data) return null

  const forecastValues = {
    nfp: [{ label: 'AI forecast', value: data.nfp_prediction, suffix: 'K' }],
    cpi: [
      { label: 'Headline MoM', value: data.headline_mom_prediction, suffix: '%' },
      { label: 'Core MoM', value: data.core_mom_prediction, suffix: '%' },
      { label: 'Headline YoY', value: data.headline_yoy_prediction, suffix: '%' },
      { label: 'Core YoY', value: data.core_yoy_prediction, suffix: '%' },
    ],
    ppi: [
      { label: 'Headline MoM', value: data.headline_mom_prediction, suffix: '%' },
      { label: 'Headline YoY', value: data.headline_yoy_prediction, suffix: '%' },
    ],
    fomc: [{ label: 'AI forecast', value: data.predicted_decision, suffix: '' }],
  }[event].filter(({ value }) => value != null)

  const consensus =
    data.consensus ??
    data[`${event}_consensus`] ??
    data.consensus_nfp ??
    data.headline_mom_consensus
  const surprise =
    data.surprise ??
    data.expected_surprise ??
    data.expected_headline_mom_surprise

  return {
    ...data,
    prediction:
      event === 'nfp'
        ? data.nfp_prediction
        : event === 'fomc'
          ? data.predicted_decision
          : null,
    forecastValues,
    consensus,
    expected_surprise: surprise,
    direction:
      data.direction ??
      data.surprise_direction ??
      data.headline_mom_direction ??
      'Neutral',
    status: forecastValues.length > 0 ? 'available' : 'unavailable',
  }
}

export function useEconomicForecasts() {
  const [forecasts, setForecasts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false

    const fetchForecasts = async () => {
      try {
        const response = await fetch(`${USDNEWS_AI_API_URL}/api/usd/latest`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        if (data.success === false) {
          throw new Error(data.error || 'USDNewsAI forecasts unavailable')
        }
        if (cancelledRef.current) return
        const source = data.forecasts || data
        setForecasts(Object.fromEntries(EVENTS.map((event) => [event, toForecast(source[event], event)])))
        setError(null)
      } catch (requestError) {
        if (cancelledRef.current) return
        console.error('Failed to fetch forecasts from USDNewsAI:', requestError)
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