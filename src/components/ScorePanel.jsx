// ── Formatting helpers ────────────────────────────────────────────────────────
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

function fmtScore(value) {
  return String(Math.round(value))
}

function calculateDeltaFromBaseline(currentValue, baselineValue) {
  return Math.round(currentValue - baselineValue)
}

function fmtBaselineDelta(value) {
  if (value === 0) return 'At baseline'
  return `${value > 0 ? '+' : ''}${Math.round(value)} vs baseline`
}

function fmtInlineBaselineDelta(value) {
  if (value === 0) return '(baseline)'
  return `(${value > 0 ? '+' : ''}${value} vs baseline)`
}

function fmtDelta(key, value) {
  if (value === 0) return 'No change vs actual choice'

  if (key === 'budgetRemaining' || key === 'cumulativeAiSpend' || key === 'cumulativeRevenue') {
    return `${value > 0 ? '+' : '−'}${fmtGBP(Math.abs(value))} vs actual choice`
  }

  if (key === '_revenueUpliftPct') {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)} pts vs actual choice`
  }

  if (key === 'adoption') {
    return `${value > 0 ? '+' : ''}${Math.round(value)} pts vs actual choice`
  }

  return `${value > 0 ? '+' : ''}${Math.round(value)} vs actual choice`
}

const KPI_GROUPS = [
  {
    title: 'CONTROL',
    tone: 'control',
    items: [
      {
        key:        'budgetRemaining',
        label:      'Remaining Budget (£)',
        hint:       'budget available',
        format:     fmtGBP,
        isPositive: v => v > 0,
      },
      {
        key:        'cumulativeAiSpend',
        label:      'Cumulative AI Costs (£)',
        hint:       'AI operating costs',
        format:     fmtGBP,
        isPositive: () => true,
      },
    ],
  },
  {
    title: 'EXPERIENCE',
    tone: 'experience',
    items: [
      {
        key:        'trust',
        label:      'Trust Index',
        hint:       'trust trajectory',
        format:     fmtScore,
        isPositive: (v, cfg) => v >= cfg.startingTrust,
      },
      {
        key:        'adoption',
        label:      'Adoption Score',
        hint:       'customer take-up',
        format:     v => fmtInt(v) + '%',
        isPositive: (v, cfg) => v >= cfg.startingAdoption,
      },
    ],
  },
  {
    title: 'BUSINESS OUTCOME',
    tone: 'outcome',
    items: [
      {
        key:        'customerEconomicValueIndex',
        label:      'Customer Value Index (CVI, index)',
        hint:       'value trajectory',
        format:     fmtScore,
        isPositive: (v, cfg) => v >= cfg.startingCustomerValueIndex,
      },
      {
        key:        '_revenueUpliftPct',
        label:      'Revenue Uplift (%)',
        hint:       'vs revenue base',
        format:     fmtPct,
        isPositive: v => v >= 0,
      },
    ],
  },
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function ScorePanel({
  kpis,
  actualKpis,
  selectedOption,
  previewOption,
  hasSimulationStarted,
  simulationConfig,
}) {
  const cfg = simulationConfig
  const isCounterfactual = Boolean(previewOption && actualKpis)
  const isBaselineView = !hasSimulationStarted && !previewOption

  // Derive revenue uplift % from state at render time
  const enriched = {
    ...kpis,
    _revenueUpliftPct: (kpis.cumulativeRevenue / cfg.startingRevenueBase) * 100,
  }

  const actualEnriched = actualKpis
    ? {
        ...actualKpis,
        _revenueUpliftPct: (actualKpis.cumulativeRevenue / cfg.startingRevenueBase) * 100,
      }
    : null

  const mainRevenuePositive = enriched.cumulativeRevenue >= 0
  const mainRevenueDelta = actualEnriched
    ? enriched.cumulativeRevenue - actualEnriched.cumulativeRevenue
    : 0

  const baselineDeltas = {
    trust: calculateDeltaFromBaseline(enriched.trust, cfg.startingTrust),
    adoption: calculateDeltaFromBaseline(enriched.adoption, cfg.startingAdoption),
    customerEconomicValueIndex: calculateDeltaFromBaseline(
      enriched.customerEconomicValueIndex,
      cfg.startingCustomerValueIndex
    ),
  }

  return (
    <div className="score-panel">
      <h3 className="score-panel-title">Business KPIs</h3>
      {isBaselineView && (
        <div className="score-baseline-banner">
          <p className="score-baseline-title">Baseline reference state</p>
          <p className="score-baseline-text">
            No decisions have been applied yet. The values below are modelled baseline assumptions used to compare outcomes consistently across the journey — they are not external benchmarks.
          </p>
          <p className="score-baseline-text">
            Trust Index (62) and Adoption Score (40%) represent typical pre-AI starting conditions for an SME banking relationship: moderate trust, partial digital adoption. Customer Value Index (CVI) starts at 100 — this is an index where 100 = baseline, not a maximum score. It rises or falls with decisions and can exceed 100 if AI is deployed well. Revenue uplift and AI costs begin at zero.
          </p>
        </div>
      )}
      {isCounterfactual && (
        <div className="score-preview-banner">
          <p className="score-preview-title">
            Counterfactual view: Option {previewOption.id}
          </p>
          <p className="score-preview-text">
            These KPIs show what this round would look like if Option {previewOption.id} had been chosen instead of Option {selectedOption?.id}. Your actual class choice is unchanged.
          </p>
        </div>
      )}
      <div className="score-main-kpi">
        <span className="score-main-label">Cumulative Revenue (£)</span>
        <span className={`score-main-value ${mainRevenuePositive ? 'positive' : 'negative'}`}>
          {fmtGBP(enriched.cumulativeRevenue)}
        </span>
        <span className="summary-score-hint">
          {isBaselineView ? 'starts at £0 before any decision is made' : 'cumulative revenue created or lost so far'}
          {isCounterfactual ? ` · ${fmtDelta('cumulativeRevenue', mainRevenueDelta)}` : ''}
        </span>
      </div>

      {KPI_GROUPS.map(group => (
        <div key={group.title} className={`score-section score-section-${group.tone}`}>
          <p className="score-section-title">{group.title}</p>
          <div className="score-grid">
            {group.items.map(({ key, label, hint, format, isPositive }) => {
              const value = enriched[key]
              const positive = isPositive(value, cfg)
              const delta = actualEnriched ? value - actualEnriched[key] : 0
              const displayValue = key === 'trust'
                ? `${format(value)} ${fmtInlineBaselineDelta(baselineDeltas.trust)}`
                : key === 'adoption'
                  ? `${format(value)} ${fmtInlineBaselineDelta(baselineDeltas.adoption)}`
                  : key === 'customerEconomicValueIndex'
                    ? `${format(value)} ${fmtInlineBaselineDelta(baselineDeltas.customerEconomicValueIndex)}`
                    : format(value)
              const baselineHint = key === 'budgetRemaining'
                ? `starting budget ${fmtGBP(cfg.startingBudget)}`
                : key === 'cumulativeAiSpend'
                  ? 'starts at £0 before any decision is made'
                  : key === '_revenueUpliftPct'
                    ? 'starts at 0.0% before any decision is made'
                    : key === 'trust'
                      ? `baseline reference ${fmtScore(cfg.startingTrust)} · ${fmtBaselineDelta(baselineDeltas.trust)}`
                      : key === 'adoption'
                        ? `baseline reference ${fmtInt(cfg.startingAdoption)}% · ${fmtBaselineDelta(baselineDeltas.adoption)}`
                        : `index: 100 = baseline · ${fmtBaselineDelta(baselineDeltas.customerEconomicValueIndex)}`

              return (
                <div key={key} className="score-item">
                  <span className="score-key">{label}</span>
                  <span className={`score-value ${positive ? 'positive' : 'negative'}`}>
                    {displayValue}
                  </span>
                  <span className="summary-score-hint">
                    {isBaselineView ? baselineHint : hint}
                    {isCounterfactual ? ` · ${fmtDelta(key, delta)}` : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
