import { Field, HideField, ObjectType } from '@nestjs/graphql';
import { InviteMode, UserStatus, validations } from 'lwp-shared';
import {
    AdminField,
    AuthorizeField,
    FieldAuthorizer,
    TeacherField,
    TrustedUserField,
    UnrestrictedField
} from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    SelectQueryBuilder,
    UpdateDateColumn
} from 'typeorm';

import { UserAnnouncementContextOutput } from '../dtos/UserAnnouncementContext';
import { AdminRestrictions, LastLoginOptions, notificationPreferenceEnum } from '../model';
import { ImportedContact } from './imported_contact';
import { LogLwpEntityStatusChange } from './log_lwp_entity_status_change';
import { LwpPupilFeedback } from './lwp_pupil_feedback';
import { LwpUserInterstitial } from './lwp_user_interstitial';
import { LwpUserPageAnnouncement } from './lwp_user_page_announcement';
import { LwpUserTooltipHistory } from './lwp_user_tooltip_history';
import { LwpMagicLink } from './magic_link';
import { LwpPupilParent } from './pupil_parent';
import { LwpSchool } from './school';
import { LwpSchoolClass } from './school_class';
import { StaticLwpPageAnnouncement } from './static_lwp_page_announcement';
import { LwpUserAssociatedLogin } from './user_associated_login';

const selfOnlyAuth = ({ token, object }): boolean => token.sub === (object as LwpUser).id;
const selfOnlyOrAdminAuth = ({ token, object }): boolean => token.userType === UserType.ADMIN || token.sub === (object as LwpUser).id;

/**
 * ⚠️ WARNING - lwp_user has database dependencies that must be rebuilt whenever its columns change.
 *
 * `lwp_view_notifiable_parents` is defined as `SELECT * FROM lwp_user`; a Postgres view freezes its column
 * list at creation time. The notification crons cast rows from that view back to this table's type via
 * `ROW(view.*)::lwp_user` (function `lwp_view_notifiable_parents_to_lwp_user` + an implicit CAST). If you ADD
 * or REMOVE a column here without rebuilding those objects, the frozen view no longer matches the type and the
 * cast fails at runtime ("cannot cast type record to lwp_user / Input has too few columns"), silently breaking
 * every cron that reads `lwp_view_pupil_topics_for_notifications`.
 *
 * So: any migration that changes lwp_user's columns MUST, in the same migration, drop and recreate these
 * dependencies (the two views + the cast + the function) so the `SELECT *` view re-freezes to the new shape.
 * See 1782892464479-MoveInviteModeFromSchoolToUser and 1738312811059-DropAndReCreateDependenciesOfLwpUserTable
 * for the exact pattern. Do NOT ship an lwp_user column change to production without this.
 */
@Entity()
@Check('email_valid', `email ~* '${validations.user.emailRegex}'`)
@Check('phone_valid', `"phoneNumber" ~ '${validations.user.phoneRegex}'`)
@ObjectType()
@ActsAsAuthorizer(LwpUser, async ({ id, token, opType }) => {
    /**
     * Allows access to a user's records, either for writing or reading,
     * only when:
     * - the user is an admin;
     * - the user is the user themselves;
     * - the user is a teacher in a relevant school viewing the record of a parent; or
     * - the user is a teacher in a relevant school writing the record of a parent and the parent is not in any other schools.
     */

    if (token.userType === UserType.ADMIN) return '*';
    if (token.sub === id) return '*';
    if (token.userType === UserType.TEACHER) {
        // if the user is also a teacher in the school, they can access
        if (
            (await LwpUser.createQueryBuilder('lu')
                .innerJoin('lu.school', 'ls')
                .where('ls.id = :schoolId', { schoolId: token.schoolId })
                .andWhere('lu.id = :id', { id })
                .andWhere('lu.type = :type', { type: UserType.TEACHER })
                .getCount()) == 1
        ) {
            if (opType === OpType.Read) return '*';

            return token.isSchoolLeader ? '*' : false;
        }

        const pupilsBaseQuery = (): SelectQueryBuilder<LwpUser> =>
            LwpUser.createQueryBuilder('lu')
                .innerJoin('lu.pupils', 'lpp')
                .innerJoin('lpp.pupil', 'lp')
                .innerJoin('lp.school', 'ls')
                .where('lu.id = :id', { id });

        const countPupils = await pupilsBaseQuery().andWhere('ls.id = :schoolId', { schoolId: token.schoolId }).getCount();

        if (countPupils > 0) {
            if (opType === OpType.Read) return '*';

            const countPupilsInOtherSchool = await pupilsBaseQuery()
                .andWhere('ls.id != :schoolId', { schoolId: token.schoolId })
                .getCount();

            return countPupilsInOtherSchool === 0 ? '*' : false;
        }
    }

    return false;
})
export class LwpUser extends BaseAuthorizerEntity {
    @Column()
    @Field({ nullable: true })
    @AuthorizeField(selfAndOtherUserAuth(UnrestrictedField, TrustedUserField))
    firstname: string;

