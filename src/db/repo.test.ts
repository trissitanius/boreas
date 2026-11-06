import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { BoreasDB } from './db'
import {
  cleanCues,
  createExercise,
  createMachine,
  deleteSet,
  getLastResult,
  getOrCreateSession,
  getSetsForDay,
  LIMITS,
  logSet,
  updateDayTemplate,
  updateExercise,
  updateSet,
} from './repo'
import { progression } from '../lib/progression'
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

describe('updateExercise (feature 6)', () => {
  it('saves settings, cues and weight step', async () => {
    const before = (await db.exercises.get('ex-butterfly'))!
    await updateExercise(db, 'ex-butterfly', {
      settings: '  seat 4; plate behind the back  ',
      cues: ['Proud chest', 'Squeeze 1 s'],
      weightIncrementKg: 4,
    })
    const after = (await db.exercises.get('ex-butterfly'))!
    expect(after.settings).toBe('seat 4; plate behind the back')
    expect(after.cues).toEqual(['Proud chest', 'Squeeze 1 s'])
    expect(after.weightIncrementKg).toBe(4)
    expect(after.updatedAt).toBeGreaterThan(before.updatedAt)
    // untouched fields stay
    expect(after.name).toBe(before.name)
    expect(after.primaryMuscles).toEqual(before.primaryMuscles)
  })

  it('only changes what is given', async () => {
    await updateExercise(db, 'ex-chest-press', { settings: 'seat height 6, back 4' })
    const after = (await db.exercises.get('ex-chest-press'))!
    expect(after.settings).toBe('seat height 6, back 4')
    expect(after.cues).toEqual(['Banana'])
    expect(after.weightIncrementKg).toBe(2.5)
  })

  it('tidies cues: trimmed, no empties, no duplicates, capped', () => {
    expect(cleanCues(['  Banana ', '', '   ', 'banana', 'Proud chest'])).toEqual(['Banana', 'Proud chest'])
    expect(cleanCues(Array.from({ length: 20 }, (_, i) => `cue ${i}`))).toHaveLength(LIMITS.cueCount)
    expect(cleanCues(['x'.repeat(500)])[0]).toHaveLength(LIMITS.cueLength)
  })

  it('refuses invalid weight steps and saves nothing', async () => {
    for (const weightIncrementKg of [0, -2.5, 51, NaN, Infinity]) {
      await expect(
        updateExercise(db, 'ex-leg-curl', { settings: 'changed', weightIncrementKg }),
      ).rejects.toThrow()
    }
    const after = (await db.exercises.get('ex-leg-curl'))!
    expect(after.settings).toBe('foot pad 9, foot pad arm 11')
    expect(after.weightIncrementKg).toBe(2.5)
  })

  it('refuses unknown exercises', async () => {
    await expect(updateExercise(db, 'ex-nope', { settings: 'x' })).rejects.toThrow()
  })

  it('a new weight step changes the next suggestion (step 2: 14 kg → 16 kg)', async () => {
    await logThree('ex-dumbbell-curl', 'day-wed', WED, [[14, 12], [14, 11], [14, 10]])
    await updateExercise(db, 'ex-dumbbell-curl', { weightIncrementKg: 2 })
    const curl = (await db.exercises.get('ex-dumbbell-curl'))!
    const last = await getLastResult(db, curl.id, { before: FRI })
    expect(progression(last, curl)).toEqual({ kind: 'increase', fromKg: 14, suggestedKg: 16 })
  })
})

describe('updateDayTemplate (day editor)', () => {
  it('saves a new order and name', async () => {
    await updateDayTemplate(db, 'day-fri', {
      name: '  Arms day ',
      exerciseIds: ['ex-dumbbell-curl', 'ex-preacher-curl', 'ex-seated-crunch'],
    })
    const fri = (await db.dayTemplates.get('day-fri'))!
    expect(fri.name).toBe('Arms day')
    expect(fri.exerciseIds).toEqual(['ex-dumbbell-curl', 'ex-preacher-curl', 'ex-seated-crunch'])
  })

  it('removing an exercise from a day keeps the exercise and its history', async () => {
    await logThree('ex-preacher-curl', 'day-fri', WED, [[30, 12], [30, 11], [30, 10]])
    await updateDayTemplate(db, 'day-fri', { exerciseIds: ['ex-dumbbell-curl'] })
    expect(await db.exercises.get('ex-preacher-curl')).toBeDefined()
    expect(await db.setLogs.count()).toBe(3)
    expect((await getLastResult(db, 'ex-preacher-curl'))?.sets.map((s) => s.reps)).toEqual([12, 11, 10])
  })

  it('removes duplicates and allows an empty day (rest day)', async () => {
    await updateDayTemplate(db, 'day-mon', { exerciseIds: ['ex-leg-press', 'ex-leg-press', 'ex-calf-press'] })
    expect((await db.dayTemplates.get('day-mon'))!.exerciseIds).toEqual(['ex-leg-press', 'ex-calf-press'])
    await updateDayTemplate(db, 'day-mon', { exerciseIds: [] })
    expect((await db.dayTemplates.get('day-mon'))!.exerciseIds).toEqual([])
  })

  it('refuses unknown exercises, empty names and unknown days', async () => {
    await expect(updateDayTemplate(db, 'day-mon', { exerciseIds: ['ex-leg-press', 'ex-nope'] })).rejects.toThrow()
    await expect(updateDayTemplate(db, 'day-mon', { name: '   ' })).rejects.toThrow()
    await expect(updateDayTemplate(db, 'day-nope', { name: 'X' })).rejects.toThrow()
    expect((await db.dayTemplates.get('day-mon'))!.exerciseIds).toHaveLength(5)
  })
})

