// The one fixed list of muscles. Exercises may only use these ids,
// so the muscle map (feature 10) can translate each one to the body-map component's names.
export const MUSCLES = [
  'chest',
  'upper-chest',
  'front-delts',
  'side-delts',
  'rear-delts',
  'triceps',
  'biceps',
  'forearms',
  'lats',
  'upper-back',
  'mid-back',
  'lower-back',
  'traps',
  'abs',
  'obliques',
  'hip-flexors',
  'glutes',
  'quads',
  'hamstrings',
  'adductors',
  'abductors',
  'calves',
] as const

export type Muscle = (typeof MUSCLES)[number]