    @Column()
    @Field()
    @Field({ nullable: true })
    @AuthorizeField(selfAndOtherUserAuth(UnrestrictedField, TrustedUserField))
    lastname: string;

    @Column({
        unique: true,
        nullable: true,
        type: 'citext',
        transformer: {
            from(value: string): string {
                return value;
            },
            to(value: string | string[]): string | string[] {
                if (value) {
                    if (typeof value === 'string') {
                        return value.trim();
                    } else if (Array.isArray(value)) {
                        return value.map((item) => (item && typeof item === 'string' ? item.trim() : item));
                    }
                }

                return value;
            }
        }
    })
    @Field({ nullable: true })
    @AuthorizeField(selfAndOtherUserAuth(UnrestrictedField, TeacherField))
    email: string; // teacher can access it

    @Column({ nullable: true })
    @Field({ nullable: true })
    deletedEmail: string;

    @Column({ nullable: true })
    @HideField()
    password: string;

    @Column({ nullable: true })
    @HideField()
    mwpHashedPass: string;

    @Column({ nullable: true })
    @HideField()
    initialPass: string;

    @Column()
    @Field(() => UserType)
    @AuthorizeField(selfAndOtherUserAuth(UnrestrictedField, TrustedUserField))
    type: UserType;

    @Column()
    @Field(() => UserStatus)
    @AuthorizeField(selfAndOtherUserAuth(UnrestrictedField, TeacherField))
    userStatus: UserStatus;

    @Column({ default: false })
    @Field(() => Boolean)
    @AuthorizeField(selfAndOtherUserAuth(UnrestrictedField, TeacherField))
    watchedIntroVideo: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    logLastStatusChange: Date;

    @Field()
    @AuthorizeField(selfAndOtherUserAuth(UnrestrictedField, TeacherField))
    @Column({ default: 'BOTH' })
    notificationPreference: notificationPreferenceEnum;

    @HideField()
    @Column({ default: 0 })
    badLoginAttempts: number;

    @HideField()
    @Column({ nullable: true })
    unlockAccountTime: Date;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    logPreviousStatus: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    @Column({ nullable: true })
    lastLogin: Date;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    @Column({ nullable: true })
    lastAccess: Date;

    @OneToMany(() => LwpUserTooltipHistory, (tooltip) => tooltip.user)
    @Field(() => [LwpUserTooltipHistory])
    @AuthorizeField(selfAndOtherUserAuth(UnrestrictedField, TeacherField))
    tooltips: LwpUserTooltipHistory[];

    @Column({ default: false })
    isGoogleAccount: boolean;

    @Column({ default: false })
    welcomeMailSent: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    @Column({ default: false, nullable: true })
    isEmailVerified: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    @Column({ nullable: true })
    emailVerificationCode: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    @Column({ default: false, nullable: true })
    isPhoneVerified: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    @Column({ nullable: true })
    phoneVerificationCode: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    @Column({ nullable: true })
    lastInvitationEmailSent: Date;

    /**
     * When the school leader welcome email was sent. NULL means still owed one, which is what makes a school
     * leader eligible for the admin bulk send. Stamped when the email is queued, so it cannot be queued twice;
     *
     * Unrelated to the legacy `welcomeMailSent` boolean below, which nothing reads.
     */
    @Field({ nullable: true })
    @AuthorizeField(AdminField)
    @Column({ nullable: true })
    lastWelcomeEmailSent: Date;

