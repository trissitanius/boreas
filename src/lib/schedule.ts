// The fixed weekly schedule: which workout belongs to which weekday, and progress through a day.
import type { DayTemplate, SetLog, Weekday } from '../db/types'
import { SETS_PER_EXERCISE } from '../db/repo'

export function templateForWeekday(templates: DayTemplate[], weekday: Weekday): DayTemplate | undefined {
  return templates.find((t) => t.weekday === weekday)
}

export function isRestDay(template: DayTemplate): boolean {
  return template.exerciseIds.length === 0
}

/** The next training day after this weekday, and how many days away it is (1 = tomorrow). */
export function nextWorkout(
  templates: DayTemplate[],
  weekday: Weekday,
): { template: DayTemplate; daysAway: number } | undefined {
  for (let daysAway = 1; daysAway <= 7; daysAway++) {
    const next = ((((weekday - 1 + daysAway) % 7) + 7) % 7) + 1
    const template = templateForWeekday(templates, next as Weekday)
    if (template && !isRestDay(template)) return { template, daysAway }
  }
  return undefined
}

/** How many of the sets (1–3) are logged for this exercise. */
export function exerciseStatus(sets: SetLog[], exerciseId: string): number {
  return new Set(sets.filter((s) => s.exerciseId === exerciseId).map((s) => s.setNumber)).size
}

/** Exercises with all sets logged, out of the day's exercises. */
export function dayProgress(template: DayTemplate, sets: SetLog[]): { done: number; total: number } {
  const ids = [...new Set(template.exerciseIds)]
  const done = ids.filter((id) => exerciseStatus(sets, id) >= SETS_PER_EXERCISE).length
  return { done, total: ids.length }
}

/** The first exercise of the day that doesn't have all its sets yet (undefined when all are done). */
export function nextUpExerciseId(template: DayTemplate, sets: SetLog[]): string | undefined {
  return template.exerciseIds.find((id) => exerciseStatus(sets, id) < SETS_PER_EXERCISE)
}
