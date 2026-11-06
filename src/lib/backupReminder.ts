export const BACKUP_REMINDER_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

/** Show a gentle "back up" reminder once there are workouts and no backup in the last 7 days. */
export function needsBackupReminder({
  lastBackupAt,
  sessionCount,
  now = Date.now(),
}: {
  lastBackupAt?: number
  sessionCount: number
  now?: number
}): boolean {
  if (sessionCount === 0) return false
  if (lastBackupAt === undefined) return true
  return now - lastBackupAt > BACKUP_REMINDER_DAYS * DAY_MS
}
