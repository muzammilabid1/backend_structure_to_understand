import styles from './index.module.scss'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  label?: string
  className?: string
}

export default function Select({ options, value, onChange, label, className }: SelectProps) {
  return (
    <div className={`${styles.selectWrapper} ${className || ''}`}>
      {label && <label className={styles.selectLabel}>{label}</label>}
      <div className={styles.selectContainer}>
        <select className={styles.select} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className={styles.selectArrow} />
      </div>
    </div>
  )
}
