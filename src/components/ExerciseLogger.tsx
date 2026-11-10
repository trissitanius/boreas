import { useCallback, useEffect, useState } from 'react'
import { db } from '../db/db'
import { deleteSet, logSet, SETS_PER_EXERCISE, setWeightForToday, updateSet } from '../db/repo'
import type { Exercise, Machine, SetLog } from '../db/types'
import { toISODate } from '../lib/dates'
import { formatNumber } from '../lib/format'
import { startRest } from '../lib/restTimer'
import { parseReps, parseWeight } from '../lib/parse'
import { defaultReps, weightForToday } from '../lib/prefill'
import { progression } from '../lib/progression'
import { useLastResult } from '../lib/useLastResult'
import { strings } from '../strings'
import { LastTime } from './LastTime'
import { ExerciseEditor } from './ExerciseEditor'
import { LazyBodyMap } from './LazyBodyMap'
import { MuscleSheet } from './MuscleSheet'
import { RepCounter } from './RepCounter'
import { useBodyModel } from '../lib/useBodyModel'

interface Props {
  exercise: Exercise
  machine?: Machine
  dayTemplateId: string
  date: string
  /** Sets of this exercise already logged today. */
  sets: SetLog[]
  /** The next unfinished exercise of the day, if any. */
  next?: Exercise
  onNext: () => void
  onBack: () => void
}

export function ExerciseLogger({ exercise, machine, dayTemplateId, date, sets, next, onNext, onBack }: Props) {
  const last = useLastResult(exercise.id, date)
  const ready = last !== undefined
  const flag = ready ? progression(last ?? undefined, exercise) : undefined
  const bodyweight = exercise.loadType === 'bodyweight'
  const setNumbers = Array.from({ length: SETS_PER_EXERCISE }, (_, i) => i + 1)
  const currentSet = setNumbers.find((n) => !sets.some((s) => s.setNumber === n))
  const [editorOpen, setEditorOpen] = useState(false)
  const closeEditor = useCallback(() => setEditorOpen(false), [])
  const [musclesOpen, setMusclesOpen] = useState(false)
  const closeMuscles = useCallback(() => setMusclesOpen(false), [])
  const [bodyModel] = useBodyModel()

  // One weight for all 3 sets, pre-filled until you type your own.
  const todayKg = ready ? weightForToday({ todaysSets: sets, last: last ?? undefined, flag, exercise }) : undefined
  const [weight, setWeight] = useState('')
  const [weightTouched, setWeightTouched] = useState(false)
  const [weightError, setWeightError] = useState<string | null>(null)
  useEffect(() => {
    if (!weightTouched) setWeight(todayKg !== undefined ? formatNumber(todayKg) : '')
  }, [todayKg, weightTouched])
  /** null = bodyweight (no weight), undefined = not a valid weight yet. */
  const weightKg = bodyweight ? null : parseWeight(weight)

  // Changing the weight after logging sets changes today's logged sets too.
  async function commitWeight() {
    if (bodyweight || sets.length === 0) return
    if (weightKg === undefined || weightKg === null) return setWeightError(strings.invalidWeight)
    setWeightError(null)
    try {
      await setWeightForToday(db, { exerciseId: exercise.id, dayTemplateId, date, weightKg })
    } catch {
      setWeightError(strings.saveFailed)
    }
  }

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
      {machine && (
        <p className="machine-line">
          {machine.brand} · {machine.model}
        </p>
      )}
      <div className="settings-row">
        <p className={`settings-line${exercise.settings ? '' : ' muted'}`}>{exercise.settings || strings.noSettings}</p>
        <button type="button" className="btn btn-small" onClick={() => setEditorOpen(true)}>
          {strings.editSettings}
        </button>
      </div>
      <LastTime exercise={exercise} today={date} />
      {exercise.cues.length > 0 && (
        <ul className="cues">
          {exercise.cues.map((cue) => (
            <li key={cue}>{cue}</li>
          ))}
        </ul>
      )}

      {!bodyweight && (
        <div className="weight-row">
          <label htmlFor={`w-${exercise.id}`}>
            {strings.weight} ({strings.kg})
            <span className="weight-hint">{strings.sameWeightAllSets}</span>
          </label>
          <input
            id={`w-${exercise.id}`}
            className="weight-input"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            value={weight}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              setWeight(e.target.value)
              setWeightTouched(true)
              setWeightError(null)
            }}
            onBlur={() => void commitWeight()}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </div>
      )}
      {weightError && <p className="set-error weight-error">{weightError}</p>}

      {setNumbers.map((n) => {
        const lastSet = last?.sets.find((s) => s.setNumber === n)
        return (
          <SetRow
            key={`${exercise.id}-${n}`}
            setNumber={n}
            exercise={exercise}
            dayTemplateId={dayTemplateId}
            date={date}
            saved={sets.find((s) => s.setNumber === n)}
            isCurrent={n === currentSet}
            weightKg={weightKg}
            startReps={ready ? defaultReps(n, last ?? undefined) : undefined}
            lastReps={lastSet?.reps}
          />
        )
      })}
      {currentSet === undefined && (
        <button type="button" className="btn btn-primary btn-next" onClick={onNext}>
          {next ? strings.nextExercise(next.name) : strings.allDoneBack}
        </button>
      )}
      <section className="muscle-panel" aria-label={strings.muscleMap.editMuscles}>
        <LazyBodyMap
          selection={{ primary: exercise.primaryMuscles, secondary: exercise.secondaryMuscles }}
          model={bodyModel}
        />
        <div className="muscle-panel-footer">
          <span className="muscle-legend">
            <span className="legend-dot is-primary" aria-hidden="true" />
            {strings.muscleMap.primary}
            <span className="legend-dot is-secondary" aria-hidden="true" />
            {strings.muscleMap.secondary}
          </span>
          <button type="button" className="btn btn-small" onClick={() => setMusclesOpen(true)}>
            {strings.muscleMap.editMuscles}
          </button>
        </div>
      </section>

      {editorOpen && <ExerciseEditor exercise={exercise} onClose={closeEditor} />}
      {musclesOpen && <MuscleSheet exercise={exercise} onClose={closeMuscles} />}
    </section>
  )
}