describe('createMachine', () => {
  it('saves a machine with a new id', async () => {
    const id = await createMachine(db, { gymNumber: ' N9 ', brand: 'Nautilus', model: 'Nitro Evo Leg Extension' })
    const m = (await db.machines.get(id))!
    expect(m).toMatchObject({ gymNumber: 'N9', brand: 'Nautilus', model: 'Nitro Evo Leg Extension' })
    expect(id).not.toMatch(/^m-/)
  })

  it('refuses a gym number that already exists (any case) and an empty brand', async () => {
    await expect(createMachine(db, { gymNumber: 'n6', brand: 'Nautilus', model: '' })).rejects.toThrow()
    await expect(createMachine(db, { gymNumber: 'N20', brand: '  ', model: '' })).rejects.toThrow()
    await expect(createMachine(db, { gymNumber: '', brand: 'gym80', model: '' })).rejects.toThrow()
    expect(await db.machines.count()).toBe(12)
  })
})

describe('createExercise', () => {
  it('saves an exercise that can be put on a day and follows the progression rule', async () => {
    const machineId = await createMachine(db, { gymNumber: 'N9', brand: 'Nautilus', model: 'Leg Extension' })
    const id = await createExercise(db, {
      name: ' Leg extension ',
      machineId,
      settings: 'seat 5',
      loadType: 'stack',
      primaryMuscles: ['quads'],
      secondaryMuscles: ['quads', 'glutes'],
      weightIncrementKg: 5,
      cues: ['Toes up', ''],
    })
    const ex = (await db.exercises.get(id))!
    expect(ex).toMatchObject({ name: 'Leg extension', machineId, settings: 'seat 5', loadType: 'stack', weightIncrementKg: 5 })
    expect(ex.primaryMuscles).toEqual(['quads'])
    expect(ex.secondaryMuscles).toEqual(['glutes']) // "quads" dropped: already primary
    expect(ex.cues).toEqual(['Toes up'])

    await updateDayTemplate(db, 'day-mon', { exerciseIds: ['ex-leg-press', id] })
    await logThree(id, 'day-mon', WED, [[50, 12], [50, 11], [50, 10]])
    const last = await getLastResult(db, id, { before: FRI })
    expect(progression(last, ex)).toEqual({ kind: 'increase', fromKg: 50, suggestedKg: 55 })
  })

  it('works without a machine and uses the default step', async () => {
    const id = await createExercise(db, { name: 'Push-up', loadType: 'bodyweight', primaryMuscles: ['chest'] })
    const ex = (await db.exercises.get(id))!
    expect(ex.machineId).toBeUndefined()
    expect(ex.weightIncrementKg).toBe(2.5)
  })

  it('refuses bad input and saves nothing', async () => {
    const base = { name: 'X', loadType: 'stack' as const, primaryMuscles: ['chest' as const] }
    await expect(createExercise(db, { ...base, name: '  ' })).rejects.toThrow()
    await expect(createExercise(db, { ...base, primaryMuscles: [] })).rejects.toThrow()
    await expect(createExercise(db, { ...base, primaryMuscles: ['wings' as never] })).rejects.toThrow()
    await expect(createExercise(db, { ...base, machineId: 'm-nope' })).rejects.toThrow()
    await expect(createExercise(db, { ...base, weightIncrementKg: 0 })).rejects.toThrow()
    await expect(createExercise(db, { ...base, loadType: 'rocket' as never })).rejects.toThrow()
    expect(await db.exercises.count()).toBe(18)
  })
})
