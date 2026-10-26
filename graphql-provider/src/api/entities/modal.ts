import { Field, ObjectType } from '@nestjs/graphql';
import { AdminField, AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminWriteAllRead } from 'src/auth/authorizers/AdminWriteAllRead';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { StepUnion } from '../dtos/StaticLwpActivityLegacy';
import { StaticLwpActivity, StaticLwpActivitySteps } from './activity';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(StaticLwpModal, AdminWriteAllRead)
export class StaticLwpModal extends BaseAuthorizerEntity {
    @Column()
    @Field()
    @AuthorizeField(UnrestrictedField)
    name: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(AdminField)
    nameForContentDev: string;

    @Column({ default: 0 })
    @Field()
    @AuthorizeField(AdminField)
    openCount: number;

    @OneToMany(() => StaticLwpActivitySteps, (child) => child.modal, { nullable: true })
    @Field(() => StepUnion, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    steps: Array<typeof StepUnion>;

    /** Activities that use this modal as their rationale. Admin-only; population needs its own resolver when we surface it. */
    @OneToMany(() => StaticLwpActivity, (activity) => activity.rationaleModal, { nullable: true })
    @Field(() => [StaticLwpActivity], { nullable: true })
    @AuthorizeField(AdminField)
    rationaleActivities: StaticLwpActivity[];

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
