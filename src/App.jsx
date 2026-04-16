import { useState } from 'react'
import scenario from './data/scenario.json'
import FinalSummary from './components/FinalSummary'
import OptionCards from './components/OptionCards'
import ChartControls from './components/ChartControls'
import ValueChart from './components/ValueChart'
import ScorePanel from './components/ScorePanel'
import ExplanationPanel from './components/ExplanationPanel'

// ── KPI state — driven by businessImpact in scenario JSON ────────────────────
const INITIAL_KPIS = {
  budgetRemaining:            scenario.simulationConfig.startingBudget,
  cumulativeAiSpend:          0,
  cumulativeRevenue:          0,
  customerEconomicValueIndex: scenario.simulationConfig.startingCustomerValueIndex,
  trust:                      scenario.simulationConfig.startingTrust,
  adoption:                   scenario.simulationConfig.startingAdoption,
}

function applyBusinessImpact(kpis, businessImpact) {
  return {
    budgetRemaining:            kpis.budgetRemaining            + businessImpact.budgetDelta,
    cumulativeAiSpend:          kpis.cumulativeAiSpend          + businessImpact.aiSpend,
    cumulativeRevenue:          kpis.cumulativeRevenue          + businessImpact.revenueDelta,
    customerEconomicValueIndex: kpis.customerEconomicValueIndex + businessImpact.customerValueDelta,
    trust:                      kpis.trust                      + businessImpact.trustDelta,
    adoption:                   kpis.adoption                   + businessImpact.adoptionDelta,
  }
}

function getIdealKpis(rounds, decisionCount) {
  return rounds.slice(0, decisionCount).reduce((acc, round) => {
    const idealOption = round.options.find(option => option.id === round.bestOptionId)
    return idealOption ? applyBusinessImpact(acc, idealOption.businessImpact) : acc
  }, { ...INITIAL_KPIS })
}

