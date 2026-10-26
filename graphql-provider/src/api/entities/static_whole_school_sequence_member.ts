import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminWriteAllRead } from 'src/auth/authorizers/AdminWriteAllRead';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, RelationId, Unique, UpdateDateColumn } from 'typeorm';

import { StaticLwpTopicSequence } from './static_topic_sequence';
import { StaticLwpWholeSchoolSequence } from './static_whole_school_sequence';
import { LwpUser } from './user';
import { StaticLwpYearGroup } from './year_group';

/**
 * One year group's place in a whole-school sequence: the existing class sequence that every class in
 * that year group will be given when a school schedules (LEA-6695, part of LEA-6504).
 *
 * A member holds no dates and no order of its own. The sequence it points at already carries a real
 * start and end date on every topic, set once by an admin, and neither this row nor any school ever
 * restates or overrides them.
 */
@ObjectType()
@Entity()
/*
 * One sequence per year group, and one year group per sequence, within a whole-school sequence.
 *
 * Both plain unique keys. The first is the rule the feature is built on: a class is matched to its
 * year group's member, so two members for one year group would make that match ambiguous. The second
 * stops the same sequence being listed twice under different year groups, which the denormalised
 * `yearGroup` below would otherwise permit.
 */
@Unique(['wholeSchoolSequence', 'yearGroup'])
@Unique(['wholeSchoolSequence', 'sequence'])
@ActsAsAuthorizer(StaticLwpWholeSchoolSequenceMember, AdminWriteAllRead)
export class StaticLwpWholeSchoolSequenceMember extends BaseAuthorizerEntity {
    /** CASCADE: members die with their parent, as sequence items die with their sequence. */
    @ManyToOne(() => StaticLwpWholeSchoolSequence, (wholeSchoolSequence) => wholeSchoolSequence.members, {
        nullable: false,
        onDelete: 'CASCADE'
    })
    @Field(() => StaticLwpWholeSchoolSequence)
    @Index()
    @AuthorizeField(UnrestrictedField)
    wholeSchoolSequence: StaticLwpWholeSchoolSequence;

    /**
     * The class sequence this year group receives.
     *
     * **RESTRICT, not SET NULL**, which differs from `LwpClassSequenceAssignment.sequence`. That one
     * survives its sequence being deleted because the class already holds the topics it was given; a
     * member holds nothing at all, so losing the link would silently shrink what every school is
     * offered rather than leave a record of something that happened.
     */
    @ManyToOne(() => StaticLwpTopicSequence, { nullable: false, onDelete: 'RESTRICT' })
    @Field(() => StaticLwpTopicSequence)
    @Index()
    @AuthorizeField(UnrestrictedField)
    sequence: StaticLwpTopicSequence;

    /**
     * The year group this member covers.
     *
     * Denormalised from the sequence, which carries its own year group. Deliberate: it is what makes
     * the unique key above enforceable in the database rather than in code, and it lets the
     * whole-school fan-out match a class to its member without joining through the sequence.
     *
     * It is never taken from the caller. The service reads it off the sequence, so the two cannot
     * disagree.
     */
    @ManyToOne(() => StaticLwpYearGroup, { nullable: false, onDelete: 'RESTRICT' })
    @Field(() => StaticLwpYearGroup)
    @Index()
    @AuthorizeField(UnrestrictedField)
    yearGroup: StaticLwpYearGroup;

    /** The year group's own primary key, so a member can be matched without joining. */
    @RelationId((member: StaticLwpWholeSchoolSequenceMember) => member.yearGroup)
    yearGroupId: string;

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
