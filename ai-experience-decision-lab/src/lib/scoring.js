// ── Shared scoring engine ─────────────────────────────────────────────────────
// One code path for the live game, the final summary, and the facilitator
// leaderboard, so all three can never disagree about what a run is worth.
//
// Every bound below is derived from scenario.json at load time. Nothing is
// hard-coded, so re-calibrating the scenario re-calibrates the grading with it.

import scenario from '../data/scenario.json'

export const NO_DECISION = '-'

const { rounds, baselinePath, simulationConfig, kpiWeights } = scenario

export const ROUND_COUNT = rounds.length

const mean  = arr => arr.reduce((a, b) => a + b, 0) / arr.length
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// A round the team let expire: no movement on any axis.
const NO_DECISION_IMPACT = {
  pathImpact:     baselinePath.map(() => 0),
  scoreImpact:    { cei: 0, trust: 0, cost: 0, retention: 0 },
  businessImpact: { revenueDelta: 0, budgetDelta: 0 },
}

export function optionFor(roundIndex, choiceId) {
  const round = rounds[roundIndex]
  if (!round) return null
  if (choiceId === NO_DECISION) return NO_DECISION_IMPACT
  return round.options.find(o => o.id === choiceId) || null
}

// ── Replay ────────────────────────────────────────────────────────────────────
export function replayChoices(choices = []) {
  let livePath        = [...baselinePath]
  let revenueDelta    = 0
  let budgetRemaining = simulationConfig.startingBudget
  const score         = { cei: 0, trust: 0, cost: 0, retention: 0 }

  choices.slice(0, ROUND_COUNT).forEach((choiceId, i) => {
    const opt = optionFor(i, choiceId)
    if (!opt) return
    livePath         = livePath.map((v, s) => v + opt.pathImpact[s])
    score.cei       += opt.scoreImpact.cei
    score.trust     += opt.scoreImpact.trust
    score.cost      += opt.scoreImpact.cost
    score.retention += opt.scoreImpact.retention
    revenueDelta    += opt.businessImpact.revenueDelta || 0
    budgetRemaining += opt.businessImpact.budgetDelta
  })

  return {
    livePath,
    score,
    revenueDelta,
    budgetRemaining,
    aiSpent:   simulationConfig.startingBudget - budgetRemaining,
    overspend: Math.max(0, -budgetRemaining),
  }
}

// ── Self-calibrating bounds ───────────────────────────────────────────────────
// For each axis: the worst and best totals reachable by any combination of
// choices. Used to normalise a run onto 0–1 without stale magic numbers.
function boundsFor(valueOf) {
  return rounds.reduce(
    (acc, round) => {
      const values = round.options.map(valueOf)
      return { min: acc.min + Math.min(...values), max: acc.max + Math.max(...values) }
    },
    { min: 0, max: 0 },
  )
}

const BOUNDS = {
  revenue:       boundsFor(o => o.businessImpact.revenueDelta || 0),
  customerValue: boundsFor(o => mean(o.pathImpact)),
  cei:           boundsFor(o => o.scoreImpact.cei),
  trust:         boundsFor(o => o.scoreImpact.trust),
  adoption:      boundsFor(o => o.scoreImpact.retention),
  cost:          boundsFor(o => o.scoreImpact.cost),
}

const budgetDeltaBounds = boundsFor(o => o.businessImpact.budgetDelta)
const BUDGET_REMAINING_BOUNDS = {
  min: simulationConfig.startingBudget + budgetDeltaBounds.min,
  max: simulationConfig.startingBudget + budgetDeltaBounds.max,
}

// The deepest hole a team can dig by taking the priciest option every round.
const MAX_OVERSPEND = Math.max(0, -BUDGET_REMAINING_BOUNDS.min)

export const OVERSPEND_PENALTY_MAX = 20

function norm(value, { min, max }) {
  if (max === min) return 1
  return clamp((value - min) / (max - min), 0, 1)
}

