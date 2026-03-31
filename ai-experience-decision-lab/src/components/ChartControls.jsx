export default function ChartControls({ showBestPath, showWorstPath, onToggleBest, onToggleWorst }) {
  return (
    <div className="chart-controls">
      <button
        className={`chart-toggle toggle-best ${showBestPath ? 'active' : ''}`}
        onClick={onToggleBest}
      >
        <span className="toggle-dot dot-best" />
        {showBestPath ? 'Hide' : 'Show'} High-Value AI Path
      </button>
      <button
        className={`chart-toggle toggle-worst ${showWorstPath ? 'active' : ''}`}
        onClick={onToggleWorst}
      >
        <span className="toggle-dot dot-worst" />
        {showWorstPath ? 'Hide' : 'Show'} Low-Value AI Path
      </button>
    </div>
  )
}
