// ── Qualitative result label ──────────────────────────────────────────────────
// Thresholds calibrated against the scenario's scoreImpact range:
//   all-best CEI ≈ +58   all-worst CEI ≈ −17
function getResult(cei) {
  if (cei >= 40) return {
    label: 'High-Value AI Experience',
    cls: 'result-green',
    description:
      'The class consistently made high-impact AI decisions. The customer journey moved strongly above the BAU baseline and closely tracked the high-value reference path.',
  }
  if (cei >= 20) return {
    label: 'Balanced but Moderate Strategy',
    cls: 'result-blue',
    description:
      'A solid set of decisions that lifted the journey above baseline. Good instincts in several stages, but some high-value opportunities were left on the table.',
  }
  if (cei >= 5) return {
    label: 'Efficient but Low Impact',
    cls: 'result-amber',
    description:
      'Choices were cautious and created modest improvements. The strategy avoided major errors, but significant value went uncaptured across the journey.',
  }
  return {
    label: 'Misaligned AI Strategy',
    cls: 'result-red',
    description:
      'The combination of choices created drag at multiple stages. Some short-term gains masked downstream erosion that compounded across the journey.',
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
      `Strongest uplift at ${journeyStages[maxIdx]}: +${maxDelta} above BAU. Decisions at this stage created the most visible value in the simulation.`
    )
  } else if (maxDelta > 0) {
    insights.push(
      `Highest single-stage lift was only +${maxDelta} at ${journeyStages[maxIdx]} — modest across all stages.`
    )
  } else {
    insights.push(
      'No stage exceeded the BAU baseline. Every choice met or underperformed the status quo.'
    )
  }

  // 2. Weakest / drag stage
  if (minDelta <= -5) {
    insights.push(
      `Biggest drag at ${journeyStages[minIdx]}: ${minDelta} below BAU. This was the largest single value leak in the simulation.`
    )
  } else if (minDelta < 0) {
    insights.push(
      `Slight drag at ${journeyStages[minIdx]} (${minDelta} vs BAU). No catastrophic choices, but some value was lost at this stage.`
    )
  } else {
    insights.push(
      'No stage fell below the BAU baseline — the strategy maintained minimum baseline performance throughout.'
    )
  }

  // 3. Proximity to reference paths
  if (pct >= 60) {
    insights.push(
      `The class path captured approximately ${pct}% of the gap between BAU and the High-Value AI Path — a strong overall result.`
    )
  } else if (pct >= 25) {
    insights.push(
      `About ${pct}% of the potential uplift between BAU and the High-Value AI Path was captured — a moderate overall outcome.`
    )
  } else if (pct >= 0) {
    insights.push(
      `Only ${pct}% of the available uplift between BAU and the High-Value AI Path was realized — most potential value went uncaptured.`
    )
  } else {
    insights.push(
      'The class path fell below BAU on average. Net drag across the journey means value was destroyed rather than created.'
    )
  }

  // 4. Late-stage trajectory
  if (lateAvgDelta >= 20) {
    insights.push(
      'Late-stage performance (Expansion → Loyalty) was strong. Earlier gains compounded well and value held through the final stages.'
    )
  } else if (lateAvgDelta >= 5) {
    insights.push(
      'Late-stage performance was moderate. Some value built in earlier rounds was not fully sustained through Expansion and Loyalty.'
    )
  } else if (lateAvgDelta >= 0) {
    insights.push(
      'Late-stage performance was flat. Gains from the first half barely carried into the final three stages — a missed compounding opportunity.'
    )
  } else {
    insights.push(
      'Late-stage performance was weak. Choices at Expansion, Retention, or Loyalty eroded earlier gains — the biggest missed opportunity in the simulation.'
    )
  }

  return insights
}

// ── Score metadata ────────────────────────────────────────────────────────────
const SCORE_META = {
  cei:       { label: 'CEI Impact',       hint: 'Customer economic index' },
  trust:     { label: 'Trust Impact',     hint: 'Customer trust score' },
  cost:      { label: 'Cost Impact',      hint: 'Operational efficiency' },
  retention: { label: 'Retention Impact', hint: 'Customer retention' },
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FinalSummary({
  score,
  livePath,
  baselinePath,
  bestPath,
  journeyStages,
  onReset,
}) {
  const result   = getResult(score.cei)
  const insights = generateInsights(livePath, baselinePath, bestPath, journeyStages)

  return (
    <div className="final-summary">

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
