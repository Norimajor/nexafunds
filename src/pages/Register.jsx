import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Select from 'react-select'
import countryList from 'react-select-country-list'
import ReactCountryFlag from 'react-country-flag'

export default function Register() {
  const navigate = useNavigate()

  const options = useMemo(() => countryList().getData(), [])
  const [country, setCountry] = useState(null)

  const [firstName, setFirstName] = useState('')
const [lastName, setLastName] = useState('')
const [email, setEmail] = useState('')
const [city, setCity] = useState('')
const [address, setAddress] = useState('')
const [password, setPassword] = useState('')
const [confirmPassword, setConfirmPassword] = useState('')

  // Password strength checker
  const getStrength = (pwd) => {
    let score = 0

    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++

    if (score <= 1) return { label: 'Weak', color: 'bg-red-500' }
    if (score <= 3) return { label: 'Medium', color: 'bg-yellow-500' }

    return { label: 'Strong', color: 'bg-green-500' }
  }

  const strength = getStrength(password)

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            N
          </div>

          <h1 className="text-3xl font-bold text-gray-800">
            Create Investor Account
          </h1>

          <p className="text-gray-500 mt-2">
            Register to access the NexaFunds investor portal
          </p>
        </div>

        <form className="space-y-5">
          {/* First & Last Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Email */}
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

          {/* Country & City */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>

              <Select
                options={options.map((c) => ({
                  value: c.value,
                  label: (
                    <div className="flex items-center gap-2">
                      <ReactCountryFlag
                        countryCode={c.value}
                        svg
                        style={{
                          width: '1.5em',
                          height: '1.5em',
                        }}
                      />

                      <span>{c.label}</span>
                    </div>
                  ),
                  searchLabel: c.label,
                }))}
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
                    '&:hover': {
                      borderColor: '#2563eb',
                    },
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

          {/* Postal Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Postal Address
            </label>

          <textarea
  rows="3"
  value={address}
  onChange={(e) => setAddress(e.target.value)}
  placeholder="P.O. Box 12345, Nairobi, Kenya"
  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
/>
          </div>

          {/* Password */}
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

            {/* Strength bar */}
            <div className="mt-3">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${strength.color} transition-all duration-300`}
                  style={{
                    width:
                      strength.label === 'Weak'
                        ? '33%'
                        : strength.label === 'Medium'
                        ? '66%'
                        : '100%',
                  }}
                />
              </div>

              <p className="text-sm text-gray-600 mt-1">
                Password strength:{' '}
                <span className="font-medium">{strength.label}</span>
              </p>
            </div>
          </div>

          {/* Confirm Password */}
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
              <p className="text-sm text-red-500 mt-1">
                Passwords do not match
              </p>
            )}
          </div>

          {/* Terms */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded"
            />

            <p className="text-sm text-gray-600">
              I agree to the{' '}
              <span className="text-blue-600 font-medium">
                Terms & Conditions
              </span>{' '}
              and confirm that the information provided is accurate.
            </p>
          </div>

          {/* Submit */}
       <button
  type="button"
  disabled={password !== confirmPassword || !password}
  onClick={async () => {
    try {
      const response = await fetch('https://nexafunds.onrender.com/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          country: country?.searchLabel || '',
          city,
          address,
          password,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert('Account created successfully!')
        navigate('/login')
      } else {
        alert(data.error)
      }
    } catch (err) {
      alert('Unable to connect to backend server')
    }
  }}
  className={`w-full py-3 rounded-xl font-semibold transition ${
    password === confirmPassword && password
      ? 'bg-blue-600 hover:bg-blue-700 text-white'
      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
  }`}
>
  Create Investor Account
</button>
        </form>

        {/* Login Link */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <button
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