// All reads and writes the screens need. Screens call these instead of using Dexie directly.
import Dexie from 'dexie'
import type { BoreasDB } from './db'
import type { LoadType, Session, SetLog } from './types'
import { MUSCLES, type Muscle } from './muscles'
import { newId } from '../lib/ids'
import { isValidReps, isValidWeightKg } from '../lib/parse'

export const SETS_PER_EXERCISE = 3

/** Finds the session for this date and day, or creates it. Never creates a second one. */
export async function getOrCreateSession(
  db: BoreasDB,
  date: string,
  dayTemplateId: string,
): Promise<Session> {
  return db.transaction('rw', db.sessions, async () => {
    const existing = await db.sessions.where('[date+dayTemplateId]').equals([date, dayTemplateId]).first()
    if (existing) return existing
    const now = Date.now()
    const session: Session = { id: newId(), date, dayTemplateId, createdAt: now, updatedAt: now }
    await db.sessions.add(session)
    return session
  })
}

export interface LogSetInput {
  exerciseId: string
  dayTemplateId: string
  /** "YYYY-MM-DD" */
  date: string
  setNumber: number
  /** In kg. Ignored (stored as null) for bodyweight exercises. */
  weightKg: number | null
  reps: number
  /** Defaults to now. */
  loggedAt?: number
}

function checkSetNumber(n: number) {
  if (!Number.isInteger(n) || n < 1 || n > SETS_PER_EXERCISE) {
    throw new Error(`Set number must be 1–${SETS_PER_EXERCISE}, got ${n}`)
  }
}

function checkReps(reps: number) {
  if (!isValidReps(reps)) throw new Error(`Invalid reps: ${reps}`)
}

function checkWeight(weightKg: number | null, bodyweight: boolean) {
  if (bodyweight) return
  if (weightKg === null || !isValidWeightKg(weightKg)) throw new Error(`Invalid weight: ${weightKg}`)
}

/**
 * Saves one set. If that set number was already logged for this exercise in this session,
 * it is replaced (so re-saving fixes a typo instead of adding a duplicate).
 */
