import { Field, ObjectType } from '@nestjs/graphql';
import { Gender } from 'lwp-shared';
import { AuthorizeField, TeacherField, TrustedUserField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { UserType } from 'src/auth/types/UserType';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    RelationId,
    UpdateDateColumn
} from 'typeorm';

import { ScrapbookReadyTeddyTopicOutput } from '../dtos/ScrapbookReadyTeddyTopicOutput';
import { MergeMathscotItems, ParentsContext, PupilStatus, PupilTotalStarCountOutput, PupilType } from '../model';
import { ImportedStudent } from './imported_student';
import { dateValueTransformer } from './lib/date_value_transformer';
import { LwpPupilFeedback } from './lwp_pupil_feedback';
import { LwpPupilTag } from './lwp_pupil_tag';
import { LwpPupilMathscot } from './pupil_mathscot';
import { LwpPupilParent } from './pupil_parent';
import { LwpPupilTopic } from './pupil_topic';
import { LwpPupilTrophy } from './pupil_trophy';
import { LwpPupilActivity } from './pupil-activity';
import { DateOnly } from './scalar/DateOnly.scalar';
import { LwpSchool } from './school';
import { LwpSchoolClass } from './school_class';
import { StaticLwpProgram } from './static_lwp_program';
import { LwpUser } from './user';
import { LwpViewPupilStatus } from './views/pupil_status';

@Entity()
@ObjectType()
// @Index('lwp_pupil_schoolId_upn_unique', ['school', 'UPN'], {
//     unique: true,
//     where: `"deletedAt" IS NULL AND "UPN" != '[Unknown]'`
// }) // for documentation
@ActsAsAuthorizer(LwpPupil, async ({ id, token, parentId }) => {
    if (token.userType === UserType.ADMIN) return '*'; // admins allowed

    const pupilQb = LwpPupil.createQueryBuilder('lp').where('lp.id = :id', { id });

    if (token.userType === UserType.TEACHER) {
        if (id === null) return parentId === token.schoolId ? '*' : false; // teachers can see and create in their own school

        // teachers can see in their own school
        return (await pupilQb.innerJoin('lp.school', 'ls').andWhere('ls.id = :sid', { sid: token.schoolId }).getCount()) == 1 ? '*' : false;
    }

    return (
        // parents can see only those they are connected to
        (await pupilQb
            .innerJoin('lp.parents', 'lpp')
            .innerJoin('lpp.parent', 'lu')
            .andWhere('lu.id = :uid', { uid: token.sub })
            .getCount()) >= 1
            ? '*'
            : false
    );
})
export class LwpPupil extends BaseAuthorizerEntity {
    @Column()
    @Field({ nullable: false })
    @AuthorizeField(UnrestrictedField)
    firstname: string;

    @Column()
    @Field({ nullable: false })
    @AuthorizeField(UnrestrictedField)
    lastname: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    fullname: string;

    @Column({ nullable: true })
    photo: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    lastCertificateSent: Date;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    lastCertificateDownloaded: Date;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    startedSchool: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    UPN: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    yearGroup: string;

    @Field(() => DateOnly, { nullable: true })
    @Column({ type: 'date', transformer: dateValueTransformer, nullable: true })
    @AuthorizeField(TeacherField)
    dateOfBirth: Date;

