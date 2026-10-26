import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { PupilSummary } from './PupilSummary';

@ObjectType()
export class PendingPupilLinkOutput {
    @Field()
    @AuthorizeField(TeacherField)
    importedStudent: PupilSummary;

    @Field(() => [PupilSummary])
    @AuthorizeField(TeacherField)
    proposedPlatformPupilLinks: PupilSummary[];
}
