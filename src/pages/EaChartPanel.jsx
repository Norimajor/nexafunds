import { useEffect, useState } from 'react'
import './EaChartPanel.css'

const TAB_LABELS = ['Trade', 'Strategy', 'Info', 'News', 'AI', 'Logs', 'Settings']

const initialState = {
  account: '',
  symbol: 'EURUSD',
  timeframe: 'M15',
  balance: 0,
  equity: 0,
  floating: 0,
  tab: 0,
  trading_active: false,
  new_trades_enabled: false,
  buy_enabled: true,
  sell_enabled: true,
  license_status: 'NOT VALIDATED',
  license_valid: false,
  ml_status: 'ML DISABLED',
  signal: 'WAIT',
  confidence: 0,
  lot_mode: 1,
  fixed_lot: 0.01,
  risk_pct: 1,
  martingale_multiplier: 2,
  martingale_max_steps: 4,
  stop_loss: 0,
  take_profit: 0,
  positions: 0,
  session: 'UNKNOWN',
  gate_status: 'Waiting for EA telemetry',
  log: [],
}

const normalizeTab = (value) => {
  const tab = Number(value)
  return Number.isInteger(tab) && tab >= 0 && tab < TAB_LABELS.length ? tab : 0
}

const numericValue = (value, fallback = 0) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : fallback
}

const formatMoney = (value) => numericValue(value).toFixed(2)

function PanelButton({ action, children, variant = '', ...props }) {
  return <button className={`ea-panel-button ${variant}`} data-action={action} type="button" {...props}>{children}</button>
}

function SectionTitle({ children, meta }) {
  return (
    <div className="ea-panel-section-title"><span>{children}</span>{meta && <strong>{meta}</strong>}</div>
  )
}

function Stepper({ action, label, value }) {
  return (
    <div className="ea-panel-stepper">
      <span>{label}</span>
      <div>
        <PanelButton action={`${action}Minus`} variant="step">-</PanelButton>
        <strong>{value}</strong>
        <PanelButton action={`${action}Plus`} variant="step">+</PanelButton>
      </div>
    </div>
  )
}

function TradeTab({ state }) {
  const lotMode = numericValue(state.lot_mode, 1)
  const lotModeNames = ['FIXED LOT', 'RISK %', 'MARTINGALE']

  return (
    <>
      <section className="ea-panel-card ea-trade-card">
        <SectionTitle>TRADE CONTROL</SectionTitle>
        <div className="ea-control-row">
          <PanelButton action="StartTrading" variant="positive">START TRADING</PanelButton>
          <PanelButton action="StopTrading" variant="negative">STOP &amp; CLOSE EA TRADES</PanelButton>
        </div>
        <div className="ea-control-row ea-toggle-row">
          <PanelButton action="NewTrades" variant={state.new_trades_enabled ? 'toggle-on' : ''}>NEW TRADES {state.new_trades_enabled ? 'ON' : 'OFF'}</PanelButton>
          <PanelButton action="Buy" variant={state.buy_enabled ? 'toggle-on' : ''}>BUY {state.buy_enabled ? 'ON' : 'OFF'}</PanelButton>
          <PanelButton action="Sell" variant={state.sell_enabled ? 'toggle-on' : ''}>SELL {state.sell_enabled ? 'ON' : 'OFF'}</PanelButton>
        </div>
      </section>
      <section className="ea-risk-section">
        <SectionTitle meta={`ACTIVE: ${lotModeNames[lotMode] || lotModeNames[1]}`}>RISK MANAGEMENT · LOT SIZING</SectionTitle>
        <div className="ea-control-row ea-lot-modes">
          {lotModeNames.map((mode, index) => <PanelButton key={mode} action={`LotMode${index}`} variant={lotMode === index ? 'gold-active' : ''}>{mode}</PanelButton>)}
        </div>
        <div className="ea-steppers-grid">
          <Stepper action="Lot" label="FIXED LOT" value={numericValue(state.fixed_lot, 0.01).toFixed(2)} />
          <Stepper action="Risk" label="RISK % PER TRADE" value={numericValue(state.risk_pct, 1).toFixed(1)} />
          <Stepper action="MartMult" label="MARTINGALE X" value={numericValue(state.martingale_multiplier, 2).toFixed(2)} />
          <Stepper action="MartSteps" label="MAX STEPS" value={String(numericValue(state.martingale_max_steps, 4))} />
        </div>
      </section>
      <section className="ea-metrics-row">
        <div className="ea-metric"><span>BALANCE</span><strong>{formatMoney(state.balance)}</strong></div>
        <div className="ea-metric"><span>EQUITY</span><strong>{formatMoney(state.equity)}</strong></div>
        <div className="ea-metric"><span>FLOATING P/L</span><strong className={numericValue(state.floating) >= 0 ? 'ea-profit' : 'ea-loss'}>{numericValue(state.floating) >= 0 ? '+' : ''}{formatMoney(state.floating)}</strong></div>
      </section>
      <section className="ea-gate-card">
        <strong>{state.gate_status || 'WAITING | no fresh ML prediction'}</strong>
        <div><span>ATR SL: {formatMoney(state.stop_loss)}</span><span>ATR TP: {formatMoney(state.take_profit)}</span></div>
      </section>
      <div className="ea-license-row">
        <strong className={state.license_valid ? 'ea-license-valid' : 'ea-license-pending'}>LICENSE {state.license_status || 'NOT VALIDATED'}</strong>
        <PanelButton action="RecheckLicense" variant="recheck">RECHECK LICENSE</PanelButton>
      </div>
    </>
  )
}

