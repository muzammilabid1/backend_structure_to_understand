import type { SpmEngagementMetric } from '@/types/spm'

/** A school with no matching row has no engagement to report, which is not the same as zero. */
export const toEngagementMetric = (
  activePercent: number | null | undefined
): SpmEngagementMetric => {
  const value = activePercent ?? null

  return { activePercent: value, inactivePercent: value !== null ? 100 - value : null }
}

export const toIsoStringOrNull = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null
