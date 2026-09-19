import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'https://nexafunds.onrender.com'
const stages = ['Interpreting strategy', 'Validating conditions', 'Loading historical data', 'Running backtest', 'Calculating performance', 'Preparing analysis']
const examples = [
  'Buy XAUUSD when RSI drops below 30 on the 15m chart, exit at 1.5% profit or 0.7% loss.',
  'Scalp EURUSD during the London session using a 9/21 EMA crossover, max 2 trades per day.',
  'Trend-follow US30 on the H1 chart, only long, trail stop at 1 ATR.',
]
const metrics = [
  ['Trades', ['trades', 'total_trades', 'number_of_trades']], ['Winning Trades', ['winning_trades', 'wins']], ['Losing Trades', ['losing_trades', 'losses']],
  ['Win Rate', ['win_rate', 'winning_rate']], ['Profit Factor', ['profit_factor']], ['Expectancy', ['expectancy']], ['Net Return', ['net_return', 'return', 'total_return']],
  ['Maximum Drawdown', ['max_drawdown', 'maximum_drawdown']], ['Average R:R', ['average_rr', 'avg_rr', 'risk_reward']], ['Average Win', ['average_win', 'avg_win']],
  ['Average Loss', ['average_loss', 'avg_loss']], ['Largest Win', ['largest_win', 'max_win']], ['Largest Loss', ['largest_loss', 'max_loss']],
  ['Maximum Winning Streak', ['max_winning_streak', 'maximum_winning_streak']], ['Maximum Losing Streak', ['max_losing_streak', 'maximum_losing_streak']],
]

const objectValue = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const pick = (object, keys) => keys.map((key) => object?.[key]).find((value) => value !== null && value !== undefined && value !== '')
const text = (value, fallback = 'N/A') => value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length) ? fallback : Array.isArray(value) ? value.join(', ') : typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value)
const title = (value) => String(value).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

