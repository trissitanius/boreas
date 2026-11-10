// Rest timer: counts down the rest between sets (3 minutes).
// It only remembers the moment the rest ends, so it stays right when the phone sleeps,
// when you move to another exercise, and when the app is closed and opened again.
import { useSyncExternalStore } from 'react'

/** Rest between sets (training rule: 3 minutes). */
export const REST_SECONDS = 180
/** How long "Rest over" stays on screen before it hides itself. */
export const REST_OVER_SHOWN_SECONDS = 60

const KEY = 'boreas.restEndsAt'

function load(): number | null {
  try {
    const value = Number(localStorage.getItem(KEY))
    // A rest that ended long ago (app was closed) is not worth showing.
    return value > Date.now() - REST_OVER_SHOWN_SECONDS * 1000 ? value : null
  } catch {
    return null
  }
}

let endsAt: number | null = load()
const listeners = new Set<() => void>()

function set(value: number | null) {
  endsAt = value
  try {
    if (value === null) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, String(value))
  } catch {
    // No storage: the timer still works until the app is closed.
  }
  listeners.forEach((listener) => listener())
}

/** Starts (or restarts) the rest. */
export function startRest(seconds: number = REST_SECONDS, now: number = Date.now()) {
  set(now + seconds * 1000)
}

/** Makes a running rest longer. Does nothing when the rest is already over. */
export function addRest(seconds: number, now: number = Date.now()) {
  if (endsAt !== null && endsAt > now) set(endsAt + seconds * 1000)
}

export function stopRest() {
  if (endsAt !== null) set(null)
}

export function getRestEndsAt(): number | null {
  return endsAt
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The moment (ms) the rest ends, or null when no rest is running. */
export function useRestEndsAt(): number | null {
  return useSyncExternalStore(subscribe, getRestEndsAt)
}

/** Whole seconds left, rounded up so the clock shows 3:00 at the start and 0:00 only at the end. */
export function secondsLeft(end: number, now: number): number {
  return Math.max(0, Math.ceil((end - now) / 1000))
}

/** 180 → "3:00", 65 → "1:05" */
export function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
