import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import EventBusyIcon from '@mui/icons-material/EventBusy'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined'
import NotificationsOffOutlinedIcon from '@mui/icons-material/NotificationsOffOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined'
import SyncProblemIcon from '@mui/icons-material/SyncProblem'
import { Alert, CircularProgress, Tooltip } from '@mui/material'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import useSWRInfinite from 'swr/infinite'

import type { LaunchFilters } from '@/lib/spm/launchFilters'
import { toSchoolAdminUrl } from '@/lib/spm/platformLinks'
import { type IssueKey, type SchoolIssue } from '@/lib/spm/schoolIssues'
import { type MetricTone, toSchoolMetricGroups } from '@/lib/spm/schoolMetricGroups'
import { toSchoolsEmptyMessage } from '@/lib/spm/schoolsEmptyMessage'
import type { SchoolsFilter } from '@/lib/spm/schoolsFilter'
import {
  LAUNCH_HEADINGS,
  type LaunchedOn,
  type SchoolTableRow,
  toSchoolTableRow,
} from '@/lib/spm/schoolTableRows'
import { toSchoolsPageKey } from '@/lib/spm/spmSchoolsRequest'
import { type BadgeColour, ISSUE_BADGE_COLOURS } from '@/lib/ui/designTokens'
import type { SchoolForSpm, SpmSchoolsOutput } from '@/types/spm'

import styles from './index.module.scss'

const TONE_CLASSES: Record<MetricTone, string> = {
  neutral: styles.pillNeutral,
  muted: styles.pillMuted,
  success: styles.pillSuccess,
  accent: styles.pillAccent,
  warning: styles.pillWarning,
  error: styles.pillError,
}

type MetricPillProps = {
  label: string
  tooltip: string
  tone: MetricTone
}

// Wrapped in a plain span because MUI's Tooltip needs a child that can hold a ref.
const MetricPill = ({ label, tooltip, tone }: MetricPillProps) => (
  <Tooltip title={tooltip}>
    <span className={`${styles.pill} ${TONE_CLASSES[tone]}`}>{label}</span>
  </Tooltip>
)

const MetricGroup = ({ label, children }: { label: string; children: ReactNode }) => (
  <>
    <dt className={styles.metricLabel}>{label}</dt>
    <dd className={styles.metricValues}>{children}</dd>
  </>
)

const NO_ENGAGEMENT_MESSAGE = 'No engagement data yet for this school.'

const SchoolEngagementDetail = ({ school }: { school: SchoolForSpm }) => {
  const groups = toSchoolMetricGroups(school)

  if (!groups.length) {
    return (
      <p className={styles.detailEmpty} data-test="spm-school-metrics-empty">
        {NO_ENGAGEMENT_MESSAGE}
      </p>
    )
  }

  return (
    <dl className={styles.detail} data-test="spm-school-metrics">
      {groups.map((group) => (
        <MetricGroup key={group.label} label={group.label}>
          {group.pills.map((pill) => (
            <MetricPill key={pill.label} {...pill} />
          ))}
        </MetricGroup>
      ))}
    </dl>
  )
}

const LaunchDateLine = ({ launchedOn }: { launchedOn: LaunchedOn | null }) =>
  launchedOn ? (
    <time className={styles.launchedOn} dateTime={launchedOn.iso}>
      {launchedOn.label}
    </time>
  ) : (
    <span className={styles.launchedOn} aria-hidden="true" />
  )

const Badge = ({ colour, children }: { colour: BadgeColour; children: ReactNode }) => (
  <span className={styles.badge} style={{ background: colour.background, color: colour.text }}>
    {children}
  </span>
)

type IssueIcon = typeof SyncProblemIcon

// A school can raise both Wonde issues at once, so they need icons that tell them apart.
const ISSUE_ICONS: Record<IssueKey, IssueIcon> = {
  wondeSync: SyncProblemIcon,
  wondeAcademicYear: EventBusyIcon,
  teachersInactive: PersonOffOutlinedIcon,
  misLinks: LinkOffIcon,
  parentsAwaitingInvite: MarkEmailUnreadOutlinedIcon,
  parentDetails: NotificationsOffOutlinedIcon,
}

