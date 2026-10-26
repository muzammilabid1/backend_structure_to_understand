import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';

@ObjectType()
export class ThisWeekAndLastWeekReadingLogOutput {
    @Field(() => [LwpPupilFeedback])
    @AuthorizeField(TeacherField)
    current: LwpPupilFeedback[];

    @Field(() => [LwpPupilFeedback])
    @AuthorizeField(TeacherField)
    previous: LwpPupilFeedback[];
}
