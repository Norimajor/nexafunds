import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function VerifyEmail() {
  const location = useLocation()
  const navigate = useNavigate()

  const formData = location.state?.formData

  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (!formData) {
      navigate('/register')
    }
  }, [formData, navigate])

  const sendCode = async () => {
    setSending(true)

    try {
      const response = await fetch(
        'https://nexafunds.onrender.com/api/send-code',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
          }),
        }
      )

      const data = await response.json()

      if (data.success) {
        alert('Verification code sent to your email')
      } else {
        alert(data.error)
      }
    } catch (err) {
      alert('Failed to send verification code')
    } finally {
      setSending(false)
    }
  }

  const verifyAndRegister = async () => {
    if (!code) {
      alert('Please enter the verification code')
      return
    }

    setVerifying(true)

    try {
      const verifyResponse = await fetch(
        'https://nexafunds.onrender.com/api/verify-code',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            code,
          }),
        }
      )

      const verifyData = await verifyResponse.json()

      if (!verifyData.success) {
        alert(verifyData.error)
        return
      }

      const registerResponse = await fetch(
        'https://nexafunds.onrender.com/api/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      )

      const registerData = await registerResponse.json()

      if (registerData.success) {
        alert('Account created successfully!')
        navigate('/login')
      } else {
        alert(registerData.error)
      }
    } catch (err) {
      alert('Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  if (!formData) return null

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            N
          </div>

          <h1 className="text-3xl font-bold text-gray-800">
            Verify Your Email
          </h1>

          <p className="text-gray-500 mt-2">
            We will send a 6-digit verification code to:
          </p>

          <p className="text-blue-600 font-medium mt-1">
            {formData.email}
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={sendCode}
            disabled={sending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send Verification Code'}
          </button>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>

            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-center text-lg tracking-widest"
            />
          </div>

          <button
            onClick={verifyAndRegister}
            disabled={verifying}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50"
          >
            {verifying ? 'Verifying...' : 'Verify & Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}