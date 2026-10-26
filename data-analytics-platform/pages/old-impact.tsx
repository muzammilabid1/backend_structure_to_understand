import { useState, useRef } from 'react'
import { TrendingUp } from 'lucide-react'
import StudentTotalsChart from '../components/Charts/StudentTotalsChart'
import TotalFeedbacksChart from '../components/Charts/TotalFeedbacksChart'
import AverageFeedbacksChart from '../components/Charts/AverageFeedbacksChart'

import PPPercentageChart from '../components/Charts/PPPercentageChart'
import ParentsRegisteredChart from '../components/Charts/ParentsRegisteredChart'
import PupilsWatchedVideoChart from '../components/Charts/PupilsWatchedVideoChart'
import PhotosUploadedChart from '../components/Charts/PhotosUploadedChart'
import AudioClipsUploadedChart from '../components/Charts/AudioClipsUploadedChart'
import PupilsCompletedActivitiesChart from '../components/Charts/PupilsCompletedActivitiesChart'
import { SkeletonCard } from '../components/Shared/SkeletonLoader'
import ChartExportMenu from '../components/Shared/ChartExportMenu'
import { useImpactData, useSchools } from '../hooks/useImpactData'
import styles from '../styles/Impact.module.scss'
import { useSubjects } from '@/hooks/useSubjects'
import PupilsTopicsCompletedMilestone from '@/components/ImpactGraphs/PupilsTopicsCompletedMilestone'

