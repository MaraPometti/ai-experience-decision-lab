import { useState } from 'react'

function fmtGBP(v) {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `£${(abs / 1_000_000).toFixed(1)}m`
  if (abs >= 1_000)     return `£${(abs / 1_000).toFixed(0)}k`
  return `£${abs}`
}

function firstSentence(text, maxWords = 20) {
  if (!text) return null
  const sentence = text.split('. ')[0].trim().replace(/\.$/, '')
  const words = sentence.split(' ')
  if (words.length <= maxWords) return sentence
  return words.slice(0, maxWords).join(' ') + '...'
}

function renderComparisonSummary(selectedOption, previewOption) {
  if (!selectedOption || !previewOption) return null

  const s = selectedOption.businessImpact
  const p = previewOption.businessImpact

  const revenueDelta = p.revenueDelta - s.revenueDelta
  const trustDelta   = p.trustDelta   - s.trustDelta
  const aiSpendDelta = p.aiSpend      - s.aiSpend

  const fmt = (v, isSpend) => {
    const sign = v > 0 ? '+' : '−'
    return `${sign}${fmtGBP(Math.abs(v))}${isSpend ? ' AI cost' : ' revenue'}`
  }
  const fmtTrust = v => v === 0
    ? 'No trust change'
    : `${v > 0 ? '+' : ''}${v} trust point${Math.abs(v) !== 1 ? 's' : ''}`

  const bullets = [
    {
      tone: revenueDelta >= 0 ? 'positive' : 'negative',
      text: `${fmt(revenueDelta, false)} vs Option ${selectedOption.id}`,
    },
    {
      tone: trustDelta >= 0 ? 'positive' : 'negative',
      text: `${fmtTrust(trustDelta)} vs Option ${selectedOption.id}`,
    },
    {
      tone: aiSpendDelta <= 0 ? 'positive' : 'warning',
      text: `${fmt(aiSpendDelta, true)} vs Option ${selectedOption.id}`,
    },
  ]

  return (
    <>
      <p className="panel-label">
        {`Option ${previewOption.id} vs your choice (Option ${selectedOption.id})`}
      </p>
      <p className="preview-title">
        {`OPTION ${previewOption.id} — COUNTERFACTUAL`}
      </p>
      <div className="preview-bullets">
        {bullets.map(b => (
          <p key={b.text} className={`preview-bullet preview-bullet-${b.tone}`}>
            {b.text}
          </p>
        ))}
      </div>
      <p className="preview-text preview-text-context">
        {previewOption.compareSummary?.reason}
      </p>
    </>
  )
}

export default function ExplanationPanel({
  explanation,
  insightExperience,
  selectedOption,
  previewOption,
  verdictColor,
}) {
  const [expandAnalysis, setExpandAnalysis] = useState(false)

  const whyRows = [
    {
      icon: '📊',
      label: 'Experience',
      bullet: firstSentence(selectedOption?.insightExperience || insightExperience),
      full:   selectedOption?.insightExperience || insightExperience,
    },
    {
      icon: '💰',
      label: 'Cost Logic',
      bullet: firstSentence(selectedOption?.insightCostDrivers),
      full:   selectedOption?.insightCostDrivers,
    },
    {
      icon: '📈',
      label: 'Revenue Impact',
      bullet: firstSentence(selectedOption?.insightRevenue),
      full:   selectedOption?.insightRevenue,
    },
  ]

  return (
    <div className="explanation-panel">

      {/* Card 1 — Aisha's Outcome */}
      {insightExperience && (
        <div className="insight-card insight-card-aisha">
          <p className="panel-label">What Happened to Aisha</p>
          <p className="aisha-outcome-text">{insightExperience}</p>
        </div>
      )}

      {/* Card 2 — Decision Verdict */}
      {selectedOption && explanation && verdictColor && (
        <div className={`insight-card insight-card-verdict verdict-${verdictColor}`}>
          <p className="panel-label">Decision Verdict</p>
          <p className="insight-text">{explanation}</p>
        </div>
      )}

      {/* Card 3 — Why It Matters */}
      {selectedOption && (
        <div className="insight-card insight-card-why">
          {whyRows.map(row => (
            <div key={row.label} className="insight-why-row">
              <span className="insight-why-icon">{row.icon}</span>
              <div className="insight-why-content">
                <span className="insight-why-label">{row.label}</span>
                {(expandAnalysis ? row.full : row.bullet) && (
                  <p className="insight-bullet">• {expandAnalysis ? row.full : row.bullet}</p>
                )}
              </div>
            </div>
          ))}
          <button
            className="show-more-btn"
            style={{ color: 'var(--text-muted)', marginTop: '4px' }}
            onClick={() => setExpandAnalysis(v => !v)}
          >
            {expandAnalysis ? 'Collapse analysis ↑' : 'Expand full analysis ↓'}
          </button>
        </div>
      )}

      {/* Card 4 — Counterfactual */}
      {previewOption && selectedOption && (
        <div className="insight-card insight-card-cf">
          {renderComparisonSummary(selectedOption, previewOption)}
        </div>
      )}

      {/* Placeholder when nothing selected */}
      {!selectedOption && !insightExperience && (
        <div className="insight-block insight-empty">
          <p className="panel-label">Decision insight</p>
          <p className="insight-placeholder">Select an option to see the consequence.</p>
        </div>
      )}

    </div>
  )
}