interface SetRowProps {
  setNumber: number
  exercise: Exercise
  dayTemplateId: string
  date: string
  saved?: SetLog
  /** The first set not logged yet: shows the rep counter. */
  isCurrent: boolean
  /** The exercise's one weight for today (null = bodyweight, undefined = not valid yet). */
  weightKg: number | null | undefined
  /** Where the rep counter starts (see lib/prefill.ts). */
  startReps?: number
  /** This set's reps last time, shown as a hint. */
  lastReps?: number
}

function SetRow({ setNumber, exercise, dayTemplateId, date, saved, isCurrent, weightKg, startReps, lastReps }: SetRowProps) {
  const [editing, setEditing] = useState(false)
  const [reps, setReps] = useState('')
  const [repsTouched, setRepsTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // An open set starts at last time's reps, unless you've already changed it.
  useEffect(() => {
    if (!saved && !repsTouched && startReps !== undefined) setReps(String(startReps))
  }, [saved, repsTouched, startReps])

  // When a set is deleted, start fresh.
  useEffect(() => {
    if (!saved) {
      setRepsTouched(false)
      setEditing(false)
    }
  }, [saved])

  function startEditing(log: SetLog) {
    setReps(String(log.reps))
    setError(null)
    setEditing(true)
  }

  async function save() {
    const repCount = parseReps(reps)
    if (repCount === undefined) return setError(strings.invalidReps)
    try {
      if (saved) {
        // Editing a logged set changes only its reps; the weight lives in the field above.
        await updateSet(db, saved.id, { reps: repCount })
        setError(null)
        setEditing(false)
        return
      }
      if (weightKg === undefined) return setError(strings.invalidWeight)
      setError(null)
      await logSet(db, { exerciseId: exercise.id, dayTemplateId, date, setNumber, weightKg, reps: repCount })
      // Keep every set of today on the same weight.
      // Rest starts when the set is saved (not when filling in a past workout).
      if (date === toISODate()) startRest()
      if (weightKg !== null) await setWeightForToday(db, { exerciseId: exercise.id, dayTemplateId, date, weightKg })
    } catch {
      setError(strings.saveFailed)
    }
  }

  // Logged: one folded line.
  if (saved && !editing) {
    return (
      <div className="set-row is-logged">
        <span className="set-check" aria-hidden="true">
          ✓
        </span>
        <span className="set-summary">
          <span className="set-number">{strings.setLabel(setNumber)}</span>
          <span className="set-result">
            {saved.weightKg !== null && `${formatNumber(saved.weightKg)} ${strings.kg} × `}
            {saved.reps}
            {saved.weightKg === null && ` ${strings.repsUnit}`}
          </span>
        </span>
        <button type="button" className="btn btn-small" onClick={() => startEditing(saved)}>
          {strings.edit}
        </button>
      </div>
    )
  }

  // Not your turn yet: one quiet line.
  if (!isCurrent && !editing) {
    return (
      <div className="set-row is-upcoming">
        <span className="set-number">{strings.setLabel(setNumber)}</span>
        {lastReps !== undefined && <span className="set-last">{strings.lastTimeReps(lastReps)}</span>}
      </div>
    )
  }

  return (
    <div className="set-row is-current is-counting">
      <div className="set-head">
        <span className="set-number">{strings.setLabel(setNumber)}</span>
        {lastReps !== undefined && <span className="set-last">{strings.lastTimeReps(lastReps)}</span>}
      </div>
      <RepCounter
        id={`r-${exercise.id}-${setNumber}`}
        value={reps}
        onChange={(v) => {
          setReps(v)
          setRepsTouched(true)
          setError(null)
        }}
        onEnter={() => void save()}
      />
      <button type="button" className="btn btn-primary btn-save-set" onClick={() => void save()}>
        {editing ? strings.save : strings.saveSet}
      </button>
      {editing && saved && (
        <div className="set-edit-actions">
          <button type="button" className="btn btn-small" onClick={() => setEditing(false)}>
            {strings.cancel}
          </button>
          <button type="button" className="btn btn-small" onClick={() => void deleteSet(db, saved.id)}>
            {strings.delete}
          </button>
        </div>
      )}
      {error && <p className="set-error">{error}</p>}
    </div>
  )
}
