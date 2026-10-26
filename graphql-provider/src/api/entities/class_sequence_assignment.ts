import { Field, ObjectType } from '@nestjs/graphql';
import { SequenceAssignmentStatus } from 'lwp-shared/enums';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import {
    Brackets,
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

import { LwpClassTopic } from './class_topic';
import { dateValueTransformer } from './lib/date_value_transformer';
import { DateOnly } from './scalar/DateOnly.scalar';
import { LwpSchoolClass } from './school_class';
import { StaticLwpTopicSequence } from './static_topic_sequence';
import { LwpUser } from './user';
import { LwpWholeSchoolSequenceAssignment } from './whole_school_sequence_assignment';

/**
 * A {@link StaticLwpTopicSequence} applied to one class. It groups the class topics that
 * were created from the sequence and records their provenance. The per-class dates live on
 * the class topics themselves; startDate here is only the INTERVAL anchor and is NULL for FIXED.
 *
 * The row outlives its sequence: deleting the admin sequence sets sequenceId to NULL and
 * leaves the class topics alone.
 */
@ObjectType()
@Entity()
@ActsAsAuthorizer(LwpClassSequenceAssignment, async ({ id, token, parentId = null }) => {
    if (token.userType === UserType.ADMIN) return '*';
    if (token.userType !== UserType.TEACHER) return false;

    if (id === null) {
        // we're creating an assignment - the parent of an assignment is a class
        if (parentId) {
            return (await LwpSchoolClass.authorize({ id: parentId, opType: OpType.Write, token })) ? '*' : false;
        }

        return false;
    }

    // only allow access to relevant teachers and school leaders

    // A teacher with neither classes nor school-leader scope has nothing to match on. Without this
    // guard the Brackets below adds no conditions, and TypeORM renders an empty bracket as "1=1",
    // collapsing the query to "csa.id = :id" so that every assignment matches and access is granted.
    if (!(token.classIds?.length > 0) && !token.isSchoolLeader) return false;

    const qb = LwpClassSequenceAssignment.createQueryBuilder('csa').innerJoin('csa.class', 'class').where('csa.id = :id', { id });

    if (token.isSchoolLeader) qb.innerJoin('class.school', 'school');

    qb.andWhere(
        new Brackets((qb) => {
            if (token.classIds?.length > 0) {
                qb.where('class.id IN (:...classIds)', { classIds: token.classIds });
            }

            if (token.isSchoolLeader) qb.orWhere('school.id = :schoolId', { schoolId: token.schoolId });
        })
    );

    return (await qb.getCount()) == 1 ? '*' : false;
})
export class LwpClassSequenceAssignment extends BaseAuthorizerEntity {
    @ManyToOne(() => LwpSchoolClass, { nullable: false, onDelete: 'CASCADE' })
    @Field(() => LwpSchoolClass)
    @Index()
    @AuthorizeField(TeacherField)
    class: LwpSchoolClass;

    @ManyToOne(() => StaticLwpTopicSequence, (sequence) => sequence.assignments, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => StaticLwpTopicSequence, { nullable: true })
    @Index()
    @AuthorizeField(UnrestrictedField)
    sequence: StaticLwpTopicSequence;

    /**
     * The whole-school run that created this, or null when a teacher or leader scheduled this class
     * on its own (LEA-6698).
     *
     * **Null for every row that exists today**, and for every row the class-level flow will ever
     * create. It is set only by the whole-school fan-out, which is what makes a run traceable back to
     * the one decision a leader made, and what lets LEA-6700's removal find precisely the assignments
     * that run created rather than guessing from dates or sequence ids.
     *
     * SET NULL rather than CASCADE: if the record of the run goes, this class still holds the topics
     * it was given, exactly as it survives its sequence being deleted.
     */
    @ManyToOne(() => LwpWholeSchoolSequenceAssignment, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => LwpWholeSchoolSequenceAssignment, { nullable: true })
    @Index()
    @AuthorizeField(UnrestrictedField)
    wholeSchoolAssignment: LwpWholeSchoolSequenceAssignment | null;

    /** The run's own primary key, so LEA-6700 can find a run's rows without joining. */
    @RelationId((assignment: LwpClassSequenceAssignment) => assignment.wholeSchoolAssignment)
    wholeSchoolAssignmentId: string | null;

    /** Snapshot of the sequence name, so the assignment stays labelled if the sequence is deleted. */
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    sequenceName: string;

    /** The INTERVAL anchor the leader picked. NULL for FIXED sequences, which carry their own dates. */
    @Field(() => DateOnly, { nullable: true })
    @Column({ type: 'date', nullable: true, transformer: dateValueTransformer })
    @AuthorizeField(UnrestrictedField)
    startDate: Date;

    /**
     * The interval the class's dates were generated from. NULL for FIXED, exactly as startDate is, so
     * the two are read together as the whole recipe for an INTERVAL assignment.
     *
     * **It exists because the sequence is mutable.** `StaticLwpTopicSequence.intervalDays` is the
     * cadence an admin set, and editing it never touches assignments already made, so the template's
     * current value is no evidence of what this class was actually given. Without this row, "why are
     * this class's topics 14 days apart when the sequence says 7" cannot be answered.
     *
     * That reasoning is the whole of it. It used to also record a leader departing from the
     * sequence's cadence for their own class; LEA-6624 removed that, because Ready Teddy is designed
     * to run weekly and letting a school pick its own number changes the programme's outcome. The
     * provenance reason is untouched by that and is why the column stays.
     *
     * **Nothing reads this in product code**, which is the point: it is a record, not an input. Do
     * not conclude from that it is unused and can go.
     *
     * Always set for INTERVAL, copied from the sequence at assignment time. Storing only a deviation
     * would make NULL ambiguous between "took the sequence's" and "predates this column", and
     * resolving that would mean consulting the very template that cannot be trusted.
     */
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    intervalDays: number;

    @Field(() => SequenceAssignmentStatus)
    @Column({ type: 'varchar', default: SequenceAssignmentStatus.ASSIGNED })
    @AuthorizeField(UnrestrictedField)
    status: SequenceAssignmentStatus;

    @OneToMany(() => LwpClassTopic, (child) => child.classSequenceAssignment)
    @Field(() => [LwpClassTopic], { nullable: true })
    @AuthorizeField(TeacherField)
    classTopics: LwpClassTopic[];

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

    /** The leader or teacher who assigned the sequence. */
    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index()
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index()
    logUpdatedBy: LwpUser;
}
