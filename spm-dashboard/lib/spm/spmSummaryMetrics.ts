import type { SpmSummary } from '@/types/spm'

const countSubscribedProgrammes = ({ programmes }: SpmSummary): number =>
  programmes.subscriptions.reduce((total, { subscribedCount }) => total + subscribedCount, 0)

export type SummaryMetricCard = {
  title: string
  dataTest: string
  metric?: {
    value: number
    caption: string
  }
}

export const toSummaryMetricCards = (summary: SpmSummary | undefined): SummaryMetricCard[] => [
  {
    title: 'Schools active',
    dataTest: 'spm-schools-active',
    metric: summary && {
      value: summary.schools.activeCount,
      caption: `of ${summary.schools.totalCount} schools`,
    },
  },
  {
    title: 'Classes activated',
    dataTest: 'spm-classes-activated',
    metric: summary && {
      value: summary.classes.activatedCount,
      caption: `of ${summary.classes.contractedCount} contracted`,
    },
  },
  {
    title: 'Programmes launched',
    dataTest: 'spm-programmes-launched',
    metric: summary && {
      value: summary.programmes.launchedCount,
      caption: `of ${countSubscribedProgrammes(summary)} subscribed`,
    },
  },
]
