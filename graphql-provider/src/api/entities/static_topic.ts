import { Field, ObjectType } from '@nestjs/graphql';
import { AdminField, AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminWriteAllRead } from 'src/auth/authorizers/AdminWriteAllRead';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

import { StaticLwpActivity } from './activity';
import { LwpClassTopic } from './class_topic';
import { LwpPupilTopic } from './pupil_topic';
import { StaticLwpSchoolTag } from './static_lwp_school_tag';
import { StaticLwpTopicTag } from './static_lwp_topic_tag';
import { StaticLwpTopicDomainYearGroup } from './static_topic_domain_year_group';
import { StaticLwpTopicDomain } from './topic_domain';
import { LwpUser } from './user';
import { StaticLwpYearGroup } from './year_group';

@ObjectType()
@Entity()
@ActsAsAuthorizer(StaticLwpTopic, AdminWriteAllRead)
export class StaticLwpTopic extends BaseAuthorizerEntity {
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    teacherTopicName: string;

    /** ID of Vimeo video */
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    video: string;

    /** URL of thumbnail to be displayed when the topic appears in the list */
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    videoThumb: string;

    @ManyToMany(() => StaticLwpTopicTag, (child) => child.topics, { onDelete: 'CASCADE' })
    @JoinTable({ name: 'lwp_topic_tags' })
    @Field(() => [StaticLwpTopicTag], { nullable: true })
    tags: StaticLwpTopicTag[];

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    teacherPdf: string;

    /** Any file the teacher needs for the topic - slides, notes, a worksheet. teacherPdf stays the printable handouts. */
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    teacherResource: string;

    @OneToMany(() => LwpPupilTopic, (child) => child.topic)
    @Field(() => [LwpPupilTopic], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    pupilTopics: LwpPupilTopic[];

    @OneToMany(() => LwpClassTopic, (child) => child.topic)
    @Field(() => [LwpClassTopic], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    classTopics: LwpClassTopic[];

    @ManyToMany(() => StaticLwpSchoolTag, (child) => child.topics, { onDelete: 'CASCADE' })
    @Field(() => [StaticLwpSchoolTag], { nullable: true })
    schoolTags: StaticLwpSchoolTag[];

    @OneToMany(() => StaticLwpActivity, (child) => child.topic)
    @Field(() => [StaticLwpActivity], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    activities: StaticLwpActivity[];

    /** Description shown to the teacher */
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    teacherDescription: string;

    @Field()
    @Column({ default: false })
    @AuthorizeField(UnrestrictedField)
    isReading: boolean;

    // extra columns
    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    printablesFile: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    parentTopicName: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    scrapbookPrompt: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    teacherEmailBody: string;

    @Field(() => [StaticLwpTopicDomainYearGroup])
    @OneToMany(() => StaticLwpTopicDomainYearGroup, (child) => child.topic)
    @AuthorizeField(TeacherField)
    domainsAndYearGroups: StaticLwpTopicDomainYearGroup[];

    @Field(() => [StaticLwpTopicDomain])
    @AuthorizeField(TeacherField)
    domains: StaticLwpTopicDomain[];

    @Field(() => [StaticLwpYearGroup])
    @AuthorizeField(UnrestrictedField)
    yearGroups: StaticLwpYearGroup[];

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    year: string;

    @Field({ nullable: true })
    @Column({ nullable: true, default: false })
    @AuthorizeField(UnrestrictedField)
    isDemo: boolean;

    @Field({ nullable: true })
    @Column({ nullable: true, default: false })
    isHidden: boolean;

    @Field()
    @Column({ default: true })
    isPublished: boolean;

    @Field()
    @Column({ default: false })
    @AuthorizeField(TeacherField)
    isTeacherPdfRequired: boolean;

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
    id: string;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index()
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
    @Index(['logCreatedBy.id'])
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    logUpdatedBy: LwpUser;

    @Field()
    @AuthorizeField(UnrestrictedField)
    isReadyTeddyTopic: boolean;

    @Field()
    @AuthorizeField(UnrestrictedField)
    hasSetByTeacherSteps: boolean;

    @Field()
    @Column({ default: false })
    @AuthorizeField(UnrestrictedField)
    noVideo: boolean;

    @Field()
    @AuthorizeField(AdminField)
    hasBeenReleasedInCurrentOrFutureAcademicYear: boolean;
}
