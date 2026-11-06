import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { BoreasDB } from './db'
import { deleteSet, getLastResult, getOrCreateSession, getSetsForDay, logSet, updateSet } from './repo'
import { createTestDb } from '../test/testDb'

const WED = '2026-11-04' // a Wednesday (Pull)
const FRI = '2026-11-06' // a Friday (Arms)
const at = (date: string, minute: number) => new Date(`${date}T18:${String(minute).padStart(2, '0')}:00`).getTime()

let db: BoreasDB
beforeEach(async () => {
  db = await createTestDb()
})
afterEach(async () => {
  await db.delete()
})

async function logThree(
  exerciseId: string,
  dayTemplateId: string,
  date: string,
  sets: [number | null, number][],
) {
  for (const [i, [weightKg, reps]] of sets.entries()) {
    await logSet(db, { exerciseId, dayTemplateId, date, setNumber: i + 1, weightKg, reps, loggedAt: at(date, i) })
  }
}

describe('getOrCreateSession', () => {
  it('returns the same session for the same date and day', async () => {
    const a = await getOrCreateSession(db, WED, 'day-wed')
    const b = await getOrCreateSession(db, WED, 'day-wed')
    expect(b.id).toBe(a.id)
    expect(await db.sessions.count()).toBe(1)
  })

  it('never creates two sessions, even when called at the same time', async () => {
    const [a, b] = await Promise.all([
      getOrCreateSession(db, WED, 'day-wed'),
      getOrCreateSession(db, WED, 'day-wed'),
    ])
    expect(b.id).toBe(a.id)
    expect(await db.sessions.count()).toBe(1)
  })

  it('makes separate sessions for different dates or days', async () => {
    await getOrCreateSession(db, WED, 'day-wed')
    await getOrCreateSession(db, FRI, 'day-fri')
    await getOrCreateSession(db, WED, 'day-fri')
    expect(await db.sessions.count()).toBe(3)
  })
})

describe('logSet', () => {
  it('saves sets into the day session', async () => {
    await logThree('ex-dumbbell-curl', 'day-wed', WED, [[14, 13], [14, 12], [14, 10]])
    const sets = await getSetsForDay(db, WED, 'day-wed')
    expect(sets.map((s) => [s.setNumber, s.weightKg, s.reps])).toEqual([
      [1, 14, 13],
      [2, 14, 12],
      [3, 14, 10],
    ])
  })

  it('replaces a set when the same set number is saved again (no duplicates)', async () => {
    await logSet(db, { exerciseId: 'ex-leg-curl', dayTemplateId: 'day-mon', date: WED, setNumber: 1, weightKg: 40, reps: 8 })
    await logSet(db, { exerciseId: 'ex-leg-curl', dayTemplateId: 'day-mon', date: WED, setNumber: 1, weightKg: 45, reps: 9 })
    const sets = await getSetsForDay(db, WED, 'day-mon')
    expect(sets).toHaveLength(1)
    expect(sets[0]).toMatchObject({ weightKg: 45, reps: 9 })
  })

  it('stores no weight for bodyweight exercises', async () => {
    const log = await logSet(db, {
      exerciseId: 'ex-back-extension',
      dayTemplateId: 'day-mon',
      date: WED,
      setNumber: 1,
      weightKg: 20,
      reps: 15,
    })
    expect(log.weightKg).toBeNull()
  })

  it('rejects bad input', async () => {
    const base = { exerciseId: 'ex-leg-curl', dayTemplateId: 'day-mon', date: WED, weightKg: 40, reps: 10 }
    await expect(logSet(db, { ...base, setNumber: 0 })).rejects.toThrow()
    await expect(logSet(db, { ...base, setNumber: 4 })).rejects.toThrow()
    await expect(logSet(db, { ...base, setNumber: 1, reps: 2.5 })).rejects.toThrow()
    await expect(logSet(db, { ...base, setNumber: 1, reps: -1 })).rejects.toThrow()
    await expect(logSet(db, { ...base, setNumber: 1, weightKg: -5 })).rejects.toThrow()
    await expect(logSet(db, { ...base, setNumber: 1, weightKg: null })).rejects.toThrow()
    await expect(logSet(db, { ...base, setNumber: 1, exerciseId: 'ex-nope' })).rejects.toThrow()
    expect(await db.setLogs.count()).toBe(0)
  })
})

describe('updateSet and deleteSet', () => {
  it('fixes a typo and deletes a set', async () => {
    const log = await logSet(db, { exerciseId: 'ex-leg-curl', dayTemplateId: 'day-mon', date: WED, setNumber: 1, weightKg: 40, reps: 100 })
    await updateSet(db, log.id, { reps: 10 })
    expect((await db.setLogs.get(log.id))?.reps).toBe(10)
    await expect(updateSet(db, log.id, { weightKg: -1 })).rejects.toThrow()
    await deleteSet(db, log.id)
    expect(await db.setLogs.count()).toBe(0)
  })
})

