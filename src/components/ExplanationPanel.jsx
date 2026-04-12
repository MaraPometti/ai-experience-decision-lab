import { useState } from 'react'

function fmtGBP(value) {
  const abs = Math.abs(value)
  const sign = value < 0 ? '−£' : '£'
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1) + 'm'
  if (abs >= 1_000)     return sign + Math.round(abs / 1_000) + 'k'
  return sign + Math.round(abs)
}

function renderComparisonSummary(selectedOption, previewOption) {
  if (!selectedOption || !previewOption) return null

  const s = selectedOption.businessImpact
  const p = previewOption.businessImpact

  const revenueDelta    = p.revenueDelta - s.revenueDelta
  const trustDelta      = p.trustDelta   - s.trustDelta
  const aiSpendDelta    = p.aiSpend      - s.aiSpend

  const fmt = (v, isSpend) => {
    const sign = v > 0 ? '+' : '−'
    return `${sign}${fmtGBP(Math.abs(v))}${isSpend ? ' AI cost' : ' revenue'}`
  }
  const fmtTrust = v => v === 0 ? 'No trust change' : `${v > 0 ? '+' : ''}${v} trust point${Math.abs(v) !== 1 ? 's' : ''}`

  const bullets = [
    { tone: revenueDelta >= 0 ? 'positive' : 'negative', text: `${fmt(revenueDelta, false)} vs Option ${selectedOption.id}` },
    { tone: trustDelta >= 0 ? 'positive' : 'negative',   text: `${fmtTrust(trustDelta)} vs Option ${selectedOption.id}` },
    { tone: aiSpendDelta <= 0 ? 'positive' : 'warning',  text: `${fmt(aiSpendDelta, true)} vs Option ${selectedOption.id}` },
  ]

  return (
    <div className="preview-note">
      <p className="panel-label">{`Option ${previewOption.id} vs your choice (Option ${selectedOption.id})`}</p>
      <p className="preview-title">{`OPTION ${previewOption.id} — COUNTERFACTUAL`}</p>
      <div className="preview-bullets">
        {bullets.map(b => (
          <p key={b.text} className={`preview-bullet preview-bullet-${b.tone}`}>{b.text}</p>
        ))}
      </div>
      <p className="preview-text preview-text-context">{previewOption.compareSummary.reason}</p>
    </div>
  )
}

function buildDecisionNarrative(selectedOption, idealOption) {
  if (!selectedOption || !idealOption) return null

  const revenueGap = idealOption.businessImpact.revenueDelta - selectedOption.businessImpact.revenueDelta
  const trustGap = idealOption.businessImpact.trustDelta - selectedOption.businessImpact.trustDelta
  const spendGap = selectedOption.businessImpact.aiSpend - idealOption.businessImpact.aiSpend

  if (selectedOption.id === idealOption.id) {
    return 'This matches the Optimal AI Experience path: precise targeting architecture, disciplined inference spend, and the strongest trust outcome available at this stage.'
  }

  if (selectedOption.businessImpact.aiSpend < idealOption.businessImpact.aiSpend && revenueGap > 0) {
    return `This choice preserved ${fmtGBP(idealOption.businessImpact.aiSpend - selectedOption.businessImpact.aiSpend)} of AI budget versus the Optimal AI Experience path, but the lower inference investment reduced specificity and contextual awareness — leaving ${fmtGBP(revenueGap)} of revenue uncaptured. Reduced AI spend at a high-leverage stage is not cost discipline: it is a compounding disadvantage.`
  }

  if (spendGap > 0 && revenueGap >= 0) {
    return `This choice consumed ${fmtGBP(spendGap)} more in AI inference cost than the Optimal AI Experience path — and still delivered less revenue. Higher spend without architectural precision is the defining cost failure of agentic AI systems.`
  }

  if (trustGap > 0) {
    return `This decision concedes ${trustGap} trust points versus the Optimal AI Experience path. In agentic AI systems, trust is the compounding variable: lower trust reduces adoption, weakens engagement depth, and erodes retention resilience at every subsequent stage.`
  }

  return 'This creates a compounding disadvantage versus the Optimal AI Experience path — less value created, less trust preserved, or more AI cost consumed than the experience architecture requires.'
}

function buildPressureMessages({ kpis, idealKpis, simulationConfig, currentRoundIndex, totalRounds, livePath, bestPath, currentRound }) {
  if (!currentRound) return []

  const messages = []
  const budgetRatio = kpis.budgetRemaining / simulationConfig.startingBudget
  const revenueGap = idealKpis.cumulativeRevenue - kpis.cumulativeRevenue
  const trustGap = idealKpis.trust - kpis.trust
  const spendGap = kpis.cumulativeAiSpend - idealKpis.cumulativeAiSpend
  const currentPathGap = bestPath[currentRound.stageIndex] - livePath[currentRound.stageIndex]

  if (budgetRatio <= 0.25) {
    messages.push('AI budget is critically low. The remaining stages offer limited flexibility to invest in higher-specificity or higher-proactiveness architectures.')
  }

  if (revenueGap >= 1_000_000) {
    messages.push(`Now ${fmtGBP(revenueGap)} below the Optimal AI Experience revenue trajectory — the cumulative gap reflects compounding AIX architecture decisions, visible as divergence in the chart.`)
  }

  if (trustGap >= 4) {
    messages.push(`Trust is ${trustGap} points below the Optimal AI Experience path entering ${currentRound.stage}. Lower trust at this stage suppresses adoption and reduces the receptiveness that makes future agentic interventions effective.`)
  }

  if (spendGap >= 250_000) {
    messages.push(`${fmtGBP(spendGap)} more in AI inference cost than the Optimal AI Experience path so far — the excess spend has not produced proportionate specificity or contextual value, and it narrows budget for higher-leverage stages ahead.`)
  }

  if (currentPathGap >= 4) {
    messages.push(`Ahead of the BAU Experience path, but ${currentPathGap} CVI points behind the Optimal AI Experience path — the gap reflects the cumulative difference in agentic architecture quality (visible in the chart).`)
  }

  if (currentRoundIndex >= Math.floor(totalRounds / 2) && revenueGap > 0 && budgetRatio < 0.5) {
    messages.push('Recovery margin is narrowing. Suboptimal agentic architecture decisions from earlier stages are now harder to compensate for — the compounding effect is locked in.')
  }

  return messages.slice(0, 4)
}

