import type { ReactNode } from 'react'

interface Props {
  /** Small line above the title, e.g. "Friday 6 November". */
  kicker: string
  title: string
  /** Small line below the title, e.g. "2 of 6 done". */
  sub?: string
  children?: ReactNode
}

/** Big header text, straight on the fluted glass background. */
export function TodayHeader({ kicker, title, sub, children }: Props) {
  return (
    <header className="page-header">
      {children}
      <p className="page-kicker">{kicker}</p>
      <h1 className="page-title">{title}</h1>
      {sub && <p className="page-sub">{sub}</p>}
    </header>
  )
}
