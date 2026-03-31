const LABELS = { cei: 'CEI', trust: 'Trust', cost: 'Cost', retention: 'Retention' }

export default function ScorePanel({ score }) {
  return (
    <div className="score-panel">
      <h3 className="score-panel-title">Cumulative score</h3>
      <div className="score-grid">
        {Object.entries(score).map(([key, value]) => (
          <div key={key} className="score-item">
            <span className="score-key">{LABELS[key] ?? key}</span>
            <span className={`score-value ${value >= 0 ? 'positive' : 'negative'}`}>
              {value > 0 ? '+' : ''}{value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
