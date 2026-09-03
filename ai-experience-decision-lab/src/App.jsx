import { useState, useEffect } from 'react'
import scenario from './data/scenario.json'
import FinalSummary from './components/FinalSummary'
import OptionCards from './components/OptionCards'
import ValueChart from './components/ValueChart'
import ScenarioHeader from './components/ScenarioHeader'
import ExplanationPanel from './components/ExplanationPanel'
import ScorePanel from './components/ScorePanel'
import Leaderboard from './components/Leaderboard'
import Copyright from './components/Copyright'
import { orderedOptions, NO_DECISION } from './lib/scoring'
import { runKey, loadRun, saveRun, clearRun } from './lib/persistence'

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

// Play mode gets direction only. Exact figures are an answer key: with them on
// screen a team can read off which option scored best.
function trendMark(v) {
  if (v > 0) return '▲'
  if (v < 0) return '▼'
  return '▬'
}

function retentionLabel(v) {
  if (v == null) return { text: '—',       cls: 'chip-neutral' }
  if (v >= 3)    return { text: 'Strong',   cls: 'chip-positive' }
  if (v >= 1)    return { text: 'Moderate', cls: 'chip-neutral' }
  if (v === 0)   return { text: 'Neutral',  cls: 'chip-neutral' }
  return              { text: 'At risk',   cls: 'chip-negative' }
}

