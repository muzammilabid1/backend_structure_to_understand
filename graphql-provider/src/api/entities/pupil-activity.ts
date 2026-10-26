import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { Delegate } from 'src/auth/authorizers/Delegate';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { StaticLwpActivity } from './activity';
import { LwpPupilFeedback } from './lwp_pupil_feedback';
import { LwpPupil } from './pupil';
import { LwpPupilTopic } from './pupil_topic';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(LwpPupilActivity, Delegate(() => LwpPupil, 'pupil'))
@Index('lwp_pupil_activity_pupilid_activityid_topicid_idx', ['activity.id', 'pupil.id', 'topic.id'])
@Index('lwp_pupil_activity_pupilid_idx', ['pupil.id'])
@Index('lwp_pupil_activity_topicid_idx', ['topic.id'])
export class LwpPupilActivity extends BaseAuthorizerEntity {
    @Field(() => LwpPupil, { nullable: false })
    @ManyToOne(() => LwpPupil, (p) => p.activities, { nullable: false, onDelete: 'CASCADE' })
    @AuthorizeField(UnrestrictedField)
    pupil: LwpPupil;

    @Field(() => [String], { nullable: true })
    @Column({ type: 'jsonb', nullable: true })
    @AuthorizeField(UnrestrictedField)
    mathscotActivityItemIds: (string | number)[];

    @Field(() => StaticLwpActivity)
    @ManyToOne(() => StaticLwpActivity, (p) => p.pupilActivities, { onDelete: 'RESTRICT' })
    @AuthorizeField(UnrestrictedField)
    activity: StaticLwpActivity;

    // @Field(() => LwpPupilFeedback, { nullable: true })
    // @OneToOne(() => LwpPupilFeedback, (p) => p.activity)
    // feedback: LwpPupilFeedback;

    @OneToMany(() => LwpPupilFeedback, (t) => t.activity)
    @Field(() => [LwpPupilFeedback], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    feedbacks: LwpPupilFeedback[];

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    earnedStar: boolean;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    rating: number;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    logFirstAccessed: Date;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    logLastAccessed: Date;

    @Field()
    @Column({ default: 0 })
    @AuthorizeField(TeacherField)
    logAccessedOnDesktop: number;

    @Field()
    @Column({ default: 0 })
    @AuthorizeField(TeacherField)
    logAccessedOnMobile: number;

    @Field({ nullable: true })
    @Column({ type: 'jsonb', nullable: true, array: false, default: null })
    @AuthorizeField(UnrestrictedField)
    context: string;

    @Field()
    @AuthorizeField(UnrestrictedField)
    isInCurrentAcademicYear: boolean;

    @Field()
    @AuthorizeField(UnrestrictedField)
    isInPreviousAcademicYear: boolean;

    // @ManyToOne(() => LwpSchoolClass, (child) => child.topics)
    // @Field(() => LwpSchoolClass, { nullable: true })
    // class: LwpSchoolClass;

    @ManyToOne(() => LwpPupilTopic, (pt) => pt.activities, { onDelete: 'CASCADE' })
    @Field(() => LwpPupilTopic)
    @AuthorizeField(UnrestrictedField)
    topic: LwpPupilTopic;

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
    id: string;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    // needs indexing because of the onDelete SET NULL trigger
    @Index(['deletedBy.id'])
    deletedBy: LwpUser;

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

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    // needs indexing because of the onDelete SET NULL trigger
    @Index(['logCreatedBy.id'])
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    // needs indexing because of the onDelete SET NULL trigger
    @Index(['logUpdatedBy.id'])
    logUpdatedBy: LwpUser;
}
