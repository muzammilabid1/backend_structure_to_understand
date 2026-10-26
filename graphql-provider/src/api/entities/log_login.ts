import { Field, ObjectType } from '@nestjs/graphql';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { AuthMethod } from 'src/auth/types/AuthMethod';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { UserType } from 'src/auth/types/UserType';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { LogResults } from '../model';

@Entity()
@ObjectType()
@ActsAsAuthorizer(LogLwpLogin, AdminOnly)
export class LogLwpLogin extends BaseAuthorizerEntity {
    @Column({ nullable: true })
    @Field({ nullable: true })
    browser: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    userAgent: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    ipAddress: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    userEmail: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    userPhoneNumber: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    userType: UserType;

    @Column({ nullable: true })
    @Field({ nullable: true })
    loginType: AuthMethod;

    @Column({ default: 'ERROR' })
    @Field(() => LogResults, { nullable: true })
    result: LogResults;

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

    // @ManyToOne(() => LwpUser, (user) => user.id, { nullable: true })
    // @Field(() => LwpUser)
    // logCreatedBy: LwpUser;

    // @ManyToOne(() => LwpUser, (user) => user.id, { nullable: true })
    // @Field(() => LwpUser)
    // logUpdatedBy: LwpUser;
}
