import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminWriteAllRead } from 'src/auth/authorizers/AdminWriteAllRead';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { StaticLwpTopic } from './static_topic';
import { StaticLwpTopicDomain } from './topic_domain';
import { LwpUser } from './user';
import { StaticLwpYearGroup } from './year_group';

@ObjectType()
@Entity()
@ActsAsAuthorizer(StaticLwpTopicDomainYearGroup, AdminWriteAllRead)
export class StaticLwpTopicDomainYearGroup extends BaseAuthorizerEntity {
    @ManyToOne(() => StaticLwpTopic, (child) => child.domainsAndYearGroups, { onDelete: 'CASCADE' })
    @Field(() => StaticLwpTopic)
    @AuthorizeField(TeacherField)
    topic: StaticLwpTopic;

    @ManyToOne(() => StaticLwpTopicDomain, (child) => child.topicsAndYearGroups, { onDelete: 'CASCADE' })
    @Field(() => StaticLwpTopicDomain)
    @AuthorizeField(TeacherField)
    domain: StaticLwpTopicDomain;

    @ManyToOne(() => StaticLwpYearGroup, (child) => child.topicsAndDomains, { onDelete: 'CASCADE' })
    @Field(() => StaticLwpYearGroup)
    @AuthorizeField(TeacherField)
    yearGroup: StaticLwpYearGroup;

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(TeacherField)
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

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index()
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index()
    logUpdatedBy: LwpUser;
}
