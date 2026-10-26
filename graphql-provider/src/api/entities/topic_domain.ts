import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
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

import { StaticLwpSubject } from './static_lwp_subject';
import { StaticLwpTopic } from './static_topic';
import { StaticLwpTopicDomainYearGroup } from './static_topic_domain_year_group';
import { LwpUser } from './user';
import { StaticLwpYearGroup } from './year_group';

@Entity()
@ObjectType()
@ActsAsAuthorizer(StaticLwpTopicDomain, AdminWriteAllRead)
export class StaticLwpTopicDomain extends BaseAuthorizerEntity {
    @Column()
    @Field()
    @AuthorizeField(TeacherField)
    title: string;

    @Field(() => [StaticLwpTopicDomainYearGroup])
    @OneToMany(() => StaticLwpTopicDomainYearGroup, (child) => child.domain)
    @AuthorizeField(TeacherField)
    topicsAndYearGroups: StaticLwpTopicDomainYearGroup[];

    @ManyToMany(() => StaticLwpYearGroup, (child) => child.domains, { onDelete: 'CASCADE' })
    @JoinTable({ name: 'lwp_domain_year_groups' })
    @Field(() => [StaticLwpYearGroup])
    @AuthorizeField(TeacherField)
    yearGroups: StaticLwpYearGroup[];

    @Field(() => [StaticLwpTopic])
    @AuthorizeField(TeacherField)
    topics: StaticLwpTopic[];

    @ManyToOne(() => StaticLwpSubject, (child) => child.topicDomain, { onDelete: 'RESTRICT' })
    @Field(() => StaticLwpSubject, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    subject: StaticLwpSubject;

    @Field()
    @AuthorizeField(TeacherField)
    topicCount: number;

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(TeacherField)
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
}
