import { MUSCLES, type Muscle } from '../db/muscles'
import { strings } from '../strings'

interface Props {
  label: string
  selected: Muscle[]
  onChange: (muscles: Muscle[]) => void
  /** Muscles that can't be picked here (e.g. already primary). */
  disabled?: Muscle[]
}

/** Tap chips to pick muscles. */
export function MuscleChips({ label, selected, onChange, disabled = [] }: Props) {
  function toggle(muscle: Muscle) {
    onChange(selected.includes(muscle) ? selected.filter((m) => m !== muscle) : [...selected, muscle])
  }
  return (
    <fieldset className="form-field chips-field">
      <legend className="form-label">{label}</legend>
      <div className="chips">
        {MUSCLES.map((muscle) => (
          <button
            key={muscle}
            type="button"
            className="chip"
            aria-pressed={selected.includes(muscle)}
            disabled={disabled.includes(muscle)}
            onClick={() => toggle(muscle)}
          >
            {strings.muscles[muscle]}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