export default function App() {
  const {
    scenarioTitle,
    scenarioSubtitle,
    journeyStages,
    baselinePath,
    bestPath,
    rounds,
    simulationConfig,
  } = scenario

  // ── URL parameter detection ────────────────────────────────────────────────
  // Play (blind) is the DEFAULT, so the bare URL is safe to hand to students.
  // Answers are unlocked only by an explicit ?reveal=true.
  const params   = new URLSearchParams(window.location.search)
  const getParam = (key) => (params.get(key) || '').replace(/\/+$/, '')

  const isLeaderboardMode = getParam('leaderboard') === 'true'
  const isRevealMode      = getParam('reveal') === 'true'
  const isPlayMode        = !isRevealMode && !isLeaderboardMode

  const teamParam = getParam('team')

  // Timing. The default is one 20-minute clock for the whole session, started
  // by the team with the Start button — it does not run until they say go.
  //   ?timer=<minutes>       total session length (default 20)
  //   ?roundtimer=<seconds>  switches to a per-round window of that length
  const roundTimerParam = parseInt(getParam('roundtimer') || '', 10)
  const totalTimerParam = parseInt(getParam('timer') || '', 10)

  const isPerRoundTimer = Number.isFinite(roundTimerParam) && roundTimerParam > 0
  const sessionMinutes  = Number.isFinite(totalTimerParam) && totalTimerParam > 0
    ? totalTimerParam
    : 20

  // The length of one countdown: a single round in per-round mode, otherwise
  // the whole session.
  const timerSeconds = isPerRoundTimer ? roundTimerParam : sessionMinutes * 60

  // ── restore any run already in progress ────────────────────────────────────
  // Read once, during the first render, so the whole simulation starts from the
  // saved state instead of flashing a fresh game and correcting itself.
  const [savedRun] = useState(() =>
    (isPlayMode && teamParam) ? loadRun(runKey(teamParam)) : null
  )

  const savedOption = (() => {
    if (!savedRun?.selectedOptionId) return null
    const round = rounds[savedRun.currentRoundIndex ?? 0]
    return round?.options.find(o => o.id === savedRun.selectedOptionId) ?? null
  })()

  // ── simulation state ───────────────────────────────────────────────────────
  const [currentRoundIndex,    setCurrentRoundIndex]    = useState(savedRun?.currentRoundIndex ?? 0)
  const [livePath,             setLivePath]             = useState(savedRun?.livePath ?? [...baselinePath])
  const [roundStartPath,       setRoundStartPath]       = useState(null)
  const [roundStartKpis,       setRoundStartKpis]       = useState(null)
  const [selectedOption,       setSelectedOption]       = useState(savedOption)
  const [previewOption,        setPreviewOption]        = useState(null)
  const [explanation,          setExplanation]          = useState(savedOption?.explanation ?? '')
  const [insightExperience,    setInsightExperience]    = useState(savedOption?.insightExperience ?? '')
  const [score,                setScore]                = useState(savedRun?.score ?? { ...INITIAL_SCORE })
  const [isComplete,           setIsComplete]           = useState(Boolean(savedRun?.isComplete))
  const [hasSimulationStarted, setHasSimulationStarted] = useState(Boolean(savedRun?.hasSimulationStarted))
  const [budgetRemaining,      setBudgetRemaining]      = useState(savedRun?.budgetRemaining ?? simulationConfig.startingBudget)
  const [cumulativeRevDelta,   setCumulativeRevDelta]   = useState(savedRun?.cumulativeRevDelta ?? 0)
  const [history,              setHistory]              = useState(savedRun?.history ?? [])
  const [choices,              setChoices]              = useState(savedRun?.choices ?? [])
  const [reasons,              setReasons]              = useState(savedRun?.reasons ?? [])

  // ── team / game state ──────────────────────────────────────────────────────
  const [teamName,    setTeamName]    = useState(teamParam)
  const [gameStarted, setGameStarted] = useState(isRevealMode || Boolean(teamParam))

  // ── timer state ────────────────────────────────────────────────────────────
  const [timeLeft,     setTimeLeft]     = useState(savedRun?.timeLeft ?? timerSeconds)
  const [timerPaused,  setTimerPaused]  = useState(false)
  const [timerStarted, setTimerStarted] = useState(Boolean(savedRun?.timerStarted))

  // ── persistence state ──────────────────────────────────────────────────────
  const [wasRestored, setWasRestored] = useState(Boolean(savedRun))

  // ── review state ───────────────────────────────────────────────────────────
  // Team play can look back at earlier rounds and their notes, but read-only:
  // stepping back must never re-open a decision that has already been scored.
  const [reviewIndex, setReviewIndex] = useState(null)

  // ── drawer / overlay state ─────────────────────────────────────────────────
  const [insightOpen,     setInsightOpen]     = useState(false)
  const [kpiOpen,         setKpiOpen]         = useState(false)
  const [methodologyOpen, setMethodologyOpen] = useState(false)

  // ── chart toggles ──────────────────────────────────────────────────────────
  const [showBestPath, setShowBestPath] = useState(true)

  const storageKey = isPlayMode ? runKey(teamName) : null

  // ── timer effect ───────────────────────────────────────────────────────────
  // Nothing counts down until the team presses Start. In per-round mode the
  // clock also stops once a decision is locked, so the captain can write up the
  // reasoning without racing it; a session clock runs straight through.
  useEffect(() => {
    if (!gameStarted || !isPlayMode || isComplete || timerPaused) return
    if (!timerStarted) return
    if (isPerRoundTimer && selectedOption) return
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [gameStarted, isPlayMode, isComplete, timerPaused, timerStarted, isPerRoundTimer, selectedOption])

  // ── persist the run ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlayMode || !gameStarted || !storageKey) return
    saveRun(storageKey, {
      currentRoundIndex,
      livePath,
      score,
      budgetRemaining,
      cumulativeRevDelta,
      choices,
      reasons,
      history,
      isComplete,
      hasSimulationStarted,
      timeLeft,
      timerStarted,
      selectedOptionId: selectedOption?.id ?? null,
    })
  }, [
    isPlayMode, gameStarted, storageKey,
    currentRoundIndex, livePath, score, budgetRemaining, cumulativeRevDelta,
    choices, reasons, history, isComplete, hasSimulationStarted, timeLeft, timerStarted, selectedOption,
  ])

  const currentRound = isComplete ? null : rounds[currentRoundIndex]

  // The clock ran out with nothing locked in for this round.
  const roundExpired = isPlayMode && !isComplete && !selectedOption && timerStarted && timeLeft <= 0

  // ── review derivations ─────────────────────────────────────────────────────
  const isReviewing    = isPlayMode && !isComplete && reviewIndex !== null
  const viewRoundIndex = isReviewing ? reviewIndex : currentRoundIndex
  const viewRound      = isComplete ? null : rounds[viewRoundIndex]

  const reviewChoiceId = isReviewing ? choices[reviewIndex] : null
  const reviewOption   = reviewChoiceId && reviewChoiceId !== NO_DECISION
    ? rounds[reviewIndex].options.find(o => o.id === reviewChoiceId) ?? null
    : null

  // What the option cards should show as chosen for the round on screen.
  const displayedOption = isReviewing ? reviewOption : selectedOption

  const canGoBack = isPlayMode
    ? !isComplete && viewRoundIndex > 0
    : history.length > 0

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
  const budgetPct = Math.round((budgetRemaining / simulationConfig.startingBudget) * 100)

  const overspendM  = (Math.max(0, -budgetRemaining) / 1_000_000).toFixed(1)
  const budgetLabel = `${budgetRemaining < 0 ? '−' : ''}£${(Math.abs(budgetRemaining) / 1_000_000).toFixed(1)}m`

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
  // Thresholds are fractions of the round window, so they read correctly whether
  // the window is 60 seconds or three minutes.
  const timerFrac = timerSeconds > 0 ? timeLeft / timerSeconds : 0

  const timerClass =
    timerFrac > 0.5  ? 'timer-calm'     :
    timerFrac > 0.25 ? 'timer-warm'     :
    timerFrac > 0.1  ? 'timer-pressure' :
    timeLeft  > 0    ? 'timer-urgent'   :
    'timer-expired'

  const timerBarPct   = Math.max(0, Math.min(100, timerFrac * 100))
  const timerBarColor =
    timerFrac > 0.5  ? 'timer-bar-green' :
    timerFrac > 0.25 ? 'timer-bar-amber' :
    timeLeft  > 0    ? 'timer-bar-red'   :
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
    // Reviewing an earlier round: step forward through the review, and drop back
    // into live play once we catch up with the current round.
    if (isReviewing) {
      const next = reviewIndex + 1
      setReviewIndex(next >= currentRoundIndex ? null : next)
      return
    }

    if (isComplete) return
    if (!selectedOption && !roundExpired) return

    // The window closed with nothing locked in: record the round as skipped.
    // No movement on any axis, which is its own penalty against the baseline.
    if (!selectedOption && roundExpired) {
      setHistory(prev => [...prev, {
        roundIndex:         currentRoundIndex,
        livePath:           [...livePath],
        score:              { ...score },
        budgetRemaining,
        cumulativeRevDelta,
        hasSimulationStarted,
      }])
      setChoices(prev => [...prev, NO_DECISION])
      setHasSimulationStarted(true)
    }

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
    // A per-round window restarts each round; a session clock runs straight through.
    if (isPerRoundTimer) {
      setTimeLeft(timerSeconds)
      setTimerPaused(false)
    }
  }

  function handlePrevRound() {
    // Team play: read-only step back through completed rounds and their notes.
    // The scored decision itself is never re-opened.
    if (isPlayMode) {
      if (isComplete || viewRoundIndex === 0) return
      setReviewIndex(viewRoundIndex - 1)
      return
    }

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
    setReasons(prev => prev.slice(0, -1))
    if (isPerRoundTimer) {
      setTimeLeft(timerSeconds)
      setTimerPaused(false)
    }
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
    setReasons([])
    setTimeLeft(timerSeconds)
    setTimerPaused(false)
    setTimerStarted(false)
    setWasRestored(false)
    setReviewIndex(null)
    clearRun(storageKey)
  }

  // Starting from the team-entry screen: pick up a run already saved under that
  // team name, so a refresh mid-session resumes instead of starting over.
  function handleStartGame() {
    const saved = loadRun(runKey(teamName))
    if (saved) {
      const roundIndex = saved.currentRoundIndex ?? 0
      const round      = rounds[roundIndex]
      const option     = saved.selectedOptionId
        ? round?.options.find(o => o.id === saved.selectedOptionId) ?? null
        : null

      setCurrentRoundIndex(roundIndex)
      setLivePath(saved.livePath)
      setScore(saved.score)
      setBudgetRemaining(saved.budgetRemaining)
      setCumulativeRevDelta(saved.cumulativeRevDelta)
      setChoices(saved.choices)
      setReasons(saved.reasons || [])
      setHistory(saved.history || [])
      setIsComplete(Boolean(saved.isComplete))
      setHasSimulationStarted(Boolean(saved.hasSimulationStarted))
      setTimeLeft(saved.timeLeft ?? timerSeconds)
      setTimerStarted(Boolean(saved.timerStarted))
      setSelectedOption(option)
      setExplanation(option?.explanation ?? '')
      setInsightExperience(option?.insightExperience ?? '')
      setWasRestored(true)
    }
    setGameStarted(true)
  }

  // ── facilitator leaderboard ───────────────────────────────────────────────
  if (isLeaderboardMode) {
    return <Leaderboard scenarioTitle={scenarioTitle} />
  }

  // ── game entry screen (play mode only) ────────────────────────────────────
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
              if (e.key === 'Enter' && teamName.trim().length >= 2) handleStartGame()
            }}
            placeholder="Team Alpha"
            autoFocus
          />
          <button
            className="btn btn-primary team-entry-btn"
            disabled={teamName.trim().length < 2}
            onClick={handleStartGame}
          >
            Start the Challenge →
          </button>
          <p className="team-entry-timer-note">
            {isPerRoundTimer
              ? `${rounds.length} decisions · ${timerSeconds} seconds each.`
              : `${rounds.length} decisions · ${sessionMinutes} minutes for the whole session.`}
            {' '}The clock starts when you press Start. Once a decision is locked it
            is final, so agree before you commit.
          </p>
        </div>
        <Copyright />
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

          {/* Timer pill — play mode only. No pause or restart controls: a clock
              the team can stop is not a decision window. */}
          {isPlayMode && !isComplete && (
            <div className="timer-wrap">
              <div className={`timer-pill ${
                !timerStarted ? 'timer-idle'
                  : (isPerRoundTimer && selectedOption) ? 'timer-locked'
                  : timerClass
              }`}>
                <span className="timer-text">
                  {!timerStarted
                    ? `Round ${currentRoundIndex + 1}/${rounds.length} · ${formatTime(timeLeft)}`
                    : (isPerRoundTimer && selectedOption)
                      ? `Round ${currentRoundIndex + 1}/${rounds.length} · Locked`
                      : timeLeft === 0
                        ? "TIME'S UP"
                        : `Round ${currentRoundIndex + 1}/${rounds.length} · ${formatTime(timeLeft)}`}
                </span>
                {!timerStarted && (
                  <button
                    className="timer-btn timer-start-btn"
                    onClick={() => setTimerStarted(true)}
                    title="Start the countdown"
                  >
                    ▶ Start
                  </button>
                )}
              </div>
              {timerStarted && !selectedOption && timeLeft > 0 && timerFrac <= 0.25 && (
                <div className="timer-label">HURRY!</div>
              )}
            </div>
          )}

          {/* Team name — play mode */}
          {isPlayMode && teamName && (
            <span className="badge badge-stage">{teamName}</span>
          )}

          {/* Reassures a team that a refresh resumed their run rather than
              restarting it — the one part of the old summary panel worth keeping. */}
          {isPlayMode && wasRestored && (
            <span className="badge badge-restored">Progress restored</span>
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
      {isPlayMode && !isComplete && (
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
          {viewRound ? (
            <>
              {/* Reviewing an earlier round — read-only */}
              {isReviewing && (
                <div className="review-banner">
                  <span className="review-banner-title">
                    Reviewing Round {viewRoundIndex + 1} of {rounds.length}
                  </span>
                  <span className="review-banner-text">
                    Read-only. Your decision here is locked — notes are still editable.
                  </span>
                  <button
                    className="btn btn-subtle review-banner-btn"
                    onClick={() => setReviewIndex(null)}
                  >
                    Back to Round {currentRoundIndex + 1} →
                  </button>
                </div>
              )}

              <ScenarioHeader
                roundTitle={viewRound.title}
                tradeoffTagline={viewRound.tradeoffTagline}
                prompt={viewRound.prompt}
                aishaContext={viewRound?.aishaContext}
                isFinished={isComplete}
              />
              <OptionCards
                options={orderedOptions(viewRound)}
                selectedOption={displayedOption}
                previewOption={previewOption}
                bestOptionId={viewRound.bestOptionId}
                onSelectOption={handleSelectOption}
                onPreviewOption={handlePreviewOption}
                showBest={isRevealMode}
                requireConfirm={isPlayMode && !isReviewing}
                isExpired={roundExpired || isReviewing}
              />

              {/* Reviewed round that timed out */}
              {isReviewing && reviewChoiceId === NO_DECISION && (
                <div className="round-expired">
                  <p className="round-expired-title">This round timed out</p>
                  <p className="round-expired-text">
                    No decision was recorded, so it scored nothing on any axis.
                  </p>
                </div>
              )}

              {/* Window closed with nothing locked in */}
              {!isReviewing && roundExpired && (
                <div className="round-expired">
                  <p className="round-expired-title">Time expired — no decision recorded</p>
                  <p className="round-expired-text">
                    This round scores nothing on any axis. Move on to the next decision.
                  </p>
                </div>
              )}

              {/* Captain's reasoning — play mode, once the decision is locked.
                  Stays editable while reviewing an earlier round. */}
              {isPlayMode && (displayedOption || isReviewing) && (
                <div className="decision-notes">
                  <label className="decision-notes-label" htmlFor="decision-note">
                    {displayedOption
                      ? `Why did you choose ${displayedOption.id}? (captain records the reasoning)`
                      : 'Notes for this round'}
                  </label>
                  <textarea
                    id="decision-note"
                    className="decision-notes-input"
                    value={reasons[viewRoundIndex] || ''}
                    onChange={e => {
                      const next = [...reasons]
                      next[viewRoundIndex] = e.target.value
                      setReasons(next)
                    }}
                    rows={3}
                    placeholder="The trade-off we accepted, and why…"
                  />
                </div>
              )}

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
              reasons={reasons}
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
                <span className="budget-gauge-value">{budgetPct}% · {budgetLabel}</span>
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
                {isPlayMode ? (
                  <>
                    <span className={`chip ${revChipClass}`}>💰 Revenue {trendMark(cumulativeRevDelta)}</span>
                    <span className={`chip ${budgetChipClass}`}>🏦 {budgetLabel} left</span>
                    <span className={`chip ${trustChipClass}`}>❤️ Trust {trendMark(score.trust)}</span>
                    <span className={`chip ${ceiChipClass}`}>📈 CEI {trendMark(score.cei)}</span>
                  </>
                ) : (
                  <>
                    <span className={`chip ${revChipClass}`}>💰 {cumulativeRevDelta >= 0 ? '+' : '−'}£{revDeltaM}m revenue</span>
                    <span className={`chip ${budgetChipClass}`}>🏦 {budgetLabel} left</span>
                    <span className={`chip ${trustChipClass}`}>❤️ Trust: {score.trust >= 0 ? '+' : ''}{score.trust}</span>
                    <span className={`chip ${ceiChipClass}`}>📈 CEI: {score.cei >= 0 ? '+' : ''}{score.cei}</span>
                  </>
                )}
                {budgetRemaining < 0 && (
                  <span className="chip chip-budget-overspent">
                    ⚠️ Over budget by £{overspendM}m
                  </span>
                )}
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

          {/* Secondary chart control — reveal mode only, deliberately quiet */}
          {isRevealMode && (
            <div className="chart-controls">
              <button
                className="chart-toggle"
                onClick={() => setShowBestPath(v => !v)}
              >
                {showBestPath ? 'Hide' : 'Show'} optimal experience
              </button>
            </div>
          )}

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
                  <p className="methodology-index-item"><strong>Trust:</strong> Cumulative customer trust score. Each decision adds or removes trust based on transparency, explainability, and whether the AI acted in the customer's interest. Reachable range: −24 to +36 across all seven rounds.</p>
                  <p className="methodology-index-item"><strong>CEI (Customer Economic Value Index):</strong> Composite measure combining engagement depth, feature adoption, and cross-sell readiness. Higher values indicate a more economically valuable customer relationship.</p>
                  <p className="methodology-index-item"><strong>Cost Efficiency:</strong> Per-round rating of how well the AI investment was allocated. Positive values indicate money well spent relative to outcomes. Negative values indicate overspend relative to alternatives available at that stage.</p>
                  <p className="methodology-index-item"><strong>Retention:</strong> Per-round impact on customer retention probability. Most relevant at Engagement, Retention, and Loyalty stages where customer decisions to stay or leave are directly influenced by the AI experience.</p>
                  <p className="methodology-index-item"><strong>Budget:</strong> Total AI investment budget of £8M across 7 rounds. Spending heavily in early rounds limits investment capacity at later, higher-leverage stages where proven customer value justifies frontier model deployment.</p>
                </div>
              </div>
              <div className="methodology-section">
                <p className="methodology-section-title">Customer Economic Value Index (CEI)</p>
                <p className="methodology-text">
                  The CEI is a normalised index — roughly 0–100, though value-destroying paths can fall below zero — combining revenue contribution, retention
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
          <Copyright className="copyright-footer" />
          {/* In reveal mode Previous rewinds the simulation. In team play it is
              a read-only walk back through completed rounds and their notes, so
              a team can revisit reasoning without re-opening a scored decision. */}
          <button
            className="btn btn-secondary"
            onClick={handlePrevRound}
            disabled={!canGoBack}
          >
            {isPlayMode ? '← Previous round' : '← Previous'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleNextRound}
            disabled={isReviewing ? false : (!selectedOption && !roundExpired) || isComplete}
          >
            {isReviewing
              ? (reviewIndex + 1 >= currentRoundIndex
                  ? `Back to Round ${currentRoundIndex + 1} →`
                  : 'Forward →')
              : roundExpired && !selectedOption
                ? 'Skip Round →'
                : 'Next Round →'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              // A stray Reset used to silently destroy a team's whole run.
              if (isPlayMode && hasSimulationStarted &&
                  !window.confirm('Reset wipes this team’s entire run. Continue?')) return
              handleReset()
            }}
          >
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
