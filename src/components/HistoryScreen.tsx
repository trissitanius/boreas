import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { getHistory, type HistoryEntry } from '../db/repo'
import type { Exercise } from '../db/types'
import { addDays } from '../lib/dates'
import { formatSets, formatShortDate } from '../lib/format'
import { strings } from '../strings'

const t = strings.history

interface Props {
  today: string
  exercises: Map<string, Exercise>
  onClose: () => void
  /** Open a logged workout (that date and day) to see or edit it. */
  onOpen: (entry: HistoryEntry) => void
  /** Open a date to log a workout for it. */
  onLogDate: (date: string) => void
}

/** Every logged workout, newest first, plus "Log a past workout". */
export function HistoryScreen({ today, exercises, onClose, onOpen, onLogDate }: Props) {
  const history = useLiveQuery(() => getHistory(db))
  const [date, setDate] = useState(() => addDays(today, -1))
  const [error, setError] = useState<string | null>(null)

  function openDate() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    if (date > today) return setError(t.futureDate)
    onLogDate(date)
  }

  return (
    <section className="history-screen">
      <button type="button" className="back-button" onClick={onClose}>
        {strings.back}
      </button>
      <h1 className="page-title day-editor-title">{t.title}</h1>

      <div className="history-log-past">
        <label htmlFor="history-date">{t.logPast}</label>
        <p className="muted">{t.logPastHint}</p>
        <div className="history-log-row">
          <input
            id="history-date"
            type="date"
            className="history-date"
            max={today}
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setError(null)
            }}
          />
          <button type="button" className="btn btn-primary" onClick={openDate}>
            {t.open}
          </button>
        </div>
        {error && <p className="set-error">{error}</p>}
      </div>

      <h2 className="section-label">{t.logged}</h2>
      {history === undefined ? null : history.length === 0 ? (
        <p className="muted">{t.empty}</p>
      ) : (
        <ul className="history-list">
          {history.map((entry) => (
            <li key={entry.sessionId}>
              <button type="button" className="history-card" onClick={() => onOpen(entry)}>
                <span className="history-card-head">
                  <span className="history-date-label">{formatShortDate(entry.date)}</span>
                  <span className="history-day">{entry.dayName}</span>
                  <span className="history-chevron" aria-hidden="true">
                    ›
                  </span>
                </span>
                {entry.exercises.map(({ exerciseId, sets }) => {
                  const exercise = exercises.get(exerciseId)
                  return (
                    <span key={exerciseId} className="history-line">
                      <span className="history-exercise">
                        {exercise ? exercise.name : t.removedExercise}
                        {exercise?.variant && <span className="muted"> · {exercise.variant}</span>}
                      </span>
                      <span className="history-sets">{formatSets(sets)}</span>
                    </span>
                  )
                })}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