export default function Impact() {
  // School selection state - empty string means "all schools"
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('')

  // Chart refs for image capture
  const feedbackChartRef = useRef<HTMLDivElement>(null)
  const studentTotalsChartRef = useRef<HTMLDivElement>(null)
  const totalFeedbacksChartRef = useRef<HTMLDivElement>(null)
  const averageFeedbacksChartRef = useRef<HTMLDivElement>(null)

  const parentsRegisteredChartRef = useRef<HTMLDivElement>(null)
  const pupilsWatchedVideoChartRef = useRef<HTMLDivElement>(null)
  const photosUploadedChartRef = useRef<HTMLDivElement>(null)
  const audioClipsUploadedChartRef = useRef<HTMLDivElement>(null)
  const pupilsCompletedActivitiesChartRef = useRef<HTMLDivElement>(null)

  // Fetch schools list for dropdown
  const { schools, schoolsLoading, schoolsError } = useSchools()
  const { subjects } = useSubjects()

  // Use SWR hooks for parallel data loading
  const {
    kpiData,
    kpiError,
    kpiLoading,
    studentTotalsData,
    studentTotalsError,
    studentTotalsLoading,
    totalFeedbacksData,
    totalFeedbacksError,
    totalFeedbacksLoading,
    averageFeedbacksData,
    averageFeedbacksError,
    averageFeedbacksLoading,

    ppPercentageData,
    ppPercentageError,
    ppPercentageLoading,
    parentsRegisteredData,
    parentsRegisteredError,
    parentsRegisteredLoading,
    pupilsWatchedVideoData,
    pupilsWatchedVideoError,
    pupilsWatchedVideoLoading,
    photosUploadedData,
    photosUploadedError,
    photosUploadedLoading,
    audioClipsUploadedData,
    audioClipsUploadedError,
    audioClipsUploadedLoading,
    pupilsCompletedActivitiesData,
    pupilsCompletedActivitiesError,
    pupilsCompletedActivitiesLoading,
    refreshAll,
  } = useImpactData(
    {
      selectedSchoolId: selectedSchoolId || undefined,
    },
    'pupil-fact'
  )

  // Extract KPI values with fallbacks
  const threeYearAverage = kpiData?.three_year_average
  const yearBreakdown = kpiData?.year_breakdown || []

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>
          <TrendingUp className={styles.headerIcon} />
          Impact Dashboard
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
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.schoolName}
              </option>
            ))}
          </select>
          {schoolsError && <p className={styles.errorText}>Failed to load schools</p>}
        </div>
      </div>

      {(kpiError ||
        studentTotalsError ||
        totalFeedbacksError ||
        averageFeedbacksError ||
        ppPercentageError ||
        parentsRegisteredError ||
        pupilsWatchedVideoError ||
        photosUploadedError ||
        audioClipsUploadedError ||
        pupilsCompletedActivitiesError) && (
        <div className={styles.error}>
          <p>
            Error:{' '}
            {kpiError?.message ||
              studentTotalsError?.message ||
              totalFeedbacksError?.message ||
              averageFeedbacksError?.message ||
              ppPercentageError?.message ||
              parentsRegisteredError?.message ||
              pupilsWatchedVideoError?.message ||
              photosUploadedError?.message ||
              audioClipsUploadedError?.message ||
              pupilsCompletedActivitiesError?.message ||
              'An error occurred'}
          </p>
          <button onClick={() => refreshAll()} className={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      <div className={styles.summaryCards}>
        {kpiLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className={`${styles.card} ${styles.fadeIn}`}>
              <h3>Average ({threeYearAverage?.years || 'No data'})</h3>
              <div className={styles.metric}>
                {threeYearAverage ? `${threeYearAverage.percentage}%` : 'N/A'}
              </div>
              <p>Students with feedback</p>
            </div>

            <div className={`${styles.card} ${styles.fadeIn}`}>
              <h3>Average Students per Year</h3>
              <div className={styles.metric}>
                {threeYearAverage && threeYearAverage.total_active_pupils != null
                  ? threeYearAverage.total_active_pupils.toLocaleString()
                  : 'N/A'}
              </div>
              <p>Active students tracked</p>
            </div>

            <div className={`${styles.card} ${styles.fadeIn}`}>
              <h3>Average with Feedback</h3>
              <div className={styles.metric}>
                {threeYearAverage && threeYearAverage.pupils_with_feedback != null
                  ? threeYearAverage.pupils_with_feedback.toLocaleString()
                  : 'N/A'}
              </div>
              <p>Students who received feedback</p>
            </div>

            <div className={`${styles.card} ${styles.fadeIn}`}>
              <h3>Average Feedbacks per Student</h3>
              <div className={styles.metric}>
                {averageFeedbacksData &&
                averageFeedbacksData.all_students &&
                averageFeedbacksData.all_students.length > 0
                  ? (
                      averageFeedbacksData.all_students.reduce(
                        (sum: number, item: any) => sum + item.average_per_all_students,
                        0
                      ) / averageFeedbacksData.all_students.length
                    ).toFixed(1)
                  : 'N/A'}
              </div>
              <p>Average feedback entries per student</p>
            </div>
          </>
        )}
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderContent}>
              <div>
                <h2>Pupil Premium Percentage Among Active Students</h2>
                <p>Percentage of active students who are Pupil Premium by academic year</p>
              </div>
              <ChartExportMenu
                data={ppPercentageData}
                filename="pupil-premium-percentage-active"
                chartRef={feedbackChartRef}
              />
            </div>
          </div>
          <div
            className={`${styles.chartContainer} ${!ppPercentageLoading ? styles.fadeIn : ''}`}
            ref={feedbackChartRef}
          >
            <PPPercentageChart data={ppPercentageData} isLoading={ppPercentageLoading} />
          </div>
        </div>

        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderContent}>
              <div>
                <h2>Pupils Active</h2>
                <p>
                  Total number of pupils who have completed an activity or recorded a reading
                  session in a time period
                </p>
              </div>
              <ChartExportMenu
                data={studentTotalsData}
                filename="student-totals"
                chartRef={studentTotalsChartRef}
              />
            </div>
          </div>
          <div
            className={`${styles.chartContainer} ${!studentTotalsLoading ? styles.fadeIn : ''}`}
            ref={studentTotalsChartRef}
          >
            <StudentTotalsChart data={studentTotalsData} isLoading={studentTotalsLoading} />
          </div>
        </div>

        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderContent}>
              <div>
                <h2>Total Feedback Entries Over Time</h2>
                <p>Total number of individual feedback entries given by parents by academic year</p>
              </div>
              <ChartExportMenu
                data={totalFeedbacksData}
                filename="total-feedback-entries"
                chartRef={totalFeedbacksChartRef}
              />
            </div>
          </div>
          <div
            className={`${styles.chartContainer} ${!totalFeedbacksLoading ? styles.fadeIn : ''}`}
            ref={totalFeedbacksChartRef}
          >
            <TotalFeedbacksChart data={totalFeedbacksData} isLoading={totalFeedbacksLoading} />
          </div>
        </div>

        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderContent}>
              <div>
                <h2>Average Feedbacks Per Student</h2>
                <p>Average number of feedback entries per student by academic year</p>
              </div>
              <ChartExportMenu
                data={averageFeedbacksData}
                filename="average-feedbacks-per-student"
                chartRef={averageFeedbacksChartRef}
              />
            </div>
          </div>
          <div
            className={`${styles.chartContainer} ${!averageFeedbacksLoading ? styles.fadeIn : ''}`}
            ref={averageFeedbacksChartRef}
          >
            <AverageFeedbacksChart
              data={averageFeedbacksData}
              isLoading={averageFeedbacksLoading}
            />
          </div>
        </div>

        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderContent}>
              <div>
                <h2>Parents Registered Over Time (2022-2024)</h2>
                <p>Cumulative number of parents registered on the platform by academic year</p>
              </div>
              <ChartExportMenu
                data={parentsRegisteredData}
                filename="parents-registered"
                chartRef={parentsRegisteredChartRef}
              />
            </div>
          </div>
          <div
            className={`${styles.chartContainer} ${!parentsRegisteredLoading ? styles.fadeIn : ''}`}
            ref={parentsRegisteredChartRef}
          >
            <ParentsRegisteredChart
              data={parentsRegisteredData}
              isLoading={parentsRegisteredLoading}
            />
          </div>
        </div>

        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderContent}>
              <div>
                <h2>Pupils Who Watched Videos (2022-2024)</h2>
                <p>Number of pupils who watched instructional videos by academic year</p>
              </div>
              <ChartExportMenu
                data={pupilsWatchedVideoData}
                filename="pupils-watched-video"
                chartRef={pupilsWatchedVideoChartRef}
              />
            </div>
          </div>
          <div
            className={`${styles.chartContainer} ${!pupilsWatchedVideoLoading ? styles.fadeIn : ''}`}
            ref={pupilsWatchedVideoChartRef}
          >
            <PupilsWatchedVideoChart
              data={pupilsWatchedVideoData}
              isLoading={pupilsWatchedVideoLoading}
            />
          </div>
        </div>

        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderContent}>
              <div>
                <h2>Photos Uploaded (2022-2024)</h2>
                <p>Number of photos uploaded by parents with feedback by academic year</p>
              </div>
              <ChartExportMenu
                data={photosUploadedData}
                filename="photos-uploaded"
                chartRef={photosUploadedChartRef}
              />
            </div>
          </div>
          <div
            className={`${styles.chartContainer} ${!photosUploadedLoading ? styles.fadeIn : ''}`}
            ref={photosUploadedChartRef}
          >
            <PhotosUploadedChart data={photosUploadedData} isLoading={photosUploadedLoading} />
          </div>
        </div>

        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderContent}>
              <div>
                <h2>Audio Clips Uploaded (2022-2024)</h2>
                <p>Number of audio clips uploaded by parents with feedback by academic year</p>
              </div>
              <ChartExportMenu
                data={audioClipsUploadedData}
                filename="audio-clips-uploaded"
                chartRef={audioClipsUploadedChartRef}
              />
            </div>
          </div>
          <div
            className={`${styles.chartContainer} ${!audioClipsUploadedLoading ? styles.fadeIn : ''}`}
            ref={audioClipsUploadedChartRef}
          >
            <AudioClipsUploadedChart
              data={audioClipsUploadedData}
              isLoading={audioClipsUploadedLoading}
            />
          </div>
        </div>

        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderContent}>
              <div>
                <h2>Pupils Who Completed Activities (2022-2024)</h2>
                <p>
                  Number of pupils who completed an activity by leaving at least one photo, comment
                  or rating
                </p>
              </div>
              <ChartExportMenu
                data={pupilsCompletedActivitiesData}
                filename="pupils-completed-activities"
                chartRef={pupilsCompletedActivitiesChartRef}
              />
            </div>
          </div>
          <div
            className={`${styles.chartContainer} ${!pupilsCompletedActivitiesLoading ? styles.fadeIn : ''}`}
            ref={pupilsCompletedActivitiesChartRef}
          >
            <PupilsCompletedActivitiesChart
              data={pupilsCompletedActivitiesData}
              isLoading={pupilsCompletedActivitiesLoading}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
