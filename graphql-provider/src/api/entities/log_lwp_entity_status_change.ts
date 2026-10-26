import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, DefaultNamingStrategy, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { LwpPupilParent } from '../entities/pupil_parent';
import { LwpUser } from '../entities/user';

export type StatusChangeEntity = LwpUser | LwpPupilParent;

@Entity()
@ObjectType()
@Index('idx_statusLogs_newStatus_prevStatus_logCreatedAt', ['newStatus', 'previousStatus', 'logCreatedAt'])
@ActsAsAuthorizer(LogLwpEntityStatusChange, AdminOnly)
export class LogLwpEntityStatusChange extends BaseAuthorizerEntity {
    @Column({ nullable: true, type: 'bigint' })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    @Index(['entityId'])
    entityId: string;

    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    @Field({ nullable: true })
    newStatus: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    @Column({ nullable: true })
    previousStatus: string;

    @Field(() => String, { nullable: false })
    @AuthorizeField(TeacherField)
    @Column({ type: 'varchar', nullable: false })
    @Index(['entityType'])
    // If TypeORM ever narrows this type, we will narrow to match.
    entityType: ReturnType<DefaultNamingStrategy['tableName']>;

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
    @AuthorizeField(TeacherField)
    logCreatedAt: Date;
}
