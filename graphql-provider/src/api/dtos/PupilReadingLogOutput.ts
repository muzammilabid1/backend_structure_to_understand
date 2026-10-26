import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';

import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { WithPagination } from './WithPagination';

@ObjectType()
export class PupilReadingLogsOutput extends WithPagination {
    @Field(() => [LwpPupilFeedback])
    @AuthorizeField(UnrestrictedField)
    results: LwpPupilFeedback[];
}
