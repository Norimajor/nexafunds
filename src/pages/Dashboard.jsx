import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const navItems = [
  { label: 'Overview', active: true },
  { label: 'Portfolio' },
  { label: 'Transactions' },
]

const chartPath =
  'M 15 180 C 70 135, 100 145, 150 120 S 240 70, 290 85 S 360 25, 410 40 S 500 60, 560 32 S 640 18, 700 45 L 700 220 L 15 220 Z'

const API_BASE = 'https://nexafunds.onrender.com'

const defaultSettings = {
  ea_name: 'Nexa Gold Scalper',
  ea_risk: 'Moderate',
  ea_drawdown: '12',
  ea_status: 'Live',
  auto_trade: true,
  push_notifications: true,
  max_order_size: '1.5',
  pamm_access: true,
  broker_access: true,
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState(
    () => (typeof window !== 'undefined' && localStorage.getItem('nexafunds-theme')) || 'dark',
  )
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [account, setAccount] = useState({
    currentBalance: 0,
    totalProfit: 0,
    portfolioValue: 0,
    totalInvested: 0,
    monthlyGain: 0,
    totalReturn: 0,
  })
  const [eaSettings, setEaSettings] = useState(defaultSettings)
  const [totalUsers, setTotalUsers] = useState(0)
  const [user, setUser] = useState(null)
  const [positions, setPositions] = useState([])
  useEffect(() => {
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('nexafunds-theme', theme)
  }, [theme])

  useEffect(() => {
    let cancelled = false
    const fetchUser = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: 'include',
    })

    const data = await response.json()

    if (!cancelled && data.success) {
      setUser(data.user)
    }
  } catch (error) {
    console.error('Failed to fetch user:', error)
  }
}

    const fetchAccount = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/mt5/account`)
        const data = await response.json()
        if (cancelled || !data.success) return

        const mt5 = data.account
        const balance = Number(mt5.balance) || 0
        const equity = Number(mt5.equity) || 0

        setAccount({
          currentBalance: balance,
          totalProfit: Number(mt5.profit) || 0,
          portfolioValue: equity,
          totalInvested: balance,
          monthlyGain: 12.5,
          totalReturn: balance > 0 ? ((equity - balance) / balance) * 100 : 0,
        })
      } catch (error) {
        console.error('Failed to fetch MT5 account:', error)
      }
    }

    const fetchPositions = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/mt5/positions`)
        const data = await response.json()
        if (cancelled || !data.success) return
        setPositions(data.positions || [])
      } catch (error) {
        console.error('Failed to fetch MT5 positions:', error)
      }
    }

    const fetchEaSettings = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/ea/settings`)
        const data = await response.json()
        if (cancelled || !data.success) return
        setEaSettings({ ...defaultSettings, ...data.settings })
      } catch (error) {
        console.error('Failed to fetch EA settings:', error)
      }
    }

    const fetchTotalUsers = async () => {
      try {
const response = await fetch(`${API_BASE}/api/stats/users`)
        const data = await response.json()
        if (cancelled) return
        setTotalUsers(data.totalUsers || 0)
      } catch (error) {
        console.error('Failed to fetch total users:', error)
      }
    }

fetchUser()
    fetchAccount()
    fetchPositions()
    fetchEaSettings()
    fetchTotalUsers()

    const interval = setInterval(() => {
      fetchAccount()
      fetchPositions()
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const money = (value) =>
    `$${Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const stats = [
    { label: 'Current balance', value: money(account.currentBalance), change: '+8.4%', tone: 'emerald' },
    { label: 'Net profit', value: money(account.totalProfit), change: '+12.6%', tone: 'blue' },
    { label: 'Portfolio value', value: money(account.portfolioValue), change: 'Live', tone: 'violet' },
    { label: 'Invested capital', value: money(account.totalInvested), change: 'Stable', tone: 'amber' },
  ]

  const activity = [
    { title: 'MT5 account synced', time: 'Just now', value: 'Live' },
    { title: 'EA performance updated', time: '1 day ago', value: '+$1,240' },
    { title: 'Broker account verified', time: '2 days ago', value: 'OK' },
  ]

  const accessCards = [
    {
      label: 'PAMM access',
      value: eaSettings.pamm_access ? 'Enabled' : 'Paused',
      detail: eaSettings.pamm_access ? 'Investor portal connected' : 'Access disabled for investors',
      tone: 'sky',
      actionLabel: 'Open PAMM account',
      actionUrl: 'https://alpari.com/en/pamm-account/',
    },
    {
      label: 'Broker access',
      value: eaSettings.broker_access ? 'Verified' : 'Restricted',
      detail: eaSettings.broker_access ? 'MT5 account live and synced' : 'Broker connection paused',
      tone: 'emerald',
      actionLabel: 'Access broker',
      actionUrl: 'https://alpari.com/?Referral=73819',
    },
  ]

  const saveEaSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ea/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eaSettings),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to update EA settings')
      }

      setShowSettingsModal(false)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Unable to update EA settings')
    }
  }

  const isDark = theme === 'dark'

  return (
    <div
      className={
        isDark
          ? 'relative min-h-screen overflow-hidden bg-slate-950 text-slate-100'
          : 'relative min-h-screen overflow-hidden bg-slate-100 text-slate-900'
      }
    >
      <div
        className={
          isDark
            ? 'absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),transparent_30%)]'
            : 'absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.08),transparent_30%)]'
        }
      />

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
                onClick={() => {
                  if (item.label === 'Portfolio') navigate('/portfolio')
                  if (item.label === 'Transactions') navigate('/transactions')
                }}
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

          <div
            className={
              isDark
                ? 'mt-auto rounded-3xl border border-slate-700/80 bg-slate-800/70 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.42)]'
                : 'mt-auto rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)]'
            }
          >
            <p className={isDark ? 'text-xs uppercase tracking-[0.2em] text-slate-400' : 'text-xs uppercase tracking-[0.2em] text-slate-500'}>
              Account
            </p>
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
                  <h1 className="text-lg font-bold">NexaFunds</h1>
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
                      if (item.label === 'Portfolio') navigate('/portfolio')
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
         <div
  className={
    isDark
      ? 'rounded-[28px] border border-slate-800/90 bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950 p-6 shadow-[0_25px_60px_rgba(15,23,42,0.45)]'
      : 'rounded-[28px] border border-slate-200 bg-gradient-to-r from-white via-sky-50 to-emerald-50 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]'
  }
>
  <h2 className="text-2xl font-bold">
  {user?.first_name || 'Investor'}, welcome to NexaFunds 👋
</h2>

<p className={isDark ? 'mt-3 text-sm text-slate-300' : 'mt-3 text-sm text-slate-600'}>
  {user?.first_name || 'Investor'}, welcome to
  <span className="font-semibold text-sky-500">NexaFunds</span>,
  where you get to interact with
  <span className="font-semibold text-emerald-500">
    {totalUsers} active {totalUsers === 1 ? 'trader' : 'traders'}
  </span>
  and follow live portfolio performance as our trading community grows.
</p>
</div>
          <div className="space-y-6 px-4 py-6 sm:px-6">
            <section className="grid gap-5 xl:grid-cols-[1.6fr_0.8fr]">
              <div
                className={
                  isDark
                    ? 'overflow-hidden rounded-[30px] border border-slate-800/90 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.45)]'
                    : 'overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-br from-white via-sky-50 to-emerald-50 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.12)]'
                }
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className={isDark ? 'text-sm uppercase tracking-[0.22em] text-sky-400' : 'text-sm uppercase tracking-[0.22em] text-sky-600'}>
                      MT5 Live Overview
                    </p>
                    <h3 className="mt-4 text-3xl font-bold">Active MT5 account synced successfully</h3>
                    <p className={isDark ? 'mt-3 max-w-lg text-sm text-slate-300' : 'mt-3 max-w-lg text-sm text-slate-600'}>
                      Balance, equity, floating profit, and open positions are updating automatically every 5 seconds from the
                      currently logged-in MT5 account.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-right">
                    <p className={isDark ? 'text-xs uppercase tracking-[0.18em] text-emerald-300' : 'text-xs uppercase tracking-[0.18em] text-emerald-700'}>
                      Total Return
                    </p>
                    <h4 className="mt-2 text-3xl font-bold text-emerald-500">
                      {account.totalReturn >= 0 ? '+' : ''}
                      {account.totalReturn.toFixed(2)}%
                    </h4>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className={isDark ? 'rounded-2xl border border-slate-700/80 bg-slate-800/70 p-4' : 'rounded-2xl border border-slate-200 bg-white/70 p-4'}>
                    <p className={isDark ? 'text-xs uppercase tracking-[0.18em] text-slate-400' : 'text-xs uppercase tracking-[0.18em] text-slate-500'}>
                      Open Positions
                    </p>
                    <h4 className="mt-3 text-2xl font-bold">{positions.length}</h4>
                  </div>

                  <div className={isDark ? 'rounded-2xl border border-slate-700/80 bg-slate-800/70 p-4' : 'rounded-2xl border border-slate-200 bg-white/70 p-4'}>
                    <p className={isDark ? 'text-xs uppercase tracking-[0.18em] text-slate-400' : 'text-xs uppercase tracking-[0.18em] text-slate-500'}>
                      Floating P/L
                    </p>
                    <h4 className={`mt-3 text-2xl font-bold ${account.totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                      {account.totalProfit >= 0 ? '+' : '-'}
                      {money(Math.abs(account.totalProfit))}
                    </h4>
                  </div>

                  <div className={isDark ? 'rounded-2xl border border-slate-700/80 bg-slate-800/70 p-4' : 'rounded-2xl border border-slate-200 bg-white/70 p-4'}>
                    <p className={isDark ? 'text-xs uppercase tracking-[0.18em] text-slate-400' : 'text-xs uppercase tracking-[0.18em] text-slate-500'}>
                      Equity
                    </p>
                    <h4 className="mt-3 text-2xl font-bold text-emerald-500">{money(account.portfolioValue)}</h4>
                  </div>
                </div>
              </div>

              <div
                className={
                  isDark
                    ? 'rounded-[30px] border border-slate-800/90 bg-slate-900/70 p-5 shadow-[0_30px_60px_rgba(15,23,42,0.45)]'
                    : 'rounded-[30px] border border-slate-200 bg-white/70 p-5 shadow-[0_30px_60px_rgba(15,23,42,0.12)]'
                }
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">MT5 Account</h3>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500">Live</span>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Balance', node: <span className="font-semibold text-emerald-500">{money(account.currentBalance)}</span> },
                    { label: 'Equity', node: <span className="font-semibold text-emerald-500">{money(account.portfolioValue)}</span> },
                    {
                      label: 'Floating Profit',
                      node: (
                        <span className={`font-semibold ${account.totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                          {account.totalProfit >= 0 ? '+' : '-'}
                          {money(Math.abs(account.totalProfit))}
                        </span>
                      ),
                    },
                    { label: 'Open Positions', node: <span className="font-semibold text-sky-500">{positions.length}</span> },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className={
                        isDark
                          ? 'flex items-center justify-between rounded-2xl border border-slate-700/80 bg-slate-800/70 p-3'
                          : 'flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3'
                      }
                    >
                      <span className="font-medium">{row.label}</span>
                      {row.node}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              {accessCards.map((card) => (
                <div
                  key={card.label}
                  className={
                    isDark
                      ? 'rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.28)] backdrop-blur-xl'
                      : 'rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl'
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={isDark ? 'text-xs uppercase tracking-[0.18em] text-slate-400' : 'text-xs uppercase tracking-[0.18em] text-slate-500'}>
                        {card.label}
                      </p>
                      <h4 className="mt-2 text-2xl font-bold">{card.value}</h4>
                    </div>
                    <span
                      className={
                        card.tone === 'sky'
                          ? 'rounded-full bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-500'
                          : 'rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500'
                      }
                    >
                      Active
                    </span>
                  </div>
                  <p className={isDark ? 'mt-3 text-sm text-slate-300' : 'mt-3 text-sm text-slate-600'}>{card.detail}</p>
                  <a
                    href={card.actionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={
                      card.tone === 'sky'
                        ? 'mt-4 inline-flex items-center justify-center rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-sky-600/20 transition hover:-translate-y-0.5'
                        : 'mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5'
                    }
                  >
                    {card.actionLabel}
                  </a>
                </div>
              ))}
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className={
                    isDark
                      ? 'group rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.35)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-sky-500/30'
                      : 'group rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-sky-200'
                  }
                >
                  <div className="flex items-center justify-between">
                    <p className={isDark ? 'text-sm text-slate-400' : 'text-sm text-slate-500'}>{item.label}</p>
                    <span
                      className={
                        item.tone === 'emerald'
                          ? 'rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500'
                          : item.tone === 'blue'
                            ? 'rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-500'
                            : item.tone === 'violet'
                              ? 'rounded-full bg-violet-500/10 px-2 py-1 text-xs font-medium text-violet-500'
                              : 'rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-500'
                      }
                    >
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
                    ? 'rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.32)] backdrop-blur-xl'
                    : 'rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl'
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
                      ? 'relative overflow-hidden rounded-[28px] border border-slate-700/80 bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950 p-6'
                      : 'relative overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6'
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
              </div>

              <div
                className={
                  isDark
                    ? 'rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.32)] backdrop-blur-xl'
                    : 'rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl'
                }
              >
                <h3 className="text-lg font-semibold">Recent activity</h3>
                <div className="mt-5 space-y-4">
                  {activity.map((item) => (
                    <div
                      key={item.title}
                      className={
                        isDark
                          ? 'flex items-start justify-between gap-3 border-b border-slate-700 pb-3 last:border-0 last:pb-0'
                          : 'flex items-start justify-between gap-3 border-b border-slate-200 pb-3 last:border-0 last:pb-0'
                      }
                    >
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className={isDark ? 'text-xs text-slate-400' : 'text-xs text-slate-500'}>{item.time}</p>
                      </div>
                      <span className={isDark ? 'text-sm font-medium text-sky-400' : 'text-sm font-medium text-sky-600'}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div
                className={
                  isDark
                    ? 'rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.32)] backdrop-blur-xl'
                    : 'rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl'
                }
              >
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">EA in use</h3>
                    <p className={isDark ? 'text-sm text-slate-400' : 'text-sm text-slate-500'}>Current trading system and update status</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(true)}
                    className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition duration-200 hover:-translate-y-0.5"
                  >
                    Update EA
                  </button>
                </div>

                <div className={isDark ? 'rounded-2xl border border-slate-700 bg-slate-800/80 p-5' : 'rounded-2xl border border-slate-200 bg-slate-50 p-5'}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={isDark ? 'text-sm text-slate-400' : 'text-sm text-slate-500'}>Active strategy</p>
                      <h4 className="mt-1 text-2xl font-bold">{eaSettings.ea_name}</h4>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-500">{eaSettings.ea_status}</span>
                  </div>

                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Risk profile</span>
                      <span className="font-medium text-amber-500">{eaSettings.ea_risk}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Max drawdown</span>
                      <span className="font-medium">{eaSettings.ea_drawdown}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Auto trading</span>
                      <span className="font-medium text-emerald-500">{eaSettings.auto_trade ? 'On' : 'Off'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={
                  isDark
                    ? 'rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.32)] backdrop-blur-xl'
                    : 'rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl'
                }
              >
                <h3 className="text-xl font-semibold">Account status</h3>
                <div className="mt-5 space-y-4">
                  <div className={isDark ? 'rounded-2xl bg-slate-800/80 p-4' : 'rounded-2xl bg-slate-50 p-4'}>
                    <p className={isDark ? 'text-sm text-slate-400' : 'text-sm text-slate-500'}>Registered investors</p>
                    <h4 className="mt-2 text-3xl font-bold text-blue-500">{totalUsers}</h4>
                  </div>

                  <div className={isDark ? 'rounded-2xl bg-slate-800/80 p-4' : 'rounded-2xl bg-slate-50 p-4'}>
                    <p className={isDark ? 'text-sm text-slate-400' : 'text-sm text-slate-500'}>Monthly gain</p>
                    <h4 className="mt-2 text-3xl font-bold text-emerald-500">+{account.monthlyGain || 12.5}%</h4>
                  </div>

                  <div className={isDark ? 'rounded-2xl bg-slate-800/80 p-4' : 'rounded-2xl bg-slate-50 p-4'}>
                    <p className={isDark ? 'text-sm text-slate-400' : 'text-sm text-slate-500'}>All-time return</p>
                    <h4 className="mt-2 text-3xl font-bold text-emerald-500">+48.7%</h4>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className={isDark ? 'w-full max-w-xl rounded-[28px] border border-slate-700 bg-slate-900 p-6 shadow-2xl' : 'w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl'}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className={isDark ? 'text-sm uppercase tracking-[0.18em] text-sky-400' : 'text-sm uppercase tracking-[0.18em] text-sky-600'}>
                  Trading settings
                </p>
                <h3 className="mt-2 text-2xl font-bold">EA controls</h3>
              </div>
              <button type="button" onClick={() => setShowSettingsModal(false)} className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={isDark ? 'mb-2 block text-sm text-slate-300' : 'mb-2 block text-sm text-slate-600'}>Strategy name</label>
                <input
                  type="text"
                  value={eaSettings.ea_name}
                  onChange={(event) => setEaSettings({ ...eaSettings, ea_name: event.target.value })}
                  className={isDark ? 'w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none' : 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none'}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={isDark ? 'mb-2 block text-sm text-slate-300' : 'mb-2 block text-sm text-slate-600'}>Risk profile</label>
                  <select
                    value={eaSettings.ea_risk}
                    onChange={(event) => setEaSettings({ ...eaSettings, ea_risk: event.target.value })}
                    className={isDark ? 'w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none' : 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none'}
                  >
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className={isDark ? 'mb-2 block text-sm text-slate-300' : 'mb-2 block text-sm text-slate-600'}>Max drawdown %</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={eaSettings.ea_drawdown}
                    onChange={(event) => setEaSettings({ ...eaSettings, ea_drawdown: event.target.value })}
                    className={isDark ? 'w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none' : 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none'}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={isDark ? 'mb-2 block text-sm text-slate-300' : 'mb-2 block text-sm text-slate-600'}>EA status</label>
                  <select
                    value={eaSettings.ea_status}
                    onChange={(event) => setEaSettings({ ...eaSettings, ea_status: event.target.value })}
                    className={isDark ? 'w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none' : 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none'}
                  >
                    <option value="Live">Live</option>
                    <option value="Standby">Standby</option>
                    <option value="Paused">Paused</option>
                  </select>
                </div>

                <div>
                  <label className={isDark ? 'mb-2 block text-sm text-slate-300' : 'mb-2 block text-sm text-slate-600'}>Max order size</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={eaSettings.max_order_size}
                    onChange={(event) => setEaSettings({ ...eaSettings, max_order_size: event.target.value })}
                    className={isDark ? 'w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none' : 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none'}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'auto_trade', label: 'Auto-trading' },
                  { key: 'push_notifications', label: 'Push notifications' },
                  { key: 'pamm_access', label: 'PAMM access' },
                  { key: 'broker_access', label: 'Broker access' },
                ].map((toggle) => (
                  <label
                    key={toggle.key}
                    className={
                      isDark
                        ? 'flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-3 text-slate-100'
                        : 'flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-800'
                    }
                  >
                    <span>{toggle.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(eaSettings[toggle.key])}
                      onChange={(event) => setEaSettings({ ...eaSettings, [toggle.key]: event.target.checked })}
                      className="h-4 w-4 rounded"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className={isDark ? 'rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100' : 'rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700'}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEaSettings}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
              >
                Save settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
