const DAY_MONTH_YEAR_PART_TYPES = ['day', 'month', 'year'] as const

const dayMonthYearFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export const formatDayMonthYear = (isoDate: string): string => {
  const partsByType = new Map(
    dayMonthYearFormatter.formatToParts(new Date(isoDate)).map((part) => [part.type, part.value])
  )
  return DAY_MONTH_YEAR_PART_TYPES.map((type) => partsByType.get(type)).join(' ')
}
