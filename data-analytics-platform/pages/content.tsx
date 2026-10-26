import styles from '../styles/Home.module.scss'

export default function Content() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>Content Dashboard</h1>
        <p>Content analytics and performance metrics - Coming Soon</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2>Activity Analytics</h2>
          <p>Track activity completion rates and engagement</p>
        </div>

        <div className={styles.card}>
          <h2>Topic Performance</h2>
          <p>Monitor topic usage and effectiveness metrics</p>
        </div>

        <div className={styles.card}>
          <h2>Content Usage</h2>
          <p>Analyze content consumption patterns</p>
        </div>

        <div className={styles.card}>
          <h2>Popular Content</h2>
          <p>Identify most engaging content pieces</p>
        </div>
      </div>
    </main>
  )
}
