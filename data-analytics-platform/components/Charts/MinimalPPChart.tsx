import { ResponsiveLine } from '@nivo/line'
import { SkeletonChart } from '../Shared/SkeletonLoader'

interface MinimalPPChartProps {
  data: any[] | undefined
  isLoading?: boolean
}

export default function MinimalPPChart({ data, isLoading }: MinimalPPChartProps) {
  if (isLoading || !data || !Array.isArray(data) || data.length === 0) {
    return <SkeletonChart />
  }

  // Minimal data format
  const nivoData = [
    {
      id: 'line',
      data: data.map(item => ({
        x: item.year,
        y: item.pp_percentage
      }))
    }
  ]

  console.log('Minimal Nivo Data:', nivoData)

  return (
    <div style={{ height: 400 }}>
      <ResponsiveLine
        data={nivoData}
        margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
      />
    </div>
  )
}
