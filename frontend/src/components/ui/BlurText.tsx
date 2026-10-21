import { useMemo } from 'react'

interface BlurTextProps {
  text: string
  className?: string
  delay?: number
}

export function BlurText({ text, className = '', delay = 45 }: BlurTextProps) {
  const words = useMemo(() => text.split(' '), [text])

  return (
    <span className={`blur-text-wrap ${className}`}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="blur-word"
          style={{ animationDelay: `${i * delay}ms` }}
        >
          {word}&nbsp;
        </span>
      ))}
    </span>
  )
}
