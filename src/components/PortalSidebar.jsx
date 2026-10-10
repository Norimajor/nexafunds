import { ArrowLeftRight, BrainCircuit, ChartPie, House, Menu, ShieldCheck } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'

const navItems = [
  { label: 'Overview', path: '/dashboard', icon: House },
  { label: 'EA access', path: '/dashboard?section=ea-access', icon: ShieldCheck },
  { label: 'Portfolio', path: '/portfolio', icon: ChartPie },
  { label: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
  { label: 'Strategy AI', path: '/strategy-ai', icon: BrainCircuit },
]

export function PortalNavigation({ activeLabel, onNavigate, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const currentLabel = activeLabel || navItems.find((item) => item.path === location.pathname)?.label

  const selectItem = (item) => {
    if (onNavigate) onNavigate(item.label, item.path)
    else navigate(item.path)
    onClose?.()
  }

  return (
    <div>
      <div className="mb-12 flex items-center gap-3 px-1">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#eac16e] to-[#5bd1a7] text-2xl font-black italic text-[#0d1117] shadow-[0_10px_25px_rgba(234,193,110,.2)]">
          N
        </div>
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight text-[#f3f1e9]">NEXA FUNDS</h1>
          <p className="text-[9px] font-bold tracking-[0.24em] text-[#eac16e]">TRADE · GROW · ACHIEVE</p>
        </div>
      </div>

      <nav className="space-y-3" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentLabel === item.label
          return (
            <button
              key={item.path}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => selectItem(item)}
              className={`group flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left text-[15px] font-medium transition duration-200 ${
                isActive
                  ? 'border-transparent bg-gradient-to-r from-[#eac16e] to-[#5bd1a7] text-white shadow-[0_8px_25px_rgba(91,209,167,.2)]'
                  : 'border-transparent bg-[#102b25]/80 text-[#d1d5cc] hover:border-[#eac16e]/15 hover:bg-[#17382f]'
              }`}
            >
              <Icon
                size={23}
                strokeWidth={1.8}
                className={isActive ? 'text-white' : 'text-[#eac16e]'}
              />
              <span>{item.label}</span>
              {isActive && <span className="ml-auto h-2 w-2 rounded-full bg-white/80" />}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default function PortalSidebar({
  activeLabel,
  onNavigate,
  mobileOpen = false,
  onMobileClose,
}) {
  return (
    <>
      <aside className="hidden min-h-screen w-[320px] shrink-0 flex-col border-r border-[#eac16e]/10 bg-[#081211]/95 px-6 py-7 backdrop-blur-xl lg:flex">
        <PortalNavigation activeLabel={activeLabel} onNavigate={onNavigate} />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden" onClick={onMobileClose}>
          <aside
            className="flex h-full w-[300px] flex-col border-r border-[#eac16e]/15 bg-[#081211] px-6 py-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex justify-end">
              <button
                type="button"
                aria-label="Close navigation"
                onClick={onMobileClose}
                className="rounded-lg px-2 py-1 text-[#d1d5cc] hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            <PortalNavigation
              activeLabel={activeLabel}
              onNavigate={onNavigate}
              onClose={onMobileClose}
            />
          </aside>
        </div>
      )}
    </>
  )
}

export function PortalPageLayout({ activeLabel, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#090d0f] text-[#f3f1e9]">
      <PortalSidebar
        activeLabel={activeLabel}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <main className="min-w-0 flex-1">
        <header className="flex items-center gap-3 border-b border-[#eac16e]/10 bg-[#091316]/90 px-4 py-3 lg:hidden">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            className="rounded-xl border border-[#eac16e]/20 bg-[#102b25] p-2 text-[#eac16e]"
          >
            <Menu size={20} />
          </button>
          <div>
            <p className="font-semibold tracking-wide">NEXA FUNDS</p>
            <p className="text-[9px] font-bold tracking-[0.2em] text-[#eac16e]">TRADE · GROW · ACHIEVE</p>
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}
