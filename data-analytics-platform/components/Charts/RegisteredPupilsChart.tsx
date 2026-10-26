import { ResponsiveLine } from '@nivo/line'
import { RegisteredPupilsResponse } from '../../pages/api/impact/registered-pupils'
import { SkeletonChart } from '../Shared/SkeletonLoader'

interface RegisteredPupilsChartProps {
  data: RegisteredPupilsResponse | undefined
  isLoading?: boolean
}

export default function RegisteredPupilsChart({ data, isLoading }: RegisteredPupilsChartProps) {
  if (isLoading || !data || !data.all_students || !data.pupil_premium) {
    return <SkeletonChart />
  }

  // Transform data for Nivo - consistent colors with other charts
  const chartData = [
    {
      id: 'Pupil Premium',
      color: '#fb923c',
      data: data.pupil_premium.map(item => ({
        x: item.year,
        y: item.total_registered_pupils
      }))
    },
    {
      id: 'All Students',
      color: '#ea580c',
      data: data.all_students.map(item => ({
        x: item.year,
        y: item.total_registered_pupils
      }))
    }
  ]

  // Calculate max value for nice y-axis scaling
  const maxValue = Math.max(
    ...data.all_students.map(item => item.total_registered_pupils),
    ...data.pupil_premium.map(item => item.total_registered_pupils)
  )
  const yMax = Math.ceil(maxValue * 1.1 / 1000) * 1000 // Round up to nearest thousand

  return (
    <div style={{ height: 400, overflow: 'visible' }}>
      <ResponsiveLine
        data={chartData}
        margin={{ top: 50, right: 120, bottom: 80, left: 80 }}
        xScale={{ type: 'point' }}
        yScale={{
          type: 'linear',
          min: 0,
          max: yMax,
          stacked: false,
          reverse: false
        }}
        yFormat=" >-.0f"
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
          legend: 'Total Registered Pupils',
          legendOffset: -60,
          legendPosition: 'middle',
          format: value => value.toLocaleString()
        }}
        pointSize={8}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={3}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        enableArea={false}
        enableGridX={false}
        enableGridY={true}
        gridYValues={5}
        useMesh={true}
        legends={[
          {
            anchor: 'bottom-right',
            direction: 'column',
            justify: false,
            translateX: 100,
            translateY: 0,
            itemsSpacing: 0,
            itemDirection: 'left-to-right',
            itemWidth: 80,
            itemHeight: 20,
            itemOpacity: 0.75,
            symbolSize: 12,
            symbolShape: 'circle',
            symbolBorderColor: 'rgba(0, 0, 0, .5)',
            effects: [
              {
                on: 'hover',
                style: {
                  itemBackground: 'rgba(0, 0, 0, .03)',
                  itemOpacity: 1
                }
              }
            ]
          }
        ]}
        theme={{
          axis: {
            ticks: {
              text: {
                fontSize: 12,
                fill: '#64748b'
              }
            },
            legend: {
              text: {
                fontSize: 13,
                fill: '#1e293b',
                fontWeight: 500
              }
            }
          },
          grid: {
            line: {
              stroke: '#e2e8f0',
              strokeWidth: 1
            }
          },
          legends: {
            text: {
              fontSize: 12,
              fill: '#1e293b'
            }
          }
        }}
        animate={true}
        motionConfig="gentle"
        crosshairType="cross"
        tooltip={({ point }) => (
          <div
            style={{
              background: 'white',
              padding: '9px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
              {point.seriesId}
            </div>
            <div>
              <strong>Year:</strong> {point.data.xFormatted}
            </div>
            <div>
              <strong>Registered Pupils:</strong> {point.data.yFormatted}
            </div>
          </div>
        )}
      />
    </div>
  )
} 