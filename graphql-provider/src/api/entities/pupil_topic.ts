import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { Delegate } from 'src/auth/authorizers/Delegate';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    RelationId,
    UpdateDateColumn
} from 'typeorm';

import { LwpClassTopic } from './class_topic';
import { dateValueTransformer } from './lib/date_value_transformer';
import { LwpPupilFeedback } from './lwp_pupil_feedback';
import { LwpSetByTeacherStepMedia } from './lwp_set_by_teacher_step_media';
import { LwpPupil } from './pupil';
import { LwpPupilActivity } from './pupil-activity';
import { DateOnly } from './scalar/DateOnly.scalar';
import { LwpSchoolClass } from './school_class';
import { StaticLwpPeriod } from './static_period';
import { StaticLwpTopic } from './static_topic';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(LwpPupilTopic, Delegate(() => LwpPupil, 'pupil'))
@Index('lwp_pupil_topic_pupilid_classtopicid_idx', ['classTopic.id', 'pupil.id'], { unique: true })
@Index('lwp_pupil_topic_pupilid_idx', ['pupil.id'])
@Index('lwp_pupil_topic_pupilid_periodindex_idx', ['pupil.id', 'period.index'])
export class LwpPupilTopic extends BaseAuthorizerEntity {
    @ManyToOne(() => StaticLwpTopic, (child) => child.pupilTopics, { onDelete: 'RESTRICT' })
    @Field(() => StaticLwpTopic, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    topic: StaticLwpTopic;

    @ManyToOne(() => LwpPupil, (child) => child.allTopics, { nullable: false, onDelete: 'CASCADE' })
    @Field(() => LwpPupil, { nullable: false })
    @AuthorizeField(UnrestrictedField)
    pupil: LwpPupil;

    @Field(() => DateOnly)
    @Column({ type: 'date', transformer: dateValueTransformer })
    @AuthorizeField(UnrestrictedField)
    releaseDate: Date;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    watchedVideo: boolean;

    @Field()
    @AuthorizeField(UnrestrictedField)
    isInCurrentAcademicYear: boolean;

    @Field()
    @AuthorizeField(UnrestrictedField)
    isInPreviousAcademicYear: boolean;

    @Field({ nullable: true })
    @Column({ nullable: true, default: false })
    @AuthorizeField(UnrestrictedField)
    earnedGoldStar: boolean;

    @Field({ nullable: true })
    @Column({ nullable: true, default: 0 })
    @AuthorizeField(UnrestrictedField)
    silverStars: number;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    readingTarget: number;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    logOpenedAt: Date;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    logFirstStartedVideo: Date;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    logFirstFinishedVideo: Date;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    logLastStartedVideo: Date;

    @Field()
    @Column({ default: 0 })
    @AuthorizeField(TeacherField)
    logAccessedWithTopicLink: number;

    @Field()
    @Column({ default: 0 })
    @AuthorizeField(TeacherField)
    logAccessedOnDesktop: number;

    @Field()
    @Column({ default: 0 })
    @AuthorizeField(TeacherField)
    logAccessedOnMobile: number;

    @Field(() => [LwpPupilFeedback], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    readingLogFeedbacks: LwpPupilFeedback[];

    @Field(() => LwpSchoolClass, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    class: LwpSchoolClass;

    @OneToMany(() => LwpPupilActivity, (pa) => pa.topic)
    @Field(() => [LwpPupilActivity], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    activities: LwpPupilActivity[];

    @ManyToMany(() => LwpSetByTeacherStepMedia, (media) => media.pupilTopics)
    @Field(() => [LwpSetByTeacherStepMedia], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    setByTeacherMedia: LwpSetByTeacherStepMedia[];

    @ManyToOne(() => LwpClassTopic, (child) => child.pupilTopics, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => LwpClassTopic, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    classTopic: LwpClassTopic;

    @ManyToOne(() => StaticLwpPeriod, (t) => t.schools, { onDelete: 'RESTRICT' })
    @Field(() => StaticLwpPeriod, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    period: StaticLwpPeriod;

    @RelationId((pt: LwpPupilTopic) => pt.period)
    @AuthorizeField(UnrestrictedField)
    periodIndex: number;

    // @OneToMany(() => LwpMagicLink, (t) => t.pupilTopic)
    // @Field(() => [LwpMagicLink], { nullable: true })
    // magicLinks: LwpMagicLink[];

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

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['deletedBy.id'])
    deletedBy: LwpUser;

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
    @Index(['logCreatedBy.id'])
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    logUpdatedBy: LwpUser;

    @Column({ default: false })
    reminderSent: boolean;

    @Column({ default: false })
    reminderSentFor2Days: boolean;

    @Column({ default: false })
    parentsNotified: boolean;
}
