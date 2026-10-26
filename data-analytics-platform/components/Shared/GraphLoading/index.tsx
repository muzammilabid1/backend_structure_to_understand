import styles from './index.module.scss'

interface GraphLoadingProps {
  variant?: 'line' | 'bar'
  height?: number
}

export default function GraphLoading({ variant = 'line', height = 320 }: GraphLoadingProps) {
  return (
    <div className={styles.container} style={{ height }}>
      <div className={styles.yAxis}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={styles.shimmer} style={{ width: 28, height: 10, borderRadius: 4 }} />
        ))}
      </div>
      <div className={styles.plotArea}>
        {variant === 'bar' ? (
          <div className={styles.bars}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.barGroup}>
                <div
                  className={styles.shimmer}
                  style={{ width: '60%', height: `${30 + Math.round(((i * 37) % 60))}%`, borderRadius: '4px 4px 0 0' }}
                />
                <div className={styles.shimmer} style={{ width: '100%', height: 10, borderRadius: 4, marginTop: 8 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.lines}>
            <svg width="100%" height="100%" viewBox="0 0 500 250" preserveAspectRatio="none">
              <path
                className={styles.shimmerLine}
                d="M0,200 C80,180 120,60 200,100 C280,140 320,40 400,80 C440,95 480,70 500,90"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                className={styles.shimmerLine2}
                d="M0,220 C80,210 120,140 200,160 C280,180 320,120 400,150 C440,160 480,140 500,155"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <div className={styles.xLabels}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.shimmer} style={{ width: 24, height: 10, borderRadius: 4 }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
