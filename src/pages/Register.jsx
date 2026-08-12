import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Select from 'react-select'
import countryList from 'react-select-country-list'
import ReactCountryFlag from 'react-country-flag'

const API_URL = 'https://nexafunds.onrender.com'

export default function Register() {
  const navigate = useNavigate()
  const countries = useMemo(() => countryList().getData(), [])

  const options = useMemo(
    () =>
      countries.map((c) => ({
        value: c.value,
        label: (
          <div className="flex items-center gap-2">
            <ReactCountryFlag
              countryCode={c.value}
              svg
              style={{ width: '1.2em', height: '1.2em' }}
            />
            <span>{c.label}</span>
          </div>
        ),
        searchLabel: c.label,
      })),
    [countries]
  )

  const [country, setCountry] = useState(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  const getStrength = (pwd) => {
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++

    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '33%' }
    if (score <= 3) return { label: 'Medium', color: 'bg-yellow-500', width: '66%' }
    return { label: 'Strong', color: 'bg-green-500', width: '100%' }
  }

  const strength = getStrength(password)

  const handleCreateAccount = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert('Please enter your first and last name.')
      return
    }
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
  alert('Please enter a valid email address.')
  return
}
    if (!country) {
      alert('Please select your country.')
      return
    }
    if (!city.trim() || !address.trim()) {
      alert('Please fill in your city and address.')
      return
    }
    if (password.length < 6) {
      alert('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match.')
      return
    }
    if (!agreed) {
      alert('Please accept the Terms & Conditions.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          country: country?.searchLabel || '',
          city: city.trim(),
          address: address.trim(),
          password,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create account')
      }

      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error('Registration error:', error)
      alert(error.message || 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-blue-600 text-white text-xl font-bold flex items-center justify-center">
            N
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Create Investor Account
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter your details to create your NexaFunds account.
          </p>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <Select
                options={options}
                value={country}
                onChange={setCountry}
                placeholder="Search country..."
                isSearchable
                className="text-sm"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '50px',
                    borderRadius: '12px',
                    borderColor: '#d1d5db',
                    boxShadow: 'none',
                    '&:hover': { borderColor: '#2563eb' },
                  }),
                }}
                filterOption={(option, input) =>
                  option.data.searchLabel
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Nairobi"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Postal Address
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="P.O. Box 12345, Nairobi, Kenya"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
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
              placeholder="Create a secure password"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <div className="mt-3">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${strength.color} transition-all duration-300`}
                  style={{ width: password ? strength.width : '0%' }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Password strength:{' '}
                <span className="font-medium">{strength.label}</span>
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                confirmPassword && password !== confirmPassword
                  ? 'border-red-400'
                  : 'border-gray-300'
              }`}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-sm text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <div className="flex items-start gap-3">
            <input
              id="terms"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="text-sm text-gray-600">
              I agree to the{' '}
              <span className="text-blue-600 font-medium">
                Terms &amp; Conditions
              </span>{' '}
              and confirm that the information provided is accurate.
            </label>
          </div>

          <button
            type="button"
            onClick={handleCreateAccount}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl font-semibold transition"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
