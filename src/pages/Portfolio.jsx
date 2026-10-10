import { useEffect, useState } from 'react'

const API_BASE = 'https://nexafunds-app.onrender.com'

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
    <div className="min-h-screen space-y-6 bg-[#090d0f] p-4 text-[#f3f1e9] sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <p className="text-[#a8b0a9]">
            Live MT5 portfolio overview
          </p>
        </div>

        <div
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            connected
              ? 'bg-[#5bd1a7]/10 text-[#5bd1a7]'
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
              className="h-28 animate-pulse rounded-3xl bg-[#14211d]/80"
            />
          ))
        ) : (
          <>
            <div className="rounded-3xl border border-[#eac16e]/15 bg-[#111a17]/90 p-5">
              <p className="text-sm text-[#a8b0a9]">Current balance</p>
              <h3 className="mt-3 text-3xl font-bold">
                {formatMoney(account.balance)}
              </h3>
            </div>

            <div className="rounded-3xl border border-[#eac16e]/15 bg-[#111a17]/90 p-5">
              <p className="text-sm text-[#a8b0a9]">Portfolio value</p>
              <h3 className="mt-3 text-3xl font-bold">
                {formatMoney(account.equity)}
              </h3>
            </div>

            <div className="rounded-3xl border border-[#eac16e]/15 bg-[#111a17]/90 p-5">
              <p className="text-sm text-[#a8b0a9]">Net profit</p>
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

            <div className="rounded-3xl border border-[#eac16e]/15 bg-[#111a17]/90 p-5">
              <p className="text-sm text-[#a8b0a9]">Invested capital</p>
              <h3 className="mt-3 text-3xl font-bold">
                {formatMoney(account.balance)}
              </h3>
            </div>
          </>
        )}
      </div>

      {/* Active Holdings */}
      <div className="rounded-3xl border border-[#eac16e]/15 bg-[#111a17]/90 p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">Active holdings</h3>
            <p className="text-sm text-[#a8b0a9]">
              Live open positions from the active MT5 account
            </p>
          </div>

          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-500">
            {positions.length} open
          </span>
        </div>

        {positions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#eac16e]/20 bg-[#0b100e]/70 p-8 text-center text-sm text-[#a8b0a9]">
            No active MT5 positions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[#eac16e]/20 text-left text-[#a8b0a9]">
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
                    className="border-b border-white/[0.06] last:border-0"
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
      <div className="rounded-3xl border border-[#eac16e]/15 bg-[#111a17]/90 p-6">
        <h3 className="text-xl font-semibold">Portfolio allocation</h3>

        {totalExposure === 0 ? (
          <p className="mt-4 text-sm text-[#a8b0a9]">
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
                    <span className="text-[#d1d5cc]">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-[#26322c]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#eac16e] to-[#5bd1a7] transition-all duration-500"
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