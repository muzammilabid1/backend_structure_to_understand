import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { ImportStatus } from '../types/import-status';

@ObjectType()
export class UpdateEntityLinkRequestsOutput {
    @Field(() => ImportStatus)
    @AuthorizeField(TeacherField)
    importStatus: ImportStatus;
}
