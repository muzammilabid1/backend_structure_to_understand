import styles from './index.module.scss'

interface GraphErrorProps {
  message?: string
  onRetry?: () => void
}

export default function GraphError({
  message = 'Something went wrong loading this chart.',
  onRetry,
}: GraphErrorProps) {
  return (
    <div className={styles.container}>
      <span className={styles.icon}>⚠️</span>
      <p className={styles.title}>Failed to load</p>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button type="button" className={styles.retryButton} onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}
