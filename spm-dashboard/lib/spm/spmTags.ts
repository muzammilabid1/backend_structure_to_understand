/**
 * A school's School Partnership Manager is recorded as a school tag named `SPM: <name>`. The
 * matching is deliberately tolerant of spacing and case, mirroring graphql-provider's
 * `NotificationService.resolveSpmFromTags`, which is where the convention originates.
 *
 * Exported as a string so the same expression drives both the Postgres `~*` filter in
 * `pages/api/spm/tags.ts` and the `RegExp` below.
 */
export const SPM_TAG_NAME_PATTERN = '^\\s*SPM\\s*:'

const SPM_TAG_PREFIX = new RegExp(`${SPM_TAG_NAME_PATTERN}\\s*`, 'i')

export const toSpmName = (tagName: string): string => tagName.replace(SPM_TAG_PREFIX, '').trim()

// Tag ids are Postgres bigints, which node-pg hands back as strings, so they are never narrowed
// to a number. Anything but digits is not an id of ours.
const TAG_ID_PATTERN = /^\d+$/

export const parseSpmTagId = (value: string | string[] | undefined): string | null => {
  const raw = Array.isArray(value) ? value[0] : value

  return raw && TAG_ID_PATTERN.test(raw) ? raw : null
}
