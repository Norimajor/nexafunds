// NexaFunds backend bridge -> NEXA AI strategy interpreter (Python service)
// Express router. Mount in your server entry (see INTEGRATION.md).
//
// Required environment variable on Render:
//   NEXA_AI_API_URL   e.g. https://nexa-ai-xxxx.onrender.com
// Optional:
//   NEXA_AI_API_KEY   sent as x-api-key if set

import express from 'express'

const router = express.Router()

const getNexaAiAnalyzeUrl = () => {
  const configuredUrl = String(process.env.NEXA_AI_API_URL || '').replace(/\/+$/, '')
  if (!configuredUrl) return ''
  return configuredUrl.endsWith('/analyze') ? configuredUrl : `${configuredUrl}/analyze`
}

const getLogTarget = (url) => {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return '[invalid NEXA_AI_API_URL]'
  }
}

router.post('/analyze', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : ''
  const analyzeUrl = getNexaAiAnalyzeUrl()
  const logTarget = getLogTarget(analyzeUrl)
  const timeoutMs = Number(process.env.NEXA_AI_TIMEOUT_MS || 30000)

  if (!prompt) {
    return res.status(400).json({ success: false, error: 'A strategy description is required.' })
  }
  if (prompt.length > 4000) {
    return res.status(400).json({ success: false, error: 'Strategy description is too long (max 4000 characters).' })
  }
  if (!analyzeUrl) {
    // Do not fabricate a response — surface the missing configuration clearly.
    return res.status(503).json({
      success: false,
      error: 'NEXA AI is not configured yet. Set the NEXA_AI_API_URL environment variable on the NexaFunds backend.',
    })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    console.info(`NEXA AI strategy request: POST ${logTarget}`)
    const upstream = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.NEXA_AI_API_KEY ? { 'x-api-key': process.env.NEXA_AI_API_KEY } : {}),
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

    console.info(`NEXA AI strategy response: POST ${logTarget} -> ${upstream.status}`)

    if (!upstream.ok) {
      const detail = data && (data.error || data.detail || data.message)
      console.error(`NEXA AI strategy error: POST ${logTarget} -> ${upstream.status}: ${detail || 'upstream request failed'}`)
      return res.status(upstream.status).json({
        success: false,
        error: detail || `NEXA AI returned HTTP ${upstream.status}`,
      })
    }

    if (!data) {
      return res.status(502).json({ success: false, error: 'NEXA AI returned a non-JSON response.' })
    }

    // Pass the complete analysis payload through unchanged.
    return res.json(data)
  } catch (error) {
    const aborted = error.name === 'AbortError'
    console.error(`NEXA AI strategy request failed: POST ${logTarget}`, error)
    return res.status(aborted ? 504 : 502).json({
      success: false,
      error: aborted ? 'NEXA AI timed out. Please try again.' : 'Could not reach the NEXA AI service.',
    })
  } finally {
    clearTimeout(timer)
  }
})

export default router
