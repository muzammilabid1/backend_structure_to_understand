import { ResponsiveLine } from '@nivo/line'
import { SkeletonChart } from '../Shared/SkeletonLoader'

interface CleanPPChartProps {
  data: any[] | undefined
  isLoading?: boolean
}

export default function CleanPPChart({ data, isLoading }: CleanPPChartProps) {
  if (isLoading || !data || !Array.isArray(data) || data.length === 0) {
    return <SkeletonChart />
  }

  // Transform data to Nivo format - exactly like the documentation
  const nivoData = [
    {
      id: 'Pupil Premium %',
      data: data.map(item => ({
        x: item.year,
        y: item.pp_percentage
      }))
    }
  ]

  console.log('Nivo Data:', nivoData)

  return (
    <div style={{ height: 400 }}>
      <ResponsiveLine
        data={nivoData}
        margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
        yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
        axisBottom={{ legend: 'Academic Year', legendOffset: 36 }}
        axisLeft={{ legend: 'Percentage (%)', legendOffset: -40 }}
        pointSize={10}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'seriesColor' }}
        pointLabelYOffset={-12}
        enableTouchCrosshair={true}
        useMesh={true}
        legends={[
          {
            anchor: 'bottom-right',
            direction: 'column',
            translateX: 100,
            itemWidth: 80,
            itemHeight: 22,
            symbolShape: 'circle'
          }
        ]}
      />
    </div>
  )
}
