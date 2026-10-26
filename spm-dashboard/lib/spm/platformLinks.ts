const PLATFORM_BASE_URL = process.env.HOSTED_URL ?? ''

export const toSchoolAdminUrl = (schoolId: string, baseUrl = PLATFORM_BASE_URL): string | null => {
  const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, '')
  if (!trimmedBaseUrl || !schoolId) {
    return null
  }

  return `${trimmedBaseUrl}/admin/school/${schoolId}`
}
