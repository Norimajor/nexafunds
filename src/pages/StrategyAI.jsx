import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const navItems = [
  { label: 'Overview' },
  { label: 'Portfolio' },
  { label: 'Transactions' },
  { label: 'Strategy AI', active: true },
]

const API_BASE = 'https://nexafunds.onrender.com'

const examples = [
  'Buy XAUUSD when RSI drops below 30 on the 15m chart, exit at 1.5% profit or 0.7% loss.',
  'Scalp EURUSD during the London session using a 9/21 EMA crossover, max 2 trades per day.',
  'Trend-follow US30 on the H1 chart, only long, trail stop at 1 ATR.',
]

export default function StrategyAI() {
  const navigate = useNavigate()

  const [theme, setTheme] = useState(
    () => (typeof window !== 'undefined' && localStorage.getItem('nexafunds-theme')) || 'dark',
  )
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [activeNav, setActiveNav] = useState('Strategy AI')

  const [user, setUser] = useState({ first_name: 'Investor' })
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('nexafunds-theme', theme)
  }, [theme])

  // Same auth pattern as Dashboard.jsx / Portfolio.jsx
  useEffect(() => {
    let cancelled = false
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
        const data = await response.json()
        if (!cancelled && data.success && data.user) setUser(data.user)
      } catch (err) {
        console.error('Failed to fetch user:', err)
      }
    }
    fetchUser()
    return () => {
      cancelled = true
    }
  }, [])

  const isDark = theme === 'dark'

  /* ---------- shared style helpers (identical to Dashboard.jsx) ---------- */
  const surface = isDark
    ? 'rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_24px_60px_-25px_rgba(2,6,23,0.9)] backdrop-blur-xl ring-1 ring-inset ring-white/5'
    : 'rounded-3xl border border-slate-900/5 bg-white/80 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl ring-1 ring-inset ring-white'

  const softText = isDark ? 'text-slate-400' : 'text-slate-500'
  const label = `text-[11px] font-semibold uppercase tracking-[0.2em] ${softText}`

  const pressable =
    'transition-all duration-200 ease-out active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 ' +
    (isDark ? 'focus-visible:ring-offset-slate-950' : 'focus-visible:ring-offset-slate-100')

  const tonePill = {
    emerald: 'bg-emerald-500/12 text-emerald-500 ring-1 ring-inset ring-emerald-500/25',
    blue: 'bg-blue-500/12 text-blue-500 ring-1 ring-inset ring-blue-500/25',
    violet: 'bg-violet-500/12 text-violet-500 ring-1 ring-inset ring-violet-500/25',
    amber: 'bg-amber-500/12 text-amber-500 ring-1 ring-inset ring-amber-500/25',
    sky: 'bg-sky-500/12 text-sky-500 ring-1 ring-inset ring-sky-500/25',
    rose: 'bg-rose-500/12 text-rose-500 ring-1 ring-inset ring-rose-500/25',
  }

  const inputClass = isDark
    ? 'w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2.5 text-slate-100 outline-none transition focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/25'
    : 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/40'

  const navButton = (item, isActive) =>
    [
      'group relative flex w-full items-center justify-between overflow-hidden rounded-2xl px-4 py-3 text-left text-sm font-medium',
      pressable,
      isActive
        ? 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 text-white shadow-[0_14px_30px_-12px_rgba(14,165,233,0.9)]'
        : isDark
          ? 'text-slate-300 hover:bg-white/[0.06] hover:text-white active:bg-sky-500/20 active:text-sky-200'
          : 'text-slate-600 hover:bg-slate-900/[0.04] hover:text-slate-900 active:bg-sky-500/15 active:text-sky-700',
    ].join(' ')

  const goTo = (labelName) => {
    setActiveNav(labelName)
    setMobileSidebarOpen(false)
    if (labelName === 'Overview') navigate('/dashboard')
    if (labelName === 'Portfolio') navigate('/portfolio')
    if (labelName === 'Transactions') navigate('/transactions')
    if (labelName === 'Strategy AI') navigate('/strategy-ai')
  }

  const analyze = async () => {
    const text = prompt.trim()
    if (!text || loading) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      // NexaFunds bridge endpoint -> forwards to the NEXA AI interpreter
      const response = await fetch(`${API_BASE}/api/strategy/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: text }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data || data.success === false) {
        throw new Error((data && (data.error || data.message)) || `Request failed (HTTP ${response.status})`)
      }

      // Render whatever the interpreter returns; `strategy` is used when present.
      setResult(data.strategy || data.result || data)
    } catch (err) {
      console.error('Strategy analysis failed:', err)
      setError(err.message || 'Could not reach the NEXA AI interpreter. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderValue = (value) => {
    if (value === null || value === undefined || value === '') return '—'
    if (Array.isArray(value)) {
      return (
        <ul className="mt-2 space-y-1.5">
          {value.map((item, index) => (
            <li key={index} className="text-sm">
              {typeof item === 'object' ? (
                <pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(item, null, 2)}</pre>
              ) : (
                <span>• {String(item)}</span>
              )}
            </li>
          ))}
        </ul>
      )
    }
    if (typeof value === 'object') {
      return (
        <div className="mt-2 space-y-1.5">
          {Object.entries(value).map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 text-sm">
              <span className={softText}>{k.replace(/_/g, ' ')}</span>
              <span className="text-right font-medium tabular-nums">
                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
              </span>
            </div>
          ))}
        </div>
      )
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return String(value)
  }

  const sidebar = (
    <>
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-lg font-bold text-white shadow-[0_12px_30px_-10px_rgba(14,165,233,0.9)]">
          N
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">NexaFunds</h1>
          <p className={`text-xs ${softText}`}>Investor Portal</p>
        </div>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => goTo(item.label)}
            className={navButton(item, activeNav === item.label)}
          >
            <span>{item.label}</span>
            {activeNav === item.label && (
              <span className="h-2.5 w-2.5 rounded-full bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
            )}
          </button>
        ))}
      </nav>

      <div className={`mt-auto p-4 ${surface}`}>
        <p className={label}>Engine</p>
        <h3 className="mt-3 text-lg font-semibold">NEXA AI</h3>
        <p className={`mt-1 text-sm ${softText}`}>Strategy interpreter</p>
      </div>
    </>
  )

  return (
    <div
      className={
        isDark
          ? 'relative min-h-screen overflow-hidden bg-[#070b16] text-slate-100'
          : 'relative min-h-screen overflow-hidden bg-[#eef2f8] text-slate-900'
      }
    >
      <div
        className={
          isDark
            ? 'pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_-10%_-10%,rgba(56,189,248,0.20),transparent_60%),radial-gradient(900px_500px_at_110%_10%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(900px_600px_at_50%_120%,rgba(16,185,129,0.14),transparent_60%)]'
            : 'pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_-10%_-10%,rgba(56,189,248,0.22),transparent_60%),radial-gradient(900px_500px_at_110%_10%,rgba(129,140,248,0.18),transparent_60%),radial-gradient(900px_600px_at_50%_120%,rgba(16,185,129,0.16),transparent_60%)]'
        }
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.10)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      <div className="relative mx-auto flex max-w-[1600px]">
        {/* ---------------- Sidebar ---------------- */}
        <aside
          className={
            isDark
              ? 'hidden min-h-screen w-72 shrink-0 border-r border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl lg:flex lg:flex-col'
              : 'hidden min-h-screen w-72 shrink-0 border-r border-slate-900/5 bg-white/70 p-6 backdrop-blur-2xl lg:flex lg:flex-col'
          }
        >
          {sidebar}
        </aside>

        {/* ---------------- Mobile sidebar ---------------- */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
            <aside
              className={[
                'absolute left-0 top-0 flex h-full w-72 flex-col p-6',
                isDark ? 'bg-[#0b1120] text-slate-100' : 'bg-white text-slate-900',
              ].join(' ')}
            >
              {sidebar}
            </aside>
          </div>
        )}

        {/* ---------------- Main ---------------- */}
        <main className="min-h-screen flex-1 px-5 py-8 sm:px-8">
          {/* Topbar */}
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className={`rounded-2xl border px-3 py-2 text-sm lg:hidden ${pressable} ${
                  isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'
                }`}
              >
                ☰
              </button>
              <div>
                <p className={label}>Strategy AI</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Welcome, {user.first_name || 'Investor'}
                </h2>
                <p className={`mt-1 text-sm ${softText}`}>
                  Describe a trading strategy in plain English and NEXA AI will structure it.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`rounded-2xl border px-4 py-2 text-sm font-medium ${pressable} ${
                isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'
              }`}
            >
              {isDark ? '☀ Light' : '☾ Dark'}
            </button>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* -------- Input -------- */}
            <section className={`${surface} p-6`}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Describe your strategy</h3>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tonePill.sky}`}>NEXA AI</span>
              </div>

              <textarea
                rows={8}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="e.g. Buy XAUUSD when RSI drops below 30 on the 15m chart, take profit at 1.5%, stop loss at 0.7%."
                className={`${inputClass} resize-y`}
              />

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={analyze}
                  disabled={loading || !prompt.trim()}
                  className={[
                    'rounded-2xl px-5 py-2.5 text-sm font-semibold text-white',
                    'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 shadow-[0_14px_30px_-12px_rgba(14,165,233,0.9)]',
                    pressable,
                    loading || !prompt.trim() ? 'cursor-not-allowed opacity-60' : '',
                  ].join(' ')}
                >
                  {loading ? 'Analyzing…' : 'Analyze strategy'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPrompt('')
                    setResult(null)
                    setError('')
                  }}
                  className={`rounded-2xl border px-4 py-2.5 text-sm font-medium ${pressable} ${
                    isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'
                  }`}
                >
                  Clear
                </button>
              </div>

              <div className="mt-6">
                <p className={label}>Examples</p>
                <div className="mt-3 space-y-2">
                  {examples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setPrompt(example)}
                      className={[
                        'w-full rounded-2xl border p-3 text-left text-sm',
                        pressable,
                        isDark
                          ? 'border-white/10 bg-white/[0.04] hover:border-sky-400/40'
                          : 'border-slate-200 bg-slate-50 hover:border-sky-300',
                      ].join(' ')}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* -------- Result -------- */}
            <section className={`${surface} p-6`}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Interpreted strategy</h3>
                {result && (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tonePill.emerald}`}>Ready</span>
                )}
              </div>

              {loading && (
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-14 animate-pulse rounded-2xl ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200/70'}`}
                    />
                  ))}
                </div>
              )}

              {!loading && error && (
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-rose-500/30 bg-rose-500/10' : 'border-rose-200 bg-rose-50'}`}>
                  <p className="text-sm font-semibold text-rose-500">Analysis failed</p>
                  <p className={`mt-1 text-sm ${softText}`}>{error}</p>
                </div>
              )}

              {!loading && !error && !result && (
                <p className={`text-sm ${softText}`}>
                  Your structured strategy — instrument, timeframe, entry and exit rules, risk parameters — appears here
                  after analysis.
                </p>
              )}

              {!loading && !error && result && (
                <div className="space-y-3">
                  {Object.entries(result).map(([key, value]) => (
                    <div
                      key={key}
                      className={[
                        'rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5',
                        isDark
                          ? 'border-white/10 bg-white/[0.04] hover:border-sky-400/40'
                          : 'border-slate-200 bg-slate-50 hover:border-sky-300',
                      ].join(' ')}
                    >
                      <p className={label}>{key.replace(/_/g, ' ')}</p>
                      <div className="mt-2 text-sm font-medium">{renderValue(value)}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
