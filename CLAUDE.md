# Boreas — project brief for Claude Code

**App name: Boreas** (the Greek god of the north wind, which matches the icy Black Iris + Frozen look, with Ember as the fire). Domain for later: **boreasfitness.com**.

## What this is
A workout tracker, built as a mobile-first **PWA** (a website that can be installed on the phone's home screen and works offline). It's for me and a friend first; it may become a product later, so keep the code clean and the data model ready for multiple users, but don't build accounts or a backend yet.

The main problem it solves: on paper I can't see what I did last time on an exercise when that exercise shows up on a different day (e.g. bicep curls on arm day AND pull day). The app must always show my last result for an exercise, no matter which day it was done on.

**Users and devices:** I use **Android**, my friend uses **iPhone**. Both must work. Without accounts, each phone simply keeps its own data.

## Two parts: landing page and app
1. **Landing page** (what you see when you open the website in a browser): big 3D hero, fluted glass bar, big type, and an **"Install app"** button.
2. **The tracker app** (what opens from the home screen icon after installing): goes straight to today's workout. **It never shows the landing page.** Detect this with `display-mode: standalone` (and `navigator.standalone` on iPhone).

### The "Install app" button
- **Android (Chrome):** catch the `beforeinstallprompt` event and show the real install prompt when the button is tapped.
- **iPhone (Safari):** there is no install prompt, so the button opens a short guide: tap Share, then "Add to Home Screen". Show the right version based on the device.
- The page also needs a web app manifest (name, icons, theme colors, `display: standalone`) and a service worker for offline use.

## My training split
| Day       | Workout                  |
|-----------|--------------------------|
| Monday    | Legs                     |
| Tuesday   | Push                     |
| Wednesday | Pull                     |
| Thursday  | Rest                     |
| Friday    | Arms                     |
| Saturday  | Half pull, half push     |
| Sunday    | Rest                     |

The schedule is **fixed to the calendar**. If I miss a day, nothing shifts: Friday is always arms.

The exact exercises for each day: TODO, I'll fill these in. Build an editor so each user can set their own in the app.

## Training rules (do not change these without asking me)
- Every exercise: **3 working sets, each to failure**.
- **Progression rule:** if set 3 is **10 reps or more**, the next time that exercise appears, on ANY day, show an "Increase weight" flag.
- Suggest the new weight using a per-exercise increment (default 2.5 kg; units in kg, switchable to lb).
- Weight steps differ per machine (e.g. 2.5 → 4 kg, 6 → 7 kg, 30 → 35 kg), so the suggested weight is only a suggestion: always let me type the actual new weight.
- Target is 10 reps; rest between sets is 3 minutes (default for a later rest timer).
- **Never suggest lowering the weight.** No deload or "go down" messages of any kind.
- Write unit tests for the progression rule. It must never be wrong.

## Core principle
**History belongs to the exercise, not the day.** An exercise (or machine) is one shared record. Every day template just references exercises. "Last time" = the most recent logged session of that exercise across all days.

## Data model (suggested)
**A machine and an exercise are different things.** One machine can be used for several exercises, each with its own history: e.g. machine 16 with grip 3, 4 and 5; machine 13 for legs and for calves; T6 normal and "Ninja". History, settings and cues belong to the **exercise**.

- **Machine:** id, gym number (the gym's own label, e.g. `16`, `N6`, `T6`), brand (stored per machine; the gym number hints at it: no letter = gym80, `N` = Nautilus, `T` = other cable towers such as T6, an Impulse multi-station), model name/number (e.g. gym80 3022 Butterfly), optional own photo.
- **Exercise:** id, name, machine id (optional: bench/dumbbell and bodyweight exercises have none), variant (e.g. "grip 4", "Ninja"), settings (seat, grip, pad positions, e.g. "seat 4", "5/L4"), primary muscles, secondary muscles, form cues (my own short notes, e.g. "proud chest"), starting weight, weight increment, load type (`stack`, `dumbbell`, `plate`, `bodyweight`).
- **DayTemplate:** weekday, name, ordered list of exercise ids.
- **Session:** id, date, day template id.
- **SetLog:** session id, exercise id, set number (1–3), weight (empty for bodyweight), reps.

My current plan is in `training-plan.md`: use it to seed the machines, exercises and day templates.

## Features, in build order
1. Data model + local storage + logging sets.
2. **Today screen:** opens straight to today's workout from the schedule.
3. **"Next up" card:** exercise name, last weight, last reps per set (e.g. 13 / 12 / 10), and the date and day it was done.
4. **Progression flag:** "Increase weight" badge plus the suggested new weight.
5. **Fast logging:** big tap targets, last weight pre-filled, only reps to type between sets.
6. **Machine settings** saved per machine and shown when the machine comes up.
7. **Backup:** export all data to a file and import it again, so logs aren't lost if the phone or browser data is cleared. Also call `navigator.storage.persist()` to ask the browser to keep the data.
8. **Installable PWA:** manifest, service worker, offline support.
9. **Landing page** with the 3D hero and install button.
10. **Muscle map:** a body diagram with primary muscles highlighted strongly and secondary muscles lighter.

Later (not now): rest timer, progress charts per exercise, plate calculator, import of old paper logs, accounts and cloud sync, 3D muscular body that highlights today's muscles.

## Machine catalog
- My gym uses mostly **gym80** and **Nautilus** machines, plus cable towers labelled `T` (T6 is an Impulse 4-stack multi-station). Each machine has a gym number on it: no letter = gym80, `N` = Nautilus, `T` = cable tower. Store the brand per machine rather than deriving it from the letter. Show this number big in the app; it's how I find the machine on the floor.
- Start with only the machines at my gym (see `training-plan.md`); include an "Add machine" button for the rest.
- Store the machine name, brand, and primary/secondary muscles. You may research these on the web.
- **Do not copy manufacturer product photos** (copyrighted). Use no image, or a photo I take myself.
- Brand names are used only to describe machines; nothing should suggest an official partnership.

## Muscle map
Use an open-source body-map component instead of drawing one, e.g. `react-body-highlighter` (MIT) or `react-muscle-highlighter` (has male and female models). Check the license and that it's maintained before adding it. Map each exercise's muscles to the component's muscle names.

## Design
**Dark mode first.** It's used in a gym, glanced at between sets, with sweaty hands: big numbers, high contrast, large buttons.

### Colors (final)
| Role       | Name       | Hex       |
|------------|------------|-----------|
| Background | Black Iris | `#080813` |
| Soft       | Frozen     | `#A0BDDB` |
| Text       | Off-white  | `#EEF2F7` |
| Accent     | Ember      | `#FF7A45` |

Rule: two soft colors and one loud one. The accent is used sparingly: the "Increase weight" badge, the primary button, and the primary muscles on the muscle map. Secondary muscles use Frozen. Define all colors as CSS variables so the palette is easy to swap.

### Fluted glass effect
I want a **"fluted glass" / "reeded glass"** look: a large, soft, blurred colored shape behind a layer of thin vertical ribs, like looking through textured glass.
- Build it with CSS only (e.g. a blurred gradient blob behind a container of narrow vertical strips, each with `backdrop-filter: blur()` and a subtle repeating highlight; or a `repeating-linear-gradient` overlay). No image files.
- Use it on the **landing page** (including the top bar) and on app headers. Logging screens stay plain dark for readability and speed.
- Provide a plain fallback when `backdrop-filter` isn't supported, and keep it light so cheaper phones don't lag.

### Landing page 3D hero
Style reference: big editorial type with large 3D objects floating in the middle, slowly tumbling and overlapping the text (inspiration only, don't copy any specific site).
- **Objects (final):** three floating gym objects instead of rocks — a weight plate, a kettlebell and a dumbbell — in matte black/dark chrome, with cool Frozen reflections and a thin Ember rim light.
- **Animation:** objects animate in on load (rise + fade + slight rotation), then drift and rotate slowly. Optional: they react a little to scroll or finger movement.
- **Tech:** Three.js via React Three Fiber with small `.glb` models (or a scene made in Spline). Only use models whose license allows it, and credit creators if required.
- **Performance:** lazy-load the 3D, keep models small (compressed), show a static image fallback, and skip motion when "reduce motion" is on. The 3D lives only on the landing page, never in the tracker app.

## Tech
- PWA, mobile-first, works fully offline, on Android (Chrome) and iPhone (Safari).
- Suggested: React + Vite + TypeScript, local storage in IndexedDB (e.g. Dexie), Vitest for tests. Propose alternatives if you think something is better, but ask first.
- **Hosting: GitHub Pages**, deployed automatically with a GitHub Actions workflow. Set Vite's `base` to the repo name (Pages serves at `/<repo-name>/`) and make the manifest and service worker paths match. Later the custom domain boreasfitness.com will point to it, which changes `base` to `/`, so keep that one setting easy to switch.
- Ask before adding any new dependency.

## Open questions (ask me before building the parts they affect)
- Model names for each gym number in `training-plan.md` (coming).

## Language
**Everything is in English**: the app's text, exercise names, cues, code and comments. Keep text in one place (e.g. a strings file) so translations could be added later.

## How to work with me
- Use plan mode before each feature; show me the plan and wait for my OK.
- Build in small steps; one feature at a time.
- Commit to git after each working step with a clear message.
- Explain things simply; I'm not a professional developer.
