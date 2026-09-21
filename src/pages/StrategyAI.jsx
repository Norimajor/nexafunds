import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = (import.meta.env.VITE_NEXA_AI_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const USER_API_BASE = 'https://nexafunds.onrender.com'
const ANONYMOUS_ID_KEY = 'nexafunds-ai-user-id'
const CONVERSATION_KEY = 'nexafunds-ai-conversation'

const makeId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
const getAnonymousId = () => {
  const existing = localStorage.getItem(ANONYMOUS_ID_KEY)
  if (existing) return existing
  const id = `anonymous-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
  localStorage.setItem(ANONYMOUS_ID_KEY, id)
  return id
}
const getErrorMessage = (data, status) => data?.error || data?.detail || data?.message || `NEXA AI returned HTTP ${status}. Please try again.`

export async function sendChatMessage(message, userId) {
  const response = await fetch(`${API_BASE}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, user_id: userId }) })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(getErrorMessage(data, response.status))
  return data
}

export async function getBacktestJob(jobId) {
  const response = await fetch(`${API_BASE}/backtest/jobs/${encodeURIComponent(jobId)}`)
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(getErrorMessage(data, response.status))
  return data
}

const value = (object, keys, fallback = null) => keys.map((key) => object?.[key]).find((item) => item !== undefined && item !== null && item !== '') ?? fallback
const display = (item, fallback = 'Not available') => item === null || item === undefined || item === '' ? fallback : typeof item === 'boolean' ? item ? 'Yes' : 'No' : String(item)
const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined || !Number.isFinite(Number(seconds))) return 'estimating remaining time...'
  const amount = Math.max(0, Math.round(Number(seconds)))
  return amount < 60 ? `about ${amount} second${amount === 1 ? '' : 's'} remaining` : `about ${Math.round(amount / 60)} minute${Math.round(amount / 60) === 1 ? '' : 's'} remaining`
}

function Progress({ progress }) {
  const percent = Math.max(0, Math.min(100, Number(progress.progress || 0) * 100))
  return <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/[0.06] p-4"><div className="flex items-center justify-between text-xs text-slate-300"><span>Backtest progress</span><strong className="text-sky-300">{Math.round(percent)}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 transition-all" style={{ width: `${percent}%` }} /></div><div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2"><span>{display(value(progress, ['current_dataset', 'dataset', 'symbol']), 'Dataset pending')}</span><span>{display(value(progress, ['current_combination', 'combination']), 'Combination pending')}</span><span>{display(progress.completed, '0')} / {display(progress.total, 'estimating')} completed</span><span>{display(progress.elapsed_seconds, '...')} elapsed</span><span className="sm:col-span-2">{formatDuration(value(progress, ['eta_seconds', 'estimated_remaining_seconds']))}</span></div></div>
}

const candidateFields = [['Strategy', ['strategy', 'combination', 'name', 'strategy_name']], ['Symbol', ['symbol']], ['Timeframe', ['timeframe']], ['EA platform', ['ea_platform', 'platform']], ['Trades', ['trades', 'total_trades', 'number_of_trades']], ['Win rate', ['win_rate', 'winning_rate']], ['Profit factor', ['profit_factor']], ['Expectancy', ['expectancy']], ['Net profit / return', ['net_profit', 'net_return', 'return', 'total_return']], ['Maximum drawdown', ['maximum_drawdown', 'max_drawdown']], ['Walk-forward', ['walk_forward_status', 'walk_forward_validation', 'validation_status']]]

