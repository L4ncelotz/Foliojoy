interface BorderBeamProps {
  className?: string
  duration?: number
  color?: string
}

export function BorderBeam({
  className = '',
  duration = 8,
  color = '#c9e98e',
}: BorderBeamProps) {
  return (
    <div className={`border-beam-container ${className}`} aria-hidden="true">
      <svg className="border-beam-svg">
        <rect
          pathLength="100"
          className="border-beam-rect"
          style={{
            animationDuration: `${duration}s`,
            stroke: color,
          }}
        />
      </svg>
    </div>
  )
}
