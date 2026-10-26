import { Field, InputType } from '@nestjs/graphql';
import { WholeSchoolSequenceStatus } from 'lwp-shared/enums';

/**
 * Filters for the admin whole-school sequence list.
 *
 * There is no search filter, unlike on topic sequences: there is no free text on the row to search,
 * and subject and academic year are both exact.
 */
@InputType()
export class WholeSchoolSequenceFilterInput {
    @Field({ nullable: true })
    subjectId?: string;

    @Field({ nullable: true })
    periodIndex?: number;

    @Field(() => WholeSchoolSequenceStatus, { nullable: true })
    status?: WholeSchoolSequenceStatus;
}
