import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'
import { getSetsForDay } from './db/repo'
import type { Weekday } from './db/types'
import { toISODate, weekdayOf } from './lib/dates'
import { strings } from './strings'
import { DayTabs } from './components/DayTabs'
import { ExerciseList } from './components/ExerciseList'
import { ExerciseLogger } from './components/ExerciseLogger'

export function App() {
  const todayWeekday = weekdayOf()
  const today = toISODate()
  const [weekday, setWeekday] = useState<Weekday>(todayWeekday)
  const [exerciseId, setExerciseId] = useState<string | null>(null)

  const data = useLiveQuery(async () => {
    const [templates, exercises, machines] = await Promise.all([
      db.dayTemplates.orderBy('weekday').toArray(),
      db.exercises.toArray(),
      db.machines.toArray(),
    ])
    return {
      templates,
      exercises: new Map(exercises.map((e) => [e.id, e])),
      machines: new Map(machines.map((m) => [m.id, m])),
    }
  })

  const template = data?.templates.find((t) => t.weekday === weekday)
  const todaysSets = useLiveQuery(
    () => (template ? getSetsForDay(db, today, template.id) : []),
    [today, template?.id],
  )

  if (!data || !template) return <main className="app muted">{strings.loading}</main>

  const exercise = exerciseId ? data.exercises.get(exerciseId) : undefined

  return (
    <main className="app">
      {exercise ? (
        <ExerciseLogger
          exercise={exercise}
          machine={exercise.machineId ? data.machines.get(exercise.machineId) : undefined}
          dayTemplateId={template.id}
          date={today}
          sets={(todaysSets ?? []).filter((s) => s.exerciseId === exercise.id)}
          onBack={() => setExerciseId(null)}
        />
      ) : (
        <>
          <h1 className="app-title">{strings.appName}</h1>
          <DayTabs selected={weekday} today={todayWeekday} onSelect={setWeekday} />
          <ExerciseList
            template={template}
            exercises={data.exercises}
            machines={data.machines}
            todaysSets={todaysSets ?? []}
            onOpen={setExerciseId}
          />
        </>
      )}
    </main>
  )
}
