import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const navItems = [
  { label: 'Overview', active: true },
  { label: 'Portfolio' },
  { label: 'Transactions' },
  { label: 'Strategy AI' },
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
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)
  const [activeNav, setActiveNav] = useState('Overview')
  const [activeRange, setActiveRange] = useState('3M')

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
  const [user, setUser] = useState({ first_name: 'Investor' })
  const [positions, setPositions] = useState([])
  const [nfpForecast, setNfpForecast] = useState(null)

  // ✅ NEW LIVE EA STATS
  const [eaStats, setEaStats] = useState({
    activeStrategy: 'Unknown',
    riskProfile: 'Unknown',
    maxDrawdown: 0,
    autoTrading: false,
    openPositions: 0,
    todayProfit: 0,
  })

  useEffect(() => {
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('nexafunds-theme', theme)
  }, [theme])

  useEffect(() => {
    let cancelled = false

    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
        const data = await response.json()
        if (!cancelled && data.success && data.user) setUser(data.user)
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
        const profit = Number(mt5.profit) || 0

        setAccount({
          currentBalance: balance,
          totalProfit: profit,
          portfolioValue: equity,
          totalInvested: balance,
          monthlyGain: 12.5,
          totalReturn: balance > 0 ? ((equity - balance) / balance) * 100 : 0,
        })

        // ✅ UPDATE LIVE EA STATS
        setEaStats({
          activeStrategy: mt5.server || 'MT5 Live Engine',
          riskProfile:
            balance > 0 && ((equity - balance) / balance) * 100 > 10 ? 'Moderate' : 'Conservative',
          maxDrawdown: Math.max(0, balance - equity),
          autoTrading: true,
          openPositions: positions.length,
          todayProfit: profit,
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

    const fetchNfpForecast = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/nfp/latest`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        setNfpForecast(data)
      } catch (error) {
        console.error('Failed to fetch NFP forecast:', error)
        setNfpForecast(null)
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
      fetchNfpForecast()
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
      setShowSettingsPanel(false)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Unable to update EA settings')
    }
  }

  const isDark = theme === 'dark'

  /* ---------- shared style helpers (professional, consistent) ---------- */
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
  if (labelName === 'Portfolio') navigate('/portfolio')
  if (labelName === 'Transactions') navigate('/transactions')
  if (labelName === 'Strategy AI') navigate('/strategy-ai')
}

  /* ---------- shared EA settings form (used by modal + panel) ---------- */
  const settingsForm = (
    <div className="space-y-4">
      <div>
        <label className={`mb-2 block text-sm ${softText}`}>Strategy name</label>
        <input
          type="text"
          value={eaSettings.ea_name}
          onChange={(event) => setEaSettings({ ...eaSettings, ea_name: event.target.value })}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={`mb-2 block text-sm ${softText}`}>Risk profile</label>
          <select
            value={eaSettings.ea_risk}
            onChange={(event) => setEaSettings({ ...eaSettings, ea_risk: event.target.value })}
            className={inputClass}
          >
            <option value="Low">Low</option>
            <option value="Moderate">Moderate</option>
            <option value="High">High</option>
          </select>
        </div>

        <div>
          <label className={`mb-2 block text-sm ${softText}`}>Max drawdown %</label>
          <input
            type="number"
            min="1"
            max="50"
            value={eaSettings.ea_drawdown}
            onChange={(event) => setEaSettings({ ...eaSettings, ea_drawdown: event.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={`mb-2 block text-sm ${softText}`}>EA status</label>
          <select
            value={eaSettings.ea_status}
            onChange={(event) => setEaSettings({ ...eaSettings, ea_status: event.target.value })}
            className={inputClass}
          >
            <option value="Live">Live</option>
            <option value="Standby">Standby</option>
            <option value="Paused">Paused</option>
          </select>
        </div>

        <div>
          <label className={`mb-2 block text-sm ${softText}`}>Max order size</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={eaSettings.max_order_size}
            onChange={(event) => setEaSettings({ ...eaSettings, max_order_size: event.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-3">
        {[
          { key: 'auto_trade', label: 'Auto-trading' },
          { key: 'push_notifications', label: 'Push notifications' },
          { key: 'pamm_access', label: 'PAMM access' },
          { key: 'broker_access', label: 'Broker access' },
        ].map((toggle) => {
          const on = Boolean(eaSettings[toggle.key])
          return (
            <label
              key={toggle.key}
              className={[
                'flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm transition-all duration-200 active:scale-[0.99]',
                on
                  ? 'border-sky-500/40 bg-sky-500/10 text-sky-500'
                  : isDark
                    ? 'border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300',
              ].join(' ')}
            >
              <span className="font-medium">{toggle.label}</span>
              <span className="flex items-center gap-3">
                <span
                  className={[
                    'relative h-6 w-11 rounded-full transition-colors duration-200',
                    on ? 'bg-gradient-to-r from-blue-600 to-cyan-400' : isDark ? 'bg-slate-700' : 'bg-slate-300',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200',
                      on ? 'left-[22px]' : 'left-0.5',
                    ].join(' ')}
                  />
                </span>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(event) => setEaSettings({ ...eaSettings, [toggle.key]: event.target.checked })}
                  className="sr-only"
                />
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )

  return (
    <div
      className={
        isDark
          ? 'relative min-h-screen overflow-hidden bg-[#070b16] text-slate-100'
          : 'relative min-h-screen overflow-hidden bg-[#eef2f8] text-slate-900'
      }
    >
      {/* layered ambient background */}
      <div
        className={
          isDark
            ? 'pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_-10%_-10%,rgba(56,189,248,0.20),transparent_60%),radial-gradient(900px_500px_at_110%_10%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(900px_600px_at_50%_120%,rgba(16,185,129,0.14),transparent_60%)]'
            : 'pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_-10%_-10%,rgba(56,189,248,0.22),transparent_60%),radial-gradient(900px_500px_at_110%_10%,rgba(129,140,248,0.18),transparent_60%),radial-gradient(900px_600px_at_50%_120%,rgba(16,185,129,0.16),transparent_60%)]'
        }
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.10)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
      />

      <div className="relative mx-auto flex max-w-[1600px]">
        {/* ---------------- Sidebar ---------------- */}
        <aside
          className={
            isDark
              ? 'hidden min-h-screen w-72 shrink-0 border-r border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl lg:flex lg:flex-col'
              : 'hidden min-h-screen w-72 shrink-0 border-r border-slate-900/5 bg-white/70 p-6 backdrop-blur-2xl lg:flex lg:flex-col'
          }
        >
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
            {navItems.map((item) => {
              const isActive = activeNav === item.label
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => goTo(item.label)}
                  className={navButton(item, isActive)}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="h-2.5 w-2.5 rounded-full bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.8)]" />}
                </button>
              )
            })}

            <button
              type="button"
              onClick={() => setShowSettingsPanel(true)}
              className={navButton({ label: 'Settings' }, false)}
            >
              <span>Settings</span>
              <span className={`text-xs ${softText}`}>⚙</span>
            </button>
          </nav>

          <div className={`mt-auto p-4 ${surface}`}>
            <p className={label}>Account</p>
            <h3 className="mt-3 text-lg font-semibold">Premium Investor</h3>
            <p className={`mt-1 text-sm ${softText}`}>Tier 3 performance plan</p>
          </div>
        </aside>

        {/* ---------------- Mobile sidebar ---------------- */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={
                isDark
                  ? 'h-full w-72 border-r border-white/10 bg-slate-950/95 p-6'
                  : 'h-full w-72 border-r border-slate-200 bg-white/95 p-6'
              }
            >
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-lg font-bold text-white">
                    N
                  </div>
                  <h1 className="text-lg font-bold">NexaFunds</h1>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`${pressable} rounded-lg px-2 py-1 ${isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  ✕
                </button>
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => {
                  const isActive = activeNav === item.label
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setMobileSidebarOpen(false)
                        goTo(item.label)
                      }}
                      className={navButton(item, isActive)}
                    >
                      <span>{item.label}</span>
                      {isActive && <span className="h-2.5 w-2.5 rounded-full bg-white/90" />}
                    </button>
                  )
                })}

                <button
                  type="button"
                  onClick={() => {
                    setMobileSidebarOpen(false)
                    setShowSettingsPanel(true)
                  }}
                  className={navButton({ label: 'Settings' }, false)}
                >
                  <span>Settings</span>
                  <span className={`text-xs ${softText}`}>⚙</span>
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* ---------------- Main ---------------- */}
        <main className="min-w-0 flex-1">
          <header
            className={
              isDark
                ? 'sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 px-4 py-5 backdrop-blur-2xl sm:px-6'
                : 'sticky top-0 z-30 border-b border-slate-900/5 bg-white/70 px-4 py-5 backdrop-blur-2xl sm:px-6'
            }
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className={[
                    'inline-flex h-10 w-10 items-center justify-center rounded-xl border text-lg lg:hidden',
                    pressable,
                    isDark
                      ? 'border-white/10 bg-white/[0.05] text-slate-100 hover:border-sky-400/50 hover:text-sky-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-600',
                  ].join(' ')}
                >
                  ☰
                </button>

                <div>
                  <p className={`text-sm ${softText}`}>Welcome back</p>
                  <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Dashboard overview</h2>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <span className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium sm:inline-flex ${tonePill.emerald}`}>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Live sync
                </span>

                <button
                  type="button"
                  onClick={() => setShowSettingsPanel(true)}
                  className={[
                    'inline-flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-medium',
                    pressable,
                    isDark
                      ? 'border-white/10 bg-white/[0.05] text-slate-100 hover:border-sky-400/50 hover:text-sky-300 active:bg-sky-500/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-600 active:bg-sky-100',
                  ].join(' ')}
                >
                  ⚙ <span className="hidden sm:inline">Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className={[
                    'h-10 rounded-full border px-3 text-sm font-medium',
                    pressable,
                    isDark
                      ? 'border-white/10 bg-white/[0.05] text-slate-100 hover:border-amber-300/50 hover:text-amber-200 active:bg-amber-400/20'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-indigo-300 hover:text-indigo-600 active:bg-indigo-100',
                  ].join(' ')}
                >
                  {isDark ? '☀️ Light' : '🌙 Dark'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className={[
                    'h-10 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 text-sm font-semibold text-white shadow-[0_14px_30px_-12px_rgba(244,63,94,0.9)]',
                    pressable,
                    'hover:from-rose-600 hover:to-pink-600 active:from-rose-700 active:to-pink-700',
                  ].join(' ')}
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          <div className="space-y-6 px-4 py-6 sm:px-6">
            {/* Welcome banner */}
            <div
              className={
                isDark
                  ? 'relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-sky-900/50 p-6 backdrop-blur-xl'
                  : 'relative overflow-hidden rounded-[28px] border border-slate-900/5 bg-gradient-to-r from-white via-sky-50 to-emerald-50 p-6'
              }
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />
              <h2 className="relative text-2xl font-bold tracking-tight">
                {user.first_name}, welcome to NexaFunds 👋
              </h2>
              <p className={`relative mt-3 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {user.first_name}, welcome to <span className="font-semibold text-sky-500">NexaFunds</span>, where you get
                to interact with{' '}
                <span className="font-semibold text-emerald-500">
                  {totalUsers} active {totalUsers === 1 ? 'trader' : 'traders'}
                </span>{' '}
                and follow live portfolio performance as our trading community grows.
              </p>
            </div>

            {/* MT5 overview */}
            <section className="grid gap-5 xl:grid-cols-[1.6fr_0.8fr]">
              <div
                className={
                  isDark
                    ? 'relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-sky-950/60 p-6 backdrop-blur-xl'
                    : 'relative overflow-hidden rounded-[30px] border border-slate-900/5 bg-gradient-to-br from-white via-sky-50 to-emerald-50 p-6'
                }
              >
                <div className="pointer-events-none absolute -left-20 bottom--10 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
                      MT5 Live Overview
                    </p>
                    <h3 className="mt-4 text-3xl font-bold tracking-tight">Active MT5 account synced successfully</h3>
                    <p className={`mt-3 max-w-lg text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Balance, equity, floating profit, and open positions are updating automatically every 5 seconds from
                      the currently logged-in MT5 account.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-4 text-right shadow-[0_18px_40px_-24px_rgba(16,185,129,0.9)]">
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                      Total Return
                    </p>
                    <h4
                      className={`mt-2 text-3xl font-bold tabular-nums ${
                        account.totalReturn >= 0 ? 'text-emerald-500' : 'text-rose-400'
                      }`}
                    >
                      {account.totalReturn >= 0 ? '+' : ''}
                      {account.totalReturn.toFixed(2)}%
                    </h4>
                  </div>
                </div>

                <div className="relative mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    { k: 'Open Positions', v: <span className="text-2xl font-bold tabular-nums">{positions.length}</span> },
                    {
                      k: 'Floating P/L',
                      v: (
                        <span
                          className={`text-2xl font-bold tabular-nums ${
                            account.totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-400'
                          }`}
                        >
                          {account.totalProfit >= 0 ? '+' : '-'}
                          {money(Math.abs(account.totalProfit))}
                        </span>
                      ),
                    },
                    { k: 'Equity', v: <span className="text-2xl font-bold tabular-nums text-emerald-500">{money(account.portfolioValue)}</span> },
                  ].map((cell) => (
                    <div
                      key={cell.k}
                      className={[
                        'rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5',
                        isDark
                          ? 'border-white/10 bg-white/[0.04] hover:border-sky-400/40'
                          : 'border-slate-200 bg-white/80 hover:border-sky-300',
                      ].join(' ')}
                    >
                      <p className={label}>{cell.k}</p>
                      <h4 className="mt-3">{cell.v}</h4>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${surface} p-5`}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">MT5 Account</h3>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tonePill.emerald}`}>Live</span>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Balance', node: <span className="font-semibold tabular-nums text-emerald-500">{money(account.currentBalance)}</span> },
                    { label: 'Equity', node: <span className="font-semibold tabular-nums text-emerald-500">{money(account.portfolioValue)}</span> },
                    {
                      label: 'Floating Profit',
                      node: (
                        <span className={`font-semibold tabular-nums ${account.totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                          {account.totalProfit >= 0 ? '+' : '-'}
                          {money(Math.abs(account.totalProfit))}
                        </span>
                      ),
                    },
                    { label: 'Open Positions', node: <span className="font-semibold tabular-nums text-sky-500">{positions.length}</span> },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className={[
                        'flex items-center justify-between rounded-2xl border p-3 transition-colors duration-200',
                        isDark
                          ? 'border-white/10 bg-white/[0.04] hover:border-sky-400/40 hover:bg-sky-500/[0.07]'
                          : 'border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-sky-50',
                      ].join(' ')}
                    >
                      <span className="text-sm font-medium">{row.label}</span>
                      {row.node}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* NFP forecast */}
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-semibold tracking-tight">USD Economic Forecast</h2>
                <p className={`mt-1 text-sm ${softText}`}>AI-powered forecast based on the latest available economic data.</p>
              </div>

              <div className={`${surface} p-6`}>
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">Non-Farm Payrolls (NFP)</h3>
                    <p className={`mt-1 text-sm ${softText}`}>Next U.S. employment release</p>
                  </div>

                  {nfpForecast?.forecast_release_date && (
                    <div className="text-right">
                      <p className={label}>Release</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">{nfpForecast.forecast_release_date}</p>
                    </div>
                  )}
                </div>

                {nfpForecast ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[
                      {
                        title: 'AI Forecast',
                        main: `${Number(nfpForecast.prediction).toFixed(1)}K`,
                        sub: 'Ensemble prediction',
                      },
                      {
                        title: 'Market Consensus',
                        main:
                          nfpForecast.consensus_nfp != null ? `${Number(nfpForecast.consensus_nfp).toFixed(1)}K` : 'N/A',
                        sub: nfpForecast.consensus_source || 'No consensus available',
                      },
                      {
                        title: 'Expected Surprise',
                        main:
                          nfpForecast.expected_surprise != null
                            ? `${Number(nfpForecast.expected_surprise).toFixed(1)}K`
                            : 'N/A',
                        sub: 'AI forecast − consensus',
                      },
                      {
                        title: 'USD Direction',
                        main: nfpForecast.direction || 'N/A',
                        sub: `Magnitude: ${nfpForecast.magnitude || 'N/A'}`,
                      },
                    ].map((cell) => (
                      <div
                        key={cell.title}
                        className={[
                          'rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5',
                          isDark
                            ? 'border-white/10 bg-white/[0.04] hover:border-sky-400/40'
                            : 'border-slate-200 bg-slate-50 hover:border-sky-300',
                        ].join(' ')}
                      >
                        <p className={label}>{cell.title}</p>
                        <p className="mt-2 text-3xl font-bold tabular-nums">{cell.main}</p>
                        <p className={`mt-2 text-xs ${softText}`}>{cell.sub}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`py-6 text-sm ${softText}`}>Loading NFP forecast...</div>
                )}

                {nfpForecast && (
                  <div
                    className={`mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-xs ${
                      isDark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    <span>
                      Reference month:{' '}
                      {nfpForecast.reference_month
                        ? new Date(nfpForecast.reference_month).toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </span>
                    <span>Information cutoff: {nfpForecast.information_cutoff || 'N/A'}</span>
                    <span>Training rows: {nfpForecast.training_rows ?? 'N/A'}</span>
                    <span>Features: {nfpForecast.features ?? 'N/A'}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Access cards */}
            <section className="grid gap-4 md:grid-cols-2">
              {accessCards.map((card) => (
                <div key={card.label} className={`${surface} p-5 transition-transform duration-200 hover:-translate-y-0.5`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={label}>{card.label}</p>
                      <h4 className="mt-2 text-2xl font-bold tracking-tight">{card.value}</h4>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tonePill[card.tone]}`}>Active</span>
                  </div>
                  <p className={`mt-3 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{card.detail}</p>
                  <a
                    href={card.actionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={[
                      'mt-4 inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white',
                      pressable,
                      card.tone === 'sky'
                        ? 'bg-gradient-to-r from-sky-600 to-cyan-500 shadow-[0_14px_30px_-14px_rgba(14,165,233,0.9)] hover:from-sky-500 hover:to-cyan-400 active:from-sky-700 active:to-cyan-600'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-500 shadow-[0_14px_30px_-14px_rgba(16,185,129,0.9)] hover:from-emerald-500 hover:to-teal-400 active:from-emerald-700 active:to-teal-600',
                    ].join(' ')}
                  >
                    {card.actionLabel}
                  </a>
                </div>
              ))}
            </section>

            {/* Stats */}
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className={`${surface} group p-5 transition-all duration-300 hover:-translate-y-1 ${
                    isDark ? 'hover:border-sky-400/40' : 'hover:border-sky-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className={`text-sm ${softText}`}>{item.label}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tonePill[item.tone]}`}>
                      {item.change}
                    </span>
                  </div>
                  <h3 className="mt-4 text-3xl font-bold tabular-nums tracking-tight">{item.value}</h3>
                  <div className={`mt-4 h-1 w-full overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                    <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-500 group-hover:w-full" />
                  </div>
                </div>
              ))}
            </section>

            {/* Chart + activity */}
            <section className="grid gap-6 2xl:grid-cols-[1.4fr_0.8fr]">
              <div className={`${surface} p-5`}>
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">Portfolio performance</h3>
                    <p className={`text-sm ${softText}`}>Track growth over the last 8 months</p>
                  </div>
                  <div className={`flex gap-1 rounded-2xl p-1 text-xs font-semibold ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                    {['3M', '6M', '1Y'].map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => setActiveRange(range)}
                        className={[
                          'rounded-xl px-3 py-1.5',
                          pressable,
                          activeRange === range
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_10px_24px_-12px_rgba(14,165,233,0.9)]'
                            : isDark
                              ? 'text-slate-300 hover:bg-white/10 hover:text-white'
                              : 'text-slate-600 hover:bg-white hover:text-slate-900',
                        ].join(' ')}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className={
                    isDark
                      ? 'relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 p-6'
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
                          stroke={isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.40)'}
                          strokeWidth="1"
                          strokeDasharray="4 6"
                        />
                      ))}
                      <path d={chartPath} fill="url(#chartGradient)" opacity="0.28" />
                      <path
                        d={chartPath.replace('Z', '')}
                        fill="none"
                        stroke="url(#chartStroke)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
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

              <div className={`${surface} p-5`}>
                <h3 className="text-lg font-semibold tracking-tight">Recent activity</h3>
                <div className="mt-5 space-y-1">
                  {activity.map((item) => (
                    <div
                      key={item.title}
                      className={[
                        'flex items-start justify-between gap-3 rounded-2xl px-3 py-3 transition-colors duration-200',
                        isDark ? 'hover:bg-white/[0.06] active:bg-sky-500/15' : 'hover:bg-slate-100 active:bg-sky-100',
                      ].join(' ')}
                    >
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className={`text-xs ${softText}`}>{item.time}</p>
                      </div>
                      <span className={`text-sm font-semibold ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* EA + account status */}
            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className={`${surface} p-5`}>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">EA in use</h3>
                    <p className={`text-sm ${softText}`}>Current trading system and update status</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(true)}
                    className={[
                      'rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_-14px_rgba(37,99,235,0.9)]',
                      pressable,
                      'hover:from-blue-500 hover:to-cyan-400 active:from-blue-700 active:to-cyan-600',
                    ].join(' ')}
                  >
                    Update EA
                  </button>
                </div>

                <div
                  className={
                    isDark
                      ? 'rounded-2xl border border-white/10 bg-white/[0.04] p-5'
                      : 'rounded-2xl border border-slate-200 bg-slate-50 p-5'
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={`text-sm ${softText}`}>Active strategy</p>
                      <h4 className="mt-1 text-2xl font-bold tracking-tight">{eaSettings.ea_name}</h4>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${tonePill.emerald}`}>
                      {eaSettings.ea_status}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className={softText}>Risk profile</span>
                      <span className="font-semibold text-amber-500">{eaSettings.ea_risk}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={softText}>Max drawdown</span>
                      <span className="font-semibold tabular-nums">{eaSettings.ea_drawdown}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={softText}>Auto trading</span>
                      <span className={`font-semibold ${eaSettings.auto_trade ? 'text-emerald-500' : 'text-rose-400'}`}>
                        {eaSettings.auto_trade ? 'On' : 'Off'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${surface} p-5`}>
                <h3 className="text-xl font-semibold tracking-tight">Account status</h3>
                <div className="mt-5 space-y-4">
                  {[
                    { k: 'Registered investors', v: totalUsers, cls: 'text-blue-500' },
                    { k: 'Monthly gain', v: `+${account.monthlyGain || 12.5}%`, cls: 'text-emerald-500' },
                    { k: 'All-time return', v: '+48.7%', cls: 'text-emerald-500' },
                  ].map((row) => (
                    <div
                      key={row.k}
                      className={[
                        'rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5',
                        isDark ? 'border-white/10 bg-white/[0.04] hover:border-sky-400/40' : 'border-slate-200 bg-slate-50 hover:border-sky-300',
                      ].join(' ')}
                    >
                      <p className={`text-sm ${softText}`}>{row.k}</p>
                      <h4 className={`mt-2 text-3xl font-bold tabular-nums ${row.cls}`}>{row.v}</h4>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* ---------------- Slide-in settings panel ---------------- */}
      {showSettingsPanel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowSettingsPanel(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className={[
              'h-full w-full max-w-md overflow-y-auto border-l p-6 shadow-2xl',
              'animate-[slideIn_0.25s_ease-out]',
              isDark ? 'border-white/10 bg-slate-950/95 text-slate-100' : 'border-slate-200 bg-white text-slate-900',
            ].join(' ')}
            style={{ animationName: 'none' }}
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
                  Settings panel
                </p>
                <h3 className="mt-2 text-2xl font-bold tracking-tight">Preferences</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsPanel(false)}
                className={`${pressable} rounded-lg px-2 py-1 ${isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                ✕
              </button>
            </div>

            {/* Appearance */}
            <div className="mb-6">
              <p className={label}>Appearance</p>
              <div className={`mt-3 flex gap-1 rounded-2xl p-1 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                {['dark', 'light'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTheme(mode)}
                    className={[
                      'flex-1 rounded-xl px-3 py-2 text-sm font-semibold capitalize',
                      pressable,
                      theme === mode
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                        : isDark
                          ? 'text-slate-300 hover:bg-white/10'
                          : 'text-slate-600 hover:bg-white',
                    ].join(' ')}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick nav */}
            <div className="mb-6">
              <p className={label}>Navigate</p>
              <div className="mt-3 space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setShowSettingsPanel(false)
                      goTo(item.label)
                    }}
                    className={navButton(item, activeNav === item.label)}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* EA controls */}
            <p className={`${label} mb-3`}>EA controls</p>
            {settingsForm}

            <div className="mt-6 flex justify-end gap-3 pb-4">
              <button
                type="button"
                onClick={() => setShowSettingsPanel(false)}
                className={[
                  'rounded-xl border px-4 py-2.5 text-sm font-medium',
                  pressable,
                  isDark ? 'border-white/10 bg-white/[0.05] text-slate-100 hover:bg-white/10' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200',
                ].join(' ')}
              >
                Close
              </button>
              <button
                type="button"
                onClick={saveEaSettings}
                className={[
                  'rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_-14px_rgba(37,99,235,0.9)]',
                  pressable,
                  'hover:from-blue-500 hover:to-cyan-400 active:from-blue-700 active:to-cyan-600',
                ].join(' ')}
              >
                Save settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- EA modal ---------------- */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={
              isDark
                ? 'max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950/95 p-6 shadow-2xl'
                : 'max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl'
            }
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
                  Trading settings
                </p>
                <h3 className="mt-2 text-2xl font-bold tracking-tight">EA controls</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className={`${pressable} rounded-lg px-2 py-1 ${isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                ✕
              </button>
            </div>

            {settingsForm}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className={[
                  'rounded-xl border px-4 py-2.5 text-sm font-medium',
                  pressable,
                  isDark ? 'border-white/10 bg-white/[0.05] text-slate-100 hover:bg-white/10' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200',
                ].join(' ')}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEaSettings}
                className={[
                  'rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_-14px_rgba(37,99,235,0.9)]',
                  pressable,
                  'hover:from-blue-500 hover:to-cyan-400 active:from-blue-700 active:to-cyan-600',
                ].join(' ')}
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
