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

  const selectedImpact = selectedOption.businessImpact
  const previewImpact = previewOption.businessImpact
  const revenueDelta = previewImpact.revenueDelta - selectedImpact.revenueDelta
  const trustDelta = previewImpact.trustDelta - selectedImpact.trustDelta
  const customerValueDelta = previewImpact.customerValueDelta - selectedImpact.customerValueDelta
  const aiSpendDelta = previewImpact.aiSpend - selectedImpact.aiSpend

  const revenueComparison = revenueDelta === 0
    ? 'the same revenue'
    : revenueDelta > 0
      ? `${fmtGBP(revenueDelta)} more revenue`
      : `${fmtGBP(Math.abs(revenueDelta))} less revenue`

  const trustComparison = trustDelta === 0
    ? 'the same trust'
    : trustDelta > 0
      ? `${trustDelta} points more trust`
      : `${Math.abs(trustDelta)} points less trust`

  const customerValueComparison = customerValueDelta === 0
    ? 'the same customer value'
    : customerValueDelta > 0
      ? `${customerValueDelta} points more customer value`
      : `${Math.abs(customerValueDelta)} points less customer value`

  const spendComparison = aiSpendDelta === 0
    ? 'the same AI spend'
    : aiSpendDelta > 0
      ? `${fmtGBP(aiSpendDelta)} more AI spend`
      : `${fmtGBP(Math.abs(aiSpendDelta))} less AI spend`

  return (
    <div className="preview-note">
      <p className="panel-label">{`Explaining Option ${previewOption.id}`}</p>
      <p className="preview-title">{`EXPLAINING OPTION ${previewOption.id}`}</p>
      <p className="preview-text">
        {previewOption.explanation}
      </p>
      <p className="preview-text">
        {previewOption.compareSummary.reason}
      </p>
      <p className="preview-text">
        If leaders moved to Option {previewOption.id} instead, the business would take on {fmtGBP(previewImpact.aiSpend)} in AI cost, move trust by {previewImpact.trustDelta > 0 ? '+' : ''}{previewImpact.trustDelta}, shift customer value by {previewImpact.customerValueDelta > 0 ? '+' : ''}{previewImpact.customerValueDelta}, and change revenue by {fmtGBP(previewImpact.revenueDelta)} in this round.
      </p>
      <p className="preview-text">
        Against the chosen Option {selectedOption.id}, that means {revenueComparison}, {trustComparison}, {customerValueComparison}, and {spendComparison}. This is the trade-off under pressure: whether to protect money and trust now, or accept a weaker path that will compound across the rest of the customer journey.
      </p>
    </div>
  )
}

function buildDecisionNarrative(selectedOption, idealOption) {
  if (!selectedOption || !idealOption) return null

  const revenueGap = idealOption.businessImpact.revenueDelta - selectedOption.businessImpact.revenueDelta
  const trustGap = idealOption.businessImpact.trustDelta - selectedOption.businessImpact.trustDelta
  const spendGap = selectedOption.businessImpact.aiSpend - idealOption.businessImpact.aiSpend

  if (selectedOption.id === idealOption.id) {
    return 'This is a balanced leadership choice: strong commercial upside, disciplined spend, and the cleanest trust outcome available in this stage.'
  }

  if (selectedOption.businessImpact.aiSpend < idealOption.businessImpact.aiSpend && revenueGap > 0) {
    return `You protected ${fmtGBP(idealOption.businessImpact.aiSpend - selectedOption.businessImpact.aiSpend)} of budget, but left ${fmtGBP(revenueGap)} of projected revenue on the table. This is a false economy unless later rounds can recover the damage.`
  }

  if (spendGap > 0 && revenueGap >= 0) {
    return `This choice spent ${fmtGBP(spendGap)} more than the best-balanced option and still failed to match the upside. Experience may improve, but the ROI profile weakens.`
  }

  if (trustGap > 0) {
    return `This decision gives away ${trustGap} points of trust against the ideal path. In this simulation, that is not a soft metric: it reduces the quality of every stage that follows.`
  }

  return 'This is a weaker leadership trade-off than the ideal path: less value created, less trust protected, or more budget consumed than necessary.'
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
    messages.push('Budget remaining is getting tight. This materially narrows flexibility for the stages still to come.')
  }

  if (revenueGap >= 1_000_000) {
    messages.push(`You are now ${fmtGBP(revenueGap)} below the ideal revenue path. Missed upside is becoming cumulative, not temporary.`)
  }

  if (trustGap >= 4) {
    messages.push(`Trust is now ${trustGap} points below the ideal path entering ${currentRound.stage}. That increases the cost of recovery in later rounds.`)
  }

  if (spendGap >= 250_000) {
    messages.push(`You have spent ${fmtGBP(spendGap)} more than the ideal path so far. Earlier overspend is reducing strategic room.`)
  }

  if (currentPathGap >= 4) {
    messages.push(`You are ahead of BAU, but still ${currentPathGap} Customer Value Index points behind the ideal AI experience path.`)
  }

  if (currentRoundIndex >= Math.floor(totalRounds / 2) && revenueGap > 0 && budgetRatio < 0.5) {
    messages.push('The margin for recovery is narrowing. Weak earlier trade-offs are now harder to unwind.')
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

  if (spendGap > 0) bullets.push({ tone: 'warning', text: `Spent ${fmtGBP(spendGap)} more than optimal in this stage.` })
  if (revenueGap > 0) bullets.push({ tone: 'negative', text: `${fmtGBP(revenueGap)} behind the ideal strategy in projected stage revenue.` })
  if (trustGap > 0) bullets.push({ tone: 'negative', text: `Trust is ${trustGap} points below ideal, weakening downstream retention and advocacy.` })
  if (cumulativeRevenueGap > 0) bullets.push({ tone: 'warning', text: `${fmtGBP(cumulativeRevenueGap)} behind the ideal cumulative revenue path.` })

  if (bullets.length === 0 && selectedOption.id === idealOption.id) {
    bullets.push({ tone: 'positive', text: 'This matches the ideal leadership choice for this stage.' })
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
  const insightBullets = [...tradeoffBullets, ...pressureMessages.map(text => ({ tone: 'neutral', text }))].slice(0, 4)

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