export async function logSet(db: BoreasDB, input: LogSetInput): Promise<SetLog> {
  checkSetNumber(input.setNumber)
  checkReps(input.reps)

  return db.transaction('rw', db.sessions, db.setLogs, db.exercises, async () => {
    const exercise = await db.exercises.get(input.exerciseId)
    if (!exercise) throw new Error(`Unknown exercise: ${input.exerciseId}`)
    const bodyweight = exercise.loadType === 'bodyweight'
    checkWeight(input.weightKg, bodyweight)

    const session = await getOrCreateSession(db, input.date, input.dayTemplateId)
    const now = Date.now()
    const existing = await db.setLogs
      .where('sessionId')
      .equals(session.id)
      .filter((s) => s.exerciseId === input.exerciseId && s.setNumber === input.setNumber)
      .first()

    const log: SetLog = {
      id: existing?.id ?? newId(),
      sessionId: session.id,
      exerciseId: input.exerciseId,
      setNumber: input.setNumber,
      weightKg: bodyweight ? null : input.weightKg,
      reps: input.reps,
      loggedAt: input.loggedAt ?? now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await db.setLogs.put(log)
    return log
  })
}

/** Changes the weight and/or reps of a saved set. */
export async function updateSet(
  db: BoreasDB,
  id: string,
  changes: { weightKg?: number | null; reps?: number },
): Promise<void> {
  await db.transaction('rw', db.setLogs, db.exercises, async () => {
    const log = await db.setLogs.get(id)
    if (!log) throw new Error(`Unknown set: ${id}`)
    const exercise = await db.exercises.get(log.exerciseId)
    const bodyweight = exercise?.loadType === 'bodyweight'
    if (changes.reps !== undefined) checkReps(changes.reps)
    if (changes.weightKg !== undefined) checkWeight(changes.weightKg, bodyweight)
    await db.setLogs.update(id, {
      ...(changes.reps !== undefined ? { reps: changes.reps } : {}),
      ...(changes.weightKg !== undefined ? { weightKg: bodyweight ? null : changes.weightKg } : {}),
      updatedAt: Date.now(),
    })
  })
}

export async function deleteSet(db: BoreasDB, id: string): Promise<void> {
  await db.setLogs.delete(id)
}

/** All sets logged in the session for this date and day (empty if there is no session yet). */
export async function getSetsForDay(db: BoreasDB, date: string, dayTemplateId: string): Promise<SetLog[]> {
  const session = await db.sessions.where('[date+dayTemplateId]').equals([date, dayTemplateId]).first()
  if (!session) return []
  return db.setLogs.where('sessionId').equals(session.id).sortBy('setNumber')
}

export interface LastResult {
  date: string
  dayTemplateId: string
  dayName: string
  sets: { setNumber: number; weightKg: number | null; reps: number }[]
}

/**
 * The most recent session of this exercise on ANY day, with its sets in order.
 * This is the app's core rule: history belongs to the exercise, not the day.
 *
 * "Most recent" means the latest session date (then the latest logging time on that date).
 * `before: "YYYY-MM-DD"` only looks at sessions before that date, so while you log today,
 * "last time" keeps showing your previous session instead of today's half-finished one.
 */
export async function getLastResult(
  db: BoreasDB,
  exerciseId: string,
  options: { before?: string } = {},
): Promise<LastResult | undefined> {
  const logs = await db.setLogs
    .where('[exerciseId+loggedAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .toArray()
  if (logs.length === 0) return undefined

  const sessionIds = [...new Set(logs.map((l) => l.sessionId))]
  const sessions = (await db.sessions.bulkGet(sessionIds)).filter(
    (s): s is Session => s !== undefined && (options.before === undefined || s.date < options.before),
  )
  if (sessions.length === 0) return undefined

  const latestLogAt = (sessionId: string) =>
    Math.max(...logs.filter((l) => l.sessionId === sessionId).map((l) => l.loggedAt))
  sessions.sort((a, b) => b.date.localeCompare(a.date) || latestLogAt(b.id) - latestLogAt(a.id))
  const session = sessions[0]

  const day = await db.dayTemplates.get(session.dayTemplateId)
  const sets = logs.filter((l) => l.sessionId === session.id).sort((a, b) => a.setNumber - b.setNumber)

  return {
    date: session.date,
    dayTemplateId: session.dayTemplateId,
    dayName: day?.name ?? '',
    sets: sets.map((s) => ({ setNumber: s.setNumber, weightKg: s.weightKg, reps: s.reps })),
  }
}

export const LIMITS = {
  settingsLength: 200,
  cueLength: 120,
  cueCount: 12,
  minIncrementKg: 0.1,
  maxIncrementKg: 50,
  defaultIncrementKg: 2.5,
}

export interface ExerciseChanges {
  settings?: string
  cues?: string[]
  weightIncrementKg?: number
}

/** Tidies cues: trimmed, no empty ones, no duplicates, capped in number and length. */
export function cleanCues(cues: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of cues) {
    const cue = raw.trim().slice(0, LIMITS.cueLength)
    const key = cue.toLowerCase()
    if (!cue || seen.has(key)) continue
    seen.add(key)
    result.push(cue)
    if (result.length === LIMITS.cueCount) break
  }
  return result
}

/** Saves an exercise's settings, cues and/or weight step. Throws (and saves nothing) on invalid input. */
export async function updateExercise(db: BoreasDB, id: string, changes: ExerciseChanges): Promise<void> {
  const step = changes.weightIncrementKg
  if (step !== undefined) checkStep(step)
  await db.transaction('rw', db.exercises, async () => {
    const exercise = await db.exercises.get(id)
    if (!exercise) throw new Error(`Unknown exercise: ${id}`)
    await db.exercises.update(id, {
      ...(changes.settings !== undefined ? { settings: changes.settings.trim().slice(0, LIMITS.settingsLength) } : {}),
      ...(changes.cues !== undefined ? { cues: cleanCues(changes.cues) } : {}),
      ...(step !== undefined ? { weightIncrementKg: step } : {}),
      updatedAt: Math.max(Date.now(), exercise.updatedAt + 1),
    })
  })
}

// ---------- Day editor: days, new machines, new exercises ----------

export const EDITOR_LIMITS = {
  dayNameLength: 40,
  exercisesPerDay: 20,
  gymNumberLength: 10,
  brandLength: 40,
  modelLength: 80,
  exerciseNameLength: 60,
  variantLength: 40,
}

const LOAD_TYPES: LoadType[] = ['stack', 'dumbbell', 'plate', 'bodyweight']

function checkStep(step: number) {
  if (!(Number.isFinite(step) && step >= LIMITS.minIncrementKg && step <= LIMITS.maxIncrementKg)) {
    throw new Error(`Invalid weight step: ${step}`)
  }
}

/** Renames a day and/or sets its exercises (in order). An empty list makes it a rest day. */
export async function updateDayTemplate(
  db: BoreasDB,
  id: string,
  changes: { name?: string; exerciseIds?: string[] },
): Promise<void> {
  const name = changes.name?.trim()
  if (name !== undefined && (name.length === 0 || name.length > EDITOR_LIMITS.dayNameLength)) {
    throw new Error('Day name must be 1–40 characters')
  }
  const exerciseIds = changes.exerciseIds ? [...new Set(changes.exerciseIds)] : undefined
  if (exerciseIds && exerciseIds.length > EDITOR_LIMITS.exercisesPerDay) {
    throw new Error(`At most ${EDITOR_LIMITS.exercisesPerDay} exercises per day`)
  }
  await db.transaction('rw', db.dayTemplates, db.exercises, async () => {
    const day = await db.dayTemplates.get(id)
    if (!day) throw new Error(`Unknown day: ${id}`)
    if (exerciseIds) {
      const found = await db.exercises.bulkGet(exerciseIds)
      const missing = exerciseIds.filter((_, i) => !found[i])
      if (missing.length) throw new Error(`Unknown exercises: ${missing.join(', ')}`)
    }
    await db.dayTemplates.update(id, {
      ...(name !== undefined ? { name } : {}),
      ...(exerciseIds ? { exerciseIds } : {}),
      updatedAt: Math.max(Date.now(), day.updatedAt + 1),
    })
  })
}

export interface NewMachine {
  gymNumber: string
  brand: string
  model: string
}

/** Adds a machine. The gym number must be unique (case doesn't matter). Returns the new id. */
export async function createMachine(db: BoreasDB, input: NewMachine): Promise<string> {
  const gymNumber = input.gymNumber.trim()
  const brand = input.brand.trim()
  const model = input.model.trim()
  if (!gymNumber || gymNumber.length > EDITOR_LIMITS.gymNumberLength) throw new Error('Gym number must be 1–10 characters')
  if (!brand || brand.length > EDITOR_LIMITS.brandLength) throw new Error('Brand must be 1–40 characters')
  if (model.length > EDITOR_LIMITS.modelLength) throw new Error('Model is too long')

  return db.transaction('rw', db.machines, async () => {
    const all = await db.machines.toArray()
    if (all.some((m) => m.gymNumber.toLowerCase() === gymNumber.toLowerCase())) {
      throw new Error(`Machine ${gymNumber} already exists`)
    }
    const now = Date.now()
    const id = newId()
    await db.machines.add({ id, gymNumber, brand, model, createdAt: now, updatedAt: now })
    return id
  })
}

export interface NewExercise {
  name: string
  machineId?: string
  variant?: string
  settings?: string
  loadType: LoadType
  primaryMuscles: Muscle[]
  secondaryMuscles?: Muscle[]
  weightIncrementKg?: number
  cues?: string[]
}

/** Adds an exercise (it starts with no history). Returns the new id. */
export async function createExercise(db: BoreasDB, input: NewExercise): Promise<string> {
  const name = input.name.trim()
  if (!name || name.length > EDITOR_LIMITS.exerciseNameLength) throw new Error('Name must be 1–60 characters')
  if (!LOAD_TYPES.includes(input.loadType)) throw new Error(`Invalid load type: ${input.loadType}`)
  const allowed = new Set<string>(MUSCLES)
  const all = [...input.primaryMuscles, ...(input.secondaryMuscles ?? [])]
  const unknown = all.filter((m) => !allowed.has(m))
  if (unknown.length) throw new Error(`Unknown muscles: ${unknown.join(', ')}`)
  const primaryMuscles = [...new Set(input.primaryMuscles)]
  if (primaryMuscles.length === 0) throw new Error('Pick at least one primary muscle')
  const secondaryMuscles = [...new Set(input.secondaryMuscles ?? [])].filter((m) => !primaryMuscles.includes(m))
  const step = input.weightIncrementKg ?? LIMITS.defaultIncrementKg
  checkStep(step)
  const variant = input.variant?.trim().slice(0, EDITOR_LIMITS.variantLength)

  return db.transaction('rw', db.exercises, db.machines, async () => {
    if (input.machineId && !(await db.machines.get(input.machineId))) {
      throw new Error(`Unknown machine: ${input.machineId}`)
    }
    const now = Date.now()
    const id = newId()
    await db.exercises.add({
      id,
      name,
      ...(input.machineId ? { machineId: input.machineId } : {}),
      ...(variant ? { variant } : {}),
      settings: (input.settings ?? '').trim().slice(0, LIMITS.settingsLength),
      primaryMuscles,
      secondaryMuscles,
      cues: cleanCues(input.cues ?? []),
      weightIncrementKg: step,
      loadType: input.loadType,
      createdAt: now,
      updatedAt: now,
    })
    return id
  })
}
