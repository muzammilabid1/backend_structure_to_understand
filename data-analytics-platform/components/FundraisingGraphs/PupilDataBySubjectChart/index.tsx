import { useState } from 'react'
import BarGraph from '@/components/Shared/Graphs/BarGraph'
import Select from '@/components/Shared/Input/Select'
import styles from '../index.module.scss'
import useSWR from 'swr'
import {
  PupilDataBySubjectResponse,
  PupilDataBySubjectBarMetric,
  PupilDataBySubjectBarDataPoint,
} from '@/pages/api/fundraising/pupil-data-by-subject'
import GraphLoading from '@/components/Shared/GraphLoading'
import GraphError from '@/components/Shared/GraphError'

const options = [
  {
    value: 'pupilsWatchedVideo' as PupilDataBySubjectBarMetric,
    label: 'Pupils who watched a video',
  },
  {
    value: 'pupilsClickedActivity' as PupilDataBySubjectBarMetric,
    label: 'Pupils who clicked on an activity',
  },
  {
    value: 'totalActivitiesEngaged' as PupilDataBySubjectBarMetric,
    label: 'Total number of activities engaged',
  },
]

const getSeriesForMetric = (metric: PupilDataBySubjectBarMetric) => {
  switch (metric) {
    case 'pupilsWatchedVideo':
    case 'pupilsClickedActivity':
      return [
        { dataKey: 'all', label: 'All pupils', color: '#9bc53d' },
        { dataKey: 'premium', label: 'Pupil premium', color: '#fb923c' },
      ]
    case 'totalActivitiesEngaged':
      return [
        { dataKey: 'all', label: 'Total activities by all pupils', color: '#9bc53d' },
        { dataKey: 'premium', label: 'Total activities by pupil premium', color: '#fb923c' },
      ]
    default:
      return []
  }
}

export default function PupilDataBySubjectChart() {
  const [selectedMetric, setSelectedMetric] =
    useState<PupilDataBySubjectBarMetric>('pupilsWatchedVideo')

  const { data, error, isLoading, mutate } = useSWR<PupilDataBySubjectResponse>(
    `/api/fundraising/pupil-data-by-subject?metric=${selectedMetric}`,
    {
      revalidateOnMount: true,
      dedupingInterval: 300000,
    }
  )

  const graphData = ((data?.data || []) as PupilDataBySubjectBarDataPoint[]).map((d) => ({
    name: d.subject,
    all: d.allCount ?? 0,
    premium: d.premiumCount ?? 0,
  }))

  return (
    <div className={styles.graphContainer}>
      <Select
        label="Select Metric"
        options={options}
        value={selectedMetric}
        onChange={(value) => setSelectedMetric(value as PupilDataBySubjectBarMetric)}
      />

      <div className={!isLoading ? styles.fadeIn : ''}>
        {isLoading && <GraphLoading variant="bar" />}

        {error && (
          <GraphError message="Failed to load pupil data by subject." onRetry={() => mutate()} />
        )}

        {!isLoading && !error && (
          <BarGraph data={graphData} series={getSeriesForMetric(selectedMetric)} />
        )}
      </div>
    </div>
  )
}
