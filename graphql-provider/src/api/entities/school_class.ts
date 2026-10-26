import { Field, Int, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField, TrustedUserField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToMany,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    RelationId,
    UpdateDateColumn
} from 'typeorm';

import { AcademicYearInfo } from '../dtos/AcademicYearInfo';
import { ClassTopicContextOutput, SchoolClassStatistics, SchoolClassStatus } from './../model';
import { LwpClassTopic } from './class_topic';
import { ImportedSchoolClass } from './imported_school_class';
import { LwpPupil } from './pupil';
import { LwpPupilTrophy } from './pupil_trophy';
import { LwpSchool } from './school';
import { StaticLwpSubject } from './static_lwp_subject';
import { StaticLwpPeriod } from './static_period';
import { LwpUser } from './user';
import { StaticLwpYearGroup } from './year_group';

@Entity()
@ObjectType()
@Index('lwp_school_class_schoolid_periodindex_isregclass_status_idx', ['school.id', 'period.index', 'isRegistrationClass', 'status'])
@ActsAsAuthorizer(LwpSchoolClass, async ({ id, opType, token }) => {
    if (token.userType === UserType.ADMIN) return '*'; // admins can always access

    if (token.userType === UserType.TEACHER) {
        if (token.classIds?.includes(id?.toString())) return '*';
        if (!token.isSchoolLeader && opType === OpType.Write) return false;

        // check the school class is the same as the token school ID
        return (await LwpSchoolClass.createQueryBuilder('lsc')
            .innerJoin('lsc.school', 'ls')
            .where('lsc.id = :classId', { classId: id })
            .andWhere('ls.id = :schoolId', { schoolId: token.schoolId })
            .getCount()) == 1
            ? '*'
            : false;
    }

    if (opType === OpType.Read) {
        // check that some pupils are in that class
        return (await LwpSchoolClass.createQueryBuilder('lsc')
            .innerJoin('lsc.pupils', 'lp')
            .where('lsc.id = :id', { id })
            .andWhere('lp.id IN (:...ids)', { ids: token.pupilIds })
            .getCount()) >= 1
            ? '*'
            : false;
    }

    return false;
})
export class LwpSchoolClass extends BaseAuthorizerEntity {
    @Column()
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    name: string;

    @Column({ default: 0 })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    missingCount: number;

    @Column({ default: 0 })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    registerCount: number;

    @Column({ default: 0 })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    activeCount: number;

    @Column({ default: 0 })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    feedCount: number;

    @Column({ default: 0 })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    premiumCount: number;

    @Column({ default: 3 })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    readingTarget: number;

    @Column({ default: 1 })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    readingStartDay: number;

    @Column({ default: false })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    isStatsNeedUpdate: boolean;

    @Column({ default: 'ACTIVE' })
    @Field(() => SchoolClassStatus)
    @AuthorizeField(TeacherField)
    status: SchoolClassStatus;

    @Column({ default: false })
    @Field()
    @AuthorizeField(UnrestrictedField)
    isFullProgramme: boolean;

    @Column({ default: false })
    @Field()
    @AuthorizeField(TeacherField)
    isGroupAcrossClasses: boolean;

    // Set to the period a pre-admission Ready Teddy class was converted into a group across classes for.
    // While that period is the school's current one, the group keeps its Ready Teddy licence during the
    // group licence recompute instead of deriving it from the pupils' registration classes; the exemption
    // lapses when the school's period moves on.
    @Column({ type: 'integer', nullable: true })
    @Field(() => Int, { nullable: true })
    @AuthorizeField(TeacherField)
    convertedFromPreAdmissionPeriodIndex: number | null;

    @Column({ default: false })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    IsReadingLogsEnabled: boolean;

    @Column({ default: false })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    isRegistrationClass: boolean;

    @Field()
    @Column({ default: false })
    @AuthorizeField(UnrestrictedField)
    isReadyTeddyEnabled: boolean;

    @Field()
    @AuthorizeField(UnrestrictedField)
    isPreAdmissionClass: boolean;

    @Column({ default: false })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    isLocked: boolean;

    @Field(() => LwpClassTopic, { nullable: true })
    @AuthorizeField(TeacherField)
    currentReadingWeek?: LwpClassTopic;

    @Field(() => LwpClassTopic, { nullable: true })
    @AuthorizeField(TeacherField)
    currentTopic: LwpClassTopic;

    @Field(() => LwpClassTopic, { nullable: true })
    @AuthorizeField(TeacherField)
    upcomingTopic: LwpClassTopic;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    schoolClassName: string;

    @Field()
    @AuthorizeField(TeacherField)
    attentionRequiredPupilsCount: number;

    @Column({ default: false })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    trophyEmailsPending: boolean;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    lastTrophyTeacherEmailSent: Date;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    readingLaunchDate: Date;

