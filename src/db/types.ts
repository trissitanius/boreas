import type { Muscle } from './muscles'

export type LoadType = 'stack' | 'dumbbell' | 'plate' | 'bodyweight'

/** 1 = Monday … 7 = Sunday */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type WeightUnit = 'kg' | 'lb'

/** Every record keeps these, so a future sync can tell which copy is newer. */
export interface Timestamps {
  createdAt: number
  updatedAt: number
}

export interface Machine extends Timestamps {
  id: string
  /** The gym's own label on the machine, e.g. "16", "N6", "T6". Shown big in the app. */
  gymNumber: string
  /** Stored per machine, not derived from the gym number. */
  brand: string
  model: string
  /** A photo the user takes themselves (later). */
  photo?: Blob
}

/** History, settings and cues belong to the exercise, not the machine or the day. */
export interface Exercise extends Timestamps {
  id: string
  name: string
  /** Empty for exercises without a machine (e.g. bodyweight on the floor). */
  machineId?: string
  /** e.g. "grip 4", "Ninja" */
  variant?: string
  /** Seat, grip and pad positions as one short text, e.g. "seat height 5, back 4". */
  settings: string
  primaryMuscles: Muscle[]
  secondaryMuscles: Muscle[]
  /** The user's own short notes, e.g. "Proud chest". */
  cues: string[]
  startingWeightKg?: number
  weightIncrementKg: number
  loadType: LoadType
}

export interface DayTemplate extends Timestamps {
  id: string
  weekday: Weekday
  name: string
  /** Ordered. Empty means a rest day. */
  exerciseIds: string[]
}

export interface Session extends Timestamps {
  id: string
  /** Local calendar date, "YYYY-MM-DD". */
  date: string
  dayTemplateId: string
}

export interface SetLog extends Timestamps {
  id: string
  sessionId: string
  exerciseId: string
  /** 1, 2 or 3 */
  setNumber: number
  /** Always stored in kg. null for bodyweight. */
  weightKg: number | null
  reps: number
  loggedAt: number
}

export interface AppSettings extends Timestamps {
  id: 'app'
  unit: WeightUnit
}
