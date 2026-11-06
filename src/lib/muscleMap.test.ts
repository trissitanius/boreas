import { describe, expect, it } from 'vitest'
import { MUSCLES, type Muscle } from '../db/muscles'
import { buildSeed } from '../db/seed'
import { musclesForRegion, OFF_MAP, paint, REGION_MUSCLES, regionRole, regionRoles, roleOf } from './muscleMap'

const onMap = new Set(Object.values(REGION_MUSCLES).flatMap((view) => Object.values(view).flat()))

describe('the muscle ↔ map table', () => {
  it('covers every one of our muscles, on the map or as an off-map chip', () => {
    for (const m of MUSCLES) expect(onMap.has(m) || OFF_MAP.includes(m), m).toBe(true)
  })

  it('only points to real muscles, and off-map muscles are really not on the map', () => {
    for (const m of onMap) expect(MUSCLES).toContain(m)
    for (const m of OFF_MAP) expect(onMap.has(m)).toBe(false)
  })

  it('splits the shoulders by view: front delts in front, rear delts at the back', () => {
    expect(musclesForRegion('front', 'deltoids')).toEqual(['front-delts', 'side-delts'])
    expect(musclesForRegion('back', 'deltoids')).toEqual(['rear-delts', 'side-delts'])
    expect(musclesForRegion('back', 'upper-back')).toContain('lats')
  })

  it('ignores parts that are not muscles', () => {
    expect(musclesForRegion('front', 'head')).toEqual([])
    expect(musclesForRegion('front', 'hands')).toEqual([])
    expect(musclesForRegion('back', 'chest')).toEqual([])
  })
})

describe('region colours', () => {
  it('primary wins over secondary in a shared region', () => {
    const sel = { primary: ['side-delts' as Muscle], secondary: ['front-delts' as Muscle] }
    expect(regionRole('front', 'deltoids', sel)).toBe('primary')
  })

  it('secondary shows when no muscle of the region is primary', () => {
    expect(regionRole('front', 'triceps', { primary: ['chest'], secondary: ['triceps'] })).toBe('secondary')
  })

  it('nothing selected → no colour', () => {
    expect(regionRoles('front', { primary: [], secondary: [] })).toEqual([])
  })

  it('lists every coloured region of a view', () => {
    const chestPress = { primary: ['chest' as Muscle], secondary: ['front-delts' as Muscle, 'triceps' as Muscle] }
    expect(regionRoles('front', chestPress)).toEqual([
      { region: 'chest', role: 'primary' },
      { region: 'deltoids', role: 'secondary' },
      { region: 'triceps', role: 'secondary' },
    ])
    // At the back, only the triceps show (front delts aren't visible from behind).
    expect(regionRoles('back', chestPress)).toEqual([{ region: 'triceps', role: 'secondary' }])
  })
})

describe('paint', () => {
  const start = { primary: ['chest' as Muscle], secondary: ['triceps' as Muscle] }

  it('primary takes a muscle out of secondary', () => {
    expect(paint(start, ['triceps'], 'primary')).toEqual({ primary: ['chest', 'triceps'], secondary: [] })
  })

  it('secondary takes a muscle out of primary', () => {
    expect(paint(start, ['chest'], 'secondary')).toEqual({ primary: [], secondary: ['triceps', 'chest'] })
  })

  it('erase removes it from both', () => {
    expect(paint(start, ['chest', 'triceps'], 'erase')).toEqual({ primary: [], secondary: [] })
  })

  it('painting twice changes nothing', () => {
    const once = paint(start, ['biceps'], 'secondary')
    expect(paint(once, ['biceps'], 'secondary')).toEqual(once)
  })

  it('never puts a muscle in both lists', () => {
    let sel = { primary: [] as Muscle[], secondary: [] as Muscle[] }
    const brushes = ['primary', 'secondary', 'erase'] as const
    for (let i = 0; i < 200; i++) {
      sel = paint(sel, [MUSCLES[(i * 7) % MUSCLES.length]], brushes[(i * 5) % 3])
      expect(sel.primary.filter((m) => sel.secondary.includes(m))).toEqual([])
    }
    expect(roleOf('chest', { primary: ['chest'], secondary: [] })).toBe('primary')
  })
})

describe('the seeded exercises', () => {
  it('each shows at least one Ember region or Ember chip', () => {
    for (const ex of buildSeed(0).exercises) {
      const sel = { primary: ex.primaryMuscles, secondary: ex.secondaryMuscles }
      const ember =
        [...regionRoles('front', sel), ...regionRoles('back', sel)].some((r) => r.role === 'primary') ||
        ex.primaryMuscles.some((m) => OFF_MAP.includes(m))
      expect(ember, ex.name).toBe(true)
    }
  })

  it('Y raise lights the shoulders Ember front and back; leg raises use the hip-flexor chip', () => {
    const exercises = buildSeed(0).exercises
    const y = exercises.find((e) => e.id === 'ex-y-raise')!
    const ySel = { primary: y.primaryMuscles, secondary: y.secondaryMuscles }
    expect(regionRole('front', 'deltoids', ySel)).toBe('primary')
    expect(regionRole('back', 'deltoids', ySel)).toBe('primary')
    const legRaise = exercises.find((e) => e.id === 'ex-leg-raise')!
    expect(legRaise.primaryMuscles.every((m) => OFF_MAP.includes(m))).toBe(true)
  })
})
