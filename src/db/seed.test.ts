import { afterEach, describe, expect, it } from 'vitest'
import { buildSeed } from './seed'
import { MUSCLES } from './muscles'
import { createTestDb } from '../test/testDb'
import type { BoreasDB } from './db'

const seed = buildSeed(0)

describe('seed data', () => {
  it('has 12 machines, 18 exercises and 7 day templates', () => {
    expect(seed.machines).toHaveLength(12)
    expect(seed.exercises).toHaveLength(18)
    expect(seed.dayTemplates).toHaveLength(7)
  })

  it('has unique ids', () => {
    const ids = [...seed.machines, ...seed.exercises, ...seed.dayTemplates].map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers every weekday exactly once, with Thursday and Sunday as rest days', () => {
    expect(seed.dayTemplates.map((d) => d.weekday).sort()).toEqual([1, 2, 3, 4, 5, 6, 7])
    const rest = seed.dayTemplates.filter((d) => d.exerciseIds.length === 0).map((d) => d.weekday)
    expect(rest.sort()).toEqual([4, 7])
  })

  it('only references exercises and machines that exist', () => {
    const exerciseIds = new Set(seed.exercises.map((e) => e.id))
    const machineIds = new Set(seed.machines.map((m) => m.id))
    for (const day of seed.dayTemplates) {
      for (const id of day.exerciseIds) expect(exerciseIds, `${day.name}: ${id}`).toContain(id)
    }
    for (const ex of seed.exercises) {
      if (ex.machineId) expect(machineIds, ex.id).toContain(ex.machineId)
    }
  })

  it('only uses muscles from the fixed list', () => {
    const allowed = new Set<string>(MUSCLES)
    for (const ex of seed.exercises) {
      for (const m of [...ex.primaryMuscles, ...ex.secondaryMuscles]) expect(allowed, ex.id).toContain(m)
      expect(ex.primaryMuscles.length, ex.id).toBeGreaterThan(0)
    }
  })

  it('uses the same exercise id on every day that shares it', () => {
    const daysOf = (exerciseId: string) =>
      seed.dayTemplates.filter((d) => d.exerciseIds.includes(exerciseId)).map((d) => d.name)
    expect(daysOf('ex-dumbbell-curl')).toEqual(['Pull', 'Arms'])
    expect(daysOf('ex-y-raise')).toEqual(['Push', 'Arms'])
    expect(daysOf('ex-triceps-pushdown')).toEqual(['Push', 'Arms'])
    for (const id of ['ex-narrow-pulldown', 'ex-narrow-row', 'ex-wide-row']) {
      expect(daysOf(id)).toEqual(['Pull', 'Half pull, half push'])
    }
    for (const id of ['ex-chest-press', 'ex-incline-press', 'ex-butterfly']) {
      expect(daysOf(id)).toEqual(['Push', 'Half pull, half push'])
    }
  })

  it('keeps one machine with several exercises apart (machine 16, 13 and T6)', () => {
    const on = (machineId: string) => seed.exercises.filter((e) => e.machineId === machineId).map((e) => e.id)
    expect(on('m-16')).toEqual(['ex-narrow-pulldown', 'ex-narrow-row', 'ex-wide-row'])
    expect(on('m-13')).toEqual(['ex-leg-press', 'ex-calf-press'])
    expect(on('m-t6')).toEqual(['ex-triceps-pushdown', 'ex-overhead-extension'])
  })

  it('uses a 2.5 kg default increment', () => {
    for (const ex of seed.exercises) expect(ex.weightIncrementKg).toBe(2.5)
  })
})

describe('database first launch', () => {
  let db: BoreasDB
  afterEach(async () => {
    await db.delete()
  })

  it('loads the seed into the tables', async () => {
    db = await createTestDb()
    expect(await db.machines.count()).toBe(12)
    expect(await db.exercises.count()).toBe(18)
    expect(await db.dayTemplates.count()).toBe(7)
    expect((await db.settings.get('app'))?.unit).toBe('kg')
  })
})
