import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'
import { getSetsForDay } from './db/repo'
import type { Weekday } from './db/types'
import { formatLongDate } from './lib/dates'
import { dayProgress, isRestDay, nextWorkout, templateForWeekday } from './lib/schedule'
import { useToday } from './lib/useToday'
import { strings } from './strings'
import { TodayHeader } from './components/TodayHeader'
import { ExerciseList } from './components/ExerciseList'
import { ExerciseLogger } from './components/ExerciseLogger'
import { OtherDays } from './components/OtherDays'

export function App() {
  const { date: today, weekday: todayWeekday } = useToday()
  /** null = follow today (also after midnight). A weekday = browsing another day. */
  const [otherWeekday, setOtherWeekday] = useState<Weekday | null>(null)
  const [exerciseId, setExerciseId] = useState<string | null>(null)

  const weekday = otherWeekday ?? todayWeekday
  const isToday = weekday === todayWeekday

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

  const template = data ? templateForWeekday(data.templates, weekday) : undefined
  // Sets always belong to today's date, even when logging another day's workout.
  const sets = useLiveQuery(
    () => (template ? getSetsForDay(db, today, template.id) : []),
    [today, template?.id],
  )

  if (!data || !template) return <main className="app muted">{strings.loading}</main>

  const exercise = exerciseId ? data.exercises.get(exerciseId) : undefined
  if (exercise) {
    return (
      <main className="app">
        <ExerciseLogger
          exercise={exercise}
          machine={exercise.machineId ? data.machines.get(exercise.machineId) : undefined}
          dayTemplateId={template.id}
          date={today}
          sets={(sets ?? []).filter((s) => s.exerciseId === exercise.id)}
          onBack={() => setExerciseId(null)}
        />
      </main>
    )
  }

  const rest = isRestDay(template)
  const progress = dayProgress(template, sets ?? [])
  const next = rest ? nextWorkout(data.templates, weekday) : undefined
  const nextWorkoutText = next
    ? strings.nextWorkout(strings.weekdaysLong[next.template.weekday - 1], next.template.name) +
      (isToday ? ` (${next.daysAway === 1 ? strings.tomorrow : strings.inDays(next.daysAway)})` : '')
    : undefined

  return (
    <main className="app">
      <TodayHeader
        kicker={isToday ? formatLongDate(today) : strings.weekdaysLong[weekday - 1]}
        title={rest ? strings.restDay : template.name}
        sub={rest ? undefined : strings.dayProgress(progress.done, progress.total)}
      >
        {!isToday && (
          <button type="button" className="back-button page-back" onClick={() => setOtherWeekday(null)}>
            {strings.backToToday}
          </button>
        )}
      </TodayHeader>

      <ExerciseList
        template={template}
        exercises={data.exercises}
        machines={data.machines}
        sets={sets ?? []}
        nextWorkoutText={nextWorkoutText}
        onOpen={setExerciseId}
      />

      <OtherDays
        templates={data.templates}
        viewing={weekday}
        today={todayWeekday}
        onSelect={(w) => setOtherWeekday(w === todayWeekday ? null : w)}
      />
    </main>
  )
}