    /**
     * When this user was sent the Money Skills launch email. NULL means never sent, which is what makes them
     * eligible. Stamped when the email is queued, so each person is sent it once: a teacher who is main teacher
     * of two classes hears about the first one only.
     *
     * A timestamp rather than a flag, so the rule can become "not since this academic year" without a migration.
     */
    @Column({ nullable: true })
    lastMoneySkillsLaunchEmailSent: Date;

    /**
     * When this school leader last saw the Money Skills auto-schedule welcome modal (LEA-6505). It counts as
     * seen only on or after the start of the school's current academic year, so the modal returns each year.
     * The school overview reads it from the user it already loads, and only asks whether the modal is on
     * offer when this is not from the current year.
     */
    @Field({ nullable: true })
    @AuthorizeField(selfOnlyAuth)
    @Column({ type: 'timestamp', nullable: true })
    lastMoneySkillsAutoScheduleWelcomeSeen: Date;

    /**
     * Controls when an as-yet-uninvited user is invited: SEND_NOW invites immediately on add, while
     * SEND_LATER and DO_NOT_SEND both leave the user uninvited. Nothing sends automatically - SEND_LATER
     * marks the user as awaiting a deliberate send by an admin (LEA-6539 removed the autumn cron that
     * used to invite them unprompted).
     * Only meaningful while the user is IMPORTED; inert once they have been invited.
     */
    @Field(() => InviteMode)
    @Column({
        type: 'enum',
        enum: InviteMode,
        enumName: 'user_invite_mode_enum',
        default: InviteMode.SEND_NOW
    })
    @AuthorizeField(AdminField)
    inviteMode: InviteMode;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    @Column({ nullable: true })
    microsoftAuth: boolean;

    // TEACHER RELATED COLUMNS AND RELATIONS //

    /** Used wherever the teacher is shown to the child */
    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(selfAndOtherUserAuth(UnrestrictedField, TrustedUserField))
    nameForChildren: string;

    /** It will be true if the teacher is school leader as well */
    @Field({ nullable: true })
    @AuthorizeField(selfAndOtherUserAuth(UnrestrictedField, TeacherField))
    @Column({ default: false, nullable: true })
    isSchoolLeader: boolean;

    @ManyToMany(() => LwpSchoolClass, (child) => child.teachers, { onDelete: 'CASCADE' })
    @JoinTable({ name: 'lwp_class_teacher' })
    @Field(() => [LwpSchoolClass], { nullable: true })
    @AuthorizeField(TeacherField)
    classes: LwpSchoolClass[];

    @OneToMany(() => LwpSchoolClass, (child) => child.mainTeacher)
    @Field(() => [LwpSchoolClass], { nullable: true })
    @AuthorizeField(TeacherField)
    mainClasses: LwpSchoolClass[];

    @ManyToMany(() => LwpPupilFeedback, (child) => child.teacherLikes, { onDelete: 'CASCADE' })
    @JoinTable({ name: 'lwp_teacher_liked_pupil_activity' })
    @Field(() => [LwpPupilFeedback], { nullable: true })
    @AuthorizeField(TeacherField)
    likedActivities: LwpPupilFeedback[];

    @ManyToOne(() => LwpSchool, (child) => child.schoolLeaders, { onDelete: 'CASCADE' })
    @Field(() => LwpSchool, { nullable: true })
    @AuthorizeField(selfAndOtherUserAuth(UnrestrictedField, TeacherField))
    school: LwpSchool;

    // ## NEW WORK FOR PARENT PUPIL RELATION
    @Field(() => [LwpPupilParent], { nullable: true })
    @OneToMany(() => LwpPupilParent, (child) => child.parent)
    @AuthorizeField(selfOnlyAuth)
    pupils: LwpPupilParent[];

    // Social logins
    @Field(() => [LwpUserAssociatedLogin], { nullable: true })
    @AuthorizeField(selfAndOtherUserAuth(TrustedUserField, TeacherField))
    @OneToMany(() => LwpUserAssociatedLogin, (child) => child.user)
    socialAccounts: LwpUserAssociatedLogin[];

    @Field()
    @AuthorizeField(selfAndOtherUserAuth(UnrestrictedField, TeacherField))
    hasPassword: boolean;

