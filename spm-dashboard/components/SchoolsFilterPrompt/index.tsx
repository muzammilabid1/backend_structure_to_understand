import styles from './index.module.scss'

const SchoolsFilterPrompt = () => (
  <p className={styles.prompt} data-test="schools-filter-prompt">
    Choose an SPM above, or press “Show all schools”, to load the schools.
  </p>
)

export default SchoolsFilterPrompt
