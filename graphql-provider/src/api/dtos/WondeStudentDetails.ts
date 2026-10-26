import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { ImportedContact } from '../entities/imported_contact';

@ObjectType()
export class WondeStudentsDetails {
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    id: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    forename: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    surname: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    importedClassName: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    importedClassYearGroup: string;

    @Field(() => [ImportedContact], { nullable: true })
    @AuthorizeField(TeacherField)
    importedContacts: ImportedContact[];
}
