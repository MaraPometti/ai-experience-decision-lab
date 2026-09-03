import { useEffect, useState } from 'react'
import { scoreRun, getBand, parseChoiceString, ROUND_COUNT } from '../lib/scoring'
import { loadBoard, saveBoard } from '../lib/persistence'
import Copyright from './Copyright'

function fmtM(v) {
  const sign = v < 0 ? '−' : '+'
  return `${sign}£${(Math.abs(v) / 1_000_000).toFixed(1)}m`
}

export default function Leaderboard({ scenarioTitle }) {
  const [entries, setEntries] = useState(() => loadBoard())
  const [teamName, setTeamName] = useState('')
  const [choiceStr, setChoiceStr] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { saveBoard(entries) }, [entries])

  function handleAdd() {
    const name = teamName.trim()
    if (name.length < 2) {
      setError('Enter a team name.')
      return
    }
    const parsed = parseChoiceString(choiceStr)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setEntries(prev => [
      ...prev.filter(e => e.team.toLowerCase() !== name.toLowerCase()),
      { team: name, choices: parsed.choices },
    ])
    setTeamName('')
    setChoiceStr('')
    setError('')
  }

  const ranked = entries
    .map(entry => {
      const result = scoreRun(entry.choices)
      return { ...entry, result, band: getBand(result.composite) }
    })
    .sort((a, b) => b.result.composite - a.result.composite)

  return (
    <div className="leaderboard-view">
      <div className="leaderboard-shell">

        <div className="leaderboard-header">
          <div>
            <p className="leaderboard-kicker">Facilitator · {scenarioTitle}</p>
            <h1 className="leaderboard-title">Leaderboard</h1>
          </div>
          <span className="leaderboard-round-pill">
            {ranked.length} {ranked.length === 1 ? 'team' : 'teams'}
          </span>
        </div>

        <div className="leaderboard-form">
          <input
            className="leaderboard-input"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            placeholder="Team name"
            aria-label="Team name"
          />
          <input
            className="leaderboard-input leaderboard-input--code"
            value={choiceStr}
            onChange={e => setChoiceStr(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            placeholder={`Choices (${ROUND_COUNT} letters, e.g. BCAACBA)`}
            maxLength={ROUND_COUNT + 4}
            aria-label="Choice string"
          />
          <button className="btn btn-primary" onClick={handleAdd}>Add team</button>
        </div>

        {error && <p className="leaderboard-error">{error}</p>}

        <p className="leaderboard-help">
          Each team reads out the choice string on their final screen. Ranking uses the same
          weighted scorecard the teams are graded on — revenue, customer value, CEI, trust,
          retention and budget discipline — not revenue alone. Use <code>-</code> for a round
          that timed out.
        </p>

        {ranked.length === 0 ? (
          <p className="leaderboard-empty">No teams entered yet.</p>
        ) : (
          <div className="leaderboard-grid">
            {ranked.map((entry, i) => (
              <div
                key={entry.team}
                className={`leaderboard-card ${i === 0 ? 'leaderboard-card--winner' : ''}`}
              >
                <div className="leaderboard-card-top">
                  <span className="leaderboard-team-name">
                    <span className="leaderboard-rank">{i + 1}</span> {entry.team}
                  </span>
                  {i === 0 && <span className="leaderboard-best-badge">🏆 Leading</span>}
                </div>

                <div className="leaderboard-stat-block">
                  <span className="leaderboard-stat-label">Balance score</span>
                  <strong>{entry.result.composite}</strong>
                </div>
                <div className="leaderboard-stat-block">
                  <span className="leaderboard-stat-label">Revenue</span>
                  <strong>{fmtM(entry.result.revenueDelta)}</strong>
                </div>
                <div className="leaderboard-stat-block">
                  <span className="leaderboard-stat-label">Trust</span>
                  <strong>{entry.result.score.trust >= 0 ? '+' : ''}{entry.result.score.trust}</strong>
                </div>
                <div className="leaderboard-stat-block">
                  <span className="leaderboard-stat-label">Retention</span>
                  <strong>{entry.result.score.retention >= 0 ? '+' : ''}{entry.result.score.retention}</strong>
                </div>
                <div className="leaderboard-stat-block">
                  <span className="leaderboard-stat-label">Budget left</span>
                  <strong className={entry.result.overspend > 0 ? 'stat-over' : undefined}>
                    {fmtM(entry.result.budgetRemaining)}
                  </strong>
                </div>

                {entry.result.penalty > 0 && (
                  <p className="leaderboard-penalty">
                    −{entry.result.penalty} overspend penalty applied
                  </p>
                )}

                <div className="leaderboard-status-row">
                  <span className="leaderboard-status-dot" />
                  {entry.band.label}
                </div>

                <p className="leaderboard-choices">{entry.choices.join('')}</p>

                <button
                  className="btn btn-secondary btn-subtle leaderboard-remove"
                  onClick={() => setEntries(prev => prev.filter(e => e.team !== entry.team))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {ranked.length > 0 && (
          <div className="leaderboard-actions">
            <button
              className="btn btn-secondary"
              onClick={() => { if (window.confirm('Clear all teams from the leaderboard?')) setEntries([]) }}
            >
              Clear leaderboard
            </button>
          </div>
        )}

        <div className="leaderboard-footer">
          <Copyright />
        </div>

      </div>
    </div>
  )
}