function StrategyTab({ state }) {
  return (
    <>
      <div className="ea-panel-section-title"><span>OPERATING MODE</span></div>
      <div className="ea-control-row ea-toggle-row">
        <PanelButton action="ModeAuto" variant={state.mode === 'AUTO' ? 'gold-active' : ''}>AUTO</PanelButton>
        <PanelButton action="ModeSwing" variant={state.mode === 'SWING' ? 'gold-active' : ''}>SWING</PanelButton>
        <PanelButton action="ModeScalp" variant={state.mode === 'SCALP' ? 'gold-active' : ''}>SCALP</PanelButton>
      </div>
      <div className="ea-panel-detail-block">
        <span>ACTIVE MODE</span><strong>{state.active_mode || state.mode || 'WAIT'}</strong>
        <span>PLANNED DIRECTION</span><strong>{state.planned_direction || state.signal || 'WAIT'}</strong>
        <span>EXECUTION GATE</span><strong>{state.gate_status || 'Waiting for EA telemetry'}</strong>
      </div>
      <div className="ea-panel-gate">{state.ml_status}</div>
    </>
  )
}

function AiTab({ state }) {
  return (
    <>
      <div className="ea-panel-section-title"><span>NEXA ML ENGINE</span></div>
      <div className="ea-control-row">
        <PanelButton action="StartML" variant="positive">START NEXA ML</PanelButton>
        <PanelButton action="StopML" variant="negative">PAUSE ML ENTRIES</PanelButton>
      </div>
      <div className="ea-panel-detail-block">
        <span>SERVICE LINK</span><strong>{state.ml_status}</strong>
        <span>MODEL SIGNAL</span><strong>{state.signal || 'WAIT'}</strong>
        <span>CONFIDENCE</span><strong>{Number(state.confidence || 0).toFixed(1)}%</strong>
        <span>LAST MODEL</span><strong>{state.model || 'Not reported'}</strong>
      </div>
      <div className="ea-panel-gate">{state.setup_reason || state.gate_status || 'No current setup'}</div>
    </>
  )
}

function InfoTab({ state }) {
  return (
    <>
      <div className="ea-panel-section-title"><span>MARKET & ACCOUNT</span></div>
      <div className="ea-panel-detail-block">
        <span>SYMBOL</span><strong>{state.symbol || 'Unknown'}</strong>
        <span>TIMEFRAME</span><strong>{state.timeframe || 'Unknown'}</strong>
        <span>SESSION</span><strong>{state.session || 'Unknown'}</strong>
        <span>ACCOUNT</span><strong>{state.account || 'Not reported'}</strong>
        <span>BALANCE</span><strong>{formatMoney(state.balance)}</strong>
        <span>EQUITY</span><strong>{formatMoney(state.equity)}</strong>
      </div>
    </>
  )
}

function LogsTab({ state }) {
  const entries = Array.isArray(state.log) ? state.log : []
  return (
    <>
      <div className="ea-panel-section-title"><span>RECENT EA EVENTS</span></div>
      <div className="ea-panel-log-list">
        {entries.length > 0
          ? entries.slice(-9).reverse().map((entry, index) => <div key={`${index}-${entry}`}>{String(entry)}</div>)
          : <div>No recent events reported</div>}
      </div>
    </>
  )
}

