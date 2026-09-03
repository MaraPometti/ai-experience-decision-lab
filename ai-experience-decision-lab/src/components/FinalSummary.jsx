import { useState } from 'react'
import { scoreRun, getBand, NO_DECISION } from '../lib/scoring'

// ── Insight generation ────────────────────────────────────────────────────────
// Derived entirely from path values — no invented data.
function generateInsights(livePath, baselinePath, bestPath, journeyStages) {
  const deltas = livePath.map((v, i) => v - baselinePath[i])

  const maxDelta = Math.max(...deltas)
  const maxIdx   = deltas.indexOf(maxDelta)

  const minDelta = Math.min(...deltas)
  const minIdx   = deltas.indexOf(minDelta)

  // Average relative position: 0 = at BAU, 100% = at bestPath average
  const avg     = arr => arr.reduce((a, b) => a + b, 0) / arr.length
  const pct     = Math.round(((avg(livePath) - avg(baselinePath)) / (avg(bestPath) - avg(baselinePath))) * 100)

  // Late-stage average delta (Expansion, Retention, Loyalty = indices 4, 5, 6)
  const lateAvgDelta = avg([4, 5, 6].map(i => livePath[i] - baselinePath[i]))

  const insights = []

  // 1. Strongest stage
  if (maxDelta >= 5) {
    insights.push(
      `Biggest gain at ${journeyStages[maxIdx]}: +${maxDelta} above the baseline. Your decisions here created the most value across the whole journey.`
    )
  } else if (maxDelta > 0) {
    insights.push(
      `The best result was only +${maxDelta} at ${journeyStages[maxIdx]} — a modest improvement across all stages.`
    )
  } else {
    insights.push(
      'No stage performed above the baseline. Every decision met or fell short of the standard outcome.'
    )
  }

  // 2. Weakest / drag stage
  if (minDelta <= -5) {
    insights.push(
      `Biggest drop at ${journeyStages[minIdx]}: ${minDelta} below the baseline. This stage was the largest single source of lost value.`
    )
  } else if (minDelta < 0) {
    insights.push(
      `Small drop at ${journeyStages[minIdx]} (${minDelta} vs baseline). No major mistakes, but some value was lost at this stage.`
    )
  } else {
    insights.push(
      'No stage fell below the baseline — the strategy held its ground at every step.'
    )
  }

  // 3. Proximity to reference paths
  if (pct >= 60) {
    insights.push(
      `Your decisions captured roughly ${pct}% of the gap between the baseline and the best possible AI outcome — a strong overall result.`
    )
  } else if (pct >= 25) {
    insights.push(
      `About ${pct}% of the available improvement between the baseline and the best possible AI outcome was achieved — a moderate result.`
    )
  } else if (pct >= 0) {
    insights.push(
      `Only ${pct}% of the available improvement was achieved — most of the potential value went uncaptured.`
    )
  } else {
    insights.push(
      'The overall result fell below the baseline. The combined effect of these decisions reduced value rather than creating it.'
    )
  }

  // 4. Late-stage trajectory
  if (lateAvgDelta >= 20) {
    insights.push(
      'Performance held up strongly in the final stages (Expansion → Loyalty). Earlier gains compounded well and value was sustained to the end.'
    )
  } else if (lateAvgDelta >= 5) {
    insights.push(
      'Performance in the final stages was moderate. Some of the value built up in earlier rounds was not fully maintained through Expansion and Loyalty.'
    )
  } else if (lateAvgDelta >= 0) {
    insights.push(
      'Performance in the final stages was flat. The early gains barely carried through to Expansion, Retention, and Loyalty — a missed opportunity to compound value.'
    )
  } else {
    insights.push(
      'Performance in the final stages was poor. Decisions at Expansion, Retention, or Loyalty eroded earlier gains — the biggest missed opportunity across the journey.'
    )
  }

  return insights
}

// ── Score metadata ────────────────────────────────────────────────────────────
const SCORE_META = {
  cei:       { label: 'CEI Impact',       hint: 'Overall economic value created' },
  trust:     { label: 'Trust Impact',     hint: 'How much trust was built or lost' },
  cost:      { label: 'Cost Impact',      hint: 'Effect on AI operating cost' },
  retention: { label: 'Retention Impact', hint: 'Likelihood customers stayed' },
}

const PART_META = {
  revenue:          'Revenue',
  customerValue:    'Customer value',
  cei:              'CEI',
  trust:            'Trust',
  adoption:         'Adoption (retention)',
  budgetDiscipline: 'Budget discipline',
}

