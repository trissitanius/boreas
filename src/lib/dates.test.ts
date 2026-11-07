import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, weekdayOfISO } from './dates'

describe('weekdayOfISO and addDays', () => {
  it('reads the weekday of a date', () => {
    expect(weekdayOfISO('2026-11-02')).toBe(1)
    expect(weekdayOfISO('2026-11-06')).toBe(5)
    expect(weekdayOfISO('2026-11-08')).toBe(7)
  })

  it('adds calendar days across months and years', () => {
    expect(addDays('2026-11-07', -1)).toBe('2026-11-06')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(daysBetween('2026-11-07', addDays('2026-11-07', -7))).toBe(-7)
  })
})
