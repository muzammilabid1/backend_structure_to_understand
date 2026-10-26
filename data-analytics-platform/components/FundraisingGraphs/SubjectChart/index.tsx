import { useState } from 'react'
import BarGraph from '@/components/Shared/Graphs/BarGraph'
import Select from '@/components/Shared/Input/Select'
import styles from '../index.module.scss'
import useSWR from 'swr'
import { SubjectDataResponse, SubjectMetric } from '@/pages/api/fundraising/data-by-subject'
import GraphLoading from '@/components/Shared/GraphLoading'
import GraphError from '@/components/Shared/GraphError'

const options = [
  {
    value: 'partnerSchools' as SubjectMetric,
    label: 'Total partner schools',
  },
  {
    value: 'schoolsWithReleasedTopic' as SubjectMetric,
    label: 'Partner schools released 1+ topic',
  },
  {
    value: 'classesRegistered' as SubjectMetric,
    label: 'Classes registered',
  },
  {
    value: 'teachersAndLeaders' as SubjectMetric,
    label: 'Teachers & school leaders registered',
  },
  {
    value: 'pupilsAccessedSite' as SubjectMetric,
    label: 'Pupil profiles with an active parent',
  },
  {
    value: 'parentsRegistered' as SubjectMetric,
    label: 'Parents registered',
  },
  {
    value: 'schoolsUsingOneProgramme' as SubjectMetric,
    label: 'Schools using only 1 programme',
  },
]

const SINGLE_SERIES_LABELS: Record<Exclude<SubjectMetric, 'teachersAndLeaders'>, string> = {
  partnerSchools: 'Partner schools',
  schoolsWithReleasedTopic: 'Partner schools',
  classesRegistered: 'Classes',
  pupilsAccessedSite: 'Pupils',
  parentsRegistered: 'Parents',
  schoolsUsingOneProgramme: 'Schools',
}

const TEACHERS_AND_LEADERS_SERIES = [
  { dataKey: 'teacherCount', label: 'Teachers', color: '#9bc53d' },
  { dataKey: 'leaderCount', label: 'School leaders', color: '#FF6B35' },
]

export default function SubjectChart() {
  const [selectedMetric, setSelectedMetric] = useState<SubjectMetric>('partnerSchools')

  const { data, error, isLoading, mutate } = useSWR<SubjectDataResponse>(
    `/api/fundraising/data-by-subject?metric=${selectedMetric}`,
    {
      revalidateOnMount: true,
      dedupingInterval: 300000,
    }
  )

  const series =
    selectedMetric === 'teachersAndLeaders'
      ? TEACHERS_AND_LEADERS_SERIES
      : [
          {
            dataKey: 'count',
            label: SINGLE_SERIES_LABELS[selectedMetric as Exclude<SubjectMetric, 'teachersAndLeaders'>],
            color: '#9bc53d',
          },
        ]

  const graphData = (data?.data || []).map((d) => ({
    name: d.subject,
    count: d.count ?? 0,
    teacherCount: d.teacherCount ?? 0,
    leaderCount: d.leaderCount ?? 0,
  }))

  return (
    <div className={styles.graphContainer}>
      <Select
        label="Select Metric"
        options={options}
        value={selectedMetric}
        onChange={(value) => setSelectedMetric(value as SubjectMetric)}
      />

      <div className={!isLoading ? styles.fadeIn : ''}>
        {isLoading && <GraphLoading variant="bar" />}

        {error && <GraphError message="Failed to load subject data." onRetry={() => mutate()} />}

        {!isLoading && !error && <BarGraph data={graphData} series={series} />}
      </div>
    </div>
  )
}