const ISSUE_KEY_LABELS: Record<IssueKey, string> = {
  wondeSync: 'Wonde sync',
  wondeAcademicYear: 'Wonde academic year',
  teachersInactive: 'No active teacher',
  misLinks: 'Pupils not linked',
  parentsAwaitingInvite: 'Awaiting invite',
  parentDetails: 'Parent details',
}

const ISSUE_KEYS = Object.keys(ISSUE_ICONS) as IssueKey[]

const CLASS_ACTIVATION_CLASSES: Record<NonNullable<SchoolTableRow['classActivation']>, string> = {
  complete: styles.activationComplete,
  partial: styles.activationPartial,
  none: styles.activationNone,
}

const IssueCard = ({ issue }: { issue: SchoolIssue }) => (
  <>
    <strong className={styles.issueCardTitle}>{issue.title}</strong>
    {issue.explanation}
    {issue.action && (
      <a
        className={styles.issueCardAction}
        href={issue.action.url}
        target="_blank"
        rel="noreferrer"
      >
        {issue.action.label}
      </a>
    )}
  </>
)

const IssuePill = ({ issue }: { issue: SchoolIssue }) => {
  const Icon = ISSUE_ICONS[issue.key]
  const colour = ISSUE_BADGE_COLOURS[issue.severity]

  return (
    <Tooltip
      title={<IssueCard issue={issue} />}
      componentsProps={{ tooltip: { className: styles.issueCard } }}
    >
      <button
        type="button"
        className={styles.issuePill}
        style={{ background: colour.background, color: colour.text }}
        aria-label={issue.title}
        data-test="spm-school-issue"
        data-issue={issue.key}
        data-severity={issue.severity}
      >
        <Icon fontSize="inherit" />
        {issue.count !== null && <span className={styles.issueCount}>{issue.count}</span>}
      </button>
    </Tooltip>
  )
}

const IssueLabels = ({ issues }: { issues: SchoolIssue[] }) => {
  if (issues.length === 0) {
    return (
      <span className={styles.allClear} data-test="spm-school-all-clear">
        <CheckCircleOutlineIcon fontSize="inherit" />
        All clear
      </span>
    )
  }

  return (
    <span className={styles.issues}>
      {issues.map((issue) => (
        <IssuePill key={issue.key} issue={issue} />
      ))}
    </span>
  )
}

// The pills carry an icon and no words, so the column is unreadable without a key beside it.
const IssueKeyLegend = () => (
  <p className={styles.issueKeyLegend} data-test="spm-issue-key">
    <span className={styles.issueKeyHeading}>Issue key</span>
    {ISSUE_KEYS.map((key) => {
      const Icon = ISSUE_ICONS[key]

      return (
        <span key={key} className={styles.issueKeyEntry}>
          <Icon fontSize="inherit" />
          {ISSUE_KEY_LABELS[key]}
        </span>
      )
    })}
  </p>
)

type SchoolRowProps = {
  school: SchoolForSpm
  row: SchoolTableRow
  isExpanded: boolean
  onToggle: (schoolId: string) => void
}

