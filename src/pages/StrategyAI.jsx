import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  BrainCircuit,
  ChartNoAxesCombined,
  CheckCheck,
  Compass,
  ExternalLink,
  House,
  Send,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { PortalPageLayout } from '../components/PortalSidebar'

const API_BASE = (
  import.meta.env.VITE_NEXA_AI_API_URL ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000' : 'https://nexa-funds-ai.onrender.com')
).replace(/\/$/, '')
const USER_API_BASE = 'https://nexafunds-app.onrender.com'
const ANONYMOUS_ID_KEY = 'nexafunds-ai-user-id'
const CONVERSATION_KEY = 'nexafunds-ai-conversation-v2'
const MODE_KEY = `${CONVERSATION_KEY}-mode`
const makeId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
const timeNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const makeMessage = (role, content, extra = {}) => ({
  id: makeId(),
  role,
  content,
  time: timeNow(),
  ...extra,
})

const getAnonymousId = () => {
  const existing = localStorage.getItem(ANONYMOUS_ID_KEY)
  if (existing) return existing
  const id = `anonymous-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
  localStorage.setItem(ANONYMOUS_ID_KEY, id)
  return id
}

const getErrorMessage = (data, status) =>
  data?.error ||
  data?.detail ||
  data?.message ||
  `NEXA AI returned HTTP ${status}. Please try again.`

const startOptions = [
  { label: 'Help me navigate NexaFunds', value: 'start-navigation', icon: Compass },
  { label: 'Test or edit a trading strategy', value: 'start-strategy', icon: BrainCircuit },
]

const navigationTopics = [
  {
    label: 'Dashboard overview',
    value: 'dashboard',
    icon: House,
    path: '/dashboard',
    description: 'Account summary, MT5 status, performance, and recent activity.',
    details:
      'The Dashboard is your main overview. It brings together account and MT5 status, open positions, performance, recent activity, the EA journal, and preferences. Use the left sidebar to move between the main areas.',
  },
  {
    label: 'EA access and license',
    value: 'ea-access',
    icon: ShieldCheck,
    path: '/dashboard?section=ea-access',
    description: 'Register an MT5 account, follow verification, and access an approved EA.',
    details:
      'Open EA access from the Dashboard sidebar. For a live account, choose Pepperstone or Headway and use its partner link or QR code to open it under the NexaFunds IB. Existing Headway customers should ask Headway to change their partner ID to 4809668. For a demo account, select Demo and type the broker name. Enter your MT5 account number; NexaFunds verifies the exact server during review before issuing the account-bound key and download.',
  },
  {
    label: 'Portfolio',
    value: 'portfolio',
    icon: ChartNoAxesCombined,
    path: '/portfolio',
    description: 'Review portfolio values, holdings, and allocation.',
    details:
      'Portfolio shows the account summary, active holdings, and allocation view. The values depend on the account and data currently connected to the portal.',
  },
  {
    label: 'Transactions',
    value: 'transactions',
    icon: ArrowLeftRight,
    path: '/transactions',
    details:
      'Transactions shows recent account activity and lets you record a deposit or withdrawal amount with a note. These entries are portal records; adding one does not transfer money.',
    description: 'Review activity or record a deposit/withdrawal entry.',
  },
  {
    label: 'Strategy AI',
    value: 'strategy-ai',
    icon: BrainCircuit,
    path: '/strategy-ai',
    details:
      'Strategy AI has two modes: guided website navigation and strategy testing. Choose strategy testing to describe or revise an idea in your own words. A backtest is historical evidence, not a promise of future results.',
    description: 'Get guided help or describe a strategy to test and revise.',
  },
  {
    label: 'Sign in or create an account',
    value: 'account',
    icon: UserRound,
    path: '/login',
    details:
      'Use Login to sign in with your registered email and password. New users can choose Create an account from the home page or Login page. There is currently no self-service password-reset link in the portal.',
    description: 'Find the login and account registration pages.',
  },
  {
    label: 'Admin license review',
    value: 'admin',
    icon: ShieldCheck,
    path: '/admin/licenses',
    details:
      'The Admin license review page is for NexaFunds staff. The admin API key is required to open the request queue, upload the EA, and approve or reject account requests. Regular customer accounts do not have admin access.',
    description: 'Staff-only request queue and EA upload page.',
  },
]

const findTopic = (value) => navigationTopics.find((topic) => topic.value === value)
const choiceIcons = {
  'start-navigation': Compass,
  'start-strategy': BrainCircuit,
  dashboard: House,
  'ea-access': ShieldCheck,
  portfolio: ChartNoAxesCombined,
  transactions: ArrowLeftRight,
  'strategy-ai': BrainCircuit,
  account: UserRound,
  admin: ShieldCheck,
  'navigation-menu': Compass,
  'finish-navigation': CheckCheck,
}

async function sendChatMessage(message, userId) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, user_id: userId }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(getErrorMessage(data, response.status))
  return data
}

async function getBacktestJob(jobId) {
  const response = await fetch(`${API_BASE}/backtest/jobs/${encodeURIComponent(jobId)}`)
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(getErrorMessage(data, response.status))
  return data
}

const value = (object, keys, fallback = null) =>
  keys
    .map((key) => object?.[key])
    .find((item) => item !== undefined && item !== null && item !== '') ?? fallback

const display = (item, fallback = 'Not available') =>
  item === null || item === undefined || item === ''
    ? fallback
    : typeof item === 'boolean'
      ? item
        ? 'Yes'
        : 'No'
      : String(item)

const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined || !Number.isFinite(Number(seconds))) {
    return 'Estimating remaining time…'
  }
  const amount = Math.max(0, Math.round(Number(seconds)))
  return amount < 60
    ? `About ${amount} second${amount === 1 ? '' : 's'} remaining`
    : `About ${Math.round(amount / 60)} minute${Math.round(amount / 60) === 1 ? '' : 's'} remaining`
}

function Progress({ progress }) {
  const percent = Math.max(0, Math.min(100, Number(progress.progress || 0) * 100))
  return (
    <div className="mt-4 rounded-2xl border border-[#5bd1a7]/20 bg-[#5bd1a7]/[0.06] p-4">
      <div className="flex justify-between text-xs text-[#d1d5cc]">
        <span>Backtest progress</span>
        <strong className="text-[#5bd1a7]">{Math.round(percent)}%</strong>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/30">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#5bd1a7] to-[#eac16e] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-3 grid gap-2 text-xs text-[#a8b0a9] sm:grid-cols-2">
        <span>{display(value(progress, ['current_dataset', 'dataset', 'symbol']), 'Dataset pending')}</span>
        <span>{display(value(progress, ['current_combination', 'combination']), 'Combination pending')}</span>
        <span>{display(progress.completed, '0')} / {display(progress.total, 'Estimating')} completed</span>
        <span>{display(progress.elapsed_seconds, '…')} elapsed</span>
        <span className="sm:col-span-2">{formatDuration(value(progress, ['eta_seconds', 'estimated_remaining_seconds']))}</span>
      </div>
    </div>
  )
}

const resultFields = [
  ['Symbol', ['symbol']],
  ['Timeframe', ['timeframe']],
  ['EA platform', ['ea_platform', 'platform']],
  ['Trades', ['trades', 'total_trades', 'number_of_trades']],
  ['Win rate', ['win_rate', 'winning_rate']],
  ['Profit factor', ['profit_factor']],
  ['Expectancy', ['expectancy']],
  ['Net profit / return', ['net_profit', 'net_return', 'return', 'total_return']],
  ['Maximum drawdown', ['maximum_drawdown', 'max_drawdown']],
  ['Walk-forward', ['walk_forward_status', 'walk_forward_validation', 'validation_status']],
]

function Result({ job }) {
  const result = job?.result || job?.results || job?.data || job
  const candidates = value(result, ['candidates', 'ranked_candidates', 'candidate_strategies'], [])
  return (
    <div className="mt-4 rounded-2xl border border-[#5bd1a7]/20 bg-[#5bd1a7]/[0.06] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#5bd1a7]">
        Historical backtest evidence
      </p>
      <p className="mt-2 text-sm text-[#f3f1e9]">
        {display(
          value(result, ['summary', 'message']),
          'The historical backtest completed. Treat these results as evidence, not a guarantee of future profitability.'
        )}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        {[
          ['Datasets tested', ['datasets_tested', 'tested_datasets', 'total_datasets']],
          ['Skipped', ['skipped_datasets', 'datasets_skipped']],
          ['Candidates', ['aggregate_candidate_count', 'candidate_count', 'total_candidates']],
        ].map(([label, keys]) => (
          <div key={label}>
            <p className="text-[#a8b0a9]">{label}</p>
            <p className="mt-1 text-lg font-semibold text-[#f3f1e9]">
              {display(value(result, keys))}
            </p>
          </div>
        ))}
      </div>
      {Array.isArray(candidates) && candidates.length > 0 && (
        <div className="mt-4 space-y-3">
          {candidates.map((candidate, index) => (
            <div
              key={candidate.id || index}
              className="rounded-2xl border border-white/[0.08] bg-black/20 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold text-[#f3f1e9]">
                  #{index + 1} {display(value(candidate, ['strategy', 'combination', 'name', 'strategy_name']), 'Candidate')}
                </p>
                <span className="text-[10px] uppercase tracking-[0.12em] text-[#a8b0a9]">
                  Historical evidence
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                {resultFields.map(([label, keys]) => (
                  <div key={label}>
                    <p className="text-[#a8b0a9]">{label}</p>
                    <p className="mt-1 break-words text-[#f3f1e9]">
                      {display(value(candidate, keys))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Message({ message, onChoice, onNavigate }) {
  const assistant = message.role === 'assistant'
  return (
    <div className={`flex items-end gap-3 ${assistant ? 'justify-start' : 'justify-end'}`}>
      {assistant && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#eac16e]/30 bg-[#102b25] text-[#eac16e]">
          <BrainCircuit size={21} />
        </div>
      )}
      <div
        className={`max-w-[92%] rounded-[20px] px-4 py-3 text-[13px] leading-5 shadow-lg sm:max-w-[78%] ${
          assistant
            ? 'rounded-bl-md border border-[#eac16e]/10 bg-[#10211d] text-[#f3f1e9]'
            : 'rounded-br-md bg-gradient-to-r from-[#286a54] to-[#347c60] text-white'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <div className={`mt-2 flex items-center gap-2 text-[10px] ${assistant ? 'text-[#a8b0a9]' : 'justify-end text-white/70'}`}>
          <span>{message.time || timeNow()}</span>
          {!assistant && <CheckCheck size={14} />}
        </div>

        {message.questions?.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
            {message.questions.map((question, index) => (
              <p key={question.field || index} className="text-[#d1d5cc]">
                <span className="font-medium text-[#eac16e]">
                  {question.field ? `${question.field}: ` : ''}
                </span>
                {question.question || question}
              </p>
            ))}
          </div>
        )}

        {message.topic && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate(message.topic.path)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#eac16e] to-[#5bd1a7] px-3 py-2 text-xs font-semibold text-[#0d1117] transition hover:brightness-110"
            >
              Open {message.topic.label}
              <ExternalLink size={14} />
            </button>
          </div>
        )}

        {message.choices?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
            {message.choices.map((choice) => {
            const Icon = typeof choice.icon === 'function' ? choice.icon : choiceIcons[choice.value]
              return (
                <button
                  type="button"
                  key={choice.value}
                  disabled={message.choicesDisabled}
                  onClick={() => onChoice(choice)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#eac16e]/20 bg-[#0b1714] px-3 py-2 text-left text-xs font-medium text-[#f3f1e9] transition hover:border-[#5bd1a7]/50 hover:bg-[#17382f] disabled:cursor-wait disabled:opacity-50"
                >
                  {Icon && <Icon size={15} className="text-[#eac16e]" />}
                  {choice.label}
                </button>
              )
            })}
          </div>
        )}

        {message.progress && <Progress progress={message.progress} />}
        {message.job && <Result job={message.job} />}
      </div>
    </div>
  )
}

