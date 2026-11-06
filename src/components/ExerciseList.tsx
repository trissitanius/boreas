import type { DayTemplate, Exercise, Machine, SetLog } from '../db/types'
import { SETS_PER_EXERCISE } from '../db/repo'
import { strings } from '../strings'

interface Props {
  template: DayTemplate
  exercises: Map<string, Exercise>
  machines: Map<string, Machine>
  todaysSets: SetLog[]
  onOpen: (exerciseId: string) => void
}

export function ExerciseList({ template, exercises, machines, todaysSets, onOpen }: Props) {
  if (template.exerciseIds.length === 0) {
    return (
      <section>
        <h2 className="day-name">{strings.restDay}</h2>
        <p className="muted">{strings.restDayHint}</p>
      </section>
    )
  }

  return (
    <section>
      <h2 className="day-name">{template.name}</h2>
      <ul className="exercise-list">
        {template.exerciseIds.map((id) => {
          const exercise = exercises.get(id)
          if (!exercise) return null
          const machine = exercise.machineId ? machines.get(exercise.machineId) : undefined
          const gymNumber = machine?.gymNumber ?? strings.noMachine
          const logged = todaysSets.filter((s) => s.exerciseId === id).length
          return (
            <li key={id}>
              <button type="button" className="exercise-card" onClick={() => onOpen(id)}>
                <span className={`gym-number${gymNumber.length > 3 ? ' small' : ''}`}>{gymNumber}</span>
                <span>
                  <span className="exercise-name">
                    {exercise.name}
                    {exercise.variant && <span className="muted"> · {exercise.variant}</span>}
                  </span>
                  <br />
                  <span className="exercise-meta">
                    {logged > 0 ? strings.setsLoggedToday(logged, SETS_PER_EXERCISE) : exercise.settings}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
