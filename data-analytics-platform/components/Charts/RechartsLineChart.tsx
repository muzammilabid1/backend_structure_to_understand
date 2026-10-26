import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { SkeletonChart } from '../Shared/SkeletonLoader'

interface RechartsLineChartProps {
  data: any[] | undefined
  isLoading?: boolean
}

export default function RechartsLineChart({ data, isLoading }: RechartsLineChartProps) {
  if (isLoading || !data || !Array.isArray(data) || data.length === 0) {
    return <SkeletonChart />
  }

  // Transform data for Recharts format
  const chartData = data.map(item => ({
    year: item.year,
    percentage: Number(item.pp_percentage || 0),
    totalPupils: item.total_active_pupils,
    ppPupils: item.pp_active_pupils
  }))

  console.log('Recharts Data:', chartData)

  // Custom tooltip to show detailed information
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
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
          <p style={{ margin: '0 0 4px 0', color: '#fb923c', fontWeight: 600 }}>
            {data.percentage.toFixed(1)}% Pupil Premium
          </p>
          <p style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#6b7280' }}>
            {data.ppPupils.toLocaleString()} PP pupils
          </p>
          <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
            {data.totalPupils.toLocaleString()} total pupils
          </p>
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
            label={{ 
              value: 'Percentage (%)', 
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
          <Line 
            type="monotone" 
            dataKey="percentage" 
            stroke="#fb923c" 
            strokeWidth={3}
            dot={{ fill: '#fb923c', strokeWidth: 2, r: 6 }}
            activeDot={{ r: 8, stroke: '#fb923c', strokeWidth: 2, fill: '#ffffff' }}
            name="Pupil Premium %"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
