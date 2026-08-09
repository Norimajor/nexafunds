export default function Transactions() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Transactions
        </h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-700">Type</th>
                <th className="text-left p-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                <th className="text-left p-4 font-semibold text-gray-700">Date</th>
              </tr>
            </thead>

            <tbody>
              <tr className="border-t border-gray-100">
                <td className="p-4">Deposit</td>
                <td className="p-4 font-medium">$1,000.00</td>
                <td className="p-4">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    Completed
                  </span>
                </td>
                <td className="p-4 text-gray-500">08 Aug 2026</td>
              </tr>

              <tr className="border-t border-gray-100">
                <td className="p-4">Withdrawal</td>
                <td className="p-4 font-medium">$250.00</td>
                <td className="p-4">
                  <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                    Pending
                  </span>
                </td>
                <td className="p-4 text-gray-500">07 Aug 2026</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}