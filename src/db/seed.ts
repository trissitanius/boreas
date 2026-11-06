// Starting data, typed in from training-plan.md. Loaded once, the first time the app opens.
// Seeded records use fixed readable ids, so a later seed update or backup import can match them.
import type { AppSettings, DayTemplate, Exercise, LoadType, Machine, Weekday } from './types'
import type { Muscle } from './muscles'

const DEFAULT_INCREMENT_KG = 2.5

type MachineSeed = Omit<Machine, 'createdAt' | 'updatedAt'>

const machines: MachineSeed[] = [
  { id: 'm-3', gymNumber: '3', brand: 'gym80', model: 'Biceps / preacher curl machine' },
  { id: 'm-10', gymNumber: '10', brand: 'gym80', model: '3002 Lying Leg Curl (Sygnum)' },
  { id: 'm-13', gymNumber: '13', brand: 'gym80', model: '3030 Seated Leg Press (Sygnum)' },
  { id: 'm-16', gymNumber: '16', brand: 'gym80', model: '4900 Incline Row Combo (Sygnum Stations)' },
  { id: 'm-17', gymNumber: '17', brand: 'gym80', model: '3022 Butterfly (pec deck)' },
  { id: 'm-18', gymNumber: '18', brand: 'gym80', model: '45° back extension bench' },
  { id: 'm-n2', gymNumber: 'N2', brand: 'Nautilus', model: 'Nitro Evo Abdominal' },
  { id: 'm-n6', gymNumber: 'N6', brand: 'Nautilus', model: 'Nitro Evo Incline Press' },
  { id: 'm-n7', gymNumber: 'N7', brand: 'Nautilus', model: 'Nitro Evo Vertical Chest' },
  { id: 'm-n11', gymNumber: 'N11', brand: 'Nautilus', model: 'Nitro Evo Rear Delt / Pec Fly' },
  { id: 'm-t6', gymNumber: 'T6', brand: 'Impulse', model: '4-Stack Multi-Station IT9027' },
  { id: 'm-bench', gymNumber: 'Bench', brand: 'gym80', model: 'Adjustable bench' },
]

interface ExerciseSeed {
  id: string
  name: string
  machineId?: string
  variant?: string
  settings?: string
  primary: Muscle[]
  secondary?: Muscle[]
  cues?: string[]
  loadType?: LoadType
}

const exercises: ExerciseSeed[] = [
  // Monday — Legs
  {
    id: 'ex-leg-press',
    name: 'Leg press',
    machineId: 'm-13',
    settings: 'back 3, seat all the way down',
    primary: ['quads'],
    secondary: ['glutes', 'hamstrings'],
  },
  {
    id: 'ex-leg-raise',
    name: 'Leg raises',
    settings: 'against the wall, 2 kg dumbbell as a height marker',
    primary: ['hip-flexors'],
    cues: ['Body against the wall', 'Raise the leg over the dumbbell (height marker only)'],
    loadType: 'bodyweight',
  },
  {
    id: 'ex-back-extension',
    name: 'Back extension',
    machineId: 'm-18',
    settings: 'pad position 4',
    primary: ['lower-back'],
    secondary: ['glutes', 'hamstrings'],
    loadType: 'bodyweight',
  },
  {
    id: 'ex-leg-curl',
    name: 'Lying leg curl',
    machineId: 'm-10',
    settings: 'foot pad 9, foot pad arm 11',
    primary: ['hamstrings'],
    secondary: ['calves'],
  },
  {
    id: 'ex-calf-press',
    name: 'Calf press',
    machineId: 'm-13',
    settings: 'seat 10',
    primary: ['calves'],
    cues: ['Fully straighten the legs'],
  },

  // Tuesday — Push
  {
    id: 'ex-chest-press',
    name: 'Chest press',
    machineId: 'm-n7',
    settings: 'seat height 5, back 4',
    primary: ['chest'],
    secondary: ['front-delts', 'triceps'],
    cues: ['Banana'],
  },
  {
    id: 'ex-incline-press',
    name: 'Incline press',
    machineId: 'm-n6',
    settings: 'setting 4',
    primary: ['upper-chest'],
    secondary: ['front-delts', 'triceps'],
    cues: ['Banana', 'Slight crunch', 'Elbows under the handles'],
  },
  {
    id: 'ex-butterfly',
    name: 'Butterfly (pec deck)',
    machineId: 'm-17',
    settings: 'seat 3; 20 kg plate behind the back for more range of motion (not added load)',
    primary: ['chest'],
    secondary: ['front-delts'],
  },
  {
    id: 'ex-y-raise',
    name: 'Y raise / lateral raise',
    machineId: 'm-bench',
    settings: 'back pad 7, no seat, lying face-down on the near-vertical bench',
    primary: ['side-delts', 'rear-delts'],
    cues: ['Proud chest', 'Stomach against the bench'],
    loadType: 'dumbbell',
  },
  {
    id: 'ex-triceps-pushdown',
    name: 'Triceps pushdown',
    machineId: 'm-t6',
    settings: 'pulley height 26 (from the top), straight bar (grip 10)',
    primary: ['triceps'],
    cues: ['Proud chest', 'Elbows close to the body', 'Slight knee bend'],
  },

  // Wednesday — Pull
  {
    id: 'ex-narrow-pulldown',
    name: 'Narrow underhand pulldown',
    machineId: 'm-16',
    variant: 'grip 4',
    settings: 'grip 4 (narrow, underhand), top pulley; footrest all the way back',
    primary: ['lats'],
    secondary: ['biceps'],
    cues: ['Elbows to your pockets'],
  },
  {
    id: 'ex-narrow-row',
    name: 'Narrow row',
    machineId: 'm-16',
    variant: 'grip 3',
    settings: 'grip 3 (narrow), bottom pulley; footrest all the way forward',
    primary: ['lats'],
    secondary: ['mid-back', 'biceps'],
  },
  {
    id: 'ex-wide-row',
    name: 'Wide row',
    machineId: 'm-16',
    variant: 'grip 5',
    settings: 'grip 5 (wide), bottom pulley; footrest all the way forward',
    primary: ['upper-back'],
    secondary: ['rear-delts', 'lats'],
    cues: ['Proud chest'],
  },
  {
    id: 'ex-reverse-fly',
    name: 'Reverse fly',
    machineId: 'm-n11',
    variant: 'rear delt mode',
    settings: 'footrest 2, back pad 0, arm pads as close together as possible',
    primary: ['rear-delts'],
    secondary: ['upper-back'],
    cues: ['Pads close together, push them outward', 'Ronaldo'],
  },
  {
    id: 'ex-dumbbell-curl',
    name: 'Dumbbell curl',
    machineId: 'm-bench',
    settings: 'back pad 7, seat 3',
    primary: ['biceps'],
    cues: ['Proud chest', 'Start with the left arm'],
    loadType: 'dumbbell',
  },

  // Friday — Arms (the rest are shared with Push and Pull)
  {
    id: 'ex-preacher-curl',
    name: 'Preacher curl',
    machineId: 'm-3',
    settings: 'seat 3',
    primary: ['biceps'],
    cues: ['Upper arm flat on the pad'],
  },
  {
    id: 'ex-overhead-extension',
    name: 'Overhead triceps extension',
    machineId: 'm-t6',
    variant: 'Ninja',
    settings: 'pulley at the bottom, rope',
    primary: ['triceps'],
  },
  {
    id: 'ex-seated-crunch',
    name: 'Seated crunch',
    machineId: 'm-n2',
    settings: 'seat 5',
    primary: ['abs'],
    cues: [
      'Heels behind the rollers',
      "Hands only resting on the handles (don't pull)",
      "Head fixed against the pad (don't lean it forward)",
    ],
  },
]

