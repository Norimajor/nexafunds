import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NEXAFUNDS_IMAGES } from '../config/images'

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('https://nexafunds-app.onrender.com/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
        }),
      })

      let data
      try {
        data = await response.json()
      } catch {
        throw new Error('The server returned an invalid response. Please try again.')
      }

      if (response.ok && data.success) {
        localStorage.setItem('nexafunds_user', JSON.stringify(data.user))
        navigate('/dashboard')
      } else if (data.error) {
        throw new Error(data.error)
      } else {
        throw new Error('The server could not complete your login request. Please try again.')
      }
    } catch (loginError) {
      setError(loginError.message || 'Unable to connect to server.')
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
        <p className="nf-auth-subtitle">Sign in to manage your MT5 EA access.</p>
        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="login-email">Email address</label>

            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="nf-field w-full px-4 py-3 border rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="login-password">Password</label>

            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="nf-field w-full px-4 py-3 border rounded-xl focus:outline-none"
            />
          </div>

          {error && <p className="nf-form-error" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="nf-primary w-full py-3 rounded-xl font-semibold transition disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/register')}
            className="nf-secondary w-full py-3 rounded-xl font-semibold transition"
          >
            Create an account
          </button>
        </form>
        <p className="nf-auth-switch">Need EA access? <button type="button" onClick={() => navigate('/register')}>Get started</button></p>
      </div></main>
    </div>
  )
}
