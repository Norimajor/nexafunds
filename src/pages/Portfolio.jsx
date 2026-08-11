import { useEffect, useState } from 'react'

const API_BASE = 'https://nexafunds.onrender.com'

export default function Portfolio() {
  const [account, setAccount] = useState({
    balance: 0,
    equity: 0,
    profit: 0,
  })

  const [positions, setPositions] = useState([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchPortfolio = async () => {
    try {
      const [accountRes, positionsRes] = await Promise.all([
        fetch(`${API_BASE}/api/mt5/account`),
        fetch(`${API_BASE}/api/mt5/positions`),
      ])

      const accountData = await accountRes.json()
      const positionsData = await positionsRes.json()

      if (accountData.success) {
        setAccount(accountData.account)
        setConnected(true)
      }

      if (positionsData.success) {
        setPositions(positionsData.positions || [])
      }

      setLoading(false)
    } catch (error) {
      console.error('Portfolio fetch error:', error)
      setConnected(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPortfolio()

    const interval = setInterval(fetchPortfolio, 5000)

    return () => clearInterval(interval)
  }, [])

  const formatMoney = (value) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(value || 0))

  // Calculate real allocation from open positions
  const exposure = positions.reduce((acc, p) => {
    const value = Number(p.current_price || 0) * Number(p.volume || 0)

    acc[p.symbol] = (acc[p.symbol] || 0) + value

    return acc
  }, {})

  const totalExposure = Object.values(exposure).reduce(
    (sum, value) => sum + value,
    0
  )

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <p className="text-slate-400">
            Live MT5 portfolio overview
          </p>
        </div>

        <div
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            connected
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'bg-rose-500/10 text-rose-400'
          }`}
        >
          {connected ? 'MT5 Connected' : 'MT5 Offline'}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-3xl bg-slate-800/60"
            />
          ))
        ) : (
          <>
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5">
              <p className="text-sm text-slate-400">Current balance</p>
              <h3 className="mt-3 text-3xl font-bold">
                {formatMoney(account.balance)}
              </h3>
            </div>

            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5">
              <p className="text-sm text-slate-400">Portfolio value</p>
              <h3 className="mt-3 text-3xl font-bold">
                {formatMoney(account.equity)}
              </h3>
            </div>

            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5">
              <p className="text-sm text-slate-400">Net profit</p>
              <h3
                className={`mt-3 text-3xl font-bold ${
                  Number(account.profit) >= 0
                    ? 'text-emerald-500'
                    : 'text-rose-400'
                }`}
              >
                {formatMoney(account.profit)}
              </h3>
            </div>

            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5">
              <p className="text-sm text-slate-400">Invested capital</p>
              <h3 className="mt-3 text-3xl font-bold">
                {formatMoney(account.balance)}
              </h3>
            </div>
          </>
        )}
      </div>

      {/* Active Holdings */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">Active holdings</h3>
            <p className="text-sm text-slate-400">
              Live open positions from the active MT5 account
            </p>
          </div>

          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-500">
            {positions.length} open
          </span>
        </div>

        {positions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/60 p-8 text-center text-sm text-slate-400">
            No active MT5 positions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-400">
                  <th className="py-3 pr-4 font-medium">Trading pair</th>
                  <th className="py-3 pr-4 font-medium">Type</th>
                  <th className="py-3 pr-4 font-medium">Volume</th>
                  <th className="py-3 pr-4 font-medium">Current price</th>
                  <th className="py-3 pr-4 font-medium">Profit</th>
                  <th className="py-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody>
                {positions.map((p) => (
                  <tr
                    key={p.ticket}
                    className="border-b border-slate-800/80 last:border-0"
                  >
                    <td className="py-3 pr-4 font-medium">{p.symbol}</td>

                    <td
                      className={`py-3 pr-4 font-medium ${
                        p.type === 'BUY'
                          ? 'text-emerald-500'
                          : 'text-rose-400'
                      }`}
                    >
                      {p.type}
                    </td>

                    <td className="py-3 pr-4">
                      {Number(p.volume || 0).toFixed(2)}
                    </td>

                    <td className="py-3 pr-4">
                      {Number(p.current_price || 0).toFixed(2)}
                    </td>

                    <td
                      className={`py-3 pr-4 font-semibold ${
                        Number(p.profit || 0) >= 0
                          ? 'text-emerald-500'
                          : 'text-rose-400'
                      }`}
                    >
                      {formatMoney(p.profit)}
                    </td>

                    <td className="py-3">
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-500">
                        Running
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Portfolio Allocation */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6">
        <h3 className="text-xl font-semibold">Portfolio allocation</h3>

        {totalExposure === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            No open positions available for allocation analysis.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {Object.entries(exposure).map(([symbol, value]) => {
              const percentage = (value / totalExposure) * 100

              return (
                <div key={symbol}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{symbol}</span>
                    <span className="text-slate-300">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}