    // These deletes need to cascade as, if a parent class is set, this is a group.
    @ManyToOne(() => LwpSchoolClass, { nullable: true, onDelete: 'CASCADE' })
    @Field(() => LwpSchoolClass, { nullable: true })
    @Index(['parentClass.id'])
    @AuthorizeField(TeacherField)
    parentClass: LwpSchoolClass;

    @RelationId((lsc: LwpSchoolClass) => lsc.parentClass)
    parentClassId: number;

    // Add the OneToMany relation
    @OneToMany(() => LwpSchoolClass, (childClass) => childClass.parentClass)
    @Field(() => [LwpSchoolClass], { nullable: true })
    @AuthorizeField(TeacherField)
    groups: LwpSchoolClass[];

    @Field()
    @Column({ default: false })
    @AuthorizeField(TeacherField)
    skipGroupPupils: boolean;

    @ManyToMany(() => StaticLwpSubject, (sub) => sub.classes, { onDelete: 'CASCADE' })
    @Field(() => [StaticLwpSubject], { nullable: true })
    @AuthorizeField(TeacherField)
    subjects: StaticLwpSubject[];

    // @Column()
    // @Field({ nullable: true })
    // yearGroup: number;
    @Field(() => StaticLwpYearGroup, { nullable: true })
    @ManyToOne(() => StaticLwpYearGroup, (p) => p.classes, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'yearGroup' })
    @AuthorizeField(UnrestrictedField)
    yearGroup: StaticLwpYearGroup;

    @Field(() => SchoolClassStatistics, { nullable: true })
    @AuthorizeField(TeacherField)
    statistics: SchoolClassStatistics;

    @ManyToMany(() => LwpPupil, (child) => child.classes, { onDelete: 'CASCADE' })
    @Field(() => [LwpPupil], { nullable: true })
    @AuthorizeField(TeacherField)
    pupils: LwpPupil[];

    @OneToMany(() => LwpClassTopic, (child) => child.class, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    @Field(() => [LwpClassTopic], { nullable: true })
    @AuthorizeField(TeacherField)
    topics: LwpClassTopic[];

    @OneToMany(() => LwpPupilTrophy, (t) => t.schoolClass)
    @Field(() => [LwpPupilTrophy], { nullable: true })
    @AuthorizeField(TeacherField)
    trophies: LwpPupilTrophy[];

    @ManyToMany(() => LwpUser, (child) => child.classes, { onDelete: 'CASCADE' })
    @Field(() => [LwpUser], { nullable: true })
    @AuthorizeField(TeacherField)
    teachers: LwpUser[];

    @ManyToOne(() => LwpUser, (child) => child.mainClasses, { onDelete: 'SET NULL', deferrable: 'INITIALLY IMMEDIATE' })
    @Field(() => LwpUser, { nullable: true })
    @AuthorizeField(TrustedUserField)
    mainTeacher: LwpUser;

    @ManyToOne(() => LwpSchool, (child) => child.classes, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    @Field(() => LwpSchool, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    @Index(['school.id'])
    school: LwpSchool;

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
    @Index(['logCreatedBy.id'])
    @AuthorizeField(TeacherField)
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['deletedBy.id'])
    @AuthorizeField(TeacherField)
    deletedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    @AuthorizeField(TeacherField)
    logUpdatedBy: LwpUser;

    @Column({ default: false })
    isTeacherNotifiedLaunched: boolean;

    @Field(() => AcademicYearInfo)
    @AuthorizeField(UnrestrictedField)
    academicYearInfo: AcademicYearInfo;

    @Column({ default: false })
    isTeacherNotifiedRegistrationTargetMet: boolean;

    @Column({ default: false })
    isTeacherNotifiedAllRegistered: boolean;

    @Field(() => ImportedSchoolClass, { nullable: true })
    @OneToOne(() => ImportedSchoolClass, (s) => s.lwpSchoolClass, { nullable: true })
    @AuthorizeField(TeacherField)
    importedSchoolClass?: ImportedSchoolClass;

    @Field({ nullable: true })
    @Column({ default: null, nullable: true })
    @AuthorizeField(TeacherField)
    importedSchoolClassId: string;

    @ManyToOne(() => StaticLwpPeriod, (t) => t.schoolClasses, { onDelete: 'RESTRICT' })
    @Field(() => StaticLwpPeriod, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    period: StaticLwpPeriod;

    @RelationId((schoolClass: LwpSchoolClass) => schoolClass.period)
    periodIndex: number;

    @Field(() => ClassTopicContextOutput, { nullable: true })
    @AuthorizeField(TeacherField)
    classTopicContext: ClassTopicContextOutput;

    /**
     * Whether to offer this class Money Skills auto-scheduling. Resolved, never stored: see
     * ClassSequenceAssignmentService.getMoneySkillsAutoScheduleAvailability for the three conditions.
     */
    @Field(() => Boolean)
    @AuthorizeField(TeacherField)
    canAutoScheduleMoneySkills: boolean;
}
