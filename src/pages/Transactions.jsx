import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const baseClass = 'rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-slate-100 shadow-[0_20px_40px_rgba(15,23,42,0.25)]'

export default function Transactions() {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [form, setForm] = useState({ type: 'deposit', amount: '', note: '' })
  const [message, setMessage] = useState('')

  const fetchTransactions = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/transactions')
      const data = await response.json()

      if (data.success) {
        setTransactions(data.transactions)
      }
    } catch (error) {
      console.error('Unable to fetch transactions:', error)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.amount || Number(form.amount) <= 0) {
      setMessage('Please enter a valid amount.')
      return
    }

    try {
      const response = await fetch('http://localhost:4000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          amount: Number(form.amount),
          note: form.note || (form.type === 'deposit' ? 'Manual deposit' : 'Manual withdrawal'),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Transaction failed')
      }

      setForm({ type: 'deposit', amount: '', note: '' })
      setMessage(data.message)
      fetchTransactions()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-sky-400">Operations</p>
            <h1 className="text-3xl font-bold">Transactions</h1>
          </div>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
          >
            Back to dashboard
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className={baseClass}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recent activity</h2>
              <span className="rounded-full bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-400">Live</span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-700">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-800/80">
                  <tr>
                    <th className="p-3 text-sm font-medium text-slate-300">Type</th>
                    <th className="p-3 text-sm font-medium text-slate-300">Amount</th>
                    <th className="p-3 text-sm font-medium text-slate-300">Status</th>
                    <th className="p-3 text-sm font-medium text-slate-300">Date</th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-4 text-sm text-slate-400">
                        No transactions yet.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-t border-slate-700">
                        <td className="p-3">
                          <span className={transaction.type === 'deposit' ? 'font-medium text-emerald-400' : 'font-medium text-rose-400'}>
                            {transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                          </span>
                        </td>
                        <td className={`p-3 font-semibold ${transaction.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {transaction.type === 'deposit' ? '+' : '-'}${Number(transaction.amount).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
                            Completed
                          </span>
                        </td>
                        <td className="p-3 text-sm text-slate-400">{new Date(transaction.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={baseClass}>
            <h2 className="mb-4 text-xl font-semibold">Add movement</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">Transaction type</label>
                <select
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none ring-0"
                >
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                  placeholder="5000"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none ring-0"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Note</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                  placeholder="Top-up or withdrawal note"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none ring-0"
                />
              </div>

              {message && <p className="text-sm text-sky-300">{message}</p>}

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Save transaction
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
