import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';

import { LwpDemoActivityFeedback } from '../entities/demo_activity_feedback';
import { WithPagination } from './WithPagination';

@ObjectType()
export class DemoActivityFeedbackOutput extends WithPagination {
    @Field(() => [LwpDemoActivityFeedback])
    @AuthorizeField(UnrestrictedField)
    results: LwpDemoActivityFeedback[];
}
