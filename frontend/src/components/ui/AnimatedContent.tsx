import { type ReactNode, type CSSProperties } from 'react'

interface AnimatedContentProps {
  children: ReactNode
  className?: string
  direction?: 'up' | 'down' | 'none'
  distance?: number
  duration?: number
}

export function AnimatedContent({
  children,
  className = '',
  direction = 'up',
  distance = 10,
  duration = 240,
}: AnimatedContentProps) {
  const transformStart =
    direction === 'up'
      ? `translateY(${distance}px)`
      : direction === 'down'
      ? `translateY(-${distance}px)`
      : 'none'

  return (
    <div
      className={`animated-content ${className}`}
      style={
        {
          '--anim-start-transform': transformStart,
          '--anim-duration': `${duration}ms`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  )
}
