import { Field, ObjectType } from '@nestjs/graphql';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
@ObjectType()
@ActsAsAuthorizer(LogLwpAccess, AdminOnly)
export class LogLwpAccess extends BaseAuthorizerEntity {
    @Column({ nullable: true })
    @Field({ nullable: true })
    mutationOrQueryName: string;

    @Column({ nullable: true, type: 'bigint' })
    @Field({ nullable: true })
    userId: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    page: string;

    @Field({ nullable: true })
    @Column({ type: 'jsonb', nullable: true, array: false })
    info: string;

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
}