const SchoolRow = ({ school, row, isExpanded, onToggle }: SchoolRowProps) => {
  const detailId = `spm-school-detail-${row.id}`
  const adminUrl = toSchoolAdminUrl(row.id)

  return (
    <>
      <tr className={styles.row} data-test="spm-school-row">
        <td className={styles.schoolCell}>
          <span className={styles.school}>
            <button
              type="button"
              className={styles.schoolToggle}
              aria-expanded={isExpanded}
              aria-controls={detailId}
              onClick={() => onToggle(row.id)}
            >
              <ExpandMoreIcon
                fontSize="small"
                className={isExpanded ? styles.chevronOpen : styles.chevron}
              />
              {row.schoolName}
            </button>
            {adminUrl && (
              <a
                className={styles.schoolLink}
                href={adminUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Go to school`}
                data-test="spm-school-platform-link"
              >
                <OpenInNewIcon fontSize="small" />
              </a>
            )}
          </span>
        </td>
        <td>
          <span className={styles.classes}>
            {`${row.activatedClassCount} / ${row.contractedClassCount}`}
            {row.classActivation && (
              <span className={CLASS_ACTIVATION_CLASSES[row.classActivation]} />
            )}
          </span>
        </td>
        <td>
          <span className={styles.badges}>
            {row.programmes.map((pill) => (
              <Badge key={pill.key} colour={pill.colour}>
                {pill.abbreviation}
              </Badge>
            ))}
          </span>
        </td>
        {row.launches.map((launch, index) => (
          <td key={LAUNCH_HEADINGS[index]}>
            <Badge colour={launch.colour}>{launch.label}</Badge>
            <LaunchDateLine launchedOn={launch.launchedOn} />
          </td>
        ))}
        <td>
          <IssueLabels issues={row.issues} />
        </td>
      </tr>
      {isExpanded && (
        <tr id={detailId} className={styles.detailRow}>
          <td colSpan={4 + row.launches.length}>
            <SchoolEngagementDetail school={school} />
          </td>
        </tr>
      )}
    </>
  )
}

const mergeSchoolsById = (
  existingSchools: SchoolForSpm[],
  incomingSchools: SchoolForSpm[]
): SchoolForSpm[] => {
  const schoolsById = new Map(existingSchools.map((school) => [school.id, school]))
  incomingSchools.forEach((school) => schoolsById.set(school.id, school))
  return Array.from(schoolsById.values())
}

const toggleSchoolId = (expandedIds: Set<string>, schoolId: string): Set<string> => {
  const nextIds = new Set(expandedIds)
  if (!nextIds.delete(schoolId)) {
    nextIds.add(schoolId)
  }
  return nextIds
}

type SchoolsTableProps = {
  filter: SchoolsFilter
  launchFilters: LaunchFilters
}

const SchoolsTable = ({ filter, launchFilters }: SchoolsTableProps) => {
  const getPageKey = useCallback(
    (pageIndex: number, previousPage: SpmSchoolsOutput | null) =>
      toSchoolsPageKey({ pageIndex, previousPage, filter, launchFilters }),
    [filter, launchFilters]
  )

  const { data, error, setSize, isLoading, isValidating } =
    useSWRInfinite<SpmSchoolsOutput>(getPageKey)

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const toggleSchool = useCallback(
    (schoolId: string) => setExpandedIds((current) => toggleSchoolId(current, schoolId)),
    []
  )

  const schools = (data ?? []).reduce<SchoolForSpm[]>(
    (accumulatedSchools, page) => mergeSchoolsById(accumulatedSchools, page.results),
    []
  )
  const total = data?.[0]?.total ?? 0
  const remainingSchoolCount = total - schools.length
  const hasMoreSchools = remainingSchoolCount > 0

  const isInitialLoad = isLoading && !data
  const isLoadingMore = isValidating && !!data && data.length > 0

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const loadMore = useCallback(() => {
    if (hasMoreSchools && !isLoadingMore) {
      setSize((current) => current + 1)
    }
  }, [hasMoreSchools, isLoadingMore, setSize])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) {
      return
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMore()
      }
    })

    observer.observe(sentinel)

    return () => observer.disconnect()
  }, [loadMore])

  if (isInitialLoad) {
    return (
      <div className={styles.initialLoad}>
        <CircularProgress data-test="spm-loading" />
      </div>
    )
  }

  return (
    <>
      {error && <Alert severity="error">Error loading schools: {error.message}</Alert>}

      <IssueKeyLegend />

      <div className={styles.tableScroll}>
        <table className={styles.table} data-test="spm-school-list">
          <thead>
            <tr>
              <th scope="col">School</th>
              <th scope="col">Classes</th>
              <th scope="col">Programmes</th>
              {LAUNCH_HEADINGS.map((heading) => (
                <th scope="col" key={heading}>
                  {heading}
                </th>
              ))}
              <th scope="col">Issues</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => (
              <SchoolRow
                key={school.id}
                school={school}
                row={toSchoolTableRow(school)}
                isExpanded={expandedIds.has(school.id)}
                onToggle={toggleSchool}
              />
            ))}
          </tbody>
        </table>
      </div>

      {!schools.length && !error && (
        <p className={styles.emptyState} data-test="spm-schools-empty">
          {toSchoolsEmptyMessage(launchFilters)}
        </p>
      )}

      {hasMoreSchools && (
        <div ref={sentinelRef} className={styles.loadMoreSentinel}>
          <span>{`+ ${remainingSchoolCount} more schools`}</span>
          {isLoadingMore && <CircularProgress size={16} data-test="spm-loading-more" />}
        </div>
      )}
    </>
  )
}

export default SchoolsTable
