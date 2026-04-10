export default function ChartControls({ showBestPath, showWorstPath, onToggleBest, onToggleWorst }) {
  return (
    <div className="chart-controls">
      <button
        className={`chart-toggle toggle-best ${showBestPath ? 'active' : ''}`}
        onClick={onToggleBest}
      >
        <span className="toggle-dot dot-best" />
        {showBestPath ? 'Hide Ideal AI Experience' : 'Show Ideal AI Experience'}
      </button>
      <button
        className={`chart-toggle toggle-worst ${showWorstPath ? 'active' : ''}`}
        onClick={onToggleWorst}
      >
        <span className="toggle-dot dot-worst" />
        {showWorstPath ? 'Hide Worst-Case Scenario' : 'Show Worst-Case Scenario'}
      </button>
    </div>
  )
}
