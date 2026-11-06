import type { Weekday } from '../db/types'
import { strings } from '../strings'

interface Props {
  selected: Weekday
  today: Weekday
  onSelect: (weekday: Weekday) => void
}

export function DayTabs({ selected, today, onSelect }: Props) {
  return (
    <nav className="day-tabs">
      {strings.weekdaysShort.map((label, i) => {
        const weekday = (i + 1) as Weekday
        return (
          <button
            key={weekday}
            type="button"
            className="day-tab"
            aria-pressed={weekday === selected}
            aria-label={weekday === today ? `${label} (${strings.today})` : label}
            onClick={() => onSelect(weekday)}
          >
            {label}
            {weekday === today && <span className="is-today" aria-hidden="true" />}
          </button>
        )
      })}
    </nav>
  )
}
