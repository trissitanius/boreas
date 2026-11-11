import type { Exercise, Machine } from '../db/types'
import { strings } from '../strings'
import { LastTime } from './LastTime'

interface Props {
  /** undefined when every exercise of the day is done. */
  exercise?: Exercise
  machine?: Machine
  today: string
  onOpen: (exerciseId: string) => void
}

/** The next unfinished exercise, with what you did last time. */
export function NextUpCard({ exercise, machine, today, onOpen }: Props) {
  if (!exercise) {
    return (
      <section className="next-up next-up-done">
        <p className="section-label next-up-label">{strings.allDone}</p>
        <p className="muted">{strings.allDoneHint}</p>
      </section>
    )
  }

  const gymNumber = machine?.gymNumber ?? strings.noMachine
  return (
    <button type="button" className="next-up" onClick={() => onOpen(exercise.id)}>
      <span className="section-label next-up-label">{strings.nextUp}</span>
      <span className="next-up-head">
        <span className={`gym-number next-up-number${gymNumber.length > 3 ? ' small' : ''}`}>{gymNumber}</span>
        <span className="exercise-text">
          <span className="exercise-name">
            {exercise.name}
            {exercise.variant && <span className="exercise-variant"> · {exercise.variant}</span>}
          </span>
          {exercise.settings && <span className="exercise-meta next-up-settings">{exercise.settings}</span>}
        </span>
      </span>
      <LastTime exercise={exercise} today={today} />
      <span className="next-up-start">{strings.nextUpStart}</span>
    </button>
  )
}
