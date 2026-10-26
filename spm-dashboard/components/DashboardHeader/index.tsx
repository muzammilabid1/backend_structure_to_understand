import { getInitials } from '@/lib/helpers/getInitials'

import styles from './index.module.scss'

type DashboardHeaderProps = {
  title: string
  subtitle?: string
  userName?: string
}

const DashboardHeader = ({ title, subtitle, userName }: DashboardHeaderProps) => (
  <div className={styles.header}>
    <div>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
    {userName && <div className={styles.avatar}>{getInitials(userName)}</div>}
  </div>
)

export default DashboardHeader
