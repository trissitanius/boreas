import { useState } from 'react'
import { db } from '../db/db'
import { cleanCues, LIMITS, updateExercise } from '../db/repo'
import type { Exercise } from '../db/types'
import { formatNumber } from '../lib/format'
import { parseWeight } from '../lib/parse'
import { strings } from '../strings'
import { Sheet } from './Sheet'

interface Props {
  exercise: Exercise
  onClose: () => void
}

const t = strings.editor

/** Edit an exercise's settings, cues and weight step. Saved on the phone; history is untouched. */
export function ExerciseEditor({ exercise, onClose }: Props) {
  const weighted = exercise.loadType !== 'bodyweight'
  const [settings, setSettings] = useState(exercise.settings)
  const [step, setStep] = useState(formatNumber(exercise.weightIncrementKg))
  const [cues, setCues] = useState(exercise.cues)
  const [newCue, setNewCue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function addCue() {
    const next = cleanCues([...cues, newCue])
    if (next.length === cues.length && newCue.trim()) {
      setError(cues.length >= LIMITS.cueCount ? t.tooManyCues : t.duplicateCue)
      return
    }
    setCues(next)
    setNewCue('')
    setError(null)
  }

  async function save() {
    const stepKg = weighted ? parseWeight(step) : undefined
    if (weighted && (stepKg === undefined || stepKg < LIMITS.minIncrementKg || stepKg > LIMITS.maxIncrementKg)) {
      setError(t.invalidStep)
      return
    }
    setSaving(true)
    try {
      // A cue still typed in the field but not added yet is saved too.
      await updateExercise(db, exercise.id, {
        settings,
        cues: [...cues, newCue],
        ...(weighted ? { weightIncrementKg: stepKg } : {}),
      })
      onClose()
    } catch {
      setError(strings.saveFailed)
      setSaving(false)
    }
  }

  return (
    <Sheet title={t.title(exercise.name)} onClose={onClose}>
      <div className="form-field">
        <label htmlFor="edit-settings">{t.settings}</label>
        <textarea
          id="edit-settings"
          rows={3}
          value={settings}
          maxLength={LIMITS.settingsLength}
          placeholder={t.settingsPlaceholder}
          onChange={(e) => setSettings(e.target.value.replace(/\n/g, ' '))}
        />
      </div>

      {weighted && (
        <div className="form-field">
          <label htmlFor="edit-step">{t.step}</label>
          <input
            id="edit-step"
            className="form-number"
            inputMode="decimal"
            value={step}
            autoComplete="off"
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setStep(e.target.value)}
          />
          <p className="form-hint">{t.stepHint}</p>
        </div>
      )}

      <div className="form-field">
        <span className="form-label">{t.cues}</span>
        {cues.length > 0 && (
          <ul className="cue-edit-list">
            {cues.map((cue) => (
              <li key={cue}>
                <span>{cue}</span>
                <button
                  type="button"
                  className="cue-remove"
                  aria-label={t.removeCue(cue)}
                  onClick={() => setCues(cues.filter((c) => c !== cue))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="cue-add">
          <input
            aria-label={t.newCue}
            value={newCue}
            maxLength={LIMITS.cueLength}
            placeholder={t.newCue}
            autoComplete="off"
            enterKeyHint="done"
            onChange={(e) => setNewCue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCue()}
          />
          <button type="button" className="btn btn-small" onClick={addCue} disabled={!newCue.trim()}>
            {t.addCue}
          </button>
        </div>
      </div>

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
