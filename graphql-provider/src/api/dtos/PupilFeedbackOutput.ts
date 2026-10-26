import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { WithPagination } from './WithPagination';

@ObjectType()
export class PupilFeedbackOutput extends WithPagination {
    @Field(() => [LwpPupilFeedback])
    @AuthorizeField(TeacherField)
    results: LwpPupilFeedback[];
}
