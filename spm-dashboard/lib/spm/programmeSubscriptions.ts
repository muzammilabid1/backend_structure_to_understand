import { PROGRAMME_COLOURS } from '@/lib/ui/designTokens'
import type { ProgrammeKey, SpmSummary } from '@/types/spm'

const PROGRAMME_LABELS: Record<ProgrammeKey, string> = {
  digitalReadingLog: 'Digital Reading Log',
  mathsEnglish: 'Maths & English',
  moneySkills: 'Money Skills',
  readyTeddy: 'Ready Teddy',
}

export type ProgrammeSubscriptionRow = {
  key: ProgrammeKey
  label: string
  subscribedCount: number
  launchedCount: number
  schoolCount: number
  subscribedFillPercent: number
  launchedFillPercent: number
  colour: string
}

const toFillPercent = (count: number, schoolCount: number): number =>
  schoolCount === 0 ? 0 : (count / schoolCount) * 100

export const toProgrammeSubscriptionRows = (summary: SpmSummary): ProgrammeSubscriptionRow[] => {
  const schoolCount = summary.schools.totalCount

  return summary.programmes.subscriptions.map(({ key, subscribedCount, launchedCount }) => ({
    key,
    label: PROGRAMME_LABELS[key],
    subscribedCount,
    launchedCount,
    schoolCount,
    subscribedFillPercent: toFillPercent(subscribedCount, schoolCount),
    launchedFillPercent: toFillPercent(launchedCount, schoolCount),
    colour: PROGRAMME_COLOURS[key].line,
  }))
}

export const toProgrammeSubscriptionsSubtitle = (summary: SpmSummary | undefined): string =>
  summary
    ? `Signed up and launched, each of ${summary.schools.totalCount} live schools`
    : 'Signed up and launched per programme'
