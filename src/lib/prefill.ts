// Which weight to pre-fill for a set that isn't logged yet, so between sets you only type reps.
import type { Exercise } from '../db/types'
import { TARGET_REPS, type Progression } from './progression'

interface SetLike {
  setNumber: number
  weightKg: number | null
}

interface Input {
  setNumber: number
  /** This exercise's sets already logged today. */
  todaysSets: SetLike[]
  /** The last session before today (any day). */
  last?: { sets: SetLike[] }
  /** The "Increase weight" flag, if any. */
  flag?: Progression
  exercise: Pick<Exercise, 'loadType' | 'startingWeightKg'>
}

/**
 * In this order:
 * 1. the weight of your previous set today (set 2 copies set 1, …)
 * 2. the suggested weight when "Increase weight" shows
 * 3. last session's weight for the same set number, else its last set
 * 4. the exercise's starting weight
 * Returns undefined when there's nothing to suggest (bodyweight, or the very first time).
 */
export function defaultWeight({ setNumber, todaysSets, last, flag, exercise }: Input): number | undefined {
  if (exercise.loadType === 'bodyweight') return undefined

  const earlierToday = todaysSets
    .filter((s) => s.setNumber < setNumber && s.weightKg !== null)
    .sort((a, b) => b.setNumber - a.setNumber)[0]
  if (earlierToday) return earlierToday.weightKg!

  if (flag?.kind === 'increase') return flag.suggestedKg

  const lastSets = (last?.sets ?? []).filter((s) => s.weightKg !== null)
  const sameSet = lastSets.find((s) => s.setNumber === setNumber)
  if (sameSet) return sameSet.weightKg!
  const lastSet = [...lastSets].sort((a, b) => b.setNumber - a.setNumber)[0]
  if (lastSet) return lastSet.weightKg!

  return exercise.startingWeightKg
}

/**
 * The one weight for this exercise today (all 3 sets share it):
 * the weight you already logged today, else what set 1 would get (suggestion → last time → starting weight).
 */
export function weightForToday({ todaysSets, last, flag, exercise }: Omit<Input, 'setNumber'>): number | undefined {
  if (exercise.loadType === 'bodyweight') return undefined
  const logged = todaysSets.filter((s) => s.weightKg !== null).sort((a, b) => b.setNumber - a.setNumber)[0]
  if (logged) return logged.weightKg!
  return defaultWeight({ setNumber: 1, todaysSets: [], last, flag, exercise })
}

/**
 * Where the rep counter starts: what you did on this set last time (else last time's final set),
 * so usually you only tap + or − once or twice. The very first time it starts at the target (10).
 */
export function defaultReps(setNumber: number, last?: { sets: { setNumber: number; reps: number }[] }): number {
  const sets = last?.sets ?? []
  const sameSet = sets.find((s) => s.setNumber === setNumber)
  if (sameSet) return sameSet.reps
  const lastSet = [...sets].sort((a, b) => b.setNumber - a.setNumber)[0]
  return lastSet ? lastSet.reps : TARGET_REPS
}
