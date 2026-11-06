import { useEffect, useState } from 'react'
import { db } from '../db/db'
import { deleteSet, logSet, SETS_PER_EXERCISE } from '../db/repo'
import type { Exercise, Machine, SetLog } from '../db/types'
import { parseReps, parseWeight } from '../lib/parse'
import { strings } from '../strings'
import { LastTime } from './LastTime'

interface Props {
  exercise: Exercise
  machine?: Machine
  dayTemplateId: string
  date: string
  /** Sets of this exercise already logged today. */
  sets: SetLog[]
  onBack: () => void
}

export function ExerciseLogger({ exercise, machine, dayTemplateId, date, sets, onBack }: Props) {
  const setNumbers = Array.from({ length: SETS_PER_EXERCISE }, (_, i) => i + 1)
  return (
    <section>
      <button type="button" className="back-button" onClick={onBack}>
        {strings.back}
      </button>
      <div className="logger-header">
        <span className="gym-number">{machine?.gymNumber ?? strings.noMachine}</span>
        <h2>
          {exercise.name}
          {exercise.variant && <span className="muted"> · {exercise.variant}</span>}
        </h2>
      </div>
      {exercise.settings && <p className="settings-line">{exercise.settings}</p>}
      <LastTime exercise={exercise} today={date} />
      {exercise.cues.length > 0 && (
        <ul className="cues">
          {exercise.cues.map((cue) => (
            <li key={cue}>{cue}</li>
          ))}
        </ul>
      )}
      {setNumbers.map((n) => (
        <SetRow
          key={n}
          setNumber={n}
          exercise={exercise}
          dayTemplateId={dayTemplateId}
          date={date}
          saved={sets.find((s) => s.setNumber === n)}
        />
      ))}
    </section>
  )
}

interface SetRowProps {
  setNumber: number
  exercise: Exercise
  dayTemplateId: string
  date: string
  saved?: SetLog
}

function SetRow({ setNumber, exercise, dayTemplateId, date, saved }: SetRowProps) {
  const bodyweight = exercise.loadType === 'bodyweight'
  const [weight, setWeight] = useState(saved?.weightKg != null ? String(saved.weightKg) : '')
  const [reps, setReps] = useState(saved ? String(saved.reps) : '')
  const [error, setError] = useState<string | null>(null)

  // Show the stored values whenever the saved set changes (e.g. after saving or deleting).
  useEffect(() => {
    setWeight(saved?.weightKg != null ? String(saved.weightKg) : '')
    setReps(saved ? String(saved.reps) : '')
  }, [saved?.id, saved?.weightKg, saved?.reps])

  const unchanged =
    saved !== undefined &&
    String(saved.reps) === reps.trim() &&
    (bodyweight || parseWeight(weight) === saved.weightKg)

  async function save() {
    const weightKg = bodyweight ? null : parseWeight(weight)
    if (weightKg === undefined) return setError(strings.invalidWeight)
    const repCount = parseReps(reps)
    if (repCount === undefined) return setError(strings.invalidReps)
    setError(null)
    try {
      await logSet(db, { exerciseId: exercise.id, dayTemplateId, date, setNumber, weightKg, reps: repCount })
    } catch {
      setError(strings.saveFailed)
    }
  }

  return (
    <div className={`set-row${bodyweight ? ' no-weight' : ''}`}>
      <span className="set-number">{strings.setLabel(setNumber)}</span>
      {bodyweight ? null : (
        <div className="field">
          <label htmlFor={`w${setNumber}`}>
            {strings.weight} ({strings.kg})
          </label>
          <input
            id={`w${setNumber}`}
            inputMode="decimal"
            autoComplete="off"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
      )}
      <div className="field">
        <label htmlFor={`r${setNumber}`}>{bodyweight ? `${strings.reps} · ${strings.bodyweight}` : strings.reps}</label>
        <input
          id={`r${setNumber}`}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void save()}
        />
      </div>
      <div className="set-actions">
        {saved && unchanged ? (
          <button type="button" className="btn" onClick={() => void deleteSet(db, saved.id)}>
            {strings.delete}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => void save()}>
            {strings.save}
          </button>
        )}
      </div>
      {error && <p className="set-error">{error}</p>}
    </div>
  )
}
