import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

@ObjectType()
export class ParentInfoOfPupilOutput {
    @Field()
    @AuthorizeField(TeacherField)
    fullname: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    email: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    phoneNumber: string;
}
