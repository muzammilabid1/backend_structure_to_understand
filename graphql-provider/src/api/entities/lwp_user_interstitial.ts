import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { UserType } from 'src/auth/types/UserType';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { StaticLwpInterstitial } from './static_lwp_interstitial';
import { LwpUser } from './user';

@Entity()
@ObjectType()
@Index('idx_unique_user_interstitial', ['user', 'interstitial'], { unique: true }) // for documentation
@ActsAsAuthorizer(LwpUserInterstitial, async ({ id, token }) => {
    if (token.userType === UserType.ADMIN) return '*';

    return (await LwpUserInterstitial.createQueryBuilder('lui')
        .innerJoin('lui.user', 'lu')
        .where('lu.id = :id', { id: token.sub })
        .andWhere('id = :id', { id })
        .getCount()) == 1
        ? '*'
        : false;
})
export class LwpUserInterstitial extends BaseAuthorizerEntity {
    @ManyToOne(() => LwpUser, (i) => i.lwpUserInterstitial, { onDelete: 'CASCADE' })
    @Field(() => LwpUser, { nullable: true })
    @Index(['user.id'])
    user: LwpUser;

    @ManyToOne(() => StaticLwpInterstitial, (interstitial) => interstitial.lwpUserInterstitial, { onDelete: 'CASCADE' })
    @Field(() => StaticLwpInterstitial, { nullable: true })
    interstitial: StaticLwpInterstitial;

    @Field()
    @Column({ default: false })
    completed: boolean;

    @Field()
    @Column({ default: false })
    optedOut: boolean;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['deletedBy.id'])
    deletedBy: LwpUser;

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
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
}
