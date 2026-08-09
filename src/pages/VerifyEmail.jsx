import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:4000'
const OTP_LENGTH = 6
const RESEND_SECONDS = 30

export default function VerifyEmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const inputRefs = useRef([])

  const formData = location.state?.formData || null
  const [email, setEmail] = useState(formData?.email || '')
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [countdown, setCountdown] = useState(RESEND_SECONDS)
  const [canResend, setCanResend] = useState(false)

  useEffect(() => {
    if (formData?.email) {
      setEmail(formData.email)
    }
  }, [formData])

  useEffect(() => {
    if (!countdown) {
      setCanResend(true)
      return
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  const code = otp.join('')

  const handleOtpChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpPaste = (event) => {
    event.preventDefault()
    const pasted = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, OTP_LENGTH)

    if (!pasted) return

    const nextOtp = Array(OTP_LENGTH).fill('')
    pasted.split('').forEach((digit, index) => {
      nextOtp[index] = digit
    })

    setOtp(nextOtp)
  }

  const handleSendCode = async () => {
    if (!email.trim()) {
      setMessageType('error')
      setMessage('Please enter your email address.')
      return
    }

    setLoading(true)
    setMessageType('')
    setMessage('Sending verification code...')

    try {
      const response = await fetch(`${API_URL}/api/send-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to send verification code')
      }

      setMessageType('success')

      if (data.code) {
        const nextOtp = Array(OTP_LENGTH).fill('')
        data.code.split('').forEach((digit, index) => {
          if (index < OTP_LENGTH) nextOtp[index] = digit
        })

        setOtp(nextOtp)
        setMessage(`Verification code generated in local mode: ${data.code}`)
      } else {
        setMessage('Verification code sent. Check your inbox.')
        setOtp(Array(OTP_LENGTH).fill(''))
      }

      setCanResend(false)
      setCountdown(RESEND_SECONDS)
    } catch (error) {
      setMessageType('error')
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!formData) {
      navigate('/register')
      return
    }

    if (!email.trim() || code.length !== OTP_LENGTH) {
      setMessageType('error')
      setMessage('Please enter the full 6-digit verification code.')
      return
    }

    setLoading(true)
    setMessageType('')
    setMessage('Verifying your email...')

    try {
      const verifyResponse = await fetch(`${API_URL}/api/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      })

      const verifyData = await verifyResponse.json()

      if (!verifyResponse.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Verification failed')
      }

      const registerResponse = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const registerData = await registerResponse.json()

      if (!registerResponse.ok || !registerData.success) {
        throw new Error(registerData.error || 'Registration failed')
      }

      alert('Account created successfully!')
      navigate('/login')
    } catch (error) {
      setMessageType('error')
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            N
          </div>

          <h1 className="text-3xl font-bold text-gray-800">Verify Email</h1>
          <p className="text-gray-500 mt-2">
            We sent a 6-digit code to your email address.
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

          <button
            type="button"
            onClick={handleSendCode}
            disabled={loading || !email.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 rounded-xl font-semibold transition"
          >
            {loading ? 'Please wait...' : 'Send Verification Code'}
          </button>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
              Enter Verification Code
            </label>

            <div className="flex items-center justify-between gap-2 mt-3" onPaste={handleOtpPaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(e.target.value, index)}
                  onKeyDown={(e) => handleOtpKeyDown(e, index)}
                  className={`w-12 h-14 text-center text-2xl font-bold border rounded-xl focus:outline-none bg-white shadow-sm transition-all ${
                    digit
                      ? 'border-blue-500 ring-2 ring-blue-100 text-blue-700'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <p className="text-gray-500">Code expires in</p>
            <span className="font-semibold text-blue-600">
              {countdown > 0 ? `${countdown}s` : 'Expired'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleVerifyCode}
            disabled={loading || !email.trim() || code.length !== OTP_LENGTH}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-3 rounded-xl font-semibold transition"
          >
            Verify Email
          </button>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-center">
            <p className="text-sm text-gray-600">
              Didn’t get the code?{' '}
              <button
                type="button"
                onClick={handleSendCode}
                disabled={loading || !canResend}
                className="font-semibold text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {canResend ? 'Resend code' : `Resend in ${countdown}s`}
              </button>
            </p>
          </div>

          {message && (
            <p
              className={`text-sm ${
                messageType === 'error' ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={() => navigate('/register')}
            className="w-full text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to registration
          </button>
        </div>
      </div>
    </div>
  )
}