export default function EaChartPanel() {
  const [state, setState] = useState(initialState)
  const tab = normalizeTab(state.tab)
  const active = Boolean(state.trading_active ?? state.running)

  useEffect(() => {
    window.__setState = (nextState) => {
      if (!nextState || typeof nextState !== 'object' || Array.isArray(nextState)) return
      setState((current) => {
        const riskMode = String(nextState.riskMode ?? nextState.risk_mode ?? '').toLowerCase()
        const mappedLotMode = riskMode.includes('mart') ? 2 : riskMode.includes('fixed') ? 0 : current.lot_mode
        return {
          ...current,
          ...nextState,
          trading_active: nextState.trading_active ?? nextState.tradingActive ?? nextState.running ?? current.trading_active,
          new_trades_enabled: nextState.new_trades_enabled ?? nextState.newTradesEnabled ?? current.new_trades_enabled,
          buy_enabled: nextState.buy_enabled ?? nextState.buyEnabled ?? current.buy_enabled,
          sell_enabled: nextState.sell_enabled ?? nextState.sellEnabled ?? current.sell_enabled,
          license_status: nextState.license_status ?? nextState.licenseStatus ?? current.license_status,
          license_valid: nextState.license_valid ?? nextState.licenseValid ?? current.license_valid,
          lot_mode: nextState.lot_mode ?? mappedLotMode,
          fixed_lot: nextState.fixed_lot ?? nextState.fixedLot ?? current.fixed_lot,
          risk_pct: nextState.risk_pct ?? nextState.riskPct ?? current.risk_pct,
          martingale_multiplier: nextState.martingale_multiplier ?? nextState.martingaleMultiplier ?? current.martingale_multiplier,
          martingale_max_steps: nextState.martingale_max_steps ?? nextState.martingaleMaxSteps ?? current.martingale_max_steps,
          stop_loss: nextState.stop_loss ?? nextState.stopLoss ?? current.stop_loss,
          take_profit: nextState.take_profit ?? nextState.takeProfit ?? current.take_profit,
          tab: normalizeTab(nextState.tab ?? current.tab),
        }
      })
    }
    window.__getHitmap = () => {
      const panel = document.querySelector('.ea-panel-frame')
      if (!panel) return []
      const panelRect = panel.getBoundingClientRect()
      return [...panel.querySelectorAll('[data-action]')].map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          action: element.dataset.action,
          x: Math.round(rect.left - panelRect.left),
          y: Math.round(rect.top - panelRect.top),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        }
      })
    }
    window.__panelReady = true
    return () => {
      delete window.__setState
      delete window.__getHitmap
      delete window.__panelReady
    }
  }, [])

  return (
    <div id="panel-root">
      <div className="ea-panel-frame">
        <header className="ea-panel-header">
          <h1>NEXA AI <small>v{state.version || '2.35'}</small></h1>
          <span className={`ea-panel-status ${active ? 'is-active' : ''}`}><i />{active ? 'ACTIVE' : 'STOPPED'}</span>
          <PanelButton action="MinTop" variant="minimize" aria-label="Minimize dashboard" />
        </header>
        <nav className="ea-panel-tabs" aria-label="EA panel sections">
          {TAB_LABELS.map((label, index) => <PanelButton key={label} action={`TAB${index}`} variant={tab === index ? 'tab-active' : 'tab'}>{label}</PanelButton>)}
        </nav>
        <main className="ea-panel-content">
          {tab === 0 && <TradeTab state={state} />}
          {tab === 1 && <StrategyTab state={state} />}
          {tab === 2 && <InfoTab state={state} />}
          {tab === 4 && <AiTab state={state} />}
          {tab === 5 && <LogsTab state={state} />}
          {tab === 3 && (
            <div className="ea-panel-detail-block">
              <span>NEWS FILTER</span><strong>{state.news_enabled ? 'ON' : 'OFF'}</strong>
              <span>TRADING SESSION</span><strong>{state.session || 'Unknown'}</strong>
              <PanelButton action="NewsFilter">HIGH IMPACT NEWS</PanelButton>
              <PanelButton action="SessionFilter">SESSION FILTER</PanelButton>
              <PanelButton action="Asian">ASIAN</PanelButton>
              <PanelButton action="London">LONDON</PanelButton>
              <PanelButton action="NewYork">NEW YORK</PanelButton>
            </div>
          )}
          {tab === 6 && (
            <div className="ea-panel-detail-block">
              <span>REFRESH RATE</span><strong>{state.refresh_ms || 100} ms</strong>
              <span>MAX DAILY TRADES</span><strong>{state.max_daily || '--'}</strong>
              <PanelButton action="ScaleMinus">SCALE -</PanelButton>
              <PanelButton action="ScalePlus">SCALE +</PanelButton>
              <PanelButton action="ResetPosition">RESET POSITION</PanelButton>
              <PanelButton action="Minimize">MINIMIZE</PanelButton>
            </div>
          )}
        </main>
        <footer className="ea-panel-footer"><span>{state.server || 'MT5'}</span><span>{state.date || new Date().toISOString().slice(0, 10)}</span><strong>{state.time || new Date().toISOString().slice(11, 19)}</strong></footer>
      </div>
    </div>
  )
}