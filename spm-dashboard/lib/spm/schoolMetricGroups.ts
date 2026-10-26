import type { SchoolForSpm } from '@/types/spm'

const PUPIL_PREMIUM_TOOLTIP = '% of pupils in active classes flagged as pupil premium'

const READING_LOG_ACTIVE_TOOLTIP =
  '% of reading log pupils with an engaged parent who have at least one reading log comment this term'
const READING_LOG_INACTIVE_TOOLTIP =
  '% of reading log pupils with an engaged parent who have no reading log comment this term'
const READING_LOG_PREVIOUS_ACTIVE_TOOLTIP =
  '% of reading log pupils with an engaged parent who had at least one reading log comment last term'
const READING_LOG_PREVIOUS_INACTIVE_TOOLTIP =
  '% of reading log pupils with an engaged parent who had no reading log comment last term'

const TEACHER_FEEDBACK_IN_USE_TOOLTIP =
  'Whether any teacher has left a reading log comment this term'
const TEACHER_FEEDBACK_COUNT_TOOLTIP = 'Number of reading log comments left by teachers this term'
const READING_TARGET_TOOLTIP =
  'Most common weekly reading target set across the school’s reading log classes'

const TOPICS_ACTIVE_TOOLTIP =
  '% of pupils who earned a star or watched a video for a topic this term'
const TOPICS_INACTIVE_TOOLTIP =
  '% of pupils who earned no star and watched no video for a topic this term'
const ACTIVITIES_ACTIVE_TOOLTIP =
  '% of pupils assigned activities who completed or accessed one this term'
const ACTIVITIES_INACTIVE_TOOLTIP =
  '% of pupils assigned activities who neither completed nor accessed one this term'
const TOPICS_SET_TOOLTIP =
  'Number of released topics set across the school’s active classes this term'

const CLASS_READING_TARGET_TOOLTIP =
  '% of pupils in this class who earned their reading target star this term'

export const READING_LOG_TARGET_SUCCESS_THRESHOLD = 75
export const READING_LOG_TARGET_WARNING_THRESHOLD = 50

export type MetricTone = 'neutral' | 'muted' | 'success' | 'accent' | 'warning' | 'error'

export type MetricPill = {
  label: string
  tooltip: string
  tone: MetricTone
}

export type SchoolMetricGroup = {
  label: string
  pills: MetricPill[]
}

const isPresent = <TValue>(value: TValue | null | undefined): value is TValue =>
  value !== null && value !== undefined

const schoolHasReadingLog = (school: SchoolForSpm): boolean => school.numOfTotalClassesAllowed > 0

const toPupilPremiumGroup = (school: SchoolForSpm): SchoolMetricGroup | null => {
  const { pupilPremiumPercent } = school.spmData
  if (!isPresent(pupilPremiumPercent)) {
    return null
  }

  return {
    label: 'Pupil premium',
    pills: [
      { label: `PP ${pupilPremiumPercent}%`, tooltip: PUPIL_PREMIUM_TOOLTIP, tone: 'neutral' },
    ],
  }
}

const toReadingLogGroup = (school: SchoolForSpm): SchoolMetricGroup | null => {
  if (!schoolHasReadingLog(school)) {
    return null
  }

  const current = school.spmData.readingLogCurrentTermComment
  if (!isPresent(current.activePercent)) {
    return null
  }

  const pills: MetricPill[] = [
    {
      label: `Active ${current.activePercent}%`,
      tooltip: READING_LOG_ACTIVE_TOOLTIP,
      tone: 'success',
    },
    {
      label: `Inactive ${current.inactivePercent}%`,
      tooltip: READING_LOG_INACTIVE_TOOLTIP,
      tone: 'neutral',
    },
  ]

  const previous = school.spmData.readingLogPreviousTermComment
  if (isPresent(previous.activePercent)) {
    pills.push(
      {
        label: `Prev active ${previous.activePercent}%`,
        tooltip: READING_LOG_PREVIOUS_ACTIVE_TOOLTIP,
        tone: 'muted',
      },
      {
        label: `Prev inactive ${previous.inactivePercent}%`,
        tooltip: READING_LOG_PREVIOUS_INACTIVE_TOOLTIP,
        tone: 'muted',
      }
    )
  }

  return { label: 'Reading log', pills }
}

