import { describe, expect, it } from 'vitest'

import { parseSpmTagId, toSpmName } from './spmTags'

describe('toSpmName', () => {
  it('strips the SPM prefix from a tag name', () => {
    expect(toSpmName('SPM: Joanne')).toBe('Joanne')
  })

  it('strips a lowercase prefix', () => {
    expect(toSpmName('spm:joanne')).toBe('joanne')
  })

  it('strips a prefix padded with spaces', () => {
    expect(toSpmName('  SPM :  Joanne  ')).toBe('Joanne')
  })

  it('keeps a name made of several words', () => {
    expect(toSpmName('SPM: Joanne Smith')).toBe('Joanne Smith')
  })

  it('leaves a tag without the prefix untouched', () => {
    expect(toSpmName('Johnson Primary')).toBe('Johnson Primary')
  })
})

describe('parseSpmTagId', () => {
  it('accepts a numeric id', () => {
    expect(parseSpmTagId('42')).toBe('42')
  })

  it('keeps an id too large for a safe integer as a string', () => {
    expect(parseSpmTagId('9007199254740993')).toBe('9007199254740993')
  })

  it('rejects a non-numeric id', () => {
    expect(parseSpmTagId('1; drop table lwp_school')).toBeNull()
  })

  it('rejects an empty id', () => {
    expect(parseSpmTagId('')).toBeNull()
  })

  it('returns null when the parameter is absent', () => {
    expect(parseSpmTagId(undefined)).toBeNull()
  })

  it('reads the first value of a repeated parameter', () => {
    expect(parseSpmTagId(['7', '8'])).toBe('7')
  })
})
