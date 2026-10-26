import { isAnyLaunchFilterActive, type LaunchFilters } from '@/lib/spm/launchFilters'

const NO_SCHOOLS_ASSIGNED = 'You have no schools assigned to you.'
const NO_SCHOOLS_MATCHING = 'No schools match the launch filters.'

/** An empty table means something different once a launch filter is what emptied it. */
export const toSchoolsEmptyMessage = (launchFilters: LaunchFilters): string =>
  isAnyLaunchFilterActive(launchFilters) ? NO_SCHOOLS_MATCHING : NO_SCHOOLS_ASSIGNED
