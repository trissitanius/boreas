import { describe, expect, it } from 'vitest'
import { formatNumber, formatSets, formatShortDate } from './format'

const s = (weightKg: number | null, reps: number) => ({ weightKg, reps })

describe('formatSets', () => {
  it('writes one weight when all sets used the same weight', () => {
    expect(formatSets([s(30, 13), s(30, 12), s(30, 10)])).toBe('30 kg · 13 / 12 / 10')
  })

  it('writes weight × reps per set when weights differ', () => {
    expect(formatSets([s(30, 13), s(32.5, 12), s(32.5, 10)])).toBe('30 × 13 · 32.5 × 12 · 32.5 × 10')
  })

  it('writes only reps for bodyweight', () => {
    expect(formatSets([s(null, 13), s(null, 12), s(null, 10)])).toBe('13 / 12 / 10 reps')
  })

  it('keeps decimals and handles unfinished sessions', () => {
    expect(formatSets([s(22.5, 11)])).toBe('22.5 kg · 11')
    expect(formatSets([s(22.5, 11), s(22.5, 9)])).toBe('22.5 kg · 11 / 9')
    expect(formatSets([])).toBe('')
  })

  it('uses the unit it is given', () => {
    expect(formatSets([s(30, 10)], 'lb')).toBe('30 lb · 10')
  })
})

describe('formatNumber', () => {
  it('drops trailing zeros and float noise', () => {
    expect(formatNumber(30)).toBe('30')
    expect(formatNumber(22.5)).toBe('22.5')
    expect(formatNumber(0.1 + 0.2)).toBe('0.3')
  })
})

describe('formatShortDate', () => {
  it('writes a short day and date', () => {
    expect(formatShortDate('2026-11-04')).toBe('Wed 4 Nov')
  })
})
