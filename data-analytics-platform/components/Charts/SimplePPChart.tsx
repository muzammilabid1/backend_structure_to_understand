import React from 'react'
import { SkeletonChart } from '../Shared/SkeletonLoader'

interface SimplePPChartProps {
  data: any[] | undefined
  isLoading?: boolean
}

export default function SimplePPChart({ data, isLoading }: SimplePPChartProps) {
  if (isLoading || !data || !Array.isArray(data) || data.length === 0) {
    return <SkeletonChart />
  }

  const maxPercentage = Math.max(...data.map(item => Number(item.pp_percentage || 0)))
  const chartHeight = 300
  const chartWidth = 600
  const padding = 60

  return (
    <div style={{ 
      width: '100%', 
      height: 400, 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '20px'
    }}>
      {/* Chart Title */}
      <h3 style={{ margin: '0 0 20px 0', color: '#374151' }}>
        Pupil Premium Percentage by Year
      </h3>
      
      {/* Simple SVG Chart */}
      <svg width={chartWidth} height={chartHeight} style={{ border: '1px solid #f3f4f6' }}>
        {/* Grid lines */}
        {[0, 10, 20, 30, 40].map(tick => {
          const y = chartHeight - padding - (tick / maxPercentage) * (chartHeight - 2 * padding)
          return (
            <g key={tick}>
              <line 
                x1={padding} 
                y1={y} 
                x2={chartWidth - padding} 
                y2={y} 
                stroke="#f3f4f6" 
                strokeWidth={1}
              />
              <text 
                x={padding - 10} 
                y={y + 4} 
                textAnchor="end" 
                fontSize="12" 
                fill="#6b7280"
              >
                {tick}%
              </text>
            </g>
          )
        })}
        
        {/* X-axis */}
        <line 
          x1={padding} 
          y1={chartHeight - padding} 
          x2={chartWidth - padding} 
          y2={chartHeight - padding} 
          stroke="#374151" 
          strokeWidth={2}
        />
        
        {/* Y-axis */}
        <line 
          x1={padding} 
          y1={padding} 
          x2={padding} 
          y2={chartHeight - padding} 
          stroke="#374151" 
          strokeWidth={2}
        />
        
        {/* Data line */}
        <polyline
          points={data.map((item, index) => {
            const x = padding + (index / (data.length - 1)) * (chartWidth - 2 * padding)
            const y = chartHeight - padding - (Number(item.pp_percentage || 0) / maxPercentage) * (chartHeight - 2 * padding)
            return `${x},${y}`
          }).join(' ')}
          fill="none"
          stroke="#fb923c"
          strokeWidth={3}
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {data.map((item, index) => {
          const x = padding + (index / (data.length - 1)) * (chartWidth - 2 * padding)
          const y = chartHeight - padding - (Number(item.pp_percentage || 0) / maxPercentage) * (chartHeight - 2 * padding)
          return (
            <g key={item.year}>
              <circle
                cx={x}
                cy={y}
                r={6}
                fill="#fb923c"
                stroke="#ffffff"
                strokeWidth={2}
              />
              {/* X-axis labels */}
              <text
                x={x}
                y={chartHeight - padding + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#374151"
                fontWeight="600"
              >
                {item.year}
              </text>
              {/* Data labels */}
              <text
                x={x}
                y={y - 15}
                textAnchor="middle"
                fontSize="11"
                fill="#fb923c"
                fontWeight="600"
              >
                {Number(item.pp_percentage || 0).toFixed(1)}%
              </text>
            </g>
          )
        })}
      </svg>
      
      {/* Legend */}
      <div style={{ 
        marginTop: '20px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        fontSize: '14px',
        color: '#374151'
      }}>
        <div style={{ 
          width: '16px', 
          height: '3px', 
          background: '#fb923c',
          borderRadius: '2px'
        }}></div>
        <span>Pupil Premium Percentage</span>
      </div>
      
      {/* Summary Stats */}
      <div style={{ 
        marginTop: '16px', 
        display: 'flex', 
        gap: '24px',
        fontSize: '12px',
        color: '#6b7280'
      }}>
        <span>Years: {data.length}</span>
        <span>Range: {Math.min(...data.map(d => Number(d.pp_percentage))).toFixed(1)}% - {Math.max(...data.map(d => Number(d.pp_percentage))).toFixed(1)}%</span>
        <span>Latest: {data[data.length - 1]?.pp_percentage}% ({data[data.length - 1]?.year})</span>
      </div>
    </div>
  )
}
