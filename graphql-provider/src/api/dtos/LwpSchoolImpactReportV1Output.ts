import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';

import { LwpSchoolImpactReport } from '../entities/lwp_school_impact_report';
import { EngagementStatisticsOutput } from './EngagementStatisticsOutput';

@ObjectType()
export class LwpSchoolImpactReportV1Output extends LwpSchoolImpactReport {
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    premiumPupilsCount: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    pupilsCount: number;

    @Field(() => [EngagementStatisticsOutput], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    engagementByYearGroup: EngagementStatisticsOutput[];

    @Field(() => [EngagementStatisticsOutput], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    engagementByClass: EngagementStatisticsOutput[];

    @Field(() => [EngagementStatisticsOutput], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    avgWeeklyTargetMetByYearGroup: EngagementStatisticsOutput[];

    @Field(() => [EngagementStatisticsOutput], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    avgWeeklyTargetMetByClass: EngagementStatisticsOutput[];

    @Field(() => [EngagementStatisticsOutput], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    avgTopicSetByYearGroup: EngagementStatisticsOutput[];

    @Field(() => [EngagementStatisticsOutput], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    avgTopicSetByClass: EngagementStatisticsOutput[];

    @Field(() => [EngagementStatisticsOutput], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    buildingEngagement: EngagementStatisticsOutput[];
}
