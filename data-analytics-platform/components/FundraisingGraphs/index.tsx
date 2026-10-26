import { LineChart } from 'lucide-react'
import RegionalChart from './RegionalChart'
import SubjectChart from './SubjectChart'
import PupilDataBySubjectChart from './PupilDataBySubjectChart'
import HabitFormingMilestonesChart from './HabitFormingMilestonesChart'
import AverageEngagementChart from './AverageEngagementChart'
import TopicsByYearGroupChart from './TopicsByYearGroupChart'
import styles from './index.module.scss'
import CommonNote from '../Shared/CommonNote'

export default function FundraisingGraphs() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>
          <LineChart className={styles.headerIcon} />
          Fundraising Graphs
        </h1>
        <p>
          Visual representations of fundraising data across regions, programmes, and pupil premium
          status.
        </p>
      </div>

      <CommonNote />

      <div className={styles.chartsGrid}>
        {/* Graph 1: Data by Region */}
        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <h2>1. Data by Region &amp; PP Status</h2>
            <p>
              Active pupils, topics offered, videos watched, activities clicked/completed, reading
              sessions and topics, broken down by All, Region, and Pupil Premium status.
            </p>
          </div>
          <div className={styles.chartContainer}>
            <RegionalChart />
          </div>
        </div>

        {/* Graph 2: Data by Subject */}
        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <h2>2. Data broken down by Subject</h2>
            <p>
              Partner schools, classes, teachers, parents, and pupils, broken down by All and each
              subject.
            </p>
          </div>
          <div className={styles.chartContainer}>
            <SubjectChart />
          </div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        {/* Graph 3a: Pupil data by Subject & PP Status */}
        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <h2>3a. Data by Subject &amp; PP Status</h2>
            <p>
              Videos watched, activities clicked, total engagement, broken down by subject with All
              and Pupil Premium bars.
            </p>
          </div>
          <div className={styles.chartContainer}>
            <PupilDataBySubjectChart />
          </div>
        </div>

        {/* Graph 3b: Habit-Forming Milestones */}
        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <h2>3b. Habit-Forming Milestones</h2>
            <p>
              Number of children completing 1–5 activities, topics, or reading sessions All Pupils
              vs Pupil Premium.
            </p>
          </div>
          <div className={styles.chartContainer}>
            <HabitFormingMilestonesChart />
          </div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        {/* Graph 4: Topics completed by Year Group & PP Status */}
        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <h2>4. Topics by Year Group</h2>
            <p>
              Total topics completed broken down by year group, with PP status and programme
              breakdown.
            </p>
          </div>
          <div className={styles.chartContainer}>
            <TopicsByYearGroupChart />
          </div>
        </div>

        {/* Graph 5: Averages across engagement */}
        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <h2>5. Averages across Engagement</h2>
            <p>
              Average reading sessions, topics, and activities completed per child, split by All
              Pupils vs Pupil Premium. Topics and activities can be broken down by subject.
            </p>
          </div>
          <div className={styles.chartContainer}>
            <AverageEngagementChart />
          </div>
        </div>
      </div>
    </main>
  )
}
