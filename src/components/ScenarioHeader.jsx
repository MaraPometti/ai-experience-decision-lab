export default function ScenarioHeader({
  title,
  subtitle,
  currentRound,
  totalRounds,
  stage,
  roundTitle,
  roundPrompt,
  isFinished,
}) {
  return (
    <header className="scenario-header">
      <div className="scenario-meta">
        <h1 className="scenario-title">{title}</h1>
        <p className="scenario-subtitle">{subtitle}</p>
      </div>

      <div className="round-info">
        {isFinished ? (
          <div className="round-badge finished">
            <span className="round-label">Simulation complete</span>
          </div>
        ) : (
          <>
            <div className="round-badge">
              <span className="round-label">Round</span>
              <span className="round-number">{currentRound} / {totalRounds}</span>
              <span className="round-stage">{stage}</span>
            </div>
            <div className="round-content">
              <h2 className="round-title">{roundTitle}</h2>
              <p className="round-prompt">{roundPrompt}</p>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
