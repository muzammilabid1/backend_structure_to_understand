import { useState } from 'react'
import LineGraph from '@/components/Shared/Graphs/LineGraph'
import Select from '@/components/Shared/Input/Select'
import ChipFilter from '@/components/Shared/ChipFilter'
import useSWR from 'swr'
import styles from '../index.module.scss'
import {
  PupilDataBySubjectResponse,
  PupilDataBySubjectMilestoneMetric,
  PupilDataBySubjectMilestoneDataPoint,
} from '@/pages/api/fundraising/pupil-data-by-subject'
import { useSubjects } from '@/hooks/useSubjects'
import GraphLoading from '@/components/Shared/GraphLoading'
import GraphError from '@/components/Shared/GraphError'

const metricOptions = [
  {
    value: 'activitiesCompleted' as PupilDataBySubjectMilestoneMetric,
    label: 'Pupils completed activities',
  },
  {
    value: 'topicsCompleted' as PupilDataBySubjectMilestoneMetric,
    label: 'Pupils completed topics',
  },
  {
    value: 'readingSessions' as PupilDataBySubjectMilestoneMetric,
    label: 'Pupils completed reading sessions',
  },
]

const xAxisLabels: Record<PupilDataBySubjectMilestoneMetric, string> = {
  activitiesCompleted: 'Activities completed',
  topicsCompleted: 'Topics completed',
  readingSessions: 'Reading sessions',
}

const SERIES = [
  { dataKey: 'all', label: 'All pupils', color: '#9bc53d' },
  { dataKey: 'premium', label: 'Pupil premium', color: '#fb923c' },
]

export default function HabitFormingMilestonesChart() {
  const [selectedMetric, setSelectedMetric] =
    useState<PupilDataBySubjectMilestoneMetric>('activitiesCompleted')
  const [subjectId, setSubjectId] = useState<string>('all')

  const { subjects } = useSubjects()

  const isReadingSessions = selectedMetric === 'readingSessions'

  const apiUrl =
    !isReadingSessions && subjectId !== 'all'
      ? `/api/fundraising/pupil-data-by-subject?metric=${selectedMetric}&subjectId=${subjectId}`
      : `/api/fundraising/pupil-data-by-subject?metric=${selectedMetric}`

  const { data, error, isLoading, mutate } = useSWR<PupilDataBySubjectResponse>(apiUrl, {
    revalidateOnMount: true,
    dedupingInterval: 300000,
  })

  const items = (data?.data as PupilDataBySubjectMilestoneDataPoint[]) ?? []

  const graphData = items.map((d) => ({
    name: String(d.threshold),
    all: Number(d.allCount ?? 0),
    premium: Number(d.premiumCount ?? 0),
  }))

  const subjectOptions = [
    { label: 'All', value: 'all' },
    ...(subjects || []).map((s) => ({ label: s.name, value: s.id })),
  ]

  return (
    <div className={styles.graphContainer}>
      <Select
        label="Select Metric"
        options={metricOptions}
        value={selectedMetric}
        onChange={(value) => {
          setSelectedMetric(value as PupilDataBySubjectMilestoneMetric)
          setSubjectId('all')
        }}
      />

      {!isReadingSessions && (
        <ChipFilter
          options={subjectOptions}
          activeValues={[subjectId]}
          onChange={(values) => setSubjectId(values[0] ?? 'all')}
        />
      )}

      <div className={!isLoading ? styles.fadeIn : ''}>
        {isLoading && <GraphLoading variant="line" />}

        {error && <GraphError message="Failed to load milestones data." onRetry={() => mutate()} />}

        {!isLoading && !error && (
          <LineGraph
            data={graphData}
            series={SERIES}
            xAxisLabel={xAxisLabels[selectedMetric]}
            yAxisLabel="Number of pupils"
          />
        )}
      </div>
    </div>
  )
}
