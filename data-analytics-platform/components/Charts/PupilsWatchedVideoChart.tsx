import { ResponsiveLine } from '@nivo/line'
import { PupilsWatchedVideoResponse } from '../../pages/api/impact/pupils-watched-video'
import { SkeletonChart } from '../Shared/SkeletonLoader'

interface PupilsWatchedVideoChartProps {
  data: PupilsWatchedVideoResponse | undefined
  isLoading?: boolean
}

export default function PupilsWatchedVideoChart({ data, isLoading }: PupilsWatchedVideoChartProps) {
  if (isLoading || !data) {
    return <SkeletonChart />
  }

  // Transform data for Nivo - consistent colors with other charts
  const chartData = [
    {
      id: 'Pupil Premium',
      color: '#fb923c',
      data: data.pupil_premium.map((item) => ({
        x: item.year,
        y: item.pupils_watched_video,
      })),
    },
    {
      id: 'All Students',
      color: '#ea580c',
      data: data.all_students.map((item) => ({
        x: item.year,
        y: item.pupils_watched_video,
      })),
    },
  ]

  // Calculate max value for nice y-axis scaling
  const allValues = [
    ...data.all_students.map((item) => item.pupils_watched_video),
    ...data.pupil_premium.map((item) => item.pupils_watched_video),
  ]
  const maxValue = Math.max(...allValues)
  const yMax =
    maxValue < 100 ? Math.ceil((maxValue * 1.2) / 10) * 10 : Math.ceil((maxValue * 1.1) / 100) * 100

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
          reverse: false,
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
          legendPosition: 'middle',
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Number of Pupils',
          legendOffset: -60,
          legendPosition: 'middle',
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
          'areas',
          'crosshair',
          'lines',
          'points',
          'slices',
          'mesh',
          ({ xScale, yScale }) => {
            const allStudentsLastPoint = data.all_students[data.all_students.length - 1]
            const pupilPremiumLastPoint = data.pupil_premium[data.pupil_premium.length - 1]

            return (
              <g>
                {allStudentsLastPoint && (
                  <text
                    x={xScale('2024') + 15}
                    y={yScale(allStudentsLastPoint.pupils_watched_video)}
                    dy="0.35em"
                    style={{
                      fill: '#ea580c',
                      fontSize: '12px',
                      fontWeight: 600,
                      pointerEvents: 'none',
                    }}
                  >
                    All Students
                  </text>
                )}
                {pupilPremiumLastPoint && (
                  <text
                    x={xScale('2024') + 15}
                    y={yScale(pupilPremiumLastPoint.pupils_watched_video)}
                    dy="0.35em"
                    style={{
                      fill: '#fb923c',
                      fontSize: '12px',
                      fontWeight: 600,
                      pointerEvents: 'none',
                    }}
                  >
                    Pupil Premium
                  </text>
                )}
              </g>
            )
          },
        ]}
        theme={{
          background: 'transparent',
          text: {
            fontSize: 12,
            fill: '#333333',
            outlineWidth: 0,
            outlineColor: 'transparent',
          },
          axis: {
            domain: {
              line: {
                stroke: '#e5e7eb',
                strokeWidth: 1,
              },
            },
            legend: {
              text: {
                fontSize: 12,
                fill: '#374151',
                fontWeight: 600,
              },
            },
            ticks: {
              line: {
                stroke: '#e5e7eb',
                strokeWidth: 1,
              },
              text: {
                fontSize: 11,
                fill: '#6b7280',
              },
            },
          },
          grid: {
            line: {
              stroke: '#f3f4f6',
              strokeWidth: 1,
            },
          },
          tooltip: {
            container: {
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              padding: 0,
            },
          },
        }}
        tooltip={({ point }) => {
          // Find the corresponding data point to show additional info
          // const isAllStudents = point.serieId === 'All Students'
          const isAllStudents = true
          const yearData = isAllStudents
            ? data.all_students.find((d) => d.year === point.data.x)
            : data.pupil_premium.find((d) => d.year === point.data.x)

          const percentage =
            yearData?.total_pupils && yearData.total_pupils > 0
              ? ((yearData.pupils_watched_video / yearData.total_pupils) * 100).toFixed(1)
              : '0.0'

          console.log('Charts/PupilsWatchedVideoChart point', point)

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
                zIndex: 9999,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '12px' }}>
                ({point.data.x})
              </div>
              <div style={{ marginBottom: '2px' }}>
                <strong>{(point.data.y as number).toLocaleString()}</strong> pupils watched videos
              </div>
              {yearData && (
                <div style={{ fontSize: '10px', color: '#6b7280' }}>
                  {yearData.total_pupils.toLocaleString()} total pupils ({percentage}% watched)
                </div>
              )}
            </div>
          )
        }}
      />
    </div>
  )
}
