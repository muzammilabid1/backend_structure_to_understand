import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import styles from './index.module.scss'

export interface LineGraphSeries {
  dataKey: string
  label: string
  color: string
  dashed?: boolean
}

interface LineGraphProps {
  data: Array<{ name: string; [key: string]: any }>
  series: LineGraphSeries[]
  xAxisLabel?: string
  yAxisLabel?: string
  height?: number
  percentageOnYAxis?: boolean
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.lineGraphTooltip}>
        <p className={styles.lineGraphTooltipLabel}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p className={styles.lineGraphTooltipSeries} key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function LineGraph({
  data,
  series,
  xAxisLabel,
  yAxisLabel,
  height = 400,
  percentageOnYAxis = false,
}: LineGraphProps) {
  return (
    <div className={styles.lineGraphContainer} style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="name"
            stroke="#6b7280"
            fontSize={12}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
            label={
              xAxisLabel
                ? {
                    value: xAxisLabel,
                    position: 'insideBottom',
                    offset: -10,
                    style: { fontSize: '12px', fill: '#374151' },
                  }
                : undefined
            }
          />
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fontSize: '12px', fill: '#374151' },
                  }
                : undefined
            }
            domain={percentageOnYAxis ? [0, 100] : undefined}
            tickFormatter={percentageOnYAxis ? (value: number) => `${value}%` : undefined}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '14px', color: '#374151', paddingTop: '20px' }} />
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? '8 4' : undefined}
              dot={{ fill: s.color, strokeWidth: 1, r: 6 }}
              activeDot={{ r: 8, stroke: s.color, strokeWidth: 1, fill: '#ffffff' }}
              name={s.label}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
