/**
 * A starting value for a new machine's brand, from the gym's own number:
 * no letter → gym80, N → Nautilus. Anything else (e.g. T cable towers) is left empty to fill in.
 * The brand is always stored per machine, so it can be changed.
 */
export function brandForGymNumber(gymNumber: string): string {
  const n = gymNumber.trim()
  if (/^\d+$/.test(n)) return 'gym80'
  if (/^n\d+$/i.test(n)) return 'Nautilus'
  return ''
}
