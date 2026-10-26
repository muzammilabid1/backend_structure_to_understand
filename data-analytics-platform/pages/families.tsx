import { useState, useRef } from 'react'
import { Users } from 'lucide-react'
import RechartsLineChart from '../components/Charts/RechartsLineChart'
import ChartExportMenu from '../components/Shared/ChartExportMenu'
import { useSchools } from '../hooks/useImpactData'
import { useTotalFeedback, usePupilsWithParentFeedback, usePPPercentageNew } from '../hooks/useFamiliesData'
import DualLineChart from '../components/Charts/DualLineChart'
import styles from '../styles/Impact.module.scss'

export default function Families() {
  // School selection state - empty string means "all schools"
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('')

  // Chart refs for image capture
  const ppPercentageChartRef = useRef<HTMLDivElement>(null)
  const pupilsWithFeedbackChartRef = useRef<HTMLDivElement>(null)
  const totalFeedbackChartRef = useRef<HTMLDivElement>(null)

  // Fetch schools list for dropdown
  const { schools, schoolsLoading, schoolsError } = useSchools()


  // Fetch data using the working Families APIs
  const { 
    data: totalFeedbackData, 
    error: totalFeedbackError, 
    isLoading: totalFeedbackLoading,
    refresh: refreshTotalFeedback
  } = useTotalFeedback({
    selectedSchoolId: selectedSchoolId || undefined
  })

  const { 
    data: pupilsWithFeedbackData, 
    error: pupilsWithFeedbackError, 
    isLoading: pupilsWithFeedbackLoading,
    refresh: refreshPupilsWithFeedback
  } = usePupilsWithParentFeedback({
    selectedSchoolId: selectedSchoolId || undefined
  })

  const { 
    data: ppPercentageNewData, 
    error: ppPercentageNewError, 
    isLoading: ppPercentageNewLoading,
    refresh: refreshPPPercentageNew
  } = usePPPercentageNew({
    selectedSchoolId: selectedSchoolId || undefined
  })


  return (
        <main className={styles.main}>
          <div className={styles.header}>
            <h1>
              <Users className={styles.headerIcon} />
              Families Dashboard
            </h1>
          </div>

          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label htmlFor="schoolSelect">School:</label>
              <select
                id="schoolSelect"
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className={styles.select}
                disabled={schoolsLoading}
              >
                <option value="">All Schools</option>
                {schools.map(school => (
                  <option key={school.id} value={school.id}>
                    {school.schoolName}
                  </option>
                ))}
              </select>
              {schoolsError && (
                <p className={styles.errorText}>Failed to load schools</p>
              )}
            </div>
          </div>

          {(ppPercentageNewError || pupilsWithFeedbackError || totalFeedbackError) && (
            <div className={styles.error}>
              <p>Error: {ppPercentageNewError?.message || pupilsWithFeedbackError?.message || totalFeedbackError?.message || 'An error occurred'}</p>
              <button onClick={() => {
                refreshPPPercentageNew()
                refreshPupilsWithFeedback()
                refreshTotalFeedback()
              }} className={styles.retryButton}>
                Retry
              </button>
            </div>
          )}


          <div className={styles.chartsGrid}>
            <div className={styles.chartSection}>
              <div className={styles.chartHeader}>
                <div className={styles.chartHeaderContent}>
                  <div>
                    <h2>Pupil Premium Percentage Among Active Families</h2>
                    <p>Percentage of pupils with parent feedback who are Pupil Premium by academic year</p>
                  </div>
                  <ChartExportMenu 
                    data={ppPercentageNewData} 
                    filename="pupil-premium-percentage-families"
                    chartRef={ppPercentageChartRef}
                  />
                </div>
              </div>
              <div className={`${styles.chartContainer} ${!ppPercentageNewLoading ? styles.fadeIn : ''}`} ref={ppPercentageChartRef}>
                <RechartsLineChart data={ppPercentageNewData} isLoading={ppPercentageNewLoading} />
              </div>
            </div>

            <div className={styles.chartSection}>
              <div className={styles.chartHeader}>
                <div className={styles.chartHeaderContent}>
                  <div>
                    <h2>Active Pupils (With Parent Feedback)</h2>
                    <p>Number of pupils who have received at least 1 parent comment by academic year</p>
                  </div>
                  <ChartExportMenu 
                    data={pupilsWithFeedbackData} 
                    filename="pupils-active-parent-feedback"
                    chartRef={pupilsWithFeedbackChartRef}
                  />
                </div>
              </div>
              <div
                className={`${styles.chartContainer} ${!pupilsWithFeedbackLoading ? styles.fadeIn : ''}`}
                ref={pupilsWithFeedbackChartRef}
              >
                <DualLineChart 
                  data={pupilsWithFeedbackData} 
                  isLoading={pupilsWithFeedbackLoading}
                  title="Active Pupils (Parent Feedback)"
                  allLineKey="all_active_pupils"
                  ppLineKey="pp_active_pupils"
                  allLineName="All Students"
                  ppLineName="Pupil Premium"
                  yAxisLabel="Number of Pupils"
                  valueFormatter={(value) => value.toLocaleString()}
                />
              </div>
            </div>

            <div className={styles.chartSection}>
              <div className={styles.chartHeader}>
                <div className={styles.chartHeaderContent}>
                  <div>
                    <h2>Total Feedback Entries Over Time</h2>
                    <p>Total number of individual feedback entries given by parents and teachers by academic year</p>
                  </div>
                  <ChartExportMenu 
                    data={totalFeedbackData} 
                    filename="total-feedback-entries"
                    chartRef={totalFeedbackChartRef}
                  />
                </div>
              </div>
              <div
                className={`${styles.chartContainer} ${!totalFeedbackLoading ? styles.fadeIn : ''}`}
                ref={totalFeedbackChartRef}
              >
                <DualLineChart 
                  data={totalFeedbackData} 
                  isLoading={totalFeedbackLoading}
                  title="Total Feedback Entries"
                  allLineKey="all_feedback_entries"
                  ppLineKey="pp_feedback_entries"
                  allLineName="All Students"
                  ppLineName="Pupil Premium"
                  yAxisLabel="Number of Feedback Entries"
                  valueFormatter={(value) => value.toLocaleString()}
                />
              </div>
            </div>
          </div>
        </main>
  )
}
