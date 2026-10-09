import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import { Plus, Sparkles } from 'lucide-react'
import { api, type Dashboard, type Portfolio } from '../api'
import { SpotlightCard } from './ui/SpotlightCard'
import { FadeContent } from './ui/FadeContent'
import { OverviewEmptyState } from './OverviewEmptyState'
import { CountUp } from './ui/CountUp'

interface DashboardViewProps {
  portfolio: Portfolio
  onImport: () => void
}

const currency = (value: string | null) =>
  value === null
    ? '—'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value))

const percent = (value: string) => `${Number(value).toFixed(2)}%`

function AllocationChart({ positions }: { positions: Dashboard['positions'] }) {
  const data = positions.map(row => ({ name: row.symbol, value: Number(row.market_value) }))

  const option = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (p: { name: string; percent: number; value: number }) =>
          `${p.name}: ${currency(String(p.value))} (${p.percent.toFixed(1)}%)`,
        backgroundColor: '#162032',
        borderColor: '#223046',
        textStyle: { color: '#f1f5f9', fontSize: 12 },
      },
      legend: { show: false },
      color: ['#638af7', '#39b8a1', '#e3b66f', '#b491e9', '#e77c89', '#6ab0c4', '#aab6c9'],
      series: [
        {
          type: 'pie',
          radius: ['68%', '86%'],
          center: ['50%', '50%'],
          startAngle: 90,
          avoidLabelOverlap: true,
          padAngle: 3,
          itemStyle: { borderRadius: 6 },
          label: { show: false },
          labelLine: { show: false },
          data,
        },
      ],
    }),
    [positions]
  )

  return <ReactECharts option={option} notMerge style={{ width: '100%', height: 250 }} />
}

export function DashboardView({ portfolio, onImport }: DashboardViewProps) {
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
          <p className="muted">
            Snapshot as of {data.snapshot.as_of} · USD valuations provided by you
          </p>
        </div>

        <button type="button" className="button secondary" onClick={onImport}>
          <Plus size={15} />
          <span>Update snapshot</span>
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="stat-grid">
        <SpotlightCard className="stat-card">
          <span className="stat-card-label">Portfolio market value</span>
          <strong className="stat-card-value tabular-numbers">
            {data.total_value !== null ? (
              <CountUp
                to={Number(data.total_value)}
                duration={700}
                formatter={val => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)}
              />
            ) : (
              '—'
            )}
          </strong>
          <span className="stat-card-caption">Based on confirmed imported values</span>
        </SpotlightCard>

        <SpotlightCard className="stat-card">
          <span className="stat-card-label">Holdings</span>
          <strong className="stat-card-value tabular-numbers">
            <CountUp to={data.positions.length} duration={500} />
          </strong>
        </SpotlightCard>

        <SpotlightCard className="stat-card">
          <span className="stat-card-label">Largest position</span>
          <strong className="stat-card-value">{largest?.symbol || '—'}</strong>
          <span className="stat-card-caption">
            {largest ? `${percent(largest.weight_pct)} of portfolio` : 'No holdings'}
          </span>
        </SpotlightCard>
      </div>

      {/* Visual Grid: Allocation Donut & Exposure Breakdown */}
      <div className="visual-grid">
        {/* Allocation Panel */}
        <SpotlightCard className="panel">
          <div className="panel-header">
            <div>
              <h3>Allocation</h3>
              <p>Market value by holding</p>
            </div>
            <span className="status-pill">USD</span>
          </div>

          <div className="chart-wrap">
            <AllocationChart positions={data.positions} />
            <div className="chart-center-badge">
              <span>Total value</span>
              <strong className="tabular-numbers">{currency(data.total_value)}</strong>
            </div>
          </div>

          <div className="chart-legend">
            {data.positions.slice(0, 6).map((p, i) => (
              <div key={`${p.symbol}-${p.exchange}`} className="legend-item">
                <div className="legend-item-left">
                  <span className={`legend-dot dot-${i % 5}`} />
                  <span>{p.symbol}</span>
                </div>
                <strong className="tabular-numbers" style={{ color: 'var(--text-primary)' }}>
                  {percent(p.weight_pct)}
                </strong>
              </div>
            ))}
          </div>
        </SpotlightCard>

        {/* Exposure Breakdown Panel */}
        <SpotlightCard className="panel">
          <div className="panel-header">
            <div>
              <h3>Exposure breakdown</h3>
              <p>Where your capital is concentrated</p>
            </div>
          </div>

          <div className="exposure-list">
            {data.positions.slice(0, 8).map((p, i) => (
              <div className="exposure-item" key={`${p.symbol}-${p.exchange}`}>
                <div className="exposure-header">
                  <div className="exposure-title">
                    <span className="ticker-pill">{p.symbol.slice(0, 5)}</span>
                    <span>{p.symbol}</span>
                  </div>
                  <strong className="tabular-numbers" style={{ color: 'var(--accent-lime)' }}>
                    {percent(p.weight_pct)}
                  </strong>
                </div>
                <div className="meter-track">
                  <div
                    className={`meter-fill dot-${i % 5}`}
                    style={{ width: `${Math.max(0, Math.min(100, Number(p.weight_pct)))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SpotlightCard>
      </div>

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
              {data.positions.map(p => (
                <tr key={`${p.symbol}-${p.exchange}`}>
                  <td>
                    <strong>{p.symbol}</strong>
                    <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      {p.exchange}
                    </span>
                  </td>
                  <td className="tabular-numbers">{Number(p.quantity).toLocaleString('en-US')}</td>
                  <td className="tabular-numbers">{currency(p.unit_price)}</td>
                  <td className="tabular-numbers">{currency(p.market_value)}</td>
                  <td>
                    <span className="weight-badge tabular-numbers">{percent(p.weight_pct)}</span>
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
