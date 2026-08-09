import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const navigate = useNavigate()
  const [totalUsers, setTotalUsers] = useState(0)

useEffect(() => {
 fetch('https://nexafunds.onrender.com/api/stats/users')
    .then((res) => res.json())
    .then((data) => setTotalUsers(data.totalUsers))
    .catch((err) => console.error(err))
}, [])

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f172a] text-white p-6 hidden md:flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-lg">
            N
          </div>

          <div>
            <h1 className="font-bold text-lg">NexaFunds</h1>
            <p className="text-xs text-gray-400">Investor Portal</p>
          </div>
        </div>

        <nav className="space-y-2">
          <button className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600 font-medium">
            Dashboard
          </button>

          <button className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition">
            Portfolio
          </button>

          <button className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition">
            Reports
          </button>

          <button
            onClick={() => navigate('/transactions')}
            className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition"
          >
            Transactions
          </button>

          <button className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition">
            Withdrawals
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Dashboard Overview
            </h2>

            <p className="text-sm text-gray-500">
              Track your investment performance in real time
            </p>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
          >
            Logout
          </button>
        </header>

        <main className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Total Balance</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-2">$7,420.50</h3>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Total Profit</p>
              <h3 className="text-2xl font-bold text-green-600 mt-2">+$2,140.25</h3>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Current ROI</p>
              <h3 className="text-2xl font-bold text-green-600 mt-2">+34.8%</h3>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Active Trades</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-2">18 Positions</h3>
            </div>
          </div>

          {/* Growth Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Investment Growth</h3>
                  <p className="text-sm text-gray-500">Portfolio performance over the last 8 months</p>
                </div>

                <div className="flex gap-2 text-sm">
                  <button className="px-3 py-1 rounded-lg bg-blue-100 text-blue-600 font-medium">3M</button>
                  <button className="px-3 py-1 rounded-lg hover:bg-gray-100">6M</button>
                  <button className="px-3 py-1 rounded-lg hover:bg-gray-100">1Y</button>
                </div>
              </div>

              <div className="h-80 rounded-xl bg-gradient-to-r from-green-50 to-blue-50 flex items-center justify-center border border-dashed border-gray-200">
                <div className="text-center">
                  <p className="text-5xl font-bold text-green-500">📈</p>
                  <p className="text-gray-500 mt-3">Growth chart will be connected here next</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <button className="bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition">
                  Deposit Funds
                </button>

                <button className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition">
                  Withdraw Funds
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-5">Performance Overview</h3>

                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Monthly Gain</span>
                    <span className="font-semibold text-green-600">+12.5%</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Total Returns</span>
                    <span className="font-semibold text-green-600">+48.7%</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Win Rate</span>
                    <span className="font-semibold text-green-600">86%</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Risk Level</span>
                    <span className="font-semibold text-yellow-600">Moderate</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-5">Trading Stats</h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Active EA</span>
                    <span className="font-medium text-blue-600">NexaProBot</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Trade Volume</span>
                    <span className="font-medium">$52,480</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Open Positions</span>
                    <span className="font-medium">18</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* EA Downloads Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Expert Advisors (EA)</h3>
                <p className="text-sm text-gray-500">Download trading bots shared with investors</p>
              </div>

              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
                + Upload EA
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-2xl p-5 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">🤖</span>
                  <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">Active</span>
                </div>
                <h4 className="font-semibold text-gray-800">Nexa Gold Scalper</h4>
                <p className="text-sm text-gray-500 mt-2">Optimized for XAU/USD with smart risk management and trailing stop logic.</p>
                <button className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm">Download</button>
              </div>

              <div className="border border-gray-200 rounded-2xl p-5 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">📈</span>
                  <span className="bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">New</span>
                </div>
                <h4 className="font-semibold text-gray-800">Nexa Forex Swing EA</h4>
                <p className="text-sm text-gray-500 mt-2">Multi-pair swing trading EA designed for EUR/USD, GBP/USD, and USD/JPY.</p>
                <button className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm">Download</button>
              </div>

              <div className="border border-gray-200 rounded-2xl p-5 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">⚡</span>
                  <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-3 py-1 rounded-full">Beta</span>
                </div>
                <h4 className="font-semibold text-gray-800">Nexa Grid Manager</h4>
                <p className="text-sm text-gray-500 mt-2">Advanced grid and recovery management EA with equity protection features.</p>
                <button className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm">Download</button>
              </div>
            </div>
          </div>

      {/* Broker & PAMM Access Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Broker & PAMM Access
            </h3>

            <p className="text-sm text-gray-500">
              Create a broker account and join the NexaFunds PAMM investment.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Broker Account */}
          <div className="border border-gray-200 rounded-2xl p-5 hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🏦</span>

              <div>
                <h4 className="font-semibold text-gray-800">
                  Create Broker Account
                </h4>

                <p className="text-sm text-gray-500">
                  Open a trading account with our supported broker.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-500 mb-1">Your IB Link</p>

              <p className="text-sm text-blue-600 break-all">
                https://alpari.com/?Referral=73819
              </p>
            </div>

            <a
              href="https://alpari.com/?Referral=73819"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition"
            >
              Open Broker Account
            </a>
          </div>

          {/* PAMM Access */}
          <div className="border border-gray-200 rounded-2xl p-5 hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📈</span>

              <div>
                <h4 className="font-semibold text-gray-800">
                  Join PAMM Investment
                </h4>

                <p className="text-sm text-gray-500">
                  Connect your broker account to the NexaFunds PAMM pool.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-500 mb-1">PAMM Platform</p>

              <p className="text-sm text-blue-600 break-all">
                https://alpari.com/en/invest/pamm/
              </p>
            </div>

            <a
              href="https://alpari.com/en/invest/pamm/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-medium transition"
            >
              View PAMM Platform
            </a>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>

            <div>
              <h5 className="font-medium text-blue-900 mb-1">
                Your Referral Setup
              </h5>

              <p className="text-sm text-blue-700">
                Investors who create an Alpari account using the referral link above should be connected under your partner referral code.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PAMM Statistics Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              NexaFunds PAMM Statistics
            </h3>

            <p className="text-sm text-gray-500">
              Overall performance of the NexaFunds managed trading pool
            </p>
          </div>

          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium w-fit">
            Live Performance
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">PAMM Equity</p>

            <h4 className="text-2xl font-bold text-gray-800 mt-2">
              $52,480
            </h4>
          </div>

          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">Total Investors</p>

            <h4 className="text-2xl font-bold text-gray-800 mt-2">
              37
            </h4>
          </div>

          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">Monthly Return</p>

            <h4 className="text-2xl font-bold text-green-600 mt-2">
              +12.5%
            </h4>
          </div>

          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">All-Time Return</p>

            <h4 className="text-2xl font-bold text-green-600 mt-2">
              +48.7%
            </h4>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500">Max Drawdown</p>

            <p className="text-xl font-semibold text-red-500 mt-2">8.2%</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500">Win Rate</p>

            <p className="text-xl font-semibold text-green-600 mt-2">86%</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500">Trading Since</p>

            <p className="text-xl font-semibold text-gray-800 mt-2">Aug 2026</p>
          </div>
        </div>

        <div className="mt-6 border border-blue-100 bg-blue-50 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h4 className="font-semibold text-blue-900">Current Strategy</h4>

            <p className="text-sm text-blue-700 mt-1">
              Nexa Gold Scalper + Forex Swing EA running on MT5 with moderate risk allocation and equity protection rules.
            </p>
          </div>

          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition w-full md:w-auto">
            View Full Performance
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
  <p className="text-sm text-gray-500">Registered Investors</p>
  <h3 className="text-2xl font-bold text-blue-600 mt-2">
    {totalUsers}
  </h3>
</div>
          </button>
        </div>
      </div>
    </main>
  </div>
</div>
)
}

