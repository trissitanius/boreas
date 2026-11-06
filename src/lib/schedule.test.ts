import { describe, expect, it } from 'vitest'
import { buildSeed } from '../db/seed'
import type { DayTemplate, SetLog } from '../db/types'
import { dayProgress, exerciseStatus, isRestDay, nextUpExerciseId, nextWorkout, templateForWeekday } from './schedule'
import { formatLongDate } from './dates'

const templates = buildSeed(0).dayTemplates

function set(exerciseId: string, setNumber: number): SetLog {
  return {
    id: `${exerciseId}-${setNumber}`,
    sessionId: 's1',
    exerciseId,
    setNumber,
    weightKg: 20,
    reps: 10,
    loggedAt: 0,
    createdAt: 0,
    updatedAt: 0,
  }
}

describe('templateForWeekday', () => {
  it('follows the fixed calendar', () => {
    expect(templateForWeekday(templates, 1)?.name).toBe('Legs')
    expect(templateForWeekday(templates, 5)?.name).toBe('Arms')
    expect(isRestDay(templateForWeekday(templates, 4)!)).toBe(true)
    expect(isRestDay(templateForWeekday(templates, 7)!)).toBe(true)
  })
})

describe('nextWorkout', () => {
  it('Thursday → Friday (Arms), tomorrow', () => {
    const next = nextWorkout(templates, 4)
    expect(next?.template.name).toBe('Arms')
    expect(next?.daysAway).toBe(1)
  })

  it('Sunday → Monday (Legs), tomorrow (wraps around the week)', () => {
    const next = nextWorkout(templates, 7)
    expect(next?.template.name).toBe('Legs')
    expect(next?.daysAway).toBe(1)
  })

  it('Wednesday → Friday, skipping the Thursday rest day', () => {
    const next = nextWorkout(templates, 3)
    expect(next?.template.weekday).toBe(5)
    expect(next?.daysAway).toBe(2)
  })

  it('Saturday → Monday, skipping Sunday', () => {
    const next = nextWorkout(templates, 6)
    expect(next?.template.weekday).toBe(1)
    expect(next?.daysAway).toBe(2)
  })

  it('finds nothing when every day is a rest day', () => {
    const allRest: DayTemplate[] = templates.map((t) => ({ ...t, exerciseIds: [] }))
    expect(nextWorkout(allRest, 3)).toBeUndefined()
  })
})

describe('progress', () => {
  const arms = templateForWeekday(templates, 5)!

  it('counts logged sets per exercise, ignoring other exercises', () => {
    const sets = [set('ex-preacher-curl', 1), set('ex-preacher-curl', 2), set('ex-dumbbell-curl', 1)]
    expect(exerciseStatus(sets, 'ex-preacher-curl')).toBe(2)
    expect(exerciseStatus(sets, 'ex-seated-crunch')).toBe(0)
  })

  it('counts an exercise as done only with all 3 sets', () => {
    const sets = [
      set('ex-preacher-curl', 1),
      set('ex-preacher-curl', 2),
      set('ex-preacher-curl', 3),
      set('ex-dumbbell-curl', 1),
      set('ex-dumbbell-curl', 2),
    ]
    expect(dayProgress(arms, sets)).toEqual({ done: 1, total: 6 })
  })

  it('counts an exercise listed twice in a day only once', () => {
    const doubled: DayTemplate = { ...arms, exerciseIds: [...arms.exerciseIds, 'ex-preacher-curl'] }
    expect(dayProgress(doubled, []).total).toBe(6)
  })

  it('shows 0 of 0 on a rest day', () => {
    expect(dayProgress(templateForWeekday(templates, 4)!, [])).toEqual({ done: 0, total: 0 })
  })
})

describe('nextUpExerciseId', () => {
  const arms = templateForWeekday(templates, 5)!
  const three = (id: string) => [set(id, 1), set(id, 2), set(id, 3)]

  it('is the first exercise when nothing is logged', () => {
    expect(nextUpExerciseId(arms, [])).toBe('ex-preacher-curl')
  })

  it('stays on an exercise until all 3 sets are logged', () => {
    expect(nextUpExerciseId(arms, [set('ex-preacher-curl', 1), set('ex-preacher-curl', 2)])).toBe('ex-preacher-curl')
  })

  it('skips finished exercises, even out of order', () => {
    expect(nextUpExerciseId(arms, three('ex-preacher-curl'))).toBe('ex-dumbbell-curl')
    expect(nextUpExerciseId(arms, [...three('ex-preacher-curl'), ...three('ex-y-raise')])).toBe('ex-dumbbell-curl')
  })

  it('is undefined when everything is done', () => {
    expect(nextUpExerciseId(arms, arms.exerciseIds.flatMap(three))).toBeUndefined()
  })
})

describe('formatLongDate', () => {
  it('writes the date out in full', () => {
    expect(formatLongDate('2026-11-06')).toBe('Friday 6 November')
    expect(formatLongDate('2026-01-01')).toBe('Thursday 1 January')
  })
})
