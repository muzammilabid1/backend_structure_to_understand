import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';

@ObjectType()
export class EngagementStatisticsOutput {
    @Field()
    @AuthorizeField(UnrestrictedField)
    name: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    activeFamiliesPercentage: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    activePremiumFamiliesPercentage: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    premiumPupilCount: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    allPupilsCount: number;
}