const dayTemplates: { id: string; weekday: Weekday; name: string; exerciseIds: string[] }[] = [
  {
    id: 'day-mon',
    weekday: 1,
    name: 'Legs',
    exerciseIds: ['ex-leg-press', 'ex-leg-raise', 'ex-back-extension', 'ex-leg-curl', 'ex-calf-press'],
  },
  {
    id: 'day-tue',
    weekday: 2,
    name: 'Push',
    exerciseIds: ['ex-chest-press', 'ex-incline-press', 'ex-butterfly', 'ex-y-raise', 'ex-triceps-pushdown'],
  },
  {
    id: 'day-wed',
    weekday: 3,
    name: 'Pull',
    exerciseIds: ['ex-narrow-pulldown', 'ex-narrow-row', 'ex-wide-row', 'ex-reverse-fly', 'ex-dumbbell-curl'],
  },
  { id: 'day-thu', weekday: 4, name: 'Rest', exerciseIds: [] },
  {
    id: 'day-fri',
    weekday: 5,
    name: 'Arms',
    exerciseIds: [
      'ex-preacher-curl',
      'ex-dumbbell-curl',
      'ex-y-raise',
      'ex-triceps-pushdown',
      'ex-overhead-extension',
      'ex-seated-crunch',
    ],
  },
  {
    id: 'day-sat',
    weekday: 6,
    name: 'Half pull, half push',
    exerciseIds: [
      'ex-narrow-pulldown',
      'ex-narrow-row',
      'ex-wide-row',
      'ex-butterfly',
      'ex-incline-press',
      'ex-chest-press',
    ],
  },
  { id: 'day-sun', weekday: 7, name: 'Rest', exerciseIds: [] },
]

export interface SeedData {
  machines: Machine[]
  exercises: Exercise[]
  dayTemplates: DayTemplate[]
  settings: AppSettings[]
}

export function buildSeed(now: number = Date.now()): SeedData {
  const stamps = { createdAt: now, updatedAt: now }
  return {
    machines: machines.map((m) => ({ ...m, ...stamps })),
    exercises: exercises.map((e) => ({
      id: e.id,
      name: e.name,
      ...(e.machineId ? { machineId: e.machineId } : {}),
      ...(e.variant ? { variant: e.variant } : {}),
      settings: e.settings ?? '',
      primaryMuscles: e.primary,
      secondaryMuscles: e.secondary ?? [],
      cues: e.cues ?? [],
      weightIncrementKg: DEFAULT_INCREMENT_KG,
      loadType: e.loadType ?? 'stack',
      ...stamps,
    })),
    dayTemplates: dayTemplates.map((d) => ({ ...d, ...stamps })),
    settings: [{ id: 'app', unit: 'kg', ...stamps }],
  }
}
