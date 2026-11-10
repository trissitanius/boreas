import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'
import { getLastResult, getSetsForDay } from './db/repo'
import { progression } from './lib/progression'
import type { Weekday } from './db/types'
import { formatLongDate, weekdayOfISO } from './lib/dates'
import { formatShortDate } from './lib/format'
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
import { HistoryScreen } from './components/HistoryScreen'
import { RestTimer } from './components/RestTimer'

export function App() {
  const { date: today, weekday: todayWeekday } = useToday()
  /** null = today (also after midnight). A date = logging or editing a past workout. */
  const [workDate, setWorkDate] = useState<string | null>(null)
  /** null = the date's own workout from the plan. A weekday = doing another day's workout. */
  const [otherWeekday, setOtherWeekday] = useState<Weekday | null>(null)
  const [exerciseId, setExerciseId] = useState<string | null>(null)
  const [editingDay, setEditingDay] = useState(false)
  const [showBackup, setShowBackup] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  // If the data hasn't loaded after a few seconds, show checks and "Try again" instead of "Loading…" forever.
  // With no browser storage at all (a phone setting), show the help right away.
  const [slowLoad, setSlowLoad] = useState(() => typeof indexedDB === 'undefined' || indexedDB === null)

  /** Opens an exercise (or goes back to the list with null), starting at the top of the screen. */
  function openExercise(id: string | null) {
    setExerciseId(id)
    window.scrollTo(0, 0)
  }

  /** Opens a date (today → back to today) with a given workout, or the date's own one. */
  function openDate(date: string, weekday?: Weekday) {
    const past = date < today
    setWorkDate(past ? date : null)
    const own = past ? weekdayOfISO(date) : todayWeekday
    setOtherWeekday(weekday !== undefined && weekday !== own ? weekday : null)
    setExerciseId(null)
    setShowHistory(false)
    window.scrollTo(0, 0)
  }

  // Every set is saved under this date: today, or the past date being logged.
  const date = workDate ?? today
  const isPast = workDate !== null
  const dateWeekday = isPast ? weekdayOfISO(date) : todayWeekday
  const weekday = otherWeekday ?? dateWeekday
  const isToday = !isPast && weekday === todayWeekday

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
  // Sets belong to the date on screen, even when doing another day's workout.
  const sets = useLiveQuery(
    () => (template ? getSetsForDay(db, date, template.id) : []),
    [date, template?.id],
  )

  // Exercises of this day whose last session (before this date, any day) earned "Increase weight".
  const flagged = useLiveQuery(async () => {
    if (!data || !template) return new Set<string>()
    const ids = [...new Set(template.exerciseIds)]
    const due = await Promise.all(
      ids.map(async (id) => {
        const exercise = data.exercises.get(id)
        if (!exercise) return null
        return progression(await getLastResult(db, id, { before: date }), exercise) ? id : null
      }),
    )
    return new Set(due.filter((id): id is string => id !== null))
  }, [data, template?.id, date])

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

  if (showHistory) {
    return (
      <main className="app">
        <HistoryScreen
          today={today}
          exercises={data.exercises}
          onClose={() => {
            setShowHistory(false)
            window.scrollTo(0, 0)
          }}
          onOpen={(entry) => {
            const day = data.templates.find((t) => t.id === entry.dayTemplateId)
            openDate(entry.date, day?.weekday)
          }}
          onLogDate={(d) => openDate(d)}
        />
      </main>
    )
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

  // Exercises logged on this date but since removed from the day still show, at the end.
  const extraIds = [...new Set((sets ?? []).map((s) => s.exerciseId))].filter(
    (id) => !template.exerciseIds.includes(id) && data.exercises.has(id),
  )
  const day = extraIds.length > 0 ? { ...template, exerciseIds: [...template.exerciseIds, ...extraIds] } : template
  const pastBanner = isPast ? (
    <div className="past-banner">
      <span className="past-banner-text">
        <span className="past-banner-label">{strings.history.pastLabel}</span>
        {formatShortDate(date)}
      </span>
      <button type="button" className="btn btn-small" onClick={() => openDate(today)}>
        {strings.history.backToToday}
      </button>
    </div>
  ) : null

  const exercise = exerciseId ? data.exercises.get(exerciseId) : undefined
  if (exercise) {
    // The next unfinished exercise of the day, not counting the one on screen.
    const nextId = nextUpExerciseId(
      { ...day, exerciseIds: day.exerciseIds.filter((id) => id !== exercise.id) },
      sets ?? [],
    )
    return (
      <main className="app">
        {pastBanner}
        <ExerciseLogger
          key={exercise.id}
          exercise={exercise}
          machine={exercise.machineId ? data.machines.get(exercise.machineId) : undefined}
          dayTemplateId={template.id}
          date={date}
          sets={(sets ?? []).filter((s) => s.exerciseId === exercise.id)}
          next={nextId ? data.exercises.get(nextId) : undefined}
          onNext={() => openExercise(nextId ?? null)}
          onBack={() => openExercise(null)}
        />
        <RestTimer />
      </main>
    )
  }

  const rest = isRestDay(day)
  const progress = dayProgress(day, sets ?? [])
  const nextUpId = rest ? undefined : nextUpExerciseId(day, sets ?? [])
  const nextUp = nextUpId ? data.exercises.get(nextUpId) : undefined
  const next = rest ? nextWorkout(data.templates, weekday) : undefined
  const nextWorkoutText = next
    ? strings.nextWorkout(strings.weekdaysLong[next.template.weekday - 1], next.template.name) +
      (isToday ? ` (${next.daysAway === 1 ? strings.tomorrow : strings.inDays(next.daysAway)})` : '')
    : undefined

  return (
    <main className="app">
      <TodayHeader
        kicker={isToday || isPast ? formatLongDate(date) : strings.weekdaysLong[weekday - 1]}
        title={rest ? strings.restDay : template.name}
        sub={rest ? undefined : strings.dayProgress(progress.done, progress.total)}
      >
        {!isToday && !isPast && (
          <button type="button" className="back-button page-back" onClick={() => setOtherWeekday(null)}>
            {strings.backToToday}
          </button>
        )}
      </TodayHeader>

      {pastBanner}

      {!isPast && backupInfo && needsBackupReminder(backupInfo) && (
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
          today={date}
          onOpen={openExercise}
        />
      )}

      <ExerciseList
        template={day}
        exercises={data.exercises}
        machines={data.machines}
        sets={sets ?? []}
        flagged={flagged}
        nextWorkoutText={nextWorkoutText}
        onOpen={openExercise}
      />

      {!isPast && (
        <div className="today-tools">
          <button
            type="button"
            className="btn btn-small"
            onClick={() => {
              setShowHistory(true)
              window.scrollTo(0, 0)
            }}
          >
            {strings.history.button}
          </button>
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
      )}

      <OtherDays
        templates={data.templates}
        viewing={weekday}
        today={dateWeekday}
        onSelect={(w) => setOtherWeekday(w === dateWeekday ? null : w)}
      />
      <RestTimer />
    </main>
  )
}
