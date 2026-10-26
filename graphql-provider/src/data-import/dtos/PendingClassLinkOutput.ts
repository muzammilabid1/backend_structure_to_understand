import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { ClassSummary } from './ClassSummary';

@ObjectType()
export class PendingClassLinkOutput {
    @Field()
    @AuthorizeField(TeacherField)
    importedSchoolClass: ClassSummary;

    @Field(() => [ClassSummary])
    @AuthorizeField(TeacherField)
    proposedPlatformSchoolClasses: ClassSummary[];
}