// ── Composite score ───────────────────────────────────────────────────────────
// Weighted by scenario.json's own kpiWeights, which until now were unused.
//
// Two axes have no directly tracked counterpart and are mapped explicitly:
//   adoption          → retention (the only stickiness signal the rounds carry)
//   budgetDiscipline  → budget left, averaged with the cost-efficiency score
export function scoreRun(choices = []) {
  const run = replayChoices(choices)

  const parts = {
    revenue:       norm(run.revenueDelta, BOUNDS.revenue),
    customerValue: norm(mean(run.livePath) - mean(baselinePath), BOUNDS.customerValue),
    cei:           norm(run.score.cei, BOUNDS.cei),
    trust:         norm(run.score.trust, BOUNDS.trust),
    adoption:      norm(run.score.retention, BOUNDS.adoption),
    budgetDiscipline:
      (norm(run.budgetRemaining, BUDGET_REMAINING_BOUNDS) + norm(run.score.cost, BOUNDS.cost)) / 2,
  }

  const weighted = Object.entries(kpiWeights)
    .reduce((sum, [key, weight]) => sum + weight * (parts[key] ?? 0), 0)

  const penalty = MAX_OVERSPEND > 0
    ? OVERSPEND_PENALTY_MAX * Math.min(1, run.overspend / MAX_OVERSPEND)
    : 0

  return {
    ...run,
    parts,
    weights:   kpiWeights,
    penalty:   Math.round(penalty),
    composite: Math.round(clamp(weighted * 100 - penalty, 0, 100)),
  }
}

// ── Result bands ──────────────────────────────────────────────────────────────
export function getBand(composite) {
  if (composite >= 75) return {
    label: 'Balanced AI Leadership',
    cls: 'result-green',
    description:
      'Revenue, trust and retention moved together. You invested where value was proven rather than where it was cheapest, and stayed inside the budget.',
  }
  if (composite >= 55) return {
    label: 'Strong but Uneven',
    cls: 'result-blue',
    description:
      'A clearly positive strategy, but the gains were not balanced. One or two axes carried the result while others were left behind.',
  }
  if (composite >= 35) return {
    label: 'Cautious — Value Left on the Table',
    cls: 'result-amber',
    description:
      'Major mistakes were avoided, but so were the high-leverage investments. The journey improved modestly and a lot of available value went uncaptured.',
  }
  return {
    label: 'Misaligned AI Strategy',
    cls: 'result-red',
    description:
      'The combination of choices created drag across the journey — whether through overspend, eroded trust, or investment aimed at the wrong stages.',
  }
}

// ── Choice strings ────────────────────────────────────────────────────────────
export function formatChoices(choices = []) {
  return choices.join('')
}

export function parseChoiceString(raw) {
  const cleaned = String(raw || '').toUpperCase().replace(/[^ABC-]/g, '')

  if (cleaned.length === 0) {
    return { ok: false, error: 'Enter the team’s choice string.' }
  }
  if (cleaned.length !== ROUND_COUNT) {
    return {
      ok: false,
      error: `Need ${ROUND_COUNT} letters — got ${cleaned.length}. Use A/B/C, or - for a round that timed out.`,
    }
  }
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (ch === NO_DECISION) continue
    if (!rounds[i].options.some(o => o.id === ch)) {
      return { ok: false, error: `Round ${i + 1} has no option ${ch}.` }
    }
  }
  return { ok: true, choices: cleaned.split('') }
}

// Presentation order for a round's option cards. R6/R7 store their options out
// of order; optionDisplayOrder is the author's intended order.
export function orderedOptions(round) {
  const order = round?.optionDisplayOrder
  if (!Array.isArray(order) || order.length === 0) return round.options
  const byId    = new Map(round.options.map(o => [o.id, o]))
  const ordered = order.map(id => byId.get(id)).filter(Boolean)
  return ordered.length === round.options.length ? ordered : round.options
}
