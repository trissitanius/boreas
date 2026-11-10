import { afterEach, describe, expect, it } from 'vitest'
import { addRest, formatClock, getRestEndsAt, REST_SECONDS, secondsLeft, startRest, stopRest } from './restTimer'

afterEach(() => stopRest())

describe('rest timer', () => {
  it('rests 3 minutes by default', () => {
    expect(REST_SECONDS).toBe(180)
    startRest(undefined, 1_000)
    expect(getRestEndsAt()).toBe(181_000)
  })

  it('counts down in whole seconds, rounded up, never below zero', () => {
    expect(secondsLeft(180_000, 0)).toBe(180)
    expect(secondsLeft(180_000, 1)).toBe(180)
    expect(secondsLeft(180_000, 1_000)).toBe(179)
    expect(secondsLeft(180_000, 179_999)).toBe(1)
    expect(secondsLeft(180_000, 180_000)).toBe(0)
    expect(secondsLeft(180_000, 999_999)).toBe(0)
  })

  it('adds time to a running rest only', () => {
    startRest(180, 0)
    addRest(30, 10_000)
    expect(getRestEndsAt()).toBe(210_000)
    addRest(30, 300_000) // already over
    expect(getRestEndsAt()).toBe(210_000)
  })

  it('stops, and a new set restarts it', () => {
    startRest(180, 0)
    stopRest()
    expect(getRestEndsAt()).toBeNull()
    addRest(30, 0)
    expect(getRestEndsAt()).toBeNull()
    startRest(180, 5_000)
    expect(getRestEndsAt()).toBe(185_000)
  })

  it('formats the clock', () => {
    expect(formatClock(180)).toBe('3:00')
    expect(formatClock(65)).toBe('1:05')
    expect(formatClock(9)).toBe('0:09')
    expect(formatClock(0)).toBe('0:00')
  })
})
