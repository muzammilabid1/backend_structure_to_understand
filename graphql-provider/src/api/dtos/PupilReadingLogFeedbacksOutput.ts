import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { DateOnly } from '../entities/scalar/DateOnly.scalar';

@ObjectType()
export class PupilReadingLogFeedbacksOutput {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field(() => DateOnly)
    @AuthorizeField(TeacherField)
    releaseDate: Date;

    @Field()
    @AuthorizeField(TeacherField)
    pupilName: string;

    @Field(() => [LwpPupilFeedback])
    @AuthorizeField(TeacherField)
    readingLogFeedbacks: LwpPupilFeedback[];

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    pupilEarnedStars: number;
}
