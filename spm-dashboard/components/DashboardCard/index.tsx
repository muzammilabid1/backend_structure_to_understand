import type { ReactNode } from 'react'

import styles from './index.module.scss'

type CardAccent = 'warning'

const ACCENT_CLASSES: Record<CardAccent, string> = {
  warning: styles.warningAccent,
}

type DashboardCardProps = {
  title: string
  subtitle?: string
  action?: ReactNode
  accent?: CardAccent
  children?: ReactNode
}

const DashboardCard = ({ title, subtitle, action, accent, children }: DashboardCardProps) => (
  <div className={accent ? `${styles.card} ${ACCENT_CLASSES[accent]}` : styles.card}>
    <div className={styles.head}>
      <div>
        <h2 className={styles.title}>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {action}
    </div>
    {children && <div className={styles.body}>{children}</div>}
  </div>
)

export default DashboardCard
