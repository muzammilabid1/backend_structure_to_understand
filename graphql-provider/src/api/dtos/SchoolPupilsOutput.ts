import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { LwpSchoolClass } from '../entities/school_class';

@ObjectType()
export class SchoolPupilsOutput {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field()
    @AuthorizeField(TeacherField)
    fullname: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    yearGroup: string;

    @Field(() => LwpSchoolClass, { nullable: true })
    @AuthorizeField(TeacherField)
    currentClass: LwpSchoolClass;
}
