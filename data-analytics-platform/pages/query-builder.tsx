import styles from '../styles/Home.module.scss'

export default function QueryBuilder() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>Query Builder</h1>
        <p>Build custom analytics queries and reports - Coming Soon</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2>SQL Query Builder</h2>
          <p>Visual interface for building complex queries</p>
        </div>

        <div className={styles.card}>
          <h2>Report Templates</h2>
          <p>Pre-built templates for common analytics needs</p>
        </div>

        <div className={styles.card}>
          <h2>Custom Charts</h2>
          <p>Create custom visualizations from your queries</p>
        </div>

        <div className={styles.card}>
          <h2>Export & Share</h2>
          <p>Export reports and share with stakeholders</p>
        </div>
      </div>
    </main>
  )
}
