import { useNavigate } from 'react-router-dom'

export default function Portfolio() {
  const navigate = useNavigate()

  const holdings = [
    { pair: 'XAU/USD', profit: '+$420.50', roi: '+12.4%', status: 'Running' },
    { pair: 'EUR/USD', profit: '+$180.25', roi: '+5.8%', status: 'Running' },
    { pair: 'GBP/USD', profit: '-$45.10', roi: '-1.2%', status: 'Paused' },
    { pair: 'USD/JPY', profit: '+$92.75', roi: '+3.1%', status: 'Running' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Portfolio</h1>
          <p className="text-sm text-gray-500">
            Monitor your active investment portfolio
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
        >
          Back
        </button>
      </header>

      <main className="p-4 sm:p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total Invested</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-2">$5,000</h3>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Current Value</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-2">$7,420.50</h3>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total Profit</p>
            <h3 className="text-2xl font-bold text-green-600 mt-2">+$2,420.50</h3>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Portfolio ROI</p>
            <h3 className="text-2xl font-bold text-green-600 mt-2">+48.4%</h3>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Active Holdings</h2>
          </div>

          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-700">Trading Pair</th>
                <th className="text-left p-4 font-semibold text-gray-700">Profit</th>
                <th className="text-left p-4 font-semibold text-gray-700">ROI</th>
                <th className="text-left p-4 font-semibold text-gray-700">Status</th>
              </tr>
            </thead>

            <tbody>
              {holdings.map((item) => (
                <tr key={item.pair} className="border-t border-gray-100">
                  <td className="p-4 font-medium text-gray-800">{item.pair}</td>

                  <td
                    className={`p-4 font-semibold ${
                      item.profit.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {item.profit}
                  </td>

                  <td
                    className={`p-4 font-semibold ${
                      item.roi.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {item.roi}
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        item.status === 'Running'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {holdings.map((item) => (
            <div
              key={item.pair}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">{item.pair}</h3>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    item.status === 'Running'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Profit</p>

                  <p
                    className={`font-semibold ${
                      item.profit.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {item.profit}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">ROI</p>

                  <p
                    className={`font-semibold ${
                      item.roi.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {item.roi}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Portfolio Allocation */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Portfolio Allocation</h2>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Gold (XAU/USD)</span>
                <span className="font-medium text-gray-800">45%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-yellow-500 h-3 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">EUR/USD</span>
                <span className="font-medium text-gray-800">30%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Other Forex Pairs</span>
                <span className="font-medium text-gray-800">25%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}