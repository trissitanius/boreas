import { describe, expect, it } from 'vitest'
import { defaultReps, defaultWeight, weightForToday } from './prefill'
import type { LoadType } from '../db/types'

const stack = { loadType: 'stack' as LoadType }
const set = (setNumber: number, weightKg: number | null) => ({ setNumber, weightKg })
const lastSession = { sets: [set(1, 30), set(2, 30), set(3, 27.5)] }
const increase = { kind: 'increase' as const, fromKg: 14, suggestedKg: 16.5 }

describe('defaultWeight', () => {
  it("copies your previous set from today", () => {
    expect(defaultWeight({ setNumber: 2, todaysSets: [set(1, 32.5)], last: lastSession, exercise: stack })).toBe(32.5)
    expect(defaultWeight({ setNumber: 3, todaysSets: [set(1, 32.5), set(2, 35)], last: lastSession, exercise: stack })).toBe(35)
  })

  it('falls back to set 1 when set 2 is not logged yet', () => {
    expect(defaultWeight({ setNumber: 3, todaysSets: [set(1, 32.5)], last: lastSession, exercise: stack })).toBe(32.5)
  })

  it('ignores later sets from today', () => {
    expect(defaultWeight({ setNumber: 1, todaysSets: [set(2, 40)], last: lastSession, exercise: stack })).toBe(30)
  })

  it('uses the suggested weight when "Increase weight" shows', () => {
    expect(defaultWeight({ setNumber: 1, todaysSets: [], last: lastSession, flag: increase, exercise: stack })).toBe(16.5)
  })

  it('after you typed a different weight on set 1, set 2 follows you, not the suggestion', () => {
    expect(defaultWeight({ setNumber: 2, todaysSets: [set(1, 16)], last: lastSession, flag: increase, exercise: stack })).toBe(16)
  })

  it('"Make it harder" does not change the weight', () => {
    expect(defaultWeight({ setNumber: 1, todaysSets: [], last: lastSession, flag: { kind: 'harder' }, exercise: stack })).toBe(30)
  })

  it("uses last session's weight for the same set, else its last set", () => {
    expect(defaultWeight({ setNumber: 3, todaysSets: [], last: lastSession, exercise: stack })).toBe(27.5)
    expect(defaultWeight({ setNumber: 3, todaysSets: [], last: { sets: [set(1, 20), set(2, 22.5)] }, exercise: stack })).toBe(22.5)
  })

  it('uses the starting weight, or nothing, without history', () => {
    expect(defaultWeight({ setNumber: 1, todaysSets: [], exercise: { ...stack, startingWeightKg: 25 } })).toBe(25)
    expect(defaultWeight({ setNumber: 1, todaysSets: [], exercise: stack })).toBeUndefined()
  })

  it('never fills a weight for bodyweight exercises', () => {
    const bw = { loadType: 'bodyweight' as LoadType }
    expect(defaultWeight({ setNumber: 2, todaysSets: [set(1, null)], last: { sets: [set(1, null)] }, exercise: bw })).toBeUndefined()
  })
})

describe('weightForToday', () => {
  it("uses the weight you already logged today", () => {
    expect(weightForToday({ todaysSets: [set(1, 32.5), set(2, 35)], last: lastSession, flag: increase, exercise: stack })).toBe(35)
  })

  it('before any set: the suggestion, else last time, else the starting weight', () => {
    expect(weightForToday({ todaysSets: [], last: lastSession, flag: increase, exercise: stack })).toBe(16.5)
    expect(weightForToday({ todaysSets: [], last: lastSession, exercise: stack })).toBe(30)
    expect(weightForToday({ todaysSets: [], exercise: { ...stack, startingWeightKg: 25 } })).toBe(25)
    expect(weightForToday({ todaysSets: [], exercise: stack })).toBeUndefined()
  })

  it('is empty for bodyweight exercises', () => {
    const bw = { loadType: 'bodyweight' as LoadType }
    expect(weightForToday({ todaysSets: [set(1, null)], exercise: bw })).toBeUndefined()
  })
})

describe('defaultReps', () => {
  const reps = (setNumber: number, r: number) => ({ setNumber, reps: r })
  const last = { sets: [reps(1, 13), reps(2, 12), reps(3, 10)] }

  it("starts at last time's reps for the same set", () => {
    expect(defaultReps(1, last)).toBe(13)
    expect(defaultReps(2, last)).toBe(12)
    expect(defaultReps(3, last)).toBe(10)
  })

  it("falls back to last time's final set when that set is missing", () => {
    expect(defaultReps(3, { sets: [reps(1, 11), reps(2, 9)] })).toBe(9)
  })

  it('starts at the target of 10 the first time', () => {
    expect(defaultReps(1)).toBe(10)
    expect(defaultReps(2, { sets: [] })).toBe(10)
  })
})
