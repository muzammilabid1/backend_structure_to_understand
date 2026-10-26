import { Field, ObjectType } from '@nestjs/graphql';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, Index, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { StaticLwpTopic } from './static_topic';
import { LwpUser } from './user';

@Entity()
@ObjectType()
@ActsAsAuthorizer(StaticLwpTopicTag, AdminOnly)
export class StaticLwpTopicTag extends BaseAuthorizerEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    id: string;

    @Column()
    @Field()
    name: string;

    @Field()
    @Column()
    color: string;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index()
    deletedBy: LwpUser;

    @ManyToMany(() => StaticLwpTopic, (child) => child.tags, { onDelete: 'CASCADE' })
    @Field(() => [StaticLwpTopic], { nullable: true })
    topics: StaticLwpTopic[];

    @CreateDateColumn({
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
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
    @Index()
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index()
    logUpdatedBy: LwpUser;

    @Field()
    topicCount: number;
}
