import { parseReps } from '../lib/parse'
import { strings } from '../strings'

interface Props {
  id: string
  /** The reps as text, so you can also tap the number and type. */
  value: string
  onChange: (value: string) => void
  /** Enter on the keyboard (after typing) saves the set. */
  onEnter?: () => void
}

const MAX_REPS = 999

/** Big − / number / + for reps. Starts at last time's reps, so usually it's one or two taps. */
export function RepCounter({ id, value, onChange, onEnter }: Props) {
  const reps = parseReps(value)
  const step = (by: number) => onChange(String(Math.min(MAX_REPS, Math.max(0, (reps ?? 0) + by))))

  return (
    <div className="rep-counter">
      <button
        type="button"
        className="rep-step"
        aria-label={strings.removeRep}
        disabled={reps === 0}
        onClick={() => step(-1)}
      >
        −
      </button>
      <label className="rep-value" htmlFor={id}>
        <input
          id={id}
          className="rep-input"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          autoComplete="off"
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
        />
        <span className="rep-unit">{strings.repsUnit}</span>
      </label>
      <button type="button" className="rep-step" aria-label={strings.addRep} onClick={() => step(1)}>
        +
      </button>
    </div>
  )
}
