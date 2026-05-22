// ── Qualitative result label ──────────────────────────────────────────────────
// Thresholds calibrated against the scenario's scoreImpact range:
//   all-best CEI ≈ +58   all-worst CEI ≈ −17
function getResult(cei) {
  if (cei >= 40) return {
    label: 'High-Value AI Experience',
    cls: 'result-green',
    description:
      'Your decisions consistently created high impact. The customer journey rose well above the baseline and closely matched the best possible AI outcome.',
  }
  if (cei >= 20) return {
    label: 'Balanced but Moderate Strategy',
    cls: 'result-blue',
    description:
      'A solid set of decisions that moved the journey above baseline. Good choices in several stages, but some high-value opportunities were not taken.',
  }
  if (cei >= 5) return {
    label: 'Efficient but Low Impact',
    cls: 'result-amber',
    description:
      'Cautious decisions created modest improvements. Major mistakes were avoided, but significant value was left uncaptured across the journey.',
  }
  return {
    label: 'Misaligned AI Strategy',
    cls: 'result-red',
    description:
      'The combination of choices created drag at multiple stages. Some short-term gains masked a deeper decline that built up across the journey.',
  }
}

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
}) {
  const result   = getResult(score.cei)
  const insights = generateInsights(livePath, baselinePath, bestPath, journeyStages)
  const hasChoices = Array.isArray(choices) && choices.length > 0

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
                  <div className="choice-bubble">{choice}</div>
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

      {/* ── Result label ── */}
      <div className="summary-section">
        <p className="summary-section-label">Simulation complete</p>
        <div className={`result-badge ${result.cls}`}>{result.label}</div>
        <p className="summary-description">{result.description}</p>
      </div>

      <hr className="summary-divider" />

      {/* ── Final scores ── */}
      <div className="summary-section">
        <p className="summary-section-label">Final scores</p>
        <div className="summary-score-grid">
          {Object.entries(score).map(([key, value]) => {
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
      </div>

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

      {/* ── Restart ── */}
      <button className="btn btn-restart" onClick={onReset}>
        Restart Simulation
      </button>

    </div>
  )
}