describe('getLastResult (history belongs to the exercise, not the day)', () => {
  it('is empty for an exercise never logged', async () => {
    expect(await getLastResult(db, 'ex-dumbbell-curl')).toBeUndefined()
  })

  it('shows Wednesday (Pull) curls when the curl comes up on Friday (Arms)', async () => {
    await logThree('ex-dumbbell-curl', 'day-wed', WED, [[14, 13], [14, 12], [14, 10]])

    const last = await getLastResult(db, 'ex-dumbbell-curl')
    expect(last).toEqual({
      date: WED,
      dayTemplateId: 'day-wed',
      dayName: 'Pull',
      sets: [
        { setNumber: 1, weightKg: 14, reps: 13 },
        { setNumber: 2, weightKg: 14, reps: 12 },
        { setNumber: 3, weightKg: 14, reps: 10 },
      ],
    })
  })

  it('switches to the newer session once the exercise is logged again on another day', async () => {
    await logThree('ex-dumbbell-curl', 'day-wed', WED, [[14, 13], [14, 12], [14, 10]])
    await logThree('ex-dumbbell-curl', 'day-fri', FRI, [[16, 9], [16, 8], [16, 7]])

    const last = await getLastResult(db, 'ex-dumbbell-curl')
    expect(last?.date).toBe(FRI)
    expect(last?.dayName).toBe('Arms')
    expect(last?.sets.map((s) => s.reps)).toEqual([9, 8, 7])
  })

  it("only includes this exercise's sets, not other exercises from the same session", async () => {
    await logThree('ex-preacher-curl', 'day-fri', FRI, [[30, 12], [30, 11], [30, 10]])
    await logThree('ex-dumbbell-curl', 'day-fri', FRI, [[14, 10], [14, 9], [14, 8]])

    const last = await getLastResult(db, 'ex-preacher-curl')
    expect(last?.sets.map((s) => s.weightKg)).toEqual([30, 30, 30])
  })

  it('keeps exercises on the same machine apart (machine 16 grip 3 vs grip 4)', async () => {
    await logThree('ex-narrow-pulldown', 'day-wed', WED, [[50, 10], [50, 9], [50, 8]])
    expect(await getLastResult(db, 'ex-narrow-row')).toBeUndefined()
  })

  it('shows null weight for bodyweight exercises', async () => {
    await logThree('ex-leg-raise', 'day-mon', WED, [[null, 15], [null, 14], [null, 12]])
    const last = await getLastResult(db, 'ex-leg-raise')
    expect(last?.sets.every((s) => s.weightKg === null)).toBe(true)
  })
})

describe('getLastResult with "before" (last time ignores today)', () => {
  const TODAY = '2026-11-13' // next Friday

  it('keeps showing the previous session while today is being logged', async () => {
    await logThree('ex-dumbbell-curl', 'day-wed', WED, [[14, 13], [14, 12], [14, 10]])
    await logSet(db, {
      exerciseId: 'ex-dumbbell-curl',
      dayTemplateId: 'day-fri',
      date: TODAY,
      setNumber: 1,
      weightKg: 16,
      reps: 8,
      loggedAt: at(TODAY, 0),
    })

    const last = await getLastResult(db, 'ex-dumbbell-curl', { before: TODAY })
    expect(last?.date).toBe(WED)
    expect(last?.dayName).toBe('Pull')
    expect(last?.sets.map((s) => s.reps)).toEqual([13, 12, 10])

    // Without "before", today's set is the newest.
    expect((await getLastResult(db, 'ex-dumbbell-curl'))?.date).toBe(TODAY)
  })

  it('is empty when the only history is from today', async () => {
    await logThree('ex-leg-curl', 'day-mon', TODAY, [[40, 10], [40, 9], [40, 8]])
    expect(await getLastResult(db, 'ex-leg-curl', { before: TODAY })).toBeUndefined()
  })

  it('goes by session date: an older session typed in later does not count as newer', async () => {
    await logThree('ex-dumbbell-curl', 'day-fri', FRI, [[16, 9], [16, 8], [16, 7]])
    // Wednesday's session entered afterwards (e.g. a forgotten paper log)
    await logThree('ex-dumbbell-curl', 'day-wed', WED, [[14, 13], [14, 12], [14, 10]])
    await db.setLogs.toCollection().modify((l) => {
      if (l.weightKg === 14) l.loggedAt += 1_000_000_000
    })

    const last = await getLastResult(db, 'ex-dumbbell-curl', { before: TODAY })
    expect(last?.date).toBe(FRI)
  })
})
