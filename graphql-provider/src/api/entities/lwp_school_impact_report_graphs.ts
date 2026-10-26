import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminWriteAllRead } from 'src/auth/authorizers/AdminWriteAllRead';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, RelationId } from 'typeorm';

import { EngagementStatisticsOutput } from '../dtos/EngagementStatisticsOutput';
import { LwpSchoolImpactReport } from './lwp_school_impact_report';
import { StaticLwpSubject } from './static_lwp_subject';

@ObjectType()
@Entity()
@ActsAsAuthorizer(LwpSchoolImpactReportGraphs, AdminWriteAllRead)
export class LwpSchoolImpactReportGraphs extends BaseAuthorizerEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
    id: string;

    @Field(() => LwpSchoolImpactReport)
    @ManyToOne(() => LwpSchoolImpactReport, (t) => t.graphs, { onDelete: 'CASCADE' })
    @AuthorizeField(UnrestrictedField)
    impactReport: LwpSchoolImpactReport;

    @Field(() => StaticLwpSubject, { nullable: true })
    @ManyToOne(() => StaticLwpSubject, (t) => t.id, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    subject: StaticLwpSubject;

    @RelationId((impactReport: LwpSchoolImpactReportGraphs) => impactReport.subject)
    subjectId: string;

    // these counts are used building engagement graph
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    premiumPupilsCount: number;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    pupilsCount: number;

    @Field(() => [EngagementStatisticsOutput], { nullable: true })
    @Column({ type: 'jsonb', nullable: true })
    @AuthorizeField(UnrestrictedField)
    engagementByYearGroup: EngagementStatisticsOutput[];

    @Field(() => [EngagementStatisticsOutput], { nullable: true })
    @Column({ type: 'jsonb', nullable: true })
    @AuthorizeField(UnrestrictedField)
    avgCompletionRateByYearGroup: EngagementStatisticsOutput[];

    @Field(() => [EngagementStatisticsOutput], { nullable: true })
    @Column({ type: 'jsonb', nullable: true })
    @AuthorizeField(UnrestrictedField)
    avgTopicSetByClass: EngagementStatisticsOutput[];

    @Field(() => [EngagementStatisticsOutput], { nullable: true })
    @Column({ type: 'jsonb', nullable: true })
    @AuthorizeField(UnrestrictedField)
    buildingEngagement: EngagementStatisticsOutput[];

    // Legacy graphs
    @Field(() => [EngagementStatisticsOutput], { nullable: true })
    @Column({ type: 'jsonb', nullable: true })
    @AuthorizeField(UnrestrictedField)
    avgTopicSetByYearGroup: EngagementStatisticsOutput[];

    @Field(() => [EngagementStatisticsOutput], { nullable: true })
    @Column({ type: 'jsonb', nullable: true })
    @AuthorizeField(UnrestrictedField)
    avgCompletionRateByClass: EngagementStatisticsOutput[];

    @Field(() => [EngagementStatisticsOutput], { nullable: true })
    @Column({ type: 'jsonb', nullable: true })
    @AuthorizeField(UnrestrictedField)
    engagementByClass: EngagementStatisticsOutput[];
}
