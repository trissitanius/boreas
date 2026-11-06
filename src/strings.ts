// All text shown in the app, in one place so translations can be added later.
export const strings = {
  appName: 'Boreas',
  /** Used for dates, e.g. "Friday 6 November". */
  locale: 'en-GB',
  loading: 'Loading…',
  weekdaysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  weekdaysLong: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  today: 'Today',
  backToToday: '‹ Today',
  otherDays: 'Other days',
  restDay: 'Rest day',
  restDayHint: 'Recover. Nothing to log.',
  rest: 'Rest',
  nextWorkout: (weekday: string, name: string) => `Next: ${weekday} · ${name}`,
  tomorrow: 'tomorrow',
  inDays: (n: number) => `in ${n} days`,
  dayProgress: (done: number, total: number) => `${done} of ${total} done`,
  exerciseDone: '✓ Done',
  setCount: (logged: number, total: number) => `${logged}/${total}`,
  noMachine: 'Floor',
  back: '‹ Back',
  setLabel: (n: number) => `Set ${n}`,
  weight: 'Weight',
  reps: 'Reps',
  kg: 'kg',
  bodyweight: 'Bodyweight',
  save: 'Save',
  delete: 'Delete',
  invalidWeight: 'Enter a weight, e.g. 22.5',
  invalidReps: 'Enter whole reps, e.g. 10',
  saveFailed: 'Could not save. Try again.',

  // Welcome page (the website)
  landing: {
    eyebrow: 'Workout tracker',
    titleLines: ['Every set', 'remembered.'],
    lead: 'Boreas shows what you lifted last time on every exercise, whichever day you did it.',
    install: 'Install app',
    installed: 'Installed. Open Boreas from your home screen.',
    note: 'Free. No account. Your workouts stay on your phone.',
    tryInBrowser: 'Try it in the browser',
  },

  // Install guide (iPhone and other browsers)
  installGuide: {
    close: 'Close',
    iosTitle: 'Add Boreas to your Home Screen',
    iosSteps: [
      'Tap the Share button in the browser bar.',
      'Scroll down and tap “Add to Home Screen”.',
      'Tap “Add”. Boreas now opens from its icon, full screen.',
    ],
    iosNote: 'Don’t see “Add to Home Screen”? Open this page in Safari.',
    manualTitle: 'Install Boreas',
    manualSteps: [
      'Open your browser’s menu (⋮ or ⋯).',
      'Tap “Install app” or “Add to Home screen”.',
      'Open Boreas from its new icon.',
    ],
    manualNote: 'On iPhone, use Safari’s Share button instead.',
  },
}
