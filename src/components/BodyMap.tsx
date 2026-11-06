// The body diagram (react-muscle-highlighter): front and back, primary muscles Ember, secondary Frozen.
// Loaded on its own (see LazyBodyMap.tsx), only inside the tracker.
import Body, { type ExtendedBodyPart, type Slug } from 'react-muscle-highlighter'
import type { BodyModel } from '../db/types'
import { regionRoles, type MuscleSelection, type View } from '../lib/muscleMap'
import { strings } from '../strings'

export interface BodyMapProps {
  selection: MuscleSelection
  model: BodyModel
  /** Given in painting mode: called with the tapped view and region name. */
  onRegionTap?: (view: View, region: string) => void
}

/** Every part the map can draw. Each gets a fill from us, so none keeps the component's own grey. */
const ALL_PARTS: Slug[] = [
  'abs', 'adductors', 'ankles', 'biceps', 'calves', 'chest', 'deltoids', 'feet', 'forearm', 'gluteal',
  'hamstring', 'hands', 'hair', 'head', 'knees', 'lower-back', 'neck', 'obliques', 'quadriceps',
  'tibialis', 'trapezius', 'triceps', 'upper-back',
]
/** Parts that aren't muscles: drawn a little lighter, never coloured. */
const NOT_MUSCLES = new Set<Slug>(['ankles', 'feet', 'hands', 'hair', 'head', 'knees', 'neck', 'tibialis'])

/** Colours come from the CSS variables, so the palette stays in one place. */
function palette() {
  const css = getComputedStyle(document.documentElement)
  const get = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  return {
    primary: get('--ember', '#FF7A45'),
    secondary: get('--frozen', '#A0BDDB'),
    base: get('--body-base', '#262e45'),
    other: get('--body-other', '#343d58'),
    outline: get('--body-outline', 'rgba(160, 189, 219, 0.35)'),
  }
}

export default function BodyMap({ selection, model, onRegionTap }: BodyMapProps) {
  const colors = palette()
  const names = (list: string[]) =>
    list.length ? list.map((m) => strings.muscles[m as keyof typeof strings.muscles]).join(', ') : strings.muscleMap.none
  const views: View[] = ['front', 'back']

  return (
    <div
      className={`body-maps${onRegionTap ? ' is-editing' : ''}`}
      role="img"
      aria-label={strings.muscleMap.label(names(selection.primary), names(selection.secondary))}
    >
      {views.map((view) => {
        const roles = new Map<string, string>(regionRoles(view, selection).map(({ region, role }) => [region, role]))
        const data: ExtendedBodyPart[] = ALL_PARTS.map((slug) => {
          const role = roles.get(slug)
          const fill = role === 'primary' ? colors.primary : role === 'secondary' ? colors.secondary : NOT_MUSCLES.has(slug) ? colors.other : colors.base
          return { slug, styles: { fill } }
        })
        return (
          <figure key={view} className="body-map">
            <Body
              data={data}
              side={view}
              gender={model}
              defaultFill={colors.base}
              border={colors.outline}
              onBodyPartPress={onRegionTap ? (part) => part.slug && onRegionTap(view, part.slug) : undefined}
            />
            <figcaption>{view === 'front' ? strings.muscleMap.front : strings.muscleMap.back}</figcaption>
          </figure>
        )
      })}
    </div>
  )
}
