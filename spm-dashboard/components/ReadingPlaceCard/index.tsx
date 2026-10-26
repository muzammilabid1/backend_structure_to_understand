import { Alert, CircularProgress } from '@mui/material'
import { PieChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import { useState } from 'react'
import useSWR from 'swr'

import DashboardCard from '@/components/DashboardCard'
import SchoolFilter from '@/components/SchoolFilter'
import { formatCount } from '@/lib/helpers/formatNumber'
import { toReadingLogsKey } from '@/lib/spm/readingLogsKey'
import { type ReadingPlaceSegment, toReadingPlaceChart } from '@/lib/spm/readingPlaceChart'
import type { SpmReadingLogTotals, SpmSchoolOption } from '@/types/spm'

import styles from './index.module.scss'

// Registering only the pie chart keeps the dashboard bundle off the full echarts build.
echarts.use([PieChart, TooltipComponent, CanvasRenderer])

const CHART_HEIGHT = 220

const toDonutOption = (segments: ReadingPlaceSegment[]) => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'item',
    formatter: ({ dataIndex }: { dataIndex: number }) => {
      const segment = segments[dataIndex]
      return `<b>${segment.label}</b><br/>${formatCount(segment.count)} logs (${segment.percent}%)`
    },
  },
  series: [
    {
      type: 'pie',
      radius: ['58%', '92%'],
      center: ['50%', '50%'],
      label: { show: false },
      labelLine: { show: false },
      emphasis: { scale: false },
      data: segments.map((segment) => ({
        name: segment.label,
        value: segment.count,
        itemStyle: { color: segment.colour, borderWidth: 0 },
      })),
    },
  ],
})

const ReadingPlaceLegend = ({ segments }: { segments: ReadingPlaceSegment[] }) => (
  <ul className={styles.legend}>
    {segments.map((segment) => (
      <li key={segment.label} className={styles.legendItem}>
        <span className={styles.legendSwatch} style={{ background: segment.colour }} />
        {segment.label}
        <span className={styles.legendPercent}>{segment.percent}%</span>
      </li>
    ))}
  </ul>
)

type StatTileProps = {
  value: number
  label: string
  dataTest: string
}

const StatTile = ({ value, label, dataTest }: StatTileProps) => (
  <div className={styles.statTile}>
    <p className={styles.statValue} data-test={dataTest}>
      {formatCount(value)}
    </p>
    <p className={styles.statLabel}>{label}</p>
  </div>
)

const ReadingPlaceChart = ({ readingLogs }: { readingLogs: SpmReadingLogTotals }) => {
  const { totalCount, segments } = toReadingPlaceChart(readingLogs)
  const [atSchool, atHome] = segments

  return (
    <>
      <ReadingPlaceLegend segments={segments} />

      <ReactEChartsCore
        echarts={echarts}
        option={toDonutOption(segments)}
        style={{ height: CHART_HEIGHT }}
      />

      <div className={styles.statTiles}>
        <StatTile value={totalCount} label="total logs" dataTest="spm-reading-total-logs" />
        <StatTile value={atSchool.count} label="at school" dataTest="spm-reading-at-school" />
        <StatTile value={atHome.count} label="at home" dataTest="spm-reading-at-home" />
      </div>
    </>
  )
}

const ReadingPlaceCard = () => {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null)

  const { data: schools, error: schoolsError } =
    useSWR<SpmSchoolOption[]>('/api/spm/school-options')
  const { data, error } = useSWR<SpmReadingLogTotals>(toReadingLogsKey(selectedSchoolId), {
    keepPreviousData: true,
  })

  return (
    <DashboardCard
      title="Reading: school vs home"
      subtitle="Where pupils are logging their reading"
      action={
        <SchoolFilter
          schools={schools ?? []}
          selectedSchoolId={selectedSchoolId}
          onSelect={setSelectedSchoolId}
          isDisabled={!!schoolsError}
        />
      }
    >
      {error && <Alert severity="error">Error loading reading logs: {error.message}</Alert>}

      {!error && !data && (
        <div className={styles.loading}>
          <CircularProgress size={20} data-test="spm-reading-place-loading" />
        </div>
      )}

      {!error && data && <ReadingPlaceChart readingLogs={data} />}
    </DashboardCard>
  )
}

export default ReadingPlaceCard
