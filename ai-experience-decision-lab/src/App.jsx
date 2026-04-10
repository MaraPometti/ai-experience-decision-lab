import { useState } from 'react'
import scenario from './data/scenario.json'
import FinalSummary from './components/FinalSummary'
import OptionCards from './components/OptionCards'
import ChartControls from './components/ChartControls'
import ValueChart from './components/ValueChart'
import ScorePanel from './components/ScorePanel'
import ExplanationPanel from './components/ExplanationPanel'

const INITIAL_SCORE = { cei: 0, trust: 0, cost: 0, retention: 0 }

export default function App() {
  const {
    scenarioTitle,
    scenarioSubtitle,
    journeyStages,
    baselinePath,
    bestPath,
    worstPath,
    rounds,
  } = scenario

  // ── simulation state ─────────────────────────────────────────────────────────
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0)
  const [livePath,             setLivePath]             = useState([...baselinePath])
  const [roundStartPath,       setRoundStartPath]       = useState(null)
  const [selectedOption,       setSelectedOption]       = useState(null)   // option object | null
  const [previewOption,        setPreviewOption]        = useState(null)   // option object | null
  const [explanation,          setExplanation]          = useState('')
  const [score,                setScore]                = useState({ ...INITIAL_SCORE })
  const [isComplete,           setIsComplete]           = useState(false)
  const [hasSimulationStarted, setHasSimulationStarted] = useState(false)

  // ── display toggles (intentionally NOT reset by simulation) ──────────────────
  const [showBestPath,  setShowBestPath]  = useState(true)
  const [showWorstPath, setShowWorstPath] = useState(false)

  const currentRound = isComplete ? null : rounds[currentRoundIndex]

  // previewPath: roundStartPath + previewOption's pathImpact
  const previewPath =
    previewOption && roundStartPath
      ? roundStartPath.map((v, i) => v + previewOption.pathImpact[i])
      : null

  // ── handlers ──────────────────────────────────────────────────────────────────

  function handleSelectOption(option) {
    if (selectedOption !== null) return  // locked — one selection per round

    setRoundStartPath([...livePath])
    setLivePath(livePath.map((value, index) => value + option.pathImpact[index]))
    setScore(prev => ({
      cei:       prev.cei       + option.scoreImpact.cei,
      trust:     prev.trust     + option.scoreImpact.trust,
      cost:      prev.cost      + option.scoreImpact.cost,
      retention: prev.retention + option.scoreImpact.retention,
    }))
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
    setExplanation('')
    setRoundStartPath(null)
  }

  function handleReset() {
    setCurrentRoundIndex(0)
    setLivePath([...baselinePath])
    setRoundStartPath(null)
    setSelectedOption(null)
    setPreviewOption(null)
    setExplanation('')
    setScore({ ...INITIAL_SCORE })
    setIsComplete(false)
    setHasSimulationStarted(false)  // hides Class Decision Path again
    // showBestPath / showWorstPath preserved intentionally
  }

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-title">
          <h1 className="app-title">{scenarioTitle}</h1>
          <p className="app-subtitle">{scenarioSubtitle}</p>
        </div>
        <div className="header-meta">
          {isComplete ? (
            <span className="badge badge-complete">Simulation complete</span>
          ) : (
            <>
              <span className="badge badge-round">
                Round {currentRoundIndex + 1} / {rounds.length}
              </span>
              <span className="badge badge-stage">{currentRound?.stage}</span>
            </>
          )}
        </div>
      </header>

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
              score={score}
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
          />
          <ScorePanel score={score} />
        </section>

        {/* RIGHT: explanation area */}
        <section className="col col-right">
          <ExplanationPanel
            explanation={explanation}
            previewOption={previewOption}
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
              Clear Preview
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
