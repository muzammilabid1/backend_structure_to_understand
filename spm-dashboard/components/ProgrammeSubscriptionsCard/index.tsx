import { Alert, CircularProgress } from '@mui/material'
import useSWR from 'swr'

import DashboardCard from '@/components/DashboardCard'
import {
  type ProgrammeSubscriptionRow,
  toProgrammeSubscriptionRows,
  toProgrammeSubscriptionsSubtitle,
} from '@/lib/spm/programmeSubscriptions'
import type { SpmSummary } from '@/types/spm'

import styles from './index.module.scss'

type ProgrammeMeasureBarProps = {
  caption: string
  ariaLabel: string
  count: number
  schoolCount: number
  fillPercent: number
  colour: string
  dataTest: string
  fillClassName: string
  valueClassName: string
}

const ProgrammeMeasureBar = ({
  caption,
  ariaLabel,
  count,
  schoolCount,
  fillPercent,
  colour,
  dataTest,
  fillClassName,
  valueClassName,
}: ProgrammeMeasureBarProps) => (
  <div className={styles.measure}>
    <span className={styles.caption}>{caption}</span>
    <div
      className={styles.track}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={count}
      aria-valuemin={0}
      aria-valuemax={schoolCount}
    >
      <div className={fillClassName} style={{ width: `${fillPercent}%`, background: colour }} />
    </div>
    <span className={valueClassName} data-test={dataTest}>
      {count}
    </span>
  </div>
)

const ProgrammeRow = ({ row }: { row: ProgrammeSubscriptionRow }) => (
  <li>
    <span className={styles.label}>{row.label}</span>

    <div className={styles.measures}>
      <ProgrammeMeasureBar
        caption="Subscribed"
        ariaLabel={`${row.label} schools subscribed`}
        count={row.subscribedCount}
        schoolCount={row.schoolCount}
        fillPercent={row.subscribedFillPercent}
        colour={row.colour}
        dataTest={`spm-programme-subscription-${row.key}`}
        fillClassName={styles.subscribedFill}
        valueClassName={styles.subscribedValue}
      />
      <ProgrammeMeasureBar
        caption="Launched"
        ariaLabel={`${row.label} schools launched`}
        count={row.launchedCount}
        schoolCount={row.schoolCount}
        fillPercent={row.launchedFillPercent}
        colour={row.colour}
        dataTest={`spm-programme-launched-${row.key}`}
        fillClassName={styles.launchedFill}
        valueClassName={styles.launchedValue}
      />
    </div>
  </li>
)

const ProgrammeSubscriptionsCard = () => {
  const { data, error } = useSWR<SpmSummary>('/api/spm/summary')

  return (
    <DashboardCard
      title="Programme subscriptions"
      subtitle={toProgrammeSubscriptionsSubtitle(data)}
    >
      {error && <Alert severity="error">Error loading summary: {error.message}</Alert>}

      {!error && !data && (
        <div className={styles.loading}>
          <CircularProgress size={20} data-test="spm-programme-subscriptions-loading" />
        </div>
      )}

      {!error && data && (
        <ul className={styles.rows}>
          {toProgrammeSubscriptionRows(data).map((row) => (
            <ProgrammeRow key={row.key} row={row} />
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}

export default ProgrammeSubscriptionsCard
