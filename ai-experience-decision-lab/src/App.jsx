import { useState, useEffect } from 'react'
import scenario from './data/scenario.json'
import FinalSummary from './components/FinalSummary'
import OptionCards from './components/OptionCards'
import ValueChart from './components/ValueChart'
import ScenarioHeader from './components/ScenarioHeader'
import ExplanationPanel from './components/ExplanationPanel'
import ScorePanel from './components/ScorePanel'

const INITIAL_SCORE = { cei: 0, trust: 0, cost: 0, retention: 0 }

function fmtGBP(v) {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `£${(abs / 1_000_000).toFixed(1)}m`
  if (abs >= 1_000)     return `£${(abs / 1_000).toFixed(0)}k`
  return `£${abs}`
}

function applyBusinessImpact(baseKpis, bi) {
  return {
    cumulativeRevenue: baseKpis.cumulativeRevenue + (bi.revenueDelta || 0),
    budgetRemaining:   baseKpis.budgetRemaining + bi.budgetDelta,
    aiSpent:           baseKpis.aiSpent + bi.aiSpend,
    cei:               baseKpis.cei       + (bi.ceiDelta       || 0),
    trust:             baseKpis.trust     + (bi.trustDelta     || 0),
    cost:              baseKpis.cost,
    retention:         baseKpis.retention + (bi.retentionDelta || 0),
  }
}

