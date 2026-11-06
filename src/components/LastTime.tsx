import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { getLastResult } from '../db/repo'
import { formatSets, formatShortDate } from '../lib/format'
import { strings } from '../strings'

interface Props {
  exerciseId: string
  /** Today's date: sessions from today are ignored, so this keeps showing the previous session. */
  today: string
}

/** "Last time: 30 kg · 13 / 12 / 10 — Wed 4 Nov · Pull", from whichever day it was done. */
export function LastTime({ exerciseId, today }: Props) {
  // undefined while loading, null when there's no history yet
  const last = useLiveQuery(
    async () => (await getLastResult(db, exerciseId, { before: today })) ?? null,
    [exerciseId, today],
  )
  if (last === undefined) return <span className="last-time" aria-busy="true" />

  return (
    <span className="last-time">
      <span className="last-time-label">{strings.lastTime}</span>
      {last ? (
        <>
          <span className="last-time-sets">{formatSets(last.sets)}</span>
          <span className="last-time-when">
            {formatShortDate(last.date)} · {last.dayName}
          </span>
        </>
      ) : (
        <span className="last-time-when">{strings.firstTime}</span>
      )}
    </span>
  )
}
