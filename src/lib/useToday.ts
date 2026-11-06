import { useEffect, useMemo, useState } from 'react'
import { toISODate, weekdayOf } from './dates'

/**
 * Today's date and weekday. Rechecks once a minute and whenever the app comes back
 * to the foreground, so it moves to the new day after midnight on its own.
 */
export function useToday() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const check = () =>
      setNow((prev) => {
        const current = new Date()
        return toISODate(current) === toISODate(prev) ? prev : current
      })
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    const timer = window.setInterval(check, 60_000)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', check)
    }
  }, [])

  return useMemo(() => ({ date: toISODate(now), weekday: weekdayOf(now) }), [now])
}
