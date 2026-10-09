import { FormEvent, useState } from 'react'
import { ArrowRight, ChartNoAxesCombined, CircleAlert, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { api, refreshSession, type Session } from '../api'

export function AuthView({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function validate(nextEmail = email, nextPassword = password, nextMode = mode) {
    const next: { email?: string; password?: string } = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail.trim())) next.email = 'Enter a valid email address'
    if (!nextPassword) next.password = 'Password is required'
    else if (nextMode === 'register' && nextPassword.length < 12) next.password = 'Password must be at least 12 characters'
    else if (nextPassword.length > 128) next.password = 'Password must be at most 128 characters'
    return next
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const next = validate()
    setFieldErrors(next)
    if (Object.keys(next).length) {
      setBusy(false)
      return
    }
    try {
      await api(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const session = await refreshSession()
      if (!session) throw new Error('Session could not be started')
      onAuthenticated(session)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-layout">
      {/* Left Column: Hero & Product Showcase */}
      <div className="auth-hero-column">
        <div className="brand">
          <div className="brand-mark">
            <ChartNoAxesCombined size={18} />
          </div>
          <span>foliojoy<span className="brand-dot">.</span></span>
        </div>

        <div className="auth-hero-content">
          <span className="eyebrow">PORTFOLIO INTELLIGENCE</span>
          <h1>Your investments, in focus.</h1>
          <p className="hero-desc">
            Track your portfolio, understand your exposure, and make more informed decisions.
          </p>

          {/* Elevated Illustrative Preview Card */}
          <div className="auth-preview-card" aria-hidden="true">
            <div className="auth-preview-header">
              <span className="status-pill" style={{ color: 'var(--accent-lime)', backgroundColor: 'rgba(201, 233, 142, 0.1)' }}>
                Illustrative preview
              </span>
              <span className="status-pill">Demo data only</span>
            </div>

            <div className="auth-preview-body">
              {/* SVG Donut Illustration */}
              <svg className="preview-donut-svg" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="14" fill="transparent" stroke="#1a2538" strokeWidth="5" />
                {/* VTI 52% */}
                <circle
                  cx="20" cy="20" r="14" fill="transparent"
                  stroke="#c9e98e" strokeWidth="5"
                  strokeDasharray="45.74 87.96" strokeDashoffset="0"
                  strokeLinecap="round"
                  transform="rotate(-90 20 20)"
                />
                {/* VXUS 28% */}
                <circle
                  cx="20" cy="20" r="14" fill="transparent"
                  stroke="#638af7" strokeWidth="5"
                  strokeDasharray="24.63 87.96" strokeDashoffset="-47.5"
                  strokeLinecap="round"
                  transform="rotate(-90 20 20)"
                />
                {/* BND 20% */}
                <circle
                  cx="20" cy="20" r="14" fill="transparent"
                  stroke="#39b8a1" strokeWidth="5"
                  strokeDasharray="17.59 87.96" strokeDashoffset="-73.5"
                  strokeLinecap="round"
                  transform="rotate(-90 20 20)"
                />
              </svg>

              <div className="preview-bars-container">
                <div className="preview-bar-row">
                  <span style={{ color: 'var(--text-secondary)' }}>VTI · Total US</span>
                  <strong style={{ color: 'var(--accent-lime)' }}>52%</strong>
                </div>
                <div className="preview-bar-track">
                  <div className="preview-bar-fill" style={{ width: '52%', backgroundColor: '#c9e98e' }} />
                </div>

                <div className="preview-bar-row">
                  <span style={{ color: 'var(--text-secondary)' }}>VXUS · Ex-US</span>
                  <strong style={{ color: '#638af7' }}>28%</strong>
                </div>
                <div className="preview-bar-track">
                  <div className="preview-bar-fill" style={{ width: '28%', backgroundColor: '#638af7' }} />
                </div>

                <div className="preview-bar-row">
                  <span style={{ color: 'var(--text-secondary)' }}>BND · Total Bond</span>
                  <strong style={{ color: '#39b8a1' }}>20%</strong>
                </div>
                <div className="preview-bar-track">
                  <div className="preview-bar-fill" style={{ width: '20%', backgroundColor: '#39b8a1' }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>USD Only · Holdings Snapshot</span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--accent-lime)', fontWeight: 600 }}>Deterministic Math</span>
            </div>
          </div>
        </div>

        <div className="auth-hero-footer">
          <ShieldCheck size={16} />
          <span>Your investment data stays private to your account.</span>
        </div>
      </div>

      {/* Right Column: Authentication Form */}
      <main className="auth-form-column">
        <div className="auth-form-box">
          <div className="auth-mode-toggle" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'active' : ''}
              onClick={() => {
                setMode('register')
                setError('')
                setFieldErrors({})
              }}
            >
              Create account
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'active' : ''}
              onClick={() => {
                setMode('login')
                setError('')
                setFieldErrors({})
              }}
            >
              Sign in
            </button>
          </div>

          <div>
            <h2>{mode === 'register' ? 'Create your account' : 'Welcome back'}</h2>
            <p className="muted" style={{ marginTop: '4px' }}>
              {mode === 'register'
                ? 'Start with a portfolio snapshot in minutes.'
                : 'Sign in to access your investment workspaces.'}
            </p>
          </div>

          <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label className="field-label">
              Email address
              <input
                required
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={() => setFieldErrors(prev => ({ ...prev, email: validate(email, password, mode).email }))}
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email && <span className="field-error" role="alert">{fieldErrors.email}</span>}
            </label>

            <label className="field-label">
              Password
              <span className="password-wrap">
                <input
                  required
                  maxLength={128}
                  minLength={mode === 'register' ? 12 : undefined}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  placeholder={mode === 'register' ? 'At least 12 characters' : 'Enter your password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onBlur={() => setFieldErrors(prev => ({ ...prev, password: validate(email, password, mode).password }))}
                  aria-invalid={!!fieldErrors.password}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
              {fieldErrors.password && <span className="field-error" role="alert">{fieldErrors.password}</span>}
            </label>

            {error && (
              <div className="alert danger">
                <CircleAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              disabled={busy}
              className="button primary wide"
              type="submit"
              style={{ marginTop: '4px', padding: '12px' }}
            >
              {busy ? 'Please wait...' : mode === 'register' ? 'Create account' : 'Sign in'}
              <ArrowRight size={16} />
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Local development preview · Not ready for public financial data yet.
          </p>
        </div>
      </main>
    </div>
  )
}
