import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';

import { LwpSchool } from '../entities/school';
import { WithPagination } from './WithPagination';

@ObjectType()
export class SpmSchoolsOutput extends WithPagination {
    @Field(() => [LwpSchool])
    @AuthorizeField(UnrestrictedField)
    results: LwpSchool[];
}
