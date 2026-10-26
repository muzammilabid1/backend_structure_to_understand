import { Field, ObjectType } from '@nestjs/graphql';
import { WholeSchoolSequenceStatus } from 'lwp-shared/enums';
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
    Unique,
    UpdateDateColumn
} from 'typeorm';

import { StaticLwpSubject } from './static_lwp_subject';
import { StaticLwpPeriod } from './static_period';
import { StaticLwpWholeSchoolSequenceMember } from './static_whole_school_sequence_member';
import { LwpUser } from './user';

/**
 * An admin-built set of existing FIXED topic sequences, at most one per year group, scoped to one
 * subject and one academic year. Once published, every school entitled to that subject is offered
 * this same thing on the member sequences' own dates, and a leader schedules their whole school
 * from it in one action (LEA-6504).
 *
 * **It is global static content and belongs to no school.** Five hundred schools do not produce
 * five hundred of these; the only per-school fact in the feature is whether a school has run it,
 * which is a separate table arriving in slice 5.
 *
 * This slice builds the header alone. The members are existing topic sequence rows joined
 * through a table that arrives in slice 2 (LEA-6695), and publishing arrives in slice 3 (LEA-6696).
 */
@ObjectType()
@Entity()
/*
 * One whole-school sequence per subject per academic year, draft or published alike.
 *
 * Plain rather than partial, unlike the per-school assignment index arriving in slice 5. A partial
 * index on PUBLISHED would permit unlimited drafts for the same subject and year with nothing to
 * tell them apart, which is the only case a `name` column would have been needed for. This key is
 * what makes that column redundant rather than merely unnecessary.
 */
@Unique(['subject', 'period'])
@ActsAsAuthorizer(StaticLwpWholeSchoolSequence, AdminWriteAllRead)
export class StaticLwpWholeSchoolSequence extends BaseAuthorizerEntity {
    /**
     * The subject this covers. This column is the entire mechanism for "generic across subjects":
     * nothing else in the schema knows what Money Skills is, and the UI offering only Money Skills
     * for now is a rule about the dropdown rather than about the data.
     */
    @ManyToOne(() => StaticLwpSubject, { nullable: false, onDelete: 'RESTRICT' })
    @Field(() => StaticLwpSubject)
    @Index()
    @AuthorizeField(UnrestrictedField)
    subject: StaticLwpSubject;

    /**
     * The academic year this is for.
     *
     * **NOT NULL here**, unlike on StaticLwpTopicSequence where an INTERVAL sequence carries
     * no year at all. Every member of a whole-school sequence is FIXED, so it always belongs to
     * exactly one year, and that year is half of the identity this row is keyed on.
     */
    @ManyToOne(() => StaticLwpPeriod, { nullable: false, onDelete: 'RESTRICT' })
    @Field(() => StaticLwpPeriod)
    @Index()
    @AuthorizeField(UnrestrictedField)
    period: StaticLwpPeriod;

    /** The period's own primary key, so the year can be filtered on without joining. */
    @RelationId((wholeSchoolSequence: StaticLwpWholeSchoolSequence) => wholeSchoolSequence.period)
    periodIndex: number;

    @Field(() => WholeSchoolSequenceStatus)
    @Column({ type: 'varchar', default: WholeSchoolSequenceStatus.DRAFT })
    @AuthorizeField(UnrestrictedField)
    status: WholeSchoolSequenceStatus;

    /**
     * One existing class sequence per year group.
     *
     * A whole-school sequence with no members, or with only some year groups covered, is still valid
     * and saveable: content for a year group is often not ready, and refusing the save would hold up
     * every other year group. Whether it is complete enough to offer to schools is a publishing
     * question (LEA-6696), not a saving one.
     */
    @OneToMany(() => StaticLwpWholeSchoolSequenceMember, (member) => member.wholeSchoolSequence)
    @Field(() => [StaticLwpWholeSchoolSequenceMember], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    members: StaticLwpWholeSchoolSequenceMember[];

    /**
     * Virtual - whether any school has ever scheduled this, which locks its subject, its academic
     * year and its member list (LEA-6700).
     *
     * Once a school has taken a copy, those three are statements about class topics that exist in
     * real schools. Editing them would retro-change what those schools were told they were given,
     * and there is no name field to leave editable because this object deliberately has none.
     *
     * Resolved and batched, so the admin list costs one query rather than one per row. The sibling
     * of `StaticLwpTopicSequence.hasAssignments`, which locks a class sequence's year the same way.
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
