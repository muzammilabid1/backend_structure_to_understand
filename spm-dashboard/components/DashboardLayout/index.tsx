import type { ReactNode } from 'react'

import styles from './index.module.scss'

const DashboardLayout = ({ children }: { children: ReactNode }) => (
  <div className={styles.layout}>
    <div className={styles.content}>{children}</div>
  </div>
)

export default DashboardLayout
