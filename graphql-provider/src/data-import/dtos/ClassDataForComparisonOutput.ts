import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { PupilSummary } from './PupilSummary';

@ObjectType()
export class ClassDataForComparisonOutput {
    @Field(() => [PupilSummary])
    @AuthorizeField(TeacherField)
    importedSchoolClassPupilData: PupilSummary[];

    @Field(() => [PupilSummary], { nullable: true })
    @AuthorizeField(TeacherField)
    platformSchoolClassPupilData?: PupilSummary[];
}
