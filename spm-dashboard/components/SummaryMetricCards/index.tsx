import { Alert, CircularProgress } from '@mui/material'
import useSWR from 'swr'

import DashboardCard from '@/components/DashboardCard'
import {
  type SummaryMetricCard as SummaryMetricCardData,
  toSummaryMetricCards,
} from '@/lib/spm/spmSummaryMetrics'
import type { SpmSummary } from '@/types/spm'

import styles from './index.module.scss'

const SummaryMetricCard = ({ title, dataTest, metric }: SummaryMetricCardData) => (
  <DashboardCard title={title}>
    {metric ? (
      <p className={styles.metricValue} data-test={dataTest}>
        {metric.value}
        <span className={styles.metricCaption}>{metric.caption}</span>
      </p>
    ) : (
      <CircularProgress size={20} data-test="spm-summary-loading" />
    )}
  </DashboardCard>
)

const SummaryMetricCards = () => {
  const { data, error } = useSWR<SpmSummary>('/api/spm/summary')

  if (error) {
    return (
      <div className={styles.error}>
        <Alert severity="error">Error loading summary: {error.message}</Alert>
      </div>
    )
  }

  return (
    <div className={styles.metricGrid}>
      {toSummaryMetricCards(data).map((card) => (
        <SummaryMetricCard key={card.title} {...card} />
      ))}
    </div>
  )
}

export default SummaryMetricCards
