import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'
import { getLastResult, getSetsForDay } from './db/repo'
import { progression } from './lib/progression'
import type { Weekday } from './db/types'
import { formatLongDate } from './lib/dates'
import { dayProgress, isRestDay, nextUpExerciseId, nextWorkout, templateForWeekday } from './lib/schedule'
import { useToday } from './lib/useToday'
import { strings } from './strings'
import { TodayHeader } from './components/TodayHeader'
import { ExerciseList } from './components/ExerciseList'
import { ExerciseLogger } from './components/ExerciseLogger'
import { OtherDays } from './components/OtherDays'
import { NextUpCard } from './components/NextUpCard'
import { DayEditor } from './components/DayEditor'
import { BackupScreen, formatLastBackup } from './components/BackupScreen'
import { needsBackupReminder } from './lib/backupReminder'
import { StorageTrouble } from './components/StorageTrouble'

export function App() {
  const { date: today, weekday: todayWeekday } = useToday()
  /** null = follow today (also after midnight). A weekday = browsing another day. */
  const [otherWeekday, setOtherWeekday] = useState<Weekday | null>(null)
  const [exerciseId, setExerciseId] = useState<string | null>(null)
  const [editingDay, setEditingDay] = useState(false)
  const [showBackup, setShowBackup] = useState(false)
  // If the data hasn't loaded after a few seconds, show checks and "Try again" instead of "Loading…" forever.
  const [slowLoad, setSlowLoad] = useState(false)

  /** Opens an exercise (or goes back to the list with null), starting at the top of the screen. */
  function openExercise(id: string | null) {
    setExerciseId(id)
    window.scrollTo(0, 0)
  }

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

  // Exercises of this day whose last session (before today, any day) earned "Increase weight".
  const flagged = useLiveQuery(async () => {
    if (!data || !template) return new Set<string>()
    const ids = [...new Set(template.exerciseIds)]
    const due = await Promise.all(
      ids.map(async (id) => {
        const exercise = data.exercises.get(id)
        if (!exercise) return null
        return progression(await getLastResult(db, id, { before: today }), exercise) ? id : null
      }),
    )
    return new Set(due.filter((id): id is string => id !== null))
  }, [data, template?.id, today])

  const loaded = data !== undefined
  useEffect(() => {
    if (loaded) return
    const id = window.setTimeout(() => setSlowLoad(true), 6000)
    return () => window.clearTimeout(id)
  }, [loaded])

  // For the gentle "back up" reminder.
  const backupInfo = useLiveQuery(async () => ({
    lastBackupAt: (await db.settings.get('app'))?.lastBackupAt,
    sessionCount: await db.sessions.count(),
  }))

  if (!data || !template) {
    return <main className="app">{slowLoad ? <StorageTrouble /> : <span className="muted">{strings.loading}</span>}</main>
  }

  if (showBackup) {
    return (
      <main className="app">
        <BackupScreen
          today={today}
          onClose={() => {
            setShowBackup(false)
            window.scrollTo(0, 0)
          }}
        />
      </main>
    )
  }

  if (editingDay) {
    return (
      <main className="app">
        <DayEditor
          key={template.id}
          template={template}
          exercises={data.exercises}
          machines={data.machines}
          onClose={() => {
            setEditingDay(false)
            window.scrollTo(0, 0)
          }}
        />
      </main>
    )
  }

  const exercise = exerciseId ? data.exercises.get(exerciseId) : undefined
  if (exercise) {
    // The next unfinished exercise of the day, not counting the one on screen.
    const nextId = nextUpExerciseId(
      { ...template, exerciseIds: template.exerciseIds.filter((id) => id !== exercise.id) },
      sets ?? [],
    )
    return (
      <main className="app">
        <ExerciseLogger
          key={exercise.id}
          exercise={exercise}
          machine={exercise.machineId ? data.machines.get(exercise.machineId) : undefined}
          dayTemplateId={template.id}
          date={today}
          sets={(sets ?? []).filter((s) => s.exerciseId === exercise.id)}
          next={nextId ? data.exercises.get(nextId) : undefined}
          onNext={() => openExercise(nextId ?? null)}
          onBack={() => openExercise(null)}
        />
      </main>
    )
  }

  const rest = isRestDay(template)
  const progress = dayProgress(template, sets ?? [])
  const nextUpId = rest ? undefined : nextUpExerciseId(template, sets ?? [])
  const nextUp = nextUpId ? data.exercises.get(nextUpId) : undefined
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

      {backupInfo && needsBackupReminder(backupInfo) && (
        <p className="backup-reminder">
          {strings.backup.reminder(formatLastBackup(backupInfo.lastBackupAt, today))} ·{' '}
          <button type="button" className="link-button" onClick={() => setShowBackup(true)}>
            {strings.backup.backUpNow}
          </button>
        </p>
      )}

      {!rest && sets !== undefined && (
        <NextUpCard
          exercise={nextUp}
          machine={nextUp?.machineId ? data.machines.get(nextUp.machineId) : undefined}
          today={today}
          onOpen={openExercise}
        />
      )}

      <ExerciseList
        template={template}
        exercises={data.exercises}
        machines={data.machines}
        sets={sets ?? []}
        flagged={flagged}
        nextWorkoutText={nextWorkoutText}
        onOpen={openExercise}
      />

      <div className="today-tools">
        <button
          type="button"
          className="btn btn-small"
          onClick={() => {
            setEditingDay(true)
            window.scrollTo(0, 0)
          }}
        >
          {strings.dayEditor.editDay}
        </button>
        <button
          type="button"
          className="btn btn-small"
          onClick={() => {
            setShowBackup(true)
            window.scrollTo(0, 0)
          }}
        >
          {strings.backup.button}
        </button>
      </div>

      <OtherDays
        templates={data.templates}
        viewing={weekday}
        today={todayWeekday}
        onSelect={(w) => setOtherWeekday(w === todayWeekday ? null : w)}
      />
    </main>
  )
}
