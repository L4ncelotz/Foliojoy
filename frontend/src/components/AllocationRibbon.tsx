import { useMemo, type CSSProperties } from 'react'
import { holdingColor } from '../lib/palette'
import type { Position } from '../api'

const MAX_SEGMENTS = 12
const AGGREGATE_COLOR = '#8A8578'

export const CONCENTRATION_PCT = 25

/**
 * Colour of the ribbon segment a holding belongs to. Holdings beyond the
 * displayed segment count belong to the neutral "Other" aggregate, so they
 * never carry a per-holding colour that the ribbon does not show.
 */
export function ribbonColorFor(index: number, total: number): string {
  return index < Math.min(total, MAX_SEGMENTS) ? holdingColor(index) : AGGREGATE_COLOR
}

interface AllocationRibbonProps {
  positions: Position[]
  hoveredSymbol: string | null
  onHover: (symbol: string | null) => void
}

interface RibbonSegment {
  key: string
  symbol: string | null
  color: string
  weight: number
  concentrated: boolean
}

export function AllocationRibbon({ positions, hoveredSymbol, onHover }: AllocationRibbonProps) {
  const { segments, caption } = useMemo(() => {
    const shown = positions.slice(0, MAX_SEGMENTS)
    const rest = positions.slice(MAX_SEGMENTS)

    const list: RibbonSegment[] = shown.map((position, index) => ({
      key: `${position.symbol}-${position.exchange}`,
      symbol: position.symbol,
      color: holdingColor(index),
      weight: Number(position.weight_pct),
      concentrated: Number(position.weight_pct) >= CONCENTRATION_PCT,
    }))

    if (rest.length > 0) {
      list.push({
        key: 'aggregate',
        symbol: null,
        color: AGGREGATE_COLOR,
        weight: rest.reduce((sum, position) => sum + Number(position.weight_pct), 0),
        concentrated: false,
      })
    }

    const shownWeight = shown.reduce((sum, position) => sum + Number(position.weight_pct), 0)
    const aggregationNote = rest.length
      ? `${shown.length} of ${positions.length} holdings · Other ${rest.length} = ${(100 - shownWeight).toFixed(1)}%`
      : null

    return { segments: list, caption: aggregationNote }
  }, [positions])

  return (
    <>
      <div className={`ribbon ${hoveredSymbol ? 'has-hover' : ''}`} aria-hidden="true">
        {segments.map((segment, index) => (
          <span
            key={segment.key}
            className={[
              'ribbon-segment',
              segment.concentrated ? 'ribbon-segment--concentrated' : '',
              segment.symbol && segment.symbol === hoveredSymbol ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={
              {
                flexGrow: segment.weight,
                backgroundColor: segment.color,
                '--i': index,
              } as CSSProperties
            }
            onMouseEnter={() => onHover(segment.symbol)}
            onMouseLeave={() => onHover(null)}
          />
        ))}
      </div>
      {caption && <p className="ribbon-caption">{caption}</p>}
    </>
  )
}
