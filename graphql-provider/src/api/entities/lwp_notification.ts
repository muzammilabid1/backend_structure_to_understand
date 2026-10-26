import { Field, ObjectType } from '@nestjs/graphql';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { UserType } from 'src/auth/types/UserType';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { EmailTemplateTypes, LwpNotificationContext, LwpNotificationStatus, NotificationType } from '../model';
import { LwpNotificationEventHistory } from './lwp_notification_event_history';
import { StaticLwpEmailTemplate } from './static_lwp_email_template';
import { LwpUser } from './user';

@Entity()
// Ideally, we might actually rather that this `INCLUDE` status rather than having it as a part of the composite index.
// However, TypeORM offers us no way to `INCLUDE` a column, and this does also facilitate an index-only scan.
// So, let's go for this.
@Index('idx_email_template_type_temporal_search', ['emailTemplateType', 'status', 'logCreatedAt'])
@ObjectType()
@ActsAsAuthorizer(LwpNotification, AdminOnly)
export class LwpNotification extends BaseAuthorizerEntity {
    @Column({ nullable: true })
    @Field({ nullable: true })
    @Index()
    recipient: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @Index()
    apiId: string;

    @Column({ nullable: true, type: 'bigint' })
    @Field({ nullable: true })
    userId: string;

    @Field(() => StaticLwpEmailTemplate)
    @OneToOne(() => StaticLwpEmailTemplate, (c) => c.lwpNotification, { onDelete: 'SET NULL' })
    emailTemplate: StaticLwpEmailTemplate;

    @Column()
    @Field(() => NotificationType)
    notificationType: NotificationType;

    @Column({ nullable: true })
    @Field(() => UserType, { nullable: true })
    userType: UserType;

    @Column({ default: 'deprecatedTemplate' })
    @Field(() => EmailTemplateTypes)
    emailTemplateType: EmailTemplateTypes;

    @Field(() => String, { nullable: true })
    @Column({ type: 'jsonb', nullable: true, array: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: { [key: string]: any };

    @Field(() => [String], { nullable: true })
    @Column({ type: 'jsonb', nullable: true, default: [] })
    badParams: string[];

    @Field(() => LwpNotificationContext, { nullable: true })
    @Column({ type: 'jsonb', nullable: true, array: false })
    context: LwpNotificationContext;

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    id: string;

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
    @Index(['logCreatedBy.id'])
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    logUpdatedBy: LwpUser;

    @OneToMany(() => LwpNotificationEventHistory, (t) => t.notification)
    @Field(() => [LwpNotificationEventHistory])
    statusHistory: LwpNotificationEventHistory[];

    @Column({
        type: 'enum',
        default: LwpNotificationStatus.WAITING,
        enumName: 'lwp_notification_event_history_status_enum',
        insert: false,
        update: false
    })
    @Field(() => LwpNotificationStatus)
    status: LwpNotificationStatus;

    @Field({ nullable: true })
    error: string;
}
