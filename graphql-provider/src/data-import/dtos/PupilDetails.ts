import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PupilStatus } from 'src/api/model';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { ParentDetails } from './ParentDetails';

@ObjectType()
export class PupilDetails {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field()
    @AuthorizeField(TeacherField)
    firstname: string;

    @Field()
    @AuthorizeField(TeacherField)
    lastname: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    schoolClassName?: string;

    @Field()
    @AuthorizeField(TeacherField)
    UPN: string;

    @Field()
    @AuthorizeField(TeacherField)
    dateOfBirth: string;

    @Field()
    @AuthorizeField(TeacherField)
    gender: string;

    @Field()
    @AuthorizeField(TeacherField)
    yearGroup: string;

    @Field(() => [ParentDetails])
    @AuthorizeField(TeacherField)
    parents: ParentDetails[];

    /** Platform pupils only: feedback entries of any kind (activity, reading log, scrapbook) the family left for this pupil. */
    @Field(() => Int, { nullable: true })
    @AuthorizeField(TeacherField)
    feedbackCount?: number;

    /** Platform pupils only: date (YYYY-MM-DD) of the family's most recent feedback entry, if any. */
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    lastActivity?: string;

    /** Platform pupils only: the status the teacher's pupil list shows (lwp_view_pupil_status). */
    @Field(() => PupilStatus, { nullable: true })
    @AuthorizeField(TeacherField)
    pupilStatus?: PupilStatus;

    /** Platform pupils only: true when this pupil was linked to the compared imported student before. */
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    isPreviouslyLinked?: boolean;
}
