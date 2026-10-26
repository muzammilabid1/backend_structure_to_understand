import { Field, ObjectType } from '@nestjs/graphql';
import { SchoolImpactReportType } from 'lwp-shared';
import { AdminField, AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminWriteAllRead } from 'src/auth/authorizers/AdminWriteAllRead';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    RelationId,
    UpdateDateColumn
} from 'typeorm';

import { ImpactReportVersion } from './../types/ImpactReportVersion';
import { dateValueTransformer } from './lib/date_value_transformer';
import { LwpSchoolDates } from './lwp_school_dates';
import { LwpSchoolImpactReportFeedback } from './lwp_school_impact_report_feedback';
import { LwpSchoolImpactReportGraphs } from './lwp_school_impact_report_graphs';
import { DateOnly } from './scalar/DateOnly.scalar';
import { LwpSchool } from './school';
import { StaticLwpPeriod } from './static_period';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(LwpSchoolImpactReport, AdminWriteAllRead)
export class LwpSchoolImpactReport extends BaseAuthorizerEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
    id: string;

    @Field()
    @Column({ default: false })
    @AuthorizeField(TeacherField)
    isPublished: boolean;

    @Field(() => ImpactReportVersion)
    @Column({ default: ImpactReportVersion.VERSION_1 })
    @AuthorizeField(UnrestrictedField)
    version: ImpactReportVersion;

    @Field(() => DateOnly, { nullable: true })
    @Column({ nullable: true, type: 'date', transformer: dateValueTransformer })
    @AuthorizeField(UnrestrictedField)
    launchDate: Date;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    activeFamiliesPercentage: number;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    activePremiumFamiliesPercentage: number;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    activeFamiliesPercentageAllSchools: number;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    activePremiumFamiliesPercentageAllSchools: number;

    @Field()
    @Column({ default: true })
    @AuthorizeField(UnrestrictedField)
    showNationalDataAverage: boolean;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    numberOfWeeks: number;

    // This will be set when the all classes have the same reading target in the selected period
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    weeklyReadingTarget: number;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    numberOfClasses: number;

    @Field(() => SchoolImpactReportType, { nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    reportType: SchoolImpactReportType;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    yearGroupCoverage: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    spmNote: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    spmNextStepsProgram: string;

    @ManyToOne(() => StaticLwpPeriod, (t) => t.impactReports, { onDelete: 'RESTRICT' })
    @Field(() => StaticLwpPeriod, { nullable: true })
    @AuthorizeField(TeacherField)
    period: StaticLwpPeriod;

    @ManyToOne(() => LwpSchoolDates, (t) => t.impactReports, { onDelete: 'RESTRICT' })
    @Field(() => LwpSchoolDates, { nullable: true })
    @AuthorizeField(TeacherField)
    term: LwpSchoolDates;

    @RelationId((impactReport: LwpSchoolImpactReport) => impactReport.term)
    termId: string;

    @AuthorizeField(TeacherField)
    @ManyToOne(() => LwpSchool, (t) => t.impactReports, { onDelete: 'CASCADE' })
    @Field(() => LwpSchool, { nullable: true })
    school: LwpSchool;

    @RelationId((impactReport: LwpSchoolImpactReport) => impactReport.school)
    schoolId: string;

    @OneToMany(() => LwpSchoolImpactReportFeedback, (t) => t.impactReport)
    @Field(() => [LwpSchoolImpactReportFeedback], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    feedbacks: LwpSchoolImpactReportFeedback[];

    @OneToMany(() => LwpSchoolImpactReportGraphs, (t) => t.impactReport)
    @Field(() => [LwpSchoolImpactReportGraphs], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    graphs: LwpSchoolImpactReportGraphs[];

    @RelationId((impactReport: LwpSchoolImpactReport) => impactReport.period)
    periodIndex: number;

    @CreateDateColumn({
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    @AuthorizeField(TeacherField)
    logCreatedAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    @AuthorizeField(TeacherField)
    logUpdatedAt: Date;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logCreatedBy.id'])
    @AuthorizeField(TeacherField)
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    @AuthorizeField(TeacherField)
    logUpdatedBy: LwpUser;

    // if the report is draft and has a published version then this will be true to show the user that there is a published version of this report available
    @Field({ nullable: true })
    @AuthorizeField(AdminField)
    hasPublishedVersion: boolean;
}
