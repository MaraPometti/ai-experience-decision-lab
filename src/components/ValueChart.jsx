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
  best:     '#16a34a',  // green   — Optimal AI Experience
  worst:    '#dc2626',  // red     — Worst-Case Scenario
  preview:  '#f59e0b',  // amber   — Explanation
}

function fmtGBP(value) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `£${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `£${Math.round(abs / 1_000)}K`
  return `£${Math.round(abs)}`
}

function CustomTooltip({ active, label, payload, bestPath, stages, actualRevenueGap }) {
  if (!active || !payload?.length) return null

  const stageIndex = stages.indexOf(label)
  const optimalValue = stageIndex >= 0 ? bestPath[stageIndex] : null

  const leadersItem  = payload.find(p => p.dataKey === "Leaders' Path")
  const leadersValue = leadersItem ? Math.round(leadersItem.value) : null

  const optimalItem  = payload.find(p => p.dataKey === 'Optimal AI Experience')
  const optimalDisplay = optimalItem ? Math.round(optimalItem.value) : optimalValue

  const delta = leadersValue != null && optimalDisplay != null ? leadersValue - optimalDisplay : null

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-stage">{label}</p>
      <p className="chart-tooltip-value chart-tooltip-optimal">
        Optimal AI Experience: CVI {optimalDisplay ?? '—'}
      </p>
      <p className="chart-tooltip-value chart-tooltip-leaders">
        Leaders&apos; Path: CVI {leadersValue ?? 'Not started'}
      </p>
      <p className="chart-tooltip-detail chart-tooltip-gap">
        Delta CVI: {delta == null ? 'Not available yet' : `${delta > 0 ? '+' : ''}${delta} CVI`}
      </p>
      {leadersValue != null && (
        <p className="chart-tooltip-detail">
          Revenue gap vs optimal path: {actualRevenueGap > 0 ? fmtGBP(actualRevenueGap) : '£0'}
        </p>
      )}
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
    if (showBestPath)  point['Optimal AI Experience'] = bestPath[i]
    if (showWorstPath) point['Worst-Case Scenario'] = worstPath[i]
    if (previewPath)   point['Other Option Path'] = previewPath[i]
    return point
  })

  // ── Legend payload ────────────────────────────────────────────────────────────
  // Controlled explicitly so the legend only lists lines that are actually shown.
  const legendPayload = [
    { value: 'BAU Experience',      type: 'line', color: COLOR.baseline },
    ...(showLivePath  ? [{ value: "Leaders' Path", type: 'line', color: COLOR.live }] : []),
    ...(showBestPath  ? [{ value: 'Optimal AI Experience', type: 'line', color: COLOR.best }] : []),
    ...(showWorstPath ? [{ value: 'Worst-Case Scenario', type: 'line', color: COLOR.worst }] : []),
    ...(previewPath   ? [{ value: 'Other Option Path', type: 'line', color: COLOR.preview }] : []),
  ]

  return (
    <div className="value-chart">
      <ResponsiveContainer width="100%" height="100%">
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
            dataKey="Optimal AI Experience"
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