function fmtM(v) {
  const sign = v < 0 ? '−' : '+'
  return `${sign}£${(Math.abs(v) / 1_000_000).toFixed(1)}m`
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FinalSummary({
  score,
  livePath,
  baselinePath,
  bestPath,
  journeyStages,
  onReset,
  teamName,
  choices,
  reasons = [],
}) {
  const [copied, setCopied] = useState(false)

  const hasChoices = Array.isArray(choices) && choices.length > 0
  const insights   = generateInsights(livePath, baselinePath, bestPath, journeyStages)

  // Replay the choice string through the shared engine, so the team screen, the
  // facilitator leaderboard and the debrief can never disagree.
  const result      = hasChoices ? scoreRun(choices) : null
  const finalScore  = result ? result.score : score
  const band        = getBand(result ? result.composite : 0)
  const hasReasons  = reasons.some(r => (r || '').trim().length > 0)

  function handleCopy() {
    const lines = [
      `Team: ${teamName || '—'}`,
      `Choices: ${hasChoices ? choices.join('') : '—'}`,
      result ? `Balance score: ${result.composite}/100 — ${band.label}` : '',
      result ? `Revenue: ${fmtM(result.revenueDelta)} · Budget left: ${fmtM(result.budgetRemaining)}` : '',
      result ? `Trust: ${result.score.trust >= 0 ? '+' : ''}${result.score.trust} · Retention: ${result.score.retention >= 0 ? '+' : ''}${result.score.retention}` : '',
      '',
      'Reasoning:',
      ...journeyStages.map((stage, i) => {
        const choice = choices?.[i] ?? '—'
        const note   = (reasons[i] || '').trim() || '(no reasoning recorded)'
        return `  ${i + 1}. ${stage} — ${choice}: ${note}`
      }),
    ].filter(Boolean)

    try {
      navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="final-summary">

      {/* ── Team name + choices (play mode) ── */}
      {teamName && (
        <div className="summary-section">
          <p className="summary-team-name">{teamName}</p>
        </div>
      )}

      {hasChoices && (
        <div className="summary-section">
          <p className="summary-section-label">Your choices</p>
          <div className="choices-row">
            {choices.map((choice, i) => (
              <div key={i} className="choice-item">
                {i > 0 && <span className="choice-arrow">→</span>}
                <div className="choice-bubble-wrap">
                  <div className={`choice-bubble ${choice === NO_DECISION ? 'choice-bubble-skipped' : ''}`}>
                    {choice}
                  </div>
                  <span className="choice-stage">
                    {(journeyStages[i] || '').slice(0, 3)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="choices-facilitator">
            Read your choices to the facilitator:{' '}
            <span className="choices-string">{choices.join('')}</span>
          </p>
        </div>
      )}

      {(teamName || hasChoices) && <hr className="summary-divider" />}

      {/* ── Balance score ── */}
      <div className="summary-section">
        <p className="summary-section-label">Simulation complete</p>
        {result && (
          <div className="balance-score">
            <span className="balance-score-value">{result.composite}</span>
            <span className="balance-score-max">/ 100 balance score</span>
          </div>
        )}
        <div className={`result-badge ${band.cls}`}>{band.label}</div>
        <p className="summary-description">{band.description}</p>
      </div>

      {/* ── Weighted scorecard ── */}
      {result && (
        <>
          <hr className="summary-divider" />
          <div className="summary-section">
            <p className="summary-section-label">Balanced scorecard</p>
            <div className="scorecard-list">
              {Object.entries(PART_META).map(([key, label]) => {
                const pct    = Math.round((result.parts[key] ?? 0) * 100)
                const weight = Math.round((result.weights[key] ?? 0) * 100)
                return (
                  <div key={key} className="scorecard-row">
                    <span className="scorecard-label">{label}</span>
                    <span className="scorecard-weight">{weight}%</span>
                    <span className="scorecard-track">
                      <span className="scorecard-fill" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="scorecard-pct">{pct}</span>
                  </div>
                )
              })}
            </div>
            <p className="scorecard-note">
              Revenue is 30% of the result, not all of it. The remaining 70% rewards customer
              value, trust, retention and spending discipline.
            </p>
            {result.penalty > 0 && (
              <p className="scorecard-penalty">
                ⚠️ Over budget by {fmtM(-result.overspend).replace('−', '')} — {result.penalty} points
                deducted.
              </p>
            )}
          </div>
        </>
      )}

      <hr className="summary-divider" />

      {/* ── Final scores ── */}
      <div className="summary-section">
        <p className="summary-section-label">Final scores</p>
        <div className="summary-score-grid">
          {Object.entries(finalScore).map(([key, value]) => {
            const meta = SCORE_META[key] ?? { label: key, hint: '' }
            return (
              <div key={key} className="summary-score-item">
                <span className="summary-score-key">{meta.label}</span>
                <span className={`summary-score-value ${value >= 0 ? 'positive' : 'negative'}`}>
                  {value > 0 ? '+' : ''}{value}
                </span>
                <span className="summary-score-hint">{meta.hint}</span>
              </div>
            )
          })}
        </div>
        {result && (
          <div className="summary-financials">
            <span>Revenue impact <strong>{fmtM(result.revenueDelta)}</strong></span>
            <span>AI spend <strong>£{(result.aiSpent / 1_000_000).toFixed(1)}m</strong></span>
            <span className={result.overspend > 0 ? 'stat-over' : undefined}>
              Budget left <strong>{fmtM(result.budgetRemaining)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* ── Recorded reasoning ── */}
      {hasReasons && (
        <>
          <hr className="summary-divider" />
          <div className="summary-section">
            <p className="summary-section-label">Your reasoning</p>
            <ul className="reasoning-list">
              {journeyStages.map((stage, i) => {
                const note = (reasons[i] || '').trim()
                if (!note) return null
                return (
                  <li key={i} className="reasoning-item">
                    <span className="reasoning-stage">
                      {stage} · {choices?.[i] ?? '—'}
                    </span>
                    <span className="reasoning-text">{note}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}

      <hr className="summary-divider" />

      {/* ── Debrief insights ── */}
      <div className="summary-section">
        <p className="summary-section-label">Debrief insights</p>
        <ul className="insight-list">
          {insights.map((text, i) => (
            <li key={i} className="insight-item">{text}</li>
          ))}
        </ul>
      </div>

      <hr className="summary-divider" />

      {/* ── Actions ── */}
      <div className="summary-actions">
        <button className="btn btn-secondary" onClick={handleCopy}>
          {copied ? '✓ Copied' : 'Copy result for facilitator'}
        </button>
        <button className="btn btn-restart" onClick={onReset}>
          Restart Simulation
        </button>
      </div>

    </div>
  )
}
