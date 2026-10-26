/**
 * Whether a whole-school sequence is still being built or is offered to schools.
 *
 * DRAFT - an admin is still assembling it. Visible in the admin list and nowhere else.
 * PUBLISHED - offered to every school entitled to its subject, on the member sequences' own dates.
 *
 * Publishing is its own action rather than a field an update can set in passing, because it runs
 * checks that saving a draft does not. That mutation arrives in slice 3 (LEA-6696).
 */
export enum WholeSchoolSequenceStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
}
