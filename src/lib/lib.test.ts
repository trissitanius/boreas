import { describe, expect, it } from 'vitest'
import { parseReps, parseWeight } from './parse'
import { toISODate, weekdayOf } from './dates'
import { newId } from './ids'

describe('parseWeight', () => {
  it('reads dots and commas as decimal points', () => {
    expect(parseWeight('22.5')).toBe(22.5)
    expect(parseWeight('22,5')).toBe(22.5)
    expect(parseWeight(' 40 ')).toBe(40)
    expect(parseWeight('0')).toBe(0)
  })

  it('rejects empty, negative and non-numbers', () => {
    for (const bad of ['', '  ', '-5', 'abc', '2.5.5', '1e3', '22,', '.5', '5000']) {
      expect(parseWeight(bad), bad).toBeUndefined()
    }
  })
})

describe('parseReps', () => {
  it('accepts whole numbers only', () => {
    expect(parseReps('10')).toBe(10)
    expect(parseReps('0')).toBe(0)
    for (const bad of ['', '2.5', '2,5', '-1', 'ten', '1000']) {
      expect(parseReps(bad), bad).toBeUndefined()
    }
  })
})

describe('dates', () => {
  it('uses the local date, not UTC', () => {
    expect(toISODate(new Date(2026, 10, 6, 23, 59))).toBe('2026-11-06')
    expect(toISODate(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01')
  })

  it('numbers weekdays Monday = 1 … Sunday = 7', () => {
    expect(weekdayOf(new Date(2026, 10, 2))).toBe(1) // Mon
    expect(weekdayOf(new Date(2026, 10, 4))).toBe(3) // Wed
    expect(weekdayOf(new Date(2026, 10, 6))).toBe(5) // Fri
    expect(weekdayOf(new Date(2026, 10, 8))).toBe(7) // Sun
  })
})

describe('newId', () => {
  it('makes unique UUID-shaped ids', () => {
    const ids = new Set(Array.from({ length: 100 }, newId))
    expect(ids.size).toBe(100)
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})
