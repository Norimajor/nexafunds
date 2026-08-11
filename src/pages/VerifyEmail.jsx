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
        alert('Verification code sent')
      } else {
        alert(data.error || 'Failed to send code')
      }
    } catch (error) {
      alert('Connection failed')
    } finally {
      setSending(false)
    }
  }

  const verifyAndRegister = async () => {
    if (!code) {
      alert('Enter the verification code')
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
        alert('Account created successfully')
        navigate('/login')
      } else {
        alert(registerData.error)
      }
    } catch (error) {
      alert('Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  if (!formData) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-4">
          Verify Your Email
        </h1>

        <p className="text-center text-gray-600 mb-6">
          Verification will be sent to:
          <br />
          <strong>{formData.email}</strong>
        </p>

        <button
          onClick={sendCode}
          disabled={sending}
          className="w-full bg-blue-600 text-white py-3 rounded-xl mb-4 disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send Verification Code'}
        </button>

        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter 6-digit code"
          className="w-full border px-4 py-3 rounded-xl mb-4"
        />

        <button
          onClick={verifyAndRegister}
          disabled={verifying}
          className="w-full bg-green-600 text-white py-3 rounded-xl disabled:opacity-50"
        >
          {verifying ? 'Verifying...' : 'Verify & Create Account'}
        </button>
      </div>
    </div>
  )
}