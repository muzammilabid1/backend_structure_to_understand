import { Alert, Chip, CircularProgress } from '@mui/material'
import useSWR from 'swr'

import LaunchFilterChips from '@/components/LaunchFilterChips'
import type { LaunchFilters } from '@/lib/spm/launchFilters'
import {
  isAllSchoolsFilterActive,
  isSchoolsFilterActive,
  isTagFilterActive,
  type SchoolsFilter,
  toggleAllSchools,
  toggleSchoolsTag,
} from '@/lib/spm/schoolsFilter'
import { toSpmName } from '@/lib/spm/spmTags'
import type { SpmTagsOutput } from '@/types/spm'

import styles from './index.module.scss'

type SpmTagChipsProps = {
  filter: SchoolsFilter
  onChangeFilter: (filter: SchoolsFilter) => void
}

type SchoolsFilterBarProps = SpmTagChipsProps & {
  launchFilters: LaunchFilters
  onChangeLaunchFilters: (launchFilters: LaunchFilters) => void
}

const SpmTagChips = ({ filter, onChangeFilter }: SpmTagChipsProps) => {
  const { data, error } = useSWR<SpmTagsOutput>('/api/spm/tags')

  if (error) {
    return (
      <Alert severity="error">Error loading school partnership managers: {error.message}</Alert>
    )
  }

  if (!data) {
    return <CircularProgress size={20} data-test="spm-tag-filter-loading" />
  }

  if (!data.results.length) {
    return null
  }

  return (
    <>
      <span className={styles.label}>Filter by SPM</span>
      {data.results.map((tag) => {
        const isSelected = isTagFilterActive(filter, tag.id)

        return (
          <Chip
            key={tag.id}
            className={styles.tag}
            label={`${toSpmName(tag.name)} (${tag.schoolCount})`}
            color={isSelected ? 'primary' : 'default'}
            variant={isSelected ? 'filled' : 'outlined'}
            aria-pressed={isSelected}
            onClick={() => onChangeFilter(toggleSchoolsTag(filter, tag.id))}
            data-test={`spm-tag-${tag.id}`}
          />
        )
      })}
    </>
  )
}

const SchoolsFilterBar = ({
  filter,
  onChangeFilter,
  launchFilters,
  onChangeLaunchFilters,
}: SchoolsFilterBarProps) => {
  const isShowingAll = isAllSchoolsFilterActive(filter)

  return (
    <>
      <div className={styles.filterBar} data-test="schools-filter-bar">
        <Chip
          className={styles.tag}
          label="Show all schools"
          color={isShowingAll ? 'primary' : 'default'}
          variant={isShowingAll ? 'filled' : 'outlined'}
          aria-pressed={isShowingAll}
          onClick={() => onChangeFilter(toggleAllSchools(filter))}
          data-test="show-all-schools"
        />

        <SpmTagChips filter={filter} onChangeFilter={onChangeFilter} />
      </div>

      {isSchoolsFilterActive(filter) && (
        <div className={styles.filterBar} data-test="launch-filter-bar">
          <LaunchFilterChips
            launchFilters={launchFilters}
            onChangeLaunchFilters={onChangeLaunchFilters}
          />
        </div>
      )}
    </>
  )
}

export default SchoolsFilterBar
