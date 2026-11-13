import type { ReactNode } from 'react'

interface Props {
  /** Small line above the title, e.g. "Friday 6 November". */
  kicker: string
  title: string
  /** Small line below the title, e.g. "2 of 6 done". */
  sub?: string
  /** Exercises done out of the day's total: drawn as one bar segment per exercise. */
  progress?: { done: number; total: number }
  children?: ReactNode
}

/** Big header text, straight on the fluted glass background. */
export function TodayHeader({ kicker, title, sub, progress, children }: Props) {
  return (
    <header className="page-header">
      {children}
      <p className="page-kicker">{kicker}</p>
      <h1 className="page-title">{title}</h1>
      {sub && <p className="page-sub">{sub}</p>}
      {progress && progress.total > 0 && (
        // The text line above already says "2 of 6 done"; the bar is decoration.
        <div className={`day-progress${progress.done >= progress.total ? ' is-complete' : ''}`} aria-hidden="true">
          {Array.from({ length: progress.total }, (_, i) => (
            <span key={i} className={i < progress.done ? 'is-done' : undefined} />
          ))}
        </div>
      )}
    </header>
  )
}
