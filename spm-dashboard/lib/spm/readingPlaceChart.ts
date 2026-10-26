import { STATUS_COLOURS, SURFACE_COLOURS } from '@/lib/ui/designTokens'
import type { SpmReadingLogTotals } from '@/types/spm'

export type ReadingPlaceSegment = {
  label: string
  count: number
  percent: number
  colour: string
}

export type ReadingPlaceChart = {
  totalCount: number
  segments: ReadingPlaceSegment[]
}

type PercentSplit = {
  atSchool: number
  atHome: number
}

// Deriving the second share from the first keeps the pair on 100% however the first one rounds.
const toPercentSplit = (atSchoolCount: number, totalCount: number): PercentSplit => {
  if (totalCount === 0) {
    return { atSchool: 0, atHome: 0 }
  }

  const atSchool = Math.round((atSchoolCount / totalCount) * 100)
  return { atSchool, atHome: 100 - atSchool }
}

export const toReadingPlaceChart = ({
  atHomeCount,
  atSchoolCount,
}: SpmReadingLogTotals): ReadingPlaceChart => {
  const totalCount = atSchoolCount + atHomeCount
  const percent = toPercentSplit(atSchoolCount, totalCount)

  return {
    totalCount,
    segments: [
      {
        label: 'At school',
        count: atSchoolCount,
        percent: percent.atSchool,
        colour: STATUS_COLOURS.warning,
      },
      {
        label: 'At home',
        count: atHomeCount,
        percent: percent.atHome,
        colour: SURFACE_COLOURS.accentTint,
      },
    ],
  }
}
