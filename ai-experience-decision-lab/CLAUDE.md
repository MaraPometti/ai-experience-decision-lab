# AI Experience Decision Lab

## What this is
A React + Vite simulation app for Cambridge executive education. 
Teams design an AI-powered SME banking customer journey across 
7 stages, making trade-off decisions under time pressure.

## Purpose and audience
- Executive education / classroom simulation
- Teams make AI strategy choices in a fictional SME banking journey
- Focus: experience, trust, operational cost, retention, and commercial value
- Narrative customer: Aisha, a growing SME restaurant owner

## Modes
Play (blind) is the DEFAULT. Answers are unlocked only by an explicit
`?reveal=true`, so the bare URL is always safe to hand to students.

- **Play mode** (default, or ?team=Name): blind. Per-round countdown,
  direction-only KPI chips (▲ ▬ ▼, never figures), no badges, no optimal
  path, no Decision Insight. Decisions are final — Previous is a
  read-only walk back through completed rounds and their notes.
- **Reveal mode** (?reveal=true): facilitator/debrief. Badges, optimal
  path, Decision Insight, counterfactuals, numeric chips, rewind.
- **Leaderboard mode** (?leaderboard=true): facilitator screen. Enter each
  team's name and 7-letter choice string; ranks them on the same weighted
  scorecard the teams are graded on. Persists in the browser.

### Timing
- Default: one **20-minute clock for the whole session**, and it does
  **not** run until the team presses **▶ Start** in the timer pill.
- `?timer=<minutes>` — change the session length (e.g. `?timer=30`)
- `?roundtimer=<seconds>` — switch to a per-round window instead
  (e.g. `?roundtimer=60` for the design doc's 60s per touchpoint). In
  this mode the clock restarts each round and stops once a decision is
  locked, so the captain can write up reasoning without racing it.
- When the clock expires the round locks and is recorded as `-` (a skip):
  no movement on any axis.
- `timerStarted` is persisted, so a refresh mid-session resumes the
  countdown where it was rather than handing back a fresh 20 minutes.

## Published links
- Team play (blind) — the safe default link:
  - https://marapometti.github.io/ai-experience-decision-lab/
  - https://marapometti.github.io/ai-experience-decision-lab/?team=Alpha
  - https://marapometti.github.io/ai-experience-decision-lab/?team=Beta
  - https://marapometti.github.io/ai-experience-decision-lab/?team=Gamma
- Reveal / debrief (facilitator only — shows the answers):
  - https://marapometti.github.io/ai-experience-decision-lab/?reveal=true
- Facilitator leaderboard:
  - https://marapometti.github.io/ai-experience-decision-lab/?leaderboard=true

## Local run links
- Team play: http://localhost:5173/ (add ?team=Alpha etc.)
- Reveal: http://localhost:5173/?reveal=true
- Leaderboard: http://localhost:5173/?leaderboard=true

## How to run locally
- cd /Users/marapometti/Projects/ai-experience-decision-lab/ai-experience-decision-lab
- npm install
- npm run dev
- Open the local URL shown in the terminal (typically http://localhost:5173)

## Key files
- src/data/scenario.json — ALL game content (7 rounds, 21 options)
- src/App.jsx — main component, mode detection, state management
- src/lib/scoring.js — the single scoring engine: replay, weighted
  composite, result bands, choice-string parsing, option display order.
  Live game, final summary and leaderboard all go through it, so they
  cannot disagree. All bounds are derived from scenario.json at load
  time, so re-calibrating the scenario re-calibrates the grading.
- src/lib/persistence.js — localStorage for runs and the leaderboard
- src/components/OptionCards.jsx — the A/B/C option cards
- src/components/Leaderboard.jsx — facilitator leaderboard
- src/components/ScorePanel.jsx — KPI detail drawer
- src/components/ExplanationPanel.jsx — Decision Insight drawer
- src/components/ValueChart.jsx — the CVI chart (Recharts)
- src/components/ScenarioHeader.jsx — round title, trade-off tagline,
  round prompt, Aisha context

## Scoring
Teams are graded on a 0–100 **balance score**, not on revenue alone,
using scenario.json's own `kpiWeights` (previously unused): revenue 30%,
customer value 25%, CEI 15%, trust 15%, adoption 10%, budget discipline
5%. Adoption maps to `retention`, and budget discipline blends budget
left with the cost-efficiency score — both mappings are documented in
scoring.js. Overspending the £8m budget deducts up to 20 points on top.

## Deployment
- Currently on GitHub Pages: npm run deploy
- Moving to Vercel + marapometti.com

## Rules
- Never change scenario.json numbers without explicit instruction
- Play mode and reveal mode must show identical option text
- Cost figures must NOT appear in option labels
- The bestOptionId per round: R1=B, R2=C, R3=A, R4=A, R5=C, R6=B, R7=A
- Keep the public and team URLs stable for classroom access
- Play mode must never render an exact KPI figure. Direction only.
  Numbers on screen are an answer key.
- Play mode must never allow a scored decision to be re-opened.

## The R5 trade-off (do not "fix" this)
R5 is deliberately the round where the most profitable choice is not the
right one. Option A (ungoverned hyper-personalisation) has the highest
immediate revenue in the round — £5.4m against C's £4.1m — and pays for
it in trust (−8), retention (−3) and a CVI that collapses to below its
starting point by Loyalty. Option C (governed personalisation) is the
most expensive option in the round and earns less up front, and still
wins on the balance score. bestOptionId stays C.

This is what makes "AI optimises exactly for the metrics you feed it"
land: a team chasing the revenue number picks A here and loses.
Verified: "always take the max-revenue option" scores 89 and ranks
7th of 2187 possible paths; the balanced path scores 96 and ranks 1st.

Invariants worth re-checking after any scenario.json edit:
- `bestPath` must equal the all-best replay exactly
- each round's `bestOptionId` must be the balance-score argmax
- the all-best path must stay inside the £8m budget (currently £7.10m)
