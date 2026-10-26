import { useState } from 'react'
import BarGraph from '@/components/Shared/Graphs/BarGraph'
import ChipFilter from '@/components/Shared/ChipFilter'
import useSWR from 'swr'
import styles from '../index.module.scss'
import { TopicsByYearGroupResponse } from '@/pages/api/fundraising/topics-by-year-group'
import { useSubjects } from '@/hooks/useSubjects'
import GraphLoading from '@/components/Shared/GraphLoading'
import GraphError from '@/components/Shared/GraphError'

const SERIES = [
  { dataKey: 'all', label: 'Topics completed (all pupils)', color: '#9bc53d' },
  { dataKey: 'premium', label: 'Topics completed (pupil premium)', color: '#fb923c' },
]

export default function TopicsByYearGroupChart() {
  const [subjectId, setSubjectId] = useState<string>('all')

  const { subjects } = useSubjects()

  const apiUrl =
    subjectId !== 'all'
      ? `/api/fundraising/topics-by-year-group?subjectId=${subjectId}`
      : `/api/fundraising/topics-by-year-group`

  const { data, error, isLoading, mutate } = useSWR<TopicsByYearGroupResponse>(apiUrl, {
    revalidateOnMount: true,
    dedupingInterval: 300000,
  })

  const graphData = (data?.data ?? []).map((d) => ({
    name: d.classYearGroup,
    all: Number(d.topicsCompletedByAllPupils ?? 0),
    premium: Number(d.topicsCompletedByPupilPremium ?? 0),
  }))

  const subjectOptions = [
    { label: 'All', value: 'all' },
    ...(subjects || []).map((s) => ({ label: s.name, value: String(s.id) })),
  ]

  return (
    <div className={styles.graphContainer}>
      <ChipFilter
        options={subjectOptions}
        activeValues={[subjectId]}
        onChange={(values) => setSubjectId(values[0] ?? 'all')}
      />

      <div className={!isLoading ? styles.fadeIn : ''}>
        {isLoading && <GraphLoading variant="bar" />}

        {error && (
          <GraphError message="Failed to load topics by year group." onRetry={() => mutate()} />
        )}

        {!isLoading && !error && (
          <BarGraph data={graphData} series={SERIES} yAxisLabel="Topics completed" />
        )}
      </div>
    </div>
  )
}
