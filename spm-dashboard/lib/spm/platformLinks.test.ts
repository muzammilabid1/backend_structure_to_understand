import { describe, expect, it } from 'vitest'

import { toSchoolAdminUrl } from './platformLinks'

describe('toSchoolAdminUrl', () => {
  it('builds an admin school url from the platform base url', () => {
    expect(toSchoolAdminUrl('42', 'https://explore.learningwithparents.com')).toBe(
      'https://explore.learningwithparents.com/admin/school/42'
    )
  })

  it('builds an admin school url for the dev environment', () => {
    expect(toSchoolAdminUrl('42', 'http://explore.dev.learningwithparents.com')).toBe(
      'http://explore.dev.learningwithparents.com/admin/school/42'
    )
  })

  it('keeps the port when running against a local platform', () => {
    expect(toSchoolAdminUrl('42', 'http://localhost:3000')).toBe(
      'http://localhost:3000/admin/school/42'
    )
  })

  it('does not double up the slash when the base url has a trailing one', () => {
    expect(toSchoolAdminUrl('42', 'https://explore.staging.learningwithparents.com/')).toBe(
      'https://explore.staging.learningwithparents.com/admin/school/42'
    )
  })

  it('returns null when the base url is missing', () => {
    expect(toSchoolAdminUrl('42', '')).toBeNull()
    expect(toSchoolAdminUrl('42', '   ')).toBeNull()
  })

  it('returns null when the school id is missing', () => {
    expect(toSchoolAdminUrl('', 'https://explore.learningwithparents.com')).toBeNull()
  })
})
