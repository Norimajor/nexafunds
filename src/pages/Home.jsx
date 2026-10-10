import { useNavigate } from 'react-router-dom'
import { NEXAFUNDS_IMAGES } from '../config/images'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="nf-page nf-home-page">
      <header className="nf-header">
        <div className="nf-brand"><span className="nf-logo">N</span><span><strong>NexaFunds</strong><small>Investor Portal</small></span></div>
        <nav className="nf-nav"><button onClick={() => navigate('/login')}>Login</button><button className="nf-nav-link" onClick={() => navigate('/ea-access')}>EA access</button><button className="nf-nav-cta" onClick={() => navigate('/register')}>Create account <span>↗</span></button></nav>
      </header>
      <main className="nf-home-main">
        <section className="nf-hero-copy">
          <span className="nf-pill"><i /> NexaFunds · MT5 access</span>
          <h1>Your strategy.<br /><em>Your account.</em></h1>
          <p>One secure place to request access to the NexaFunds EA. Register your MT5 account, get instant access for demo accounts, and track live-account verification for your IB account.</p>
          <div className="nf-actions"><button className="nf-primary" onClick={() => navigate('/register')}>Get started <span>↗</span></button><button className="nf-secondary" onClick={() => navigate('/login')}>Sign in to your account</button></div>
          <div className="nf-trust-row"><span><b>01</b> Account-bound license</span><span><b>02</b> MT5 verified</span><span><b>03</b> Secure EA access</span></div>
        </section>
        <section className="nf-market-visual" aria-label="Financial market overview">
          <div className="nf-visual-image" style={{ backgroundImage: `url(${NEXAFUNDS_IMAGES.welcome})` }} />
          <div className="nf-visual-top"><span>NEXAFUNDS EA ACCESS</span><b>MT5 READY</b></div>
          <div className="nf-floating-card nf-market-card"><small>Verification flow</small><strong>Demo account <span>Instant</span></strong><strong>Live account <span>IB review</span></strong><strong>License <span>Account-bound</span></strong></div>
          <div className="nf-floating-card nf-portfolio-card"><small>Your terminal. Your key.</small><strong>One key per MT5 account</strong><span>Secure account matching <i /></span></div>
          <div className="nf-visual-caption"><span>EA ACCESS · 01</span><strong>Verified access,<br />built around your account.</strong></div>
        </section>
      </main>
      <footer className="nf-footer">© 2026 NexaFunds <span>Trading involves risk. Use the EA responsibly.</span></footer>
    </div>
  )
}