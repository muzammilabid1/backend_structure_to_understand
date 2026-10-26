import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';

@ObjectType()
export class AnalyticsEngagementStatisticsOutput {
    @Field()
    @AuthorizeField(UnrestrictedField)
    name: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    allPupilsCount: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    activeFamiliesPercentage: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    premiumPupilCount: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    activePremiumFamiliesPercentage: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    sendPupilCount: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    activeSendFamiliesPercentage: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    ealPupilCount: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    activeEalFamiliesPercentage: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    boysCount: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    activeBoysPercentage: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    girlsCount: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    activeGirlsPercentage: number;
}

@ObjectType()
export class SchoolAnalyticsGraphOutput {
    @Field(() => [AnalyticsEngagementStatisticsOutput], { nullable: true })
    @AuthorizeField(TeacherField)
    graphData: AnalyticsEngagementStatisticsOutput[];

    // These fields are used for building engagement graph
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    allPupilsCount: number;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    premiumPupilCount: number;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    sendPupilCount: number;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    ealPupilCount: number;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    boysCount: number;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    girlsCount: number;
}
