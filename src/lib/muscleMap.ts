// Links our 22 muscles to the regions of the body map (react-muscle-highlighter),
// and the "paint" rules for editing an exercise's primary/secondary muscles.
import type { Muscle } from '../db/muscles'

export type View = 'front' | 'back'

/** The map's own region names that we use. */
export type Region =
  | 'chest'
  | 'deltoids'
  | 'trapezius'
  | 'upper-back'
  | 'lower-back'
  | 'biceps'
  | 'triceps'
  | 'forearm'
  | 'abs'
  | 'obliques'
  | 'gluteal'
  | 'quadriceps'
  | 'hamstring'
  | 'adductors'
  | 'calves'

/** Which of our muscles each region stands for, per view. A region can cover several muscles. */
export const REGION_MUSCLES: Record<View, Partial<Record<Region, Muscle[]>>> = {
  front: {
    chest: ['chest', 'upper-chest'],
    deltoids: ['front-delts', 'side-delts'],
    trapezius: ['traps'],
    biceps: ['biceps'],
    triceps: ['triceps'],
    forearm: ['forearms'],
    abs: ['abs'],
    obliques: ['obliques'],
    quadriceps: ['quads'],
    adductors: ['adductors'],
    calves: ['calves'],
  },
  back: {
    deltoids: ['rear-delts', 'side-delts'],
    trapezius: ['traps'],
    'upper-back': ['lats', 'upper-back', 'mid-back'],
    'lower-back': ['lower-back'],
    triceps: ['triceps'],
    forearm: ['forearms'],
    gluteal: ['glutes'],
    hamstring: ['hamstrings'],
    adductors: ['adductors'],
    calves: ['calves'],
  },
}

/** Our muscles that the map has no region for; they're shown as chips under the body. */
export const OFF_MAP: Muscle[] = ['hip-flexors', 'abductors']

export type Role = 'primary' | 'secondary'

export interface MuscleSelection {
  primary: Muscle[]
  secondary: Muscle[]
}

/** The muscles a tapped region stands for (empty for non-muscle parts like head or hands). */
export function musclesForRegion(view: View, region: string): Muscle[] {
  return REGION_MUSCLES[view][region as Region] ?? []
}

/** A region shows Ember if any of its muscles is primary, otherwise Frozen if any is secondary. */
export function regionRole(view: View, region: Region, selection: MuscleSelection): Role | undefined {
  const muscles = REGION_MUSCLES[view][region] ?? []
  if (muscles.some((m) => selection.primary.includes(m))) return 'primary'
  if (muscles.some((m) => selection.secondary.includes(m))) return 'secondary'
  return undefined
}

/** Every coloured region of one view: [{ region, role }]. */
export function regionRoles(view: View, selection: MuscleSelection): { region: Region; role: Role }[] {
  return (Object.keys(REGION_MUSCLES[view]) as Region[]).flatMap((region) => {
    const role = regionRole(view, region, selection)
    return role ? [{ region, role }] : []
  })
}

export type Brush = Role | 'erase'

/**
 * Paints muscles with a brush. A muscle is never both primary and secondary:
 * painting it primary takes it out of secondary, and the other way round. Erase removes it from both.
 */
export function paint(selection: MuscleSelection, muscles: Muscle[], brush: Brush): MuscleSelection {
  const without = (list: Muscle[]) => list.filter((m) => !muscles.includes(m))
  const add = (list: Muscle[]) => [...list, ...muscles.filter((m) => !list.includes(m))]
  if (brush === 'primary') return { primary: add(selection.primary), secondary: without(selection.secondary) }
  if (brush === 'secondary') return { primary: without(selection.primary), secondary: add(selection.secondary) }
  return { primary: without(selection.primary), secondary: without(selection.secondary) }
}

/** The role one muscle has right now. */
export function roleOf(muscle: Muscle, selection: MuscleSelection): Role | undefined {
  if (selection.primary.includes(muscle)) return 'primary'
  if (selection.secondary.includes(muscle)) return 'secondary'
  return undefined
}
