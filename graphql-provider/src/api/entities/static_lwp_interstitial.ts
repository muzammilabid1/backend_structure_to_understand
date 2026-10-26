import { Field, ObjectType } from '@nestjs/graphql';
import { InterstitialLastActionType, InterstitialType, InterstitialUserOption } from 'lwp-shared';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminWriteAllRead } from 'src/auth/authorizers/AdminWriteAllRead';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

import { TypeFormContext } from '../model';
import { LwpUserInterstitial } from './lwp_user_interstitial';
import { StaticLwpSchoolTag } from './static_lwp_school_tag';
import { StaticLwpSubject } from './static_lwp_subject';
import { LwpUser } from './user';

@Entity()
@ObjectType()
@ActsAsAuthorizer(StaticLwpInterstitial, AdminWriteAllRead)
export class StaticLwpInterstitial extends BaseAuthorizerEntity {
    @Column({ default: 'FORM' })
    @Field(() => InterstitialType)
    type: InterstitialType;

    @Column({ default: 'CREATED' })
    @Field(() => InterstitialLastActionType)
    lastAction: InterstitialLastActionType;

    @Column({ nullable: true })
    @Field({ nullable: true })
    lastActionAt: Date;

    @Column()
    @Field()
    @AuthorizeField(UnrestrictedField)
    heading: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    text: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    name: string;

    @Column()
    @Field()
    @AuthorizeField(UnrestrictedField)
    typeformId: string;

    @Column({ default: 0 })
    @Field()
    @AuthorizeField(UnrestrictedField)
    averageTime: number;

    @ManyToMany(() => StaticLwpSchoolTag, (tag) => tag.staticInterstitials, { onDelete: 'CASCADE' })
    @Field(() => [StaticLwpSchoolTag])
    @JoinTable({ name: 'static_lwp_interstitial_school_tags' })
    schoolTags: StaticLwpSchoolTag[];

    @Column({ type: 'jsonb', nullable: true, array: false })
    @Field(() => TypeFormContext, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    context: TypeFormContext;

    @Field(() => [InterstitialUserOption], { nullable: true })
    @Column({ type: 'jsonb', default: [] })
    userOptions: InterstitialUserOption[];

    @OneToMany(() => LwpUserInterstitial, (u) => u.interstitial, { nullable: true })
    @Field(() => [LwpUserInterstitial], { nullable: true })
    lwpUserInterstitial: LwpUserInterstitial[];

    @ManyToOne(() => StaticLwpSubject, (subject) => subject.siteForms, { onDelete: 'SET NULL' })
    @Field(() => StaticLwpSubject, { nullable: true })
    @JoinColumn()
    @AuthorizeField(UnrestrictedField)
    subject: StaticLwpSubject;

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
    id: string;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['deletedBy.id'])
    deletedBy: LwpUser;

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

    @Column({ default: true })
    @Field(() => Boolean)
    @AuthorizeField(UnrestrictedField)
    showQuestion: boolean;
}
