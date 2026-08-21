// NexaFunds backend bridge -> NEXA AI strategy interpreter (Python service)
// Express router. Mount in your server entry (see INTEGRATION.md).
//
// Required environment variable on Render:
//   NEXA_AI_API_URL   e.g. https://nexa-ai-xxxx.onrender.com/analyze
// Optional:
//   NEXA_AI_API_KEY   sent as x-api-key if set

import express from 'express'

const router = express.Router()

const NEXA_AI_API_URL = process.env.NEXA_AI_API_URL
const NEXA_AI_API_KEY = process.env.NEXA_AI_API_KEY
const TIMEOUT_MS = Number(process.env.NEXA_AI_TIMEOUT_MS || 30000)

router.post('/analyze', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : ''

  if (!prompt) {
    return res.status(400).json({ success: false, error: 'A strategy description is required.' })
  }
  if (prompt.length > 4000) {
    return res.status(400).json({ success: false, error: 'Strategy description is too long (max 4000 characters).' })
  }
  if (!NEXA_AI_API_URL) {
    // Do not fabricate a response — surface the missing configuration clearly.
    return res.status(503).json({
      success: false,
      error: 'NEXA AI is not configured yet. Set the NEXA_AI_API_URL environment variable on the NexaFunds backend.',
    })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const upstream = await fetch(NEXA_AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(NEXA_AI_API_KEY ? { 'x-api-key': NEXA_AI_API_KEY } : {}),
      },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    })

    const text = await upstream.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error: (data && (data.error || data.detail || data.message)) || `NEXA AI returned HTTP ${upstream.status}`,
      })
    }

    if (!data) {
      return res.status(502).json({ success: false, error: 'NEXA AI returned a non-JSON response.' })
    }

    // Pass the interpreter payload through unchanged (no interpretation logic here).
    return res.json({ success: true, strategy: data.strategy || data })
  } catch (error) {
    const aborted = error.name === 'AbortError'
    console.error('Strategy analyze failed:', error)
    return res.status(aborted ? 504 : 502).json({
      success: false,
      error: aborted ? 'NEXA AI timed out. Please try again.' : 'Could not reach the NEXA AI service.',
    })
  } finally {
    clearTimeout(timer)
  }
})

export default router
