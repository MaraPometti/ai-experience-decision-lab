import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

const COLOR = {
  baseline: '#9ca3af',  // gray    — BAU Experience
  live:     '#2563eb',  // blue    — Leaders' Path
  best:     '#16a34a',  // green   — Ideal AI Experience
  worst:    '#dc2626',  // red     — Worst-Case Scenario
  preview:  '#f59e0b',  // amber   — Explanation
}

function fmtGBP(value) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `£${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `£${Math.round(abs / 1_000)}K`
  return `£${Math.round(abs)}`
}

function formatIdealDelta(delta) {
  if (delta === 0) return 'On ideal path'
  if (delta > 0) return `${delta} points above ideal`
  return `${Math.abs(delta)} points below ideal`
}

function resolveRevenueGap(title, actualRevenueGap, previewRevenueGap) {
  if (title === 'Ideal AI Experience') return 'Revenue gap: On ideal path'
  if (title === 'Other Option Path') {
    return previewRevenueGap > 0
      ? `Revenue gap: ${fmtGBP(previewRevenueGap)} behind ideal path`
      : 'Revenue gap: On ideal path'
  }
  return actualRevenueGap > 0
    ? `Revenue gap: ${fmtGBP(actualRevenueGap)} behind ideal path`
    : 'Revenue gap: On ideal path'
}

function CustomTooltip({ active, label, payload, bestPath, stages, actualRevenueGap, previewRevenueGap }) {
  if (!active || !payload?.length) return null

  const visiblePoint = payload.find(item => item.value != null)
  if (!visiblePoint) return null

  const stageIndex = stages.indexOf(label)
  const idealValue = stageIndex >= 0 ? bestPath[stageIndex] : null
  const currentValue = Math.round(visiblePoint.value)
  const idealDelta = idealValue == null ? null : Math.round(currentValue - idealValue)

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-stage">{label}</p>
      <p className="chart-tooltip-value">CVI: {currentValue}</p>
      <p className="chart-tooltip-detail">
        Delta vs ideal: {idealDelta == null ? 'Unavailable' : formatIdealDelta(idealDelta)}
      </p>
      <p className="chart-tooltip-detail">
        {resolveRevenueGap(visiblePoint.name, actualRevenueGap, previewRevenueGap)}
      </p>
    </div>
  )
}

export default function ValueChart({
  stages,
  baselinePath,
  bestPath,
  worstPath,
  livePath,
  showLivePath,    // true after first option is applied
  showBestPath,
  showWorstPath,
  previewPath,
  actualRevenueGap,
  previewRevenueGap,
}) {
  // ── Build chart data ──────────────────────────────────────────────────────────
  // BAU Experience is always present.
  // Class Decision Path only appears once the simulation has started.
  // Conditional series are only added to data when visible so the tooltip
  // never lists hidden lines.
  const data = stages.map((stage, i) => {
    const point = {
      stage,
      'BAU Experience': baselinePath[i],
    }
    if (showLivePath)  point["Leaders' Path"] = livePath[i]
    if (showBestPath)  point['Ideal AI Experience'] = bestPath[i]
    if (showWorstPath) point['Worst-Case Scenario'] = worstPath[i]
    if (previewPath)   point['Other Option Path'] = previewPath[i]
    return point
  })

  // ── Legend payload ────────────────────────────────────────────────────────────
  // Controlled explicitly so the legend only lists lines that are actually shown.
  const legendPayload = [
    { value: 'BAU Experience',      type: 'line', color: COLOR.baseline },
    ...(showLivePath  ? [{ value: "Leaders' Path", type: 'line', color: COLOR.live }] : []),
    ...(showBestPath  ? [{ value: 'Ideal AI Experience', type: 'line', color: COLOR.best }] : []),
    ...(showWorstPath ? [{ value: 'Worst-Case Scenario', type: 'line', color: COLOR.worst }] : []),
    ...(previewPath   ? [{ value: 'Other Option Path', type: 'line', color: COLOR.preview }] : []),
  ]

  return (
    <div className="value-chart">
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={data} margin={{ top: 16, right: 24, left: 16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="stage"
            tick={{ fontSize: 12, fill: '#374151' }}
          />

          <YAxis
            label={{
              value: 'Customer Value Index',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              style: { fontSize: 11, fill: '#6b7280' },
            }}
            tick={{ fontSize: 12, fill: '#374151' }}
            domain={[0, 'auto']}   // floor at 0 — negative values clip cleanly
            width={80}
          />

          <Tooltip
            content={<CustomTooltip
              bestPath={bestPath}
              stages={stages}
              actualRevenueGap={actualRevenueGap}
              previewRevenueGap={previewRevenueGap}
            />}
          />

          <Legend
            payload={legendPayload}
            wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
          />

          {/* ── Always visible ── */}

          {/* BAU: gray dashed — stays perceivable even when live path overlaps */}
          <Line
            type="monotone"
            dataKey="BAU Experience"
            stroke={COLOR.baseline}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />

          {/* ── Class Decision Path — hidden until first option is applied ── */}
          <Line
            type="monotone"
            dataKey="Leaders' Path"
            hide={!showLivePath}
            stroke={COLOR.live}
            strokeWidth={3}
            dot={{ r: 5 }}
            activeDot={{ r: 7 }}
            isAnimationActive={false}
          />

          {/* ── Conditionally visible reference lines ── */}
          {/* Using hide prop rather than conditional JSX for recharts 3.x compatibility */}

          <Line
            type="monotone"
            dataKey="Ideal AI Experience"
            hide={!showBestPath}
            stroke={COLOR.best}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="Worst-Case Scenario"
            hide={!showWorstPath}
            stroke={COLOR.worst}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />

          {/* Explanation compare line — amber dashed */}
          <Line
            type="monotone"
            dataKey="Other Option Path"
            hide={!previewPath}
            stroke={COLOR.preview}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />

        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