function buildTradeoffBullets(selectedOption, idealOption, kpis, idealKpis) {
  if (!selectedOption || !idealOption) return []
  const revenueGap = idealOption.businessImpact.revenueDelta - selectedOption.businessImpact.revenueDelta
  const trustGap = idealOption.businessImpact.trustDelta - selectedOption.businessImpact.trustDelta
  const spendGap = selectedOption.businessImpact.aiSpend - idealOption.businessImpact.aiSpend
  const cumulativeRevenueGap = idealKpis.cumulativeRevenue - kpis.cumulativeRevenue
  const bullets = []

  if (spendGap > 0) bullets.push({ tone: 'warning', text: `${fmtGBP(spendGap)} more AI inference cost than the Optimal AI Experience path — higher spend without proportionate specificity or contextual precision (see Business KPIs).` })
  if (revenueGap > 0) bullets.push({ tone: 'negative', text: `${fmtGBP(revenueGap)} below the Optimal AI Experience revenue at this stage — the CVI divergence from the agentic architecture gap is visible in the chart.` })
  if (trustGap > 0) bullets.push({ tone: 'negative', text: `Trust is ${trustGap} point${trustGap !== 1 ? 's' : ''} below the Optimal AI Experience path — trust lost at this stage compounds into lower adoption and weaker retention resilience ahead.` })
  if (cumulativeRevenueGap > 0) bullets.push({ tone: 'warning', text: `Cumulative revenue is ${fmtGBP(cumulativeRevenueGap)} below the Optimal AI Experience trajectory — each suboptimal architecture decision compounds the gap.` })

  if (bullets.length === 0 && selectedOption.id === idealOption.id) {
    bullets.push({ tone: 'positive', text: 'This matches the Optimal AI Experience path for this stage.' })
  }

  return bullets.slice(0, 4)
}

export default function ExplanationPanel({
  explanation,
  currentRound,
  currentRoundIndex,
  totalRounds,
  livePath,
  bestPath,
  kpis,
  idealKpis,
  simulationConfig,
  selectedOption,
  previewOption,
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const idealOption = currentRound?.options.find(option => option.id === currentRound.bestOptionId) || null
  const pressureMessages = buildPressureMessages({
    kpis,
    idealKpis,
    simulationConfig,
    currentRoundIndex,
    totalRounds,
    livePath,
    bestPath,
    currentRound,
  })
  const decisionNarrative = buildDecisionNarrative(selectedOption, idealOption)
  const tradeoffBullets = buildTradeoffBullets(selectedOption, idealOption, kpis, idealKpis)
  const insightBullets = [...tradeoffBullets, ...pressureMessages.map(text => ({ tone: 'neutral', text }))].slice(0, 3)

  return (
    <div className="explanation-panel">

      {/* Decision insight */}
      <div className={`insight-block ${explanation ? '' : 'insight-empty'}`}>
        <p className="panel-label">Decision insight</p>
        <p className="insight-title">DECISION INSIGHT</p>
        {explanation
          ? (
            <>
              {decisionNarrative && <p className="insight-text insight-emphasis">{decisionNarrative}</p>}
              {selectedOption?.insightExperience && (
                <p className="insight-text insight-section"><strong>Experience:</strong> {selectedOption.insightExperience}</p>
              )}
              {selectedOption?.insightCostDrivers && (
                <p className="insight-text insight-section"><strong>Cost drivers:</strong> {selectedOption.insightCostDrivers}</p>
              )}
              {selectedOption?.insightRevenue && (
                <p className="insight-text insight-section"><strong>Revenue impact:</strong> {selectedOption.insightRevenue}</p>
              )}
              {insightBullets.length > 0 && (
                <div className="insight-bullets">
                  {insightBullets.map(item => (
                    <p key={item.text} className={`insight-bullet ${item.tone}`}>{item.text}</p>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="insight-toggle"
                onClick={() => setIsExpanded(value => !value)}
              >
                {isExpanded ? 'Hide Full Explanation' : 'Expand Full Explanation'}
              </button>
              {isExpanded && <p className="insight-text insight-detail">{explanation}</p>}
            </>
          )
          : <p className="insight-placeholder">Choose an option to see the strategic consequence.</p>
        }
      </div>

      {/* Explanation note — only shown when an explanation is active */}
      {renderComparisonSummary(selectedOption, previewOption)}

    </div>
  )
}
