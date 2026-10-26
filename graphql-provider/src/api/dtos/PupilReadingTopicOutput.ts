import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';

import { LwpPupilTopic } from '../entities/pupil_topic';

@ObjectType()
export class PupilReadingTopicOutput {
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    prevReadingTopicId: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    nextReadingTopicId: string;

    @Field(() => LwpPupilTopic, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    readingTopic: LwpPupilTopic;
}
