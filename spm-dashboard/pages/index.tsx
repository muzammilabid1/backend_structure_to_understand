import { Button } from '@mui/material'

import styles from '@/styles/Home.module.scss'

const PLATFORM_BASE_URL = process.env.HOSTED_URL ?? '#'

export default function Home() {
  return (
    <div className={styles.home}>
      <h1 className={styles.title}>SPM Dashboard</h1>
      <p className={styles.description}>
        Sign in on the Learning with Parents platform as an administrator to view the dashboard.
      </p>
      <div className={styles.actions}>
        <Button variant="contained" href={PLATFORM_BASE_URL}>
          Sign in to the Dashboard
        </Button>
      </div>
    </div>
  )
}
