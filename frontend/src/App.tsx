import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChartNoAxesCombined,
  FileUp,
  LayoutDashboard,
  LogOut,
  Plus,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { api, refreshSession, setCsrf, type Portfolio, type Session } from './api'
import { AuthView } from './components/AuthView'
import { PortfolioSwitcher } from './components/PortfolioSwitcher'
import { CreatePortfolioModal } from './components/CreatePortfolioModal'
import { DashboardView } from './components/DashboardView'
import { ImportStudio } from './components/ImportStudio'
import { FadeContent } from './components/ui/FadeContent'
import { AnimatedContent } from './components/ui/AnimatedContent'
import { Toaster, toast } from 'sonner'

export default function App() {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [selected, setSelected] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [screen, setScreen] = useState<'dashboard' | 'import'>('dashboard')

  useEffect(() => {
    refreshSession().then(s => {
      setSession(s)
      setLoadingSession(false)
    })
  }, [])

  const { data: portfolios = [] } = useQuery({
    queryKey: ['portfolios', session?.user.id],
    queryFn: () => api<Portfolio[]>('/portfolios'),
    enabled: !!session,
  })

  useEffect(() => {
    if (portfolios.length && (selected === null || !portfolios.some(p => p.id === selected))) {
      setSelected(portfolios[0].id)
    }
  }, [portfolios, selected])

  const portfolio = portfolios.find(p => p.id === selected)

  async function handleCreatePortfolio(name: string) {
    const record = await api<Portfolio>('/portfolios', {
      method: 'POST',
      body: JSON.stringify({ name, base_currency: 'USD' }),
    })
    await queryClient.invalidateQueries({ queryKey: ['portfolios'] })
    setSelected(record.id)
    setScreen('import')
    toast.success(`Portfolio "${record.name}" created`)
  }

  async function handleLogout() {
    try {
      await api('/auth/logout', { method: 'POST' })
      toast.info('Signed out')
    } finally {
      setCsrf('')
      setSession(null)
      queryClient.clear()
      setSelected(null)
    }
  }

  if (loadingSession) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="brand-mark" style={{ width: '28px', height: '28px' }}>
            <ChartNoAxesCombined size={16} />
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Loading Foliojoy...</span>
        </div>
      </div>
    )
  }

  if (!session) {
    return <AuthView onAuthenticated={setSession} />
  }

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <ChartNoAxesCombined size={18} />
          </div>
          <span>foliojoy<span className="brand-dot">.</span></span>
        </div>

        <span className="nav-title">WORKSPACE</span>

        <button
          type="button"
          className={`nav-item ${screen === 'dashboard' ? 'active' : ''}`}
          onClick={() => setScreen('dashboard')}
        >
          <LayoutDashboard size={17} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          className={`nav-item ${screen === 'import' ? 'active' : ''}`}
          onClick={() => setScreen('import')}
        >
          <FileUp size={17} />
          <span>Import holdings</span>
        </button>

        <div className="sidebar-space" />

        <div className="sidebar-privacy-badge" title="All data is scoped to your account">
          <ShieldCheck size={14} />
          <span>Private to your account</span>
        </div>

        <button type="button" className="nav-item logout" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </aside>

      {/* Main Area */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <div className="brand mobile-brand">
            <div className="brand-mark" style={{ width: '26px', height: '26px' }}>
              <ChartNoAxesCombined size={14} />
            </div>
            <span>foliojoy<span className="brand-dot">.</span></span>
          </div>

          {/* Accessible Portfolio Switcher Popover (Image #3) */}
          <PortfolioSwitcher
            portfolios={portfolios}
            selectedId={selected}
            onSelect={id => {
              setSelected(id)
              setScreen('dashboard')
            }}
            onCreateNew={() => setCreating(true)}
          />

          <div className="topbar-actions">
            <button
              type="button"
              className="button ghost sm"
              onClick={() => setCreating(true)}
            >
              <Plus size={15} />
              <span>New portfolio</span>
            </button>

            <div className="user-avatar" title={session.user.email}>
              {session.user.email.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Mobile Navigation */}
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <button
            type="button"
            className={screen === 'dashboard' ? 'selected' : ''}
            onClick={() => setScreen('dashboard')}
          >
            <LayoutDashboard size={15} />
            <span>Overview</span>
          </button>
          <button
            type="button"
            className={screen === 'import' ? 'selected' : ''}
            onClick={() => setScreen('import')}
          >
            <FileUp size={15} />
            <span>Import</span>
          </button>
        </nav>

        {/* Content Area */}
        <main className="content">
          {portfolio ? (
            <AnimatedContent key={screen} direction="up" distance={8} duration={220}>
              {screen === 'dashboard' ? (
                <DashboardView
                  portfolio={portfolio}
                  onImport={() => setScreen('import')}
                />
              ) : (
                <ImportStudio
                  key={portfolio.id}
                  portfolio={portfolio}
                  onCommitted={() => {
                    queryClient.invalidateQueries({ queryKey: ['dashboard', portfolio.id] })
                    setScreen('dashboard')
                  }}
                />
              )}
            </AnimatedContent>
          ) : (
            <FadeContent>
              <div className="empty-state-center-container surface" style={{ marginTop: '40px', padding: '48px 24px' }}>
                <div className="empty-state-icon-tile">
                  <Wallet size={32} />
                </div>
                <h2>Create a portfolio to get started</h2>
                <p className="empty-subtitle">
                  Track your positions privately. Start with your first portfolio.
                </p>
                <button
                  type="button"
                  className="button primary"
                  onClick={() => setCreating(true)}
                >
                  <Plus size={16} />
                  <span>Create portfolio</span>
                </button>
              </div>
            </FadeContent>
          )}
        </main>

        {/* App Footer */}
        <footer style={{ padding: '20px clamp(20px, 3.2vw, 48px)', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          <span>Foliojoy</span>
          <span>Educational portfolio visualization · No investment advice</span>
        </footer>
      </div>

      {/* Accessible Create Portfolio Modal (Radix Dialog) */}
      <CreatePortfolioModal
        open={creating}
        onOpenChange={setCreating}
        onSubmit={handleCreatePortfolio}
      />
      <Toaster position="bottom-right" theme="dark" richColors closeButton />
    </div>
  )
}
