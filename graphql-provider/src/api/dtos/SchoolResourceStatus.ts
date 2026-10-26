import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

@ObjectType()
export class SchoolResourceStatus {
    @Field()
    @AuthorizeField(TeacherField)
    hasReadingClasses: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    hasFullProgramClasses: boolean;
}
