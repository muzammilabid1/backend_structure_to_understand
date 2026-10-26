import { useState } from 'react'
import BarGraph from '@/components/Shared/Graphs/BarGraph'
import Select from '@/components/Shared/Input/Select'
import styles from '../index.module.scss'
import useSWR from 'swr'
import { RegionDataResponse, RegionMetric } from '@/pages/api/fundraising/data-by-region'
import GraphLoading from '@/components/Shared/GraphLoading'
import GraphError from '@/components/Shared/GraphError'

const options = [
  {
    value: 'activePupils' as RegionMetric,
    label: 'Active Pupils',
  },
  {
    value: 'pupilsWatchedVideo' as RegionMetric,
    label: 'Pupils Watched Video',
  },
  {
    value: 'pupilsOfferedTopic' as RegionMetric,
    label: 'Pupils Offered Topic',
  },
  {
    value: 'pupilsCompletedActivity' as RegionMetric,
    label: 'Pupils Completed Activity',
  },
  {
    value: 'pupilsClickedActivity' as RegionMetric,
    label: 'Pupils Clicked Activity',
  },
  {
    value: 'topicsCompleted' as RegionMetric,
    label: 'Topics Completed',
  },
  {
    value: 'readingSessions' as RegionMetric,
    label: 'Reading Sessions',
  },
]

const getSeriesForMetric = (metric: RegionMetric) => {
  switch (metric) {
    case 'activePupils' as RegionMetric:
    case 'pupilsWatchedVideo' as RegionMetric:
    case 'pupilsOfferedTopic' as RegionMetric:
    case 'pupilsCompletedActivity' as RegionMetric:
    case 'pupilsClickedActivity' as RegionMetric:
      return [
        { dataKey: 'all', label: 'All pupils', color: '#9bc53d' },
        { dataKey: 'premium', label: 'Pupil premium', color: '#fb923c' },
      ]
    case 'topicsCompleted' as RegionMetric:
      return [
        {
          dataKey: 'topicsCompletedByAll',
          label: 'Topics completed by all pupils',
          color: '#9bc53d',
        },
        {
          dataKey: 'topicsCompletedByPremium',
          label: 'Topics completed by pupil premium',
          color: '#fb923c',
        },
      ]
    case 'readingSessions' as RegionMetric:
      return [
        {
          dataKey: 'readingSessionsByAllPupils',
          label: 'Reading sessions by all pupils',
          color: '#9bc53d',
        },
        {
          dataKey: 'readingSessionsByPremiumPupils',
          label: 'Reading sessions by pupil premium',
          color: '#fb923c',
        },
      ]
    default:
      return []
  }
}

export default function RegionalChart() {
  const [selectedMetric, setSelectedMetric] = useState<RegionMetric>('activePupils')

  const { data, error, isLoading, mutate } = useSWR<RegionDataResponse>(
    `/api/fundraising/data-by-region?metric=${selectedMetric}`,
    {
      revalidateOnMount: true,
      dedupingInterval: 300000, // 5 minutes
    }
  )

  const graphData = (data?.data || []).map((d) => ({
    name: d?.region,
    all: d?.allPupils ?? 0,
    premium: d?.premiumPupils ?? 0,
    topicsCompletedByAll: d?.topicsCompletedByAllPupils ?? 0,
    topicsCompletedByPremium: d?.topicsCompletedByPremiumPupils ?? 0,
    readingSessionsByAllPupils: d?.readingSessionsByAllPupils ?? 0,
    readingSessionsByPremiumPupils: d?.readingSessionsByPremiumPupils ?? 0,
  }))

  return (
    <div className={styles.graphContainer}>
      <Select
        label="Select Metric"
        options={options}
        value={selectedMetric}
        onChange={(value) => setSelectedMetric(value as RegionMetric)}
      />

      <div className={!isLoading ? styles.fadeIn : ''}>
        {isLoading && <GraphLoading variant="bar" />}

        {error && <GraphError message="Failed to load region data." onRetry={() => mutate()} />}

        {!isLoading && !error && (
          <BarGraph data={graphData} series={getSeriesForMetric(selectedMetric)} />
        )}
      </div>
    </div>
  )
}