function formatTime(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── Chip label helpers (FIX 6) ─────────────────────────────────────────────
function costLabel(v) {
  if (v == null) return { text: '—',              cls: 'chip-neutral' }
  if (v >= 2)    return { text: 'Cost-efficient', cls: 'chip-positive' }
  if (v >= 0)    return { text: 'Moderate spend', cls: 'chip-neutral' }
  if (v >= -3)   return { text: 'Above average',  cls: 'chip-budget-amber' }
  return              { text: 'Expensive',        cls: 'chip-negative' }
}

function retentionLabel(v) {
  if (v == null) return { text: '—',       cls: 'chip-neutral' }
  if (v >= 3)    return { text: 'Strong',   cls: 'chip-positive' }
  if (v >= 1)    return { text: 'Moderate', cls: 'chip-neutral' }
  if (v === 0)   return { text: 'Neutral',  cls: 'chip-neutral' }
  return              { text: 'At risk',   cls: 'chip-negative' }
}

export default function App() {
  // ── URL parameter detection ────────────────────────────────────────────────
  const params       = new URLSearchParams(window.location.search)
  const getParam     = (key) => (params.get(key) || '').replace(/\/+$/, '')
  const isPlayMode   = params.has('team') || getParam('play') === 'true'
  const isRevealMode = !isPlayMode
  const timerMinutes = parseInt(getParam('timer') || '20', 10)
  const teamParam    = getParam('team')

  const {
    scenarioTitle,
    scenarioSubtitle,
    journeyStages,
    baselinePath,
    bestPath,
    rounds,
    simulationConfig,
  } = scenario

  // ── simulation state ───────────────────────────────────────────────────────
  const [currentRoundIndex,    setCurrentRoundIndex]    = useState(0)
  const [livePath,             setLivePath]             = useState([...baselinePath])
  const [roundStartPath,       setRoundStartPath]       = useState(null)
  const [roundStartKpis,       setRoundStartKpis]       = useState(null)
  const [selectedOption,       setSelectedOption]       = useState(null)
  const [previewOption,        setPreviewOption]        = useState(null)
  const [explanation,          setExplanation]          = useState('')
  const [insightExperience,    setInsightExperience]    = useState('')
  const [score,                setScore]                = useState({ ...INITIAL_SCORE })
  const [isComplete,           setIsComplete]           = useState(false)
  const [hasSimulationStarted, setHasSimulationStarted] = useState(false)
  const [budgetRemaining,      setBudgetRemaining]      = useState(simulationConfig.startingBudget)
  const [cumulativeRevDelta,   setCumulativeRevDelta]   = useState(0)
  const [history,              setHistory]              = useState([])
  const [choices,              setChoices]              = useState([])

  // ── team / game state ──────────────────────────────────────────────────────
  const [teamName,    setTeamName]    = useState(teamParam)
  const [gameStarted, setGameStarted] = useState(isRevealMode || Boolean(teamParam))

  // ── timer state ────────────────────────────────────────────────────────────
  const [timeLeft,    setTimeLeft]    = useState(timerMinutes * 60)
  const [timerPaused, setTimerPaused] = useState(false)

  // ── drawer / overlay state ─────────────────────────────────────────────────
  const [insightOpen,     setInsightOpen]     = useState(false)
  const [kpiOpen,         setKpiOpen]         = useState(false)
  const [methodologyOpen, setMethodologyOpen] = useState(false)

  // ── chart toggles ──────────────────────────────────────────────────────────
  const [showBestPath, setShowBestPath] = useState(true)

  // ── timer effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameStarted || isRevealMode || isComplete || timerPaused) return
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [gameStarted, isRevealMode, isComplete, timerPaused])

  const currentRound = isComplete ? null : rounds[currentRoundIndex]

  // ── kpis snapshot ──────────────────────────────────────────────────────────
  const kpis = {
    cumulativeRevenue: simulationConfig.startingRevenueBase + cumulativeRevDelta,
    budgetRemaining,
    aiSpent: simulationConfig.startingBudget - budgetRemaining,
    cei:       score.cei,
    trust:     score.trust,
    cost:      score.cost,
    retention: score.retention,
  }

  // ── counterfactual derived values ──────────────────────────────────────────
  const previewPath =
    previewOption && roundStartPath
      ? roundStartPath.map((v, i) => v + previewOption.pathImpact[i])
      : null

  const previewKpis =
    previewOption && roundStartKpis
      ? applyBusinessImpact(roundStartKpis, previewOption.businessImpact)
      : null

  const cfRevenue = previewKpis?.cumulativeRevenue ?? null
  const cfDelta   = cfRevenue != null
    ? cfRevenue - kpis.cumulativeRevenue
    : null

  // ── display financials ─────────────────────────────────────────────────────
  const revDeltaM = (Math.abs(cumulativeRevDelta) / 1_000_000).toFixed(1)
  const budgetM   = (budgetRemaining / 1_000_000).toFixed(1)
  const budgetPct = Math.round((budgetRemaining / simulationConfig.startingBudget) * 100)

  const cfRevDelta = previewKpis
    ? previewKpis.cumulativeRevenue - simulationConfig.startingRevenueBase
    : null

  // ── verdict border color — reveal mode only ────────────────────────────────
  const verdictColor = (!isRevealMode || !selectedOption || !currentRound) ? null : (() => {
    if (selectedOption.id === currentRound.bestOptionId) return 'green'
    const bestOpt = currentRound.options.find(o => o.id === currentRound.bestOptionId)
    const bestRev = bestOpt?.businessImpact?.revenueDelta ?? 0
    const selRev  = selectedOption.businessImpact?.revenueDelta ?? 0
    if (bestRev === 0) return 'amber'
    const pctDiff = Math.abs(bestRev - selRev) / Math.abs(bestRev)
    return pctDiff <= 0.2 ? 'amber' : 'red'
  })()

  // ── timer class ────────────────────────────────────────────────────────────
  const timerClass =
    timeLeft > 600 ? 'timer-calm'     :
    timeLeft > 300 ? 'timer-warm'     :
    timeLeft > 120 ? 'timer-pressure' :
    timeLeft > 0   ? 'timer-urgent'   :
    'timer-expired'

  const timerBarPct   = Math.max(0, (timeLeft / (timerMinutes * 60)) * 100)
  const timerBarColor =
    timeLeft > 600 ? 'timer-bar-green' :
    timeLeft > 300 ? 'timer-bar-amber' :
    timeLeft > 0   ? 'timer-bar-red'   :
    'timer-bar-expired'

  // ── chip colour helpers — always neutral in play mode ─────────────────────
  const revChipClass   = isPlayMode ? 'chip-neutral' : (cumulativeRevDelta === 0 ? 'chip-neutral' : cumulativeRevDelta > 0 ? 'chip-positive' : 'chip-negative')
  const trustChipClass = isPlayMode ? 'chip-neutral' : (score.trust === 0 ? 'chip-neutral' : score.trust > 0 ? 'chip-positive' : 'chip-negative')
  const ceiChipClass   = isPlayMode ? 'chip-neutral' : (score.cei === 0   ? 'chip-neutral' : score.cei > 0   ? 'chip-positive' : 'chip-negative')
  const budgetChipClass = isPlayMode ? 'chip-neutral' : (
    budgetPct > 50 ? 'chip-neutral'         :
    budgetPct > 25 ? 'chip-budget-amber'    :
    budgetPct >= 0 ? 'chip-budget-red'      :
    'chip-budget-overspent'
  )
  const costInfo      = costLabel(selectedOption?.scoreImpact?.cost ?? null)
  const retentionInfo = retentionLabel(selectedOption?.scoreImpact?.retention ?? null)

  // ── handlers ──────────────────────────────────────────────────────────────

  function handleSelectOption(option) {
    if (selectedOption !== null) return

    setHistory(prev => [...prev, {
      roundIndex:         currentRoundIndex,
      livePath:           [...livePath],
      score:              { ...score },
      budgetRemaining,
      cumulativeRevDelta,
      hasSimulationStarted,
    }])

    setRoundStartPath([...livePath])
    setRoundStartKpis({ ...kpis })
    setPreviewOption(null)

    setLivePath(livePath.map((v, i) => v + option.pathImpact[i]))
    setScore(prev => ({
      cei:       prev.cei       + option.scoreImpact.cei,
      trust:     prev.trust     + option.scoreImpact.trust,
      cost:      prev.cost      + option.scoreImpact.cost,
      retention: prev.retention + option.scoreImpact.retention,
    }))
    setBudgetRemaining(prev => prev + option.businessImpact.budgetDelta)
    setCumulativeRevDelta(prev => prev + (option.businessImpact.revenueDelta || 0))
    setSelectedOption(option)
    setExplanation(option.explanation)
    setInsightExperience(option.insightExperience || '')
    setHasSimulationStarted(true)
    setChoices(prev => [...prev, option.id])
    setKpiOpen(false)
  }

  function handlePreviewOption(option) {
    if (!selectedOption) return
    setPreviewOption(prev => (prev?.id === option.id ? null : option))
  }

  function handleClearPreview() {
    setPreviewOption(null)
  }

  function handleNextRound() {
    if (!selectedOption || isComplete) return
    const nextIndex = currentRoundIndex + 1
    if (nextIndex >= rounds.length) {
      setIsComplete(true)
    } else {
      setCurrentRoundIndex(nextIndex)
    }
    setSelectedOption(null)
    setPreviewOption(null)
    setExplanation('')
    setInsightExperience('')
    setRoundStartPath(null)
    setRoundStartKpis(null)
    setInsightOpen(false)
    setKpiOpen(false)
  }

  function handlePrevRound() {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setCurrentRoundIndex(prev.roundIndex)
    setLivePath([...prev.livePath])
    setScore({ ...prev.score })
    setBudgetRemaining(prev.budgetRemaining)
    setCumulativeRevDelta(prev.cumulativeRevDelta)
    setHasSimulationStarted(prev.hasSimulationStarted)
    setSelectedOption(null)
    setPreviewOption(null)
    setExplanation('')
    setInsightExperience('')
    setRoundStartPath(null)
    setRoundStartKpis(null)
    setIsComplete(false)
    setInsightOpen(false)
    setKpiOpen(false)
    setChoices(prev => prev.slice(0, -1))
  }

  function handleReset() {
    setCurrentRoundIndex(0)
    setLivePath([...baselinePath])
    setRoundStartPath(null)
    setRoundStartKpis(null)
    setSelectedOption(null)
    setPreviewOption(null)
    setExplanation('')
    setInsightExperience('')
    setScore({ ...INITIAL_SCORE })
    setBudgetRemaining(simulationConfig.startingBudget)
    setCumulativeRevDelta(0)
    setIsComplete(false)
    setHasSimulationStarted(false)
    setHistory([])
    setInsightOpen(false)
    setKpiOpen(false)
    setMethodologyOpen(false)
    setChoices([])
    setTimeLeft(timerMinutes * 60)
    setTimerPaused(false)
  }

  // ── team entry screen (play mode only) ────────────────────────────────────
  if (!gameStarted) {
    return (
      <div className="team-entry">
        <h1 className="team-entry-title">{scenarioTitle}</h1>
        <p className="team-entry-subtitle">{scenarioSubtitle}</p>
        <div className="team-entry-form">
          <label className="team-entry-label">Enter your team name</label>
          <input
            className="team-entry-input"
            type="text"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && teamName.trim().length >= 2) setGameStarted(true)
            }}
            placeholder="Team Alpha"
            autoFocus
          />
          <button
            className="btn btn-primary team-entry-btn"
            disabled={teamName.trim().length < 2}
            onClick={() => setGameStarted(true)}
          >
            Start the Challenge →
          </button>
          <p className="team-entry-timer-note">
            You have {timerMinutes} minutes. Make it count.
          </p>
        </div>
      </div>
    )
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="app">

      {/* ── App header ── */}
      <header className="app-header">
        <div className="header-title">
          <h1 className="app-title">{scenarioTitle}</h1>
          <p className="app-subtitle">{scenarioSubtitle}</p>
        </div>
        <div className="header-meta">

          {/* Timer pill — play mode only */}
          {!isRevealMode && !isComplete && (
            <div className="timer-wrap">
              <div className={`timer-pill ${timerClass}`}>
                <span className="timer-text">
                  {timeLeft === 0
                    ? "TIME'S UP"
                    : `Round ${currentRoundIndex + 1}/${rounds.length} · ${formatTime(timeLeft)}`}
                </span>
                <button
                  className="timer-btn"
                  onClick={() => setTimerPaused(v => !v)}
                  title={timerPaused ? 'Resume timer' : 'Pause timer'}
                >
                  {timerPaused ? '▶' : '⏸'}
                </button>
                <button
                  className="timer-btn"
                  onClick={() => setTimeLeft(timerMinutes * 60)}
                  title="Restart timer"
                >
                  ↺
                </button>
              </div>
              {timeLeft > 0 && timeLeft <= 120 && (
                <div className="timer-label">HURRY!</div>
              )}
            </div>
          )}

          {/* Team name — play mode */}
          {!isRevealMode && teamName && (
            <span className="badge badge-stage">{teamName}</span>
          )}

          {isComplete ? (
            <span className="badge badge-complete">Simulation complete</span>
          ) : (
            <>
              {isRevealMode && (
                <span className="badge badge-round">Round {currentRoundIndex + 1} / {rounds.length}</span>
              )}
            </>
          )}

        </div>
      </header>

      {/* ── Timer progress bar — play mode only ── */}
      {!isRevealMode && (
        <div className="timer-bar-container">
          <div
            className={`timer-bar ${timerBarColor}`}
            style={{ width: `${timerBarPct}%` }}
          />
        </div>
      )}

      {/* ── Stage navigation tabs — reveal mode only ── */}
      {isRevealMode && (
        <nav className="stage-nav">
          {journeyStages.map((stage, i) => (
            <div
              key={stage}
              className={[
                'stage-tab',
                (i === currentRoundIndex && !isComplete) ? 'stage-tab-active' : '',
                (i < currentRoundIndex || isComplete)   ? 'stage-tab-done'   : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="stage-tab-num">
                {(i < currentRoundIndex || isComplete) ? '✓' : i + 1}
              </span>
              <span className="stage-tab-label">{stage}</span>
            </div>
          ))}
        </nav>
      )}

      {/* ── Main 2-panel grid ── */}
      <main className="main-grid">

        {/* LEFT: decision area */}
        <section className="col col-left">
          {currentRound ? (
            <>
              <ScenarioHeader
                roundTitle={currentRound.title}
                aishaContext={currentRound?.aishaContext}
                isFinished={isComplete}
              />
              <OptionCards
                options={currentRound.options}
                selectedOption={selectedOption}
                previewOption={previewOption}
                bestOptionId={currentRound.bestOptionId}
                onSelectOption={handleSelectOption}
                onPreviewOption={handlePreviewOption}
                showBest={isRevealMode}
              />
              {/* Aisha's outcome — reveal mode only */}
              {isRevealMode && selectedOption && insightExperience && (
                <div className="aisha-outcome">
                  <p className="panel-label">What happened to Aisha</p>
                  <p className="aisha-outcome-text">{insightExperience}</p>
                </div>
              )}
            </>
          ) : (
            <FinalSummary
              score={score}
              livePath={livePath}
              baselinePath={baselinePath}
              bestPath={bestPath}
              journeyStages={journeyStages}
              onReset={handleReset}
              teamName={teamName}
              choices={choices}
            />
          )}
        </section>

        {/* RIGHT: chart + insight area */}
        <section className="col col-right">

          {/* Drawer tabs — reveal mode only */}
          {!isComplete && isRevealMode && (
            <div className="drawer-tabs">
              <button
                className={`drawer-tab ${insightOpen ? 'active' : ''}`}
                disabled={!selectedOption}
                onClick={() => { setInsightOpen(v => !v); setKpiOpen(false) }}
              >
                Decision Insight
              </button>
              <button
                className={`drawer-tab ${kpiOpen ? 'active' : ''}`}
                onClick={() => { setKpiOpen(v => !v); setInsightOpen(false) }}
              >
                KPI Detail
              </button>
            </div>
          )}

          {/* Decision Insight drawer — reveal mode only */}
          {isRevealMode && insightOpen && (
            <div className="drawer">
              <div className="drawer-header">
                <span className="drawer-title">Decision Insight</span>
                <button className="drawer-close" onClick={() => setInsightOpen(false)}>Close ✕</button>
              </div>
              <ExplanationPanel
                explanation={explanation}
                insightExperience={insightExperience}
                selectedOption={selectedOption}
                previewOption={previewOption}
                verdictColor={verdictColor}
              />
            </div>
          )}

          {/* KPI Detail drawer — reveal mode only */}
          {isRevealMode && kpiOpen && (
            <div className="drawer">
              <div className="drawer-header">
                <span className="drawer-title">KPI Detail</span>
                <button className="drawer-close" onClick={() => setKpiOpen(false)}>Close ✕</button>
              </div>
              <ScorePanel
                kpis={previewKpis || kpis}
                actualKpis={kpis}
                selectedOption={selectedOption}
                previewOption={previewOption}
                simulationConfig={simulationConfig}
                isRevealMode={isRevealMode}
                kpiRationale={(previewOption || selectedOption)?.kpiRationale ?? null}
              />
            </div>
          )}

          {/* Info strip: budget gauge (left) + chip row (right) */}
          <div className="info-strip">
            <div className="info-strip-left">
              <div className="budget-gauge-header">
                <span className="budget-gauge-label">AI Budget</span>
                <span className="budget-gauge-value">{budgetPct}% · £{budgetM}m</span>
              </div>
              <div className="budget-gauge-track">
                <div
                  className={`budget-gauge-fill ${budgetPct > 50 ? 'gauge-green' : budgetPct > 25 ? 'gauge-amber' : 'gauge-red'}`}
                  style={{ width: `${Math.max(0, Math.min(100, budgetPct))}%` }}
                />
              </div>
            </div>
            <div className="info-strip-right">
              {/* FIX 6: 4 chips always; 2 extra in reveal mode */}
              <div className="chip-row">
                <span className={`chip ${revChipClass}`}>💰 {cumulativeRevDelta >= 0 ? '+' : '−'}£{revDeltaM}m revenue</span>
                <span className={`chip ${budgetChipClass}`}>🏦 £{budgetM}m left</span>
                <span className={`chip ${trustChipClass}`}>❤️ Trust: {score.trust >= 0 ? '+' : ''}{score.trust}</span>
                <span className={`chip ${ceiChipClass}`}>📈 CEI: {score.cei >= 0 ? '+' : ''}{score.cei}</span>
                {isRevealMode && (
                  <>
                    <span className={`chip ${costInfo.cls}`}>💸 Cost: {costInfo.text}</span>
                    <span className={`chip ${retentionInfo.cls}`}>🔄 Retention: {retentionInfo.text}</span>
                  </>
                )}
              </div>
              {isRevealMode && previewOption && previewKpis && cfRevDelta != null && (
                <div className="cf-banner">
                  Counterfactual — Option {previewOption.id}: {cfRevDelta >= 0 ? '+' : '−'}{fmtGBP(Math.abs(cfRevDelta))} revenue
                  {cfDelta !== null && (
                    <> · {cfDelta >= 0 ? '+' : '−'}{fmtGBP(Math.abs(cfDelta))} vs your choice</>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chart controls — reveal mode only */}
          {isRevealMode && (
            <div className="chart-controls">
              <button
                className={`chart-toggle toggle-best ${showBestPath ? 'active' : ''}`}
                onClick={() => setShowBestPath(v => !v)}
              >
                <span className="toggle-dot dot-best" />
                {showBestPath ? 'Hide' : 'Show'} Optimal AI Experience
              </button>
            </div>
          )}

          {/* Chart */}
          <ValueChart
            stages={journeyStages}
            baselinePath={baselinePath}
            bestPath={bestPath}
            livePath={livePath}
            showLivePath={hasSimulationStarted}
            showBestPath={isRevealMode && showBestPath}
            showBaseline={isRevealMode}
            previewPath={isRevealMode ? previewPath : null}
          />

        </section>
      </main>

      {/* ── Methodology modal — both modes (FIX 2) ── */}
      {methodologyOpen && (
        <div className="methodology-overlay" onClick={() => setMethodologyOpen(false)}>
          <div className="methodology-panel" onClick={e => e.stopPropagation()}>
            <div className="methodology-header">
              <span className="methodology-title">Methodology &amp; Sources</span>
              <button className="drawer-close" onClick={() => setMethodologyOpen(false)}>✕</button>
            </div>
            <div className="methodology-sections">
              <div className="methodology-section">
                <p className="methodology-section-title">How the Indices Work</p>
                <div className="methodology-index-list">
                  <p className="methodology-index-item"><strong>Revenue:</strong> Cumulative change in projected SME portfolio revenue based on each decision's impact on customer acquisition quality, activation depth, and retention probability. Positive values mean revenue gained versus the no-AI baseline.</p>
                  <p className="methodology-index-item"><strong>Trust:</strong> Cumulative customer trust score. Each decision adds or removes trust based on transparency, explainability, and whether the AI acted in the customer's interest. Typical range: -20 to +30 across all seven rounds.</p>
                  <p className="methodology-index-item"><strong>CEI (Customer Economic Value Index):</strong> Composite measure combining engagement depth, feature adoption, and cross-sell readiness. Higher values indicate a more economically valuable customer relationship.</p>
                  <p className="methodology-index-item"><strong>Cost Efficiency:</strong> Per-round rating of how well the AI investment was allocated. Positive values indicate money well spent relative to outcomes. Negative values indicate overspend relative to alternatives available at that stage.</p>
                  <p className="methodology-index-item"><strong>Retention:</strong> Per-round impact on customer retention probability. Most relevant at Engagement, Retention, and Loyalty stages where customer decisions to stay or leave are directly influenced by the AI experience.</p>
                  <p className="methodology-index-item"><strong>Budget:</strong> Total AI investment budget of £8M across 7 rounds. Spending heavily in early rounds limits investment capacity at later, higher-leverage stages where proven customer value justifies frontier model deployment.</p>
                </div>
              </div>
              <div className="methodology-section">
                <p className="methodology-section-title">Customer Economic Value Index (CEI)</p>
                <p className="methodology-text">
                  The CEI is a normalised 0–100 index combining revenue contribution, retention
                  probability, engagement intensity, and cost to serve — designed to track value
                  across the customer journey, not just at a single point. It is a simplified,
                  stage-based CLV approximation adapted from classical Customer Lifetime Value
                  methodology.
                </p>
              </div>
              <div className="methodology-section">
                <p className="methodology-section-title">Data Sources</p>
                <p className="methodology-text">
                  Path values and score impacts are calibrated using published benchmarks: McKinsey
                  personalisation research (10–20% revenue uplift), Amplitude product analytics
                  (activation–retention correlation), and aggregate UK SME banking performance data.
                  AI cost structures reference FinOps Foundation token pricing research,
                  OpenAI/Anthropic published API rates, and Lenovo on-premise vs cloud TCO analysis
                  (2026 edition).
                </p>
              </div>
              <div className="methodology-section">
                <p className="methodology-section-title">Simulation Design</p>
                <p className="methodology-text">
                  All path values represent a normalised Customer Economic Value Index, not raw
                  revenue. The BAU Experience baseline represents a realistic trajectory for an SME
                  banking customer without AI intervention. Optimal and worst-case paths represent
                  the range of modelled outcomes based on cumulative decisions. Scores are calibrated
                  to illustrate relative trade-offs, not to predict specific financial outcomes.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="app-footer">
        <div className="footer-actions">
          <button
            className="btn btn-secondary"
            onClick={handlePrevRound}
            disabled={history.length === 0}
          >
            ← Previous
          </button>
          <button
            className="btn btn-primary"
            onClick={handleNextRound}
            disabled={!selectedOption || isComplete}
          >
            Next Round →
          </button>
          <button className="btn btn-secondary" onClick={handleReset}>
            Reset
          </button>
          {/* Hide Explanation — reveal mode only */}
          {isRevealMode && previewOption && (
            <button
              className="btn btn-secondary btn-subtle"
              onClick={handleClearPreview}
            >
              Hide Explanation
            </button>
          )}
          {/* Methodology text link — both modes, right-aligned (FIX 2) */}
          <button className="methodology-link" onClick={() => setMethodologyOpen(true)}>
            ℹ️ Methodology &amp; Sources
          </button>
        </div>
      </footer>

    </div>
  )
}
