import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { progression, TARGET_REPS } from './progression'
import type { LoadType } from '../db/types'
import type { BoreasDB } from '../db/db'
import { getLastResult, logSet } from '../db/repo'
import { createTestDb } from '../test/testDb'

const stack = { loadType: 'stack' as LoadType, weightIncrementKg: 2.5 }
const bodyweight = { loadType: 'bodyweight' as LoadType, weightIncrementKg: 2.5 }

/** A session from [weight, reps] pairs, numbered set 1, 2, 3… */
function session(...sets: [number | null, number][]) {
  return { sets: sets.map(([weightKg, reps], i) => ({ setNumber: i + 1, weightKg, reps })) }
}

describe('progression: when the flag shows', () => {
  it('uses 10 reps as the target', () => {
    expect(TARGET_REPS).toBe(10)
  })

  it('no flag at 9 reps on set 3', () => {
    expect(progression(session([30, 12], [30, 10], [30, 9]), stack)).toBeUndefined()
  })

  it('flag at exactly 10 reps on set 3', () => {
    expect(progression(session([30, 13], [30, 12], [30, 10]), stack)).toEqual({
      kind: 'increase',
      fromKg: 30,
      suggestedKg: 32.5,
    })
  })

  it('flag at more than 10 reps on set 3', () => {
    expect(progression(session([30, 15], [30, 13], [30, 11]), stack)?.kind).toBe('increase')
    expect(progression(session([30, 30], [30, 28], [30, 25]), stack)?.kind).toBe('increase')
  })

  it('only set 3 decides: high reps on sets 1 and 2 do not count', () => {
    expect(progression(session([30, 15], [30, 15], [30, 9]), stack)).toBeUndefined()
  })

  it('low reps on sets 1 and 2 do not stop the flag', () => {
    expect(progression(session([30, 8], [30, 9], [30, 10]), stack)?.kind).toBe('increase')
  })

  it('no flag without a set 3 or without history', () => {
    expect(progression(session([30, 15], [30, 14]), stack)).toBeUndefined()
    expect(progression(session([30, 15]), stack)).toBeUndefined()
    expect(progression({ sets: [] }, stack)).toBeUndefined()
    expect(progression(undefined, stack)).toBeUndefined()
  })

  it('finds set 3 by its number, not its position', () => {
    const outOfOrder = {
      sets: [
        { setNumber: 3, weightKg: 30, reps: 10 },
        { setNumber: 1, weightKg: 30, reps: 12 },
      ],
    }
    expect(progression(outOfOrder, stack)?.kind).toBe('increase')
  })
})

describe('progression: the suggested weight', () => {
  it('adds the default 2.5 kg', () => {
    expect(progression(session([30, 12], [30, 11], [30, 10]), stack)).toMatchObject({ suggestedKg: 32.5 })
  })

  it('has no float noise: 22.5 + 2.5 is exactly 25', () => {
    expect(progression(session([22.5, 12], [22.5, 11], [22.5, 10]), stack)).toMatchObject({ suggestedKg: 25 })
    expect(progression(session([0.1, 12], [0.1, 11], [0.2, 10]), { ...stack, weightIncrementKg: 0.1 })).toMatchObject({
      suggestedKg: 0.3,
    })
  })

  it("uses the exercise's own increment", () => {
    expect(progression(session([30, 12], [30, 11], [30, 10]), { ...stack, weightIncrementKg: 4 })).toMatchObject({
      suggestedKg: 34,
    })
    expect(progression(session([6, 12], [6, 11], [6, 10]), { ...stack, weightIncrementKg: 1 })).toMatchObject({
      suggestedKg: 7,
    })
  })

  it('falls back to 2.5 kg when the increment is 0, negative or missing', () => {
    for (const weightIncrementKg of [0, -2.5, NaN, undefined as unknown as number]) {
      expect(progression(session([30, 12], [30, 11], [30, 10]), { ...stack, weightIncrementKg })).toMatchObject({
        suggestedKg: 32.5,
      })
    }
  })

  it('never suggests less than the heaviest weight of that session', () => {
    // set 1 at 35, set 3 dropped to 30: 30 + 2.5 = 32.5 would look like going down, so 35
    expect(progression(session([35, 8], [32.5, 9], [30, 10]), stack)).toEqual({
      kind: 'increase',
      fromKg: 30,
      suggestedKg: 35,
    })
    // set 3 heaviest: normal increase
    expect(progression(session([30, 12], [30, 11], [32.5, 10]), stack)).toMatchObject({ suggestedKg: 35 })
  })
})

describe('progression: bodyweight', () => {
  it('says "make it harder" at 10+ reps on set 3', () => {
    expect(progression(session([null, 15], [null, 12], [null, 10]), bodyweight)).toEqual({ kind: 'harder' })
  })

  it('shows nothing below 10 reps', () => {
    expect(progression(session([null, 15], [null, 12], [null, 9]), bodyweight)).toBeUndefined()
  })
})

describe('progression: never lower (1,000 random sessions)', () => {
  // A small seeded random generator, so a failure can always be reproduced.
  let seed = 42
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32
    return seed / 2 ** 32
  }
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)]

  it('every suggestion is above set 3 and at least the heaviest set; nothing else ever appears', () => {
    for (let i = 0; i < 1000; i++) {
      const setCount = pick([0, 1, 2, 3, 3, 3])
      const sets = Array.from({ length: setCount }, (_, n) => ({
        setNumber: n + 1,
        weightKg: Math.round(rand() * 2000) / 10, // 0–200 kg in 0.1 steps
        reps: Math.floor(rand() * 25),
      }))
      const exercise = { loadType: 'stack' as LoadType, weightIncrementKg: pick([2.5, 1, 4, 5, 0, -1, 0.5]) }
      const result = progression({ sets }, exercise)

      const set3 = sets.find((s) => s.setNumber === 3)
      if (!set3 || set3.reps < 10) {
        expect(result).toBeUndefined()
        continue
      }
      expect(result?.kind).toBe('increase')
      if (result?.kind !== 'increase') continue
      const heaviest = Math.max(...sets.map((s) => s.weightKg!))
      expect(result.suggestedKg).toBeGreaterThan(set3.weightKg!)
      expect(result.suggestedKg).toBeGreaterThanOrEqual(heaviest)
      expect(result.fromKg).toBe(set3.weightKg)
    }
  })
})

describe('progression across days (database)', () => {
  let db: BoreasDB
  beforeEach(async () => {
    db = await createTestDb()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('Wednesday curls with set 3 = 10 → Friday (Arms) suggests +2.5 kg', async () => {
    const WED = '2026-11-04'
    const FRI = '2026-11-06'
    for (const [i, reps] of [12, 11, 10].entries()) {
      await logSet(db, { exerciseId: 'ex-dumbbell-curl', dayTemplateId: 'day-wed', date: WED, setNumber: i + 1, weightKg: 14, reps })
    }
    const curl = (await db.exercises.get('ex-dumbbell-curl'))!
    const last = await getLastResult(db, curl.id, { before: FRI })
    expect(last?.dayName).toBe('Pull')
    expect(progression(last, curl)).toEqual({ kind: 'increase', fromKg: 14, suggestedKg: 16.5 })
  })
})
