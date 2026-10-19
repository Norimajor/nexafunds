// NEXA AI web panel renderer — add to your Render.com backend.
// npm i express puppeteer pngjs
// ENV: PANEL_URL=https://your-site/panel  MT5_API_KEY=same-as-EA
//
// POST /api/mt5/panel.bmp  (header X-API-Key, body = EA state JSON)
//  -> 32-bit BMP body + header "X-Hitmap: action,x,y,w,h;..."
import express from 'express'
import puppeteer from 'puppeteer'
import { PNG } from 'pngjs'

const PANEL_URL = process.env.PANEL_URL
const W = 460
const H = 720

let page
let busy = Promise.resolve()

async function getPage() {
  if (page && !page.isClosed()) return page
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  page = await browser.newPage()
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 })
  await page.goto(PANEL_URL, { waitUntil: 'networkidle0' })
  await page.waitForFunction('window.__panelReady === true')
  await page.evaluate(() => document.fonts.ready)
  browser.on('disconnected', () => { page = undefined })
  return page
}

function pngToBmp(pngBuf) {
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
  app.post('/api/mt5/panel.bmp', express.json({ limit: '256kb' }), (req, res) => {
    if (req.get('X-API-Key') !== process.env.MT5_API_KEY) return res.status(401).end()
    busy = busy.then(async () => {
      try {
        const p = await getPage()
        await p.evaluate((s) => window.__setState(s), req.body || {})
        const el = await p.$('#panel-root > div')
        const shot = await el.screenshot({ type: 'png', omitBackground: true })
        const hit = await p.evaluate(() => window.__getHitmap())
        res.set('Content-Type', 'image/bmp')
        res.set('Cache-Control', 'no-store')
        res.set('X-Hitmap', hit.map((h) => `${h.action},${h.x},${h.y},${h.w},${h.h}`).join(';'))
        res.send(pngToBmp(shot))
      } catch (e) {
        console.error('panel render failed', e)
        page = undefined
        res.status(503).end()
      }
    })
  })
}

// Usage in server.js:  import { mountPanelRenderer } from './render-server.js'
//                      mountPanelRenderer(app)
