import { Field, ObjectType } from '@nestjs/graphql';
import { PageAnnouncementStatus, PageAnnouncementUserOption } from 'lwp-shared';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminWriteAllRead } from 'src/auth/authorizers/AdminWriteAllRead';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

import { ImageSourceType } from '../types/ImageSourceType';
import { LwpUserPageAnnouncement } from './lwp_user_page_announcement';
import { StaticLwpSchoolTag } from './static_lwp_school_tag';
import { LwpUser } from './user';

@Entity()
@ObjectType()
@ActsAsAuthorizer(StaticLwpPageAnnouncement, AdminWriteAllRead)
export class StaticLwpPageAnnouncement extends BaseAuthorizerEntity {
    @Column({ type: 'jsonb' })
    @Field(() => [PageAnnouncementUserOption])
    @AuthorizeField(UnrestrictedField)
    userOptions: PageAnnouncementUserOption[];

    // Route templates (what `router.pathname` reports) from ANNOUNCEMENT_TARGET_PAGES. Empty means every page.
    @Column({ type: 'jsonb', default: [] })
    @Field(() => [String])
    @AuthorizeField(UnrestrictedField)
    targetPages: string[];

    @Column()
    @Field(() => PageAnnouncementStatus)
    @AuthorizeField(UnrestrictedField)
    status: PageAnnouncementStatus;

    @Column()
    @Field()
    @AuthorizeField(UnrestrictedField)
    title: string;

    @Column()
    @Field()
    @AuthorizeField(UnrestrictedField)
    message: string;

    @Column({ default: 1 })
    @Field()
    @AuthorizeField(UnrestrictedField)
    priority: number;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    imageUrl?: string | null;

    @Column({ nullable: true })
    @Field(() => ImageSourceType, { nullable: true })
    imageType: ImageSourceType | null;

    @Column({ default: false })
    @Field()
    @AuthorizeField(UnrestrictedField)
    includeImage: boolean;

    @ManyToMany(() => StaticLwpSchoolTag, (tag) => tag.staticPageAnnouncements, { nullable: true, onDelete: 'CASCADE' })
    @Field(() => [StaticLwpSchoolTag], { nullable: true })
    @JoinTable({ name: 'lwp_page_announcement_school_tags' })
    @AuthorizeField(UnrestrictedField)
    schoolTags: StaticLwpSchoolTag[];

    @OneToMany(() => LwpUserPageAnnouncement, (u) => u.pageAnnouncement)
    @Field(() => [LwpUserPageAnnouncement])
    lwpUserPageAnnouncements: LwpUserPageAnnouncement[];

    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
    id: string;

    @CreateDateColumn({
        type: 'timestamp',
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

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL', nullable: true })
    @Field(() => LwpUser, { nullable: true })
    logCreatedBy?: LwpUser | null;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL', nullable: true })
    @Field(() => LwpUser, { nullable: true })
    logUpdatedBy?: LwpUser | null;
}
