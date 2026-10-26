import { ResponsiveLine } from '@nivo/line'
import { AverageFeedbacksResponse } from '../../pages/api/impact/average-feedbacks'
import { SkeletonChart } from '../Shared/SkeletonLoader'

interface AverageFeedbacksChartProps {
  data: AverageFeedbacksResponse | undefined
  isLoading?: boolean
}

export default function AverageFeedbacksChart({ data, isLoading }: AverageFeedbacksChartProps) {
  if (isLoading || !data) {
    return <SkeletonChart />
  }

  // Handle both wrapped and unwrapped data formats
  const actualData = (data as any).data || data
  
  if (!actualData || !actualData.all_students || !actualData.pupil_premium) {
    return <SkeletonChart />
  }

  // Aggregate duplicate years by averaging values
  const aggregateByYear = (data: any[]) => {
    const yearMap = new Map()
    data.forEach(item => {
      const year = item.year.toString()
      if (yearMap.has(year)) {
        const existing = yearMap.get(year)
        const count = existing.count + 1
        yearMap.set(year, {
          ...existing,
          average_per_all_students: (existing.average_per_all_students * existing.count + item.average_per_all_students) / count,
          total_feedbacks: existing.total_feedbacks + item.total_feedbacks,
          total_active_pupils: existing.total_active_pupils + item.total_active_pupils,
          count
        })
      } else {
        yearMap.set(year, { ...item, year, count: 1 })
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
      data: aggregatedPupilPremium.map((item: any) => ({
        x: item.year,
        y: item.average_per_all_students
      }))
    },
    {
      id: 'All Students',
      color: '#ea580c',
      data: aggregatedAllStudents.map((item: any) => ({
        x: item.year,
        y: item.average_per_all_students
      }))
    }
  ]

  // Calculate max value for nice y-axis scaling
  const maxValue = Math.max(
    ...aggregatedAllStudents.map((item: any) => item.average_per_all_students),
    ...aggregatedPupilPremium.map((item: any) => item.average_per_all_students)
  )
  const yMax = Math.ceil(maxValue * 1.2) // Add 20% padding

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
          truncateTickAt: 0
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Average Feedbacks per Student',
          legendOffset: -60,
          legendPosition: 'middle',
          truncateTickAt: 0,
          format: (value) => value.toFixed(1)
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
            const allStudentsLastPoint = actualData.all_students[actualData.all_students.length - 1]
            const pupilPremiumLastPoint = actualData.pupil_premium[actualData.pupil_premium.length - 1]
            
            return (
              <g>
                {allStudentsLastPoint && (
                  <text
                    x={(xScale as any)('2024') + 15}
                    y={(yScale as any)(allStudentsLastPoint.average_per_all_students)}
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
                    x={(xScale as any)('2024') + 15}
                    y={(yScale as any)(pupilPremiumLastPoint.average_per_all_students)}
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
                maxWidth: '220px',
                transform: 'translate(-50%, 15px)',
                position: 'relative',
                zIndex: 9999
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '12px' }}>
                {point.seriesId} ({point.data.x})
              </div>
                             <div style={{ marginBottom: '2px' }}>
                 <strong>{(point.data.y as number).toFixed(2)}</strong> feedbacks per student
               </div>
               {yearData && yearData.total_feedbacks !== undefined && yearData.total_active_pupils !== undefined && (
                 <>
                   <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>
                     {yearData.total_feedbacks.toLocaleString()} total feedbacks / {yearData.total_active_pupils.toLocaleString()} students
                   </div>
                   {yearData.average_per_engaged_student !== undefined && yearData.pupils_with_feedback !== undefined && (
                     <div style={{ fontSize: '10px', color: '#6b7280' }}>
                       {yearData.average_per_engaged_student.toFixed(2)} feedbacks per {yearData.pupils_with_feedback.toLocaleString()} engaged students
                     </div>
                   )}
                 </>
               )}
            </div>
          )
        }}
      />
    </div>
  )
} 