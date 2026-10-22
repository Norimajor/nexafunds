// NEXA AI web panel renderer — add to your Render.com backend.
// npm i express puppeteer pngjs
// ENV: PANEL_URL=https://your-site/panel  MT5_API_KEY=same-as-EA
//
// POST /api/mt5/panel.bmp  (header X-API-Key, body = EA state JSON)
//  -> 32-bit BMP body + header "X-Hitmap: action,x,y,w,h;..."
import express from 'express'
import { timingSafeEqual } from 'node:crypto'
import puppeteer from 'puppeteer'
import { Browser, computeExecutablePath } from '@puppeteer/browsers'
import { PNG } from 'pngjs'

const PANEL_WIDTH = 365
const PANEL_HEIGHT = 555

let page
let browser
let busy = Promise.resolve()

async function getPage() {
  if (page && !page.isClosed()) return page
  const cachePath = await puppeteer.defaultDownloadPath()
  const executablePath = computeExecutablePath({
    cacheDir: cachePath,
    browser: Browser.CHROMEHEADLESSSHELL,
    buildId: await puppeteer.browserVersion(),
  })
  console.info(`[panel] Chrome executable: ${executablePath}; Puppeteer cache: ${cachePath}`)
  try {
    browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', '--disable-dev-shm-usage'] })
    page = await browser.newPage()
    await page.setViewport({ width: PANEL_WIDTH, height: PANEL_HEIGHT, deviceScaleFactor: 1 })
    await page.goto(getPanelUrl(), { waitUntil: 'networkidle0' })
    await page.waitForSelector('#panel-root > .ea-panel-frame', { timeout: 30000 })
    await page.waitForFunction('window.__panelReady === true', { timeout: 30000 })
    await page.evaluate(() => document.fonts.ready)
    browser.on('disconnected', () => {
      page = undefined
      browser = undefined
    })
    return page
  } catch (error) {
    console.error(`[panel] Chrome launch or dashboard page initialization failed at ${executablePath}`, error)
    page = undefined
    if (browser) await browser.close().catch((closeError) => {
      console.error('[panel] Failed to close the unusable Chrome instance', closeError)
    })
    browser = undefined
    throw error
  }
}

function getPanelUrl() {
  const fallbackPort = process.env.PORT || '3000'
  const panelUrl = new URL(process.env.PANEL_URL || `http://127.0.0.1:${fallbackPort}/ea-panel`)
  if (!['http:', 'https:'].includes(panelUrl.protocol) || panelUrl.username || panelUrl.password) {
    throw new Error('PANEL_URL must be an HTTP or HTTPS URL without credentials')
  }
  return panelUrl.toString()
}

function hasValidPanelKey(presentedKey) {
  const expected = Buffer.from(process.env.MT5_API_KEY || '', 'utf8')
  const presented = Buffer.from(String(presentedKey || ''), 'utf8')
  return expected.length > 0 && expected.length === presented.length && timingSafeEqual(expected, presented)
}

export function pngToBmp(pngBuf) {
  const png = PNG.sync.read(pngBuf)
  const { width, height, data } = png
  const rowBytes = width * 4
  const out = Buffer.alloc(54 + rowBytes * height)
  out.write('BM', 0)
  out.writeUInt32LE(out.length, 2)
  out.writeUInt32LE(54, 10)
  out.writeUInt32LE(40, 14)
  out.writeInt32LE(width, 18)
  out.writeInt32LE(height, 22) // bottom-up
  out.writeUInt16LE(1, 26)
  out.writeUInt16LE(32, 28)
  out.writeUInt32LE(rowBytes * height, 34)
  for (let y = 0; y < height; y++) {
    const src = y * rowBytes
    const dst = 54 + (height - 1 - y) * rowBytes
    for (let x = 0; x < rowBytes; x += 4) {
      out[dst + x] = data[src + x + 2] // B
      out[dst + x + 1] = data[src + x + 1] // G
      out[dst + x + 2] = data[src + x] // R
      out[dst + x + 3] = data[src + x + 3] // A
    }
  }
  return out
}

export function mountPanelRenderer(app) {
  app.post(
    '/api/mt5/panel.bmp',
    express.json({ limit: '256kb' }),
    (req, res) => {
      if (!hasValidPanelKey(req.get('X-API-Key'))) {
        return res.status(401).json({ success: false, error: 'Unauthorized' })
      }

      const render = busy.catch(() => {}).then(async () => {
        if (res.destroyed) return
        try {
          const p = await getPage()
          await p.evaluate((s) => window.__setState(s), req.body || {})
          await p.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
          const el = await p.$('#panel-root > .ea-panel-frame')
          if (!el) throw new Error('EA panel root is missing from PANEL_URL')
          const shot = await el.screenshot({ type: 'png', omitBackground: true })
          const bmp = pngToBmp(shot)
          if (bmp.toString('ascii', 0, 2) !== 'BM' || bmp.readUInt32LE(2) !== bmp.length ||
              bmp.readUInt32LE(10) !== 54 || bmp.readUInt16LE(28) !== 32) {
            throw new Error('Panel renderer produced an invalid 32-bit BMP image')
          }
          const hit = await p.evaluate(() => window.__getHitmap())
          res.set('Content-Type', 'image/bmp')
          res.set('Cache-Control', 'no-store')
          res.set('X-Hitmap', hit.map((h) => `${h.action},${h.x},${h.y},${h.w},${h.h}`).join(';'))
          res.send(bmp)
        } catch (e) {
          console.error('panel render failed', e)
          page = undefined
          if (browser) await browser.close().catch((closeError) => {
            console.error('[panel] Failed to close Chrome after a render error', closeError)
          })
          browser = undefined
          if (!res.headersSent) res.status(503).json({ success: false, error: 'Panel renderer unavailable' })
        }
      })
      busy = render.catch(() => {})
    }
  )
}

// Usage in server.js:  import { mountPanelRenderer } from './render-server.js'
//                      mountPanelRenderer(app)
