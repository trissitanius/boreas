// The progression rule (from the training brief — do not change without asking):
// - Every exercise: 3 working sets, each to failure.
// - If set 3 reached 10 reps or more, the next time the exercise comes up (on ANY day),
//   show "Increase weight" with a suggested weight: set 3's weight + the exercise's increment.
// - Never suggest lowering the weight. There is deliberately no "decrease" result.
import type { Exercise } from '../db/types'

/** Reps on the deciding set that mean "time to go heavier". */
export const TARGET_REPS = 10
/** Only this set decides. */
export const DECIDING_SET = 3
export const DEFAULT_INCREMENT_KG = 2.5

export type Progression =
  | { kind: 'increase'; fromKg: number; suggestedKg: number }
  /** Bodyweight: there is no weight to add. */
  | { kind: 'harder' }

interface LastSets {
  sets: { setNumber: number; weightKg: number | null; reps: number }[]
}

/** Rounds to 0.01, so 22.5 + 2.5 is exactly 25 (not 24.999…). */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Decides the badge for an exercise from its last session (the most recent one before today, any day).
 * Returns undefined when there is nothing to show.
 */
export function progression(
  last: LastSets | undefined,
  exercise: Pick<Exercise, 'loadType' | 'weightIncrementKg'>,
): Progression | undefined {
  const decidingSet = last?.sets.find((s) => s.setNumber === DECIDING_SET)
  if (!decidingSet || !(decidingSet.reps >= TARGET_REPS)) return undefined

  if (exercise.loadType === 'bodyweight' || decidingSet.weightKg === null) return { kind: 'harder' }

  const increment =
    Number.isFinite(exercise.weightIncrementKg) && exercise.weightIncrementKg > 0
      ? exercise.weightIncrementKg
      : DEFAULT_INCREMENT_KG
  const fromKg = decidingSet.weightKg
  const heaviestKg = Math.max(...last!.sets.map((s) => s.weightKg ?? 0))
  const suggestedKg = round2(Math.max(fromKg + increment, heaviestKg))
  return { kind: 'increase', fromKg, suggestedKg }
}
