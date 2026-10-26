import { Field, ObjectType } from '@nestjs/graphql';
import { ContentStatus } from 'lwp-shared';
import { AdminField, AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminWriteAllRead } from 'src/auth/authorizers/AdminWriteAllRead';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { UserType } from 'src/auth/types/UserType';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import { LwpUserTooltipHistory } from './lwp_user_tooltip_history';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(StaticLwpFeatureTooltip, AdminWriteAllRead)
@Unique('UQ_STATIC_LWP_FEATURE_TOOLTIP_TARGET_ID', ['targetId'])
export class StaticLwpFeatureTooltip extends BaseAuthorizerEntity {
    @OneToMany(() => LwpUserTooltipHistory, (s) => s.featureTooltip, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => [LwpUserTooltipHistory], { nullable: true })
    @AuthorizeField(AdminField)
    history: LwpUserTooltipHistory[];

    @Field()
    @Column()
    @AuthorizeField(UnrestrictedField)
    name: string;

    @Index()
    @Column()
    @Field()
    @AuthorizeField(UnrestrictedField)
    targetId: string;

    @Index({ unique: false })
    @Field()
    @Column()
    @AuthorizeField(UnrestrictedField)
    order: number;

    @Index({ unique: false })
    @Field(() => [UserType])
    @AuthorizeField(AdminField)
    @Column({ type: 'jsonb', default: [] })
    userTypes: UserType[];

    @Index({ unique: false })
    @Column()
    @Field(() => ContentStatus)
    @AuthorizeField(AdminField)
    status: ContentStatus;

    @Field()
    @Column()
    @AuthorizeField(UnrestrictedField)
    message: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    imageUrl: string;

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
    @AuthorizeField(AdminField)
    logCreatedAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    @AuthorizeField(AdminField)
    logUpdatedAt: Date;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL', nullable: true })
    @Field(() => LwpUser, { nullable: true })
    @AuthorizeField(AdminField)
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    logUpdatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @AuthorizeField(AdminField)
    deletedBy: LwpUser;
}
