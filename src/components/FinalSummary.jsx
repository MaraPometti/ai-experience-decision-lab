// ── Formatting helpers (mirrors ScorePanel) ───────────────────────────────────
function fmtGBP(value) {
  const abs = Math.abs(value)
  const sign = value < 0 ? '−£' : '£'
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1) + 'm'
  if (abs >= 1_000)     return sign + Math.round(abs / 1_000) + 'k'
  return sign + Math.round(abs)
}

function fmtPct(value) {
  const sign = value > 0 ? '+' : ''
  return sign + value.toFixed(1) + '%'
}

function fmtInt(value) {
  return String(Math.round(value))
}

// ── Leadership profile classification ─────────────────────────────────────────
// Evaluated in order: Misaligned → Balanced → Experience Maximizer → Cost Protector
function getProfile(kpis, cfg) {
  const revenueUpliftPct = (kpis.cumulativeRevenue / cfg.startingRevenueBase) * 100

  if (revenueUpliftPct < 2 || kpis.trust < 55 || kpis.cumulativeRevenue < 0) {
    return {
      label: 'Misaligned AI Strategy',
      cls: 'result-red',
      description:
        'The combination of choices destroyed more value than it created. Poor trust management, low adoption, or negative revenue signals a fundamental misalignment between AI investment and customer outcomes.',
    }
  }

  if (revenueUpliftPct >= 6 && kpis.trust >= 72 && kpis.budgetRemaining > 0) {
    return {
      label: 'Balanced AI Leader',
      cls: 'result-green',
      description:
        'The team made consistently strong trade-offs across the journey — building customer trust, driving meaningful revenue uplift, and maintaining budget discipline. This is the profile of a sustainable AI programme.',
    }
  }

  if (kpis.customerEconomicValueIndex >= 125) {
    return {
      label: 'Experience Maximizer',
      cls: 'result-blue',
      description:
        'Decisions prioritised customer experience and value over economic return. The customer relationship is strong, but revenue uplift did not match the level of AI investment. A strong foundation — with tighter economics, this profile converts.',
    }
  }

  return {
    label: 'Cost Protector',
    cls: 'result-amber',
    description:
      'The strategy leaned toward caution and cost control, but significant revenue and customer value upside went uncaptured. The simulation suggests a more selective, higher-leverage AI investment would have delivered better returns.',
  }
}

// ── Final KPI display metadata ────────────────────────────────────────────────
const FINAL_KPI_META = [
  {
    key:        'budgetRemaining',
    label:      'Remaining Budget',
    hint:       'of £8m pilot budget',
    format:     fmtGBP,
    isPositive: v => v > 0,
  },
  {
    key:        'cumulativeAiSpend',
    label:      'AI Spend',
    hint:       'total AI investment',
    format:     fmtGBP,
    isPositive: () => true,
  },
  {
    key:        '_revenueUpliftPct',
    label:      'Revenue Uplift',
    hint:       'on influenced revenue base',
    format:     fmtPct,
    isPositive: v => v >= 0,
  },
  {
    key:        'cumulativeRevenue',
    label:      'Revenue Created',
    hint:       'cumulative revenue uplift',
    format:     fmtGBP,
    isPositive: v => v >= 0,
  },
  {
    key:        'customerEconomicValueIndex',
    label:      'Customer Value Index (index)',
    hint:       'index: 60 = pre-AI baseline',
    format:     fmtInt,
    isPositive: (v, cfg) => v >= cfg.startingCustomerValueIndex,
  },
  {
    key:        'trust',
    label:      'Trust Index',
    hint:       'baseline assumption: 62',
    format:     fmtInt,
    isPositive: (v, cfg) => v >= cfg.startingTrust,
  },
  {
    key:        'adoption',
    label:      'Adoption Score',
    hint:       'baseline assumption: 40%',
    format:     v => fmtInt(v) + '%',
    isPositive: (v, cfg) => v >= cfg.startingAdoption,
  },
]

// ── Path-based debrief insights ───────────────────────────────────────────────
// Derived entirely from path values — unchanged from original logic
function generateInsights(livePath, baselinePath, bestPath, journeyStages) {
  const deltas = livePath.map((v, i) => v - baselinePath[i])

  const maxDelta = Math.max(...deltas)
  const maxIdx   = deltas.indexOf(maxDelta)

  const minDelta = Math.min(...deltas)
  const minIdx   = deltas.indexOf(minDelta)

  const avg     = arr => arr.reduce((a, b) => a + b, 0) / arr.length
  const pct     = Math.round(((avg(livePath) - avg(baselinePath)) / (avg(bestPath) - avg(baselinePath))) * 100)

  const lateAvgDelta = avg([4, 5, 6].map(i => livePath[i] - baselinePath[i]))

  const insights = []

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

// ── Component ─────────────────────────────────────────────────────────────────
export default function FinalSummary({
  kpis,
  simulationConfig,
  livePath,
  baselinePath,
  bestPath,
  journeyStages,
  onReset,
}) {
  const cfg     = simulationConfig
  const profile = getProfile(kpis, cfg)
  const insights = generateInsights(livePath, baselinePath, bestPath, journeyStages)

  const enriched = {
    ...kpis,
    _revenueUpliftPct: (kpis.cumulativeRevenue / cfg.startingRevenueBase) * 100,
  }

  return (
    <div className="final-summary">

      {/* ── Leadership profile ── */}
      <div className="summary-section">
        <p className="summary-section-label">Simulation complete</p>
        <div className={`result-badge ${profile.cls}`}>{profile.label}</div>
        <p className="summary-description">{profile.description}</p>
      </div>

      <hr className="summary-divider" />

      {/* ── Final KPIs ── */}
      <div className="summary-section">
        <p className="summary-section-label">Final business KPIs</p>
        <div className="summary-score-grid">
          {FINAL_KPI_META.map(({ key, label, hint, format, isPositive }) => {
            const value    = enriched[key]
            const positive = isPositive(value, cfg)
            return (
              <div key={key} className="summary-score-item">
                <span className="summary-score-key">{label}</span>
                <span className={`summary-score-value ${positive ? 'positive' : 'negative'}`}>
                  {format(value)}
                </span>
                <span className="summary-score-hint">{hint}</span>
              </div>
            )
          })}
        </div>
      </div>

      <hr className="summary-divider" />

      {/* ── Debrief insights — driven by path values, unchanged ── */}
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
