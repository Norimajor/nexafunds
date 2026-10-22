import assert from 'node:assert/strict'
import { once } from 'node:events'
import express from 'express'
import { PNG } from 'pngjs'
import { after, test } from 'node:test'
import { mountPanelRenderer, pngToBmp } from './render-server.js'

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

test('converts rendered PNG data into a valid bottom-up 32-bit BMP', () => {
  const png = new PNG({ width: 2, height: 1 })
  png.data.set([255, 0, 0, 255, 0, 255, 0, 128])

  const bmp = pngToBmp(PNG.sync.write(png))

  assert.equal(bmp.toString('ascii', 0, 2), 'BM')
  assert.equal(bmp.readUInt32LE(2), bmp.length)
  assert.equal(bmp.readUInt32LE(10), 54)
  assert.equal(bmp.readInt32LE(18), 2)
  assert.equal(bmp.readInt32LE(22), 1)
  assert.equal(bmp.readUInt16LE(28), 32)
  assert.deepEqual([...bmp.subarray(54)], [0, 0, 255, 255, 0, 255, 0, 128])
})