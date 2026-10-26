import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';

import { StaticLwpTopic } from '../entities/static_topic';

/**
 * Candidate topics for the sequence topic picker, grouped by domain/theme for browsing.
 *
 * This is a purpose-built shape rather than a list of StaticLwpTopicDomain because the domain's
 * own `topics` field resolves every topic in the domain across all year groups. The picker needs
 * only the topics matching the sequence's subject and year group.
 */
@ObjectType()
export class SequenceCandidateTopicGroup {
    @Field()
    @AuthorizeField(UnrestrictedField)
    domainId: string;

    @Field()
    @AuthorizeField(UnrestrictedField)
    domainTitle: string;

    @Field(() => [StaticLwpTopic])
    @AuthorizeField(UnrestrictedField)
    topics: StaticLwpTopic[];
}
