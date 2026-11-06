import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { getLastResult } from '../db/repo'
import type { Exercise } from '../db/types'
import { formatSets, formatShortDate } from '../lib/format'
import { progression } from '../lib/progression'
import { strings } from '../strings'
import { ProgressionBadge } from './ProgressionBadge'

interface Props {
  exercise: Exercise
  /** Today's date: sessions from today are ignored, so this keeps showing the previous session. */
  today: string
}

/**
 * "Last time: 30 kg · 13 / 12 / 10 — Wed 4 Nov · Pull", from whichever day it was done,
 * plus the "Increase weight" badge when set 3 reached 10 reps.
 */
export function LastTime({ exercise, today }: Props) {
  // undefined while loading, null when there's no history yet
  const last = useLiveQuery(
    async () => (await getLastResult(db, exercise.id, { before: today })) ?? null,
    [exercise.id, today],
  )
  if (last === undefined) return <span className="last-time" aria-busy="true" />

  const flag = progression(last ?? undefined, exercise)
  return (
    <span className="last-time">
      <span className="last-time-label">{strings.lastTime}</span>
      {last ? (
        <>
          <span className="last-time-sets">{formatSets(last.sets)}</span>
          <span className="last-time-when">
            {formatShortDate(last.date)} · {last.dayName}
          </span>
          {flag && <ProgressionBadge progression={flag} />}
        </>
      ) : (
        <span className="last-time-when">{strings.firstTime}</span>
      )}
    </span>
  )
}
