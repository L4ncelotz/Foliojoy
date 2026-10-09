import { useEffect, useState } from 'react'

interface CountUpProps {
  to: number
  duration?: number
  formatter?: (val: number) => string
  className?: string
}

export function CountUp({
  to,
  duration = 800,
  formatter = val => val.toLocaleString('en-US'),
  className = '',
}: CountUpProps) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion || duration <= 0) {
      setCurrent(to)
      return
    }

    let startTimestamp: number | null = null
    let frameId: number

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      setCurrent(progress >= 1 ? to : Math.round(easeProgress * to))

      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      }
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [to, duration])

  return <span className={className}>{formatter(current)}</span>
}
