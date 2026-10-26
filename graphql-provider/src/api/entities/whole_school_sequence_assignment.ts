import { Field, ObjectType } from '@nestjs/graphql';
import { SequenceAssignmentStatus } from 'lwp-shared/enums';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { Delegate } from 'src/auth/authorizers/Delegate';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, RelationId, UpdateDateColumn } from 'typeorm';

import { LwpSchool } from './school';
import { StaticLwpSubject } from './static_lwp_subject';
import { StaticLwpPeriod } from './static_period';
import { StaticLwpWholeSchoolSequence } from './static_whole_school_sequence';
import { LwpUser } from './user';

/**
 * That a school ran a whole-school sequence, once for one subject and one academic year (LEA-6698,
 * part of LEA-6504).
 *
 * **This is the only per-school row in the entire feature.** A whole-school sequence is global static
 * content: five hundred schools do not produce five hundred schedules, they produce five hundred
 * decisions to accept one schedule, and this table is where those decisions live. Everything a school
 * actually receives is class topics, created through the ordinary class-level write.
 *
 * One run creates one of these plus one `LwpClassSequenceAssignment` per eligible class, every one of
 * them carrying `wholeSchoolAssignmentId` back to this row, all inside a single transaction. That
 * link is what makes a run traceable and what lets LEA-6700's removal find the rows it created.
 *
 * Authorized through the school, which is the established pattern for a school-scoped row and gives
 * the rule this needs without restating it: an admin everywhere, writes only for a leader of that
 * school, nothing at all for anyone at another school. The mutation is separately gated `LeaderOnly`
 * at the endpoint, which is the real gate on the action.
 */
@ObjectType()
@Entity()
/*
 * One live run per school, per subject, per academic year.
 *
 * **Partial, and this one genuinely earns it**, unlike the parent's plain key on
 * `(subjectId, periodIndex)`. `WHERE status = 'ASSIGNED'` is what lets a school schedule the same
 * subject and year again after LEA-6700 removes a run: the removed row keeps its history and stops
 * occupying the slot. A plain key would make one mistake permanent until the next September.
 *
 * Kept as the database's job rather than a check in code. The whole-school run is the one place in
 * this feature where two leaders pressing the button at the same moment is plausible, and only the
 * index can refuse the second one.
 */
@Index('idx_unique_whole_school_assignment_live', ['school', 'subject', 'period'], {
    unique: true,
    where: `"status" = 'ASSIGNED'`
})
@ActsAsAuthorizer(LwpWholeSchoolSequenceAssignment, Delegate(() => LwpSchool, 'school'))
export class LwpWholeSchoolSequenceAssignment extends BaseAuthorizerEntity {
    @ManyToOne(() => LwpSchool, { nullable: false, onDelete: 'CASCADE' })
    @Field(() => LwpSchool)
    @Index()
    @AuthorizeField(TeacherField)
    school: LwpSchool;

    /** The school's own primary key, so a run can be found without joining. */
    @RelationId((assignment: LwpWholeSchoolSequenceAssignment) => assignment.school)
    schoolId: string;

    /**
     * What was run.
     *
     * **Nullable and SET NULL**, mirroring `LwpClassSequenceAssignment.sequence`: the school already
     * holds the topics it was given, so the record of having run should outlive the thing it ran.
     * The snapshot below is what keeps this row readable and keyable once that has happened.
     */
    @ManyToOne(() => StaticLwpWholeSchoolSequence, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => StaticLwpWholeSchoolSequence, { nullable: true })
    @Index()
    @AuthorizeField(TeacherField)
    wholeSchoolSequence: StaticLwpWholeSchoolSequence | null;

    /**
     * Snapshotted from the parent, because subject and academic year together are the identity of a
     * whole-school sequence and this row has to keep answering "what did we schedule, and for which
     * year" after the parent has gone. They are also two thirds of the partial unique key, which
     * could not be enforced through a nullable relation.
     */
    @ManyToOne(() => StaticLwpSubject, { nullable: false, onDelete: 'RESTRICT' })
    @Field(() => StaticLwpSubject)
    @Index()
    @AuthorizeField(TeacherField)
    subject: StaticLwpSubject;

    @RelationId((assignment: LwpWholeSchoolSequenceAssignment) => assignment.subject)
    subjectId: string;

    /**
     * The academic year this was run for.
     *
     * **A relation rather than the bare integer column the ticket specified.** The snapshot this row
     * needs is against the *whole-school sequence* being deleted, not against the period, and periods
     * are static reference data that is never removed. Holding the relation costs nothing, keeps this
     * consistent with `StaticLwpWholeSchoolSequence.period`, and means the row can be labelled
     * "Money Skills 2026-27" from a join rather than from an unrelated lookup, which is the ticket's
     * own stated reason for carrying the year at all.
     */
    @ManyToOne(() => StaticLwpPeriod, { nullable: false, onDelete: 'RESTRICT' })
    @Field(() => StaticLwpPeriod)
    @Index()
    @AuthorizeField(TeacherField)
    period: StaticLwpPeriod;

    /** The period's own primary key, and the third column of the partial unique key. */
    @RelationId((assignment: LwpWholeSchoolSequenceAssignment) => assignment.period)
    periodIndex: number;

    /**
     * Reuses `SequenceAssignmentStatus` rather than introducing a second two-value enum, because it
     * means the same thing here as it does on a class assignment.
     *
     * `REMOVED` is written by LEA-6700, which is also what frees the school to schedule the same
     * subject and year again: the unique index below is partial on `ASSIGNED` for exactly that.
     */
    @Field(() => SequenceAssignmentStatus)
    @Column({ type: 'varchar', default: SequenceAssignmentStatus.ASSIGNED })
    @AuthorizeField(UnrestrictedField)
    status: SequenceAssignmentStatus;

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
