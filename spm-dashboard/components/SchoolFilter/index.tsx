import { Autocomplete, TextField } from '@mui/material'

import type { SpmSchoolOption } from '@/types/spm'

import styles from './index.module.scss'

const ALL_SCHOOLS_PLACEHOLDER = 'All schools'
const UNAVAILABLE_PLACEHOLDER = 'Schools unavailable'

type SchoolFilterProps = {
  schools: SpmSchoolOption[]
  selectedSchoolId: string | null
  onSelect: (schoolId: string | null) => void
  isDisabled?: boolean
}

const SchoolFilter = ({ schools, selectedSchoolId, onSelect, isDisabled }: SchoolFilterProps) => (
  <Autocomplete
    className={styles.filter}
    size="small"
    disabled={isDisabled}
    options={schools}
    value={schools.find((school) => school.id === selectedSchoolId) ?? null}
    getOptionLabel={(school) => school.schoolName}
    isOptionEqualToValue={(option, value) => option.id === value.id}
    onChange={(_event, school) => onSelect(school?.id ?? null)}
    renderInput={(params) => (
      <TextField
        {...params}
        placeholder={isDisabled ? UNAVAILABLE_PLACEHOLDER : ALL_SCHOOLS_PLACEHOLDER}
        data-test="spm-school-filter"
      />
    )}
  />
)

export default SchoolFilter
