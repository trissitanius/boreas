import { useState } from 'react'
import type { Exercise, Machine } from '../db/types'
import { strings } from '../strings'
import { NewExerciseForm } from './NewExerciseForm'
import { Sheet } from './Sheet'

interface Props {
  exercises: Exercise[]
  machines: Map<string, Machine>
  /** Exercises already on the day being edited. */
  onDay: string[]
  onPick: (exerciseId: string) => void
  onClose: () => void
}

const t = strings.picker

/** Sheet to add an exercise to a day: pick an existing one, or create a new one. */
export function ExercisePicker({ exercises, machines, onDay, onPick, onClose }: Props) {
  const [mode, setMode] = useState<'pick' | 'new'>('pick')
  const [query, setQuery] = useState('')

  if (mode === 'new') {
    return (
      <Sheet title={strings.newExercise.title} onClose={onClose}>
        <NewExerciseForm machines={[...machines.values()]} onCreated={onPick} onBack={() => setMode('pick')} />
      </Sheet>
    )
  }

  const q = query.trim().toLowerCase()
  const label = (e: Exercise) => {
    const machine = e.machineId ? machines.get(e.machineId) : undefined
    return { gymNumber: machine?.gymNumber ?? strings.noMachine, text: e.variant ? `${e.name} · ${e.variant}` : e.name }
  }
  const list = exercises
    .map((e) => ({ exercise: e, ...label(e) }))
    .filter(({ text, gymNumber }) => !q || text.toLowerCase().includes(q) || gymNumber.toLowerCase().includes(q))
    .sort((a, b) => a.text.localeCompare(b.text))

  return (
    <Sheet title={t.title} onClose={onClose}>
      <button type="button" className="btn sheet-wide-button picker-new" onClick={() => setMode('new')}>
        {t.newExercise}
      </button>
      <input
        className="picker-search"
        type="search"
        aria-label={t.search}
        placeholder={t.search}
        value={query}
        autoComplete="off"
        onChange={(e) => setQuery(e.target.value)}
      />
      {list.length === 0 && <p className="muted">{t.noResults}</p>}
      <ul className="picker-list">
        {list.map(({ exercise, gymNumber, text }) => {
          const already = onDay.includes(exercise.id)
          return (
            <li key={exercise.id}>
              <button type="button" className="picker-item" disabled={already} onClick={() => onPick(exercise.id)}>
                <span className={`gym-number${gymNumber.length > 3 ? ' small' : ''}`}>{gymNumber}</span>
                <span className="picker-name">{text}</span>
                {already && <span className="picker-on-day">{t.onThisDay}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}
