// All reads and writes the screens need. Screens call these instead of using Dexie directly.
import Dexie from 'dexie'
import type { BoreasDB } from './db'
import type { Session, SetLog } from './types'
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
