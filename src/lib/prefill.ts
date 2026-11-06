// Which weight to pre-fill for a set that isn't logged yet, so between sets you only type reps.
import type { Exercise } from '../db/types'
import type { Progression } from './progression'

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
