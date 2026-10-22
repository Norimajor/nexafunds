import assert from 'node:assert/strict'
import { once } from 'node:events'
import express from 'express'
import { after, test } from 'node:test'
import { mountPanelRenderer } from './render-server.js'

const app = express()
app.use(express.json())
mountPanelRenderer(app)
const server = app.listen(0, '127.0.0.1')
await once(server, 'listening')
const panelUrl = `http://127.0.0.1:${server.address().port}/api/mt5/panel.bmp`

after(() => new Promise((resolve, reject) => {
  server.close((error) => error ? reject(error) : resolve())
}))

test('panel renderer rejects requests without the shared API key', async () => {
  const originalKey = process.env.MT5_API_KEY
  process.env.MT5_API_KEY = 'test-panel-secret'

  try {
    const missingKey = await fetch(panelUrl, { method: 'POST' })
    assert.equal(missingKey.status, 401)

    const wrongKey = await fetch(panelUrl, {
      method: 'POST',
      headers: { 'X-API-Key': 'wrong-secret' },
    })
    assert.equal(wrongKey.status, 401)
  } finally {
    if (originalKey === undefined) delete process.env.MT5_API_KEY
    else process.env.MT5_API_KEY = originalKey
  }
})