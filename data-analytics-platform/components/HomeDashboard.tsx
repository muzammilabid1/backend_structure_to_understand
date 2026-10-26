import { Users, BarChart3, MessageSquare } from 'lucide-react'
import useSWR from 'swr'
import DashboardLayout from './DashboardLayout'
import type { HomeFamiliesResponse } from '../pages/api/home/families'
import styles from '../styles/Home.module.scss'

// Rendered only for authenticated admins, so the KPI request can fire
// unconditionally — no need to gate the SWR key on the auth state.
export default function HomeDashboard() {
  const { data: familiesKpi, isLoading: familiesKpiLoading } = useSWR<HomeFamiliesResponse>(
    '/api/home/families',
    { revalidateOnMount: true, dedupingInterval: 3600000 }
  )

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>
          <BarChart3 size={40} />
          Data Analytics Platform
        </h1>
        <p>Internal tool for Learning with Parents data analysis and insights</p>
        <div className={styles.statusBadge}>
          <span className={styles.statusDot} />
          System Online
        </div>
      </div>
      <div className={styles.sectionLabel}>Family Engagement</div>
      <div className={styles.statusGrid}>
        {/* Family engagement KPIs */}
        <div className={styles.statusCard}>
          <MessageSquare className={styles.statusIcon} size={24} />
          <div className={styles.statusLabel}>Total Feedback Entries</div>
          <div className={styles.statusValue}>
            {familiesKpiLoading
              ? '—'
              : (familiesKpi?.all_feedback_entries?.toLocaleString() ?? '—')}
          </div>
          {familiesKpi?.year && <div className={styles.kpiYear}>{familiesKpi.year}</div>}
        </div>
        <div className={styles.statusCard}>
          <Users className={styles.statusIcon} size={24} />
          <div className={styles.statusLabel}>All Active Pupils</div>
          <div className={styles.statusValue}>
            {familiesKpiLoading ? '—' : (familiesKpi?.all_active_pupils?.toLocaleString() ?? '—')}
          </div>
          {!familiesKpiLoading && familiesKpi && (
            <div className={styles.kpiPercentage}>
              {familiesKpi.active_families_percentage}% of all pupils
            </div>
          )}
          {familiesKpi?.year && <div className={styles.kpiYear}>{familiesKpi.year}</div>}
        </div>
        <div className={styles.statusCard}>
          <Users className={styles.statusIcon} size={24} />
          <div className={styles.statusLabel}>Active Pupil Premium</div>
          <div className={styles.statusValue}>
            {familiesKpiLoading ? '—' : (familiesKpi?.pp_active_pupils?.toLocaleString() ?? '—')}
          </div>
          {!familiesKpiLoading && familiesKpi && (
            <div className={styles.kpiPercentage}>
              {familiesKpi.pp_percentage}% of pupil premium
            </div>
          )}
          {familiesKpi?.year && <div className={styles.kpiYear}>{familiesKpi.year}</div>}
        </div>
      </div>
    </main>
  )
}
