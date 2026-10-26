import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';

import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';

@ObjectType()
export class GetPupilBookHistoryOutput {
    @Field(() => [LwpPupilFeedback])
    @AuthorizeField(UnrestrictedField)
    result: LwpPupilFeedback[];

    @Field()
    @AuthorizeField(UnrestrictedField)
    total: number;
}
