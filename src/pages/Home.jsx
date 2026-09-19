import { useNavigate } from 'react-router-dom'
import { NEXAFUNDS_IMAGES } from '../config/images'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="nf-page nf-home-page">
      <header className="nf-header">
        <div className="nf-brand"><span className="nf-logo">N</span><span><strong>NexaFunds</strong><small>Investor Portal</small></span></div>
        <nav className="nf-nav"><button onClick={() => navigate('/login')}>Login</button><button className="nf-nav-cta" onClick={() => navigate('/register')}>Sign Up</button></nav>
      </header>
      <main className="nf-home-main">
        <section className="nf-hero-copy">
          <span className="nf-pill"><i /> Welcome to NexaFunds</span>
          <h1>Smart Investing Starts<br /><em>With Trusted Management</em></h1>
          <p>NexaFunds is a secure investor portal for managed-account clients, PAMM investors, and MT5 trading services. Track your investment journey with clarity and confidence.</p>
          <div className="nf-actions"><button className="nf-primary" onClick={() => navigate('/register')}>Create Account <span>↗</span></button><button className="nf-secondary" onClick={() => navigate('/login')}>Investor Login</button></div>
          <div className="nf-trust-row"><span><b>01</b> Secure access</span><span><b>02</b> MT5 ready</span><span><b>03</b> Personal support</span></div>
        </section>
        <section className="nf-market-visual" aria-label="Financial market overview">
          <div className="nf-visual-image" style={{ backgroundImage: `url(${NEXAFUNDS_IMAGES.welcome})` }} />
          <div className="nf-visual-top"><span>MARKET OVERVIEW</span><b>LIVE</b></div>
          <div className="nf-floating-card nf-market-card"><small>Market watch</small><strong>XAUUSD <span>+1.84%</span></strong><strong>EURUSD <span>+0.62%</span></strong><strong>US30 <span>+0.41%</span></strong></div>
          <div className="nf-floating-card nf-portfolio-card"><small>Portfolio access</small><strong>Live Account</strong><span>MT5 Connected <i /></span></div>
          <div className="nf-visual-caption"><span>01 / 03</span><strong>Portfolio monitoring<br />with a clearer view.</strong></div>
        </section>
      </main>
      <footer className="nf-footer">© 2026 NexaFunds <span>Secure investor access</span></footer>
    </div>
  )
}