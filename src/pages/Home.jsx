import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-fuchsia-950 bg-cover bg-center bg-fixed text-white flex flex-col relative isolate"
      style={{
        backgroundImage:
          "linear-gradient(120deg, rgba(2, 6, 23, .92), rgba(30, 27, 75, .72), rgba(49, 46, 129, .58)), url('https://unsplash.com/photos/colorful-audio-waveform-abstract-technology-background-represent-digital-equalizer-technology-3Kpu5lCBHP0')",
      }}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_45%,rgba(14,165,233,.28),transparent_38%),linear-gradient(135deg,#020617,#172554_55%,#581c87)]" />
      {/* Header */}
      <header className="w-full px-6 py-5 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-lg">
            N
          </div>

          <div>
            <h1 className="font-bold text-xl">NexaFunds</h1>
            <p className="text-xs text-blue-200">
              Investor Portal
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="text-blue-100 hover:text-white font-medium transition"
          >
            Login
          </button>

          <button
            onClick={() => navigate('/register')}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl font-medium transition"
          >
            Sign Up
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-100 px-4 py-2 rounded-full text-sm font-medium mb-8">
            ✨ Welcome to NexaFunds
          </div>

          <h2 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Smart Investing Starts With Trusted Management
          </h2>

          <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto mb-10">
            NexaFunds is a secure investor portal designed for managed-account clients, PAMM investors, and MT5 trading services. Access your account, track your investment journey, and stay connected with our professional trading team.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-2xl font-semibold text-lg transition shadow-lg shadow-blue-900/30"
            >
              Create Account
            </button>

            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto border border-slate-500 hover:border-slate-300 hover:bg-white/5 px-8 py-4 rounded-2xl font-semibold text-lg transition"
            >
              Investor Login
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16">
            <div className="bg-cyan-950/45 border border-cyan-300/20 rounded-2xl p-5 backdrop-blur-sm">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="font-semibold mb-2">Secure Access</h3>
              <p className="text-sm text-slate-300">
                Protected investor portal with dedicated account access.
              </p>
            </div>

            <div className="bg-fuchsia-950/45 border border-fuchsia-300/20 rounded-2xl p-5 backdrop-blur-sm">
              <div className="text-3xl mb-3">📈</div>
              <h3 className="font-semibold mb-2">Managed Investing</h3>
              <p className="text-sm text-slate-300">
                Professional PAMM and MT5 account management services.
              </p>
            </div>

            <div className="bg-amber-950/45 border border-amber-300/20 rounded-2xl p-5 backdrop-blur-sm">
              <div className="text-3xl mb-3">🤝</div>
              <h3 className="font-semibold mb-2">Investor Support</h3>
              <p className="text-sm text-slate-300">
                Transparent communication and dedicated client assistance.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-white/10 text-center text-sm text-slate-400">
        © 2026 NexaFunds. All rights reserved.
      </footer>
    </div>
  )
}