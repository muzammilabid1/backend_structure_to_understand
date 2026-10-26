import { ResponsiveLine } from '@nivo/line'
import { PPPercentageResponse } from '../../pages/api/impact/pp-percentage'
import { SkeletonChart } from '../Shared/SkeletonLoader'

interface FeedbackPercentageChartProps {
  data: PPPercentageResponse | undefined
  isLoading?: boolean
}

export default function FeedbackPercentageChart({ data, isLoading }: FeedbackPercentageChartProps) {
  if (isLoading || !data) {
    return <SkeletonChart />
  }

  // Handle both wrapped and unwrapped data formats
  const actualData = Array.isArray(data) ? data : data.data
  
  if (!actualData || !Array.isArray(actualData)) {
    return <SkeletonChart />
  }

  // Transform data for Nivo - single line showing PP percentage among active students
  const chartData = [
    {
      id: 'Pupil Premium %',
      color: '#fb923c',
      data: actualData.map(item => ({
        x: item.year,
        y: item.pp_percentage || item.pupil_premium_percentage || 0
      }))
    }
  ]

  return (
    <div style={{ height: 400, overflow: 'visible' }}>
      <ResponsiveLine
        data={chartData}
        margin={{ top: 50, right: 120, bottom: 80, left: 60 }}
        xScale={{ type: 'point' }}
        yScale={{
          type: 'linear',
          min: 0,
          max: Math.ceil(Math.max(...actualData.map(item => item.pp_percentage || item.pupil_premium_percentage || 0)) * 1.1 / 10) * 10,
          stacked: false,
          reverse: false
        }}
        yFormat=" >-.2f"
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Academic Year',
          legendOffset: 36,
          legendPosition: 'middle',
          truncateTickAt: 0,
          format: (value) => `${value}-${(parseInt(value) + 1).toString().slice(2)}`
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Percentage (%)',
          legendOffset: -40,
          legendPosition: 'middle',
          truncateTickAt: 0
        }}
        pointSize={8}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabel="y"
        pointLabelYOffset={-12}
        useMesh={true}
        curve="monotoneX"
        animate={true}
        motionConfig="gentle"
        layers={[
          'grid',
          'markers',
          'axes',
          'areas',
          'crosshair',
          'lines',
          'points',
          'slices',
          'mesh',
          ({ xScale, yScale }) => {
            const lastPoint = actualData[actualData.length - 1]
            
            return (
              <g>
                {lastPoint && (
                  <text
                    x={xScale('2024') + 15}
                    y={yScale(lastPoint.pp_percentage || lastPoint.pupil_premium_percentage || 0)}
                    dy="0.35em"
                    style={{
                      fill: '#fb923c',
                      fontSize: '12px',
                      fontWeight: 600,
                      pointerEvents: 'none'
                    }}
                  >
                    Pupil Premium %
                  </text>
                )}
              </g>
            )
          }
        ]}
        theme={{
          background: 'transparent',
          text: {
            fontSize: 12,
            fill: '#333333',
            outlineWidth: 0,
            outlineColor: 'transparent'
          },
          axis: {
            domain: {
              line: {
                stroke: '#e5e7eb',
                strokeWidth: 1
              }
            },
            legend: {
              text: {
                fontSize: 12,
                fill: '#374151',
                fontWeight: 600
              }
            },
            ticks: {
              line: {
                stroke: '#e5e7eb',
                strokeWidth: 1
              },
              text: {
                fontSize: 11,
                fill: '#6b7280'
              }
            }
          },
          grid: {
            line: {
              stroke: '#f3f4f6',
              strokeWidth: 1
            }
          },
          tooltip: {
            container: {
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              padding: 0
            }
          }
        }}
        tooltip={({ point }) => {
          // Find the corresponding data
          const yearData = actualData.find(d => d.year === point.data.x)
          
          return (
            <div
              style={{
                background: 'white',
                padding: '8px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                fontSize: '11px',
                lineHeight: '1.3',
                maxWidth: '200px',
                transform: 'translate(-50%, 15px)',
                position: 'relative',
                zIndex: 9999
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '12px' }}>
                Pupil Premium % ({point.data.x})
              </div>
              <div style={{ marginBottom: '2px' }}>
                <strong>{(point.data.y as number).toFixed(1)}%</strong> of active pupils are Pupil Premium
              </div>
              {yearData && (
                <div style={{ fontSize: '10px', color: '#6b7280' }}>
                  {(yearData.pp_active_pupils || yearData.pp_total_active_pupils || 0).toLocaleString()} PP pupils out of {yearData.total_active_pupils.toLocaleString()} total active
                </div>
              )}
            </div>
          )
        }}
      />
    </div>
  )
} 