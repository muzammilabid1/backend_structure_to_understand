import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { SkeletonChart } from '../Shared/SkeletonLoader'

interface DualLineChartProps {
  data: any[] | undefined
  isLoading?: boolean
  title: string
  allLineKey: string
  ppLineKey: string
  allLineName: string
  ppLineName: string
  yAxisLabel: string
  valueFormatter?: (value: number) => string
}

export default function DualLineChart({ 
  data, 
  isLoading, 
  title,
  allLineKey,
  ppLineKey,
  allLineName,
  ppLineName,
  yAxisLabel,
  valueFormatter = (value) => value.toLocaleString()
}: DualLineChartProps) {
  if (isLoading || !data || !Array.isArray(data) || data.length === 0) {
    return <SkeletonChart />
  }

  // Transform data for Recharts format
  const chartData = data.map(item => ({
    year: item.year,
    [allLineKey]: Number(item[allLineKey] || 0),
    [ppLineKey]: Number(item[ppLineKey] || 0)
  }))

  console.log(`${title} Chart Data:`, chartData)

  // Custom tooltip to show detailed information
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'white',
          padding: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          fontSize: '14px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#374151' }}>
            Academic Year {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ 
              margin: '0 0 4px 0', 
              color: entry.color, 
              fontWeight: 600 
            }}>
              {entry.dataKey === allLineKey ? allLineName : ppLineName}: {valueFormatter(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <LineChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis 
            dataKey="year" 
            stroke="#6b7280"
            fontSize={12}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
            tickFormatter={valueFormatter}
            label={{ 
              value: yAxisLabel, 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: '12px', fill: '#374151' }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ 
              fontSize: '14px', 
              color: '#374151',
              paddingTop: '20px'
            }}
          />
          {/* All students line */}
          <Line 
            type="monotone" 
            dataKey={allLineKey}
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
            activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
            name={allLineName}
          />
          {/* Pupil Premium line */}
          <Line 
            type="monotone" 
            dataKey={ppLineKey}
            stroke="#fb923c" 
            strokeWidth={3}
            dot={{ fill: '#fb923c', strokeWidth: 2, r: 6 }}
            activeDot={{ r: 8, stroke: '#fb923c', strokeWidth: 2, fill: '#ffffff' }}
            name={ppLineName}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
