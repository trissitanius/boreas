import { describe, expect, it } from 'vitest'
import { needsBackupReminder } from './backupReminder'
import { daysBetween } from './dates'

const DAY = 24 * 60 * 60 * 1000
const now = Date.UTC(2026, 10, 6, 12)

describe('needsBackupReminder', () => {
  it('stays quiet before the first workout', () => {
    expect(needsBackupReminder({ sessionCount: 0, now })).toBe(false)
  })

  it('reminds when there are workouts and never a backup', () => {
    expect(needsBackupReminder({ sessionCount: 1, now })).toBe(true)
  })

  it('reminds only after 7 days', () => {
    expect(needsBackupReminder({ sessionCount: 5, lastBackupAt: now - 6 * DAY, now })).toBe(false)
    expect(needsBackupReminder({ sessionCount: 5, lastBackupAt: now - 8 * DAY, now })).toBe(true)
  })
})

describe('daysBetween', () => {
  it('counts calendar days', () => {
    expect(daysBetween('2026-11-06', '2026-11-06')).toBe(0)
    expect(daysBetween('2026-11-04', '2026-11-06')).toBe(2)
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2) // across the clock change
  })
})
