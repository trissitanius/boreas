import { useState } from 'react'
import type { Muscle } from '../db/muscles'
import { musclesForRegion, OFF_MAP, paint, roleOf, type Brush, type MuscleSelection, type View } from '../lib/muscleMap'
import { useBodyModel } from '../lib/useBodyModel'
import { strings } from '../strings'
import { LazyBodyMap } from './LazyBodyMap'

interface Props {
  value: MuscleSelection
  onChange: (value: MuscleSelection) => void
}

const t = strings.muscleMap
const name = (m: Muscle) => strings.muscles[m]

/**
 * Paint an exercise's muscles on the body: pick a brush (primary = Ember, secondary = Frozen, erase),
 * then tap regions. Regions that stand for several muscles (e.g. shoulders) ask which part you mean.
 */
export function MuscleEditor({ value, onChange }: Props) {
  const [brush, setBrush] = useState<Brush>('primary')
  const [chooser, setChooser] = useState<Muscle[] | null>(null)
  const [model, setModel] = useBodyModel()

  function tapRegion(view: View, region: string) {
    const muscles = musclesForRegion(view, region)
    if (muscles.length === 0) return // head, hands, …: not a muscle
    if (muscles.length === 1) {
      onChange(paint(value, muscles, brush))
      setChooser(null)
    } else {
      setChooser(muscles)
    }
  }

  const chip = (m: Muscle) => {
    const role = roleOf(m, value)
    return (
      <button
        key={m}
        type="button"
        className={`chip muscle-chip${role ? ` is-${role}` : ''}`}
        aria-pressed={role !== undefined}
        onClick={() => onChange(paint(value, [m], brush))}
      >
        {name(m)}
      </button>
    )
  }

  return (
    <div className="muscle-editor">
      <div className="brushes" role="radiogroup" aria-label={t.hint}>
        {(['primary', 'secondary', 'erase'] as const).map((b) => (
          <button
            key={b}
            type="button"
            role="radio"
            aria-checked={brush === b}
            className={`brush brush-${b}`}
            onClick={() => setBrush(b)}
          >
            <span className="brush-swatch" aria-hidden="true" />
            {t[b]}
          </button>
        ))}
      </div>
      <p className="form-hint">{t.hint}</p>

      <LazyBodyMap selection={value} model={model} onRegionTap={tapRegion} />

      {chooser && (
        <div className="part-chooser">
          <span className="form-label">{t.whichPart}</span>
          <div className="chips">
            {chooser.map(chip)}
            <button type="button" className="chip" onClick={() => setChooser(null)}>
              {t.done}
            </button>
          </div>
        </div>
      )}

      <div className="off-map">
        <span className="form-label">{t.offMap}</span>
        <div className="chips">{OFF_MAP.map(chip)}</div>
      </div>

      <dl className="muscle-summary">
        <dt className="is-primary">{t.primary}</dt>
        <dd>{value.primary.length ? value.primary.map(name).join(', ') : t.none}</dd>
        <dt className="is-secondary">{t.secondary}</dt>
        <dd>{value.secondary.length ? value.secondary.map(name).join(', ') : t.none}</dd>
      </dl>

      <div className="body-model-switch" role="radiogroup" aria-label={t.bodyModel}>
        <span className="form-label">{t.bodyModel}</span>
        {(['male', 'female'] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={model === m} className="chip" onClick={() => setModel(m)}>
            {t[m]}
          </button>
        ))}
      </div>
    </div>
  )
}
