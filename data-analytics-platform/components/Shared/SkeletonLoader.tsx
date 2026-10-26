import styles from './SkeletonLoader.module.scss'

interface SkeletonLoaderProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
}

export default function SkeletonLoader({ 
  width = '100%', 
  height = '20px', 
  borderRadius = '4px',
  className = ''
}: SkeletonLoaderProps) {
  return (
    <div 
      className={`${styles.skeleton} ${className}`}
      style={{
        width,
        height,
        borderRadius
      }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <SkeletonLoader height="20px" width="60%" className={styles.title} />
      <SkeletonLoader height="32px" width="40%" className={styles.metric} />
      <SkeletonLoader height="16px" width="80%" className={styles.description} />
    </div>
  )
}

export function SkeletonChart() {
  return (
    <div className={styles.skeletonChart}>
      <div className={styles.chartHeader}>
        <SkeletonLoader height="24px" width="50%" className={styles.chartTitle} />
        <SkeletonLoader height="16px" width="70%" className={styles.chartSubtitle} />
      </div>
      <div className={styles.chartArea}>
        {/* Y-axis labels */}
        <div className={styles.yAxis}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonLoader key={i} height="12px" width="30px" />
          ))}
        </div>
        {/* Chart bars/lines */}
        <div className={styles.chartContent}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.chartBar}>
              <SkeletonLoader 
                height={`${Math.random() * 60 + 40}%`} 
                width="60%" 
                borderRadius="2px"
              />
              <SkeletonLoader height="12px" width="100%" className={styles.xAxisLabel} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 