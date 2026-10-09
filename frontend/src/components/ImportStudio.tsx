import { useState, useRef, type DragEvent } from 'react'
import {
  ArrowDownToLine,
  Check,
  CheckCircle2,
  CircleAlert,
  CloudUpload,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { api, emptyRow, type Portfolio, type Preview, type RawRow } from '../api'
import { FadeContent } from './ui/FadeContent'
import { SpotlightCard } from './ui/SpotlightCard'

interface ImportStudioProps {
  portfolio: Portfolio
  onCommitted: () => void
}

const currentDate = () => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function ImportStudio({ portfolio, onCommitted }: ImportStudioProps) {
  const [date, setDate] = useState(currentDate())
  const [rows, setRows] = useState<RawRow[]>([emptyRow(currentDate())])
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  const changeRow = (index: number, field: keyof RawRow, value: string) => {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
    setPreview(null)
  }

  const changeDate = (value: string) => {
    setDate(value)
    setRows(prev => prev.map(row => ({ ...row, snapshot_date: value })))
    setPreview(null)
  }

  async function previewRows(candidate: RawRow[] = rows) {
    setWorking(true)
    setError('')
    try {
      const result = await api<Preview>(`/portfolios/${portfolio.id}/imports/preview`, {
        method: 'POST',
        body: JSON.stringify({ rows: candidate }),
      })
      setPreview(result)
      setRows(
        result.rows.map(row => ({
          symbol: row.symbol,
          exchange: row.exchange,
          quantity: row.quantity,
          unit_price: row.unit_price,
          market_value: row.market_value,
          currency: row.currency,
          snapshot_date: row.snapshot_date,
        }))
      )
    } catch (err) {
      setPreview(null)
      setError((err as Error).message)
    } finally {
      setWorking(false)
    }
  }

  async function loadFile(file?: File) {
    if (!file) return
    setWorking(true)
    setError('')
    setFileName(file.name)
    if (file.size > 256000 || !file.name.toLowerCase().endsWith('.csv')) {
      setError('This first slice supports CSV files up to 256 KB. Image, PDF and Excel import are scheduled for Phase 2.')
      setWorking(false)
      return
    }
    try {
      const result = await api<Preview>(`/portfolios/${portfolio.id}/imports/preview`, {
        method: 'POST',
        body: JSON.stringify({ csv_text: await file.text() }),
      })
      setPreview(result)
      setRows(
        result.rows.map(row => ({
          symbol: row.symbol,
          exchange: row.exchange,
          quantity: row.quantity,
          unit_price: row.unit_price,
          market_value: row.market_value,
          currency: row.currency,
          snapshot_date: row.snapshot_date,
        }))
      )
      if (result.rows.length && result.rows[0].snapshot_date) {
        setDate(result.rows[0].snapshot_date)
      }
      tableRef.current?.scrollIntoView({ behavior: 'smooth' })
    } catch (err) {
      setPreview(null)
      setError((err as Error).message)
    } finally {
      setWorking(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function save() {
    if (!preview?.valid) return
    setWorking(true)
    setError('')
    try {
      await api(`/portfolios/${portfolio.id}/snapshots`, {
        method: 'POST',
        body: JSON.stringify({ rows }),
      })
      onCommitted()
    } catch (err) {
      setError((err as Error).message)
      setPreview(null)
    } finally {
      setWorking(false)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) loadFile(file)
  }

  const handleManualEntryClick = () => {
    setFileName('')
    tableRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <FadeContent className="stack">
      {/* Page Heading */}
      <div className="split-heading">
        <div>
          <span className="eyebrow">PORTFOLIO IMPORT</span>
          <h2>Add your holdings</h2>
          <p className="muted">
            Import a snapshot or enter your investments manually. No purchase history is inferred.
          </p>
        </div>
      </div>

      {/* Primary Hero Dropzone (Image #2) */}
      <SpotlightCard
        className={`dropzone-card ${isDragging ? 'drag-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        aria-label="Upload CSV holdings file"
      >
        <div className="dropzone-icon">
          <CloudUpload size={28} />
        </div>
        <h3>Drop your CSV file here</h3>
        <p className="dropzone-subtitle">or browse files from your device</p>

        <button
          type="button"
          className="button primary"
          onClick={e => {
            e.stopPropagation()
            inputRef.current?.click()
          }}
        >
          <span>Choose CSV</span>
        </button>

        <span className="dropzone-badge">
          Supports CSV files up to 256 KB · USD only
        </span>

        <input
          hidden
          type="file"
          accept=".csv,text/csv"
          ref={inputRef}
          onChange={e => loadFile(e.target.files?.[0])}
        />
      </SpotlightCard>

      {/* Secondary Actions (2-Column Grid matching Image #2) */}
      <div className="import-secondary-grid">
        <SpotlightCard className="action-card-spotlight">
          <button
            type="button"
            className="action-card"
            onClick={handleManualEntryClick}
          >
            <div className="action-card-icon">
              <FileSpreadsheet size={20} />
            </div>
            <div className="action-card-text">
              <strong>Enter manually</strong>
              <span>Add holdings in a table</span>
            </div>
          </button>
        </SpotlightCard>

        <SpotlightCard className="action-card-spotlight">
          <a
            className="action-card"
            download
            href="/api/templates/holdings.csv"
          >
            <div className="action-card-icon">
              <ArrowDownToLine size={20} />
            </div>
            <div className="action-card-text">
              <strong>CSV template</strong>
              <span>Download the format</span>
            </div>
          </a>
        </SpotlightCard>
      </div>

      {/* Polished Holdings Snapshot Table Editor */}
      <div className="surface editor-card" ref={tableRef}>
        <div className="editor-header">
          <div>
            <h3>Holdings snapshot</h3>
            <div className="editor-header-meta">
              <span className="status-pill">
                {fileName ? `Imported from ${fileName}` : 'Manual entries'}
              </span>
              <span className="status-pill">USD only</span>
            </div>
          </div>

          <label className="date-picker-wrap">
            <span>As of</span>
            <input
              type="date"
              max={currentDate()}
              value={date}
              onChange={e => changeDate(e.target.value)}
            />
          </label>
        </div>

        <div className="table-scroll">
          <table className="edit-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Exchange</th>
                <th>Quantity</th>
                <th>Unit price ($)</th>
                <th>Market value ($)</th>
                <th style={{ width: '48px' }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isInvalid = preview?.rows[i]?.status === 'invalid'
                return (
                  <tr key={i} className={isInvalid ? 'invalid-row' : ''}>
                    {(['symbol', 'exchange', 'quantity', 'unit_price', 'market_value'] as const).map(field => (
                      <td key={field}>
                        <input
                          aria-label={`Row ${i + 1} ${field}`}
                          className="cell-input"
                          type={field === 'symbol' || field === 'exchange' ? 'text' : 'number'}
                          min={field === 'quantity' || field === 'unit_price' || field === 'market_value' ? '0' : undefined}
                          step="any"
                          placeholder={field === 'unit_price' || field === 'market_value' ? 'optional' : 'required'}
                          value={row[field]}
                          onChange={e => changeRow(i, field, e.target.value)}
                        />
                      </td>
                    ))}
                    <td>
                      <button
                        type="button"
                        className="icon-button danger"
                        title="Remove row"
                        disabled={rows.length === 1}
                        onClick={() => {
                          setRows(prev => prev.filter((_, j) => j !== i))
                          setPreview(null)
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Row-specific validation error banner */}
        {preview?.rows.some(row => row.errors.length > 0) && (
          <div className="validation-callout">
            {preview.rows
              .filter(row => row.errors.length > 0)
              .map(row => (
                <div key={row.row} className="validation-callout-item">
                  <CircleAlert size={15} style={{ flexShrink: 0 }} />
                  <span>Row {row.row}: {row.errors.join('; ')}</span>
                </div>
              ))}
          </div>
        )}

        <div className="editor-footer">
          <button
            type="button"
            className="button secondary sm"
            onClick={() => {
              setRows(prev => [...prev, emptyRow(date)])
              setPreview(null)
            }}
            disabled={rows.length >= 200}
          >
            <Plus size={15} />
            <span>Add row</span>
          </button>

          <div className="editor-footer-actions">
            {preview?.valid && (
              <FadeContent>
                <span className="valid-indicator">
                  <CheckCircle2 size={16} />
                  <span>All {preview.rows.length} rows valid</span>
                </span>
              </FadeContent>
            )}

            <button
              type="button"
              className="button secondary"
              disabled={working}
              onClick={() => previewRows()}
            >
              <RefreshCw size={14} className={working ? 'spin' : ''} />
              <span>{working ? 'Checking...' : 'Validate'}</span>
            </button>

            <button
              type="button"
              className="button primary"
              disabled={!preview?.valid || working}
              onClick={save}
            >
              <Check size={16} />
              <span>Confirm & save</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert danger">
          <CircleAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="disclaimer-line">
        <ShieldCheck size={16} style={{ color: 'var(--accent-lime)' }} />
        <span>
          The final portfolio is saved only after your confirmation. Cost basis and performance require transaction history.
        </span>
      </div>
    </FadeContent>
  )
}
