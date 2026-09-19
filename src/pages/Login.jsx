import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)

    try {
      const response = await fetch('https://nexafunds.onrender.com/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = await response.json()

      if (data.success) {
        localStorage.setItem('nexafunds_user', JSON.stringify(data.user))
        alert(`Welcome back ${data.user.first_name}!`)
        navigate('/dashboard')
      } else {
        alert(data.error)
      }
    } catch (err) {
      alert('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center px-4 py-10 relative isolate"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(8, 47, 73, .78), rgba(30, 27, 75, .58), rgba(88, 28, 135, .62)), url('https://plus.unsplash.com/premium_photo-1682310075673-b408eb1ca6fd?q=80&w=1600&auto=format&fit=crop')",
      }}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_20%,rgba(45,212,191,.35),transparent_35%),linear-gradient(135deg,#082f49,#312e81_55%,#701a75)]" />
      <div className="w-full max-w-md bg-white/95 rounded-3xl shadow-2xl shadow-cyan-950/40 p-8 backdrop-blur-md border border-white/70">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            N
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Investor Login
          </h1>

          <p className="text-gray-500 mt-2">
            Sign in to access your NexaFunds investor portal
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          <button
            onClick={() => navigate('/register')}
            className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-semibold transition"
          >
            Create New Account
          </button>
        </div>
      </div>
    </div>
  )
}

