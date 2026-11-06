const MAX_WEIGHT = 1000
const MAX_REPS = 999

/** Reads a typed weight. A comma counts as a decimal point ("22,5" → 22.5). Returns undefined if invalid. */
export function parseWeight(input: string): number | undefined {
  const text = input.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(text)) return undefined
  const value = Number(text)
  if (!Number.isFinite(value) || value > MAX_WEIGHT) return undefined
  return value
}

/** Reads typed reps: whole numbers only. Returns undefined if invalid. */
export function parseReps(input: string): number | undefined {
  const text = input.trim()
  if (!/^\d+$/.test(text)) return undefined
  const value = Number(text)
  if (value > MAX_REPS) return undefined
  return value
}

export function isValidWeightKg(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= MAX_WEIGHT
}

export function isValidReps(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_REPS
}
