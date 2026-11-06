import type { WeightUnit } from '../db/types'
import { strings } from '../strings'

interface SetLike {
  weightKg: number | null
  reps: number
}

/** 22.5 → "22.5", 30 → "30" (no trailing ".0"). */
export function formatNumber(n: number): string {
  return String(Math.round(n * 100) / 100)
}

/**
 * One line for a session's sets:
 * - same weight on every set: "30 kg · 13 / 12 / 10"
 * - different weights:        "30 × 13 · 32.5 × 12 · 32.5 × 10"
 * - bodyweight:               "13 / 12 / 10 reps"
 */
export function formatSets(sets: SetLike[], unit: WeightUnit = 'kg'): string {
  if (sets.length === 0) return ''
  const reps = sets.map((s) => s.reps).join(' / ')
  const weights = sets.map((s) => s.weightKg)
  if (weights.every((w) => w === null)) return `${reps} ${strings.repsUnit}`
  if (weights.every((w) => w === weights[0])) return `${formatNumber(weights[0]!)} ${unit} · ${reps}`
  return sets.map((s) => (s.weightKg === null ? `${s.reps}` : `${formatNumber(s.weightKg)} × ${s.reps}`)).join(' · ')
}

/** "2026-11-04" → "Wed 4 Nov" */
export function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(strings.locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
