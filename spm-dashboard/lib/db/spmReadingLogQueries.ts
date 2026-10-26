import { getReadingLogTotalsFromView } from '@/lib/db/spmViewQueries'
import type { SpmReadingLogTotals } from '@/types/spm'

/**
 * A null `schoolId` totals every live school. Both counts come from the nightly metrics view, which
 * splits them by `userType`: teachers log in school, everyone else logs at home.
 */
export async function getReadingLogTotals(
  schoolId: string | null
): Promise<SpmReadingLogTotals | undefined> {
  return getReadingLogTotalsFromView(schoolId)
}
