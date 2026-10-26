const READING_LOGS_ENDPOINT = '/api/spm/reading-logs'

export const toReadingLogsKey = (schoolId: string | null): string =>
  schoolId
    ? `${READING_LOGS_ENDPOINT}?schoolId=${encodeURIComponent(schoolId)}`
    : READING_LOGS_ENDPOINT
