import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField, TrustedUserField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { UserType } from 'src/auth/types/UserType';
import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    RelationId,
    UpdateDateColumn
} from 'typeorm';

import { FeedbackType, LastPupilHistoryOutput, PupilHistoryOutput, ReadingMode, ReadingType } from '../model';
import { dateValueTransformer } from './lib/date_value_transformer';
import { LwpFeedbackReply } from './lwp_feedback_reply';
import { LwpPupilFeedbackEditLog } from './lwp_pupil_feedback_edit_log';
import { LwpPupilFeedbackMedia } from './lwp_pupil_feedback_media';
import { LwpSchoolImpactReportFeedback } from './lwp_school_impact_report_feedback';
import { LwpPupil } from './pupil';
import { LwpPupilTopic } from './pupil_topic';
import { LwpPupilActivity } from './pupil-activity';
import { DateOnly } from './scalar/DateOnly.scalar';
import { LwpSchool } from './school';
import { StaticLwpPeriod } from './static_period';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@Check('CHK_lpf_usertype_required_for_original', `"originalFeedbackId" IS NOT NULL OR "userType" IS NOT NULL`)
@Check(
    'CHK_lpf_readingtype_required_for_original_reading',
    `"originalFeedbackId" IS NOT NULL OR "type" != 'READING' OR "readingType" IS NOT NULL`
)
@Check(
    'CHK_lpf_bookname_required_for_original_reading',
    `"originalFeedbackId" IS NOT NULL 
    OR "type" != 'READING'
    OR ("bookName" IS NOT NULL AND trim("bookName") <> '')`
)
@Check(
    'CHK_lpf_logcreatedby_or_user_required_for_original',
    `"logCreatedById" IS NOT NULL
    OR "userId" IS NOT NULL
    OR "originalFeedbackId" IS NOT NULL`
)
@Index('lwp_pupil_feedback_activityid_idx', ['activity.id'])
@Index('lwp_pupil_feedback_bookname_id_idx', ['normalisedBookName', 'id'])
@Index('lwp_pupil_feedback_type_id', ['type', 'id']) // primarily for the reading_log_to_reading_topic view
// Partial, because entries logged before reading modes existed are never backfilled, so most rows
// are null and no query looks for them. Only rows that carry a mode are worth indexing.
@Index('lwp_pupil_feedback_readingmode_idx', ['readingMode'], { where: '"readingMode" IS NOT NULL' })
@ActsAsAuthorizer(LwpPupilFeedback, async ({ id, token, parentId, opType }) => {
    if (token.userType === UserType.ADMIN) return '*'; // admins can always access

    if (id === null) {
        // creating feedback must be done by someone with access to the pupil!
        return (await LwpPupil.authorize({ id: parentId, token, opType })) ? '*' : false;
    }

    if (token.userType === UserType.TEACHER) {
        const isFeedbackBelongsToTeacherSchool = await LwpPupilFeedback.createQueryBuilder('lpf')
            .innerJoin('lpf.pupils', 'lp')
            .innerJoin('lp.school', 'ls')
            .where('lpf.id = :id', { id })
            .andWhere('ls.id = :schoolId', { schoolId: token?.schoolId })
            .getCount();

        return isFeedbackBelongsToTeacherSchool > 0 ? '*' : false;
    } else {
        return (await LwpPupilFeedback.createQueryBuilder('lpf')
            .innerJoin('lpf.pupils', 'lp')
            .select('lp.id')
            .where('lpf.id = :id', { id })
            .andWhere('lp.id IN (:...ids)', { ids: token.pupilIds })
            .getCount()) > 0
            ? '*'
            : false;
    }
})
export class LwpPupilFeedback extends BaseAuthorizerEntity {
    @ManyToOne(() => LwpPupilActivity, (t) => t.feedbacks, { nullable: true, onDelete: 'RESTRICT' })
    @Field(() => LwpPupilActivity, { nullable: true })
    @JoinColumn()
    @AuthorizeField(UnrestrictedField)
    activity: LwpPupilActivity;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TrustedUserField)
    pupilComment: string;

    @OneToMany(() => LwpPupilFeedbackMedia, (t) => t.feedback)
    @Field(() => [LwpPupilFeedbackMedia], { nullable: true })
    @AuthorizeField(TrustedUserField)
    media: LwpPupilFeedbackMedia[];

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TrustedUserField)
    parentComment: string;

    @ManyToMany(() => LwpPupil, (pupil) => pupil.feedbacks, { onDelete: 'CASCADE' })
    @Field(() => [LwpPupil], { nullable: true })
    @AuthorizeField(TeacherField)
    pupils: LwpPupil[];

    @ManyToMany(() => LwpUser, (child) => child.likedActivities, { nullable: true, onDelete: 'CASCADE' })
    @Field(() => [LwpUser], { nullable: true })
    @AuthorizeField(TeacherField)
    teacherLikes: LwpUser[];

    // own activity fields
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    description: string;

    @Column({ default: false })
    @Field()
    @AuthorizeField(TeacherField)
    notifyParent: boolean;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TrustedUserField)
    sharingAllowed: boolean;

    @Field()
    @Column({ default: false })
    @AuthorizeField(UnrestrictedField)
    includeInReadingTarget: boolean;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField((data: { object: LwpPupilFeedback; token?: AuthTokenJWT }) => {
        if (data.object.userType === UserType.TEACHER) {
            return UnrestrictedField(data);
        }

        return TrustedUserField(data);
    })
    comment: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    privateNote: string;

    @Column({ nullable: true, default: null })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    readingType: ReadingType;

    @Column({ nullable: true, default: null })
    @Field(() => ReadingMode, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    readingMode: ReadingMode;

    @Field({ nullable: true })
    @Column({ nullable: true })
    rating: number;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    pageNumber: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    bookName: string;

    @Field({ nullable: true })
    @Column({
        generatedType: 'STORED',
        asExpression: 'trim(lower("bookName"))',
        nullable: true
    })
    @AuthorizeField(UnrestrictedField)
    normalisedBookName: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    userType: string;

    @Field({ nullable: true })
    @Column({ nullable: true, type: 'bigint' })
    @AuthorizeField(UnrestrictedField)
    userId: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    userName: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    isBookFinished: boolean;

    @Field(() => DateOnly, { nullable: true })
    @Column({ nullable: true, type: 'date', transformer: dateValueTransformer })
    @AuthorizeField(UnrestrictedField)
    bookReadAt: Date;

    @Field(() => [LwpPupilFeedbackMedia], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    audios: LwpPupilFeedbackMedia[];

    @Field(() => [LwpPupilFeedbackMedia], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    photos: LwpPupilFeedbackMedia[];

    @Column({ default: 'ACTIVITY' })
    @Field(() => FeedbackType)
    @AuthorizeField(UnrestrictedField)
    type: FeedbackType;

    @Field()
    @Column({ default: 0 })
    logSubmittedOnDesktop: number;

    @Field()
    @Column({ default: 0 })
    logSubmittedOnMobile: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    className: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    isFeedbackForMultipleClasses: boolean;

    @Field()
    @Column({ default: false })
    logOnReadingAsGroupTab: boolean;

    @ManyToOne(() => LwpUser, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => LwpUser, { nullable: true })
    @Index()
    @AuthorizeField(UnrestrictedField)
    tickedBy: LwpUser;

    @Column({ type: 'timestamp', nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    tickedAt: Date;

    @OneToMany(() => LwpPupilFeedbackEditLog, (history) => history.feedback)
    @Field(() => [LwpPupilFeedbackEditLog])
    history: LwpPupilFeedbackEditLog[];

    @Field(() => [PupilHistoryOutput])
    @AuthorizeField(UnrestrictedField)
    historyLogs: PupilHistoryOutput[];

    @Field(() => LastPupilHistoryOutput, { nullable: true })
    @AuthorizeField(TrustedUserField)
    lastAction: LastPupilHistoryOutput;

    @OneToMany(() => LwpSchoolImpactReportFeedback, (s) => s.pupilFeedback, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => [LwpSchoolImpactReportFeedback], { nullable: true })
    @AuthorizeField(TeacherField)
    impactReportFeedbacks: LwpSchoolImpactReportFeedback[];

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

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL', nullable: true })
    @Field(() => LwpUser, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    @Index(['logCreatedBy.id'])
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    logUpdatedBy: LwpUser;

    @Field({ nullable: true })
    @Column({ type: 'bigint', nullable: true })
    @AuthorizeField(UnrestrictedField)
    deletedUserCreatedBy?: string | null;

    @Field()
    @AuthorizeField(UnrestrictedField)
    pupilCount: number;

    @Field()
    @Column({ default: false })
    @AuthorizeField(TeacherField)
    includePhotoInImpactReport: boolean;

    @Field()
    @Column({ default: false })
    @AuthorizeField(TeacherField)
    includeParentCommentInImpactReport: boolean;

    @Field()
    @Column({ default: false })
    @AuthorizeField(TeacherField)
    includePupilCommentInImpactReport: boolean;

    @Field()
    @Column({ default: false })
    @AuthorizeField(TeacherField)
    includeReadingCommentInImpactReport: boolean;

    @Field(() => LwpPupil, { nullable: true })
    @AuthorizeField(TeacherField)
    pupil: LwpPupil;

    @Field(() => LwpPupilTopic, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    pupilTopic: LwpPupilTopic;

    @Field(() => LwpSchool, { nullable: true })
    @AuthorizeField(TrustedUserField)
    school: LwpSchool;

    @Field({ nullable: true })
    @Column({ type: 'bigint', nullable: true })
    deletedUserUpdatedBy?: string | null;

    @ManyToOne(() => StaticLwpPeriod, (t) => t.pupilFeedbacks, { onDelete: 'RESTRICT' })
    @Field(() => StaticLwpPeriod, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    period: StaticLwpPeriod;

    @RelationId((feedback: LwpPupilFeedback) => feedback.period)
    periodIndex: number;

    @OneToMany(() => LwpFeedbackReply, (feedbackReplies) => feedbackReplies.feedback)
    @Field(() => [LwpFeedbackReply], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    feedbackReplies: LwpFeedbackReply[];

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    @Column({ nullable: true, type: 'bigint' })
    originalFeedbackId: string;

    @Column({ type: 'timestamp', nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    entryDeletedAt: Date;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    reasonToDelete: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    scrapbookPrompt: string;
}
