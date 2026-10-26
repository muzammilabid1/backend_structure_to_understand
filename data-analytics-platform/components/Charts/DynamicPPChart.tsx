import { useState, useEffect } from 'react'
import { SkeletonChart } from '../Shared/SkeletonLoader'

interface DynamicPPChartProps {
  data: any[] | undefined
  isLoading?: boolean
}

export default function DynamicPPChart({ data, isLoading }: DynamicPPChartProps) {
  const [NivoLine, setNivoLine] = useState<any>(null)

  useEffect(() => {
    // Dynamic import to avoid SSR issues
    const loadNivo = async () => {
      try {
        const { ResponsiveLine } = await import('@nivo/line')
        setNivoLine(() => ResponsiveLine)
      } catch (error) {
        console.error('Error loading Nivo:', error)
      }
    }
    
    loadNivo()
  }, [])

  if (isLoading || !data || !Array.isArray(data) || data.length === 0 || !NivoLine) {
    return <SkeletonChart />
  }

  // Transform data to Nivo format
  const nivoData = [
    {
      id: 'Pupil Premium %',
      data: data.map(item => ({
        x: item.year,
        y: item.pp_percentage
      }))
    }
  ]

  console.log('Dynamic Nivo Data:', nivoData)

  return (
    <div style={{ height: 400 }}>
      <NivoLine
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
