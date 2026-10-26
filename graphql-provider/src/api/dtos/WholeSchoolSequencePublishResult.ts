import { Field, ObjectType } from '@nestjs/graphql';

import { StaticLwpWholeSchoolSequence } from '../entities/static_whole_school_sequence';
import { StaticLwpYearGroup } from '../entities/year_group';

/**
 * What publishing returns: the published whole-school sequence, and the year groups it does not
 * cover.
 *
 * The uncovered list is a **warning, not an error**. A partial whole-school sequence is valid and
 * publishable: content for one year group is often not ready, and blocking publication on that
 * would hold up every other year group. A class in an uncovered year group is skipped later, with a
 * reason, rather than refused.
 *
 * It is returned rather than merely rendered from what the form already knows, because the answer
 * depends on the year groups that exist in this environment. The form would otherwise be deciding
 * which gaps matter, which is a rule rather than a rendering job.
 */
@ObjectType()
export class WholeSchoolSequencePublishResult {
    @Field(() => StaticLwpWholeSchoolSequence)
    wholeSchoolSequence: StaticLwpWholeSchoolSequence;

    /**
     * Year groups with no member, in the order the admin sees them on the form.
     *
     * Empty when every year group is covered, which is the only case with nothing to warn about.
     * `Unknown` is never in here: it is what the Wonde import assigns to a class it could not map,
     * and it is offered to nobody, so it cannot be a gap.
     */
    @Field(() => [StaticLwpYearGroup])
    uncoveredYearGroups: StaticLwpYearGroup[];
}