    @Field(() => Gender, { nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    gender: Gender;

    @ManyToMany(() => LwpSchoolClass, (child) => child.pupils, { onDelete: 'CASCADE' })
    @JoinTable({ name: 'lwp_class_pupil' })
    @Field(() => [LwpSchoolClass], { nullable: true })
    @AuthorizeField(TeacherField)
    classes: LwpSchoolClass[];

    @ManyToMany(() => LwpPupilFeedback, (feedback) => feedback.pupils, { onDelete: 'CASCADE' })
    @JoinTable({ name: 'lwp_pupil_feedback_history' })
    @Field(() => [LwpPupilFeedback], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    feedbacks: LwpPupilFeedback[];

    @Field(() => [LwpPupilParent], { nullable: true })
    @OneToMany(() => LwpPupilParent, (child) => child.pupil)
    @AuthorizeField(TrustedUserField)
    parents: LwpPupilParent[];

    @Field(() => [LwpPupilParent], { nullable: true })
    @AuthorizeField(TrustedUserField)
    nonRejectedParents: LwpPupilParent[];

    @Field(() => [LwpPupilParent], { nullable: true })
    @AuthorizeField(TeacherField)
    importedParents: LwpPupilParent[];

    @OneToMany(() => LwpPupilMathscot, (t) => t.pupil)
    @Field(() => [LwpPupilMathscot], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    mathscot: LwpPupilMathscot[];

    @OneToMany(() => LwpPupilTrophy, (child) => child.pupil)
    @Field(() => [LwpPupilTrophy])
    @AuthorizeField(UnrestrictedField)
    trophies: LwpPupilTrophy[];

    @ManyToMany(() => LwpPupilTag, (tag) => tag.pupils, { onDelete: 'CASCADE' })
    @Field(() => [LwpPupilTag], { nullable: true })
    @AuthorizeField(TeacherField)
    tags: LwpPupilTag[];

    @ManyToOne(() => LwpSchool, (school) => school.pupils, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
    @Field(() => LwpSchool, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    school: LwpSchool;

    @RelationId((pupil: LwpPupil) => pupil.school)
    schoolId: string;

    @ManyToOne(() => LwpSchool, (school) => school.deletedPupils, { createForeignKeyConstraints: false })
    @Field(() => LwpSchool, { nullable: true })
    deletedSchool: LwpSchool;

    @Field(() => LwpSchoolClass, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    currentClass: LwpSchoolClass;

    @Field(() => LwpSchoolClass, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    currentClassOrGroupAcrossClasses: LwpSchoolClass;

    @Field(() => PupilType, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    type: PupilType;

    @Field(() => LwpPupilTopic, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    currentReadingTopic: LwpPupilTopic;

    @Field(() => LwpPupilTopic, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    currentReadyTeddyTopic: LwpPupilTopic;

    @Field(() => ScrapbookReadyTeddyTopicOutput, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    currentReadyTeddyTopicForScrapbook: ScrapbookReadyTeddyTopicOutput;

    @Field(() => LwpPupilMathscot, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    currentMathscot: LwpPupilMathscot;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    previousMathscotImage: string;

    @Column({ type: 'jsonb', nullable: true, default: [] })
    @AuthorizeField(UnrestrictedField)
    mathscotItems: number[];

    @Field(() => MergeMathscotItems, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    mathscotUrl: MergeMathscotItems;

    @Column({ nullable: true })
    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    isPremium: boolean;

    @Column({ nullable: true, default: false })
    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    isPreRegistration: boolean;

    @Column({ nullable: true, default: false })
    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    isIgnoredForFutureYearClasses: boolean;

    @Column({ nullable: true })
    @Field(() => Date)
    @AuthorizeField(TeacherField)
    logLastActivityCompleted: Date;

    @OneToOne(() => LwpViewPupilStatus, (ps: LwpViewPupilStatus) => ps.pupil)
    @JoinColumn({ name: 'id' })
    statusView: Promise<LwpViewPupilStatus>;

    public async getPupilStatus(): Promise<PupilStatus> {
        return (await this.statusView)?.pupilStatus;
    }

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    lastLogin: Date;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    lastActivity: Date;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    videoCount: number;

    @Field(() => PupilTotalStarCountOutput)
    @AuthorizeField(TeacherField)
    starsEarned: PupilTotalStarCountOutput;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    watchedVideoCount: number;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    activityCount: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    parentWatchedIntroVideo: boolean;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    isInSchoolClassOrGroupAcrossClasses: boolean;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    feedbackCount: number;

    @Field(() => ParentsContext, { nullable: true })
    @AuthorizeField(TeacherField)
    parentsContext: ParentsContext;

    @Field(() => [LwpPupilTopic], { nullable: true })
    @AuthorizeField(TeacherField)
    readingTopics: LwpPupilTopic[];

    @OneToMany(() => LwpPupilActivity, (c) => c.pupil)
    @Field(() => [LwpPupilActivity])
    @AuthorizeField(TeacherField)
    activities: LwpPupilActivity[];

    @OneToMany(() => LwpPupilTopic, (c) => c.pupil)
    @Field(() => [LwpPupilTopic], { nullable: true })
    @AuthorizeField(TeacherField)
    allTopics: LwpPupilTopic[];

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
    id: string;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['deletedBy.id'])
    deletedBy: LwpUser;

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

    @Field(() => ImportedStudent, { nullable: true })
    @OneToOne(() => ImportedStudent, (u) => u.lwpPupil, { nullable: true })
    @AuthorizeField(TeacherField)
    importedStudent?: ImportedStudent;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    isCurrentYearTopicsReleased?: boolean;

    @Field({ nullable: true })
    @Column({ default: null, nullable: true })
    @AuthorizeField(TeacherField)
    importedStudentId: string;

    getFullName(): string {
        return `${this.firstname} ${this.lastname}`;
    }

    @Field()
    @AuthorizeField(UnrestrictedField)
    isActiveInCurrentAcademicYear: boolean;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    getSchoolSponsorProgram: StaticLwpProgram;
}
