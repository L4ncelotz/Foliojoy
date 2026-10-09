import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { CircleAlert, PlusCircle, ShieldCheck } from 'lucide-react'

interface CreatePortfolioModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string) => Promise<void>
}

export function CreatePortfolioModal({
  open,
  onOpenChange,
  onSubmit,
}: CreatePortfolioModalProps) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await onSubmit(name.trim())
      setName('')
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <div className="dialog-header">
            <div className="dialog-icon-tile">
              <PlusCircle size={22} />
            </div>
            <Dialog.Title asChild>
              <h2>Create portfolio</h2>
            </Dialog.Title>
            <Dialog.Description asChild>
              <p className="muted">Your positions will be stored privately in this portfolio.</p>
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label className="field-label">
              Portfolio name
              <input
                required
                minLength={1}
                maxLength={120}
                placeholder="e.g. Core Holdings, Growth, Retirement"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </label>

            <div className="dialog-info-pill">
              <ShieldCheck size={15} style={{ color: 'var(--accent-lime)' }} />
              <span>Base currency: USD (initial MVP)</span>
            </div>

            {error && (
              <div className="alert danger">
                <CircleAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="dialog-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={submitting || !name.trim()}
              >
                {submitting ? 'Creating...' : 'Create portfolio'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