function Typing() {
  return (
    <div className="flex items-end gap-3" role="status" aria-live="polite">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#eac16e]/30 bg-[#102b25] text-[#eac16e]">
        <BrainCircuit size={21} />
      </div>
      <div className="rounded-2xl rounded-bl-md border border-[#eac16e]/10 bg-[#10211d] px-4 py-3 text-sm text-[#d1d5cc]">
        NEXA AI is working…
      </div>
    </div>
  )
}

const readSavedMessages = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CONVERSATION_KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

const readSavedMode = () => {
  const savedMode = localStorage.getItem(MODE_KEY)
  return ['choose', 'navigation', 'strategy'].includes(savedMode) ? savedMode : 'choose'
}

export default function StrategyAI() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState(() => getAnonymousId())
  const [messages, setMessages] = useState(() => {
    const saved = readSavedMessages()
    return saved.length > 0
      ? saved
      : [
          makeMessage(
            'assistant',
            'Welcome to Strategy AI. What would you like help with today?',
            { choices: startOptions }
          ),
        ]
  })
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState(readSavedMode)
  const [sending, setSending] = useState(false)
  const [serviceStatus, setServiceStatus] = useState('checking')
  const bottomRef = useRef(null)
  const pollTimers = useRef(new Set())

  useEffect(() => {
    localStorage.setItem(CONVERSATION_KEY, JSON.stringify(messages))
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode)
  }, [mode])

  useEffect(() => {
    let cancelled = false
    const timers = pollTimers.current
    fetch(`${USER_API_BASE}/api/auth/me`, { credentials: 'include' })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data.success && data.user) {
          setUserId(String(data.user.id || data.user.user_id || data.user.email || getAnonymousId()))
        }
      })
      .catch((error) => console.warn('Unable to identify the Strategy AI user:', error))

    return () => {
      cancelled = true
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 12000)

    fetch(`${API_BASE}/health`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Health check returned HTTP ${response.status}`)
        return response.json()
      })
      .then((data) => {
        if (!cancelled) setServiceStatus(data?.status === 'healthy' ? 'online' : 'offline')
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('NEXA AI health check failed:', error)
          setServiceStatus('offline')
        }
      })
      .finally(() => window.clearTimeout(timer))

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [])

  const updateMessage = useCallback((id, changes) => {
    setMessages((current) =>
      current.map((message) => (message.id === id ? { ...message, ...changes } : message))
    )
  }, [])

  const addStartChoices = useCallback((content = 'What would you like help with next?') => {
    setMode('choose')
    setMessages((current) => [
      ...current,
      makeMessage('assistant', content, { choices: startOptions }),
    ])
  }, [])

  const choose = useCallback((choice) => {
    setMessages((current) => [
      ...current,
      makeMessage('user', choice.label),
    ])

    if (choice.value === 'start-navigation') {
      setMode('navigation')
      setMessages((current) => [
        ...current,
        makeMessage(
          'assistant',
          'Sure — choose the part of NexaFunds you want to learn about. You can use the buttons below; no typing is needed.',
          { choices: navigationTopics }
        ),
      ])
      return
    }

    if (choice.value === 'start-strategy') {
      setMode('strategy')
      setMessages((current) => [
        ...current,
        makeMessage(
          'assistant',
          'Describe a strategy you want to test, or tell me what to change in the strategy you are discussing. Include the symbol, timeframe, entry rules, exits, and risk limits if you know them. I will ask for details that are missing.'
        ),
      ])
      return
    }

    if (choice.value === 'navigation-menu') {
      setMode('navigation')
      setMessages((current) => [
        ...current,
        makeMessage('assistant', 'Which NexaFunds area would you like to explore?', {
          choices: navigationTopics,
        }),
      ])
      return
    }

    if (choice.value === 'finish-navigation') {
      addStartChoices('You’re welcome! Choose another option whenever you need help.')
      return
    }

    const topic = findTopic(choice.value)
    if (topic) {
      setMode('navigation')
      setMessages((current) => [
        ...current,
        makeMessage('assistant', topic.details, {
          topic: { label: topic.label, path: topic.path },
          choices: [
            { label: 'Explore another area', value: 'navigation-menu', icon: Compass },
            { label: 'I’m all set', value: 'finish-navigation', icon: CheckCheck },
            { label: 'Test a strategy instead', value: 'start-strategy', icon: BrainCircuit },
          ],
        }),
      ])
    }
  }, [addStartChoices])

  const pollJob = useCallback(async (jobId, progressId) => {
    try {
      const job = await getBacktestJob(jobId)
      const status = String(job.status || job.state || '').toLowerCase()
      if (status === 'completed') {
        updateMessage(progressId, {
          content: 'The backtest is complete. Here are the ranked historical results.',
          progress: null,
          job,
        })
      } else if (status === 'failed') {
        updateMessage(progressId, {
          content: `The backtest could not be completed: ${display(job.error, 'The backend reported an unknown error.')}`,
          progress: null,
        })
      } else {
        updateMessage(progressId, { progress: job })
        const timer = window.setTimeout(() => {
          pollTimers.current.delete(timer)
          pollJob(jobId, progressId)
        }, 3000)
        pollTimers.current.add(timer)
      }
    } catch (error) {
      updateMessage(progressId, {
        content: `The backtest progress could not be loaded: ${error.message}. Please try again later.`,
        progress: null,
      })
    }
  }, [updateMessage])

  const send = async (event) => {
    event?.preventDefault()
    const message = draft.trim()
    if (!message || sending || mode !== 'strategy') return

    setMessages((current) => [
      ...current,
      makeMessage('user', message),
      makeMessage('assistant', 'Sending your strategy to NEXA AI…', { pending: true }),
    ])
    setDraft('')
    setSending(true)
    try {
      const data = await sendChatMessage(message, userId)
      if (!data || data.success !== true) {
        throw new Error(data?.error || 'The NEXA AI service returned an invalid response.')
      }
      const status = String(data.status || '').toLowerCase()
      const responseMessage = makeMessage(
        'assistant',
        data.message || 'I received your request.',
        {
          questions: data.questions,
          progress: ['queued', 'running'].includes(status) ? { progress: 0, status } : null,
        }
      )
      setMessages((current) => [
        ...current.filter((item) => !item.pending),
        responseMessage,
      ])
      if (['queued', 'running'].includes(status) && data.job_id) {
        pollJob(data.job_id, responseMessage.id)
      }
    } catch (error) {
      setDraft(message)
      setMessages((current) => [
        ...current.filter((item) => !item.pending),
        makeMessage(
          'assistant',
          `I couldn’t reach NEXA AI: ${error.message}. Your strategy text is still available in the message above; please try sending it again.`
        ),
      ])
    } finally {
      setSending(false)
    }
  }

  const restart = () => {
    pollTimers.current.forEach((timer) => window.clearTimeout(timer))
    pollTimers.current.clear()
    setMode('choose')
    setDraft('')
    setMessages([
      makeMessage('assistant', 'Welcome to Strategy AI. What would you like help with today?', {
        choices: startOptions,
      }),
    ])
  }

  return (
    <PortalPageLayout activeLabel="Strategy AI">
      <div className="min-h-screen p-4 text-[#f3f1e9] sm:p-7 lg:p-9">
        <header className="mx-auto mb-5 flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#eac16e]/25 bg-[#102b25] text-[#eac16e]">
              <BrainCircuit size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Strategy <span className="text-[#5bd1a7]">AI</span>
              </h1>
              <p className="text-xs text-[#a8b0a9] sm:text-sm">
                Guided website help or historical strategy testing.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 rounded-full border border-white/10 bg-[#10211d] px-3 py-2 text-xs"
              role="status"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  serviceStatus === 'online'
                    ? 'bg-[#5bd1a7]'
                    : serviceStatus === 'checking'
                      ? 'bg-[#eac16e]'
                      : 'bg-red-400'
                }`}
              />
              NEXA AI {serviceStatus}
            </div>
            <button
              type="button"
              onClick={restart}
              className="rounded-xl border border-[#eac16e]/20 bg-[#10211d] px-3 py-2 text-xs font-medium text-[#eac16e] transition hover:bg-[#17382f]"
            >
              Start over
            </button>
          </div>
        </header>

        <section className="mx-auto flex h-[calc(100vh-185px)] min-h-[500px] max-w-6xl flex-col overflow-hidden rounded-3xl border border-[#eac16e]/15 bg-gradient-to-br from-[#10211d]/95 to-[#0b100e]/95 shadow-[0_24px_70px_rgba(0,0,0,.28)]">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
            {messages.map((message) => (
              <Message
                key={message.id}
                message={message}
                onChoice={choose}
                onNavigate={(path) => navigate(path)}
              />
            ))}
            {sending && <Typing />}
            <div ref={bottomRef} />
          </div>

          {mode === 'strategy' ? (
            <form
              onSubmit={send}
              className="m-3 mt-0 flex items-end gap-3 rounded-2xl border border-[#5bd1a7]/25 bg-black/20 p-3 sm:m-5 sm:mt-0"
            >
              <label htmlFor="strategy-message" className="sr-only">
                Describe or edit a strategy
              </label>
              <textarea
                id="strategy-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    send()
                  }
                }}
                rows={2}
                maxLength={4000}
                placeholder="Describe a strategy, or tell NEXA AI what you want to change…"
                className="max-h-40 min-h-12 flex-1 resize-y bg-transparent px-2 py-2 text-sm text-[#f3f1e9] outline-none placeholder:text-[#a8b0a9]"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                aria-label="Send strategy"
                className="flex h-11 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#eac16e] to-[#5bd1a7] text-[#0d1117] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={19} />
              </button>
            </form>
          ) : (
            <p className="border-t border-white/[0.06] px-5 py-3 text-center text-xs text-[#a8b0a9]">
              {mode === 'navigation'
                ? 'Choose an option above to continue. Navigation help does not require typing.'
                : 'Choose a mode above to get started.'}
            </p>
          )}
        </section>
      </div>
    </PortalPageLayout>
  )
}
