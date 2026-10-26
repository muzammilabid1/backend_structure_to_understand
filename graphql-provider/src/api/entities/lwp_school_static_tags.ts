import { Field, ObjectType } from '@nestjs/graphql';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import { LwpSchool } from './school';
import { StaticLwpSchoolTag } from './static_lwp_school_tag';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@Unique('UQ_SCHOOL_TAG', ['school', 'tag'])
@Index('idx_unique_school_isprogramtag', ['school', 'isProgramTag'], { unique: true, where: '"isProgramTag" = true' }) // Each school contain only single program tag
@ActsAsAuthorizer(LwpSchoolStaticTags, AdminOnly)
export class LwpSchoolStaticTags extends BaseAuthorizerEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    id: string;

    @ManyToOne(() => StaticLwpSchoolTag, (tag) => tag.schoolAndTag, { onDelete: 'CASCADE' })
    @Field(() => StaticLwpSchoolTag)
    tag: StaticLwpSchoolTag;

    @ManyToOne(() => LwpSchool, (child) => child.schoolTags, { onDelete: 'CASCADE' })
    @Field(() => LwpSchool)
    school: LwpSchool;

    @Column({ default: false })
    @Field()
    isProgramTag: boolean;

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
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    logUpdatedBy: LwpUser;
}
