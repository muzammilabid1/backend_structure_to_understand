import { useState } from 'react'
import BarGraph from '@/components/Shared/Graphs/BarGraph'
import Select from '@/components/Shared/Input/Select'
import useSWR from 'swr'
import styles from '../index.module.scss'
import {
  AverageEngagementResponse,
  AverageEngagementMetric,
} from '@/pages/api/fundraising/average-engagement'
import GraphLoading from '@/components/Shared/GraphLoading'
import GraphError from '@/components/Shared/GraphError'

const metricOptions = [
  { value: 'readingSessions' as AverageEngagementMetric, label: 'Avg Reading Sessions per Child' },
  { value: 'topicsCompleted' as AverageEngagementMetric, label: 'Avg Topics Completed per Child' },
  {
    value: 'activitiesCompleted' as AverageEngagementMetric,
    label: 'Avg Activities Completed per Child',
  },
]

const SERIES = [
  { dataKey: 'all', label: 'All Pupils', color: '#9bc53d' },
  { dataKey: 'premium', label: 'Pupil Premium', color: '#fb923c' },
]

export default function AverageEngagementChart() {
  const [selectedMetric, setSelectedMetric] = useState<AverageEngagementMetric>('readingSessions')

  const { data, error, isLoading, mutate } = useSWR<AverageEngagementResponse>(
    `/api/fundraising/average-engagement?metric=${selectedMetric}`,
    {
      revalidateOnMount: true,
      dedupingInterval: 300000, // 5 minutes
    }
  )

  const graphData = (data?.data ?? []).map((d) => ({
    name: d.subject,
    all: Number(d.allAverage ?? 0),
    premium: Number(d.premiumAverage ?? 0),
  }))

  return (
    <div className={styles.graphContainer}>
      <Select
        label="Select Metric"
        options={metricOptions}
        value={selectedMetric}
        onChange={(value) => setSelectedMetric(value as AverageEngagementMetric)}
      />

      <div className={!isLoading ? styles.fadeIn : ''}>
        {isLoading && <GraphLoading variant="bar" />}

        {error && (
          <GraphError message="Failed to load average engagement data." onRetry={() => mutate()} />
        )}

        {!isLoading && !error && (
          <BarGraph data={graphData} series={SERIES} yAxisLabel="Average per Child" />
        )}
      </div>
    </div>
  )
}
