import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Sparkles } from 'lucide-react'
import { api, type Dashboard, type Portfolio } from '../api'
import { SpotlightCard } from './ui/SpotlightCard'
import { FadeContent } from './ui/FadeContent'
import { OverviewEmptyState } from './OverviewEmptyState'
import { AllocationRibbon, CONCENTRATION_PCT, ribbonColorFor } from './AllocationRibbon'

interface DashboardViewProps {
  portfolio: Portfolio
  onImport: () => void
}

const currency = (value: string | null) =>
  value === null
    ? '—'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value))

const percent = (value: string) => `${Number(value).toFixed(2)}%`

export function DashboardView({ portfolio, onImport }: DashboardViewProps) {
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', portfolio.id],
    queryFn: () => api<Dashboard>(`/portfolios/${portfolio.id}/dashboard`),
  })

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-muted)' }}>
        Loading dashboard...
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert danger">
        <span>{(error as Error).message}</span>
      </div>
    )
  }

  if (!data?.snapshot) {
    return <OverviewEmptyState portfolio={portfolio} onAddHoldings={onImport} />
  }

  const largest = data.positions[0]

  return (
    <FadeContent className="stack">
      {/* Header */}
      <div className="split-heading">
        <div>
          <span className="eyebrow">PORTFOLIO OVERVIEW</span>
          <h2>{portfolio.name}</h2>
          <p className="figure-hero">{currency(data.total_value)}</p>
          <p className="muted">
            Snapshot as of {data.snapshot.as_of} · USD valuations provided by you
          </p>
          <p className="hero-meta">
            <span className="tabular-numbers">{data.positions.length}</span> holdings · largest{' '}
            <span className="tabular-numbers">{largest?.symbol ?? '—'}</span>{' '}
            <span className="tabular-numbers">{largest ? percent(largest.weight_pct) : '—'}</span>
          </p>
        </div>

        <button type="button" className="button secondary" onClick={onImport}>
          <Plus size={15} />
          <span>Update snapshot</span>
        </button>
      </div>

      {/* Allocation ribbon — the single canonical encoding of allocation */}
      <SpotlightCard className="panel">
        <div className="panel-header">
          <div>
            <h3>Allocation</h3>
            <p>Market value by holding</p>
          </div>
          <span className="status-pill">USD</span>
        </div>

        <AllocationRibbon
          positions={data.positions}
          hoveredSymbol={hoveredSymbol}
          onHover={setHoveredSymbol}
        />
      </SpotlightCard>

      {/* Holdings Data Table Panel */}
      <SpotlightCard className="panel">
        <div className="panel-header">
          <div>
            <h3>Holdings</h3>
            <p>Snapshot positions · values are not live quotes</p>
          </div>
          <span className="status-pill">{data.positions.length} assets</span>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Security</th>
                <th>Quantity</th>
                <th>Unit price</th>
                <th>Market value</th>
                <th>Weight</th>
              </tr>
            </thead>
            <tbody>
              {data.positions.map((p, index) => (
                <tr
                  key={`${p.symbol}-${p.exchange}`}
                  className={hoveredSymbol === p.symbol ? 'is-highlighted' : ''}
                  onMouseEnter={() => setHoveredSymbol(p.symbol)}
                  onMouseLeave={() => setHoveredSymbol(null)}
                >
                  <td data-label="Security">
                    <span
                      className="swatch"
                      style={{ background: ribbonColorFor(index, data.positions.length) }}
                      aria-hidden="true"
                    />
                    <span className="cell-stack">
                      <strong>{p.symbol}</strong>
                      <span className="cell-sub">{p.exchange}</span>
                    </span>
                  </td>
                  <td className="tabular-numbers" data-label="Quantity">
                    {Number(p.quantity).toLocaleString('en-US')}
                  </td>
                  <td className="tabular-numbers" data-label="Unit price">
                    {currency(p.unit_price)}
                  </td>
                  <td className="tabular-numbers" data-label="Market value">
                    {currency(p.market_value)}
                  </td>
                  <td data-label="Weight">
                    <span className="weight-badge tabular-numbers">{percent(p.weight_pct)}</span>
                    {Number(p.weight_pct) >= CONCENTRATION_PCT && (
                      <>
                        <span className="weight-flag">25%+</span>
                        <span className="sr-only">at least 25 percent of portfolio</span>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SpotlightCard>

      {/* Financial Metrics Transparency Notice */}
      <div className="notice-banner">
        <Sparkles size={20} />
        <div>
          <strong>Financial metrics not available yet</strong>
          <p>
            P&L, cost basis, return history and AI guidance need verified transactions, quotes or thesis context. We won't manufacture these numbers.
          </p>
        </div>
      </div>
    </FadeContent>
  )
}