function Candidates({ job }) {
  const result = job?.result || job?.results || job?.data || job
  const candidates = value(result, ['candidates', 'ranked_candidates', 'candidate_strategies'], [])
  if (!Array.isArray(candidates) || !candidates.length) return <p className="mt-3 text-sm text-slate-400">No ranked candidates were returned.</p>
  return <div className="mt-4 space-y-3">{candidates.map((candidate, index) => <div key={candidate.id || index} className="rounded-2xl border border-white/[0.08] bg-slate-950/30 p-4"><div className="mb-3 flex items-center justify-between"><p className="font-semibold text-slate-100">#{index + 1} {display(value(candidate, ['strategy', 'combination', 'name', 'strategy_name']), 'Candidate')}</p><span className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Historical evidence</span></div><div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">{candidateFields.slice(1).map(([label, keys]) => <div key={label}><p className="text-slate-500">{label}</p><p className="mt-1 break-words text-slate-200">{display(value(candidate, keys))}</p></div>)}</div></div>)}</div>
}

function Result({ job }) {
  const result = job?.result || job?.results || job?.data || job
  return <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">Historical backtest evidence</p><p className="mt-2 text-sm text-slate-200">{display(value(result, ['summary', 'message']), 'The historical backtest completed. Review the ranked candidates below as evidence, not a guarantee of future profitability.')}</p><div className="mt-4 grid grid-cols-3 gap-3 text-xs"><div><p className="text-slate-500">Datasets tested</p><p className="mt-1 text-lg font-semibold text-slate-100">{display(value(result, ['datasets_tested', 'tested_datasets', 'total_datasets']))}</p></div><div><p className="text-slate-500">Skipped</p><p className="mt-1 text-lg font-semibold text-slate-100">{display(value(result, ['skipped_datasets', 'datasets_skipped']))}</p></div><div><p className="text-slate-500">Candidates</p><p className="mt-1 text-lg font-semibold text-slate-100">{display(value(result, ['aggregate_candidate_count', 'candidate_count', 'total_candidates']))}</p></div></div><Candidates job={job} /></div>
}

function Message({ message }) {
  const assistant = message.role === 'assistant'
  return <div className={`flex ${assistant ? 'justify-start' : 'justify-end'}`}><div className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[78%] ${assistant ? 'rounded-tl-md border border-white/[0.08] bg-slate-900/80 text-slate-200' : 'rounded-tr-md bg-gradient-to-br from-blue-600 to-cyan-500 text-white'}`}><p className="whitespace-pre-wrap">{message.content}</p>{message.questions?.length > 0 && <div className="mt-3 space-y-2 border-t border-white/10 pt-3">{message.questions.map((question, index) => <p key={question.field || index} className="text-slate-300"><span className="font-medium text-sky-300">{question.field ? `${question.field}: ` : ''}</span>{question.question || question}</p>)}</div>}{message.progress && <Progress progress={message.progress} />}{message.job && <Result job={message.job} />}</div></div>
}

function Typing() {
  return <div className="flex justify-start"><div className="rounded-2xl rounded-tl-md border border-white/[0.08] bg-slate-900/80 px-4 py-3 text-sm text-slate-400">NEXA AI is thinking...</div></div>
}

export default function StrategyAI() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState(() => localStorage.getItem('nexafunds-theme') || 'dark')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState({ first_name: 'Investor' })
  const [userId, setUserId] = useState(() => getAnonymousId())
  const [messages, setMessages] = useState(() => { try { return JSON.parse(localStorage.getItem(CONVERSATION_KEY) || '[]') } catch { return [] } })
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const pollTimers = useRef(new Set())

  useEffect(() => { document.documentElement.style.colorScheme = theme; localStorage.setItem('nexafunds-theme', theme) }, [theme])
  useEffect(() => { localStorage.setItem(CONVERSATION_KEY, JSON.stringify(messages)); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => {
    let cancelled = false
    const timers = pollTimers.current
    fetch(`${USER_API_BASE}/api/auth/me`, { credentials: 'include' }).then((response) => response.json()).then((data) => { if (!cancelled && data.success && data.user) { setUser(data.user); setUserId(String(data.user.id || data.user.user_id || data.user.email || getAnonymousId())) } }).catch(() => {})
    return () => { cancelled = true; timers.forEach((timer) => window.clearTimeout(timer)) }
  }, [])

  const updateMessage = (id, changes) => setMessages((current) => current.map((message) => message.id === id ? { ...message, ...changes } : message))
  const pollJob = async (jobId, progressId) => {
    try {
      const job = await getBacktestJob(jobId)
      const status = String(job.status || job.state || '').toLowerCase()
      if (status === 'completed') updateMessage(progressId, { content: 'The backtest is complete. Here are the ranked historical results.', progress: null, job })
      else if (status === 'failed') updateMessage(progressId, { content: `The backtest could not be completed: ${display(job.error, 'The backend reported an unknown error.')}`, progress: null, error: true })
      else { updateMessage(progressId, { progress: job }); const timer = window.setTimeout(() => { pollTimers.current.delete(timer); pollJob(jobId, progressId) }, 3000); pollTimers.current.add(timer) }
    } catch (error) { updateMessage(progressId, { content: `The backtest progress could not be loaded: ${error.message}. Please try again later.`, progress: null, error: true }) }
  }

  const send = async () => {
    const message = draft.trim()
    if (!message || sending) return
    const userMessage = { id: makeId(), role: 'user', content: message }
    setMessages((current) => [...current, userMessage]); setDraft(''); setSending(true)
    try {
      const data = await sendChatMessage(message, userId)
      if (!data || data.success !== true) throw new Error(data?.error || 'The NEXA AI service returned an invalid response.')
      const responseMessage = { id: makeId(), role: 'assistant', content: data.message || 'I received your request.', questions: data.questions }
      const status = String(data.status || '').toLowerCase()
      if (['queued', 'running'].includes(status) && data.job_id) { responseMessage.content = data.message || 'I started the backtest. I will keep you updated here.'; responseMessage.progress = { progress: 0, status }; setMessages((current) => [...current, responseMessage]); pollJob(data.job_id, responseMessage.id) }
      else setMessages((current) => [...current, responseMessage])
    } catch (error) { setMessages((current) => [...current, { id: makeId(), role: 'assistant', content: `I could not reach NEXA AI: ${error.message}. Please retry your message.`, error: true }]) } finally { setSending(false) }
  }

  const nav = [['Overview', '/dashboard'], ['Portfolio', '/portfolio'], ['Transactions', '/transactions'], ['Strategy AI', '/strategy-ai']]
  const sidebar = <><div className="mb-10 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-lg font-bold text-white">N</div><div><h1 className="text-xl font-bold tracking-tight">NexaFunds</h1><p className="text-xs text-slate-400">Investor Portal</p></div></div><nav className="space-y-2">{nav.map(([label, path]) => <button key={label} type="button" onClick={() => { setMobileOpen(false); navigate(path) }} className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium ${label === 'Strategy AI' ? 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 text-white' : 'text-slate-300 hover:bg-white/[0.06]'}`}>{label}</button>)}</nav><div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.04] p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Engine</p><h3 className="mt-3 text-lg font-semibold">NEXA AI</h3><p className="mt-1 text-sm text-slate-400">Conversational strategy research</p></div></>
  return <div className="min-h-screen overflow-x-hidden bg-[#070b16] text-slate-100"><div className="pointer-events-none fixed inset-0 bg-[radial-gradient(1200px_600px_at_-10%_-10%,rgba(56,189,248,0.20),transparent_60%),radial-gradient(900px_500px_at_110%_10%,rgba(99,102,241,0.18),transparent_60%)]" /><div className="relative mx-auto flex min-h-screen max-w-[1600px]"><aside className="hidden min-h-screen w-72 shrink-0 flex-col border-r border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl lg:flex">{sidebar}</aside>{mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-slate-950/70" onClick={() => setMobileOpen(false)} /><aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-[#0b1120] p-6">{sidebar}</aside></div>}<main className="min-w-0 flex-1 px-5 py-8 sm:px-8"><header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><button type="button" onClick={() => setMobileOpen(true)} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm lg:hidden">Menu</button><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/70">Strategy AI</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Welcome, {user.first_name || 'Investor'}</h2><p className="mt-1 text-sm text-slate-400">Ask NEXA AI about strategy research and historical backtests.</p></div></div><button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm">{theme === 'dark' ? 'Light' : 'Dark'}</button></header><section className="flex h-[calc(100vh-190px)] min-h-[520px] flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.045] backdrop-blur-xl"><div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 sm:px-6"><div><h3 className="font-semibold">NEXA AI research desk</h3><p className="mt-1 text-xs text-slate-400">Historical evidence only. Results do not guarantee future profitability.</p></div><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">Online</span></div><div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">{messages.length === 0 && <div className="mx-auto max-w-lg py-12 text-center"><p className="text-sm text-slate-400">Start a conversation about a strategy, symbol, timeframe, or backtest constraints.</p></div>}{messages.map((message) => <Message key={message.id} message={message} />)}{sending && <Typing />}<div ref={bottomRef} /></div><form onSubmit={(event) => { event.preventDefault(); send() }} className="border-t border-white/[0.08] bg-slate-950/20 p-4 sm:p-5"><div className="flex items-end gap-3"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send() } }} rows={2} placeholder="Ask about a strategy or start a backtest..." className="min-h-[52px] flex-1 resize-none rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/60" /><button type="submit" disabled={sending || !draft.trim()} className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Send</button></div><p className="mt-2 text-[11px] text-slate-500">Press Enter to send. Shift+Enter adds a line.</p></form></section></main></div></div>
}
