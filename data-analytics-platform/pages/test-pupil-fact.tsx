import { useState } from 'react'
import { usePupilFactImpactData } from '../hooks/usePupilFactImpactData'
import { useSchools } from '../hooks/useImpactData'
import styles from '../styles/Impact.module.scss'

export default function TestPupilFact() {
  // School selection state - empty string means "all schools"
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('')

  // Fetch schools list for dropdown
  const { schools, schoolsLoading, schoolsError } = useSchools()

  // Use the new pupil fact hooks
  const {
    kpiData,
    kpiError,
    kpiLoading,
    studentTotalsData,
    studentTotalsError,
    studentTotalsLoading,
    chartData,
    chartError,
    chartLoading,
    refreshAll,
  } = usePupilFactImpactData({
    selectedSchoolId: selectedSchoolId || undefined,
  })

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>Test Pupil Fact Data</h1>
        <p>Testing the new analytics_pupil_fact table endpoints</p>
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
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.schoolName}
              </option>
            ))}
          </select>
          {schoolsError && <p className={styles.errorText}>Failed to load schools</p>}
        </div>
        <button onClick={() => refreshAll()} className={styles.retryButton}>
          Refresh All Data
        </button>
      </div>

      {(kpiError || studentTotalsError || chartError) && (
        <div className={styles.error}>
          <p>
            Error:{' '}
            {kpiError?.message ||
              studentTotalsError?.message ||
              chartError?.message ||
              'An error occurred'}
          </p>
        </div>
      )}

      <div className={styles.summaryCards}>
        {kpiLoading ? (
          <div className={styles.card}>
            <h3>Loading KPI Data...</h3>
          </div>
        ) : kpiData ? (
          <div className={styles.card}>
            <h3>KPI Data (Pupil Fact)</h3>
            <div className={styles.metric}>{kpiData.three_year_average.percentage}%</div>
            <p>3-Year Average Feedback Rate</p>
            <pre style={{ fontSize: '12px', textAlign: 'left' }}>
              {JSON.stringify(kpiData, null, 2)}
            </pre>
          </div>
        ) : (
          <div className={styles.card}>
            <h3>No KPI Data</h3>
          </div>
        )}

        {studentTotalsLoading ? (
          <div className={styles.card}>
            <h3>Loading Student Totals...</h3>
          </div>
        ) : studentTotalsData ? (
          <div className={styles.card}>
            <h3>Student Totals (Pupil Fact)</h3>
            <div className={styles.metric}>
              {studentTotalsData.all_students?.[0]?.total_active_pupils || 'N/A'}
            </div>
            <p>Active Students (Latest Year)</p>
            <pre style={{ fontSize: '12px', textAlign: 'left' }}>
              {JSON.stringify(studentTotalsData, null, 2)}
            </pre>
          </div>
        ) : (
          <div className={styles.card}>
            <h3>No Student Totals Data</h3>
          </div>
        )}

        {chartLoading ? (
          <div className={styles.card}>
            <h3>Loading Feedback Percentage...</h3>
          </div>
        ) : chartData ? (
          <div className={styles.card}>
            <h3>Feedback Percentage (Pupil Fact)</h3>
            <div className={styles.metric}>{chartData.all_students?.[0]?.percentage || 'N/A'}%</div>
            <p>Feedback Rate (Latest Year)</p>
            <pre style={{ fontSize: '12px', textAlign: 'left' }}>
              {JSON.stringify(chartData, null, 2)}
            </pre>
          </div>
        ) : (
          <div className={styles.card}>
            <h3>No Feedback Percentage Data</h3>
          </div>
        )}
      </div>

      <div style={{ padding: '20px' }}>
        <h2>Raw Data Debug</h2>
        <details>
          <summary>All Hook Results</summary>
          <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '10px' }}>
            KPI Loading: {kpiLoading.toString()}
            KPI Error: {kpiError?.message || 'none'}
            KPI Data: {JSON.stringify(kpiData, null, 2)}
            Student Totals Loading: {studentTotalsLoading.toString()}
            Student Totals Error: {studentTotalsError?.message || 'none'}
            Student Totals Data: {JSON.stringify(studentTotalsData, null, 2)}
            Chart Loading: {chartLoading.toString()}
            Chart Error: {chartError?.message || 'none'}
            Chart Data: {JSON.stringify(chartData, null, 2)}
          </pre>
        </details>
      </div>
    </main>
  )
}







