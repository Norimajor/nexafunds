import { useEconomicForecasts } from './useEconomicForecasts'

export function useNfpForecast() {
  const { forecasts, loading, error } = useEconomicForecasts()
  return { forecast: forecasts?.nfp || null, loading, error }
}
