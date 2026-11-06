import type { Progression } from '../lib/progression'
import { formatNumber } from '../lib/format'
import { strings } from '../strings'

/** Ember badge: "↑ Increase weight · Try 32.5 kg", or "↑ Make it harder" for bodyweight. */
export function ProgressionBadge({ progression }: { progression: Progression }) {
  const increase = progression.kind === 'increase'
  return (
    <span className="progression">
      <span className="progression-badge">↑ {increase ? strings.increaseWeight : strings.makeItHarder}</span>
      <span className={`progression-hint${increase ? '' : ' is-note'}`}>
        {increase ? strings.trySuggested(formatNumber(progression.suggestedKg), strings.kg) : strings.makeItHarderHint}
      </span>
    </span>
  )
}