    @Field()
    @AuthorizeField(TeacherField)
    numSchoolsWithPupils: number;

    @Field(() => LastLoginOptions, { nullable: true })
    @AuthorizeField(TeacherField)
    lastLoginInfo: LastLoginOptions;

    @Field(() => [LogLwpEntityStatusChange], { nullable: true })
    userStatusChangeLogs: LogLwpEntityStatusChange[];

    @Field(() => [LwpPupilParent], { nullable: true })
    @AuthorizeField(selfOnlyAuth)
    activePupils: LwpPupilParent[];

    @Column({ type: 'jsonb', nullable: true, array: false })
    @Field(() => AdminRestrictions, { nullable: true })
    @AuthorizeField(selfAndOtherUserAuth(UnrestrictedField, TeacherField))
    adminRestrictions: AdminRestrictions;

    @Field()
    @AuthorizeField(selfAndOtherUserAuth(UnrestrictedField, TeacherField))
    restrictSiteData: boolean;

    @Field({ nullable: true })
    @AuthorizeField(selfAndOtherUserAuth(UnrestrictedField, TeacherField))
    socialLoginPermissions: string;

    @Field({ nullable: true })
    @AuthorizeField(selfAndOtherUserAuth(UnrestrictedField, TeacherField))
    @Column({ nullable: true })
    sharingAllowed: boolean;

    @Field({ nullable: true })
    @Column({ nullable: true, unique: true })
    @AuthorizeField(selfAndOtherUserAuth(UnrestrictedField, TeacherField))
    phoneNumber: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    deletedPhoneNumber: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    deletedUserStatus: UserStatus;

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
    id: string;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @AuthorizeField(TeacherField)
    @Index(['deletedBy.id'])
    deletedBy: LwpUser;

    @CreateDateColumn({
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    @AuthorizeField(TeacherField)
    logCreatedAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    @AuthorizeField(TeacherField)
    logUpdatedAt: Date;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logCreatedBy.id'])
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    logUpdatedBy: LwpUser;

    @OneToMany(() => LwpUserInterstitial, (u) => u.user, { nullable: true })
    @Field(() => [LwpUserInterstitial], { nullable: true })
    @AuthorizeField(TeacherField)
    lwpUserInterstitial: LwpUserInterstitial[];

    @OneToMany(() => LwpUserPageAnnouncement, (u) => u.user)
    @Field(() => [LwpUserPageAnnouncement])
    @AuthorizeField(selfOnlyOrAdminAuth)
    lwpUserPageAnnouncements: LwpUserPageAnnouncement[];

    @AuthorizeField(selfOnlyOrAdminAuth)
    @Field(() => [StaticLwpPageAnnouncement])
    unSeenPageAnnouncements: StaticLwpPageAnnouncement[];

    @OneToMany(() => LwpMagicLink, (u) => u.user, { nullable: true })
    @Field(() => [LwpMagicLink], { nullable: true })
    magicLinks?: LwpMagicLink[];

    @Field({ nullable: true })
    resetPassToken: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    @Column({ default: null, nullable: true })
    importedContactId: string;

    @Field(() => [LogLwpEntityStatusChange], { nullable: true })
    @AuthorizeField(TeacherField)
    logStatusChange: LogLwpEntityStatusChange[];

    @OneToMany(() => ImportedContact, (u) => u.lwpUser, { nullable: true })
    @Field(() => [ImportedContact], { nullable: true })
    @AuthorizeField(TeacherField)
    importedContacts?: ImportedContact[];

    getFullName(): string {
        return `${this.firstname} ${this.lastname}`;
    }

    @Field()
    @AuthorizeField(TeacherField)
    hasClassesThisYear: boolean;

    @AuthorizeField(selfOnlyOrAdminAuth)
    @Field(() => UserAnnouncementContextOutput, { nullable: true })
    userAnnouncementContext: UserAnnouncementContextOutput;
}

export function selfAndOtherUserAuth(
    selfUserAuth: FieldAuthorizer<LwpUser>,
    otherUserAuth: FieldAuthorizer<LwpUser>
): FieldAuthorizer<LwpUser> {
    return (data) => {
        if (data.token?.sub === data.object?.id) {
            return selfUserAuth(data);
        } else {
            return otherUserAuth(data);
        }
    };
}
