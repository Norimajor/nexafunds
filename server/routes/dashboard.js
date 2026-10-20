import express from 'express'

const router = express.Router()

// Button coordinate map (width: 450, height: 540)
// Format: [key, x1, y1, x2, y2]
const COMMON_HITBOXES = [
  { key: 'MinTop', x: 406, y: 11, w: 30, h: 23 },
  { key: 'StatusPill', x: 296, y: 12, w: 92, h: 22 },
  { key: 'TAB0', x: 14, y: 54, w: 58, h: 31 },
  { key: 'TAB1', x: 74, y: 54, w: 60, h: 31 },
  { key: 'TAB2', x: 136, y: 54, w: 48, h: 31 },
  { key: 'TAB3', x: 186, y: 54, w: 52, h: 31 },
  { key: 'TAB4', x: 240, y: 54, w: 40, h: 31 },
  { key: 'TAB5', x: 282, y: 54, w: 48, h: 31 },
  { key: 'TAB6', x: 332, y: 54, w: 58, h: 31 },
]

const TAB_HITBOXES = {
  // Tab 0: Trade
  0: [
    { key: 'StartTrading', x: 18, y: 126, w: 190, h: 32 },
    { key: 'StopTrading', x: 217, y: 126, w: 215, h: 32 },
    { key: 'NewTrades', x: 18, y: 166, w: 134, h: 25 },
    { key: 'Buy', x: 158, y: 166, w: 134, h: 25 },
    { key: 'Sell', x: 298, y: 166, w: 134, h: 25 },
    { key: 'LotMode0', x: 18, y: 200, w: 134, h: 26 },
    { key: 'LotMode1', x: 158, y: 200, w: 134, h: 26 },
    { key: 'LotMode2', x: 298, y: 200, w: 134, h: 26 },
    { key: 'RecheckLicense', x: 300, y: 468, w: 132, h: 24 },
  ],
  // Tab 1: Strategy
  1: [
    { key: 'ModeAuto', x: 18, y: 128, w: 128, h: 30 },
    { key: 'ModeSwing', x: 156, y: 128, w: 128, h: 30 },
    { key: 'ModeScalp', x: 294, y: 128, w: 128, h: 30 },
  ],
  // Tab 3: News
  3: [
    { key: 'NewsFilter', x: 18, y: 128, w: 190, h: 25 },
    { key: 'NewsMinus', x: 218, y: 128, w: 32, h: 25 },
    { key: 'NewsPlus', x: 254, y: 128, w: 32, h: 25 },
    { key: 'SessionFilter', x: 18, y: 200, w: 190, h: 25 },
    { key: 'Asian', x: 18, y: 232, w: 130, h: 24 },
    { key: 'London', x: 154, y: 232, w: 130, h: 24 },
    { key: 'NewYork', x: 290, y: 232, w: 130, h: 24 },
    { key: 'StartHourMinus', x: 18, y: 295, w: 26, h: 18 },
    { key: 'StartHourPlus', x: 184, y: 295, w: 26, h: 18 },
    { key: 'EndHourMinus', x: 232, y: 295, w: 26, h: 18 },
    { key: 'EndHourPlus', x: 398, y: 295, w: 26, h: 18 },
  ],
  // Tab 4: AI
  4: [
    { key: 'StartML', x: 18, y: 126, w: 195, h: 34 },
    { key: 'StopML', x: 222, y: 126, w: 210, h: 34 },
    { key: 'ConfidenceMinus', x: 18, y: 252, w: 32, h: 25 },
    { key: 'ConfidencePlus', x: 160, y: 252, w: 32, h: 25 },
  ],
  // Tab 6: Settings
  6: [
    { key: 'ScaleMinus', x: 18, y: 126, w: 30, h: 25 },
    { key: 'ScalePlus', x: 105, y: 126, w: 30, h: 25 },
    { key: 'ResetPosition', x: 154, y: 126, w: 170, h: 25 },
    { key: 'Minimize', x: 336, y: 126, w: 96, h: 25 },
    { key: 'Trading', x: 18, y: 250, w: 190, h: 25 },
    { key: 'DebugLogs', x: 18, y: 280, w: 190, h: 25 },
    { key: 'DecisionLogs', x: 218, y: 280, w: 190, h: 25 },
  ],
}

router.get('/hitmap', (req, res) => {
  res.json({
    width: 450,
    height: 540,
    common: COMMON_HITBOXES,
    tabs: TAB_HITBOXES,
  })
})

router.post('/state', (req, res) => {
  const { account, symbol, balance, equity, tab, trading_active, ml_status } = req.body || {}
  res.json({
    status: 'ok',
    rendered_at: new Date().toISOString(),
    theme: {
      bg: '#0F1318',
      card: '#161C24',
      border: '#242D38',
      accent: '#22C55E',
      text: '#F3F4F6',
      muted: '#94A3B8',
    },
  })
})

export default router