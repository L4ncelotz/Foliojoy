import { type ReactNode } from 'react'

export function FadeContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`fade-content ${className}`}>{children}</div>
}
