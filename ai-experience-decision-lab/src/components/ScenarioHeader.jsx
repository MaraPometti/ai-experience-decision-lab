import { useState } from 'react'

export default function ScenarioHeader({ roundTitle, aishaContext, isFinished }) {
  const [aishaOpen, setAishaOpen] = useState(false)

  return (
    <div className="round-question">
      <h2 className="round-title">{roundTitle}</h2>

      {aishaContext && !isFinished && (
        <div className={`aisha-context ${aishaOpen ? 'aisha-open' : ''}`}>
          <button
            className="aisha-context-toggle"
            onClick={() => setAishaOpen(v => !v)}
          >
            Aisha's Situation {aishaOpen ? '▲' : '▼'}
          </button>
          {aishaOpen && (
            <p className="aisha-context-text">{aishaContext}</p>
          )}
        </div>
      )}
    </div>
  )
}
