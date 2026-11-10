import { useEffect, useRef, useState } from 'react'
import {
  addRest,
  formatClock,
  REST_OVER_SHOWN_SECONDS,
  REST_SECONDS,
  secondsLeft,
  stopRest,
  useRestEndsAt,
} from '../lib/restTimer'
import { strings } from '../strings'

/** Just the part of the Screen Wake Lock API used here (not on every phone). */
interface WakeLockLike {
  release: () => Promise<void>
}
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockLike> } }

/** The rest countdown, stuck to the bottom of the screen. Shows nothing when no rest is running. */
export function RestTimer() {
  const endsAt = useRestEndsAt()
  const [now, setNow] = useState(() => Date.now())
  const buzzedFor = useRef<number | null>(null)

  // Tick while a rest is on screen.
  useEffect(() => {
    if (endsAt === null) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [endsAt])

  const left = endsAt === null ? 0 : secondsLeft(endsAt, now)
  const running = endsAt !== null && left > 0
  const over = endsAt !== null && !running

  // Keep the screen on while resting, where the phone allows it.
  useEffect(() => {
    if (!running) return
    const wakeLock = (navigator as WakeLockNavigator).wakeLock
    if (!wakeLock) return
    let lock: WakeLockLike | undefined
    let cancelled = false
    const request = () => {
      if (document.visibilityState !== 'visible') return
      wakeLock.request('screen').then(
        (l) => {
          if (cancelled) void l.release().catch(() => {})
          else lock = l
        },
        () => {}, // e.g. battery saver: the timer works without it
      )
    }
    request()
    // The phone drops the lock when the app goes to the background; take it again on return.
    document.addEventListener('visibilitychange', request)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', request)
      void lock?.release().catch(() => {})
    }
  }, [running])

  // Rest over: buzz once (Android; iPhone has no vibration for websites), then hide after a while.
  useEffect(() => {
    if (!over || endsAt === null) return
    if (buzzedFor.current !== endsAt && Date.now() - endsAt < 3000) {
      buzzedFor.current = endsAt
      try {
        navigator.vibrate?.([250, 120, 250])
      } catch {
        // Not allowed: fine.
      }
    }
    const hideIn = Math.max(0, endsAt + REST_OVER_SHOWN_SECONDS * 1000 - Date.now())
    const id = window.setTimeout(stopRest, hideIn)
    return () => window.clearTimeout(id)
  }, [over, endsAt])

  if (endsAt === null) return null

  return (
    <div className={`rest-timer${over ? ' is-over' : ''}`} role="timer" aria-label={strings.restTimer.label}>
      <div className="rest-timer-main">
        <span className="rest-timer-label">{over ? strings.restTimer.over : strings.restTimer.label}</span>
        <span className="rest-timer-clock">{over ? strings.restTimer.go : formatClock(left)}</span>
      </div>
      {running && (
        <button type="button" className="btn btn-small" onClick={() => addRest(30)}>
          {strings.restTimer.add30}
        </button>
      )}
      <button type="button" className="btn btn-small" onClick={stopRest}>
        {over ? strings.restTimer.dismiss : strings.restTimer.skip}
      </button>
      {running && (
        <span
          className="rest-timer-bar"
          aria-hidden="true"
          style={{ transform: `scaleX(${Math.min(1, (endsAt - now) / (REST_SECONDS * 1000))})` }}
        />
      )}
    </div>
  )
}
