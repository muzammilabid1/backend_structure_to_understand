import { Field, ObjectType } from '@nestjs/graphql';
import { SchoolImpactReportFeedbackContentType } from 'lwp-shared';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { Delegate } from 'src/auth/authorizers/Delegate';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, RelationId, UpdateDateColumn } from 'typeorm';

import { LwpPupilFeedback } from './lwp_pupil_feedback';
import { LwpSchoolImpactReport } from './lwp_school_impact_report';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(LwpSchoolImpactReportFeedback, Delegate(() => LwpSchoolImpactReport, 'impactReport'))
export class LwpSchoolImpactReportFeedback extends BaseAuthorizerEntity {
    @ManyToOne(() => LwpSchoolImpactReport, (t) => t.feedbacks, { nullable: true, onDelete: 'CASCADE' })
    @Field(() => LwpSchoolImpactReport, { nullable: true })
    @JoinColumn()
    @AuthorizeField(TeacherField)
    impactReport: LwpSchoolImpactReport;

    @Field()
    @Column()
    @AuthorizeField(UnrestrictedField)
    content: string;

    @Field(() => SchoolImpactReportFeedbackContentType)
    @Column()
    @AuthorizeField(UnrestrictedField)
    contentType: SchoolImpactReportFeedbackContentType;

    @Field()
    @Column()
    @AuthorizeField(UnrestrictedField)
    pupilFirstName: string;

    @Field()
    @Column()
    @AuthorizeField(UnrestrictedField)
    className: string;

    @Field()
    @Column({ default: false })
    @AuthorizeField(TeacherField)
    includedInImpactReport: boolean;

    @Field()
    @Column()
    @AuthorizeField(UnrestrictedField)
    classYearGroup: string;

    @ManyToOne(() => LwpPupilFeedback, (s) => s.impactReportFeedbacks, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => LwpPupilFeedback, { nullable: true })
    @JoinColumn()
    @AuthorizeField(TeacherField)
    pupilFeedback: LwpPupilFeedback;

    @RelationId((feedback: LwpSchoolImpactReportFeedback) => feedback.pupilFeedback)
    pupilFeedbackId: string;

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
    id: string;

    @CreateDateColumn({
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    @AuthorizeField(UnrestrictedField)
    logCreatedAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    @AuthorizeField(UnrestrictedField)
    logUpdatedAt: Date;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL', nullable: true })
    @Field(() => LwpUser, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    logUpdatedBy: LwpUser;
}
