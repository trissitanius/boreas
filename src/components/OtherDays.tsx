import type { DayTemplate, Weekday } from '../db/types'
import { isRestDay, templateForWeekday } from '../lib/schedule'
import { strings } from '../strings'

interface Props {
  templates: DayTemplate[]
  /** The weekday on screen right now. */
  viewing: Weekday
  today: Weekday
  onSelect: (weekday: Weekday) => void
}

export function OtherDays({ templates, viewing, today, onSelect }: Props) {
  return (
    <nav className="other-days" aria-label={strings.otherDays}>
      <h2 className="section-label">{strings.otherDays}</h2>
      <div className="other-days-grid">
        {strings.weekdaysShort.map((label, i) => {
          const weekday = (i + 1) as Weekday
          const template = templateForWeekday(templates, weekday)
          const name = !template || isRestDay(template) ? strings.rest : template.name
          return (
            <button
              key={weekday}
              type="button"
              className="other-day"
              aria-pressed={weekday === viewing}
              onClick={() => onSelect(weekday)}
            >
              <span className="other-day-label">
                {label}
                {weekday === today && <span className="is-today" aria-label={strings.today} />}
              </span>
              <span className="other-day-name">{name}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
