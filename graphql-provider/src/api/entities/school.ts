import { Field, ObjectType } from '@nestjs/graphql';
import { AdminField, AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import { ImportStatus } from 'src/data-import/types/import-status';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    ManyToMany,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    RelationId,
    UpdateDateColumn
} from 'typeorm';

import { PupilWithoutClassCounts, SchoolAllowedClassesInfo, SpmSchoolData } from '../model';
import { ImportedSchool } from './imported_school';
import { dateValueTransformer } from './lib/date_value_transformer';
import { LogSchoolClassLicense } from './log_school_class_license';
import { LwpSchoolHoliday } from './lwp_school_holiday';
import { LwpSchoolImpactReport } from './lwp_school_impact_report';
import { LwpSchoolStaticTags } from './lwp_school_static_tags';
import { LwpSticker } from './lwp_sticker';
import { LwpPupil } from './pupil';
import { DateOnly } from './scalar/DateOnly.scalar';
import { LwpSchoolClass } from './school_class';
import { StaticLwpFeatures } from './static_lwp_features';
import { StaticLwpSchoolTag } from './static_lwp_school_tag';
import { StaticLwpPeriod } from './static_period';
import { LwpUser } from './user';

@ObjectType()
class SchoolSocialLoginPerms {
    @Field()
    @AuthorizeField(UnrestrictedField)
    email: boolean;

    @Field()
    @AuthorizeField(UnrestrictedField)
    google: boolean;

    @Field()
    @AuthorizeField(UnrestrictedField)
    microsoft: boolean;
}

@ObjectType()
@Entity()
@ActsAsAuthorizer(LwpSchool, async ({ id, opType, token }) => {
    if (token.userType === UserType.ADMIN) return '*'; // global access

    if (token.userType === UserType.TEACHER) {
        if (token.schoolId != id) return false;

        if (opType === OpType.Write) {
            return token.isSchoolLeader ? '*' : false; // only school leaders can update the school
        }

        return '*'; // right school for reads
    }

    // writes aren't allowed by parents to a school!
    if (opType === OpType.Write) return false;

    // otherwise, parent must have at least one child in the school.
    return (await LwpSchool.createQueryBuilder('ls')
        .innerJoin('ls.pupils', 'lp')
        .innerJoin('lp.parents', 'lpp')
        .where('lpp.parentId = :id', { id: token.sub })
        .andWhere('ls.id = :id', { id })
        .getCount()) >= 1
        ? '*'
        : false;
})
export class LwpSchool extends BaseAuthorizerEntity {
    @Field()
    @Column()
    @AuthorizeField(UnrestrictedField)
    schoolName: string;

    @OneToMany(() => LwpUser, (child) => child.school)
    @Field(() => [LwpUser])
    @AuthorizeField(TeacherField)
    schoolLeaders: LwpUser[];

    @OneToMany(() => LwpSchoolClass, (child) => child.school)
    @Field(() => [LwpSchoolClass])
    @AuthorizeField(TeacherField)
    classes: LwpSchoolClass[];

