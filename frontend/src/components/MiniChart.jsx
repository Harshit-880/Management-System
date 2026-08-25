import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from 'recharts';

export default function MiniChart({ title, period, data, dataKey, color, peak, peakLabel }) {
  return (
    <div className="mini-chart-card">
      <div className="mini-chart-header">
        <span className="mini-chart-title">{title}</span>
        <span className="mini-chart-period">{period}</span>
      </div>
      <ResponsiveContainer width="100%" height={90}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 11, padding: '4px 8px', borderRadius: 6 }}
            itemStyle={{ color }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mini-chart-footer">
        {peak} <span className="text-muted">{peakLabel}</span>
      </div>
    </div>
  );
}
