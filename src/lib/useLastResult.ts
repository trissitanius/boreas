import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { getLastResult, type LastResult } from '../db/repo'

/**
 * The last session of this exercise before today, on any day.
 * undefined while loading, null when there's no history yet.
 */
export function useLastResult(exerciseId: string, today: string): LastResult | null | undefined {
  return useLiveQuery(
    async () => (await getLastResult(db, exerciseId, { before: today })) ?? null,
    [exerciseId, today],
  )
}
