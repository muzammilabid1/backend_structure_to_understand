import styles from './index.module.scss'

export interface ChipFilterOption {
  label: string
  value: string
}

interface ChipFilterProps {
  options: ChipFilterOption[]
  activeValues: string[]
  onChange: (values: string[]) => void
}

export default function ChipFilter({ options, activeValues, onChange }: ChipFilterProps) {
  const handleClick = (value: string) => {
    if (activeValues.includes(value)) {
      onChange(activeValues.filter((v) => v !== value))
    } else {
      onChange([value, ...activeValues])
    }
  }

  return (
    <div className={styles.chipFilterContainer}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`${styles.chip} ${activeValues.includes(option.value) ? styles.active : ''}`}
          onClick={() => handleClick(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
