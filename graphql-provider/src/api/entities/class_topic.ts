import { Field, ObjectType } from '@nestjs/graphql';
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
    Unique,
    UpdateDateColumn
} from 'typeorm';

import { ClassTopicStatistics } from '../model';
import { LwpClassSequenceAssignment } from './class_sequence_assignment';
import { dateValueTransformer } from './lib/date_value_transformer';
import { LwpSetByTeacherStepMedia } from './lwp_set_by_teacher_step_media';
import { LwpPupilTopic } from './pupil_topic';
import { DateOnly } from './scalar/DateOnly.scalar';
import { LwpSchoolClass } from './school_class';
import { StaticLwpTopic } from './static_topic';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(LwpClassTopic, async ({ id, token, parentId = null }) => {
    if (token.userType === UserType.ADMIN) return '*';
    if (token.userType !== UserType.TEACHER) return false;

    if (id === null) {
        // we're creating a topic
        // parent of a ClassTopic is a class!
        if (parentId) {
            return (await LwpSchoolClass.authorize({ id: parentId, opType: OpType.Write, token })) ? '*' : false;
        }

        return false;
    }

    // only allow access to relevant teachers and school leaders

    // A teacher with neither classes nor school-leader scope has nothing to match on. Without this
    // guard the Brackets below adds no conditions, and TypeORM renders an empty bracket as "1=1",
    // collapsing the query to "ct.id = :id" so that every class topic matches and access is granted.
    if (!(token.classIds?.length > 0) && !token.isSchoolLeader) return false;

    const qb = LwpClassTopic.createQueryBuilder('ct').innerJoin('ct.class', 'class').where('ct.id = :id', { id });

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
@Index('idx_class_release_due', ['class', 'releaseDate', 'dueDate'])
// Guards against creating the same topic twice within one sequence assignment. Manually scheduled
// topics leave classSequenceAssignmentId NULL, which Postgres exempts from the constraint.
@Unique('UQ_class_topic_assignment_topic', ['classSequenceAssignment', 'topic'])
export class LwpClassTopic extends BaseAuthorizerEntity {
    @Field(() => DateOnly)
    @Column({ type: 'date', transformer: dateValueTransformer })
    @AuthorizeField(UnrestrictedField)
    releaseDate: Date;

    @Field(() => DateOnly, { nullable: true })
    @Column({ nullable: true, type: 'date', transformer: dateValueTransformer })
    @AuthorizeField(UnrestrictedField)
    dueDate: Date;

    /* Virtual - "Released on 24 Oct" or "Due by 30 Oct" */
    @Field()
    @AuthorizeField(UnrestrictedField)
    displayDate: string;

    /* Appears at top of page */
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    teacherMessage: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    readingTarget: number;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    readingNote: string;

    @Field()
    @Column({ default: false })
    @AuthorizeField(TeacherField)
    released: boolean;

    @Field()
    @Column({ default: false })
    @AuthorizeField(TeacherField)
    teacherNotified: boolean;

    /** Set when the teacher is notified a week before the topic is released. */
    @Field()
    @Column({ default: false })
    @AuthorizeField(TeacherField)
    weekBeforeTeacherNotified: boolean;

    @ManyToOne(() => StaticLwpTopic, (child) => child.classTopics, { onDelete: 'RESTRICT' })
    @Field(() => StaticLwpTopic, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    topic: StaticLwpTopic;

    @ManyToOne(() => LwpSchoolClass, (child) => child.topics, { onDelete: 'CASCADE' })
    @Field(() => LwpSchoolClass, { nullable: true })
    @AuthorizeField(TeacherField)
    class: LwpSchoolClass;

    /** Set when the topic was created by assigning a sequence to the class. NULL for manually scheduled topics. */
    @ManyToOne(() => LwpClassSequenceAssignment, (assignment) => assignment.classTopics, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => LwpClassSequenceAssignment, { nullable: true })
    @Index()
    @AuthorizeField(TeacherField)
    classSequenceAssignment: LwpClassSequenceAssignment;

    @OneToMany(() => LwpPupilTopic, (child) => child.classTopic)
    @Field(() => [LwpPupilTopic], { nullable: true })
    @AuthorizeField(TeacherField)
    pupilTopics: LwpPupilTopic[];

    @OneToMany(() => LwpSetByTeacherStepMedia, (media) => media.classTopic)
    @Field(() => [LwpSetByTeacherStepMedia], { nullable: true })
    @AuthorizeField(TeacherField)
    setByTeacherMedia: LwpSetByTeacherStepMedia[];

    @Field(() => ClassTopicStatistics, { nullable: true })
    @AuthorizeField(TeacherField)
    statistics: ClassTopicStatistics;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    scrapbookPrompt: string;

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
    @Index(['deletedBy.id'])
    deletedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logCreatedBy.id'])
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    logUpdatedBy: LwpUser;

    /* Related to transfer from MwP */

    @Column({ nullable: true })
    mwpOrder: number;
}