const toTeacherInputGroup = (school: SchoolForSpm): SchoolMetricGroup | null => {
  if (!schoolHasReadingLog(school)) {
    return null
  }

  const { teacherFeedbackInUse, teacherFeedbackCount, schoolReadingTarget } = school.spmData
  if (!isPresent(teacherFeedbackInUse)) {
    return null
  }

  const pills: MetricPill[] = [
    {
      label: teacherFeedbackInUse ? 'Teacher feedback: in use' : 'Teacher feedback: not in use',
      tooltip: TEACHER_FEEDBACK_IN_USE_TOOLTIP,
      tone: teacherFeedbackInUse ? 'success' : 'neutral',
    },
  ]

  if (isPresent(teacherFeedbackCount)) {
    pills.push({
      label: `Teacher comments: ${teacherFeedbackCount}`,
      tooltip: TEACHER_FEEDBACK_COUNT_TOOLTIP,
      tone: 'neutral',
    })
  }

  if (isPresent(schoolReadingTarget)) {
    pills.push({
      label: `Target: ${schoolReadingTarget}/wk`,
      tooltip: READING_TARGET_TOOLTIP,
      tone: 'neutral',
    })
  }

  return { label: 'Teacher input', pills }
}

const toTopicsGroup = (school: SchoolForSpm): SchoolMetricGroup | null => {
  const topics = school.spmData.topicsCurrentTerm
  if (!isPresent(topics.activePercent)) {
    return null
  }

  const pills: MetricPill[] = [
    {
      label: `Topics active ${topics.activePercent}%`,
      tooltip: TOPICS_ACTIVE_TOOLTIP,
      tone: 'success',
    },
    {
      label: `Topics inactive ${topics.inactivePercent}%`,
      tooltip: TOPICS_INACTIVE_TOOLTIP,
      tone: 'neutral',
    },
  ]

  const activities = school.spmData.activitiesCurrentTerm
  if (isPresent(activities.activePercent)) {
    pills.push(
      {
        label: `Activities active ${activities.activePercent}%`,
        tooltip: ACTIVITIES_ACTIVE_TOOLTIP,
        tone: 'accent',
      },
      {
        label: `Activities inactive ${activities.inactivePercent}%`,
        tooltip: ACTIVITIES_INACTIVE_TOOLTIP,
        tone: 'neutral',
      }
    )
  }

  const { topicsSetCount } = school.spmData
  if (isPresent(topicsSetCount)) {
    pills.push({
      label: `Topics set: ${topicsSetCount}`,
      tooltip: TOPICS_SET_TOOLTIP,
      tone: 'neutral',
    })
  }

  return { label: 'Topics', pills }
}

const toReadingLogTargetTone = (targetPercent: number): MetricTone => {
  if (targetPercent >= READING_LOG_TARGET_SUCCESS_THRESHOLD) return 'success'
  if (targetPercent >= READING_LOG_TARGET_WARNING_THRESHOLD) return 'warning'
  return 'error'
}

const toReadingTargetGroup = (school: SchoolForSpm): SchoolMetricGroup | null => {
  if (!schoolHasReadingLog(school)) {
    return null
  }

  const classes = school.spmData.readingLogTargetByClass
  if (!classes?.length) {
    return null
  }

  return {
    label: 'Reading target',
    pills: classes.map(({ className, activePercent }) => {
      const targetPercent = activePercent ?? 0

      return {
        label: `${className}: ${targetPercent}%`,
        tooltip: CLASS_READING_TARGET_TOOLTIP,
        tone: toReadingLogTargetTone(targetPercent),
      }
    }),
  }
}

const GROUP_BUILDERS = [
  toPupilPremiumGroup,
  toReadingLogGroup,
  toTeacherInputGroup,
  toTopicsGroup,
  toReadingTargetGroup,
]

export const toSchoolMetricGroups = (school: SchoolForSpm): SchoolMetricGroup[] =>
  GROUP_BUILDERS.map((toGroup) => toGroup(school)).filter(
    (group): group is SchoolMetricGroup => group !== null
  )