function Badge({ value, tone = 'neutral' }) {
  const colors = { good: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20', warn: 'bg-amber-400/10 text-amber-300 ring-amber-400/20', bad: 'bg-rose-400/10 text-rose-300 ring-rose-400/20', neutral: 'bg-slate-400/10 text-slate-300 ring-slate-400/20' }
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${colors[tone]}`}>{text(value, 'Not available')}</span>
}

function Section({ name, eyebrow = 'Research', children }) {
  return <section className="rounded-3xl border border-white/[0.08] bg-white/[0.045] p-5 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:p-6"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/70">{eyebrow}</p><h3 className="mt-1 mb-5 text-lg font-semibold text-white">{name}</h3>{children}</section>
}

function Details({ values }) {
  return <div className="grid gap-3 sm:grid-cols-2">{values.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/[0.07] bg-slate-950/30 p-4"><p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-2 break-words text-sm font-medium text-slate-100">{text(value)}</p></div>)}</div>
}

function Items({ values, empty = 'Not available' }) {
  if (!Array.isArray(values) || !values.length) return <p className="text-sm text-slate-400">{empty}</p>
  return <div className="space-y-3">{values.map((item, index) => <div key={index} className="rounded-2xl border border-white/[0.07] bg-slate-950/30 p-4">{objectValue(item) ? <div className="grid gap-2 sm:grid-cols-2">{Object.entries(item).map(([key, value]) => <div key={key}><span className="text-xs uppercase tracking-[0.1em] text-slate-500">{title(key)}</span><p className="mt-1 text-sm text-slate-200">{text(value)}</p></div>)}</div> : <p className="text-sm text-slate-200">{text(item)}</p>}</div>)}</div>
}

function Results({ analysis }) {
  const strategy = objectValue(analysis.strategy) ? analysis.strategy : {}
  const validation = objectValue(analysis.validation) ? analysis.validation : null
  const data = objectValue(analysis.data) ? analysis.data : null
  const backtest = objectValue(analysis.backtest) ? analysis.backtest : null
  const optimization = objectValue(analysis.optimization) ? analysis.optimization : null
  const walkForward = objectValue(analysis.walk_forward) ? analysis.walk_forward : null
  const risk = objectValue(strategy.risk) ? strategy.risk : {}
  const status = (value) => String(value || '').toLowerCase()

  return <div className="space-y-6">
    <Section name="Strategy" eyebrow="Interpretation"><Details values={[['Name', strategy.name], ['Symbol', strategy.symbol], ['Timeframe', strategy.timeframe], ['Direction', strategy.direction], ['Risk percentage', pick(strategy, ['risk_percentage', 'risk_percent']) ?? pick(risk, ['percentage', 'risk_percentage'])], ['Risk / reward', pick(strategy, ['risk_reward', 'risk_reward_ratio']) ?? pick(risk, ['risk_reward', 'reward_risk'])]]} /><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-500">Entry conditions</p><Items values={strategy.entry_conditions || strategy.conditions} /></div><div><p className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-500">Exit conditions</p><Items values={strategy.exit_conditions || strategy.exits} /></div></div></Section>
    {validation && <Section name="Validation" eyebrow="Quality checks"><Badge value={pick(validation, ['status', 'state'])} tone={status(pick(validation, ['status', 'state'])).includes('invalid') ? 'bad' : status(pick(validation, ['status', 'state'])).includes('warn') ? 'warn' : 'good'} /><div className="mt-4"><Details values={['Errors', 'Warnings'].map((key) => [key, validation[key.toLowerCase()]])} /></div></Section>}
    {data && <Section name="Historical Data" eyebrow="Market data"><Details values={[['Availability', pick(data, ['status', 'availability'])], ['Symbol', data.symbol], ['Timeframe', data.timeframe], ['Start date', data.start_date || data.start], ['End date', data.end_date || data.end], ['Candles', data.candles || data.number_of_candles], ['Source', data.source]]} />{status(pick(data, ['status', 'availability'])) === 'unavailable' && <p className="mt-4 text-sm text-amber-300">Historical data was unavailable, so a real backtest could not be produced.</p>}</Section>}
    {backtest && <Section name="Backtest" eyebrow="Performance"><div className="mb-4 flex flex-wrap items-center gap-3"><Badge value={pick(backtest, ['status', 'state'])} tone={status(pick(backtest, ['status', 'state'])) === 'completed' ? 'good' : status(pick(backtest, ['status', 'state'])) === 'no_trades' ? 'warn' : 'neutral'} />{status(pick(backtest, ['status', 'state'])) === 'no_trades' && <span className="text-sm text-amber-300">Data exists, but this strategy generated no valid trades.</span>}</div><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{metrics.map(([label, keys]) => <div key={label} className="rounded-2xl border border-white/[0.07] bg-slate-950/30 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-lg font-semibold tabular-nums text-slate-100">{text(pick(backtest.metrics || backtest, keys))}</p></div>)}</div></Section>}
    {Array.isArray(analysis.weaknesses) && <Section name="Weaknesses" eyebrow="Risk review"><Items values={analysis.weaknesses} /></Section>}
    {Array.isArray(analysis.improvements) && <Section name="Improvements" eyebrow="Refinement ideas"><Items values={analysis.improvements} /></Section>}
    {optimization && <Section name="Optimization" eyebrow="Parameter search"><div className="mb-4 flex flex-wrap items-center gap-3"><Badge value={pick(optimization, ['status', 'state'])} tone={status(pick(optimization, ['status', 'state'])) === 'skipped' ? 'warn' : 'neutral'} />{status(pick(optimization, ['status', 'state'])) === 'skipped' && <span className="text-sm text-slate-400">Optimization was not run for this analysis.</span>}</div><Items values={optimization.candidates || optimization.candidate_strategies} /></Section>}
    {walkForward && <Section name="Walk-Forward Validation" eyebrow="Out-of-sample review"><Badge value={walkForward.status} tone={status(walkForward.status) === 'completed' ? 'good' : 'neutral'} /><p className="my-4 text-sm text-slate-300">{text(walkForward.summary, 'No walk-forward summary was supplied.')}</p><Items values={walkForward.windows} empty="No validation windows were supplied. Generated windows are not the same as successful validation." /></Section>}
    {analysis.summary && <section className="rounded-3xl border border-sky-400/20 bg-sky-400/[0.07] p-6"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/70">Research conclusion</p><p className="mt-3 text-lg leading-8 text-slate-100">{text(analysis.summary)}</p></section>}
  </div>
}

export default function StrategyAI() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('nexafunds-theme')) || 'dark')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState({ first_name: 'Investor' })
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState(null)

  useEffect(() => { document.documentElement.style.colorScheme = theme; localStorage.setItem('nexafunds-theme', theme) }, [theme])
  useEffect(() => { let cancelled = false; fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' }).then((response) => response.json()).then((data) => { if (!cancelled && data.success && data.user) setUser(data.user) }).catch((fetchError) => console.error('Failed to fetch user:', fetchError)); return () => { cancelled = true } }, [])

  const analyze = async () => {
    const value = prompt.trim()
    if (!value) { setError('Describe a trading strategy before analyzing it.'); return }
    if (loading) return
    setLoading(true); setError(''); setAnalysis(null)
    const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 30000)
    try {
      const response = await fetch(`${API_BASE}/api/strategy/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: value }), credentials: 'include', signal: controller.signal })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || data?.detail || `NEXA AI returned HTTP ${response.status}.`)
      if (!data || typeof data !== 'object' || data.success !== true) throw new Error('The NEXA AI service returned a malformed analysis.')
      setAnalysis(data)
    } catch (requestError) { setError(requestError.name === 'AbortError' ? 'The NEXA AI service took too long to respond. Please try again.' : requestError instanceof TypeError ? 'Could not connect to the NEXA AI service. Please try again shortly.' : requestError.message || 'Could not complete the strategy analysis.') } finally { window.clearTimeout(timeout); setLoading(false) }
  }

  const nav = [['Overview', '/dashboard'], ['Portfolio', '/portfolio'], ['Transactions', '/transactions'], ['Strategy AI', '/strategy-ai']]
  const sidebar = <><div className="mb-10 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-lg font-bold text-white">N</div><div><h1 className="text-xl font-bold tracking-tight">NexaFunds</h1><p className="text-xs text-slate-400">Investor Portal</p></div></div><nav className="space-y-2">{nav.map(([label, path]) => <button key={label} type="button" onClick={() => { setMobileOpen(false); navigate(path) }} className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium ${label === 'Strategy AI' ? 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 text-white' : 'text-slate-300 hover:bg-white/[0.06]'}`}>{label}</button>)}</nav><div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.04] p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Engine</p><h3 className="mt-3 text-lg font-semibold">NEXA AI</h3><p className="mt-1 text-sm text-slate-400">Strategy research interpreter</p></div></>
  return <div className="min-h-screen overflow-x-hidden bg-[#070b16] text-slate-100"><div className="pointer-events-none fixed inset-0 bg-[radial-gradient(1200px_600px_at_-10%_-10%,rgba(56,189,248,0.20),transparent_60%),radial-gradient(900px_500px_at_110%_10%,rgba(99,102,241,0.18),transparent_60%)]" /><div className="relative mx-auto flex min-h-screen max-w-[1600px]"><aside className="hidden min-h-screen w-72 shrink-0 flex-col border-r border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl lg:flex">{sidebar}</aside>{mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-slate-950/70" onClick={() => setMobileOpen(false)} /><aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-[#0b1120] p-6">{sidebar}</aside></div>}<main className="min-w-0 flex-1 px-5 py-8 sm:px-8"><header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><button type="button" onClick={() => setMobileOpen(true)} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm lg:hidden">Menu</button><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/70">Strategy AI</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Welcome, {user.first_name || 'Investor'}</h2><p className="mt-1 text-sm text-slate-400">Describe a trading strategy in plain English and NEXA AI will structure the research.</p></div></div><button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm">{theme === 'dark' ? 'Light' : 'Dark'}</button></header><div className="grid gap-6 xl:grid-cols-[minmax(300px,0.7fr)_minmax(0,1.3fr)]"><section className="h-fit rounded-3xl border border-white/[0.08] bg-white/[0.045] p-6 backdrop-blur-xl"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">Describe your strategy</h3><Badge value="NEXA AI" tone="good" /></div><textarea rows={8} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="e.g. Buy EURUSD when EMA 9 crosses above EMA 21." className="w-full resize-y rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500/60" /><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={analyze} disabled={loading} className="rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Analyzing...' : 'Analyze strategy'}</button><button type="button" onClick={() => { setPrompt(''); setAnalysis(null); setError('') }} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm">Clear</button></div>{error && <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4"><p className="text-sm font-semibold text-rose-300">Analysis failed</p><p className="mt-1 text-sm text-slate-300">{error}</p></div>}<div className="mt-6"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Examples</p><div className="mt-3 space-y-2">{examples.map((example) => <button key={example} type="button" onClick={() => setPrompt(example)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left text-sm text-slate-300 hover:border-sky-400/40">{example}</button>)}</div></div></section><div>{loading ? <section className="rounded-3xl border border-white/[0.08] bg-white/[0.045] p-6"><p className="text-lg font-semibold text-white">Analyzing Strategy</p><p className="mt-2 text-sm text-slate-400">NEXA AI is processing the request. These are workflow stages, not claimed backend progress.</p><div className="mt-6 space-y-3">{stages.map((stage) => <div key={stage} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-slate-950/30 p-4"><span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" /><span className="text-sm text-slate-300">{stage}</span></div>)}</div></section> : analysis ? <Results analysis={analysis} /> : <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] p-8 text-center"><p className="text-lg font-semibold text-white">Ready for a strategy brief</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">Describe entries, exits, risk, and timeframe in natural language. The live NEXA AI service will return available research evidence here.</p></section>}</div></div></main></div></div>
}
