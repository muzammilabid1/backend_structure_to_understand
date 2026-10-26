import ReactECharts from 'echarts-for-react'
import { useEffect, useRef, useState } from 'react'
import styles from './index.module.scss'

export interface BarGraphSeries {
  dataKey: string
  label: string
  color: string
}

interface BarGraphProps {
  data: Array<{ [key: string]: string | number }>
  series: BarGraphSeries[]
  xAxisLabel?: string
  yAxisLabel?: string
  minHeight?: number
}

function getLabelRotate(containerWidth: number, categoryCount: number): number {
  if (categoryCount === 0) return 0
  const pxPerLabel = containerWidth / categoryCount
  if (pxPerLabel >= 80) return 0
  if (pxPerLabel >= 55) return 35
  if (pxPerLabel >= 35) return 45
  if (pxPerLabel >= 20) return 65

  return 90
}

export default function BarGraph({
  data,
  series,
  xAxisLabel,
  yAxisLabel,
  minHeight = 400,
}: BarGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const categories = data.map((d) => String(d.name))
  const rotate = getLabelRotate(containerWidth, categories.length)

  const option = {
    backgroundColor: 'transparent',
    grid: {
      left: '3%',
      right: '4%',
      bottom: rotate > 0 ? '15%' : '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        rotate,
        interval: 0,
        hideOverlap: true,
        fontSize: 10,
        color: '#6b7280',
      },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { lineStyle: { color: '#e5e7eb' } },
      name: xAxisLabel,
      nameLocation: 'middle',
      nameGap: rotate > 0 ? 50 : 35,
      nameTextStyle: { fontSize: 12, color: '#374151' },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: {
        formatter: (value: number) => value.toLocaleString(),
        fontSize: 12,
        color: '#6b7280',
      },
      name: yAxisLabel,
      nameLocation: 'middle',
      nameGap: 50,
      nameTextStyle: { fontSize: 12, color: '#374151' },
    },
    legend: {
      textStyle: { fontSize: 13, color: '#374151' },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: { name: string; color: string; seriesName: string; value: number }) =>
        `<b style="display:block">${params.name}</b><div style="margin-top:5px;color:${params.color}">● ${params.seriesName}: ${Number(params.value).toLocaleString()}</div>`,
      textStyle: {
        fontSize: 14,
        color: '#374151',
      },
    },
    series: series.map((s) => ({
      type: 'bar',
      name: s.label,
      itemStyle: {
        color: s.color,
        borderRadius: [4, 4, 0, 0],
      },
      data: data.map((d) => Number(d[s.dataKey]) || 0),
      barMinHeight: 3,
    })),
  }

  return (
    <div className={styles.barGraphContainer} ref={containerRef}>
      <ReactECharts option={option} style={{ minHeight }} />
    </div>
  )
}
