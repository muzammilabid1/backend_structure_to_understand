import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminWriteAllRead } from 'src/auth/authorizers/AdminWriteAllRead';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import { dateValueTransformer } from './lib/date_value_transformer';
import { DateOnly } from './scalar/DateOnly.scalar';
import { StaticLwpTopic } from './static_topic';
import { StaticLwpTopicSequence } from './static_topic_sequence';
import { LwpUser } from './user';

/**
 * One topic's position and dates within a {@link StaticLwpTopicSequence}. The start date is always
 * concrete: entered by the admin in FIXED mode, generated from the start date plus the sequence's
 * interval in INTERVAL mode. The end date is optional, as it is for a manually scheduled class topic.
 */
@ObjectType()
@Entity()
@Unique('UQ_topic_sequence_item_sequence_order', ['sequence', 'order'])
@Unique('UQ_topic_sequence_item_sequence_topic', ['sequence', 'topic'])
@ActsAsAuthorizer(StaticLwpTopicSequenceItem, AdminWriteAllRead)
export class StaticLwpTopicSequenceItem extends BaseAuthorizerEntity {
    @ManyToOne(() => StaticLwpTopicSequence, (sequence) => sequence.items, { nullable: false, onDelete: 'CASCADE' })
    @Field(() => StaticLwpTopicSequence)
    @Index()
    @AuthorizeField(UnrestrictedField)
    sequence: StaticLwpTopicSequence;

    @ManyToOne(() => StaticLwpTopic, { nullable: false, onDelete: 'RESTRICT' })
    @Field(() => StaticLwpTopic)
    @Index()
    @AuthorizeField(UnrestrictedField)
    topic: StaticLwpTopic;

    /** 1-based position in the sequence. Set by the admin for INTERVAL, derived from the dates for FIXED. */
    @Field()
    @Column()
    @AuthorizeField(UnrestrictedField)
    order: number;

    /**
     * When this topic starts, and FIXED sequences only.
     *
     * A FIXED sequence carries concrete dates, and the admin types this one. An INTERVAL sequence
     * carries no dates at all: it is an ordered list of topics, and the anchor and the interval are
     * supplied by the teacher at assignment time, so this is **null** for those (LEA-6594).
     *
     * Nullable for that reason and no other. Do not restore `NOT NULL`: interval sequences created
     * before LEA-6594 still hold the dates that were generated for them, and those are ignored
     * rather than trusted, so the presence of a value here says nothing about whether it means
     * anything.
     */
    @Field(() => DateOnly, { nullable: true })
    @Column({ nullable: true, type: 'date', transformer: dateValueTransformer })
    @AuthorizeField(UnrestrictedField)
    startDate: Date | null;

    /**
     * When this topic ends, and FIXED sequences only, where it is optional.
     *
     * Optional for FIXED, mirroring `dueDate` on {@link LwpClassTopic}: a teacher scheduling a topic
     * by hand must give it a start date but may leave the end open, and a sequenced topic should
     * behave the same. Null for INTERVAL, along with the start date.
     */
    @Field(() => DateOnly, { nullable: true })
    @Column({ nullable: true, type: 'date', transformer: dateValueTransformer })
    @AuthorizeField(UnrestrictedField)
    endDate: Date | null;

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
