import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TrustedUserField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { Delegate } from 'src/auth/authorizers/Delegate';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { UserAssociatedLoginType } from '../model';
import { LwpUser } from './user';

@Entity()
@ObjectType()
@ActsAsAuthorizer(LwpUserAssociatedLogin, Delegate(() => LwpUser, 'user'))
export class LwpUserAssociatedLogin extends BaseAuthorizerEntity {
    @Column({ unique: true })
    @Field()
    @Index({ unique: true })
    @AuthorizeField(TrustedUserField)
    accountId: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TrustedUserField)
    firstname: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TrustedUserField)
    lastname: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TrustedUserField)
    email: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TrustedUserField)
    picture: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TrustedUserField)
    phone: string;

    @Column({ default: 'MICROSOFT' })
    @Field(() => UserAssociatedLoginType)
    @AuthorizeField(TrustedUserField)
    accountType: UserAssociatedLoginType;

    @ManyToOne(() => LwpUser, (child) => child.socialAccounts, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    @Field(() => LwpUser)
    @AuthorizeField(TrustedUserField)
    user: LwpUser;

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(TrustedUserField)
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
    @Index(['logCreatedBy.id'])
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    logUpdatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser, { nullable: true })
    @Index()
    deletedBy?: LwpUser;
}
