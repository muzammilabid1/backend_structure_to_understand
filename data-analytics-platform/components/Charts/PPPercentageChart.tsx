import { ResponsiveLine } from '@nivo/line'
import { PPPercentageData } from '../../lib/analytics-queries'
import { SkeletonChart } from '../Shared/SkeletonLoader'

interface PPPercentageChartProps {
  data: PPPercentageData[] | undefined
  isLoading?: boolean
}

export default function PPPercentageChart({ data, isLoading }: PPPercentageChartProps) {
  // Handle both flat array and wrapped data formats
  let actualData: any[] = []
  
  if (Array.isArray(data)) {
    actualData = data
  } else if (data && typeof data === 'object' && 'data' in data) {
    actualData = (data as any).data || []
  }
  
  console.log('PPPercentageChart Debug:', {
    receivedData: data,
    processedData: actualData,
    isArray: Array.isArray(actualData),
    length: actualData.length
  })
  
  if (isLoading || !actualData || !Array.isArray(actualData) || actualData.length === 0) {
    return <SkeletonChart />
  }

  // Transform data for Nivo - single line showing PP percentage
  const chartData = [
    {
      id: 'Pupil Premium %',
      color: '#fb923c',
      data: actualData.map(item => ({
        x: String(item.year),
        y: Number(item.pp_percentage || 0)
      }))
    }
  ]

  // Calculate max value for nice y-axis scaling
  const maxValue = Math.max(...actualData.map(item => Number(item.pp_percentage || 0)))
  const yMax = Math.max(Math.ceil(maxValue * 1.1 / 10) * 10, 10) // Round up to nearest 10, minimum 10

  // Final safety check
  if (!chartData || chartData.length === 0 || !chartData[0].data || chartData[0].data.length === 0) {
    return <SkeletonChart />
  }

  return (
    <div style={{ height: 400, overflow: 'visible' }}>
      <ResponsiveLine
        data={chartData}
        margin={{ top: 50, right: 120, bottom: 80, left: 60 }}
        xScale={{ type: 'point' }}
        yScale={{
          type: 'linear',
          min: 0,
          max: yMax,
          stacked: false,
          reverse: false
        }}
        yFormat=" >-.1f"
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Academic Year',
          legendOffset: 36,
          legendPosition: 'middle'
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Percentage (%)',
          legendOffset: -40,
          legendPosition: 'middle'
        }}
        pointSize={8}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        useMesh={true}
        enableGridX={false}
        enableGridY={true}
        gridYValues={5}
        lineWidth={3}
        enablePoints={true}
        animate={true}
        motionConfig="gentle"
        layers={[
          'grid',
          'markers',
          'axes',
          'crosshair',
          'lines',
          'points',
          'slices',
          'mesh'
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
                <strong>{(point.data.y as number).toFixed(1)}%</strong> of pupils are Pupil Premium
              </div>
              {yearData && (
                <div style={{ fontSize: '10px', color: '#6b7280' }}>
                  {yearData.pp_active_pupils.toLocaleString()} PP pupils out of {yearData.total_active_pupils.toLocaleString()} total
                </div>
              )}
            </div>
          )
        }}
      />
    </div>
  )
}
