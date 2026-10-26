import styles from '../../../styles/Impact.module.scss'
import useSWR from 'swr'
import ChipFilter from '@/components/Shared/ChipFilter'
import LineGraph from '@/components/Shared/Graphs/LineGraph'
import GraphError from '@/components/Shared/GraphError'
import GraphLoading from '@/components/Shared/GraphLoading'
import { IStaticLwpSubject } from '@/types/entities/IStaticLwpSubject'
import { useState } from 'react'
import { PupilsTopicsCompletedMilestonesResponse } from '@/pages/api/impact/pupil-fact-topics-completed-milestones'

interface PupilsTopicsCompletedMilestoneProps {
  subjects: Array<IStaticLwpSubject>
  type: 'percentage' | 'count'
  title: string
  description: string
}

const getSeriesByType = (
  type: 'percentage' | 'count',
  data: PupilsTopicsCompletedMilestonesResponse
) => {
  if (type === 'percentage') {
    return [
      {
        dataKey: 'percentageOfPupils',
        label: 'All pupils',
        color: '#9bc53d',
        dashed: (data?.allPupilsCount ?? 0) <= 4,
      },
      {
        dataKey: 'percentageOfPremiumPupils',
        label: 'Pupil premium',
        color: '#fb923c',
        dashed: (data?.premiumPupilCount ?? 0) <= 4,
      },
    ]
  }

  return [
    {
      dataKey: 'numberOfPupils',
      label: 'All pupils',
      color: '#9bc53d',
      dashed: (data?.allPupilsCount ?? 0) <= 4,
    },
    {
      dataKey: 'numberOfPremiumPupils',
      label: 'Pupil premium',
      color: '#fb923c',
      dashed: (data?.premiumPupilCount ?? 0) <= 4,
    },
  ]
}

const PupilsTopicsCompletedMilestone = ({
  subjects,
  type,
  title,
  description,
}: PupilsTopicsCompletedMilestoneProps) => {
  const [subjectId, setSubjectId] = useState<string>('all')

  const apiUrl =
    !subjectId || subjectId === 'all'
      ? `/api/impact/pupil-fact-topics-completed-milestones?type=${type}`
      : `/api/impact/pupil-fact-topics-completed-milestones?subjectId=${subjectId}&type=${type}`

  const { data, error, isLoading, mutate } = useSWR<PupilsTopicsCompletedMilestonesResponse>(
    apiUrl,
    {
      revalidateOnMount: true,
      dedupingInterval: 300000, // 5 minutes
    }
  )

  const subjectsOptions = [
    {
      label: 'All',
      value: 'all',
    },
    ...(subjects || []).map((subject) => ({
      label: subject.name,
      value: subject.id,
    })),
  ]

  return (
    <div className={styles.chartSection}>
      <div className={styles.chartHeader}>
        <div className={styles.chartHeaderContent}>
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>
      </div>

      <div className={styles.chartContainer}>
        {!error && (
          <ChipFilter
            options={subjectsOptions}
            activeValues={[subjectId]}
            onChange={(value) => {
              setSubjectId(value[0])
            }}
          />
        )}

        <div className={!isLoading ? styles.fadeIn : ''}>
          {isLoading && <GraphLoading variant="line" />}

          {error && (
            <GraphError message="Failed to load topics completed data." onRetry={() => mutate()} />
          )}

          {!isLoading && !error && (
            <LineGraph
              data={data?.graphData || []}
              series={data ? getSeriesByType(type, data) : []}
              percentageOnYAxis={type === 'percentage'}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default PupilsTopicsCompletedMilestone
