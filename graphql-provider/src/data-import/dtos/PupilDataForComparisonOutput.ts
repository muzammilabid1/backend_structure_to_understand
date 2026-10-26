import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { PupilDetails } from './PupilDetails';

@ObjectType()
export class PupilDataForComparisonOutput {
    @Field()
    @AuthorizeField(TeacherField)
    importedStudent: PupilDetails;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    platformPupil?: PupilDetails;
}
