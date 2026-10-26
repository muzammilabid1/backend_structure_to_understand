import { Field, ObjectType } from '@nestjs/graphql';
import { FeatureCode, FeatureStatus } from 'lwp-shared';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinTable,
    ManyToMany,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

import { StaticLwpSchoolTag } from './static_lwp_school_tag';
import { LwpUser } from './user';

@Entity()
@ObjectType()
@ActsAsAuthorizer(StaticLwpFeatures, AdminOnly)
export class StaticLwpFeatures extends BaseAuthorizerEntity {
    @Column()
    @Field()
    name: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    description: string;

    @Column()
    @Field(() => FeatureStatus)
    status: FeatureStatus;

    @Column()
    @Field(() => FeatureCode)
    @AuthorizeField(TeacherField)
    code: FeatureCode;

    @Column({ default: true })
    @Field()
    includeSchoolsWithTags: boolean;

    @ManyToMany(() => StaticLwpSchoolTag, (tag) => tag.features, { nullable: true, onDelete: 'CASCADE' })
    @Field(() => [StaticLwpSchoolTag], { nullable: true })
    @JoinTable({ name: 'lwp_features_school_tags' })
    @AuthorizeField(TeacherField)
    schoolTags: StaticLwpSchoolTag[];

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @AuthorizeField(UnrestrictedField)
    @Field()
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
