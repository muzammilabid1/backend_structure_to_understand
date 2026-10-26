import { ResponsiveLine } from '@nivo/line'
import { PhotosUploadedResponse } from '../../pages/api/impact/photos-uploaded'
import { SkeletonChart } from '../Shared/SkeletonLoader'

interface PhotosUploadedChartProps {
  data: PhotosUploadedResponse | undefined
  isLoading?: boolean
}

export default function PhotosUploadedChart({ data, isLoading }: PhotosUploadedChartProps) {
  if (isLoading || !data || !data.all_students || !data.pupil_premium) {
    return <SkeletonChart />
  }

  // Transform data for Nivo - following the same pattern as TotalFeedbacksChart
  const chartData = [
    {
      id: 'Pupil Premium',
      color: '#fb923c',
      data: data.pupil_premium.map(item => ({
        x: item.year,
        y: item.total_photos
      }))
    },
    {
      id: 'All Students',
      color: '#ea580c',
      data: data.all_students.map(item => ({
        x: item.year,
        y: item.total_photos
      }))
    }
  ]

  // Calculate max value for nice y-axis scaling
  const maxValue = Math.max(
    ...data.all_students.map(item => item.total_photos),
    ...data.pupil_premium.map(item => item.total_photos)
  )
  const yMax = Math.ceil(maxValue * 1.1 / 100) * 100 // Round up to nearest hundred

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
        yFormat=" >-,.0f"
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Academic Year',
          legendOffset: 36,
          legendPosition: 'middle',
          truncateTickAt: 0
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Number of Photos Uploaded',
          legendOffset: -60,
          legendPosition: 'middle',
          truncateTickAt: 0,
          format: (value) => value.toLocaleString()
        }}
        pointSize={10}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={3}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabel="y"
        pointLabelYOffset={-12}
        useMesh={true}
        curve="monotoneX"
        animate={true}
        motionConfig="gentle"
        enableGridX={false}
        enableGridY={true}
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
                    y={yScale(allStudentsLastPoint.total_photos)}
                    dy="0.35em"
                    style={{
                      fill: '#ea580c',
                      fontSize: '12px',
                      fontWeight: 600,
                      pointerEvents: 'none'
                    }}
                  >
                    All Students
                  </text>
                )}
                {pupilPremiumLastPoint && (
                  <text
                    x={xScale('2024') + 15}
                    y={yScale(pupilPremiumLastPoint.total_photos)}
                    dy="0.35em"
                    style={{
                      fill: '#fb923c',
                      fontSize: '12px',
                      fontWeight: 600,
                      pointerEvents: 'none'
                    }}
                  >
                    Pupil Premium
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
          // Determine if this is an "All Students" or "Pupil Premium" line
          const isAllStudents = point.seriesId === 'All Students'
          
          // Find the corresponding data based on year and student type
          const yearData = isAllStudents 
            ? data.all_students.find(d => d.year === point.data.x)
            : data.pupil_premium.find(d => d.year === point.data.x)
          
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
                {point.seriesId} ({point.data.x})
              </div>
              <div style={{ marginBottom: '2px' }}>
                <strong>{(point.data.y as number).toLocaleString()}</strong> photos uploaded
              </div>
              {yearData && (
                <div style={{ fontSize: '10px', color: '#6b7280' }}>
                  Photos uploaded by parents with feedback
                </div>
              )}
            </div>
          )
        }}
      />
    </div>
  )
}
