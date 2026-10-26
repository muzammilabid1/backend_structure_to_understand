import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminWriteAllRead } from 'src/auth/authorizers/AdminWriteAllRead';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, Index, ManyToMany, ManyToOne, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { ImportedSchoolClass } from './imported_school_class';
import { LwpSchoolClass } from './school_class';
import { StaticLwpTopicDomainYearGroup } from './static_topic_domain_year_group';
import { StaticLwpTopicDomain } from './topic_domain';
import { LwpUser } from './user';

@Entity()
@ObjectType()
@ActsAsAuthorizer(StaticLwpYearGroup, AdminWriteAllRead)
export class StaticLwpYearGroup extends BaseAuthorizerEntity {
    @Column()
    @Field()
    @AuthorizeField(UnrestrictedField)
    year: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    shortName: string;

    @Field(() => [StaticLwpTopicDomainYearGroup])
    @OneToMany(() => StaticLwpTopicDomainYearGroup, (child) => child.yearGroup)
    @AuthorizeField(TeacherField)
    topicsAndDomains: StaticLwpTopicDomainYearGroup[];

    @ManyToMany(() => StaticLwpTopicDomain, (child) => child.yearGroups, { onDelete: 'CASCADE' })
    @Field(() => [StaticLwpTopicDomain])
    @AuthorizeField(TeacherField)
    domains: StaticLwpTopicDomain[];

    @OneToMany(() => LwpSchoolClass, (c) => c.yearGroup)
    @Field(() => [LwpSchoolClass])
    classes: LwpSchoolClass[];

    @OneToMany(() => ImportedSchoolClass, (c) => c.yearGroup)
    @Field(() => [ImportedSchoolClass])
    importedClasses: ImportedSchoolClass[];

    @Field()
    @Column({ default: false })
    hiddenFromLists: boolean;

    @Column({ type: 'jsonb', nullable: true, default: [] })
    @Field(() => [String])
    mathscotThemes: string[];

    // Common Fields - in future we will reduce this duplication
    @PrimaryColumn({ type: 'bigint' })
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
