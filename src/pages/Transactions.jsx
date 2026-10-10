import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const baseClass = 'rounded-2xl border border-[#eac16e]/15 bg-[#111a17]/90 p-4 text-[#f3f1e9] shadow-[0_20px_40px_rgba(0,0,0,0.25)]'

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
    <div className="min-h-screen bg-[#090d0f] p-4 text-[#f3f1e9] sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[#5bd1a7]">Operations</p>
            <h1 className="text-3xl font-bold">Transactions</h1>
          </div>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="rounded-xl border border-[#eac16e]/25 bg-[#17211d] px-4 py-2 text-sm font-medium text-[#f3f1e9] transition hover:bg-[#223129]"
          >
            Back to dashboard
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className={baseClass}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recent activity</h2>
              <span className="rounded-full bg-[#5bd1a7]/10 px-2 py-1 text-xs font-medium text-[#5bd1a7]">Live</span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#eac16e]/15">
              <table className="w-full border-collapse text-left">
                <thead className="bg-[#17211d]/90">
                  <tr>
                    <th className="p-3 text-sm font-medium text-[#d1d5cc]">Type</th>
                    <th className="p-3 text-sm font-medium text-[#d1d5cc]">Amount</th>
                    <th className="p-3 text-sm font-medium text-[#d1d5cc]">Status</th>
                    <th className="p-3 text-sm font-medium text-[#d1d5cc]">Date</th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-4 text-sm text-[#a8b0a9]">
                        No transactions yet.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-t border-white/[0.06]">
                        <td className="p-3">
                          <span className={transaction.type === 'deposit' ? 'font-medium text-[#5bd1a7]' : 'font-medium text-rose-400'}>
                            {transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                          </span>
                        </td>
                        <td className={`p-3 font-semibold ${transaction.type === 'deposit' ? 'text-[#5bd1a7]' : 'text-rose-400'}`}>
                          {transaction.type === 'deposit' ? '+' : '-'}${Number(transaction.amount).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className="rounded-full bg-[#5bd1a7]/10 px-2 py-1 text-xs font-medium text-[#5bd1a7]">
                            Completed
                          </span>
                        </td>
                        <td className="p-3 text-sm text-[#a8b0a9]">{new Date(transaction.created_at).toLocaleDateString()}</td>
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
                  className="w-full rounded-xl border border-[#eac16e]/20 bg-[#0b100e] px-3 py-2.5 text-[#f3f1e9] outline-none ring-0"
                >
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-[#d1d5cc]">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                  placeholder="5000"
                  className="w-full rounded-xl border border-[#eac16e]/20 bg-[#0b100e] px-3 py-2.5 text-[#f3f1e9] outline-none ring-0"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-[#d1d5cc]">Note</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                  placeholder="Top-up or withdrawal note"
                  className="w-full rounded-xl border border-[#eac16e]/20 bg-[#0b100e] px-3 py-2.5 text-[#f3f1e9] outline-none ring-0"
                />
              </div>

              {message && <p className="text-sm text-[#eac16e]">{message}</p>}

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-[#eac16e] to-[#5bd1a7] px-4 py-3 text-sm font-semibold text-[#101511] transition hover:brightness-105"
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
