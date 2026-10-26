import styles from './index.module.scss'

interface CommonNoteProps {
  message?: string
}

const CommonNote = ({
  message = 'Currently we are showing data for the current year only.',
}: CommonNoteProps) => {
  return (
    <p className={styles.infoText}>
      <strong>Note:</strong> {message}
    </p>
  )
}

export default CommonNote
