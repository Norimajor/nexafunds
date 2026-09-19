import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NEXAFUNDS_IMAGES } from '../config/images'

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
    <div className="nf-auth-page">
      <aside className="nf-auth-visual" style={{ backgroundImage: `url(${NEXAFUNDS_IMAGES.login})` }}>
        <div className="nf-auth-visual-content"><div className="nf-brand"><span className="nf-logo">N</span><span><strong>NexaFunds</strong><small>Investor Portal</small></span></div><div><h2>Your investment journey, connected.</h2><p>Clarity for every decision. Control for every account.</p></div></div>
      </aside>
      <main className="nf-auth-form-side"><div className="nf-auth-form">
        <div className="nf-brand"><span className="nf-logo">N</span><span><strong>NexaFunds</strong><small>Investor Portal</small></span></div>
        <h1>Welcome back</h1>
        <p className="nf-auth-subtitle">Sign in to your investor account</p>
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
      </div></main>
    </div>
  )
}

