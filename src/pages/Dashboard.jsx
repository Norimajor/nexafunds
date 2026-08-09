import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const navItems = [
  { label: 'Overview', active: true },
  { label: 'Portfolio' },
  { label: 'Transactions' },
  { label: 'Reports' },
  { label: 'Withdrawals' },
]

const stats = [
  { label: 'Portfolio value', value: '$742,050', change: '+8.4%', tone: 'emerald' },
  { label: 'Monthly return', value: '$54,920', change: '+12.6%', tone: 'blue' },
  { label: 'Open positions', value: '18', change: '4 new', tone: 'violet' },
  { label: 'Risk score', value: 'Moderate', change: 'Stable', tone: 'amber' },
]

const activity = [
  { title: 'PAMM allocation increased', time: '2 hours ago', value: '+$12,500' },
  { title: 'Gold scalper trade closed', time: 'Today, 9:40 AM', value: '+$4,240' },
  { title: 'Broker account synced', time: 'Yesterday', value: 'Verified' },
]

const chartPath = 'M 15 180 C 70 135, 100 145, 150 120 S 240 70, 290 85 S 360 25, 410 40 S 500 60, 560 32 S 640 18, 700 45 L 700 220 L 15 220 Z'

export default function Dashboard() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState(() => localStorage.getItem('nexafunds-theme') || 'light')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [totalUsers, setTotalUsers] = useState(0)

  useEffect(() => {
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('nexafunds-theme', theme)
  }, [theme])

  useEffect(() => {
    fetch('https://nexafunds.onrender.com/api/stats/users')
      .then((res) => res.json())
      .then((data) => setTotalUsers(data.totalUsers || 0))
      .catch((err) => console.error(err))
  }, [])

  const isDark = theme === 'dark'

  return (
    <div
      className={
        isDark
          ? 'relative min-h-screen overflow-hidden bg-slate-950 text-slate-100'
          : 'relative min-h-screen overflow-hidden bg-slate-100 text-slate-900'
      }
    >
      <div className={isDark ? 'absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),transparent_30%)]' : 'absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.08),transparent_30%)]'} />

      <div className="relative mx-auto flex max-w-[1600px]">
        <aside
          className={
            isDark
              ? 'hidden min-h-screen w-72 border-r border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-xl lg:flex lg:flex-col'
              : 'hidden min-h-screen w-72 border-r border-white/60 bg-white/55 p-6 shadow-[inset_-1px_0_0_rgba(148,163,184,0.2)] backdrop-blur-xl lg:flex lg:flex-col'
          }
        >
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-lg font-bold text-white shadow-lg shadow-blue-500/30">
              N
            </div>
            <div>
              <h1 className="text-xl font-bold">NexaFunds</h1>
              <p className={isDark ? 'text-xs text-slate-400' : 'text-xs text-slate-500'}>Investor Portal</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => item.label === 'Transactions' && navigate('/transactions')}
                className={
                  item.active
                    ? 'flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-left text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition duration-200 hover:-translate-y-0.5'
                    : isDark
                      ? 'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800/80'
                      : 'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-600 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100'
                }
              >
                <span>{item.label}</span>
                {item.active && <span className="h-2.5 w-2.5 rounded-full bg-white/80" />}
              </button>
            ))}
          </nav>

          <div className={isDark ? 'mt-auto rounded-3xl border border-slate-700/80 bg-slate-800/70 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.42)]' : 'mt-auto rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)]'}>
            <p className={isDark ? 'text-xs uppercase tracking-[0.2em] text-slate-400' : 'text-xs uppercase tracking-[0.2em] text-slate-500'}>Account</p>
            <h3 className="mt-3 text-lg font-semibold">Premium Investor</h3>
            <p className={isDark ? 'mt-1 text-sm text-slate-400' : 'mt-1 text-sm text-slate-600'}>Tier 3 performance plan</p>
          </div>
        </aside>

        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden">
            <div className={isDark ? 'h-full w-72 border-r border-slate-800 bg-slate-900/90 p-6' : 'h-full w-72 border-r border-slate-200 bg-white/90 p-6'}>
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-lg font-bold text-white">
                    N
                  </div>
                  <div>
                    <h1 className="text-lg font-bold">NexaFunds</h1>
                  </div>
                </div>
                <button type="button" onClick={() => setMobileSidebarOpen(false)} className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                  ✕
                </button>
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setMobileSidebarOpen(false)
                      if (item.label === 'Transactions') navigate('/transactions')
                    }}
                    className={
                      item.active
                        ? 'flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-left text-sm font-medium text-white'
                        : isDark
                          ? 'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-300 hover:bg-slate-800'
                          : 'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-600 hover:bg-slate-100'
                    }
                  >
                    <span>{item.label}</span>
                    {item.active && <span className="h-2.5 w-2.5 rounded-full bg-white/80" />}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1">
          <header
            className={
              isDark
                ? 'border-b border-slate-800/80 bg-slate-900/60 px-4 py-5 backdrop-blur-xl sm:px-6'
                : 'border-b border-slate-200 bg-white/65 px-4 py-5 shadow-[0_1px_0_rgba(148,163,184,0.2)] backdrop-blur-xl sm:px-6'
            }
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className={
                    isDark
                      ? 'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-lg text-slate-100 lg:hidden'
                      : 'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-lg text-slate-700 lg:hidden'
                  }
                >
                  ☰
                </button>

                <div>
                  <p className={isDark ? 'text-sm text-slate-400' : 'text-sm text-slate-500'}>Welcome back</p>
                  <h2 className="text-xl font-bold sm:text-2xl">Dashboard overview</h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className={
                    isDark
                      ? 'rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:-translate-y-0.5 hover:border-sky-500/50'
                      : 'rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800 transition hover:-translate-y-0.5 hover:border-sky-300'
                  }
                >
                  {isDark ? '☀️ Light' : '🌙 Dark'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-rose-500/20 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-500/30"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          <div className="space-y-6 p-4 sm:p-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className={
                    isDark
                      ? 'group rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.35)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-sky-500/30 hover:shadow-[0_20px_50px_rgba(59,130,246,0.18)]'
                      : 'group rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_20px_50px_rgba(59,130,246,0.10)]'
                  }
                >
                  <div className="flex items-center justify-between">
                    <p className={isDark ? 'text-sm text-slate-400' : 'text-sm text-slate-500'}>{item.label}</p>
                    <span className={
                      item.tone === 'emerald'
                        ? 'rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500'
                        : item.tone === 'blue'
                          ? 'rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-500'
                          : item.tone === 'violet'
                            ? 'rounded-full bg-violet-500/10 px-2 py-1 text-xs font-medium text-violet-500'
                            : 'rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-500'
                    }>
                      {item.change}
                    </span>
                  </div>
                  <h3 className="mt-4 text-3xl font-bold">{item.value}</h3>
                </div>
              ))}
            </section>

            <section className="grid gap-6 2xl:grid-cols-[1.4fr_0.8fr]">
              <div
                className={
                  isDark
                    ? 'rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.32)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5'
                    : 'rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5'
                }
              >
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">Portfolio performance</h3>
                    <p className={isDark ? 'text-sm text-slate-400' : 'text-sm text-slate-500'}>Track growth over the last 8 months</p>
                  </div>
                  <div className="flex gap-2 text-xs font-medium">
                    {['3M', '6M', '1Y'].map((range, index) => (
                      <button
                        key={range}
                        type="button"
                        className={
                          index === 0
                            ? 'rounded-xl bg-blue-600 px-3 py-1.5 text-white shadow-md shadow-blue-600/20'
                            : isDark
                              ? 'rounded-xl bg-slate-800 px-3 py-1.5 text-slate-300'
                              : 'rounded-xl bg-slate-100 px-3 py-1.5 text-slate-600'
                        }
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className={
                    isDark
                      ? 'relative overflow-hidden rounded-[28px] border border-slate-700/80 bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950 p-6 shadow-inner shadow-slate-950/50'
                      : 'relative overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6 shadow-inner shadow-slate-200/70'
                  }
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.20),transparent_28%)]" />
                  <div className="relative h-64">
                    <svg viewBox="0 0 700 220" className="h-full w-full" preserveAspectRatio="none" aria-label="Portfolio performance chart">
                      {[0, 1, 2, 3].map((line) => (
                        <line
                          key={line}
                          x1="0"
                          y1={40 + line * 45}
                          x2="700"
                          y2={40 + line * 45}
                          stroke={isDark ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.45)'}
                          strokeWidth="1"
                        />
                      ))}
                      <path d={chartPath} fill="url(#chartGradient)" opacity="0.25" />
                      <path
                        d={chartPath.replace('Z', '')}
                        fill="none"
                        stroke="url(#chartStroke)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.7" />
                        </linearGradient>
                        <linearGradient id="chartStroke" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#34d399" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <button type="button" className="rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/30">
                    Deposit funds
                  </button>
                  <button type="button" className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30">
                    Withdraw funds
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div
                  className={
                    isDark
                      ? 'rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.32)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5'
                      : 'rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5'
                  }
                >
                  <h3 className="text-lg font-semibold">Recent activity</h3>
                  <div className="mt-5 space-y-4">
                    {activity.map((item) => (
                      <div key={item.title} className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3 last:border-0 last:pb-0 dark:border-slate-700">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className={isDark ? 'text-xs text-slate-400' : 'text-xs text-slate-500'}>{item.time}</p>
                        </div>
                        <span className={isDark ? 'text-sm font-medium text-sky-400' : 'text-sm font-medium text-sky-600'}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div
                className={
                  isDark
                    ? 'rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.32)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5'
                    : 'rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5'
                }
              >
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">EA library</h3>
                    <p className={isDark ? 'text-sm text-slate-400' : 'text-sm text-slate-500'}>Download your active trading systems</p>
                  </div>
                  <button type="button" className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition duration-200 hover:-translate-y-0.5">
                    + Upload
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    ['Nexa Gold Scalper', 'Active', '🤖'],
                    ['Forex Swing EA', 'New', '📈'],
                    ['Grid Manager', 'Beta', '⚡'],
                  ].map(([name, status, icon]) => (
                    <div
                      key={name}
                      className={
                        isDark
                          ? 'rounded-2xl border border-slate-700/80 bg-slate-800/70 p-4 transition duration-300 hover:-translate-y-1 hover:border-sky-500/30'
                          : 'rounded-2xl border border-slate-200 bg-slate-50 p-4 transition duration-300 hover:-translate-y-1 hover:border-sky-200'
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-3xl">{icon}</span>
                        <span className={status === 'Active' ? 'rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-500' : status === 'New' ? 'rounded-full bg-blue-500/10 px-2 py-1 text-[10px] font-medium text-blue-500' : 'rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-500'}>
                          {status}
                        </span>
                      </div>
                      <h4 className="mt-4 font-semibold">{name}</h4>
                      <p className={isDark ? 'mt-2 text-sm text-slate-400' : 'mt-2 text-sm text-slate-500'}>Optimized strategy for long-term compounding and risk control.</p>
                      <button type="button" className="mt-4 text-sm font-medium text-blue-500">Download</button>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={
                  isDark
                    ? 'rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.32)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5'
                    : 'rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5'
                }
              >
                <h3 className="text-xl font-semibold">Broker & PAMM access</h3>

                <div className="mt-5 space-y-4">
                  <div className={isDark ? 'rounded-2xl border border-slate-700 bg-slate-800/80 p-4' : 'rounded-2xl border border-slate-200 bg-slate-50 p-4'}>
                    <div className="mb-3 flex items-center gap-3">
                      <span className="text-2xl">🏦</span>
                      <div>
                        <h4 className="font-semibold">Create Broker Account</h4>
                        <p className={isDark ? 'text-sm text-slate-400' : 'text-sm text-slate-500'}>Open a trading account with our supported broker.</p>
                      </div>
                    </div>

                    <div className={isDark ? 'mb-4 rounded-xl border border-slate-700 bg-slate-900/80 p-3' : 'mb-4 rounded-xl border border-slate-200 bg-white p-3'}>
                      <p className={isDark ? 'text-xs text-slate-400' : 'text-xs text-slate-500'}>Referral link</p>
                      <p className="mt-1 break-all text-sm text-blue-500">https://alpari.com/?Referral=73819</p>
                    </div>

                    <a
                      href="https://alpari.com/?Referral=73819"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition duration-200 hover:bg-blue-700"
                    >
                      Open Broker Account
                    </a>
                  </div>

                  <div className={isDark ? 'rounded-2xl border border-slate-700 bg-slate-800/80 p-4' : 'rounded-2xl border border-slate-200 bg-slate-50 p-4'}>
                    <div className="mb-3 flex items-center gap-3">
                      <span className="text-2xl">📈</span>
                      <div>
                        <h4 className="font-semibold">Join PAMM Investment</h4>
                        <p className={isDark ? 'text-sm text-slate-400' : 'text-sm text-slate-500'}>Connect your broker account to the NexaFunds PAMM pool.</p>
                      </div>
                    </div>

                    <div className={isDark ? 'mb-4 rounded-xl border border-slate-700 bg-slate-900/80 p-3' : 'mb-4 rounded-xl border border-slate-200 bg-white p-3'}>
                      <p className={isDark ? 'text-xs text-slate-400' : 'text-xs text-slate-500'}>Platform</p>
                      <p className="mt-1 break-all text-sm text-green-500">https://alpari.com/en/invest/pamm/</p>
                    </div>

                    <a
                      href="https://alpari.com/en/invest/pamm/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white transition duration-200 hover:bg-emerald-600"
                    >
                      View PAMM Platform
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