    @ManyToMany(() => LwpSchoolHoliday, (holiday) => holiday.schools, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    @Field(() => [LwpSchoolHoliday], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    schoolHolidays: LwpSchoolHoliday[];

    @OneToMany(() => LwpSchoolStaticTags, (tag) => tag.school, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    @Field(() => [LwpSchoolStaticTags], { nullable: true })
    schoolTags: LwpSchoolStaticTags[];

    @OneToMany(() => LwpSchoolClass, (child) => child.school)
    schoolPupilTags: LwpSchoolClass[];

    @Field()
    @Column({ default: false })
    @AuthorizeField(UnrestrictedField)
    setTopicPermission: boolean;

    @Field()
    @Column({ default: false })
    @AuthorizeField(TeacherField)
    enableAddClasses: boolean;

    @Field(() => DateOnly, { nullable: true })
    @Column({ type: 'date', transformer: dateValueTransformer, nullable: true })
    @AuthorizeField(UnrestrictedField)
    parentFeedbackTickFeatureEnabledAt: Date;

    @Field({ nullable: true })
    @Column({ nullable: true, default: false })
    @AuthorizeField(UnrestrictedField)
    isParentFeedbackReplyFeatureEnabled: boolean;

    @Field({ nullable: true })
    @Column({ nullable: true, default: false })
    @AuthorizeField(UnrestrictedField)
    isParentFeedbackStickerFeatureEnabled: boolean;

    @Field({ nullable: true })
    @Column({ nullable: true, default: false })
    @AuthorizeField(TeacherField)
    isMoneySkillsAvailable: boolean;

    @Field()
    @Column({ default: false })
    @AuthorizeField(TeacherField)
    isReadyTeddyAvailable: boolean;

    @Field()
    @Column({ default: false })
    skipAutoWondeImport: boolean;

    @Field()
    @Column({ default: false })
    inactive: boolean;

    @Field()
    @Column({ default: false })
    @AuthorizeField(AdminField)
    ignoreAcademicYearCheckDuringImport: boolean;

    @Field()
    @Column({ default: false })
    @AuthorizeField(AdminField)
    hasCurrentAcademicYearWondeData: boolean;

    @Column({ type: 'jsonb', nullable: true, array: false, default: { email: true, microsoft: false, google: false } })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    socialLoginPermissions: SchoolSocialLoginPerms;

    @Field()
    @Column({ default: false })
    isTestSchool: boolean;

    @Field({ nullable: true })
    @Column({ unique: true, nullable: true })
    urn: string;

    @Field({ nullable: true })
    @Column({ default: null, nullable: true })
    @AuthorizeField(TeacherField)
    misIntegration: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    misName: string;

    @Field({ nullable: true })
    @Column({ default: null, nullable: true })
    @AuthorizeField(UnrestrictedField)
    logo: string;

    @Field(() => ImportStatus, { nullable: true })
    @Column({ default: null, nullable: true })
    @AuthorizeField(TeacherField)
    importStatus: ImportStatus;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    lastImportedAt: Date | null;

    @Field({ nullable: true })
    @Column({ default: null, nullable: true, unique: true })
    importedSchoolId: string;

    @Field()
    @Column({ default: 0 })
    @AuthorizeField(TeacherField)
    numOfFullProgrammeClassesAllowed: number;

    @Field()
    @Column({ default: 0 })
    @AuthorizeField(TeacherField)
    numOfTotalClassesAllowed: number;

    @Field(() => SpmSchoolData, { nullable: true })
    spmData: SpmSchoolData;

    @Field(() => SchoolAllowedClassesInfo, { nullable: true })
    @AuthorizeField(TeacherField)
    remainingAllowedClassesInfo: SchoolAllowedClassesInfo;

    @Field()
    @Column({ default: 0 })
    @AuthorizeField(TeacherField)
    commentsAndPhotos: number;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    lastTrophyLeaderEmailSent: Date;

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
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    logUpdatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['deletedBy.id'])
    deletedBy: LwpUser;

    @OneToMany(() => LogSchoolClassLicense, (log) => log.school, { nullable: true })
    @Field(() => [LogSchoolClassLicense], { nullable: true })
    logSchoolClassLicenses: LogSchoolClassLicense[];

    @OneToMany(() => LwpPupil, (child) => child.school, { nullable: true })
    @Field(() => [LwpPupil], { nullable: true })
    @AuthorizeField(TeacherField)
    pupils: LwpPupil[];

    @OneToMany(() => LwpSticker, (child) => child.school, { nullable: true })
    @Field(() => [LwpSticker], { nullable: true })
    @AuthorizeField(TeacherField)
    stickers: LwpSticker[];

    @OneToMany(() => LwpPupil, (child) => child.deletedSchool, { nullable: true })
    @Field(() => [LwpPupil], { nullable: true })
    @AuthorizeField(TeacherField)
    deletedPupils: LwpPupil[];

    @Field()
    @Column({ nullable: true, default: false })
    @AuthorizeField(TeacherField)
    isWondeDataSyncedWithLwp: boolean;

    @Field()
    @Column({ default: 'Learning with Parents' })
    @AuthorizeField(UnrestrictedField)
    organisations: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    termsAndConditions: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    privacyPolicy: string;

    @Field()
    @Column({ default: false })
    @AuthorizeField(UnrestrictedField)
    enableBookNameOnlyReadingLog: boolean;

    @AuthorizeField(TeacherField)
    @Field({ nullable: true })
    @Column({ nullable: true, default: false })
    isDownloadSchoolData: boolean;

    @Field({ nullable: true })
    @Column({ nullable: true })
    tenantDomain?: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    msTenantIssuer?: string;

    @Column({ nullable: true })
    region?: string;

    @Field(() => ImportedSchool, { nullable: true })
    @OneToOne(() => ImportedSchool, (s) => s.lwpSchool, { nullable: true })
    @AuthorizeField(TeacherField)
    importedSchool?: ImportedSchool;

    @ManyToOne(() => StaticLwpPeriod, (t) => t.schools, { onDelete: 'RESTRICT' })
    @Field(() => StaticLwpPeriod, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    curentPeriod: StaticLwpPeriod;

    @RelationId((school: LwpSchool) => school.curentPeriod)
    periodIndex: number;

    @Field(() => StaticLwpPeriod, { nullable: true })
    @AuthorizeField(TeacherField)
    nextPeriod: StaticLwpPeriod;

    @OneToMany(() => LwpSchoolImpactReport, (impactReport) => impactReport.school, { nullable: true })
    @Field(() => [LwpSchoolImpactReport], { nullable: true })
    impactReports: LwpSchoolImpactReport[];

    @Field(() => [StaticLwpSchoolTag], { nullable: true })
    tags: StaticLwpSchoolTag[];

    // Resolved (DataLoader-backed) on the school resolver: true when the school has any uninvited (IMPORTED)
    // staff. Drives the admin Schools Overview warning icon.
    @Field(() => Boolean)
    @AuthorizeField(AdminField)
    hasUninvitedStaff: boolean;

    // Resolved (DataLoader-backed) on the school resolver: true when the school has any ACTIVE school leader who
    // has never been sent the welcome email. Scopes the admin Schools Overview "Send welcome emails" button.
    @Field(() => Boolean)
    @AuthorizeField(AdminField)
    hasSchoolLeadersAwaitingWelcome: boolean;

    @Field(() => [StaticLwpFeatures], { nullable: true })
    @AuthorizeField(({ token }) => token.isSchoolLeader)
    features: StaticLwpFeatures[];

    // this field is used to check if the school has an impact report and it will allow the school leader to see the impact report
    @Field({ nullable: true })
    @AuthorizeField(({ token }) => token.isSchoolLeader)
    impactReportExists: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    isReadyTeddyEnabled: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    isDataImportReviewEnabledForSchool: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    isScrapbookEnabledForSchool: boolean;

    @Field(() => PupilWithoutClassCounts, { nullable: true })
    @AuthorizeField(TeacherField)
    pupilsWithoutClassesCount: PupilWithoutClassCounts;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    pupilsWithoutMISCount: number;

    @Field()
    @AuthorizeField(TeacherField)
    pendingImportActionsCount: number;
}
