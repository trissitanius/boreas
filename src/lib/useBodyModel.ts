import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { BodyModel } from '../db/types'

/** Which body the muscle map shows on this phone (male by default), and a way to change it. */
export function useBodyModel(): [BodyModel, (model: BodyModel) => void] {
  const model = useLiveQuery(async () => (await db.settings.get('app'))?.bodyModel) ?? 'male'
  const set = (next: BodyModel) => void db.settings.update('app', { bodyModel: next, updatedAt: Date.now() })
  return [model, set]
}
