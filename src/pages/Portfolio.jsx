import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Portfolio() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState({
    currentBalance: 0,
    totalProfit: 0,
    portfolioValue: 0,
    totalInvested: 0,
    monthlyGain: 0,
    totalReturn: 0,
  })

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/account/summary')
        const data = await response.json()

        if (data.success) {
          setSummary(data.summary)
        }
      } catch (error) {
        console.error('Unable to fetch portfolio summary:', error)
      }
    }

    fetchSummary()
  }, [])

  const holdings = [
    { pair: 'XAU/USD', profit: '+$420.50', roi: '+12.4%', status: 'Running' },
    { pair: 'EUR/USD', profit: '+$180.25', roi: '+5.8%', status: 'Running' },
    { pair: 'GBP/USD', profit: '-$45.10', roi: '-1.2%', status: 'Paused' },
    { pair: 'USD/JPY', profit: '+$92.75', roi: '+3.1%', status: 'Running' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <p className="text-sm text-sky-400">Portfolio</p>
            <h1 className="text-2xl font-bold">Active positions</h1>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
          >
            Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-sm text-slate-400">Current balance</p>
            <h3 className="mt-2 text-2xl font-bold text-emerald-400">${summary.currentBalance.toLocaleString()}</h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-sm text-slate-400">Portfolio value</p>
            <h3 className="mt-2 text-2xl font-bold text-blue-400">${summary.portfolioValue.toLocaleString()}</h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-sm text-slate-400">Net profit</p>
            <h3 className="mt-2 text-2xl font-bold text-emerald-400">${summary.totalProfit.toLocaleString()}</h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-sm text-slate-400">Invested capital</p>
            <h3 className="mt-2 text-2xl font-bold text-violet-400">${summary.totalInvested.toLocaleString()}</h3>
          </div>
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 md:block">
          <div className="border-b border-slate-800 p-5">
            <h2 className="text-lg font-semibold">Active holdings</h2>
          </div>

          <table className="w-full">
            <thead className="bg-slate-800/80">
              <tr>
                <th className="p-4 text-left text-sm font-medium text-slate-300">Trading pair</th>
                <th className="p-4 text-left text-sm font-medium text-slate-300">Profit</th>
                <th className="p-4 text-left text-sm font-medium text-slate-300">ROI</th>
                <th className="p-4 text-left text-sm font-medium text-slate-300">Status</th>
              </tr>
            </thead>

            <tbody>
              {holdings.map((item) => (
                <tr key={item.pair} className="border-t border-slate-800">
                  <td className="p-4 font-medium text-slate-100">{item.pair}</td>
                  <td className={`p-4 font-semibold ${item.profit.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>{item.profit}</td>
                  <td className={`p-4 font-semibold ${item.roi.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>{item.roi}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.status === 'Running' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 md:hidden">
          {holdings.map((item) => (
            <div key={item.pair} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{item.pair}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.status === 'Running' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {item.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400">Profit</p>
                  <p className={`mt-1 font-semibold ${item.profit.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>{item.profit}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">ROI</p>
                  <p className={`mt-1 font-semibold ${item.roi.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>{item.roi}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-4 text-lg font-semibold">Portfolio allocation</h2>

          <div className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-slate-300">Gold (XAU/USD)</span>
                <span className="font-medium text-slate-100">45%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-800">
                <div className="h-3 rounded-full bg-yellow-500" style={{ width: '45%' }} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-slate-300">EUR/USD</span>
                <span className="font-medium text-slate-100">30%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-800">
                <div className="h-3 rounded-full bg-blue-500" style={{ width: '30%' }} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-slate-300">Other Forex pairs</span>
                <span className="font-medium text-slate-100">25%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-800">
                <div className="h-3 rounded-full bg-emerald-500" style={{ width: '25%' }} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
