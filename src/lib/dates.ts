import type { Weekday } from '../db/types'

/** Local calendar date as "YYYY-MM-DD" (not UTC, so a late-evening workout stays on the right day). */
export function toISODate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 1 = Monday … 7 = Sunday */
export function weekdayOf(d: Date = new Date()): Weekday {
  return (((d.getDay() + 6) % 7) + 1) as Weekday
}
