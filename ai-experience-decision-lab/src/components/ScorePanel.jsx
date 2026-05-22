function fmtGBP(v) {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `£${(abs / 1_000_000).toFixed(1)}m`
  if (abs >= 1_000)     return `£${(abs / 1_000).toFixed(0)}k`
  return `£${abs}`
}

function fmtDelta(v) {
  if (v === 0) return 'same'
  return `${v > 0 ? '+' : ''}${v}`
}

function impactDescription(key, value) {
  if (value == null) return null
  if (key === 'cei') {
    if (value > 0)  return 'Positive impact on customer economic value'
    if (value === 0) return 'No change in customer economic value this round'
    return 'Negative impact on customer economic value'
  }
  if (key === 'trust') {
    if (value > 0)  return 'Trust increased — decision built customer confidence'
    if (value === 0) return 'No change in customer trust'
    return 'Trust decreased — decision eroded confidence'
  }
  if (key === 'cost') {
    if (value >= 2)  return 'Strong cost efficiency — high value per pound of AI spend'
    if (value >= 0)  return 'Moderate AI investment — reasonable for this stage'
    if (value >= -3) return 'Above-average AI spend — weigh against expected returns'
    return 'Expensive — significant budget with limited efficiency'
  }
  if (key === 'retention') {
    if (value > 0)  return 'Positive retention signal — customers more likely to stay'
    if (value === 0) return 'No direct retention impact at this stage'
    return 'Retention signal weakened — increased churn risk'
  }
  return null
}

const ROUND_METRICS = [
  { key: 'cei',       label: 'CEI Impact'   },
  { key: 'trust',     label: 'Trust Impact' },
  { key: 'cost',      label: 'Cost Rating'  },
  { key: 'retention', label: 'Retention'    },
]

export default function ScorePanel({
  kpis,
  actualKpis,
  selectedOption,
  previewOption,
  simulationConfig,
  isRevealMode,
  kpiRationale,
}) {
  const isCounterfactual = Boolean(previewOption && actualKpis)

  const { startingBudget, startingRevenueBase } = simulationConfig
  const budgetRemaining = kpis.budgetRemaining
  const pct       = Math.round((budgetRemaining / startingBudget) * 100)
  const barWidth  = Math.max(0, Math.min(100, pct))
  const gaugeClass = pct > 50 ? 'gauge-green' : pct > 25 ? 'gauge-amber' : 'gauge-red'
  const remainingM = (budgetRemaining / 1_000_000).toFixed(1)

  const si  = selectedOption?.scoreImpact
  const psi = previewOption?.scoreImpact

  // Revenue delta from starting base
  const revDelta         = kpis.cumulativeRevenue - startingRevenueBase
  const actualRevDelta   = actualKpis ? actualKpis.cumulativeRevenue - startingRevenueBase : null

  return (
    <div className={`score-panel-content${isCounterfactual ? ' counterfactual-view' : ''}`}>

      {isCounterfactual && (
        <div className="score-preview-banner">
          <p className="score-preview-title">
            Counterfactual view: Option {previewOption.id}
          </p>
          <p className="score-preview-text">
            These values show what this round would look like if Option {previewOption.id} had
            been chosen instead of Option {selectedOption?.id}.
          </p>
        </div>
      )}

      {/* Section 1 — This Round's Decision Impact */}
      <div className="kpi-section">
        <p className="kpi-section-label">This Round's Decision Impact</p>
        <div className="score-grid">
          {ROUND_METRICS.map(({ key, label }) => {
            const value   = si != null ? si[key] : null
            const cfValue = isCounterfactual && psi != null ? psi[key] : null
            const delta   = cfValue != null && value != null ? cfValue - value : null
            const desc    = impactDescription(key, value)
            return (
              <div key={key} className="score-item">
                <span className="score-key">{label}</span>
                <span className={`score-value ${value == null ? 'neutral' : value >= 0 ? 'positive' : 'negative'}`}>
                  {value == null ? '—' : (value > 0 ? '+' : '') + value}
                </span>
                {desc && (
                  <span className={`score-item-desc ${value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'}`}>
                    {desc}
                  </span>
                )}
                {isRevealMode && kpiRationale?.[key] && (
                  <span className="score-kpi-rationale">{kpiRationale[key]}</span>
                )}
                {isCounterfactual && delta != null && (
                  <span className={`score-delta ${delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral'}`}>
                    {fmtDelta(delta)} vs your choice
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <hr className="insight-divider" />

      {/* Section 2 — Cumulative Journey Score */}
      <div className="kpi-section">
        <p className="kpi-section-label">Cumulative Journey Score</p>
        <div className="cumulative-row">
          <div className="cumulative-item">
            <span className="cumulative-label">Revenue Generated</span>
            <span className={`cumulative-value ${revDelta >= 0 ? 'positive' : 'negative'}`}>
              {revDelta >= 0 ? '+' : '−'}{fmtGBP(Math.abs(revDelta))}
            </span>
            {isCounterfactual && actualRevDelta != null && (() => {
              const d = revDelta - actualRevDelta
              return d !== 0 ? (
                <span className={`score-delta ${d >= 0 ? 'positive' : 'negative'}`}>
                  {d > 0 ? '+' : '−'}{fmtGBP(Math.abs(d))}
                </span>
              ) : null
            })()}
          </div>
          <div className="cumulative-item">
            <span className="cumulative-label">AI Spend</span>
            <span className="cumulative-value">{fmtGBP(kpis.aiSpent)}</span>
          </div>
          <div className="cumulative-item">
            <span className="cumulative-label">Trust Index</span>
            <span className="cumulative-value">{kpis.trust >= 0 ? '+' : ''}{kpis.trust}</span>
            {isCounterfactual && actualKpis && kpis.trust !== actualKpis.trust && (
              <span className={`score-delta ${kpis.trust >= actualKpis.trust ? 'positive' : 'negative'}`}>
                {fmtDelta(kpis.trust - actualKpis.trust)}
              </span>
            )}
          </div>
          <div className="cumulative-item">
            <span className="cumulative-label">CEI Score</span>
            <span className="cumulative-value">{kpis.cei >= 0 ? '+' : ''}{kpis.cei}</span>
            {isCounterfactual && actualKpis && kpis.cei !== actualKpis.cei && (
              <span className={`score-delta ${kpis.cei >= actualKpis.cei ? 'positive' : 'negative'}`}>
                {fmtDelta(kpis.cei - actualKpis.cei)}
              </span>
            )}
          </div>
        </div>
      </div>

      <hr className="insight-divider" />

      {/* Section 3 — Budget Detail */}
      <div className="kpi-section">
        <p className="kpi-section-label">Budget Detail</p>
        <div className="budget-gauge">
          <div className="budget-gauge-header">
            <span className="budget-gauge-label">AI Budget</span>
            <span className="budget-gauge-value">{pct}% · £{remainingM}m remaining</span>
          </div>
          <div className="budget-gauge-track">
            <div className={`budget-gauge-fill ${gaugeClass}`} style={{ width: `${barWidth}%` }} />
          </div>
          {pct < 25 && (
            <p className="budget-gauge-warning">Budget critically low — high-value stages still ahead</p>
          )}
        </div>
      </div>

    </div>
  )
}
