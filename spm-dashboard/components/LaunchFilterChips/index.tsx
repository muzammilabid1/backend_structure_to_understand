import { Chip, Menu, MenuItem } from '@mui/material'
import { useState } from 'react'

import {
  clearLaunchFilter,
  LAUNCH_STATES,
  type LaunchFilters,
  setLaunchFilter,
  toLaunchFilter,
} from '@/lib/spm/launchFilters'
import { LAUNCH_FILTER_PROGRAMMES, LAUNCH_LABELS } from '@/lib/spm/schoolTableRows'
import { LAUNCH_BADGE_COLOURS } from '@/lib/ui/designTokens'
import type { LaunchState, ProgrammeKey } from '@/types/spm'

import styles from './index.module.scss'

const ANY_STATE_LABEL = 'Any'

type LaunchFilterChipsProps = {
  launchFilters: LaunchFilters
  onChangeLaunchFilters: (launchFilters: LaunchFilters) => void
}

type LaunchFilterChipProps = LaunchFilterChipsProps & {
  programme: ProgrammeKey
  abbreviation: string
}

const toChipLabel = (abbreviation: string, state: LaunchState | null): string =>
  state ? `${abbreviation}: ${LAUNCH_LABELS[state]}` : abbreviation

const toChipColours = (state: LaunchState | null) =>
  state
    ? {
        background: LAUNCH_BADGE_COLOURS[state].background,
        color: LAUNCH_BADGE_COLOURS[state].text,
      }
    : undefined

const LaunchFilterChip = ({
  programme,
  abbreviation,
  launchFilters,
  onChangeLaunchFilters,
}: LaunchFilterChipProps) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const state = toLaunchFilter(launchFilters, programme)

  const closeMenu = () => setAnchor(null)

  const pickState = (picked: LaunchState) => {
    onChangeLaunchFilters(setLaunchFilter(launchFilters, programme, picked))
    closeMenu()
  }

  const clearState = () => {
    onChangeLaunchFilters(clearLaunchFilter(launchFilters, programme))
    closeMenu()
  }

  return (
    <>
      <Chip
        className={styles.tag}
        label={toChipLabel(abbreviation, state)}
        variant={state ? 'filled' : 'outlined'}
        style={toChipColours(state)}
        aria-pressed={!!state}
        aria-haspopup="menu"
        onClick={(event) => setAnchor(event.currentTarget)}
        onDelete={state ? clearState : undefined}
        data-test={`spm-launch-filter-${programme}`}
      />

      <Menu anchorEl={anchor} open={!!anchor} onClose={closeMenu}>
        <MenuItem selected={!state} onClick={clearState}>
          {ANY_STATE_LABEL}
        </MenuItem>
        {LAUNCH_STATES.map((option) => (
          <MenuItem
            key={option}
            selected={state === option}
            onClick={() => pickState(option)}
            data-test={`spm-launch-option-${programme}-${option}`}
          >
            {LAUNCH_LABELS[option]}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

const LaunchFilterChips = ({ launchFilters, onChangeLaunchFilters }: LaunchFilterChipsProps) => (
  <>
    <span className={styles.label}>Filter by launch</span>
    {LAUNCH_FILTER_PROGRAMMES.map(({ key, abbreviation }) => (
      <LaunchFilterChip
        key={key}
        programme={key}
        abbreviation={abbreviation}
        launchFilters={launchFilters}
        onChangeLaunchFilters={onChangeLaunchFilters}
      />
    ))}
  </>
)

export default LaunchFilterChips
