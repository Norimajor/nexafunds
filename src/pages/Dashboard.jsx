import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, BrainCircuit, ChartNoAxesCombined, Eye, EyeOff, LayoutDashboard, LogOut, Menu, Settings2, Sun, Moon } from 'lucide-react'
import { useNfpForecast } from '../hooks/useNfpForecast'

const navItems = [
  { label: 'Overview', active: true, icon: LayoutDashboard },
  { label: 'Portfolio', icon: ChartNoAxesCombined },
  { label: 'Transactions', icon: ArrowLeftRight },
  { label: 'Strategy AI', icon: BrainCircuit },
]

const API_BASE = 'https://nexafunds-app.onrender.com'

const buildChartGeometry = (points) => {
  if (!points.length) return null

  const values = points.map((point) => Number(point.equity ?? point.balance ?? 0))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = max - min || Math.max(Math.abs(max) * 0.01, 1)
  const top = 18
  const bottom = 198
  const left = 15
  const right = 685
  const coordinates = values.map((value, index) => {
    const x = points.length === 1 ? (left + right) / 2 : left + (index / (points.length - 1)) * (right - left)
    const y = bottom - ((value - min) / spread) * (bottom - top)
    return [x, y]
  })
  const linePath = coordinates.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
  const areaPath = `${linePath} L ${coordinates.at(-1)[0].toFixed(2)} ${bottom} L ${coordinates[0][0].toFixed(2)} ${bottom} Z`

  return { linePath, areaPath }
}

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
  const [marketVisualVisible, setMarketVisualVisible] = useState(true)
  const [marketVisualFailed, setMarketVisualFailed] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)
  const [activeNav, setActiveNav] = useState('Overview')
  const [activeRange, setActiveRange] = useState('3M')
  const [eaStatus, setEaStatus] = useState({ status: 'OFFLINE', live: false, ea: null })
  const [journal, setJournal] = useState([])
  const [performance, setPerformance] = useState([])

  const [account, setAccount] = useState({
    currentBalance: 0,
    totalProfit: 0,
    portfolioValue: 0,
    totalInvested: 0,
    margin: 0,
    freeMargin: 0,
    updatedAt: null,
    login: '',
  })

  const [eaSettings, setEaSettings] = useState(defaultSettings)
  const [totalUsers, setTotalUsers] = useState(0)
  const [user, setUser] = useState({ first_name: 'Investor' })
  const [positions, setPositions] = useState([])
  const [economicForecasts, setEconomicForecasts] = useState(null)
  const { forecast: nfpForecast, loading: nfpLoading, error: nfpError } = useNfpForecast()

  const [eaStats, setEaStats] = useState({
    activeStrategy: 'Unknown',
    riskProfile: 'Unknown',
    maxDrawdown: 0,
    autoTrading: false,
    openPositions: 0,
    todayProfit: 0,
  })

  const [mt5Connected, setMt5Connected] = useState(false)

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

    const fetchMt5Data = async () => {
      try {
        const [accountResponse, positionsResponse] = await Promise.all([
          fetch(`${API_BASE}/api/mt5/account`),
          fetch(`${API_BASE}/api/mt5/positions`),
        ])
        const accountData = await accountResponse.json()
        const positionsData = await positionsResponse.json()
        if (cancelled) return

        const mt5 = accountData.success ? accountData.account : null
        const nextPositions = positionsData.success ? positionsData.positions || [] : []
        setPositions(nextPositions)
        setMt5Connected(Boolean(mt5 && positionsData.success))
        if (!mt5) return

        const balance = Number(mt5.balance) || 0
        const equity = Number(mt5.equity) || 0
        const profit = Number(mt5.profit) || 0

        setAccount({
          currentBalance: balance,
          totalProfit: profit,
          portfolioValue: equity,
          totalInvested: balance,
          margin: Number(mt5.margin) || 0,
          freeMargin: Number(mt5.free_margin) || 0,
          updatedAt: mt5.updated_at,
          login: mt5.login || '',
        })

        setEaStats((current) => ({
          ...current,
          openPositions: nextPositions.length,
          todayProfit: profit,
        }))
      } catch (error) {
        if (!cancelled) setMt5Connected(false)
        console.error('Failed to fetch MT5 data:', error)
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

    const fetchEconomicForecasts = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/economic/latest`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        setEconomicForecasts(data.forecasts || null)
      } catch (error) {
        console.error('Failed to fetch economic forecasts:', error)
        setEconomicForecasts(null)
      }
    }

    const fetchLiveTelemetry = async () => {
      try {
        const [statusResponse, journalResponse, performanceResponse] = await Promise.all([
          fetch(`${API_BASE}/api/mt5/status`),
          fetch(`${API_BASE}/api/mt5/journal?limit=8`),
          fetch(`${API_BASE}/api/mt5/performance?range=${activeRange}`),
        ])
        const [statusData, journalData, performanceData] = await Promise.all([
          statusResponse.json(),
          journalResponse.json(),
          performanceResponse.json(),
        ])
        if (cancelled) return
        if (statusData.success) setEaStatus(statusData)
        if (journalData.success) setJournal(journalData.events || [])
        if (performanceData.success) setPerformance(performanceData.points || [])
      } catch (error) {
        if (!cancelled) setEaStatus((current) => ({ ...current, status: 'OFFLINE', live: false }))
        console.error('Failed to fetch MT5 telemetry:', error)
      }
    }

    fetchUser()
    fetchMt5Data()
    fetchEaSettings()
    fetchTotalUsers()
    fetchEconomicForecasts()
    fetchLiveTelemetry()

    const interval = setInterval(() => {
      fetchMt5Data()
      fetchEconomicForecasts()
      fetchLiveTelemetry()
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activeRange])

  const money = (value) =>
    `$${Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const stats = [
    { label: 'Current balance', value: money(account.currentBalance), change: mt5Connected ? 'Live' : 'Offline', tone: 'emerald' },
    { label: 'Floating P/L', value: money(account.totalProfit), change: 'MT5', tone: account.totalProfit >= 0 ? 'blue' : 'amber' },
    { label: 'Portfolio value', value: money(account.portfolioValue), change: 'Equity', tone: 'violet' },
    { label: 'Free margin', value: money(account.freeMargin), change: 'Available', tone: 'amber' },
  ]

  const formatDate = (value) => {
    if (!value) return 'N/A'
    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatNfpValue = (value) => {
    if (value == null) return 'N/A'
    const number = Number(value)
    return Number.isFinite(number) ? `${number.toFixed(1)}K` : 'N/A'
  }

  const formatPredictorValue = (value, suffix) => {
    const number = Number(value)
    return Number.isFinite(number) ? `${number.toFixed(1)}${suffix}` : 'N/A'
  }

  const predictorCards = [
    {
      key: 'nfp',
      name: 'NFP',
      title: 'Non-Farm Payrolls',
      description: 'Employment release',
      tone: 'sky',
      data: nfpForecast
        ? {
            ...nfpForecast,
            prediction: nfpForecast.nfp_prediction,
            consensus: nfpForecast.consensus_nfp,
            surprise: nfpForecast.expected_surprise,
            direction: nfpForecast.surprise_direction,
          }
        : null,
      valueSuffix: 'K',
    },
    { key: 'cpi', name: 'CPI', title: 'Consumer Price Index', description: 'Inflation release', tone: 'amber', data: economicForecasts?.cpi, valueSuffix: '%' },
    { key: 'ppi', name: 'PPI', title: 'Producer Price Index', description: 'Producer inflation', tone: 'violet', data: economicForecasts?.ppi, valueSuffix: '%' },
    { key: 'fomc', name: 'FOMC', title: 'Federal Funds Rate', description: 'Rate decision', tone: 'emerald', data: economicForecasts?.fomc, valueSuffix: '%' },
  ]

  const chartGeometry = buildChartGeometry(performance)

  const formatJournalEvent = (event) => {
    const details = [event.symbol, event.side, event.volume != null ? `${event.volume} lots` : null, event.ticket ? `#${event.ticket}` : null]
      .filter(Boolean)
      .join(' ')
    const labels = {
      EA_CONNECTED: 'EA connected',
      EA_DISCONNECTED: 'EA disconnected',
      EA_STATUS_CHANGED: 'EA status changed',
      POSITION_OPENED: 'Position opened',
      POSITION_CLOSED: 'Position closed',
      POSITION_CHANGED: 'Position changed',
    }
    const version = event.ea_version ? `EA ${event.ea_version}` : event.ea_name ? `EA ${event.ea_name}` : null
    return {
      title: labels[event.event_type] || event.event_type,
      detail: [details, version, formatDate(event.created_at)].filter(Boolean).join(' · ') || 'MT5 event',
      value: event.profit == null ? '' : money(event.profit),
    }
  }

  const activity = journal.map(formatJournalEvent)

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
    ? 'rounded-3xl border border-white/[0.08] bg-white/[0.045] shadow-[0_24px_70px_-28px_rgba(0,0,0,0.95)] backdrop-blur-xl ring-1 ring-inset ring-white/[0.04]'
    : 'rounded-3xl border border-slate-900/10 bg-white/80 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl ring-1 ring-inset ring-white'

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
      'group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-transparent px-4 py-3 text-left text-sm font-medium',
      pressable,
      isActive
        ? 'border-white/[0.08] bg-white/[0.06] text-white backdrop-blur-xl before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:bg-cyan-400 before:shadow-[0_0_12px_rgba(34,211,238,0.7)]'
        : isDark
          ? 'text-white/60 hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-white active:bg-sky-500/10 active:text-sky-200'
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
          ? 'relative min-h-screen overflow-x-hidden bg-transparent text-slate-100'
          : 'relative min-h-screen overflow-x-hidden bg-[#eef2f8] text-slate-900'
      }
    >
      {/* Layered market background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[radial-gradient(1200px_600px_at_-10%_-10%,rgba(56,189,248,0.22),transparent_60%),radial-gradient(900px_500px_at_110%_10%,rgba(129,140,248,0.18),transparent_60%),radial-gradient(900px_600px_at_50%_120%,rgba(16,185,129,0.16),transparent_60%)]">
        {isDark && !marketVisualFailed && (
          <img
            src="/assets/stock-trading-bg.jpg"
            alt=""
            loading="lazy"
            onError={() => setMarketVisualFailed(true)}
            className={`absolute inset-0 h-full w-full object-cover object-center transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
              marketVisualVisible ? 'translate-x-0' : 'translate-x-full'
            }`}
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(2,8,23,0.78)_0%,rgba(2,8,23,0.42)_42%,rgba(4,10,28,0.72)_100%),radial-gradient(circle_at_70%_15%,rgba(16,170,255,0.12),transparent_38%)]" />
        <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(to_right,rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.10)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1680px]">
        {/* ---------------- Sidebar ---------------- */}
        <aside
          className={
            isDark
              ? 'hidden min-h-screen w-72 shrink-0 border-r border-white/[0.08] bg-[#0a0e1a]/90 p-6 shadow-[12px_0_60px_-35px_rgba(16,185,255,0.22)] backdrop-blur-2xl lg:flex lg:flex-col'
              : 'hidden min-h-screen w-72 shrink-0 border-r border-slate-900/5 bg-white/70 p-6 backdrop-blur-2xl lg:flex lg:flex-col'
          }
        >
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-lg font-bold text-white shadow-[0_12px_30px_-8px_rgba(14,165,233,1)]">
              N
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">NexaFunds</h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300/70">Investor Portal</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = activeNav === item.label
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => goTo(item.label)}
                  className={navButton(item, isActive)}
                >
                  <item.icon size={20} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="mt-auto space-y-4">
            <div className={`p-4 ${surface}`}>
              <p className={label}>Account</p>
              <h3 className="mt-3 text-lg font-semibold">Premium Investor</h3>
              <p className={`mt-1 text-sm ${softText}`}>Tier 3 performance plan</p>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setShowSettingsPanel(true)}
                className={navButton({ label: 'Settings' }, false)}
              >
                <Settings2 size={20} strokeWidth={1.8} />
                <span>Settings</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={`${navButton({ label: 'Logout' }, false)} hover:border-rose-400/20 hover:bg-rose-500/10 hover:text-rose-200`}
              >
                <LogOut size={20} strokeWidth={1.8} />
                <span>Logout</span>
              </button>
            </div>
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
                  ? 'h-full w-72 border-r border-white/10 bg-[#030d25]/95 p-6'
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

              <nav className="space-y-1.5">
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
                      <item.icon size={20} strokeWidth={1.8} />
                      <span>{item.label}</span>
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
                  <Settings2 size={20} strokeWidth={1.8} />
                  <span>Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileSidebarOpen(false)
                    navigate('/login')
                  }}
                  className={`${navButton({ label: 'Logout' }, false)} hover:border-rose-400/20 hover:bg-rose-500/10 hover:text-rose-200`}
                >
                  <LogOut size={20} strokeWidth={1.8} />
                  <span>Logout</span>
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
                ? 'sticky top-0 z-30 overflow-hidden rounded-b-2xl border-b border-white/[0.08] bg-[#0a0e1a]/75 px-4 py-4 shadow-[0_15px_45px_-35px_rgba(56,189,248,0.45)] backdrop-blur-2xl sm:px-6 sm:py-5'
                : 'sticky top-0 z-30 overflow-hidden rounded-b-2xl border-b border-slate-900/5 bg-white/70 px-4 py-4 backdrop-blur-2xl sm:px-6 sm:py-5'
            }
          >
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-blue-500/0 via-cyan-400/60 to-violet-500/0" />
            <button
              type="button"
              onClick={() => setMarketVisualVisible((visible) => !visible)}
              aria-label={marketVisualVisible ? 'Hide market background' : 'Show market background'}
              title={marketVisualVisible ? 'Hide market background' : 'Show market background'}
              className={`absolute right-2 top-1/2 z-10 inline-flex h-9 w-7 -translate-y-1/2 items-center justify-center rounded-l-lg border border-r-0 text-slate-300 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 sm:right-3 sm:h-10 sm:w-8 ${
                isDark
                  ? 'border-white/10 bg-slate-950/70 hover:bg-cyan-400/10 hover:text-cyan-200'
                  : 'border-slate-200 bg-white/80 text-slate-600 hover:bg-sky-50 hover:text-sky-600'
              }`}
            >
              {marketVisualVisible ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
            </button>
            <div className="relative flex flex-col gap-4 pr-8 sm:flex-row sm:items-center sm:justify-between sm:pr-10">
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
                  <Menu size={19} strokeWidth={1.8} />
                </button>

                <div className="relative">
                  <div className="pointer-events-none absolute -inset-x-3 -inset-y-2 -z-10 bg-sky-400/10 blur-2xl" />
                  <p className={`text-xs font-medium tracking-wide sm:text-sm ${softText}`}>Welcome back</p>
                  <h2 className="text-2xl font-bold tracking-tight text-white sm:text-[28px]">Dashboard overview</h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-3">
                <span className="inline-flex h-9 items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300 shadow-[0_8px_24px_-16px_rgba(52,211,153,0.9)]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
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
                  <Settings2 size={16} strokeWidth={1.8} /> <span>Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className={[
                    'inline-flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-medium',
                    pressable,
                    isDark
                      ? 'border-white/10 bg-white/[0.05] text-slate-100 hover:border-amber-300/50 hover:text-amber-200 active:bg-amber-400/20'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-indigo-300 hover:text-indigo-600 active:bg-indigo-100',
                  ].join(' ')}
                >
                  {isDark ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}
                  <span>{isDark ? 'Light' : 'Dark'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className={[
                    'inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-rose-500/90 to-fuchsia-500/90 px-4 text-sm font-semibold text-white shadow-[0_14px_30px_-12px_rgba(244,63,94,0.9)]',
                    pressable,
                    'hover:from-rose-600 hover:to-pink-600 active:from-rose-700 active:to-pink-700',
                  ].join(' ')}
                >
                  <LogOut size={16} strokeWidth={1.8} />
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
                    <h3 className="mt-4 text-3xl font-bold tracking-tight">
                      {mt5Connected ? 'Active MT5 account synced successfully' : 'Waiting for MT5 account sync'}
                    </h3>
                    <p className={`mt-3 max-w-lg text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Balance, equity, floating profit, and open positions are updating automatically every 5 seconds from
                      the currently logged-in MT5 account.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-4 text-right shadow-[0_18px_40px_-24px_rgba(16,185,129,0.9)]">
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                      Last sync
                    </p>
                    <h4 className="mt-2 text-lg font-bold tabular-nums text-emerald-500">
                      {account.updatedAt ? formatDate(account.updatedAt) : 'Not available'}
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

            {/* Economic predictors */}
            <section>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className={label}>Market intelligence</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">USD Economic Predictors</h2>
                  <p className={`mt-1 text-sm ${softText}`}>AI signals for the releases most likely to move your portfolio.</p>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tonePill.sky}`}>Live model feed</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {predictorCards.map((predictor) => {
                  const forecast = predictor.data
                  const consensus = forecast?.consensus ?? forecast?.consensus_nfp
                  const surprise = forecast?.surprise ?? forecast?.expected_surprise
                  const signalTone =
                    forecast?.direction === 'Bearish' || forecast?.direction === 'bearish'
                      ? 'text-rose-400'
                      : 'text-emerald-500'

                  return (
                    <article
                      key={predictor.key}
                      className={`${surface} group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/40`}
                    >
                      <div className={`absolute inset-x-0 top-0 h-1 ${predictor.tone === 'sky' ? 'bg-sky-500' : predictor.tone === 'amber' ? 'bg-amber-500' : predictor.tone === 'violet' ? 'bg-violet-500' : 'bg-emerald-500'}`} />
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className={`rounded-lg px-2 py-1 text-xs font-bold ${tonePill[predictor.tone]}`}>{predictor.name}</span>
                          <h3 className="mt-4 text-base font-semibold">{predictor.title}</h3>
                          <p className={`mt-1 text-xs ${softText}`}>{predictor.description}</p>
                        </div>
                        <div className="text-right">
                          <p className={label}>Release</p>
                          <p className="mt-1 text-xs font-semibold tabular-nums">{formatDate(forecast?.forecast_release_date)}</p>
                        </div>
                      </div>

                      {predictor.key === 'nfp' && nfpLoading ? (
                        <div className={`mt-8 flex items-center gap-3 py-6 text-sm ${softText}`}>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400" />
                          Loading USDNewsAI forecast...
                        </div>
                      ) : predictor.key === 'nfp' && (nfpError || !forecast) ? (
                        <div
                          className={`mt-8 rounded-2xl border px-4 py-5 text-sm ${
                            isDark
                              ? 'border-amber-400/20 bg-amber-400/5 text-amber-200/90'
                              : 'border-amber-300/60 bg-amber-50 text-amber-700'
                          }`}
                        >
                          NFP forecast is temporarily unavailable. The rest of the dashboard is unaffected.
                        </div>
                      ) : forecast ? (
                        <>
                          <div className="mt-6 flex items-end justify-between gap-2">
                            <div>
                              <p className={label}>AI forecast</p>
                              <p className="mt-1 text-3xl font-bold tabular-nums">{formatPredictorValue(forecast.prediction, predictor.valueSuffix)}</p>
                            </div>
                            <p className={`text-sm font-semibold ${signalTone}`}>{forecast.direction || 'Neutral'}</p>
                          </div>
                          <div className={`mt-5 grid grid-cols-2 gap-3 border-t pt-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                            <div>
                              <p className={label}>Consensus</p>
                              <p className="mt-1 text-sm font-semibold tabular-nums">{consensus != null ? formatPredictorValue(consensus, predictor.valueSuffix) : 'N/A'}</p>
                            </div>
                            <div>
                              <p className={label}>Surprise</p>
                              <p className="mt-1 text-sm font-semibold tabular-nums">{surprise != null ? `${Number(surprise) > 0 ? '+' : ''}${formatPredictorValue(surprise, predictor.valueSuffix)}` : 'N/A'}</p>
                            </div>
                          </div>
                          <p className={`mt-4 text-xs ${softText}`}>AI forecast vs. consensus</p>
                        </>
                      ) : (
                        <div className={`mt-8 py-6 text-sm ${softText}`}>Loading forecast...</div>
                      )}
                    </article>
                  )
                })}
              </div>

              {/* NFP technical details (USDNewsAI model metadata) */}
              {nfpForecast && (
                <div className={`${surface} mt-4 p-5`}>
                  <p className={label}>NFP model details</p>
                  <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      ['Model', nfpForecast.model || 'N/A'],
                      ['Forecast release date', formatDate(nfpForecast.forecast_release_date)],
                      ['Reference month', formatDate(nfpForecast.reference_month)],
                      ['Information cutoff', formatDate(nfpForecast.information_cutoff)],
                      ['Training rows', nfpForecast.training_rows ?? 'N/A'],
                      ['Feature count', nfpForecast.feature_count ?? 'N/A'],
                      ['Ridge prediction', formatNfpValue(nfpForecast.ridge_prediction)],
                      ['Random forest prediction', formatNfpValue(nfpForecast.rf_prediction)],
                      ['Gradient boosting prediction', formatNfpValue(nfpForecast.gb_prediction)],
                    ].map(([title, value]) => (
                      <div key={title}>
                        <p className={`text-xs ${softText}`}>{title}</p>
                        <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                      {chartGeometry ? (
                        <>
                          <path d={chartGeometry.areaPath} fill="url(#chartGradient)" opacity="0.28" />
                          <path
                            d={chartGeometry.linePath}
                            fill="none"
                            stroke="url(#chartStroke)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      ) : null}
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
                    {!chartGeometry && (
                      <div className={`absolute inset-0 flex items-center justify-center text-sm ${softText}`}>
                        No MT5 performance history recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={`${surface} p-5`}>
                <h3 className="text-lg font-semibold tracking-tight">Recent activity</h3>
                <div className="mt-5 space-y-1">
                  {activity.length === 0 && <p className={`rounded-2xl px-3 py-3 text-sm ${softText}`}>No MT5 events recorded yet.</p>}
                  {activity.map((item, index) => (
                    <div
                      key={`${item.title}-${index}`}
                      className={[
                        'flex items-start justify-between gap-3 rounded-2xl px-3 py-3 transition-colors duration-200',
                        isDark ? 'hover:bg-white/[0.06] active:bg-sky-500/15' : 'hover:bg-slate-100 active:bg-sky-100',
                      ].join(' ')}
                    >
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className={`text-xs ${softText}`}>{item.detail}</p>
                      </div>
                      <span className={`text-right text-xs font-semibold ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>{item.value || 'MT5'}</span>
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
                      <h4 className="mt-1 text-2xl font-bold tracking-tight">{eaStatus.ea?.name || 'EA not reported'}</h4>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${eaStatus.live ? tonePill.emerald : 'bg-rose-500/12 text-rose-400 ring-1 ring-inset ring-rose-500/25'}`}>
                      {eaStatus.live ? 'Live' : 'Offline'}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className={softText}>Risk profile</span>
                      <span className="font-semibold text-amber-500">{eaSettings.ea_risk}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={softText}>Open positions</span>
                      <span className="font-semibold tabular-nums">{eaStats.openPositions}</span>
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
                    { k: 'MT5 account', v: account.login || 'Not synced', cls: 'text-sky-500' },
                    { k: 'Margin used', v: money(account.margin), cls: 'text-amber-500' },
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
