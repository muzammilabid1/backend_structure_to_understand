import { createUnionType, Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { BaseEntity } from 'typeorm';

import { StaticLwpActivitySteps } from '../entities/activity';

export const StepUnion = createUnionType({
    name: 'Step',
    types: () => [StaticLwpActivityLegacy]
});

@ObjectType()
export class StaticLwpActivityLegacy {
    /** Steps that will be included in the activity **/
    @Field(() => [StaticLwpActivitySteps], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    legacySteps: Omit<StaticLwpActivitySteps, keyof BaseEntity>[];
}
