import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '../db/db'
import { deleteSet, logSet, SETS_PER_EXERCISE } from '../db/repo'
import type { Exercise, Machine, SetLog } from '../db/types'
import { formatNumber } from '../lib/format'
import { parseReps, parseWeight } from '../lib/parse'
import { defaultWeight } from '../lib/prefill'
import { progression } from '../lib/progression'
import { useLastResult } from '../lib/useLastResult'
import { strings } from '../strings'
import { LastTime } from './LastTime'
import { ExerciseEditor } from './ExerciseEditor'
import { LazyBodyMap } from './LazyBodyMap'
import { MuscleSheet } from './MuscleSheet'
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
  const setNumbers = Array.from({ length: SETS_PER_EXERCISE }, (_, i) => i + 1)
  const currentSet = setNumbers.find((n) => !sets.some((s) => s.setNumber === n))
  const [editorOpen, setEditorOpen] = useState(false)
  const closeEditor = useCallback(() => setEditorOpen(false), [])
  const [musclesOpen, setMusclesOpen] = useState(false)
  const closeMuscles = useCallback(() => setMusclesOpen(false), [])
  const [bodyModel] = useBodyModel()

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
      {setNumbers.map((n) => (
        <SetRow
          key={`${exercise.id}-${n}`}
          setNumber={n}
          exercise={exercise}
          dayTemplateId={dayTemplateId}
          date={date}
          saved={sets.find((s) => s.setNumber === n)}
          isCurrent={n === currentSet}
          defaultKg={
            ready ? defaultWeight({ setNumber: n, todaysSets: sets, last: last ?? undefined, flag, exercise }) : undefined
          }
        />
      ))}
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
  /** The first set not logged yet: highlighted. */
  isCurrent: boolean
  /** Pre-filled weight for an unlogged set (see lib/prefill.ts). */
  defaultKg?: number
}

function SetRow({ setNumber, exercise, dayTemplateId, date, saved, isCurrent, defaultKg }: SetRowProps) {
  const bodyweight = exercise.loadType === 'bodyweight'
  const [editing, setEditing] = useState(false)
  const [weight, setWeight] = useState('')
  const [weightTouched, setWeightTouched] = useState(false)
  const [reps, setReps] = useState('')
  const [error, setError] = useState<string | null>(null)
  const repsRef = useRef<HTMLInputElement>(null)

  // An open set shows the pre-filled weight, unless you've already typed one.
  useEffect(() => {
    if (!saved && !weightTouched) setWeight(defaultKg !== undefined ? formatNumber(defaultKg) : '')
  }, [saved, weightTouched, defaultKg])

  // When a set is deleted, start fresh.
  useEffect(() => {
    if (!saved) {
      setReps('')
      setWeightTouched(false)
      setEditing(false)
    }
  }, [saved])

  function startEditing(log: SetLog) {
    setWeight(log.weightKg !== null ? formatNumber(log.weightKg) : '')
    setReps(String(log.reps))
    setError(null)
    setEditing(true)
  }

  async function save() {
    const weightKg = bodyweight ? null : parseWeight(weight)
    if (weightKg === undefined) return setError(strings.invalidWeight)
    const repCount = parseReps(reps)
    if (repCount === undefined) return setError(strings.invalidReps)
    setError(null)
    try {
      await logSet(db, { exerciseId: exercise.id, dayTemplateId, date, setNumber, weightKg, reps: repCount })
      setEditing(false)
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

  const id = `${exercise.id}-${setNumber}`
  return (
    <div className={`set-row${bodyweight ? ' no-weight' : ''}${isCurrent || editing ? ' is-current' : ''}`}>
      <span className="set-number">{strings.setLabel(setNumber)}</span>
      {bodyweight ? null : (
        <div className="field">
          <label htmlFor={`w-${id}`}>
            {strings.weight} ({strings.kg})
          </label>
          <input
            id={`w-${id}`}
            inputMode="decimal"
            enterKeyHint="next"
            autoComplete="off"
            value={weight}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              setWeight(e.target.value)
              setWeightTouched(true)
            }}
            onKeyDown={(e) => e.key === 'Enter' && repsRef.current?.focus()}
          />
        </div>
      )}
      <div className="field">
        <label htmlFor={`r-${id}`}>{bodyweight ? `${strings.reps} · ${strings.bodyweight}` : strings.reps}</label>
        <input
          ref={repsRef}
          id={`r-${id}`}
          className="reps-input"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          autoComplete="off"
          value={reps}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setReps(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void save()}
        />
      </div>
      <div className="set-actions">
        <button
          type="button"
          className={`btn${isCurrent || editing ? ' btn-primary' : ''}`}
          onClick={() => void save()}
        >
          {strings.save}
        </button>
      </div>
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
