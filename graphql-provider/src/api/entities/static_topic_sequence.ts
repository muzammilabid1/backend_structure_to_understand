import { Field, ObjectType } from '@nestjs/graphql';
import { SequenceTimingMode } from 'lwp-shared/enums';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminWriteAllRead } from 'src/auth/authorizers/AdminWriteAllRead';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    RelationId,
    UpdateDateColumn
} from 'typeorm';

import { LwpClassSequenceAssignment } from './class_sequence_assignment';
import { StaticLwpSubject } from './static_lwp_subject';
import { StaticLwpPeriod } from './static_period';
import { StaticLwpTopicSequenceItem } from './static_topic_sequence_item';
import { LwpUser } from './user';
import { StaticLwpYearGroup } from './year_group';

/**
 * An admin-built, reusable ordered list of topics with a timing rule. A sequence is scoped
 * to one subject and one year group, and a `FIXED` one to a single academic year as well; a
 * school leader assigns it to a class, which materializes the class's topics (see
 * {@link LwpClassSequenceAssignment}).
 */
@ObjectType()
@Entity()
@ActsAsAuthorizer(StaticLwpTopicSequence, AdminWriteAllRead)
export class StaticLwpTopicSequence extends BaseAuthorizerEntity {
    @Field()
    @Column()
    @AuthorizeField(UnrestrictedField)
    name: string;

    @ManyToOne(() => StaticLwpSubject, { nullable: false, onDelete: 'RESTRICT' })
    @Field(() => StaticLwpSubject)
    @Index()
    @AuthorizeField(UnrestrictedField)
    subject: StaticLwpSubject;

    @ManyToOne(() => StaticLwpYearGroup, { nullable: false, onDelete: 'RESTRICT' })
    @Field(() => StaticLwpYearGroup)
    @Index()
    @AuthorizeField(UnrestrictedField)
    yearGroup: StaticLwpYearGroup;

    /**
     * The academic year this sequence was built for, and only meaningful for `FIXED`.
     *
     * A fixed sequence carries concrete dates, so it belongs to exactly one year: it is only offered
     * while its school is teaching that year, which is what stops a September 2026 sequence being
     * scheduled onto 2025-26 classes and landing topics after their year has ended (LEA-6581).
     *
     * An `INTERVAL` sequence carries no dates at all. It belongs to no year and is offered in every
     * academic year, forever, so this is null for those. Do not "tidy" it back to `nullable: false`:
     * that was the original shape and the team reversed it on 2026-08-27.
     *
     * `RESTRICT` rather than `SET NULL`, matching subject and year group above. Null here carries a
     * meaning of its own, "this sequence has no year", so a fixed sequence must not be able to
     * acquire that meaning by having its period deleted underneath it.
     */
    @ManyToOne(() => StaticLwpPeriod, { nullable: true, onDelete: 'RESTRICT' })
    @Field(() => StaticLwpPeriod, { nullable: true })
    @Index()
    @AuthorizeField(UnrestrictedField)
    period: StaticLwpPeriod | null;

    /**
     * The period's own primary key, so the year can be filtered on without joining.
     *
     * Null for `INTERVAL`. Any SQL filtering on this must carry an explicit interval arm rather than
     * a bare equality, or every interval sequence silently disappears from the result.
     */
    @RelationId((sequence: StaticLwpTopicSequence) => sequence.period)
    periodIndex: number | null;

    @Field(() => SequenceTimingMode)
    @Column({ type: 'varchar' })
    @AuthorizeField(UnrestrictedField)
    timingMode: SequenceTimingMode;

    /**
     * The gap between topic start dates, in days. Required for INTERVAL, unused for FIXED.
     *
     * **The cadence belongs to Learning with Parents rather than to the school.** Ready Teddy is
     * designed to run weekly and schools have been told so, so the pace is a programme decision an
     * admin makes here once, not a per-class choice (LEA-6624).
     *
     * It does not date the items. An INTERVAL sequence's items carry no dates at all (LEA-6594):
     * this is read at assignment time, alongside the anchor the teacher picks, to work out the
     * class's own topic dates.
     *
     * `defaultStartDate` used to sit beside this, was dropped by LEA-6595 and stays gone. The
     * anchor genuinely is the class's to choose, so the sequence had nothing to say about it.
     *
     * Note `LwpClassSequenceAssignment.intervalDays` is a **different** column: that one records the
     * cadence a class was actually given, copied from here when the sequence was assigned. Editing
     * this value does not touch it, which is the whole reason it exists.
     */
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    intervalDays: number;

    @OneToMany(() => StaticLwpTopicSequenceItem, (child) => child.sequence)
    @Field(() => [StaticLwpTopicSequenceItem], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    items: StaticLwpTopicSequenceItem[];

    @OneToMany(() => LwpClassSequenceAssignment, (child) => child.sequence)
    @Field(() => [LwpClassSequenceAssignment], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    assignments: LwpClassSequenceAssignment[];

    /* Virtual - how many topics the sequence holds, for the admin list */
    @Field()
    @AuthorizeField(UnrestrictedField)
    itemCount: number;

    /**
     * Virtual - whether this sequence has ever been assigned to a class, which locks its academic
     * year. Resolved and batched, so the admin list costs one query rather than one per row.
     */
    @Field()
    @AuthorizeField(UnrestrictedField)
    hasAssignments: boolean;

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
    @Index()
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index()
    logUpdatedBy: LwpUser;
}
