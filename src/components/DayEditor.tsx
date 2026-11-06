import { useCallback, useState } from 'react'
import { db } from '../db/db'
import { EDITOR_LIMITS, updateDayTemplate } from '../db/repo'
import type { DayTemplate, Exercise, Machine } from '../db/types'
import { strings } from '../strings'
import { ExercisePicker } from './ExercisePicker'

interface Props {
  template: DayTemplate
  exercises: Map<string, Exercise>
  machines: Map<string, Machine>
  onClose: () => void
}

const t = strings.dayEditor

/** Rename a day and choose its exercises (in order). Nothing is saved until Save. */
export function DayEditor({ template, exercises, machines, onClose }: Props) {
  const [name, setName] = useState(template.name)
  const [ids, setIds] = useState(template.exerciseIds)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const closePicker = useCallback(() => setPickerOpen(false), [])

  const changed = name !== template.name || ids.join() !== template.exerciseIds.join()
  const full = ids.length >= EDITOR_LIMITS.exercisesPerDay

  function move(index: number, by: -1 | 1) {
    const next = [...ids]
    ;[next[index], next[index + by]] = [next[index + by], next[index]]
    setIds(next)
  }

  function cancel() {
    if (!changed || window.confirm(t.discardChanges)) onClose()
  }

  async function save() {
    if (!name.trim()) return setError(t.invalidName)
    setSaving(true)
    try {
      await updateDayTemplate(db, template.id, { name, exerciseIds: ids })
      onClose()
    } catch {
      setError(strings.saveFailed)
      setSaving(false)
    }
  }

  return (
    <section className="day-editor">
      <button type="button" className="back-button" onClick={cancel}>
        {strings.back}
      </button>
      <h1 className="page-title day-editor-title">{t.title(strings.weekdaysLong[template.weekday - 1])}</h1>

      <div className="form-field">
        <label htmlFor="day-name">{t.dayName}</label>
        <input
          id="day-name"
          value={name}
          maxLength={EDITOR_LIMITS.dayNameLength}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <h2 className="section-label">{t.exercises}</h2>
      {ids.length === 0 && <p className="muted">{t.empty}</p>}
      <ol className="edit-list">
        {ids.map((id, i) => {
          const exercise = exercises.get(id)
          if (!exercise) return null
          const machine = exercise.machineId ? machines.get(exercise.machineId) : undefined
          const gymNumber = machine?.gymNumber ?? strings.noMachine
          const label = exercise.variant ? `${exercise.name} · ${exercise.variant}` : exercise.name
          return (
            <li key={id} className="edit-row">
              <span className={`gym-number${gymNumber.length > 3 ? ' small' : ''}`}>{gymNumber}</span>
              <span className="edit-name">{label}</span>
              <span className="edit-buttons">
                <button type="button" className="icon-btn" aria-label={t.moveUp(label)} disabled={i === 0} onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button type="button" className="icon-btn" aria-label={t.moveDown(label)} disabled={i === ids.length - 1} onClick={() => move(i, 1)}>
                  ↓
                </button>
                <button type="button" className="icon-btn" aria-label={t.remove(label)} onClick={() => setIds(ids.filter((x) => x !== id))}>
                  ×
                </button>
              </span>
            </li>
          )
        })}
      </ol>
      <p className="form-hint">{t.removeNote}</p>

      <button type="button" className="btn sheet-wide-button add-exercise" onClick={() => setPickerOpen(true)} disabled={full}>
        {t.addExercise}
      </button>

      {error && <p className="form-error">{error}</p>}

      <div className="sheet-actions day-editor-actions">
        <button type="button" className="btn" onClick={cancel}>
          {strings.cancel}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving || !changed}>
          {strings.save}
        </button>
      </div>

      {pickerOpen && (
        <ExercisePicker
          exercises={[...exercises.values()]}
          machines={machines}
          onDay={ids}
          onPick={(id) => {
            setIds((current) => (current.includes(id) ? current : [...current, id]))
            setPickerOpen(false)
          }}
          onClose={closePicker}
        />
      )}
    </section>
  )
}
