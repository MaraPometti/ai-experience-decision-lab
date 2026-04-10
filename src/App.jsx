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

  // ── display toggles (intentionally NOT reset by simulation) ───────────────
  const [showBestPath,  setShowBestPath]  = useState(true)
  const [showWorstPath, setShowWorstPath] = useState(false)

  const currentRound = isComplete ? null : rounds[currentRoundIndex]
  const idealOption = currentRound?.options.find(option => option.id === currentRound.bestOptionId) || null

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
  const previewRevenueGap =
    previewOption && idealOption
      ? Math.max(0, idealOption.businessImpact.revenueDelta - previewOption.businessImpact.revenueDelta)
      : 0

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
    setHasSimulationStarted(false)  // hides Class Decision Path again
    // showBestPath / showWorstPath preserved intentionally
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
                />
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
                <p className="round-prompt">{currentRound.prompt}</p>
              </div>
              <OptionCards
                options={currentRound.options}
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
            previewRevenueGap={previewRevenueGap}
          />
        </section>

        {/* RIGHT: explanation area */}
        <section className="col col-right">
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
          <ScorePanel
            kpis={previewKpis || kpis}
            actualKpis={kpis}
            selectedOption={selectedOption}
            previewOption={previewOption}
            hasSimulationStarted={hasSimulationStarted}
            simulationConfig={simulationConfig}
          />
        </section>

      </main>

      {/* ── Footer actions ── */}
      <footer className="app-footer">
        <div className="footer-actions">
          <button
            className="btn btn-primary"
            onClick={handleNextRound}
            disabled={!selectedOption || isComplete}
          >
            Next Round →
          </button>
          {previewOption && (
            <button className="btn btn-secondary" onClick={handleClearPreview}>
              Hide Explanation
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleReset}>
            Reset
          </button>
        </div>
      </footer>

    </div>
  )
}
