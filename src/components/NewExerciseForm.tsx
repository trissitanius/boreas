import { useState } from 'react'
import { db } from '../db/db'
import { createExercise, createMachine, EDITOR_LIMITS, LIMITS } from '../db/repo'
import type { Muscle } from '../db/muscles'
import type { LoadType, Machine } from '../db/types'
import { brandForGymNumber } from '../lib/machines'
import { parseWeight } from '../lib/parse'
import { strings } from '../strings'
import { MuscleEditor } from './MuscleEditor'

interface Props {
  machines: Machine[]
  onCreated: (exerciseId: string) => void
  onBack: () => void
}

const t = strings.newExercise
const NEW_MACHINE = '__new'
const LOAD_TYPES: LoadType[] = ['stack', 'dumbbell', 'plate', 'bodyweight']

/** Form for a new exercise, with an optional new machine. Both are saved together. */
export function NewExerciseForm({ machines, onCreated, onBack }: Props) {
  const [name, setName] = useState('')
  const [variant, setVariant] = useState('')
  const [machineChoice, setMachineChoice] = useState('')
  const [gymNumber, setGymNumber] = useState('')
  const [brand, setBrand] = useState('')
  const [brandTouched, setBrandTouched] = useState(false)
  const [model, setModel] = useState('')
  const [loadType, setLoadType] = useState<LoadType>('stack')
  const [primary, setPrimary] = useState<Muscle[]>([])
  const [secondary, setSecondary] = useState<Muscle[]>([])
  const [settings, setSettings] = useState('')
  const [step, setStep] = useState(String(LIMITS.defaultIncrementKg))
  const [cues, setCues] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const newMachine = machineChoice === NEW_MACHINE
  const weighted = loadType !== 'bodyweight'
  const sortedMachines = [...machines].sort((a, b) =>
    a.gymNumber.localeCompare(b.gymNumber, undefined, { numeric: true }),
  )

  async function save() {
    if (!name.trim()) return setError(t.needName)
    if (primary.length === 0) return setError(t.needPrimary)
    if (newMachine && !gymNumber.trim()) return setError(t.needGymNumber)
    if (newMachine && !brand.trim()) return setError(t.needBrand)
    if (newMachine && machines.some((m) => m.gymNumber.toLowerCase() === gymNumber.trim().toLowerCase())) {
      return setError(t.duplicateMachine(gymNumber.trim()))
    }
    const stepKg = weighted ? parseWeight(step) : LIMITS.defaultIncrementKg
    if (stepKg === undefined || stepKg < LIMITS.minIncrementKg || stepKg > LIMITS.maxIncrementKg) {
      return setError(strings.editor.invalidStep)
    }

    setSaving(true)
    setError(null)
    try {
      // One transaction: if the exercise can't be saved, the new machine isn't saved either.
      const id = await db.transaction('rw', db.machines, db.exercises, async () => {
        const machineId = newMachine ? await createMachine(db, { gymNumber, brand, model }) : machineChoice || undefined
        return createExercise(db, {
          name,
          machineId,
          variant,
          settings,
          loadType,
          primaryMuscles: primary,
          secondaryMuscles: secondary,
          weightIncrementKg: stepKg,
          cues: cues.split(','),
        })
      })
      onCreated(id)
    } catch {
      setError(strings.saveFailed)
      setSaving(false)
    }
  }

  return (
    <div className="new-exercise">
      <button type="button" className="back-button" onClick={onBack}>
        {t.back}
      </button>

      <div className="form-field">
        <label htmlFor="ne-name">{t.name}</label>
        <input id="ne-name" value={name} maxLength={EDITOR_LIMITS.exerciseNameLength} placeholder={t.namePlaceholder} autoComplete="off" onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="form-field">
        <label htmlFor="ne-variant">{t.variant}</label>
        <input id="ne-variant" value={variant} maxLength={EDITOR_LIMITS.variantLength} placeholder={t.variantPlaceholder} autoComplete="off" onChange={(e) => setVariant(e.target.value)} />
      </div>

      <div className="form-field">
        <label htmlFor="ne-machine">{t.machine}</label>
        <select id="ne-machine" className="form-select" value={machineChoice} onChange={(e) => setMachineChoice(e.target.value)}>
          <option value="">{t.noMachine}</option>
          {sortedMachines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.gymNumber} · {m.brand} {m.model}
            </option>
          ))}
          <option value={NEW_MACHINE}>{t.newMachine}</option>
        </select>
      </div>

      {newMachine && (
        <div className="new-machine">
          <div className="form-field">
            <label htmlFor="nm-number">{t.gymNumber}</label>
            <input
              id="nm-number"
              className="form-number"
              value={gymNumber}
              maxLength={EDITOR_LIMITS.gymNumberLength}
              placeholder={t.gymNumberPlaceholder}
              autoComplete="off"
              onChange={(e) => {
                setGymNumber(e.target.value)
                if (!brandTouched) setBrand(brandForGymNumber(e.target.value))
              }}
            />
          </div>
          <div className="form-field">
            <label htmlFor="nm-brand">{t.brand}</label>
            <input
              id="nm-brand"
              value={brand}
              maxLength={EDITOR_LIMITS.brandLength}
              autoComplete="off"
              onChange={(e) => {
                setBrand(e.target.value)
                setBrandTouched(true)
              }}
            />
          </div>
          <div className="form-field">
            <label htmlFor="nm-model">{t.model}</label>
            <input id="nm-model" value={model} maxLength={EDITOR_LIMITS.modelLength} placeholder={t.modelPlaceholder} autoComplete="off" onChange={(e) => setModel(e.target.value)} />
          </div>
        </div>
      )}

      <fieldset className="form-field chips-field">
        <legend className="form-label">{t.loadType}</legend>
        <div className="chips">
          {LOAD_TYPES.map((type) => (
            <button key={type} type="button" className="chip" aria-pressed={loadType === type} onClick={() => setLoadType(type)}>
              {strings.loadTypes[type]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="form-field chips-field">
        <legend className="form-label">{t.muscles}</legend>
        <MuscleEditor
          value={{ primary, secondary }}
          onChange={(next) => {
            setPrimary(next.primary)
            setSecondary(next.secondary)
          }}
        />
      </fieldset>

      <div className="form-field">
        <label htmlFor="ne-settings">{strings.editor.settings}</label>
        <input id="ne-settings" value={settings} maxLength={LIMITS.settingsLength} placeholder={strings.editor.settingsPlaceholder} autoComplete="off" onChange={(e) => setSettings(e.target.value)} />
      </div>

      {weighted && (
        <div className="form-field">
          <label htmlFor="ne-step">{strings.editor.step}</label>
          <input id="ne-step" className="form-number" inputMode="decimal" value={step} autoComplete="off" onFocus={(e) => e.currentTarget.select()} onChange={(e) => setStep(e.target.value)} />
        </div>
      )}

      <div className="form-field">
        <label htmlFor="ne-cues">{t.cues}</label>
        <input id="ne-cues" value={cues} autoComplete="off" onChange={(e) => setCues(e.target.value)} />
      </div>

      {error && <p className="form-error">{error}</p>}

      <button type="button" className="btn btn-primary sheet-wide-button" onClick={() => void save()} disabled={saving}>
        {t.create}
      </button>
    </div>
  )
}
