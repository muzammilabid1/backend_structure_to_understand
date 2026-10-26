const countFormatter = new Intl.NumberFormat('en-GB')

export const formatCount = (value: number): string => countFormatter.format(value)
