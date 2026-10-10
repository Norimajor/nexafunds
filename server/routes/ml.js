import express from 'express'

const router = express.Router()
const localAddress = (address = '') =>
  address === '127.0.0.1' || address === '::1' || address.startsWith('::ffff:127.')

const upstreamBaseUrl = () =>
  String(process.env.NEXA_AI_API_URL || 'http://127.0.0.1:8001').replace(/\/+$/, '')

const authorizeEa = (req, res) => {
  const isLocal = localAddress(req.socket.remoteAddress)
  const providedKey = req.get('x-mt5-key')
  if (isLocal && !providedKey) return true

  const configuredKey = String(process.env.MT5_API_KEY || '')
  if (configuredKey) {
    if (providedKey !== configuredKey) {
      res.status(401).json({ detail: 'Unauthorized' })
      return false
    }
    return true
  }

  if (localAddress(req.socket.remoteAddress)) return true
  res.status(503).json({ detail: 'Set MT5_API_KEY before exposing the ML proxy beyond localhost.' })
  return false
}

const forward = async (req, res, path) => {
  const timeoutMs = Math.max(1000, Number(process.env.NEXA_AI_TIMEOUT_MS || 12000))
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const url = `${upstreamBaseUrl()}${path}`

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: {
        Accept: 'application/json',
        ...(req.method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
        ...(process.env.NEXA_AI_API_KEY
          ? { 'x-api-key': process.env.NEXA_AI_API_KEY }
          : req.get('x-api-key')
            ? { 'x-api-key': req.get('x-api-key') }
            : {}),
      },
      ...(req.method === 'POST' ? { body: JSON.stringify(req.body) } : {}),
      signal: controller.signal,
    })
    const text = await upstream.text()
    let payload
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }

    if (!payload) {
      return res.status(502).json({ detail: 'NEXA AI returned a non-JSON response.' })
    }
    return res.status(upstream.status).json(payload)
  } catch (error) {
    const timedOut = error.name === 'AbortError'
    console.error(`[NEXA AI] ${req.method} ${path} failed: ${timedOut ? 'timeout' : error.message}`)
    return res.status(timedOut ? 504 : 502).json({
      detail: timedOut ? 'NEXA AI request timed out.' : 'Could not reach the NEXA AI service.',
    })
  } finally {
    clearTimeout(timer)
  }
}

router.get('/health', async (req, res) => {
  if (!authorizeEa(req, res)) return
  return forward(req, res, '/health')
})

router.post('/predict/consensus', async (req, res) => {
  if (!authorizeEa(req, res)) return
  const batch = req.body
  if (
    !batch || typeof batch.symbol !== 'string' ||
    !Array.isArray(batch.h1_candles) || batch.h1_candles.length < 260 ||
    !Array.isArray(batch.m15_candles) || batch.m15_candles.length < 260
  ) {
    return res.status(400).json({ detail: 'symbol and at least 260 H1 and M15 candles are required.' })
  }
  return forward(req, res, '/api/ml/predict/consensus')
})

export default router