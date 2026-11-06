import type { DayTemplate, Exercise, Machine, SetLog } from '../db/types'
import { SETS_PER_EXERCISE } from '../db/repo'
import { exerciseStatus, isRestDay } from '../lib/schedule'
import { strings } from '../strings'

interface Props {
  template: DayTemplate
  exercises: Map<string, Exercise>
  machines: Map<string, Machine>
  /** Sets logged today for this day. */
  sets: SetLog[]
  /** Exercises due for "Increase weight" (shown as a small ↑). */
  flagged?: Set<string>
  /** Shown on rest days, e.g. "Next: Friday · Arms (tomorrow)". */
  nextWorkoutText?: string
  onOpen: (exerciseId: string) => void
}

export function ExerciseList({ template, exercises, machines, sets, flagged, nextWorkoutText, onOpen }: Props) {
  if (isRestDay(template)) {
    return (
      <section className="rest-day">
        <p className="muted">{strings.restDayHint}</p>
        {nextWorkoutText && <p className="next-workout">{nextWorkoutText}</p>}
      </section>
    )
  }

  return (
    <ul className="exercise-list">
      {template.exerciseIds.map((id) => {
        const exercise = exercises.get(id)
        if (!exercise) return null
        const machine = exercise.machineId ? machines.get(exercise.machineId) : undefined
        const gymNumber = machine?.gymNumber ?? strings.noMachine
        const logged = exerciseStatus(sets, id)
        const done = logged >= SETS_PER_EXERCISE
        const due = flagged?.has(id) ?? false
        return (
          <li key={id}>
            <button
              type="button"
              className={`exercise-card${done ? ' is-done' : ''}`}
              onClick={() => onOpen(id)}
            >
              <span className={`gym-number${gymNumber.length > 3 ? ' small' : ''}`}>{gymNumber}</span>
              <span>
                <span className="exercise-name">
                  {exercise.name}
                  {exercise.variant && <span className="muted"> · {exercise.variant}</span>}
                </span>
                <br />
                <span className="exercise-meta">{exercise.settings}</span>
              </span>
              {(logged > 0 || due) && (
                <span className="exercise-status">
                  {due && (
                    <span className="progression-mark" role="img" aria-label={strings.dueForIncrease} title={strings.dueForIncrease}>
                      ↑
                    </span>
                  )}
                  {logged > 0 && (done ? strings.exerciseDone : strings.setCount(logged, SETS_PER_EXERCISE))}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
