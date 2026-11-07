import type { Weekday } from '../db/types'
import { strings } from '../strings'

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

/** "2026-11-06" → "Friday 6 November" (in the app's locale). */
export function formatLongDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(strings.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** Whole calendar days from one local date to another ("2026-11-04" → "2026-11-06" = 2). */
export function daysBetween(fromIso: string, toIso: string): number {
  const toDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((toDate(toIso) - toDate(fromIso)) / 86_400_000)
}

/** "2026-11-06" → 5 (Friday). 1 = Monday … 7 = Sunday */
export function weekdayOfISO(isoDate: string): Weekday {
  const [y, m, d] = isoDate.split('-').map(Number)
  return weekdayOf(new Date(y, m - 1, d))
}

/** "2026-11-06" + -1 → "2026-11-05" (calendar days, local time). */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return toISODate(new Date(y, m - 1, d + days))
}
