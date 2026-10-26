import { ResponsiveLine } from '@nivo/line'
import { StudentTotalsResponse } from '../../pages/api/impact/student-totals'
import { SkeletonChart } from '../Shared/SkeletonLoader'

interface StudentTotalsChartProps {
  data: StudentTotalsResponse | undefined
  isLoading?: boolean
}

export default function StudentTotalsChart({ data, isLoading }: StudentTotalsChartProps) {
  if (isLoading || !data) {
    return <SkeletonChart />
  }

  // Handle both wrapped and unwrapped data formats
  const actualData = data || data

  if (!actualData || !actualData.all_students || !actualData.pupil_premium) {
    return <SkeletonChart />
  }

  // Aggregate duplicate years by summing values
  const aggregateByYear = (data: any[]) => {
    const yearMap = new Map()
    data.forEach((item) => {
      const year = item.year.toString()
      if (yearMap.has(year)) {
        const existing = yearMap.get(year)
        yearMap.set(year, {
          ...existing,
          total_active_pupils: existing.total_active_pupils + item.total_active_pupils,
          pupils_with_feedback:
            (existing.pupils_with_feedback || 0) + (item.pupils_with_feedback || 0),
        })
      } else {
        yearMap.set(year, { ...item, year })
      }
    })
    return Array.from(yearMap.values()).sort((a, b) => parseInt(a.year) - parseInt(b.year))
  }

  const aggregatedAllStudents = aggregateByYear(actualData.all_students)
  const aggregatedPupilPremium = aggregateByYear(actualData.pupil_premium)

  // Transform data for Nivo - consistent colors with other charts
  const chartData = [
    {
      id: 'Pupil Premium',
      color: '#fb923c',
      data: aggregatedPupilPremium.map((item) => ({
        x: item.year,
        y: item.total_active_pupils,
      })),
    },
    {
      id: 'All Students',
      color: '#ea580c',
      data: aggregatedAllStudents.map((item) => ({
        x: item.year,
        y: item.total_active_pupils,
      })),
    },
  ]

  // Calculate max value for nice y-axis scaling
  const maxValue = Math.max(
    ...aggregatedAllStudents.map((item) => item.total_active_pupils),
    ...aggregatedPupilPremium.map((item) => item.total_active_pupils)
  )
  const yMax = Math.ceil((maxValue * 1.1) / 1000) * 1000 // Round up to nearest thousand

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
          truncateTickAt: 0,
          format: (value) => `${value}-${(parseInt(value) + 1).toString().slice(2)}`,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Number of Students',
          legendOffset: -60,
          legendPosition: 'middle',
          truncateTickAt: 0,
          format: (value) => value.toLocaleString(),
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
            const allStudentsLastPoint = aggregatedAllStudents[aggregatedAllStudents.length - 1]
            const pupilPremiumLastPoint = aggregatedPupilPremium[aggregatedPupilPremium.length - 1]

            return (
              <g>
                {allStudentsLastPoint && (
                  <text
                    x={xScale('2024') + 15}
                    y={yScale(allStudentsLastPoint.total_active_pupils)}
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
                    y={yScale(pupilPremiumLastPoint.total_active_pupils)}
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
          // Determine if this is an "All Students" or "Pupil Premium" line
          const isAllStudents = point.seriesId === 'All Students'

          // Find the corresponding data based on year and student type
          const yearData = isAllStudents
            ? aggregatedAllStudents.find((d) => d.year === point.data.x)
            : aggregatedPupilPremium.find((d) => d.year === point.data.x)

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
                {point.seriesId} ({point.data.x})
              </div>
              <div style={{ marginBottom: '2px' }}>
                <strong>{(point.data.y as number).toLocaleString()}</strong> total students
              </div>
              {yearData && yearData.pupils_with_feedback !== undefined && (
                <div style={{ fontSize: '10px', color: '#6b7280' }}>
                  {yearData.pupils_with_feedback.toLocaleString()} received feedback (
                  {((yearData.pupils_with_feedback / yearData.total_active_pupils) * 100).toFixed(
                    1
                  )}
                  %)
                </div>
              )}
            </div>
          )
        }}
      />
    </div>
  )
}
