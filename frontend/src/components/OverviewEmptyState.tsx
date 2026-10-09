import { ArrowRight, Check, Layers } from 'lucide-react'
import { SpotlightCard } from './ui/SpotlightCard'
import { FadeContent } from './ui/FadeContent'
import type { Portfolio } from '../api'

interface OverviewEmptyStateProps {
  portfolio: Portfolio
  onAddHoldings: () => void
}

export function OverviewEmptyState({ portfolio, onAddHoldings }: OverviewEmptyStateProps) {
  return (
    <FadeContent className="stack">
      <SpotlightCard className="surface" style={{ padding: 0 }}>
        {/* Workspace Card Header */}
        <div className="overview-workspace-header">
          <div>
            <h3>Overview</h3>
            <p className="muted" style={{ fontSize: '0.8125rem', marginTop: '2px' }}>
              Your investment workspace
            </p>
          </div>
          <div className="portfolio-name-badge">
            <span>{portfolio.name}</span>
          </div>
        </div>

        {/* Hero Empty State Center Container */}
        <div className="empty-state-center-container">
          <div className="empty-state-icon-tile">
            <Layers size={32} />
          </div>

          <h2>Your portfolio starts here</h2>
          <p className="empty-subtitle">
            Add your first holdings to unlock allocation insights.
          </p>

          <button
            type="button"
            className="button primary"
            onClick={onAddHoldings}
          >
            <span>Add holdings</span>
            <ArrowRight size={16} />
          </button>

          <p className="empty-state-footnote">
            You can upload a CSV or enter holdings manually.
          </p>
        </div>

        {/* 3-Step Onboarding Progression Bar */}
        <div className="onboarding-stepper">
          <div className="onboarding-step-card">
            <div className="step-indicator-pill completed">
              <Check size={14} />
            </div>
            <div className="onboarding-step-text">
              <strong>Portfolio created</strong>
              <span>{portfolio.name} is ready</span>
            </div>
          </div>

          <div className="onboarding-step-card active">
            <div className="step-indicator-pill active">
              2
            </div>
            <div className="onboarding-step-text">
              <strong>Add holdings</strong>
              <span>CSV upload or manual entry, USD only</span>
            </div>
          </div>

          <div className="onboarding-step-card">
            <div className="step-indicator-pill">
              3
            </div>
            <div className="onboarding-step-text">
              <strong>Review allocation</strong>
              <span>Totals appear after you confirm</span>
            </div>
          </div>
        </div>
      </SpotlightCard>
    </FadeContent>
  )
}
