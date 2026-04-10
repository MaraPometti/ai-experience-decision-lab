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
  live:     '#2563eb',  // blue    — Class Decision Path
  best:     '#16a34a',  // green   — High-Value AI Path
  worst:    '#dc2626',  // red     — Low-Value AI Path
  preview:  '#f59e0b',  // amber   — Preview
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
    if (showLivePath)  point['Class Decision Path'] = livePath[i]
    if (showBestPath)  point['High-Value AI Path']  = bestPath[i]
    if (showWorstPath) point['Low-Value AI Path']   = worstPath[i]
    if (previewPath)   point['Preview']             = previewPath[i]
    return point
  })

  // ── Legend payload ────────────────────────────────────────────────────────────
  // Controlled explicitly so the legend only lists lines that are actually shown.
  const legendPayload = [
    { value: 'BAU Experience',      type: 'line', color: COLOR.baseline },
    ...(showLivePath  ? [{ value: 'Class Decision Path', type: 'line', color: COLOR.live }]    : []),
    ...(showBestPath  ? [{ value: 'High-Value AI Path',  type: 'line', color: COLOR.best }]    : []),
    ...(showWorstPath ? [{ value: 'Low-Value AI Path',   type: 'line', color: COLOR.worst }]   : []),
    ...(previewPath   ? [{ value: 'Preview',             type: 'line', color: COLOR.preview }] : []),
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
              value: 'Customer Economic Value Index',
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
            contentStyle={{ fontSize: 13 }}
            labelStyle={{ fontWeight: 600 }}
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
            dataKey="Class Decision Path"
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
            dataKey="High-Value AI Path"
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
            dataKey="Low-Value AI Path"
            hide={!showWorstPath}
            stroke={COLOR.worst}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />

          {/* Preview compare line — amber dashed */}
          <Line
            type="monotone"
            dataKey="Preview"
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
