import { TrendingUp } from 'lucide-react'
import styles from '../styles/Impact.module.scss'
import { useSubjects } from '@/hooks/useSubjects'
import PupilsTopicsCompletedMilestone from '@/components/ImpactGraphs/PupilsTopicsCompletedMilestone'
import CommonNote from '@/components/Shared/CommonNote'

export default function Impact() {
  const { subjects } = useSubjects()

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>
          <TrendingUp className={styles.headerIcon} />
          Impact Dashboard
        </h1>
      </div>

      <CommonNote />

      <div className={styles.chartsGrid}>
        <PupilsTopicsCompletedMilestone
          subjects={subjects}
          type="count"
          title="Number of pupils completing N topics"
          description="Number of pupils who have completed a specific number of topics"
        />

        <PupilsTopicsCompletedMilestone
          subjects={subjects}
          type="percentage"
          title="Percentage of pupils completing N topics"
          description="Percentage of pupils who have completed a specific number of topics"
        />
      </div>
    </main>
  )
}