export default function App() {
  const {
    scenarioTitle,
    scenarioSubtitle,
    journeyStages,
    baselinePath,
    bestPath,
    worstPath,
    rounds,
    simulationConfig,
  } = scenario

  // ── simulation state ───────────────────────────────────────────────────────
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0)
  const [livePath,             setLivePath]             = useState([...baselinePath])
  const [roundStartPath,       setRoundStartPath]       = useState(null)
  const [selectedOption,       setSelectedOption]       = useState(null)
  const [previewOption,        setPreviewOption]        = useState(null)
  const [roundStartKpis,       setRoundStartKpis]       = useState(null)
  const [explanation,          setExplanation]          = useState('')
  const [kpis,                 setKpis]                 = useState({ ...INITIAL_KPIS })
  const [isComplete,           setIsComplete]           = useState(false)
  const [hasSimulationStarted, setHasSimulationStarted] = useState(false)
  const [activeDetailPanel,    setActiveDetailPanel]    = useState(null)
  const [showBaselineNote,     setShowBaselineNote]     = useState(false)
  const [history,              setHistory]              = useState([])

  // ── display toggles (intentionally NOT reset by simulation) ───────────────
  const [showBestPath,  setShowBestPath]  = useState(true)
  const [showWorstPath, setShowWorstPath] = useState(false)

  const currentRound = isComplete ? null : rounds[currentRoundIndex]

  // Sort options by optionDisplayOrder if present, otherwise use data order
  const displayedOptions = currentRound?.optionDisplayOrder
    ? [...currentRound.options].sort(
        (a, b) => currentRound.optionDisplayOrder.indexOf(a.id) - currentRound.optionDisplayOrder.indexOf(b.id)
      )
    : currentRound?.options ?? []

  // previewPath: roundStartPath + previewOption's pathImpact
  const previewPath =
    previewOption && roundStartPath
      ? roundStartPath.map((v, i) => v + previewOption.pathImpact[i])
      : null

  const previewKpis =
    previewOption && roundStartKpis
      ? applyBusinessImpact(roundStartKpis, previewOption.businessImpact)
      : null

  const completedDecisionCount = currentRoundIndex + (selectedOption ? 1 : 0)
  const idealKpis = getIdealKpis(rounds, completedDecisionCount)
  const actualRevenueGap = Math.max(0, idealKpis.cumulativeRevenue - kpis.cumulativeRevenue)

  const cfRevenue = previewKpis?.cumulativeRevenue ?? null
  const cfDelta   = cfRevenue != null ? cfRevenue - kpis.cumulativeRevenue : null

  // ── handlers ──────────────────────────────────────────────────────────────

  function handleSelectOption(option) {
    if (selectedOption !== null) return  // locked — one selection per round

    setRoundStartPath([...livePath])
    setRoundStartKpis({ ...kpis })

    // Chart path — unchanged, drives the line chart
    setLivePath(livePath.map((value, index) => value + option.pathImpact[index]))

    // Business KPIs — driven by businessImpact, shown in KPI panel
    setKpis(prev => applyBusinessImpact(prev, option.businessImpact))

    setSelectedOption(option)
    setExplanation(option.explanation)
    setPreviewOption(null)
    setHasSimulationStarted(true)  // Class Decision Path appears after the first choice
  }

  function handlePreviewOption(option) {
    if (!selectedOption) return  // preview only available after applying
    setPreviewOption(prev => (prev?.id === option.id ? null : option))
  }

  function handleClearPreview() {
    setPreviewOption(null)
  }

  function handleNextRound() {
    if (!selectedOption || isComplete) return

    // Save completed round state so Previous can restore it
    setHistory(prev => [...prev, {
      currentRoundIndex,
      livePath:       [...livePath],
      roundStartPath: roundStartPath ? [...roundStartPath] : null,
      kpis:           { ...kpis },
      roundStartKpis: roundStartKpis ? { ...roundStartKpis } : null,
      selectedOption,
      explanation,
      hasSimulationStarted,
    }])

    const nextIndex = currentRoundIndex + 1
    if (nextIndex >= rounds.length) {
      setIsComplete(true)
    } else {
      setCurrentRoundIndex(nextIndex)
    }
    setSelectedOption(null)
    setPreviewOption(null)
    setRoundStartKpis(null)
    setExplanation('')
    setRoundStartPath(null)
    setActiveDetailPanel(null)
  }

  function handlePreviousRound() {
    if (history.length === 0) return
    const snap = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setCurrentRoundIndex(snap.currentRoundIndex)
    setLivePath(snap.livePath)
    setRoundStartPath(snap.roundStartPath)
    setKpis(snap.kpis)
    setRoundStartKpis(snap.roundStartKpis)
    setSelectedOption(snap.selectedOption)
    setExplanation(snap.explanation)
    setHasSimulationStarted(snap.hasSimulationStarted)
    setPreviewOption(null)
    setIsComplete(false)
    setActiveDetailPanel(null)
  }

  function handleReset() {
    setCurrentRoundIndex(0)
    setLivePath([...baselinePath])
    setRoundStartPath(null)
    setRoundStartKpis(null)
    setSelectedOption(null)
    setPreviewOption(null)
    setExplanation('')
    setKpis({ ...INITIAL_KPIS })
    setIsComplete(false)
    setHasSimulationStarted(false)
    setActiveDetailPanel(null)
    setHistory([])
    // showBestPath / showWorstPath preserved intentionally
  }

  function fmtGBP(value) {
    const abs = Math.abs(value)
    const sign = value < 0 ? '−£' : '£'
    if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1) + 'm'
    if (abs >= 1_000) return sign + Math.round(abs / 1_000) + 'k'
    return sign + Math.round(abs)
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-title">
          <h1 className="app-title">{scenarioTitle}</h1>
          <p className="app-subtitle">{scenarioSubtitle}</p>
        </div>
      </header>

      {!isComplete && currentRound && (
        <div className="top-journey-tracker">
          <div className="top-journey-head">
            <span className="top-journey-stage">{currentRound.stage}</span>
            <span className="top-journey-meta">
              Round {currentRoundIndex + 1} of {rounds.length} · {rounds.length - currentRoundIndex - 1} remaining
            </span>
          </div>
          <div className="top-journey-strip" aria-label="Customer journey tracker">
            {journeyStages.map((stage, index) => {
              const isActive = currentRound.stageIndex === index
              const isCompleteStage = index < currentRound.stageIndex

              return (
                <span
                  key={stage}
                  className={[
                    'top-journey-step',
                    isActive ? 'active' : '',
                    isCompleteStage ? 'complete' : '',
                  ].filter(Boolean).join(' ')}
                  title={stage}
                  aria-label={stage}
                >
                  <span className="top-journey-step-name">{stage}</span>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Main 3-column grid ── */}
      <main className="main-grid">

        {/* LEFT: decision area */}
        <section className="col col-left">
          {currentRound ? (
            <>
              <div className="round-question">
                <h2 className="round-title">{currentRound.title}</h2>
                {currentRound.tradeoffTagline && (
                  <p className="round-tradeoff-tagline">{currentRound.tradeoffTagline}</p>
                )}
                <p className="round-prompt">{currentRound.prompt}</p>
              </div>
              <OptionCards
                options={displayedOptions}
                bestOptionId={currentRound.bestOptionId}
                selectedOption={selectedOption}
                previewOption={previewOption}
                onSelectOption={handleSelectOption}
                onPreviewOption={handlePreviewOption}
              />
            </>
          ) : (
            <FinalSummary
              kpis={kpis}
              simulationConfig={simulationConfig}
              livePath={livePath}
              baselinePath={baselinePath}
              bestPath={bestPath}
              journeyStages={journeyStages}
              onReset={handleReset}
            />
          )}
        </section>

        {/* CENTER: chart area */}
        <section className="col col-center">
          <ChartControls
            showBestPath={showBestPath}
            showWorstPath={showWorstPath}
            onToggleBest={() => setShowBestPath(v => !v)}
            onToggleWorst={() => setShowWorstPath(v => !v)}
          />
          <div className="chart-revenue-strip">
            <div className="chart-revenue-card">
              <span className="chart-revenue-label">
                {previewKpis ? `Counterfactual — Option ${previewOption.id}` : 'Cumulative Revenue (£)'}
              </span>
              <span className={`chart-revenue-value ${(cfRevenue ?? kpis.cumulativeRevenue) >= 0 ? 'positive' : 'negative'}`}>
                {fmtGBP(cfRevenue ?? kpis.cumulativeRevenue)}
              </span>
              {cfDelta != null && (
                <span className={`chart-revenue-delta ${cfDelta >= 0 ? 'positive' : 'negative'}`}>
                  {cfDelta === 0
                    ? 'Same as your chosen path'
                    : `${cfDelta > 0 ? '+' : ''}${fmtGBP(cfDelta)} vs your chosen path`}
                </span>
              )}
            </div>
            <div className="chart-revenue-card">
              <span className="chart-revenue-label">Cumulative AI Costs (£)</span>
              <span className="chart-revenue-value negative">
                {fmtGBP(kpis.cumulativeAiSpend)}
              </span>
            </div>
            <div className="chart-detail-actions">
              <button
                type="button"
                className={`detail-toggle ${activeDetailPanel === 'insight' ? 'active' : ''}`}
                onClick={() => setActiveDetailPanel(value => value === 'insight' ? null : 'insight')}
              >
                Decision Insight
              </button>
              <button
                type="button"
                className={`detail-toggle ${activeDetailPanel === 'kpis' ? 'active' : ''}`}
                onClick={() => setActiveDetailPanel(value => value === 'kpis' ? null : 'kpis')}
              >
                KPI Detail
              </button>
            </div>
          </div>
          <ValueChart
            stages={journeyStages}
            baselinePath={baselinePath}
            bestPath={bestPath}
            worstPath={worstPath}
            livePath={livePath}
            showLivePath={hasSimulationStarted}
            showBestPath={showBestPath}
            showWorstPath={showWorstPath}
            previewPath={previewPath}
            actualRevenueGap={actualRevenueGap}
          />
        </section>

        {activeDetailPanel && (
          <>
            <button
              type="button"
              className="detail-drawer-backdrop"
              aria-label="Close detail panel"
              onClick={() => setActiveDetailPanel(null)}
            />
            <section className="detail-drawer">
            <div className="detail-drawer-head">
              <h2 className="detail-drawer-title">
                {activeDetailPanel === 'insight' ? 'Decision Insight' : 'Business KPIs'}
              </h2>
              <button
                type="button"
                className="detail-drawer-close"
                onClick={() => setActiveDetailPanel(null)}
              >
                Close
              </button>
            </div>

            <div className="detail-drawer-body">
              {activeDetailPanel === 'insight' ? (
                <ExplanationPanel
                  explanation={explanation}
                  currentRound={currentRound}
                  currentRoundIndex={currentRoundIndex}
                  totalRounds={rounds.length}
                  livePath={livePath}
                  bestPath={bestPath}
                  kpis={kpis}
                  idealKpis={idealKpis}
                  simulationConfig={simulationConfig}
                  selectedOption={selectedOption}
                  previewOption={previewOption}
                />
              ) : (
                <ScorePanel
                  kpis={previewKpis || kpis}
                  actualKpis={kpis}
                  selectedOption={selectedOption}
                  previewOption={previewOption}
                  hasSimulationStarted={hasSimulationStarted}
                  simulationConfig={simulationConfig}
                />
              )}
            </div>
            </section>
          </>
        )}

      </main>

      {/* ── Methodology (collapsible) ── */}
      {showBaselineNote && (
        <aside className="baseline-note baseline-note-expanded">
          <span className="baseline-note-label">Baseline assumptions</span>
          <span className="baseline-note-text">
            Trust Index (62): mid-level trust typical of fragmented, non-personalised SME banking.
          </span>
          <span className="baseline-note-sep">·</span>
          <span className="baseline-note-text">
            Adoption Score (40%): consistent with industry patterns for low-engagement digital SME journeys.
          </span>
          <span className="baseline-note-sep">·</span>
          <span className="baseline-note-text">
            Customer Value Index (60): modelled baseline customer value before any AI experience decisions are applied — rises or falls with choices across the journey.
          </span>
          <span className="baseline-note-sep">·</span>
          <span className="baseline-note-text">
            Modelled assumptions for consistent benchmarking — not externally verified benchmarks.
          </span>
        </aside>
      )}

      {/* ── Footer actions ── */}
      <footer className="app-footer">
        <div className="footer-actions">
          <button
            className="btn btn-secondary"
            onClick={handlePreviousRound}
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
          {previewOption && (
            <button className="btn btn-secondary btn-subtle" onClick={handleClearPreview}>
              Hide Explanation
            </button>
          )}
          <button className="btn btn-secondary btn-danger-subtle" onClick={handleReset}>
            Reset
          </button>
          <button
            className={`btn btn-subtle methodology-toggle ${showBaselineNote ? 'active' : ''}`}
            onClick={() => setShowBaselineNote(v => !v)}
          >
            Methodology
          </button>
        </div>
      </footer>

    </div>
  )
}
