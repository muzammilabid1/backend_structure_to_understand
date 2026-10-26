import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

@ObjectType()
export class ParentDetails {
    @Field()
    @AuthorizeField(TeacherField)
    firstname: string;

    @Field()
    @AuthorizeField(TeacherField)
    lastname: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    email?: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    phoneNumber?: string;

    /** Platform-side link status (PupilParentStatus). Absent for imported contacts. */
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    status?: string;
}
