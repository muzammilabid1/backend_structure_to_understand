import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
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
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

import { LwpSchoolStaticTags } from './lwp_school_static_tags';
import { LwpSchool } from './school';
import { StaticLwpFeatures } from './static_lwp_features';
import { StaticLwpInterstitial } from './static_lwp_interstitial';
import { StaticLwpPageAnnouncement } from './static_lwp_page_announcement';
import { StaticLwpProgram } from './static_lwp_program';
import { StaticLwpTopic } from './static_topic';
import { LwpUser } from './user';

@Entity()
@ObjectType()
@ActsAsAuthorizer(StaticLwpSchoolTag, AdminOnly)
export class StaticLwpSchoolTag extends BaseAuthorizerEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    id: string;

    @Column()
    @Field()
    name: string;

    @Field()
    @Column()
    color: string;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index()
    deletedBy: LwpUser;

    @OneToMany(() => StaticLwpProgram, (child) => child.schoolTag)
    @Field(() => [StaticLwpProgram], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    staticPrograms: StaticLwpProgram[];

    @Field(() => [LwpSchool], { nullable: true })
    schools: LwpSchool[];

    @OneToMany(() => LwpSchoolStaticTags, (child) => child.tag)
    @Field(() => [LwpSchoolStaticTags])
    schoolAndTag: LwpSchoolStaticTags[];

    @ManyToMany(() => StaticLwpTopic, (child) => child.schoolTags, { onDelete: 'CASCADE' })
    @JoinTable({ name: 'lwp_topic_school_tags' })
    @Field(() => [StaticLwpTopic], { nullable: true })
    topics: StaticLwpTopic[];

    @ManyToMany(() => StaticLwpFeatures, (feature) => feature.schoolTags, { nullable: true, onDelete: 'CASCADE' })
    @Field(() => [StaticLwpFeatures], { nullable: true })
    features: StaticLwpFeatures[];

    @ManyToMany(() => StaticLwpPageAnnouncement, (spa) => spa.schoolTags, { nullable: true, onDelete: 'CASCADE' })
    @Field(() => [StaticLwpPageAnnouncement], { nullable: true })
    staticPageAnnouncements: StaticLwpPageAnnouncement[];

    @ManyToMany(() => StaticLwpInterstitial, (spa) => spa.schoolTags, { onDelete: 'CASCADE' })
    @Field(() => [StaticLwpInterstitial])
    staticInterstitials: StaticLwpInterstitial[];

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
    @Index()
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index()
    logUpdatedBy: LwpUser;

    @Field(() => Number, { defaultValue: 0 })
    schoolCounts: number;
}
