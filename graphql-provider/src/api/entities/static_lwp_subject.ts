import { Field, ObjectType } from '@nestjs/graphql';
import { SubjectProgrammeType } from 'lwp-shared';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminWriteAllRead } from 'src/auth/authorizers/AdminWriteAllRead';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

import { LwpSchoolClass } from './school_class';
import { StaticLwpInterstitial } from './static_lwp_interstitial';
import { StaticLwpTrophy } from './static_trophy';
import { StaticLwpTopicDomain } from './topic_domain';
import { LwpUser } from './user';

@Entity()
@ObjectType()
@ActsAsAuthorizer(StaticLwpSubject, AdminWriteAllRead)
export class StaticLwpSubject extends BaseAuthorizerEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @AuthorizeField(UnrestrictedField)
    @Field()
    id: string;

    @Column({ unique: true })
    @AuthorizeField(UnrestrictedField)
    @Field()
    name: string;

    @Column({ default: SubjectProgrammeType.FULL_PROGRAMME })
    @Field(() => SubjectProgrammeType)
    @AuthorizeField(UnrestrictedField)
    programmeType: SubjectProgrammeType;

    @ManyToMany(() => LwpSchoolClass, (schoolClass) => schoolClass.subjects, { onDelete: 'CASCADE' })
    @JoinTable({ name: 'lwp_class_subjects' })
    @Field(() => [LwpSchoolClass], { nullable: true })
    @AuthorizeField(TeacherField)
    classes: LwpSchoolClass[];

    @ManyToMany(() => StaticLwpTrophy, (child) => child.subjects, { onDelete: 'CASCADE' })
    @Field(() => [StaticLwpTrophy])
    trophies: StaticLwpTrophy[];

    @OneToMany(() => StaticLwpTopicDomain, (topicDomain) => topicDomain.subject)
    @Field(() => [StaticLwpTopicDomain], { nullable: true })
    @AuthorizeField(TeacherField)
    topicDomain: StaticLwpTopicDomain[];

    @OneToMany(() => StaticLwpInterstitial, (siteForm) => siteForm.subject)
    @Field(() => [StaticLwpInterstitial], { nullable: true })
    @AuthorizeField(TeacherField)
    siteForms: StaticLwpInterstitial[];

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
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
    logUpdatedAt: Date;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    logUpdatedBy: LwpUser;
}
