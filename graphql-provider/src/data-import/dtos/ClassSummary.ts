import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

@ObjectType()
export class ClassSummary {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field()
    @AuthorizeField(TeacherField)
    name: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    yearGroup?: string;
}
