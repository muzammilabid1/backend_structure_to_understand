import { Field, ObjectType } from '@nestjs/graphql';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { EmailTemplateTypes } from '../model';

enum DeprecatedEmailTemplateTypes {}

@Entity()
@ObjectType()
@Index(['type', 'logCreatedAt'])
@ActsAsAuthorizer(LogStaticLwpEmailTemplateHistory, AdminOnly)
export class LogStaticLwpEmailTemplateHistory extends BaseAuthorizerEntity {
    @Column({ type: 'varchar' })
    type: EmailTemplateTypes | DeprecatedEmailTemplateTypes;

    @Field()
    @Column()
    subject: string;

    @Column()
    senderEmail: string;

    @Column()
    senderName: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    sms: string;

    @Column({ nullable: true, type: 'bigint' })
    schoolId: string;

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @CreateDateColumn({
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    logCreatedAt: Date;
}
