import { Field, ObjectType } from '@nestjs/graphql';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

import { EmailTemplateStatus, EmailTemplateTypes, MessageLogsCountOutput, ScheduleSmsOption, UseEmailOption } from '../model';
import { LwpNotification } from './lwp_notification';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(StaticLwpEmailTemplate, AdminOnly)
export class StaticLwpEmailTemplate extends BaseAuthorizerEntity {
    @Field()
    @Column({ default: 'Learning With Parents' })
    subject: string;

    @Field()
    @Column({ default: 'hello@learningwithparents.com' })
    senderEmail: string;

    @Field()
    @Column({ default: 'Learning With Parents' })
    senderName: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    previewLine: string;

    @Field(() => EmailTemplateTypes, { nullable: true })
    @Column({ nullable: true })
    type: EmailTemplateTypes;

    @Column({ default: true })
    @Field()
    sendEmail: boolean;

    @Column({ default: 'LAYOUT' })
    @Field(() => UseEmailOption)
    emailOption: UseEmailOption;

    @Column({ nullable: true })
    @Field({ nullable: true })
    heading: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    bodyText: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    defaultMessageLayout: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    linkText: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    link: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    wholeEmailContent: string;

    @Column({ default: false })
    @Field()
    multipleSection: boolean;

    @Column({ nullable: true })
    @Field({ nullable: true })
    multipleSectionContent: string;

    @Column({ default: false })
    @Field()
    sendSms: boolean;

    @Column({ nullable: true })
    @Field({ nullable: true })
    smsContent: string;

    @Column({ default: false })
    @Field()
    sendPhoneNotification: boolean;

    @Column({ nullable: true })
    @Field({ nullable: true })
    notificationTitle: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    notificationDescription: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    notificationUrl: string;

    @Column({ default: 'NOW' })
    @Field(() => ScheduleSmsOption)
    scheduleSmsOption: ScheduleSmsOption;

    @Column({ nullable: true })
    @Field({ nullable: true })
    scheduleSmsDateTime: Date;

    @Column()
    @Field(() => EmailTemplateStatus)
    status: EmailTemplateStatus;

    @Field(() => LwpNotification, { nullable: true })
    @OneToOne(() => LwpNotification, (c) => c.emailTemplate, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn()
    lwpNotification?: LwpNotification;

    @Field(() => [String], { nullable: true })
    badParams: string[];

    @Field(() => MessageLogsCountOutput)
    messageLogCount: MessageLogsCountOutput;

    @Field(() => StaticLwpEmailTemplate, { nullable: true })
    draft: StaticLwpEmailTemplate;

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
    @Field(() => LwpUser, { nullable: true })
    @Index(['logUpdatedBy.id'])
    logUpdatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index()
    deletedBy: LwpUser;
}
