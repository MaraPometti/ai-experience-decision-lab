import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'

const COLOR = {
  baseline: '#adbac7',
  live: '#7ad3ff',
  best: '#87edb4',
  preview: '#ffd166',
}

export default function ValueChart({
  stages,
  baselinePath,
  bestPath,
  livePath,
  showLivePath,
  showBestPath,
  showBaseline = true,
  previewPath,
}) {
  const data = stages.map((stage, i) => {
    const point = { stage }
    if (showBaseline) point['BAU Experience']         = baselinePath[i]
    if (showLivePath) point["Leaders' Path"]          = livePath[i]
    if (showBestPath) point['Optimal AI Experience']  = bestPath[i]
    if (previewPath)  point['Other Option Path']      = previewPath[i]
    return point
  })

  const legendPayload = [
    ...(showBaseline ? [{ value: 'BAU Experience',         type: 'line', color: COLOR.baseline }] : []),
    ...(showLivePath ? [{ value: "Leaders' Path",          type: 'line', color: COLOR.live }]     : []),
    ...(showBestPath ? [{ value: 'Optimal AI Experience',  type: 'line', color: COLOR.best }]     : []),
    ...(previewPath  ? [{ value: 'Other Option Path',      type: 'line', color: COLOR.preview }]  : []),
  ]

  return (
    <div className="value-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 24, left: 16, bottom: 8 }}>
          <XAxis
            dataKey="stage"
            tick={{ fontSize: 12, fill: '#a9c7d8' }}
            axisLine={{ stroke: 'rgba(162, 193, 206, 0.28)' }}
            tickLine={{ stroke: 'rgba(162, 193, 206, 0.28)' }}
          />

          <YAxis
            label={{
              value: 'Customer Economic Value Index',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              style: { fontSize: 11, fill: '#a9c7d8' },
            }}
            tick={{ fontSize: 12, fill: '#a9c7d8' }}
            // Normally pinned to 0–100 so every team's chart is comparable, but a
            // run can genuinely destroy value at Loyalty (the floor is −6). A fixed
            // domain silently clipped that to zero and misreported the outcome.
            domain={[dataMin => (dataMin < 0 ? Math.floor(dataMin / 10) * 10 : 0), 100]}
            width={80}
            axisLine={{ stroke: 'rgba(162, 193, 206, 0.28)' }}
            tickLine={{ stroke: 'rgba(162, 193, 206, 0.28)' }}
          />

          <Tooltip
            contentStyle={{
              fontSize: 13,
              background: 'rgba(7, 18, 25, 0.96)',
              border: '1px solid rgba(126, 239, 255, 0.2)',
              borderRadius: 12,
              color: '#ebfaff',
            }}
            labelStyle={{ fontWeight: 600, color: '#ebfaff' }}
          />

          <Legend
            payload={legendPayload}
            wrapperStyle={{ fontSize: 13, paddingTop: 8, color: '#d9edf7' }}
          />

          <Line
            type="monotone"
            dataKey="BAU Experience"
            hide={!showBaseline}
            stroke={COLOR.baseline}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />

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
