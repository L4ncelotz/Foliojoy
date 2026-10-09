import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Briefcase, Check, ChevronsUpDown, Plus, Wallet } from 'lucide-react'
import type { Portfolio } from '../api'

interface PortfolioSwitcherProps {
  portfolios: Portfolio[]
  selectedId: number | null
  onSelect: (id: number) => void
  onCreateNew: () => void
}

export function PortfolioSwitcher({
  portfolios,
  selectedId,
  onSelect,
  onCreateNew,
}: PortfolioSwitcherProps) {
  const [open, setOpen] = useState(false)
  const currentPortfolio = portfolios.find(p => p.id === selectedId)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="portfolio-popover-trigger"
          aria-label="Select portfolio"
          data-state={open ? 'open' : 'closed'}
        >
          <Wallet size={16} className="trigger-icon" />
          <span>{currentPortfolio ? currentPortfolio.name : 'Select a portfolio'}</span>
          <ChevronsUpDown size={14} className="trigger-chevron" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="portfolio-popover-content"
          align="start"
          sideOffset={8}
        >
          <div className="popover-header">YOUR PORTFOLIOS</div>
          <div className="popover-list" role="listbox" aria-label="Portfolios">
            {portfolios.map(p => {
              const isSelected = p.id === selectedId
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`popover-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelect(p.id)
                    setOpen(false)
                  }}
                >
                  <span className="popover-item-left">
                    <Briefcase size={14} />
                    <span>{p.name}</span>
                  </span>
                  {isSelected && <Check size={14} className="popover-check" />}
                </button>
              )
            })}
          </div>
          <div className="popover-separator" />
          <button
            type="button"
            className="popover-create-action"
            onClick={() => {
              setOpen(false)
              onCreateNew()
            }}
          >
            <Plus size={15} />
            <span>Create portfolio</span>
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
