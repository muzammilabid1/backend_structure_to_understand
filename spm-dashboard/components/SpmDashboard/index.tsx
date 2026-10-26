import { useState } from 'react'

import DashboardCard from '@/components/DashboardCard'
import DashboardHeader from '@/components/DashboardHeader'
import DashboardLayout from '@/components/DashboardLayout'
import ProgrammeSubscriptionsCard from '@/components/ProgrammeSubscriptionsCard'
import ReadingPlaceCard from '@/components/ReadingPlaceCard'
import SchoolsFilterBar from '@/components/SchoolsFilterBar'
import SchoolsFilterPrompt from '@/components/SchoolsFilterPrompt'
import SchoolsTable from '@/components/SchoolsTable'
import SummaryMetricCards from '@/components/SummaryMetricCards'
import { type LaunchFilters, NO_LAUNCH_FILTERS } from '@/lib/spm/launchFilters'
import {
  isSchoolsFilterActive,
  NO_SCHOOLS_FILTER,
  type SchoolsFilter,
} from '@/lib/spm/schoolsFilter'

import styles from './index.module.scss'

const SpmDashboard = () => {
  const [filter, setFilter] = useState<SchoolsFilter>(NO_SCHOOLS_FILTER)
  const [launchFilters, setLaunchFilters] = useState<LaunchFilters>(NO_LAUNCH_FILTERS)

  return (
    <DashboardLayout>
      <DashboardHeader title="My schools dashboard" />

      <SummaryMetricCards />

      <div className={styles.panelRow}>
        <ReadingPlaceCard />
        <ProgrammeSubscriptionsCard />
      </div>

      <SchoolsFilterBar
        filter={filter}
        onChangeFilter={setFilter}
        launchFilters={launchFilters}
        onChangeLaunchFilters={setLaunchFilters}
      />

      <DashboardCard title="All schools" subtitle="Click a school to see their engagement detail">
        {isSchoolsFilterActive(filter) ? (
          <SchoolsTable filter={filter} launchFilters={launchFilters} />
        ) : (
          <SchoolsFilterPrompt />
        )}
      </DashboardCard>
    </DashboardLayout>
  )
}

export default SpmDashboard
