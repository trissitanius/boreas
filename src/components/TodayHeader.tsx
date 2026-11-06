import type { ReactNode } from 'react'

interface Props {
  /** Small line above the title, e.g. "Friday 6 November". */
  kicker: string
  title: string
  /** Small line below the title, e.g. "2 of 6 done". */
  sub?: string
  children?: ReactNode
}

/** App header with the fluted glass look (CSS only, see .glass-header in theme.css). */
export function TodayHeader({ kicker, title, sub, children }: Props) {
  return (
    <header className="glass-header">
      {children}
      <p className="glass-kicker">{kicker}</p>
      <h1 className="glass-title">{title}</h1>
      {sub && <p className="glass-sub">{sub}</p>}
    </header>
  )
}
