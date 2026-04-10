const LEGEND_KEY = [
  { color: '#9ca3af', dash: true,  label: 'BAU Experience',       desc: 'baseline — no AI applied' },
  { color: '#2563eb', dash: false, label: 'Class Decision Path',  desc: 'cumulative class choices' },
  { color: '#16a34a', dash: true,  label: 'High-Value AI Path',   desc: 'strongest modeled outcome' },
  { color: '#dc2626', dash: true,  label: 'Low-Value AI Path',    desc: 'weakest modeled outcome' },
  { color: '#f59e0b', dash: true,  label: 'Preview Path',         desc: 'temporary comparison' },
]

export default function ExplanationPanel({ explanation, previewOption }) {
  return (
    <div className="explanation-panel">

      {/* Decision insight */}
      <div className={`insight-block ${explanation ? '' : 'insight-empty'}`}>
        <p className="panel-label">Decision insight</p>
        {explanation
          ? <p className="insight-text">{explanation}</p>
          : <p className="insight-placeholder">Select an option to see the consequence.</p>
        }
      </div>

      {/* Preview note — only shown when a preview is active */}
      {previewOption && (
        <div className="preview-note">
          <p className="panel-label">Previewing option {previewOption.id}</p>
          <p className="preview-text">{previewOption.explanation}</p>
        </div>
      )}

      {/* Chart legend key */}
      <div className="legend-key">
        <p className="panel-label">Chart key</p>
        <ul className="legend-list">
          {LEGEND_KEY.map(item => (
            <li key={item.label} className="legend-item">
              <span
                className="legend-swatch"
                style={{
                  borderTopStyle: item.dash ? 'dashed' : 'solid',
                  borderTopColor: item.color,
                }}
              />
              <span className="legend-text">
                <strong>{item.label}</strong> — {item.desc}
              </span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  )
}
