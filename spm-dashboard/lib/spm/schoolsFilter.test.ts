import { describe, expect, it } from 'vitest'

import {
  isAllSchoolsFilterActive,
  isSchoolsFilterActive,
  isTagFilterActive,
  NO_SCHOOLS_FILTER,
  toggleAllSchools,
  toggleSchoolsTag,
  toSelectedTagId,
} from './schoolsFilter'

describe('isSchoolsFilterActive', () => {
  it('asks for no schools by default', () => {
    expect(isSchoolsFilterActive(NO_SCHOOLS_FILTER)).toBe(false)
  })

  it('asks for schools once all schools are wanted', () => {
    expect(isSchoolsFilterActive({ kind: 'all' })).toBe(true)
  })

  it('asks for schools once a tag is picked', () => {
    expect(isSchoolsFilterActive({ kind: 'tag', tagId: '42' })).toBe(true)
  })
})

describe('toSelectedTagId', () => {
  it('reads the picked tag', () => {
    expect(toSelectedTagId({ kind: 'tag', tagId: '42' })).toBe('42')
  })

  it('has no tag when all schools are wanted', () => {
    expect(toSelectedTagId({ kind: 'all' })).toBeNull()
  })
})

describe('toggleAllSchools', () => {
  it('turns all schools on from the default', () => {
    expect(isAllSchoolsFilterActive(toggleAllSchools(NO_SCHOOLS_FILTER))).toBe(true)
  })

  it('turns all schools back off', () => {
    expect(toggleAllSchools({ kind: 'all' })).toEqual(NO_SCHOOLS_FILTER)
  })

  it('replaces a picked tag', () => {
    expect(isAllSchoolsFilterActive(toggleAllSchools({ kind: 'tag', tagId: '42' }))).toBe(true)
  })
})

describe('toggleSchoolsTag', () => {
  it('picks a tag from the default', () => {
    expect(toggleSchoolsTag(NO_SCHOOLS_FILTER, '42')).toEqual({ kind: 'tag', tagId: '42' })
  })

  it('unpicks the tag that is already picked', () => {
    expect(toggleSchoolsTag({ kind: 'tag', tagId: '42' }, '42')).toEqual(NO_SCHOOLS_FILTER)
  })

  it('swaps one picked tag for another', () => {
    expect(toggleSchoolsTag({ kind: 'tag', tagId: '42' }, '7')).toEqual({ kind: 'tag', tagId: '7' })
  })

  it('replaces all schools with the picked tag', () => {
    expect(toggleSchoolsTag({ kind: 'all' }, '42')).toEqual({ kind: 'tag', tagId: '42' })
  })
})

describe('isTagFilterActive', () => {
  it('marks the picked tag', () => {
    expect(isTagFilterActive({ kind: 'tag', tagId: '42' }, '42')).toBe(true)
  })

  it('leaves every tag unpicked while all schools are shown', () => {
    expect(isTagFilterActive({ kind: 'all' }, '42')).toBe(false)
  })
})
