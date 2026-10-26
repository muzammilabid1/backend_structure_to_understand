import { Field, ObjectType } from '@nestjs/graphql';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { LwpNotificationStatus } from '../model';
import { LwpNotification } from './lwp_notification';

@Entity()
@Index(['notification', 'status'])
@ObjectType()
@ActsAsAuthorizer(LwpNotificationEventHistory, AdminOnly)
export class LwpNotificationEventHistory extends BaseAuthorizerEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    id: string;

    @Column({ nullable: true, default: LwpNotificationStatus.WAITING, type: 'enum', enum: LwpNotificationStatus })
    @Field(() => LwpNotificationStatus)
    @Index()
    status: LwpNotificationStatus;

    @ManyToOne(() => LwpNotification, (t) => t.statusHistory, { onDelete: 'CASCADE' })
    @Field(() => LwpNotification, { nullable: true })
    notification: LwpNotification;

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

    @Column({ nullable: true, default: null, type: 'jsonb' })
    @Field({ nullable: true })
    error: string;
}
