import { useState } from 'react'
import { db } from '../db/db'
import { updateExercise } from '../db/repo'
import type { Exercise } from '../db/types'
import type { MuscleSelection } from '../lib/muscleMap'
import { strings } from '../strings'
import { MuscleEditor } from './MuscleEditor'
import { Sheet } from './Sheet'

interface Props {
  exercise: Exercise
  onClose: () => void
}

/** "Edit muscles" from the logging screen. Saved on the phone; history is untouched. */
export function MuscleSheet({ exercise, onClose }: Props) {
  const [value, setValue] = useState<MuscleSelection>({
    primary: exercise.primaryMuscles,
    secondary: exercise.secondaryMuscles,
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (value.primary.length === 0) return setError(strings.muscleMap.needPrimary)
    setSaving(true)
    try {
      await updateExercise(db, exercise.id, { primaryMuscles: value.primary, secondaryMuscles: value.secondary })
      onClose()
    } catch {
      setError(strings.saveFailed)
      setSaving(false)
    }
  }

  return (
    <Sheet title={strings.muscleMap.title(exercise.name)} onClose={onClose}>
      <MuscleEditor
        value={value}
        onChange={(next) => {
          setValue(next)
          setError(null)
        }}
      />
      {error && <p className="form-error">{error}</p>}
      <div className="sheet-actions">
        <button type="button" className="btn" onClick={onClose}>
          {strings.cancel}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving}>
          {strings.save}
        </button>
      </div>
    </Sheet>
  )
}
