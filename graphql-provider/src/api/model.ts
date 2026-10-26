/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
import { Field, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
    ContentStatus,
    FeatureCode,
    FeatureStatus,
    FeatureTooltipTargets,
    FeedbackReplyType,
    FeedbackType,
    Gender,
    ImpactReportVersion,
    InterstitialLastActionType,
    InterstitialType,
    InterstitialUserOption,
    InviteMode,
    MediaTypeForAllFeeds,
    PageAnnouncementStatus,
    PageAnnouncementUserOption,
    PupilParentStatus,
    ReadingBookOptions,
    ReadingMode,
    SchoolAnalyticsGraphType,
    SchoolImpactReportFeedbackContentType,
    SchoolImpactReportType,
    SequenceAssignmentStatus,
    SequenceItemSkipReason,
    SequenceTimingMode,
    SetByTeacherDataType,
    SubjectProgrammeType,
    UserStatus,
    WholeSchoolSequenceStatus,
    WholeSchoolYearGroupSkipReason
} from 'lwp-shared/enums';
import { AdminField, AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { AuthMethod } from 'src/auth/types/AuthMethod';
import { TokenPair } from 'src/auth/types/TokenPair';
import { UserType } from 'src/auth/types/UserType';
import { Mail } from 'src/common/notification/notification.types';

import { LwpBuildType } from './dtos/LwpBuildType';
import { LwpSchoolImpactReportV1Output } from './dtos/LwpSchoolImpactReportV1Output';
import { WithPagination } from './dtos/WithPagination';
import { LwpSchoolImpactReport } from './entities/lwp_school_impact_report';
import { LwpSticker } from './entities/lwp_sticker';
import { LwpPupilParent } from './entities/pupil_parent';
import { DateOnly } from './entities/scalar/DateOnly.scalar';
import { StaticLwpSubject } from './entities/static_lwp_subject';
import { SourceTypeForOpenCounter } from './types/SourceTypeForOpenCounter';

@ObjectType()
export class AdminRestrictions {
    @Field({ nullable: true })
    techToolKit: boolean;

    @Field({ nullable: true })
    siteAdmins: boolean;

    @Field({ nullable: true })
    siteData: boolean;
}
@ObjectType()
export class SchoolAllowedClassesInfo {
    @Field()
    @AuthorizeField(TeacherField)
    fullProgramme: number;

    @Field()
    @AuthorizeField(TeacherField)
    total: number;
}
@ObjectType()
export class SpmEngagementMetric {
    @Field({ nullable: true })
    activePercent: number | null;

    @Field({ nullable: true })
    inactivePercent: number | null;
}

@ObjectType()
export class SpmClassTargetMetric {
    @Field()
    className: string;

    @Field({ nullable: true })
    activePercent: number | null;
}

@ObjectType()
export class SpmSchoolData {
    @Field({ nullable: true })
    activatedClassCount: number;

    @Field({ nullable: true })
    hasUnconfirmedParentDetails: boolean;

    @Field({ nullable: true })
    readingLogLaunchDate: Date | null;

    @Field({ nullable: true })
    mathsEnglishLaunchDate: Date | null;

    @Field({ nullable: true })
    moneySkillsLaunchDate: Date | null;

    @Field(() => SpmEngagementMetric, { nullable: true })
    readingLogCurrentTerm: SpmEngagementMetric;

    @Field(() => SpmEngagementMetric, { nullable: true })
    readingLogCurrentTermComment: SpmEngagementMetric;

    @Field(() => SpmEngagementMetric, { nullable: true })
    readingLogPreviousTermComment: SpmEngagementMetric;

    @Field(() => [SpmClassTargetMetric], { nullable: true })
    readingLogTargetByClass: SpmClassTargetMetric[];

    @Field({ nullable: true })
    teacherFeedbackInUse: boolean | null;

    @Field({ nullable: true })
    schoolReadingTarget: number | null;

    @Field(() => SpmEngagementMetric, { nullable: true })
    topicsCurrentTerm: SpmEngagementMetric;

    @Field(() => SpmEngagementMetric, { nullable: true })
    activitiesCurrentTerm: SpmEngagementMetric;

    @Field({ nullable: true })
    pupilPremiumPercent: number | null;

    @Field({ nullable: true })
    teacherFeedbackCount: number | null;

    @Field({ nullable: true })
    topicsSetCount: number | null;
}

@ObjectType()
export class RejectMagicLinkOutput {
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    pupilName: string;
}
@ObjectType()
export class PupilTopicProgressOutput {
    @Field()
    @AuthorizeField(UnrestrictedField)
    text: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    icon: string;
}
@ObjectType()
export class ParentsContext {
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    allParentsRejectedOrImported: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    allParentsRejected: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    allParentsNotActiveAndAtLeastOneInvited: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    allAwaitingInviteParents: boolean;
}
@ObjectType()
export class ClassPupilsForRegisterTableOutput {
    @Field(() => [ClassTopicOutput])
    @AuthorizeField(TeacherField)
    classTopics: ClassTopicOutput[];

    @Field(() => [ClassPupilForRegisterTableOutput])
    @AuthorizeField(TeacherField)
    pupils: ClassPupilForRegisterTableOutput[];
}
@ObjectType()
export class ClassPupilForRegisterTableOutput {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field()
    @AuthorizeField(TeacherField)
    fullname: string;

    @Field()
    @AuthorizeField(TeacherField)
    allParentsRejected: boolean;

    @Field()
    @AuthorizeField(TeacherField)
    allParentsRejectedOrImported: boolean;

    @Field()
    @AuthorizeField(TeacherField)
    allParentsNotActiveAndAtLeastOneInvited: boolean;

    @Field()
    @AuthorizeField(TeacherField)
    noParents: boolean;

    @Field(() => PupilStatus)
    @AuthorizeField(TeacherField)
    pupilStatus: PupilStatus;
}
@ObjectType()
export class PupilTopicOutput {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field()
    @AuthorizeField(TeacherField)
    pupil_id: string;

    @Field()
    @AuthorizeField(TeacherField)
    watchedVideo: boolean;

    @Field()
    @AuthorizeField(TeacherField)
    silverStars: number;

    @Field()
    @AuthorizeField(TeacherField)
    earnedGoldStar: boolean;

    @Field()
    @AuthorizeField(TeacherField)
    totalEarnedStars: number;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    classTopicId: string;
}
@ObjectType()
export class ClassTopicOutput {
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    id: string;

    @Field(() => DateOnly)
    @AuthorizeField(TeacherField)
    releaseDate: Date;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    readingTarget: number;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    schoolClassName: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    isRegistrationClass: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    topicClassId: string;

    @Field()
    @AuthorizeField(TeacherField)
    staticTopicName: string;

    @Field(() => [String])
    @AuthorizeField(TeacherField)
    staticTopicSubjects: string[];

    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    isReadingTopic: boolean;

    @Field()
    @AuthorizeField(TeacherField)
    staticTopicActivitiesCount: number;

    @Field(() => [PupilTopicOutput])
    @AuthorizeField(TeacherField)
    pupilTopics: PupilTopicOutput[];
}

@ObjectType()
export class LastLoginOptions {
    @Field({ nullable: true })
    browserName: string;

    @Field({ nullable: true })
    osName: string;

    @Field(() => DeviceType, { nullable: true })
    deviceType: DeviceType;

    @Field({ nullable: true })
    date: Date;

    @Field({ nullable: true })
    loginType: AuthMethod;

    @Field({ nullable: true })
    userType: UserType;

    @Field({ nullable: false })
    userAgent: string;
}
@ObjectType()
export class PupilTotalStarCountOutput {
    @Field()
    @AuthorizeField(UnrestrictedField)
    silverStars: number;

    @Field()
    @AuthorizeField(UnrestrictedField)
    goldStars: number;
}
@ObjectType()
export class SchoolClassAndGroupsOutput {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field()
    @AuthorizeField(TeacherField)
    name: string;

    @Field()
    @AuthorizeField(TeacherField)
    isMyClass: boolean;

    @Field()
    @AuthorizeField(TeacherField)
    isFullProgramme: boolean;

    @Field()
    @AuthorizeField(TeacherField)
    isGroupAcrossClasses: boolean;

    @Field()
    @AuthorizeField(TeacherField)
    isPreAdmissionClass?: boolean;

    @Field()
    @AuthorizeField(TeacherField)
    isReadyTeddyEnabled?: boolean;

    @Field()
    @AuthorizeField(TeacherField)
    IsReadingLogsEnabled: boolean;

    @Field(() => SchoolClassStatus)
    @AuthorizeField(TeacherField)
    status: SchoolClassStatus;

    @Field(() => [GroupOutput])
    @AuthorizeField(TeacherField)
    groups: GroupOutput[];
}

@ObjectType()
export class ScheduleClassesGroupsOutput {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field()
    @AuthorizeField(TeacherField)
    name: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    schoolClass?: string;

    @Field()
    @AuthorizeField(TeacherField)
    year: string;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    isMyClass: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    isMyGroup: boolean;
}

@ObjectType()
export class GroupOutput {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field()
    @AuthorizeField(TeacherField)
    name: string;

    @Field()
    @AuthorizeField(TeacherField)
    schoolClass?: string;

    @Field()
    @AuthorizeField(TeacherField)
    isMyGroup: boolean;

    @Field(() => Boolean)
    @AuthorizeField(TeacherField)
    hasTopics?: boolean;

    @Field(() => Boolean)
    @AuthorizeField(TeacherField)
    isReadingClass?: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    isPreAdmissionClass?: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    isReadyTeddyEnabled?: boolean;
}
@InputType()
export class AdminRestrictionsInput {
    @Field({ nullable: true })
    techToolKit: boolean;

    @Field({ nullable: true })
    siteAdmins: boolean;

    @Field({ nullable: true })
    siteData: boolean;
}
@InputType()
export class UpdateSocialLoginPermissionsInput {
    @Field()
    id: string;

    @Field()
    email: boolean;

    @Field()
    microsoft: boolean;

    @Field()
    google: boolean;

    @Field({ nullable: true })
    tenantDomain?: string;

    @Field({ nullable: true })
    msTenantIssuer?: string;
}

@InputType()
export class PurchaseAdditionalClassLicencesInput {
    @Field()
    schoolId: string;

    @Field()
    fullProgrammeClassesCount: number;

    @Field()
    totalClassCount: number;

    @Field({ nullable: true })
    requestedFullProgrammeClassCount: number;

    @Field({ nullable: true })
    requestedReadingOnlyClassCount: number;

    @Field({ nullable: true })
    requestedUpgradeClassCount: number;

    @Field({ nullable: true })
    fullProgrammeClassPrice: number;

    @Field({ nullable: true })
    readingOnlyClassPrice: number;

    @Field()
    totalPrice: number;

    @Field(() => [String])
    emails: string[];

    @Field({ nullable: true })
    readyTeddyClassesCount: number;

    @Field({ nullable: true })
    requestedReadyTeddyClassCount: number;

    @Field({ nullable: true })
    readyTeddyClassPrice: number;
}
@InputType()
export class SchoolClassInput {
    @Field()
    name: string;

    @Field()
    yearGroup: string;

    @Field()
    schoolId: string;

    @Field({ nullable: true })
    isReadingLogsEnabled: boolean;

    @Field({ nullable: true })
    isRegistrationClass: boolean;

    @Field({ nullable: true })
    isFullProgramme: boolean;

    @Field({ nullable: true })
    isReadyTeddy: boolean;

    @Field(() => String)
    mainTeacher: string;

    @Field(() => [String], { nullable: true })
    teachers: string[];

    @Field({ nullable: true })
    periodId: number;

    @Field({ nullable: true })
    readingTarget: number;

    @Field({ nullable: true })
    readingStartDay: number;

    @Field({ nullable: true })
    readingLaunchDate: Date;

    @Field(() => SchoolClassStatus, { nullable: true })
    status: SchoolClassStatus;

    @Field({ nullable: true })
    lastYearsInheritedClassId: string;

    @Field({ nullable: true, deprecationReason: 'Manually-created classes can no longer be linked to Wonde' })
    wondeClassId: string;
}
@InputType()
export class CreateGroupAcrossClassesInput {
    @Field()
    name: string;

    @Field()
    yearGroup: string;

    @Field()
    schoolId: string;

    @Field(() => String)
    mainTeacher: string;

    @Field(() => [String])
    teachers: string[];

    @Field(() => [String])
    pupilIds: string[];
}
@InputType()
export class GroupWithinSchoolClassInput {
    @Field()
    name: string;

    @Field()
    classId: string;

    @Field()
    skipGroupPupils: boolean;

    @Field(() => String)
    mainTeacher: string;

    @Field(() => [String], { nullable: true })
    teacherIds: string[];

    @Field(() => [String])
    pupilIds: string[];

    @Field(() => [String])
    subjectIds: string[];

    @Field({ nullable: true })
    inviteImportedTeachers: boolean;

    @Field()
    isReadingLogEnabled: boolean;
}
@InputType()
export class UpdateGroupWithinSchoolClassInput {
    @Field()
    groupId: string;

    @Field({ nullable: true })
    name: string;

    @Field(() => String)
    mainTeacher: string;

    @Field(() => [String], { nullable: true })
    teacherIds: string[];
}

@InputType()
export class UpdateSchoolClassInput {
    @Field({ nullable: false })
    id: string;

    @Field({ nullable: true })
    name: string;

    @Field({ nullable: true })
    yearGroup: string;

    @Field({ nullable: true })
    isReadingLogsEnabled: boolean;

    @Field({ nullable: true })
    isRegistrationClass: boolean;

    @Field({ nullable: true })
    isLocked: boolean;

    @Field({ nullable: true })
    isFullProgramme: boolean;

    @Field({ nullable: true })
    isReadyTeddy: boolean;

    @Field(() => SchoolClassStatus, { nullable: true })
    status: SchoolClassStatus;

    @Field({ nullable: true })
    readingTarget: number;

    @Field({ nullable: true })
    readingLaunchDate: Date;

    @Field({ nullable: true })
    readingStartDay: number;

    @Field(() => String, { nullable: true })
    mainTeacher: string;

    @Field(() => [String], { nullable: true })
    teachers: string[];

    @Field({ nullable: true })
    lastYearsInheritedClassId: string;

    @Field({ nullable: true, deprecationReason: 'Classes are no longer updateable to reassign them to other Wonde classes.' })
    wondeClassId: string;
}

@InputType()
export class PupilInput {
    @Field({ nullable: false })
    firstname: string;

    @Field({ nullable: false })
    lastname: string;

    @Field({ nullable: true })
    classId: string;

    @Field({ nullable: true })
    upn: string;

    @Field({ nullable: true })
    dateOfBirth: Date;

    @Field({ nullable: true })
    startedSchool: string;

    @Field(() => Gender, { nullable: true })
    gender: Gender;

    @Field({ nullable: true })
    isPupilPremium: boolean;

    @Field({ nullable: true })
    pupilCurrentStatus: PupilStatus;
}

@InputType()
export class UpdatePupilInput {
    @Field({ nullable: false })
    id: string;

    @Field({ nullable: true })
    firstname: string;

    @Field({ nullable: true })
    lastname: string;

    @Field({ nullable: true })
    isPremium: boolean;

    @Field({ nullable: true })
    UPN: string;
}

@InputType()
export class ChangeClassPupilPremiumInput {
    @Field()
    id: string;

    @Field()
    isPremium: boolean;
}

@InputType()
export class SchoolLeaderInput {
    @Field()
    firstname: string;

    @Field()
    lastname: string;

    @Field()
    email: string;

    @Field()
    nameForChildren: string;

    /** @deprecated Legacy boolean kept for the transition; new callers should send `inviteMode`. TODO(LEA-6305): remove. */
    @Field({ defaultValue: true })
    sendInvite: boolean;

    @Field(() => InviteMode, { nullable: true })
    inviteMode?: InviteMode;
}

@InputType()
export class ActivityDataInput {
    @Field()
    name: string;

    @Field()
    order: number;

    @Field()
    activityComponentName: string;
}

@InputType()
export class PupilInputForCreateSchoolData {
    @Field()
    parentFirstName: string;

    @Field()
    parentLastName: string;

    @Field()
    parentEmailForInvitation: string;

    @Field({ nullable: true })
    parentPhoneNumberForInvitation: string;

    @Field()
    pupilFirstName: string;

    @Field()
    pupilLastName: string;

    @Field({ nullable: true })
    pupil2FirstName: string;

    @Field({ nullable: true })
    pupil2LastName: string;
}

@InputType()
export class TeacherInputForTesting {
    @Field()
    firstname: string;

    @Field()
    lastname: string;

    @Field()
    email: string;

    @Field()
    nameForChildren: string;

    @Field({ defaultValue: true })
    sendInvite: boolean;
}

@InputType()
export class CreateSchoolDataForTestingInput {
    @Field()
    schoolName: string;

    @Field()
    className: string;

    @Field({ nullable: true })
    topicName: string;

    @Field()
    leaderPassword: string;

    @Field({ defaultValue: true })
    registerParent: boolean;

    @Field({ defaultValue: false })
    addReading: boolean;

    @Field({ defaultValue: 5 })
    readingTarget: number;

    @Field({ defaultValue: false })
    addTopics: boolean;

    @Field(() => [ActivityDataInput], { nullable: true })
    activityData: ActivityDataInput[];

    @Field(() => SchoolLeaderInput)
    leader: SchoolLeaderInput;

    @Field(() => TeacherInputForTesting, { nullable: true })
    teacherInput: TeacherInputForTesting;

    @Field(() => PupilInputForCreateSchoolData)
    pupilInput: PupilInputForCreateSchoolData;
}
@InputType()
export class SchoolAndDummyWondeDataInput {
    @Field()
    schoolName: string;

    @Field({ nullable: true })
    fullProgrammedClassesAllowed: number;

    @Field({ nullable: true })
    classesAllowed: number;

    @Field()
    leaderPassword: string;

    @Field(() => SchoolLeaderInput)
    leader: SchoolLeaderInput;
}

@InputType()
export class ParentFilter {
    @Field({ nullable: true })
    startsWith: string;
}

@InputType()
export class ParentInput {
    @Field()
    firstname: string;

    @Field()
    lastname: string;

    @Field({ nullable: true })
    email: string;

    @Field({ nullable: true })
    phoneNumber: string;
}
@InputType()
export class InviteParentForPupilInput extends ParentInput {
    @Field()
    pupilId: string;
}
@InputType()
export class TransferPupilParentInput extends ParentInput {
    @Field()
    pupilParentId: string;
}

@InputType()
export class UpdateParentInput extends ParentInput {
    @Field({ nullable: false })
    id: string;

    @Field({ nullable: true })
    isDeactivated: boolean;
}
@InputType()
export class UpdateNonActiveParentInput extends ParentInput {
    @Field()
    id: string;
}

@InputType()
export class GenerateMathscotCertificateInput {
    @Field({ nullable: false })
    teacherId: string;

    @Field(() => [String], { nullable: false })
    pupilIds: string[];

    @Field({ nullable: false })
    trophyId: string;
}

@InputType()
export class GenerateSendMathscotCertificateInput extends GenerateMathscotCertificateInput {
    @Field({ nullable: true })
    message: string;
}

@InputType()
export class TeacherInput {
    @Field()
    firstname: string;

    @Field()
    lastname: string;

    @Field()
    email: string;

    @Field()
    nameForChildren: string;

    @Field()
    schoolId: string;

    /** @deprecated Legacy boolean kept for the transition; new callers should send `inviteMode`. TODO(LEA-6305): remove. */
    @Field({ defaultValue: true })
    sendInvite: boolean;

    @Field(() => InviteMode, { nullable: true })
    inviteMode?: InviteMode;

    @Field(() => TeacherRole)
    role: TeacherRole;
}

@InputType()
export class InviteTeacherInput {
    @Field()
    teacherId: string;

    @Field()
    schoolId: string;
}

@InputType()
export class SchoolInput {
    @Field()
    schoolName: string;

    @Field({ nullable: true })
    logo: string;

    @Field({ nullable: true })
    urn: string;

    @Field(() => SchoolLeaderInput)
    leader: SchoolLeaderInput;

    @Field()
    fullProgrammedClassesAllowed: number;

    @Field()
    classesAllowed: number;

    @Field()
    email: boolean;

    @Field()
    microsoft: boolean;

    @Field()
    google: boolean;
}
@InputType()
export class UpdateSchoolInput {
    @Field()
    id: string;

    @Field({ nullable: true })
    schoolName: string;

    @Field({ nullable: true })
    logo: string;

    @Field({ nullable: true })
    urn: string;

    @Field()
    hasImage: boolean;

    @Field()
    enableAddClasses: boolean;

    @Field()
    inactive: boolean;

    @Field()
    isTestSchool: boolean;

    @Field()
    skipAutoWondeImport: boolean;

    @Field()
    ignoreAcademicYearCheckDuringImport: boolean;

    @Field()
    organisations: string;

    @Field({ nullable: true })
    termsAndConditions: string;

    @Field({ nullable: true })
    privacyPolicy: string;

    @Field(() => [String])
    tags: string[];

    @Field()
    isMoneySkillsAvailable: boolean;

    @Field()
    isReadyTeddyAvailable: boolean;
}

@InputType()
export class GetSchoolsForSchoolOverviewInput {
    @Field()
    inactive: boolean;

    @Field()
    isTestSchool: boolean;

    @Field()
    needImpactReportGenerating: boolean;
}
@InputType()
export class GetTagsForTagOverviewInput {
    @Field({ nullable: true })
    deletedItems: boolean;
}

registerEnumType(FeatureStatus, {
    name: 'FeatureStatus'
});

registerEnumType(FeatureCode, {
    name: 'FeatureCode'
});

registerEnumType(InterstitialUserOption, {
    name: 'InterstitialUserOption'
});

export enum WondeReImportFrequency {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    NEVER = 'NEVER'
}

registerEnumType(WondeReImportFrequency, {
    name: 'WondeReImportFrequency'
});

// InviteMode lives in the shared package (shared by FE + BE); re-exported here and registered for GraphQL.
export { InviteMode };

registerEnumType(InviteMode, {
    name: 'InviteMode'
});

export enum ReadingType {
    SCHOOL_BOOK = 'SCHOOL_BOOK',
    OWN_BOOK = 'OWN_BOOK',
    SOMETHING_ELSE = 'SOMETHING_ELSE'
}

registerEnumType(ReadingType, {
    name: 'ReadingType'
});

// FeedbackType lives in the shared package (shared by FE + BE); re-exported here and registered for GraphQL.
export { FeedbackType };

registerEnumType(FeedbackType, {
    name: 'FeedbackType'
});

export { ReadingMode };

registerEnumType(ReadingMode, {
    name: 'ReadingMode'
});

export enum MediaType {
    PHOTO = 'PHOTO',
    AUDIO = 'AUDIO',
    VIDEO = 'VIDEO'
}

registerEnumType(MediaType, {
    name: 'MediaType'
});

registerEnumType(SchoolImpactReportFeedbackContentType, {
    name: 'SchoolImpactReportFeedbackContentType'
});

export enum SchoolClassLicenceOperationType {
    SCHOOL_CREATED = 'SCHOOL_CREATED',
    SET_BY_ADMIN = 'SET_BY_ADMIN',
    UPDATED_BY_SCHOOL = 'UPDATED_BY_SCHOOL'
}

registerEnumType(SchoolClassLicenceOperationType, {
    name: 'SchoolClassLicenceOperationType'
});

export enum TeacherRole {
    CLASS_TEACHER = 'CLASS_TEACHER',
    SCHOOL_LEADER = 'SCHOOL_LEADER'
}

registerEnumType(TeacherRole, {
    name: 'TeacherRole'
});

export enum ClassTopicDeleteOptions {
    ALL_PUPIL_TOPICS = 'ALL_PUPIL_TOPICS',
    PUPIL_TOPICS_WITH_NO_FEEDBACK = 'PUPIL_TOPICS_WITH_NO_FEEDBACK'
}

registerEnumType(ClassTopicDeleteOptions, {
    name: 'ClassTopicDeleteOptions'
});

export enum SharedStatus {
    ALL = 'ALL',
    SHAREDONLY = 'SHAREDONLY',
    SHAREDPHOTOSONLY = 'SHAREDPHOTOSONLY',
    INCLUDEDINIMPACTREPORT = 'INCLUDEDINIMPACTREPORT'
}

registerEnumType(SharedStatus, {
    name: 'SharedStatus'
});

registerEnumType(UserStatus, {
    name: 'UserStatus'
});

registerEnumType(PupilParentStatus, {
    name: 'PupilParentStatus'
});

export enum ChildPage {
    READING = 'READING',
    PUPILTOPIC = 'PUPILTOPIC',
    PUPILACTIVITY = 'PUPILACTIVITY'
}

registerEnumType(ChildPage, {
    name: 'ChildPage'
});

@InputType()
export class UpdateTeacherInput extends TeacherInput {
    @Field({ nullable: false })
    id: string;

    @Field({ nullable: true })
    isDeactivated: boolean;
}

@InputType()
export class LoginInput {
    @Field({ nullable: false })
    email: string;

    @Field({ nullable: false })
    password: string;

    @Field({ nullable: true })
    verificationCode: string;
}

@InputType()
export class SocialLoginParameters {
    @Field({ nullable: true })
    expectedEmailOrPhone: string;

    @Field({ nullable: true })
    magicLinkToken: string;

    @Field({ nullable: true })
    accessToken: string;
}

@InputType()
export class SocialLoginParametersForTesting extends SocialLoginParameters {
    @Field({ nullable: true })
    cypressEmail: string;
}
@InputType()
export class SocialLoginInput {
    @Field()
    code: string;

    @Field(() => SocialLoginParameters)
    params: SocialLoginParameters;
}

@InputType()
export class RefreshTokenInput {
    @Field({ nullable: false })
    accessToken: string;

    @Field({ nullable: false })
    refreshToken: string;
}

@ObjectType()
export class MagicLinkOutput {
    @Field({ nullable: false })
    @AuthorizeField(UnrestrictedField)
    type: MagicLinkType;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    tokens?: TokenPair;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    pupilId?: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    pupilTopicId?: string;
}

@ObjectType()
export class PupilGroupAndClassOutput {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field()
    @AuthorizeField(TeacherField)
    name: string;

    @Field()
    @AuthorizeField(TeacherField)
    yearGroup: string;
}
@ObjectType()
export class ClassesAndGroupsInfoOfPupilsOutput {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field()
    @AuthorizeField(TeacherField)
    pupilName: string;

    @Field(() => [PupilGroupAndClassOutput])
    @AuthorizeField(TeacherField)
    groups: PupilGroupAndClassOutput[];

    @Field(() => [PupilGroupAndClassOutput])
    @AuthorizeField(TeacherField)
    classes: PupilGroupAndClassOutput[];
}

@ObjectType()
export class FeedbackPupilsNameOutput {
    @Field()
    @AuthorizeField(TeacherField)
    firstname: string;

    @Field()
    @AuthorizeField(TeacherField)
    lastname: string;

    @Field()
    @AuthorizeField(TeacherField)
    className: string;
}
@ObjectType()
export class UndoRejectConfirmationOutput {
    @Field({ nullable: false })
    @AuthorizeField(UnrestrictedField)
    pupilParentId: string;

    @Field(() => UserStatus, { nullable: false })
    @AuthorizeField(UnrestrictedField)
    userStatus: UserStatus;
}

@InputType()
export class UserSignUpInput {
    @Field({ nullable: true })
    email: string;

    @Field()
    password: string;

    @Field()
    firstname: string;

    @Field()
    lastname: string;

    @Field({ nullable: true })
    phoneNumber: string;

    @Field({ nullable: true })
    microsoftAuth: boolean;
}

@InputType()
export class ChangePasswordInput {
    @Field()
    id: string;

    @Field({ nullable: false })
    oldPassword: string;

    @Field({ nullable: false })
    newPassword: string;
}

@InputType()
export class ResetPasswordInput {
    @Field({ nullable: true })
    email: string;

    @Field({ nullable: true })
    phoneNumber: string;

    @Field()
    resetPassToken: string;

    @Field()
    password: string;
}

@InputType()
export class RegisterUserEmailInput {
    @Field()
    email: string;

    @Field()
    resetPassToken: string;
}

export class SocialLoginJwt {
    @Field()
    socialAccountId: string;

    @Field(() => UserAssociatedLoginType)
    socialAccountType: UserAssociatedLoginType;

    @Field({ nullable: true })
    lwpUserFullName: string;

    @Field({ nullable: true })
    socialAccountDisplayName: string;

    @Field()
    socialAccountGivenName: string;

    @Field()
    socialAccountSurname: string;

    @Field({ nullable: true })
    socialAccountMobilePhone: string;

    @Field()
    userEmail: string;

    @Field()
    userId: string;

    @Field()
    expectedEmail: string;

    @Field(() => Array<string>, { nullable: true })
    otherMails: string[];

    @Field({ nullable: true })
    socialAccountDisplayImage: string;
}

@InputType()
export class AcceptUserInvitationInput {
    @Field({ nullable: true })
    email: string;

    @Field({ nullable: true })
    verificationCode: string;

    @Field({ nullable: true })
    password: string;

    @Field({ nullable: true })
    socialLoginProvider?: UserAssociatedLoginType;

    @Field({ nullable: true })
    socialLoginJwt: string;

    @Field()
    firstname: string;

    @Field()
    lastname: string;

    @Field({ nullable: true })
    phoneNumber: string;

    @Field({ nullable: true })
    nameForChildren: string;

    @Field()
    resetPassToken: string;
}

@InputType()
export class MergeMathscotItemsForChoicesInput {
    @Field(() => [String], { nullable: false })
    ids: string[];

    @Field({ nullable: false })
    pupilId: string;

    @Field({ nullable: false })
    itemId: string;

    @Field(() => PupilMathscotsCharacter)
    character: PupilMathscotsCharacter;

    @Field(() => PupilMathscotsColour)
    colour: PupilMathscotsColour;
}
@InputType()
export class MergeMathscotItemsInput {
    @Field(() => [String], { nullable: false })
    ids: (string | number)[];

    @Field({ nullable: false })
    pupilId: string;

    @Field(() => PupilMathscotsCharacter)
    character: PupilMathscotsCharacter;

    @Field(() => PupilMathscotsColour)
    colour: PupilMathscotsColour;
}
@InputType()
export class MergeMathscotItemsLogInput {
    @Field({ nullable: false })
    activityId: string;

    @Field({ nullable: false })
    staticActivityId: string;

    @Field({ nullable: false })
    order: number;
}

@ObjectType()
export class MergeMathscotItems {
    @Field(() => [String], { nullable: false })
    @AuthorizeField(UnrestrictedField)
    itemIds: string[];

    @Field(() => String, { nullable: false })
    @AuthorizeField(UnrestrictedField)
    bigImage: string;

    @Field(() => String, { nullable: false })
    @AuthorizeField(UnrestrictedField)
    thumbnailImage: string;
}

@InputType()
export class MathscotChoicesInput {
    @Field({ nullable: false })
    pupilId: string;

    @Field(() => [String], { nullable: true })
    itemIds: string[];

    @Field(() => PupilMathscotsCharacter)
    character: PupilMathscotsCharacter;

    @Field(() => PupilMathscotsColour)
    colour: PupilMathscotsColour;
}

@ObjectType()
export class MergeMathscotChoicesOutput {
    @Field({ nullable: false })
    @AuthorizeField(UnrestrictedField)
    id: string;

    @Field({ nullable: false })
    @AuthorizeField(UnrestrictedField)
    mergedUrl: MergeMathscotItems;
}

@ObjectType()
export class MathscotChoicesOutput {
    @Field({ nullable: false })
    @AuthorizeField(UnrestrictedField)
    adultMathscot: string;

    @Field(() => [MergeMathscotChoicesOutput], { nullable: false })
    @AuthorizeField(UnrestrictedField)
    mergedItems: MergeMathscotChoicesOutput[];
}

@ObjectType('status')
export class OperationStatus {
    @Field({ nullable: false })
    @AuthorizeField(UnrestrictedField)
    status: string;

    @Field({ nullable: false })
    @AuthorizeField(UnrestrictedField)
    msg: string;
}

export enum ImportedType {
    WONDE = 'WONDE',
    CSV = 'CSV'
}

registerEnumType(ImportedType, {
    name: 'ImportedType'
});

registerEnumType(Gender, {
    name: 'Gender'
});

@InputType()
export class LwpActivityTagInput {
    @Field()
    name: string;

    @Field()
    color: string;
}

@InputType()
export class LwpTagUpdateInput {
    @Field({ nullable: false })
    id: string;

    @Field()
    name: string;

    @Field()
    color: string;
}

@InputType()
export class LwpTopicTagInput {
    @Field()
    name: string;

    @Field()
    color: string;

    @Field(() => [String], { nullable: true })
    topicIds: string[];
}

@InputType()
export class LwpTopicTagUpdateInput {
    @Field({ nullable: false })
    id: string;

    @Field()
    name: string;

    @Field()
    color: string;

    @Field(() => [String], { nullable: true })
    topicIds: string[];
}

@InputType()
export class ActivityInput {
    @Field({ nullable: false })
    name: string;

    @Field({ nullable: true })
    resources: string;

    @Field()
    topicId: string;

    @Field({ nullable: false })
    order: number;

    @Field({ nullable: false })
    welcomeMessage: string;

    @Field({ nullable: true })
    rationaleModalId: string;

    @Field({ nullable: false })
    isHidden: boolean;

    @Field({ nullable: false })
    hidePhotoUpload: boolean;

    @Field(() => ActivityType, { nullable: false })
    activityType: ActivityType;

    @Field({ nullable: true })
    details: string;

    @Field(() => [ActivityStepInput], { nullable: true })
    steps: [ActivityStepInput];
}
@InputType()
export class ModalInput {
    @Field()
    name: string;

    @Field({ nullable: true })
    nameForContentDev: string;

    @Field(() => [ActivityStepInput])
    steps: [ActivityStepInput];
}

@InputType()
export class AccordionDataDescriptionInput {
    @Field()
    editorState: string;

    @Field()
    editAsHtml: boolean;
}

@InputType()
export class AccordionDataOutputInput {
    @Field()
    heading: string;

    @Field(() => AccordionDataDescriptionInput)
    description: AccordionDataDescriptionInput;
}

@InputType()
export class checkListInput {
    @Field()
    key: string;

    @Field()
    listItem: string;

    @Field()
    checked: boolean;
}

@InputType()
export class checkListTextDataInput {
    @Field({ nullable: true })
    heading: string;

    @Field({ nullable: true })
    description: string;

    @Field(() => [checkListInput])
    checkList: checkListInput[];
}

export enum carouselType {
    TEXT = 'TEXT',
    IMAGE = 'IMAGE'
}

registerEnumType(carouselType, {
    name: 'carouselType'
});

registerEnumType(SetByTeacherDataType, {
    name: 'SetByTeacherDataType'
});

@ObjectType()
export class SetByTeacherDataOutput {
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    heading: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    subHeading: string;

    @Field(() => SetByTeacherDataType, { nullable: true })
    type: SetByTeacherDataType;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    filename: string;

    @Field()
    @AuthorizeField(TeacherField)
    stepId: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    parentMessage: string | null;
}

@InputType()
export class SetByTeacherStepMessageInput {
    @Field()
    stepId: string;

    @Field({ nullable: true })
    parentMessage?: string;
}

@ObjectType()
export class SetByTeacherData {
    @Field()
    @AuthorizeField(UnrestrictedField)
    heading: string;

    @Field()
    @AuthorizeField(UnrestrictedField)
    subHeading: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    filename?: string;

    @Field(() => SetByTeacherDataType)
    @AuthorizeField(UnrestrictedField)
    type: SetByTeacherDataType;
}
@InputType()
export class SetByTeacherDataInput {
    @Field()
    heading: string;

    @Field()
    subHeading: string;

    @Field(() => SetByTeacherDataType)
    type: SetByTeacherDataType;
}

/**
 * Rules controlling who an activity step is shown to, stored in the step's
 * `visibilityRules` jsonb column.
 *
 * Deliberately generic and step-type agnostic: every activity step type offers this in the
 * admin UI, and further rule keys can be added here later without a migration. Keep the
 * naming free of any one use case.
 *
 * `hideForSchoolTagIds` hides the step from pupils whose school carries any of the listed
 * school tag ids. Absent or empty means the step is shown to everyone. Ids that no longer
 * match a live tag (deleted tags) simply never match, so the step stays visible.
 *
 * The matching happens in the browser, in `filterStepsForViewer` on the frontend, which
 * means a hidden step's content still reaches the browser before being dropped. That is
 * fine for a video id. Do not reuse this to hide anything genuinely sensitive.
 */
@ObjectType()
export class ActivityStepVisibilityRules {
    @Field(() => [String], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    hideForSchoolTagIds: string[];
}

@InputType()
export class ActivityStepVisibilityRulesInput {
    @Field(() => [String], { nullable: true })
    hideForSchoolTagIds: string[];
}

@ObjectType()
export class CarouselData {
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    fileIdentifier: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    imageUrl: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    alt: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    fileName: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    type: carouselType;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    textEditorState: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    labelEditorState: string;
}

@InputType()
export class CarouselDataInput {
    @Field({ nullable: true })
    fileIdentifier: string;

    @Field({ nullable: true })
    imageUrl: string;

    @Field({ nullable: true })
    alt: string;

    @Field({ nullable: true })
    fileName: string;

    @Field({ nullable: true })
    type: carouselType;

    @Field({ nullable: true })
    textEditorState: string;

    @Field({ nullable: true })
    labelEditorState: string;
}

@InputType()
export class ActivityStepInput {
    @Field({ nullable: false })
    order: number;

    @Field(() => ActivityStepType, { nullable: false })
    stepType: ActivityStepType;

    // TextImageStep
    @Field({ nullable: true })
    text: string;

    @Field({ nullable: true })
    imageUrl: string;

    // DownloadStep
    @Field({ nullable: true })
    downloadName: string;

    @Field({ nullable: true })
    downloadUrl: string;

    // LinkStep
    @Field({ nullable: true })
    linkName: string;

    @Field({ nullable: true })
    linkUrl: string;

    @Field({ nullable: true })
    properties: string;

    @Field({ nullable: true })
    textCarouselData: string;

    @Field({ nullable: true })
    tableData: string;

    @Field({ nullable: true })
    editorState: string;

    @Field({ nullable: true })
    editAsHtml: boolean;

    @Field({ nullable: true })
    fileIdentifier: string;

    @Field({ nullable: true })
    fontType: SassoonFontType;

    @Field({ nullable: true })
    selectedModalId: string;

    @Field({ nullable: true })
    fileName: string;

    @Field({ nullable: true })
    btnType: LwpButtonType;

    @Field({ nullable: true })
    fontSize: number;

    @Field({ nullable: true })
    timerData: string;

    @Field({ nullable: true })
    imageCarouselData: string;

    @Field({ nullable: true })
    checklistImageData: string;

    @Field({ nullable: true })
    dimensions: string;

    @Field({ nullable: true })
    includeSeconds: boolean;

    @Field({ nullable: true })
    clickableAlphabetData: string;

    @Field({ nullable: true })
    audioUrl: string;

    @Field({ nullable: true })
    tabsData: string;

    @Field(() => [AccordionDataOutputInput], { nullable: true })
    accordionData: AccordionDataOutputInput[];

    @Field(() => checkListTextDataInput, { nullable: true })
    checkListTextData: checkListTextDataInput;

    @Field(() => [CarouselDataInput], { nullable: true })
    carouselData: CarouselDataInput[];

    @Field(() => SetByTeacherDataInput, { nullable: true })
    setByTeacherData: SetByTeacherDataInput;

    @Field(() => ActivityStepVisibilityRulesInput, { nullable: true })
    visibilityRules: ActivityStepVisibilityRulesInput;
}

export enum ActivityType {
    LEGACY = 'LEGACY',
    STATIC = 'STATIC'
}

registerEnumType(ActivityType, {
    name: 'ActivityType'
});

export enum ActivityStepType {
    TEXT_AND_IMAGE = 'TEXT_AND_IMAGE',
    DOWNLOAD = 'DOWNLOAD',
    LINK = 'LINK',
    DICE = 'DICE',
    INFANT_FONT = 'INFANT_FONT',
    TEXT_CAROUSEL = 'TEXT_CAROUSEL',
    IMAGE_CAROUSEL = 'IMAGE_CAROUSEL',
    MODAL_WITH_CLICKABLE_ALPHABET = 'MODAL_WITH_CLICKABLE_ALPHABET',
    TABLE = 'TABLE',
    MODAL = 'MODAL',
    TEXTDICE = 'TEXTDICE',
    IMAGEDICE = 'IMAGEDICE',
    TIMER = 'TIMER',
    VIDEO = 'VIDEO',
    EDITOR = 'EDITOR',
    IMAGE = 'IMAGE',
    STOPWATCH = 'STOPWATCH',
    AUDIO = 'AUDIO',
    TABS = 'TABS',
    DIGITAL_CHECKLIST = 'DIGITAL_CHECKLIST',
    ACCORDION = 'ACCORDION',
    TEXT_ONLY_DIGITAL_CHECKLIST = 'TEXT_ONLY_DIGITAL_CHECKLIST',
    CAROUSEL = 'CAROUSEL',
    SET_BY_TEACHER = 'SET_BY_TEACHER'
}

registerEnumType(ActivityStepType, {
    name: 'ActivityStepType'
});

export enum SassoonFontType {
    INFANT_RG = 'INFANT_RG',
    INFANT_TK = 'INFANT_TK',
    INFANT_TKB = 'INFANT_TKB'
}

registerEnumType(SassoonFontType, {
    name: 'SassoonFontType'
});

@InputType()
export class UpdateActivityInput {
    @Field({ nullable: false })
    id: string;

    @Field({ nullable: false })
    name: string;

    @Field({ nullable: true })
    resources: string;

    @Field({ nullable: false })
    isHidden: boolean;

    @Field({ nullable: true })
    starValue: number;

    @Field({ nullable: true })
    order: number;

    @Field({ nullable: true })
    welcomeMessage: string;

    @Field({ nullable: true })
    rationaleModalId: string;

    @Field(() => ActivityType, { nullable: true })
    activityType: ActivityType;

    @Field({ nullable: true })
    details: string;

    @Field()
    hasCardImage: boolean;

    @Field()
    hidePhotoUpload: boolean;

    @Field(() => [UpdateActivityStepInput], { nullable: true })
    steps: [UpdateActivityStepInput];

    @Field(() => [String])
    tags: string[];
}
@InputType()
export class UpdateModalInput {
    @Field({ nullable: false })
    id: string;

    @Field({ nullable: true })
    name: string;

    @Field({ nullable: true })
    nameForContentDev: string;

    @Field(() => [UpdateActivityStepInput], { nullable: true })
    steps: [UpdateActivityStepInput];
}
@InputType()
export class UpdateOpenCountInput {
    @Field()
    id: string;

    @Field(() => SourceTypeForOpenCounter)
    type: SourceTypeForOpenCounter;
}

@InputType()
export class TopicInput {
    @Field({ nullable: false })
    teacherTopicName: string;

    @Field({ nullable: true })
    video: string;

    @Field({ nullable: true })
    teacherDescription: string;

    @Field(() => [DomainAndYearGroupInput])
    domainAndYearGroupIds: DomainAndYearGroupInput[];

    @Field({ nullable: true })
    printablesFile: string;

    @Field({ nullable: true })
    parentTopicName: string;

    @Field({ nullable: true })
    teacherEmailBody: string;

    @Field({ nullable: true, defaultValue: false })
    isDemo: boolean;

    @Field({ nullable: true, defaultValue: false })
    isHidden: boolean;

    @Field(() => [String], { nullable: true })
    topicTagId: string[];

    @Field(() => [String], { nullable: true })
    schoolTagId: string[];

    @Field()
    isPublished: boolean;

    @Field({ nullable: true })
    scrapbookPrompt: string;

    @Field()
    noVideo: boolean;

    /** Identifies which of the uploaded files is the teacher resource, as the topic image has no id. */
    @Field({ nullable: true })
    teacherResourceId: string;
}

@InputType()
export class UpdateTopicInput {
    @Field({ nullable: false })
    id: string;

    @Field({ nullable: true })
    teacherTopicName: string;

    @Field({ nullable: true })
    video: string;

    @Field({ nullable: true })
    teacherDescription: string;

    @Field(() => [DomainAndYearGroupInput])
    domainAndYearGroupIds: DomainAndYearGroupInput[];

    @Field()
    hasVideoThumb: boolean;

    @Field({ nullable: true })
    videoThumbId: string;

    @Field()
    hasTeacherPdf: boolean;

    @Field()
    isTeacherPdfRequired: boolean;

    @Field({ nullable: true })
    teacherPdfId: string;

    @Field()
    hasTeacherResource: boolean;

    @Field({ nullable: true })
    teacherResourceId: string;

    @Field({ nullable: true })
    printablesFile: string;

    @Field({ nullable: true })
    alternativeYear: number;

    @Field({ nullable: true })
    parentTopicName: string;

    @Field({ nullable: true })
    teacherEmailBody: string;

    @Field({ nullable: true })
    isDemo: boolean;

    @Field({ nullable: true })
    isHidden: boolean;

    @Field(() => [String], { nullable: true })
    topicTagId: string[];

    @Field(() => [String], { nullable: true })
    schoolTagId: string[];

    @Field()
    isPublished: boolean;

    @Field({ nullable: true })
    scrapbookPrompt: string;

    @Field()
    noVideo: boolean;
}

@InputType()
export class DomainAndYearGroupInput {
    @Field()
    domainId: string;

    @Field()
    yearGroupId: string;
}

@InputType()
export class AddActivityStepsInput {
    @Field({ nullable: false })
    activityId: string;

    @Field(() => [ActivityStepInput], { nullable: false })
    steps: [ActivityStepInput];
}
@InputType()
export class AddModalStepsInput {
    @Field({ nullable: false })
    modalId: string;

    @Field(() => [ActivityStepInput], { nullable: false })
    steps: [ActivityStepInput];
}

@InputType()
export class UpdateActivityStepInput {
    @Field({ nullable: true })
    id: string;

    @Field({ nullable: true })
    order: number;

    @Field(() => ActivityStepType, { nullable: false })
    stepType: ActivityStepType;

    // TextImageStep
    @Field({ nullable: true })
    text: string;

    @Field({ nullable: true })
    imageUrl: string;

    // DownloadStep
    @Field({ nullable: true })
    downloadName: string;

    @Field({ nullable: true })
    downloadUrl: string;

    // LinkStep
    @Field({ nullable: true })
    linkName: string;

    @Field({ nullable: true })
    linkUrl: string;

    @Field({ nullable: true })
    properties: string;

    @Field({ nullable: true })
    textCarouselData: string;

    @Field({ nullable: true })
    tableData: string;

    @Field({ nullable: true })
    editorState: string;

    @Field({ nullable: true })
    editAsHtml: boolean;

    @Field({ nullable: true })
    isNew: boolean;

    @Field({ nullable: true })
    fileIdentifier: string;

    @Field({ nullable: true })
    hasFile: boolean;

    @Field({ nullable: true })
    fontType: SassoonFontType;

    @Field({ nullable: true })
    selectedModalId: string;

    @Field({ nullable: true })
    fileName: string;

    @Field({ nullable: true })
    btnType: LwpButtonType;

    @Field({ nullable: true })
    fontSize: number;

    @Field({ nullable: true })
    timerData: string;

    @Field({ nullable: true })
    imageCarouselData: string;

    @Field({ nullable: true })
    checklistImageData: string;

    @Field({ nullable: true })
    dimensions: string;

    @Field({ nullable: true })
    includeSeconds: boolean;

    @Field({ nullable: true })
    clickableAlphabetData: string;

    @Field({ nullable: true })
    audioUrl: string;

    @Field({ nullable: true })
    tabsData: string;

    @Field(() => [AccordionDataOutputInput], { nullable: true })
    accordionData: AccordionDataOutputInput[];

    @Field(() => checkListTextDataInput, { nullable: true })
    checkListTextData: checkListTextDataInput;

    @Field(() => [CarouselDataInput], { nullable: true })
    carouselData: CarouselDataInput[];

    @Field(() => SetByTeacherDataInput, { nullable: true })
    setByTeacherData: SetByTeacherDataInput;

    @Field(() => ActivityStepVisibilityRulesInput, { nullable: true })
    visibilityRules: ActivityStepVisibilityRulesInput;
}

// Class Topic
@InputType()
export class ClassTopicInput {
    @Field(() => DateOnly, { nullable: false })
    releaseDate: Date;

    @Field(() => DateOnly, { nullable: true })
    dueDate: Date;

    @Field({ nullable: true })
    teacherMessage: string;

    @Field({ nullable: true })
    createdBy: string;

    @Field()
    topicId: string;

    @Field()
    classId: string;

    @Field(() => [String], { nullable: true })
    setByTeacherStepIds?: string[];

    @Field(() => [SetByTeacherStepMessageInput], { nullable: true })
    setByTeacherStepMessages?: SetByTeacherStepMessageInput[];
}

@InputType()
export class AddTopicToClassesInput {
    @Field(() => DateOnly, { nullable: false })
    releaseDate: Date;

    @Field(() => DateOnly, { nullable: true })
    dueDate: Date;

    @Field({ nullable: true })
    teacherMessage: string;

    @Field({ nullable: true })
    createdBy: string;

    @Field()
    topicId: string;

    @Field(() => [String])
    classId: string[] = [];

    @Field(() => [String], { nullable: true })
    setByTeacherStepIds?: string[];

    @Field(() => [SetByTeacherStepMessageInput], { nullable: true })
    setByTeacherStepMessages?: SetByTeacherStepMessageInput[];
}

@InputType()
export class UpdateClassTopicInput {
    @Field()
    id: string;

    @Field(() => DateOnly, { nullable: true })
    releaseDate: Date;

    @Field(() => DateOnly, { nullable: true })
    dueDate: Date;

    @Field({ nullable: true })
    teacherMessage: string;

    @Field(() => [String], { nullable: true })
    setByTeacherStepIds?: string[];

    @Field(() => [SetByTeacherStepMessageInput], { nullable: true })
    setByTeacherStepMessages?: SetByTeacherStepMessageInput[];
}

@InputType()
export class ReadingNoteInput {
    @Field()
    classTopicId: string;

    @Field({ nullable: true })
    readingNote: string;

    @Field({ nullable: true })
    readingTarget: number;
}

@InputType()
export class UpdatePupilTopic {
    @Field()
    id: string;

    @Field()
    watchedVideo: boolean;
}
@InputType()
export class PupilTopicProgressInput {
    @Field()
    id: string;

    @Field(() => Boolean, { nullable: true })
    isReadingTopic: boolean;
}

@InputType()
export class SaveScrapbookFeedbackInput {
    @Field()
    pupilId: string;

    /** The Ready Teddy pupil topic this entry answers. Its period, not the school's, is the year the entry belongs to. */
    @Field()
    pupilTopicId: string;

    @Field({ nullable: true })
    scrapbookPrompt: string;

    @Field({ nullable: true })
    comment: string;

    @Field({ nullable: true })
    sharingAllowed: boolean;

    @Field({ nullable: true })
    sharingAllowedGlobal: boolean;
}

@InputType()
export class UpdateScrapbookFeedbackInput {
    @Field()
    feedbackId: string;

    @Field({ nullable: true })
    comment: string;
}

@InputType()
export class PupilActivityFeedbackInput {
    @Field({ nullable: true })
    id: string;

    @Field()
    pupilActivityId: string;

    @Field()
    pupilId: string;

    @Field({ nullable: true })
    parentComment: string;

    @Field({ nullable: true })
    pupilComment: string;

    @Field()
    hasPhoto: boolean;

    @Field({ nullable: true })
    sharingAllowed: boolean;

    @Field({ nullable: true })
    sharingAllowedGlobal: boolean;
}
@InputType()
export class DemoActivityFeedbackInput {
    @Field()
    staticActivityId: string;

    @Field({ nullable: true })
    parentComment: string;

    @Field({ nullable: true })
    pupilComment: string;

    @Field({ nullable: true })
    rating: number;

    @Field({ nullable: true })
    sharingAllowed: boolean;
}

@InputType()
export class PupilOwnActivityFeedbackInput {
    @Field({ nullable: true })
    id: string;

    @Field()
    pupilId: string;

    @Field()
    hasPhoto: boolean;

    @Field({ nullable: true })
    description: string;

    @Field({ nullable: true })
    sharingAllowed: boolean;

    @Field({ nullable: true })
    sharingAllowedGlobal: boolean;
}

@InputType()
export class LikePupilActivityFeedbackInput {
    @Field()
    feedId: string;

    @Field()
    teacherId: string;
}

export enum SubjectTypeForAllFeeds {
    READING = 'READING'
}

registerEnumType(SubjectTypeForAllFeeds, {
    name: 'SubjectTypeForAllFeeds'
});

export enum ActivityTypeForAllFeeds {
    ALL = 'ALL',
    ALL_TOPIC = 'ALL_TOPIC',
    ALL_READING = 'ALL_READING',
    CURRENT_TOPIC = 'CURRENT_TOPIC',
    LATEST_TOPIC = 'LATEST_TOPIC',
    CURRENT_READING_WEEK = 'CURRENT_READING_WEEK',
    PREVIOUS_READING_WEEK = 'PREVIOUS_READING_WEEK'
}

registerEnumType(ActivityTypeForAllFeeds, {
    name: 'ActivityTypeForAllFeeds'
});

registerEnumType(MediaTypeForAllFeeds, {
    name: 'MediaTypeForAllFeeds'
});

export type MsStrategyOptions = {
    clientId: string;
    clientSecret: string;
    clientSecretValue: string;
    expiryDate: string;
};

export type GoogleStrategyOptions = {
    clientId: string;
    clientSecret: string;
};

export type EntityFields<T> = (keyof T)[];

export enum DefaultParameters {
    LOGIN_PAGE_MSG_TITLE = '',
    LOGIN_PAGE_MSG = '',
    TYPEFORM_ACCESS_TOKEN = '',
    RELEASED_TIME = '4',
    WEEKDAY_TOPIC_RELEASE_EMAILS = '15:00',
    WEEKEND_TOPIC_RELEASE_EMAILS = '10:00',
    ADMIN_EMAIL_FOR_PURCHASE_LICENCE = 'hello@learningwithparents.com',
    PARENT_SUPPORT_EMAIL = 'hello@learningwithparents.com',
    TEACHER_SUPPORT_EMAIL = 'schools@learningwithparents.com',
    GENERAL_SUPPORT_PHONE_NUMBER = '01174769934',
    TEACHER_SUPPORT_PHONE_NUMBER = '01174769934',
    WONDE_REIMPORT_FREQUENCY = 'WEEKLY',
    SET_AUDIO_LIMIT = '300',
    CSV_CHUNK_LIMIT = 100,
    ADMIN_SOCIAL_LOGIN_PERMISSIONS = '{"google":"false", "microsoft":"false", "email":"true"}',
    PARENT_SOCIAL_LOGIN_PERMISSIONS = '{"google":"false", "microsoft":"false"}',
    MIN_PASSWORD_LENGTH = '{"PARENT":"12","TEACHER":"12","ADMIN":"12"}',
    WEEKDAY_PARENT_NOTIFICATION_TIME = '{"startTime":"15:00","endTime":"21:00"}',
    WEEKEND_PARENT_NOTIFICATION_TIME = '{"startTime":"09:00","endTime":"21:00"}',
    TEACHER_NOTIFICATION_TIME = '{"startTime":"07:00","endTime":"22:00"}',
    SITE_QUOTA = '{"EMAIL":"1000","SMS":"1000"}',
    CLASS_LICENCE_PRICE = '{"READING":"45","FULL_PROGRAM":"90","READY_TEDDY":"30"}',
    MIN_BAD_LOGIN_ALLOWED = '{"PARENT":"10","TEACHER":"10","ADMIN":"10"}',
    USER_LOCKED_ACCOUNT_TIMEOUT = '{"PARENT":"3600","TEACHER":"3600","ADMIN":"3600"}',
    COMMENT_PHOTO_PERMISSIONS = `{"mandatory":"I give permission for Learning with Parents and my child's school or educational organisation to use my comments and photos in marketing materials and on other social media.","optional":"In all cases we will never disclose your name or contact details when we use the comments/photos.","mandatory_info":null,"optional_info":"Your school or educational organisation, Learning with Parents and partners may use your comments and photos for the purposes described. Learning with Parents and partners will only ever use your data in line with Learning with Parents' charitable goals. We will never publicly disclose your name or contact details when we use the comments/photos.", "mandatory_privacy_text": "privacy and data retention policies.", "opted_in_summary": "You have agreed to share comments and photos with your child’s teachers including for use by the school or Learning with Parents in marketing materials or on social media. ", "opted_out_summary": "You have agreed to share comments and photos with your child’s teachers but not for use by the school or Learning with Parents in marketing materials or on social media.", "teacher_permission": ""}`,
    MAGIC_LINK_TIMEOUT = '{"RESETPASSWORD":1,"INVITATION":24, "REJECT_INVITATION": 24, "TOPICACCESS": 1008, "TROPHY": 1008, "READING": 1008, "DEMOTOPIC": 2160, "SCHOOL_IMPACT_REPORT": 1008}',
    SEND_TOPIC_EMAILS_TO_INVITED_USER = 'false',
    DEFAULT_EMAIL_TEMPLATE_LAYOUT = '',
    EMAIL_TEMPLATE_FOR_IMPACT_REPORT = `Hi {{{RECIPIENT_NAME}}},\n\nI am delighted to share your {{{TERM_NAME}}} Impact Report with you. We hope that both your families and staff are finding the Learning with Parents platform useful and have been enjoying using it.\n\nThe impact report provides an overview of how your families have engaged with the platform. It includes insights into overall engagement, the number of families actively using the platform, and the progress made across different areas.\n\nPlease use the link below to access your report. If you have any questions at all then please do not hesitate to get in touch:\n- {{{TERM_NAME}}} Impact Report for {{{SCHOOL_NAME}}}: {{{IMPACT_REPORT_MAGIC_LINK}}}\n\nI look forward to talking to you on {insert date} for our engagement call.\n- or -\nPlease use this link: https://lwp.uk/bookwithme/{{{SPM_NAME_FOR_URL}}} to schedule your engagement call with me. This will be a great opportunity to review the impact report and explore strategies to further enhance engagement.\n\nBest wishes,\n{{{FIRST_NAME}}}`
}

registerEnumType(DefaultParameters, {
    name: 'DefaultParameters'
});

registerEnumType(PageAnnouncementUserOption, {
    name: 'PageAnnouncementUserOption'
});

registerEnumType(PageAnnouncementStatus, {
    name: 'PageAnnouncementStatus'
});

export enum LwpButtonType {
    PRIMARY = 'PRIMARY',
    SECONDARY = 'SECONDARY'
}

registerEnumType(LwpButtonType, {
    name: 'LwpButtonType'
});

@ObjectType()
export class SchoolClassStatistics {
    @Field()
    @AuthorizeField(TeacherField)
    active: number;

    @Field()
    @AuthorizeField(TeacherField)
    registered: number;

    @Field()
    @AuthorizeField(TeacherField)
    missing: number;
}

@ObjectType()
export class ClassTopicStatistics {
    @Field(() => [String])
    @AuthorizeField(TeacherField)
    completed: string[] = [];

    @Field(() => [String])
    @AuthorizeField(TeacherField)
    inProgress: string[] = [];

    @Field(() => [String])
    @AuthorizeField(TeacherField)
    notStarted: string[] = [];
}

@InputType()
export class InviteParentsWithPupil {
    @Field()
    firstName: string;

    @Field()
    lastName: string;

    @Field({ nullable: true })
    upn: string;

    @Field(() => Gender)
    gender: Gender;

    @Field()
    dateOfBirth: Date;

    @Field()
    yearGroup: string;

    @Field({ nullable: true })
    isPupilPremium: boolean;

    @Field()
    classId: string;

    @Field(() => [ParentInput])
    parentDetails: ParentInput[];
}
@InputType()
export class FAQInput {
    @Field()
    question: string;

    @Field()
    answer: string;

    @Field()
    forParent: boolean;

    @Field()
    editAsHtml: boolean;

    @Field()
    forTeacher: boolean;

    @Field()
    forSchoolLeader: boolean;

    @Field()
    forBeforeLogin: boolean;
}

@InputType()
export class MagicLinkInput {
    @Field({ nullable: true })
    userId: string;

    @Field({ nullable: true })
    pupilTopicId: string;

    @Field({ nullable: true })
    topicId: string;

    @Field({ nullable: true })
    pupilId: string;

    @Field({ nullable: true })
    trophyId: string;

    @Field({ nullable: true })
    schoolId: string;

    @Field({ nullable: true })
    termId: string;

    @Field(() => MagicLinkType)
    type: MagicLinkType;

    @Field(() => SchoolImpactReportType)
    reportType: SchoolImpactReportType;

    // Only honoured for DEMOTOPIC links. Everything else takes its expiry from the MAGIC_LINK_TIMEOUT parameter.
    @Field({ nullable: true })
    expiryTime?: Date;
}

@InputType()
export class UpdateFAQInput extends FAQInput {
    @Field()
    id: string;
}

@InputType()
export class ParameterInput {
    @Field()
    key: string;

    @Field()
    value: string;
}

@InputType()
export class ResourceInput {
    @Field()
    title: string;

    @Field()
    description: string;

    @Field()
    download: boolean;

    @Field()
    leaderOnly: boolean;
}

@InputType()
export class UpdateResourceInput extends ResourceInput {
    @Field()
    id: string;
}

@InputType()
export class ContactInput {
    @Field()
    question: string;
}

@InputType()
export class UpdateContactInput extends ContactInput {
    @Field()
    id: string;
}

@InputType()
export class AdminQueryInput {
    @Field()
    name: string;

    @Field()
    sqlQuery: string;

    @Field()
    order: number;
}

@InputType()
export class UpdateAdminQueryInput {
    @Field()
    id: string;

    @Field({ nullable: true })
    name: string;

    @Field({ nullable: true })
    sqlQuery: string;

    @Field({ nullable: true })
    order: number;
}

@InputType()
export class UpdateDataQueryInput {
    @Field()
    id: string;

    @Field({ nullable: true })
    description?: string;

    @Field()
    order?: number;

    @Field(() => LwpStaticQueryStatus)
    status?: LwpStaticQueryStatus;
}

@InputType()
export class NewsInput {
    @Field()
    title: string;

    @Field()
    description: string;

    @Field()
    forTeacher: boolean;

    @Field()
    forSchoolLeader: boolean;

    @Field()
    editAsHtml: boolean;
}
@InputType()
export class AddSchoolDateInput {
    @Field()
    termName: string;

    @Field()
    startDate: Date;

    @Field()
    endDate: Date;

    @Field()
    periodIndex: number;
}
@InputType()
export class AddSchoolHolidayInput {
    @Field()
    holidayName: string;

    @Field()
    startDate: Date;

    @Field()
    endDate: Date;

    @Field()
    periodIndex: string;

    @Field({ nullable: true })
    schoolId: string;
}
@InputType()
export class UpdateSchoolHolidayInput {
    @Field()
    id: string;

    @Field({ nullable: true })
    holidayName: string;

    @Field({ nullable: true })
    startDate: Date;

    @Field({ nullable: true })
    endDate: Date;
}
@InputType()
export class UpdateSchoolDateInput {
    @Field()
    id: string;

    @Field({ nullable: true })
    termName: string;

    @Field({ nullable: true })
    startDate: Date;

    @Field({ nullable: true })
    endDate: Date;

    @Field()
    periodIndex: number;
}

@InputType()
export class UpdateNewsInput extends NewsInput {
    @Field()
    id: string;
}

@InputType()
export class TopicDomainInput {
    @Field()
    title: string;

    @Field()
    subjectId: string;

    @Field(() => [String])
    yearGroupIds: string[];
}

@InputType()
export class AddReadingLogAsGroupInput {
    @Field()
    bookName: string;

    @Field()
    bookReadAt: Date;

    @Field({ nullable: true })
    classId: string;

    @Field()
    schoolId: string;

    @Field()
    includeInReadingTarget: boolean;

    @Field({ nullable: true })
    isBookFinished: boolean;

    @Field(() => [String])
    pupilIds: string[];

    @Field({ nullable: true })
    comment: string;

    @Field({ nullable: true })
    privateNote: string;

    @Field({ nullable: true })
    pageNumber: string;

    @Field({ nullable: true })
    userName: string;

    @Field(() => UserType, { nullable: true })
    userType: UserType;

    @Field({ nullable: true })
    audio: string;
}
@InputType()
export class UpdateReadingLogAsGroupInput {
    @Field({ nullable: true })
    bookName: string;

    @Field()
    id: string;

    @Field()
    includeInReadingTarget: boolean;

    @Field({ nullable: true })
    isBookFinished: boolean;

    @Field(() => ReadingMode, { nullable: true })
    readingMode: ReadingMode;

    // Real-world reading forces this to SOMETHING_ELSE. Without it here the change is one-way.
    @Field({ nullable: true })
    readingType: ReadingType;

    @Field(() => [String])
    pupilIds: string[];

    @Field({ nullable: true })
    comment: string;

    @Field({ nullable: true })
    privateNote: string;

    @Field({ nullable: true })
    pageNumber: string;

    @Field()
    hasAudio: boolean;

    @Field({ nullable: true })
    audio: string;
}

@InputType()
export class AddReadingLogInput {
    @Field({ nullable: true, defaultValue: ReadingType.SOMETHING_ELSE })
    readingType: ReadingType;

    @Field(() => ReadingMode, { nullable: true })
    readingMode: ReadingMode;

    @Field({ nullable: true })
    comment: string;

    @Field({ nullable: true })
    privateNote: string;

    @Field({ nullable: true })
    pageNumber: string;

    @Field({ nullable: true })
    userName: string;

    @Field(() => UserType, { nullable: true })
    userType: UserType;

    @Field()
    bookName: string;

    @Field()
    pupilTopicId: string;

    @Field({ nullable: true })
    isBookFinished: boolean;

    @Field()
    includeInReadingTarget: boolean;

    @Field()
    bookReadAt: Date;

    @Field()
    pupilId: string;

    @Field({ nullable: true })
    sharingAllowed: boolean;

    @Field({ nullable: true })
    sharingAllowedGlobal: boolean;

    @Field({ nullable: true })
    photo: string;

    @Field({ nullable: true })
    audio: string;
}
@InputType()
export class UpdateReadingLogInput {
    @Field({ nullable: true })
    readingType: ReadingType;

    @Field(() => ReadingMode, { nullable: true })
    readingMode: ReadingMode;

    @Field({ nullable: true })
    comment: string;

    @Field({ nullable: true })
    privateNote: string;

    @Field({ nullable: true })
    pageNumber: string;

    @Field()
    hasPhoto: boolean;

    @Field()
    hasAudio: boolean;

    @Field()
    includeInReadingTarget: boolean;

    @Field({ nullable: true })
    bookName: string;

    @Field({ nullable: true })
    isBookFinished: boolean;

    @Field()
    id: string;

    @Field({ nullable: true })
    sharingAllowed: boolean;

    @Field({ nullable: true })
    sharingAllowedGlobal: boolean;

    @Field({ nullable: true })
    photo: string;

    @Field({ nullable: true })
    audio: string;
}

@InputType()
export class UpdateTopicDomainInput extends TopicDomainInput {
    @Field()
    id: string;
}

@InputType()
export class YearGroupInput {
    @Field()
    id: string;

    @Field()
    year: string;

    @Field()
    shortName: string;

    @Field()
    hiddenFromLists: boolean;

    @Field(() => [String])
    mathscotThemes: string[];
}

@InputType()
export class UpdateYearGroupInput {
    @Field()
    id: string;

    @Field()
    hiddenFromLists: boolean;

    @Field({ nullable: true })
    year: string;

    @Field({ nullable: true })
    shortName: string;

    @Field(() => [String], { nullable: true })
    mathscotThemes: string[];
}

export enum PupilStatus {
    REGISTERED = 'REGISTERED',
    MISSING = 'MISSING',
    ACTIVE = 'ACTIVE'
    // IMPORTED = 'IMPORTED'
}

registerEnumType(PupilStatus, {
    name: 'PupilStatus'
});

export enum PupilType {
    BOTH = 'BOTH',
    TOPIC = 'TOPIC',
    READING = 'READING'
}

registerEnumType(PupilType, {
    name: 'PupilType'
});

export enum DeviceType {
    DESKTOP = 'DESKTOP',
    MOBILE = 'MOBILE'
}

registerEnumType(DeviceType, {
    name: 'DeviceType'
});

@InputType()
export class TopicFilter {
    @Field(() => [String], { nullable: true })
    year?: string[];

    @Field(() => [String], { nullable: true })
    subjects?: string[];

    @Field(() => [String], { nullable: true })
    domain?: string[];

    @Field({ nullable: true })
    isHidden?: boolean;
}

@InputType()
export class AdminInput {
    @Field()
    firstname: string;

    @Field()
    lastname: string;

    @Field()
    email: string;
}

@InputType()
export class UpdateAdminInput {
    @Field()
    id: string;

    @Field()
    firstname: string;

    @Field()
    lastname: string;

    @Field()
    email: string;

    @Field({ nullable: true })
    isDeactivated: boolean;

    @Field(() => AdminRestrictionsInput, { nullable: true })
    adminRestrictionsInput: AdminRestrictionsInput;
}

@InputType()
export class PeriodInput {
    @Field()
    date: Date;

    @Field()
    startDate: Date;

    @Field()
    endDate: Date;

    @Field()
    isCurrentPeriod: boolean;

    @Field()
    isPreviousPeriod: boolean;

    @Field()
    shortName: string;

    @Field()
    longName: string;

    @Field()
    characters: string;

    @Field()
    colours: string;
}

@InputType()
export class EmailTemplatePreviewInput {
    @Field({ nullable: true })
    heading: string;

    @Field({ nullable: true })
    bodyText: string;

    @Field({ nullable: true })
    wholeEmailContent: string;

    @Field({ nullable: true })
    smsContent: string;

    @Field({ nullable: true })
    linkText: string;

    @Field({ nullable: true })
    link: string;

    @Field({ nullable: true })
    previewLine: string;

    @Field(() => UseEmailOption, { nullable: true })
    emailOption: UseEmailOption;

    @Field({ nullable: true })
    codePreview: string;
}

@InputType()
export class UpdatePeriodInput {
    @Field()
    index: number;

    @Field({ nullable: true })
    date?: Date | null;

    @Field({ nullable: true })
    startDate?: Date | null;

    @Field({ nullable: true })
    endDate?: Date | null;

    @Field({ nullable: true })
    isCurrentPeriod?: boolean | null;

    @Field({ nullable: true })
    isPreviousPeriod?: boolean | null;

    @Field({ nullable: true })
    shortName?: string | null;

    @Field({ nullable: true })
    longName?: string | null;

    @Field({ nullable: true })
    characters?: string | null;

    @Field({ nullable: true })
    colours?: string | null;
}

export enum EmailTemplateTypes {
    deprecatedTemplate = 'deprecatedTemplate',
    adminInvitationEmail = 'adminInvitationEmail',
    parentInvitationEmail = 'parentInvitationEmail',
    userRequestedSignUpLink = 'userRequestedSignUpLink',
    schoolLeaderInvitationEmail = 'schoolLeaderInvitationEmail',
    sendMailForTopicReminderAfter7Days = 'sendMailForTopicReminderAfter7Days',
    sendPupilTopics = 'sendPupilTopics',
    updatedMagicLink = 'updatedMagicLink',
    invoiceOfSchoolClassLicenceToAdmin = 'invoiceOfSchoolClassLicenceToAdmin',
    invoiceOfSchoolClassLicenceToSchool = 'invoiceOfSchoolClassLicenceToSchool',
    sendQuestionToLwpStaff = 'sendQuestionToLwpStaff',
    sendQuestionToUser = 'sendQuestionToUser',
    sendResetPasswordEmail = 'sendResetPasswordEmail',
    sendTeacherAssignedToClass = 'sendTeacherAssignedToClass',
    sendTeacherTopicsToBeReleasedTomorrow = 'sendTeacherTopicsToBeReleasedTomorrow',
    sendTeacherReadingTopicEnd = 'sendTeacherReadingTopicEnd',
    teacherInvitationEmail = 'teacherInvitationEmail',
    sendTrophyMailToParent = 'sendTrophyMailToParent',
    sendTrophyMailToTeacher = 'sendTrophyMailToTeacher',
    sendPupilReadingTopicReleased = 'sendPupilReadingTopicReleased',
    readingTopicReminderAfter2Days = 'readingTopicReminderAfter2Days',
    readingTopicReminderAfter5Days = 'readingTopicReminderAfter5Days',
    sendParentNotificationOfTeacherReadingComment = 'sendParentNotificationOfTeacherReadingComment',
    sendParentNotificationOfTeacherFeedbackReply = 'sendParentNotificationOfTeacherFeedbackReply',
    sendTeacherReadingTopicHolidayOverlap = 'sendTeacherReadingTopicHolidayOverlap',
    sendLwpTeamMoneySkillsActivationEmail = 'sendLwpTeamMoneySkillsActivationEmail',
    schoolLeaderWelcomeEmail = 'schoolLeaderWelcomeEmail',
    sendTeacherTopicToBeReleasedNextWeek = 'sendTeacherTopicToBeReleasedNextWeek',
    sendTeacherMoneySkillsFirstTopicScheduled = 'sendTeacherMoneySkillsFirstTopicScheduled'
}

export enum EmailTemplateTypeForReminderEmail {
    sendTeacherReadingTopicEnd = EmailTemplateTypes.sendTeacherReadingTopicEnd,
    readingTopicReminderAfter5Days = EmailTemplateTypes.readingTopicReminderAfter5Days,
    readingTopicReminderAfter2Days = EmailTemplateTypes.readingTopicReminderAfter2Days,
    sendMailForTopicReminderAfter7Days = EmailTemplateTypes.sendMailForTopicReminderAfter7Days
}

registerEnumType(EmailTemplateTypeForReminderEmail, { name: 'EmailTemplateTypeForReminderEmail' });
registerEnumType(EmailTemplateTypes, { name: 'EmailTemplateTypes' });

export enum PupilMathscotsCharacter {
    MONKEY = 'MONKEY',
    PANDA = 'PANDA',
    KOALA = 'KOALA',
    PENGUIN = 'PENGUIN',
    DOG = 'DOG',
    MEERKAT = 'MEERKAT',
    OWL = 'OWL',
    CAT = 'CAT',
    PARROT = 'PARROT',
    RABBIT = 'RABBIT'
}

registerEnumType(PupilMathscotsCharacter, {
    name: 'PupilMathscotsCharacter'
});

export enum UseEmailOption {
    LAYOUT = 'LAYOUT',
    HTML = 'HTML'
}

registerEnumType(UseEmailOption, {
    name: 'UseEmailOption'
});

export enum EmailTemplateStatus {
    CURRENT = 'CURRENT',
    DRAFT = 'DRAFT',
    HISTORIC = 'HISTORIC'
}

registerEnumType(EmailTemplateStatus, {
    name: 'EmailTemplateStatus'
});

registerEnumType(ContentStatus, {
    name: 'ContentStatus'
});

export enum UserAssociatedLoginType {
    MICROSOFT = 'MICROSOFT',
    GOOGLE = 'GOOGLE'
}

registerEnumType(UserAssociatedLoginType, {
    name: 'UserAssociatedLoginType'
});

export enum NotificationType {
    EMAIL = 'EMAIL',
    SMS = 'SMS'
}

registerEnumType(NotificationType, {
    name: 'NotificationType'
});

export enum ScheduleSmsOption {
    NOW = 'NOW',
    LATER = 'LATER'
}

registerEnumType(ScheduleSmsOption, {
    name: 'ScheduleSmsOption'
});

export enum PupilMathscotsColour {
    NATURAL = 'NATURAL',
    PURPLE = 'PURPLE',
    GREEN = 'GREEN'
}

registerEnumType(PupilMathscotsColour, {
    name: 'PupilMathscotsColour'
});

@InputType()
export class SendNotificationInput {
    @Field(() => EmailTemplateTypes, { nullable: false })
    type: EmailTemplateTypes;

    @Field()
    recipient: string;

    @Field({ nullable: true })
    pupilId?: string;

    @Field({ nullable: true })
    classTopicId?: string;

    @Field({ nullable: true })
    schoolClassId?: string;

    @Field({ nullable: true })
    schoolIdOfTemplate?: number;

    @Field({ nullable: true })
    pupilTopicId?: string;

    @Field({ nullable: true })
    question?: string;

    @Field({ nullable: true })
    schoolId?: string;

    @Field({ nullable: true })
    resetPassToken?: string;

    @Field({ nullable: true })
    invitedByEmail?: string;
}
@ObjectType()
export class ReadingTopicExistOuput {
    @Field()
    @AuthorizeField(TeacherField)
    readingTopicExist: boolean;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    readingTopicReleased: boolean;
}
@ObjectType()
export class PupilReadingNoteOutput {
    @Field()
    @AuthorizeField(UnrestrictedField)
    headingText: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    messageText: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    classReadingTarget: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    pupilEarnedStars: number;
}

@ObjectType()
export class AdminClassView {
    @Field()
    classId: string;

    @Field()
    schoolId: string;

    @Field()
    schoolName: string;

    @Field()
    className: string;

    @Field()
    classYearGroup: string;

    @Field({ nullable: true })
    teacherId: string;

    @Field({ nullable: true })
    teacherName: string;

    @Field({ nullable: true })
    teacherEmail: string;

    @Field({ nullable: true })
    teacherLoginDate: string;

    @Field()
    classSize: number;

    // Number of pupils in each stage on the green bars
    // Up to  date: Number of pupils who have completed all of the topics that have been set more than 2 weeks ago.
    @Field()
    uptoDate: number;

    // Engaging: Number of pupils who have completed 50% of activities set for them - i.e. they have pupilactivityfeedback for at least as many activities as topics that have been set
    @Field()
    engaging: number;

    // Registered: number of pupils in pupil-class association
    @Field()
    registered: number;

    // Missing: Class size minus number of pupils in pupil-class association
    @Field()
    missing: number;

    // Date of last topic released;
    @Field({ nullable: true })
    lastReleasedTopicDate: string;

    //  Date of next topic to be released;
    @Field({ nullable: true })
    nextReleasedTopicDate: string;

    // Name of last topic released;
    @Field({ nullable: true })
    lastReleasedTopicName: string;

    //  Name of next topic to be released;
    @Field({ nullable: true })
    nextReleasedTopicName: string;

    // Number of comments/photos
    @Field()
    numberOfFeeds: number;

    // Percentage pupils registered
    @Field()
    percentageOfRegPupils: number;

    // Number of pupils registered
    @Field()
    numberOfRegPupils: number;

    // Number of Pupil Premium pupils
    @Field()
    numberOfPremiumPupils: number;
}
@ObjectType()
export class AdminClassViewOutput extends WithPagination {
    @Field(() => [AdminClassView])
    results: AdminClassView[];
}
@ObjectType()
export class AdminUserHistoryOutput extends WithPagination {
    @Field(() => [LogParentPupilActionOutput])
    results: LogParentPupilActionOutput[];
}

@ObjectType()
export class LogParentPupilActionOutput {
    @Field()
    id: string;

    @Field()
    action: string;

    @Field()
    pupilId: string;

    @Field({ nullable: true })
    param1: string;

    @Field({ nullable: true })
    param2: string;

    @Field({ nullable: true })
    param3: number;

    @Field()
    time: Date;
}

@ObjectType()
export class LwpNotificationPreview {
    @Field()
    html: string;

    @Field()
    subject: string;
}

export enum LogResults {
    SUCCESS = 'SUCCESS',
    USERNOTFOUND = 'USERNOTFOUND',
    WRONGPASSWORD = 'WRONGPASSWORD',
    INVITED = 'INVITED',
    ERROR = 'ERROR',
    LOGOUT = 'LOGOUT',
    FORGOTPASSWORD = 'FORGOTPASSWORD'
}
registerEnumType(LogResults, { name: 'LogResults' });

@InputType()
export class LogLoginInput {
    @Field({ nullable: true })
    browser: string;

    @Field({ nullable: true })
    userAgent: string;

    @Field({ nullable: true })
    ipAddress: string;

    @Field({ nullable: true })
    userEmail: string;

    @Field({ nullable: true })
    userPhoneNumber: string;

    @Field({ nullable: true })
    result: LogResults;

    @Field({ nullable: true })
    userType: UserType;

    @Field({ nullable: true })
    loginType: AuthMethod;
}
@InputType()
export class LogSchoolClassLicenseInput {
    @Field()
    schoolId: string;

    @Field(() => SchoolClassLicenceOperationType)
    operationType: SchoolClassLicenceOperationType;

    @Field()
    fullProgrammeClassCount: number;

    @Field()
    totalClassCount: number;

    @Field({ nullable: true })
    requestedFullProgrammeClassCount: number;

    @Field({ nullable: true })
    requestedReadingOnlyClassCount: number;

    @Field({ nullable: true })
    requestedUpgradeClassCount: number;

    @Field({ nullable: true })
    fullProgrammeClassPrice: number;

    @Field({ nullable: true })
    readingOnlyClassPrice: number;

    @Field()
    totalPrice: number;

    @Field({ nullable: true })
    readyTeddyClassCount: number;

    @Field({ nullable: true })
    requestedReadyTeddyClassCount: number;

    @Field({ nullable: true })
    readyTeddyClassPrice: number;
}

@InputType()
export class VerifyUserEmailInput {
    @Field({ nullable: false })
    email: string;

    @Field({ nullable: false })
    emailVerificationCode: string;
}
@InputType()
export class VerifyUserPhoneInput {
    @Field({ nullable: false })
    phoneNumber: string;

    @Field({ nullable: false })
    phoneVerificationCode: string;
}
// @InputType()
// export class VerifyEmailAndPhoneByIdInput {
//     @Field({ nullable: false })
//     id: string;

//     @Field({ nullable: false })
//     verificationCode: string;
// }

@InputType()
export class LogoutInput {
    @Field({ nullable: false })
    id: string;
}

export enum LogParentTopicAction {
    OPENPAGE = 'OPENPAGE',
    STARTVIDEO = 'STARTVIDEO',
    FINISHVIDEO = 'FINISHVIDEO'
}

registerEnumType(LogParentTopicAction, { name: 'LogParentTopicAction' });

export enum LogParentActivityAction {
    OPENPAGE = 'OPENPAGE',
    ADDCOMMENT = 'ADDCOMMENT',
    UPDATECOMMENT = 'UPDATECOMMENT',
    SAVEMATHSCOT = 'SAVEMATHSCOT'
}

registerEnumType(LogParentActivityAction, { name: 'LogParentActivityAction' });

@InputType()
export class LogWatchedVideoStateInput {
    @Field()
    pupilId: string;

    @Field()
    parentId: string;

    @Field()
    videoDone: boolean;

    @Field({ nullable: true })
    param1: string;

    @Field({ nullable: true })
    param2: string;

    @Field({ nullable: true })
    param3: number;
}

// This is NOT an input type and NOT for external use
export class LogParentPupilActionInput {
    actionId: number;

    userId: string;

    parentId: string;

    pupilId: string;

    param1: string;

    param2: string;

    param3: number;

    time?: Date;
}

export enum LogoSectionEnum {
    SUPPORTEDBY = 'SUPPORTEDBY',
    WORKINGWITH = 'WORKINGWITH',
    WORKINGWITHMATHS = 'WORKINGWITHMATHS',
    WORKINGWITHENGLISH = 'WORKINGWITHENGLISH',
    WORKINGTOGETHER = 'WORKINGTOGETHER'
}

registerEnumType(LogoSectionEnum, {
    name: 'LogoSectionEnum'
});

export enum MagicLinkType {
    RESETPASSWORD = 'RESETPASSWORD',
    INVITATION = 'INVITATION',
    REJECT_INVITATION = 'REJECT_INVITATION',
    TOPICACCESS = 'TOPICACCESS',
    SCHOOL_IMPACT_REPORT = 'SCHOOL_IMPACT_REPORT',
    DEMOTOPIC = 'DEMOTOPIC',
    TROPHY = 'TROPHY',
    READING = 'READING'
}

registerEnumType(MagicLinkType, {
    name: 'MagicLinkType'
});

registerEnumType(FeatureTooltipTargets, {
    name: 'FeatureTooltipTargets'
});

@ObjectType()
export class MagicLinkContext {
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    pupilTopicId: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    topicId: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    trophyId: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    termId: string;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    periodIndex: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    schoolId: string;

    @Field(() => SchoolImpactReportType, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    reportType: SchoolImpactReportType;
}

@ObjectType()
export class PupilParentContext {
    @Field({ defaultValue: false })
    @AuthorizeField(UnrestrictedField)
    isReadingSectionShown: boolean;

    @Field({ defaultValue: false })
    @AuthorizeField(UnrestrictedField)
    isTopicsSectionShown: boolean;
}

@ObjectType()
export class LwpNotificationContext {
    @Field({ nullable: true })
    isBulkProcess: boolean;

    @Field({ nullable: true })
    pupilId: string;

    @Field(() => String, { nullable: true })
    mailData: Mail;
}

@ObjectType()
export class TypeFormContext {
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    estimatedTime: number;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    numOfQuestions: number;
}

export enum SearchTypeEnum {
    PUPIL = 'PUPIL',
    CLASS = 'CLASS',
    GROUP = 'GROUP',
    SCHOOL = 'SCHOOL',
    WONDESCHOOL = 'WONDESCHOOL',
    WONDESCHOOLCLASS = 'WONDESCHOOLCLASS',
    WONDESTUDENT = 'WONDESTUDENT',
    WONDECONTACT = 'WONDECONTACT',
    PARENT = 'PARENT',
    TEACHER = 'TEACHER',
    SCHOOLLEADER = 'SCHOOLLEADER',
    ADMIN = 'ADMIN'
}

registerEnumType(SearchTypeEnum, {
    name: 'SearchTypeEnum'
});

@ObjectType()
export class Search {
    @Field()
    id: string;

    @Field({ nullable: true })
    wondeId: string;

    @Field(() => SearchTypeEnum, { nullable: true })
    type: SearchTypeEnum;

    // Columns for TYPE: ADMIN, PARENT, TEACHER, SCHOOLLEADER
    @Field({ nullable: true })
    name: string;

    @Field({ nullable: true })
    email: string;

    @Field({ nullable: true })
    phone: string;

    // Columns for TYPE: SCHOOL

    @Field({ nullable: true })
    commentsAndPhotos: number;

    // Columns for TYPE: CLASS
    @Field({ nullable: true })
    classSize: number;

    @Field({ nullable: true })
    code: string;

    @Field({ nullable: true })
    mainTeacherName: string;

    @Field({ nullable: true })
    mainClassName: string;

    @Field({ nullable: true })
    periodName: string;

    @Field(() => [StaticLwpSubject], { nullable: true })
    subjects: StaticLwpSubject[];

    @Field({ nullable: true })
    isReadingGroup: boolean;

    @Field({ nullable: true })
    yearGroup: string;

    // Columns for TYPE: PUPIL
    @Field({ nullable: true })
    isPremium: boolean;

    @Field({ nullable: true })
    pupilStatus: PupilStatus;

    // Columns for TYPE: WONDESCHOOL
    @Field({ nullable: true })
    urn: number;

    // Columns for TYPE: WONDESTUDENT
    @Field({ nullable: true })
    UPN: string;
}
export enum ErrorStatusCodeEnum {
    _403 = 403,
    _538 = 538,
    _537 = 537,
    _536 = 536,
    _535 = 535,
    _539 = 539,
    _540 = 540,
    INVALID_MAGIC_LINK = 540,
    ACCOUNT_NOT_ACTIVE = 541,
    FAILED_EMAIL_OR_SMS = 542,
    EXPIRED_MAGIC_LINK = 543,
    SOCIAL_ACCOUNT_NOT_FOUND = 544,
    SOCIAL_ACCOUNT_NOT_LINKED = 545,
    CANNOT_LINK_SOCIAL_ACCOUNT = 546,
    WRONG_SOCIAL_ACCOUNT = 547,
    INTERNAL_SERVER_ERROR = 500
}
registerEnumType(ErrorStatusCodeEnum, { name: 'ErrorStatusCodeEnum' });
@InputType()
export class StaticLwpTrophyInput {
    @Field()
    order: number;

    @Field()
    title: string;

    @Field()
    startDate: Date;

    @Field()
    endDate: Date;

    @Field()
    isActive: boolean;

    @Field()
    isPupilMail: boolean;

    @Field()
    isTeacherMail: boolean;

    @Field({ nullable: true })
    certificate: string;

    @Field(() => [String])
    subjects: string[];

    @Field({ nullable: true })
    logoId: string;

    @Field({ nullable: true })
    certificatePdfId: string;
}
@InputType()
export class UpdateStaticLwpTrophyInput {
    @Field({ nullable: true })
    order: number;

    @Field({ nullable: true })
    title: string;

    @Field({ nullable: true })
    startDate: Date;

    @Field({ nullable: true })
    endDate: Date;

    @Field({ nullable: true })
    isActive: boolean;

    @Field(() => [String])
    subjects: string[];

    @Field({ nullable: true })
    isPupilMail: boolean;

    @Field({ nullable: true })
    isTeacherMail: boolean;

    @Field({ nullable: true })
    certificate: string;

    @Field({ nullable: true })
    logoId: string;

    @Field({ nullable: true })
    certificatePdfId: string;

    @Field()
    id: string;
}

export enum SchoolClassStatus {
    ACTIVE = 'ACTIVE',
    IMPORTED = 'IMPORTED',
    INACTIVE = 'INACTIVE',
    HIDDEN = 'HIDDEN'
}

registerEnumType(SchoolClassStatus, { name: 'SchoolClassStatus' });

export enum notificationPreferenceEnum {
    EMAILREMINDER = 'EMAILREMINDER',
    SMSREMINDER = 'SMSREMINDER',
    BOTH = 'BOTH',
    NOREMINDER = 'NOREMINDER'
}

registerEnumType(notificationPreferenceEnum, { name: 'notificationPreferenceEnum' });

registerEnumType(InterstitialType, { name: 'InterstitialType' });

registerEnumType(InterstitialLastActionType, { name: 'InterstitialLastActionType' });

@InputType()
export class NotificationSettingsInput {
    @Field()
    userId: string;

    @Field()
    forEmail: boolean;

    @Field()
    forTextMessage: boolean;
}

export interface AchievementCertificateData {
    pupilId: string;
    trophyId: string;
    lwpSchoolClassId: string;
}

export interface CSVHeaders {
    id: string;
    title: string;
}

export interface GenerateCertificateData {
    [key: string]: AchievementCertificateData[];
}

export interface FieldData {
    xValue: number;
    yValue: number;
    fontSize: number;
    fieldName: string;
    fieldValue?: string;
}

export interface MathscotData {
    xValue: number;
    yValue: number;
    fieldValue?: string;
    scale: number;
}

export interface CertificatePdfDataForTrophy {
    fileName: string;
    fieldData?: FieldData[];
    mathscot?: MathscotData;
}

export interface WondePaginationData {
    pagination: {
        next: string;
        previous: string;
        more: boolean;
        per_page: number;
        current_page: number;
    };
}

// export interface WondeResponse<T> {
//     data: T[];
//     meta: WondePaginationData;
// }
export interface WondeResponse<T> {
    data: T;
    meta: WondePaginationData;
}
export interface WondeMultiResponse<T> {
    data: T[];
    meta: WondePaginationData;
}

export interface WondeSchoolResponse {
    id: string;
    name: string;
    urn: number;
    mis: string;
    address: {
        address_postcode: string;
    };
}

export enum WondeGender {
    MALE = 'MALE',
    FEMALE = 'FEMALE',
    OTHER = 'OTHER'
}
registerEnumType(WondeGender, {
    name: 'WondeGender'
});

export enum TrophyCertificateFieldName {
    CHILDNAME = 'childName',
    TOTATSTARS = 'totalStars',
    TEACHERNAME = 'teacherName',
    DATE = 'date'
}
registerEnumType(TrophyCertificateFieldName, {
    name: 'TrophyCertificateFieldName'
});

export enum WondeUserType {
    TEACHER = 'TEACHER',
    PARENT = 'PARENT'
}
registerEnumType(WondeUserType, {
    name: 'WondeUserType'
});

export enum WondeEntity {
    SCHOOL = 'SCHOOL',
    SCHOOLCLASS = 'SCHOOLCLASS'
}

registerEnumType(WondeEntity, {
    name: 'WondeEntity'
});

export enum SchoolTypeFilter {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    TEST = 'TEST'
}

registerEnumType(SchoolTypeFilter, {
    name: 'SchoolTypeFilter'
});

registerEnumType(ReadingBookOptions, {
    name: 'ReadingBookOptions'
});

export interface WondeGeneralUserResponse {
    forename: string;
    surname: string;
    initials: string;
    legal_surname: string;
    legal_forename: string;
    gender?: WondeGender;
    mis_id?: string;
    date_of_birth?: {
        date: string;
        timezone_type: number;
        timezone: string;
    } | null;
}
export interface WondePupilResponse {
    forename: string;
    surname: string;
    initials: string;
    legal_surname: string;
    legal_forename: string;
    gender?: WondeGender;
    mis_id?: string;
}

export interface WondeStudentEducationDetails {
    upn: string;
    current_nc_year: string;
}
export interface WondeStudentExtendedDetails {
    premium_pupil_indicator: boolean;
    premium_pupil_eligible: boolean;
    free_school_meals_6: boolean;
    premium_pupil_notes: string;
    ethnicity?: string;
    ethnicity_code?: string;
    english_as_additional_language?: boolean;
    english_as_additional_language_status?: string;
    sen_status?: string;
}

export interface WondePupilResponse extends WondeGeneralUserResponse {
    id: string;
    education_details: { data: WondeStudentEducationDetails };
    extended_details: { data: WondeStudentExtendedDetails };
}

export interface WondeTeacherResponse extends WondeGeneralUserResponse {
    id: string;
}

export interface WondeLwpSchoolClassResponse {
    id: string;
    type: string;
    name: string;
    subject: string;
    code: string;
    students_pre_admission: { data: WondePupilResponse[] };
    students: { data: WondePupilResponse[] };
    employees: { data: WondeTeacherResponse[] };
}

export interface WondeContactResponse extends WondeGeneralUserResponse {
    id: string;
    upi: string;
    title: string;
    contact_details?: { data: WondeContactDetailsResponse };
    relationship?: ImportedStudentContactRelationship;
}

export interface WondeStudentResponse extends WondePupilResponse {
    contacts?: { data: WondeContactResponse[] };
}

export interface ImportedStudentContactRelationship {
    bill_payer?: boolean;
    lives_with_pupil?: boolean;
    email_bills?: boolean;
    copy_bills?: boolean;
    court_order?: boolean;
    pupil_report?: boolean;
    parental_responsibility?: boolean;
    correspondence?: boolean;
    email_notification?: boolean;
    sms_notification?: boolean;
    mail_notification?: boolean;
    push_notification?: boolean;
    in_touch_communication?: boolean;
    priority?: number;
    relationship?: string;
}

export interface WondeContactDetailsPhoneResponse {
    phone?: string;
    primary?: string;
    mobile?: string;
    home?: string;
    work?: string;
}

export interface WondeContactDetailsEmailResponse {
    email?: string;
    primary?: string;
    home?: string;
    work?: string;
}

export interface WondeContactDetailsAddressResponse {
    home?: string;
    work?: string;
    postal?: string;
}

export interface WondeContactDetailsResponse {
    phones?: WondeContactDetailsPhoneResponse;
    emails?: WondeContactDetailsEmailResponse;
}

export interface WondeContactsResponse extends WondeGeneralUserResponse {
    id: string;
    contact_details: { data: WondeContactDetailsResponse };
    students: { data: WondePupilResponse[] };
}

@InputType()
export class WondeSchoolSyncInput {
    @Field()
    wondeSchoolId: string;

    @Field()
    lwpSchoolId: string;
}

@InputType()
export class WondePupilSyncInput {
    @Field()
    wondeUserId: string;

    @Field()
    lwpPupilId: string;
}

@InputType()
export class WondeUserSyncInput {
    @Field()
    wondeUserId: string;

    @Field()
    lwpUserId: string;
}
@InputType()
export class LinkClassInputType {
    @Field()
    lwpSchoolClassId: string;

    @Field({ nullable: true })
    importedSchoolClassId: string;
}
@InputType()
export class LinkClassInput {
    @Field(() => [LinkClassInputType])
    linkClassInputs: LinkClassInputType[];
}

@InputType()
export class AddPupilsInClassInput {
    @Field(() => [String])
    pupilIds: string[];

    @Field()
    classId: string;
}

@InputType()
export class LinkPupilInputType {
    @Field()
    lwpPupilId: string;

    @Field({ nullable: true })
    importedStudentId: string;
}
@InputType()
export class LinkPupilInput {
    @Field(() => [LinkPupilInputType])
    linkPupilInputs: LinkPupilInputType[];
}
@InputType()
export class NavigateToOtherChildPageInput {
    @Field()
    targetChildId: string;

    @Field()
    currentContextId: string;

    @Field(() => ChildPage)
    currentPage: ChildPage;
}

@ObjectType()
export class NavigateToOtherChildPageOutput {
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    id: string;

    @Field(() => ChildPage)
    @AuthorizeField(UnrestrictedField)
    page: ChildPage;
}

@InputType()
export class AdminAllFeedsFilterInput {
    @Field(() => [String], { nullable: true })
    schoolIds?: string[];

    @Field(() => [String], { nullable: true })
    topicIds?: string[];

    @Field(() => [String], { nullable: true })
    topicYearGroupIds?: string[];

    @Field(() => [String], { nullable: true })
    topicTagIds?: string[];

    @Field(() => [String], { nullable: true })
    activityTagIds?: string[];

    @Field(() => [String], { nullable: true })
    schoolTagIds?: string[];

    @Field(() => [ReadingBookOptions], { nullable: true })
    bookOptions?: ReadingBookOptions[];

    @Field(() => [SchoolTypeFilter], { nullable: true })
    schoolTypes?: SchoolTypeFilter[];

    @Field(() => [Number], { nullable: true })
    photoRatings?: number[];

    @Field(() => [Number], { nullable: true })
    starRating?: number[];

    @Field({ nullable: true })
    postedBefore?: Date;

    @Field({ nullable: true })
    postedAfter: Date;

    @Field({ nullable: true })
    defaultDate?: boolean;

    @Field(() => SharedStatus, { nullable: true })
    sharedStatus?: SharedStatus;

    @Field(() => [String], { nullable: true })
    subjects?: string[];

    @Field(() => [FeedbackType], { nullable: true })
    feedbackTypes?: FeedbackType[];

    @Field({ nullable: true })
    searchInput?: string;

    @Field({ nullable: true })
    bookName?: string;
}
@ObjectType()
export class AdminAllFeedsFilterOutput {
    @Field({ nullable: true })
    postedAfter?: Date;
}
@InputType()
export class PupilActivityFeedsFilterInput {
    @Field(() => [String], { nullable: true })
    classIds: string[];

    @Field(() => ActivityTypeForAllFeeds, { nullable: true })
    activity: ActivityTypeForAllFeeds;

    @Field(() => MediaTypeForAllFeeds, { nullable: true })
    media: MediaTypeForAllFeeds;

    @Field({ nullable: true })
    sharingPermitted: boolean;

    @Field({ nullable: true })
    postedBefore: Date;

    @Field({ nullable: true })
    postedAfter: Date;

    @Field({ nullable: true })
    bookName: string;

    @Field({ nullable: true })
    academicYear: number;

    @Field({ nullable: true })
    showOnlyUntickFeed: boolean;

    @Field(() => [String], { nullable: true })
    subjects: string[];

    @Field(() => [FeedbackType], { nullable: true })
    feedbackTypes?: FeedbackType[];
}

@InputType()
export class AddInterstitialInput {
    @Field(() => InterstitialType)
    type: InterstitialType;

    @Field()
    heading: string;

    @Field({ nullable: true })
    text: string;

    @Field({ nullable: true })
    subjectId: string;

    @Field({ nullable: true })
    name: string;

    @Field()
    typeformId: string;

    @Field()
    averageTime: number;

    @Field(() => [InterstitialUserOption])
    userOptions: InterstitialUserOption[];

    @Field()
    showQuestion: boolean;

    @Field(() => [String])
    schoolTagsIds: string[];
}
@InputType()
export class AddPageAnnouncementInput {
    @Field(() => [PageAnnouncementUserOption])
    userOptions: PageAnnouncementUserOption[];

    @Field(() => [String])
    schoolTagIds: string[];

    @Field(() => [String], { nullable: true, defaultValue: [] })
    targetPages?: string[];

    @Field()
    title: string;

    @Field()
    includeImage: boolean;

    @Field()
    priority: number;

    @Field()
    message: string;

    @Field({ nullable: true })
    imageUrl: string | null;
}
@InputType()
export class UpdatePageAnnouncementInput extends AddPageAnnouncementInput {
    @Field()
    id: string;

    @Field()
    hasImage: boolean;
}
@InputType()
export class SubmitInterstitialInput {
    @Field()
    id: string;

    @Field()
    userId: string;
}
@InputType()
export class UpdateInterstitialInput {
    @Field()
    id: string;

    @Field({ nullable: true })
    subjectId: string;

    @Field({ nullable: true })
    typeformId: string;

    @Field(() => InterstitialType, { nullable: true })
    type: InterstitialType;

    @Field()
    heading: string;

    @Field({ nullable: true })
    name: string;

    @Field({ nullable: true })
    averageTime: number;

    @Field({ nullable: true })
    text: string;

    @Field(() => [InterstitialUserOption], { nullable: true })
    userOptions: InterstitialUserOption[];

    @Field()
    showQuestion: boolean;

    @Field(() => [String])
    schoolTagsIds: string[];
}
@InputType()
export class LogLwpAccessInput {
    @Field({ nullable: true })
    mutationOrQueryName: string;

    @Field({ nullable: true })
    page: string;

    @Field({ nullable: true })
    info: string;

    @Field({ nullable: true })
    userId: string;
}

@InputType()
export class AddPupilMathscotInput {
    @Field()
    pupilId: string;

    @Field(() => [String], { nullable: true })
    itemIds: string[];

    @Field(() => PupilMathscotsCharacter)
    character: PupilMathscotsCharacter;

    @Field(() => PupilMathscotsColour)
    colour: PupilMathscotsColour;

    @Field({ nullable: true })
    periodIndex: number;
}
@InputType()
export class UpdatePupilMathscotInput {
    @Field()
    id: string;

    @Field(() => [String], { nullable: true })
    itemIds: string[];

    @Field(() => PupilMathscotsCharacter)
    character: PupilMathscotsCharacter;

    @Field(() => PupilMathscotsColour)
    colour: PupilMathscotsColour;
}

@InputType()
export class ConfirmParentDetailsInput {
    @Field()
    parentId: string;

    @Field()
    pupilParentId: string;

    @Field({ nullable: true })
    email: string;

    @Field({ nullable: true })
    phoneNumber: string;
}

@InputType()
export class TestEmailInput {
    @Field()
    subject: string;

    @Field()
    senderEmail: string;

    @Field()
    senderName: string;

    @Field()
    sentTo: string;

    @Field(() => EmailTemplateTypes)
    type: EmailTemplateTypes;

    @Field({ nullable: true })
    heading: string;

    @Field({ nullable: true })
    bodyText: string;

    @Field({ nullable: true })
    wholeEmailContent: string;

    @Field({ nullable: true })
    smsContent: string;

    @Field({ nullable: true })
    linkText: string;

    @Field({ nullable: true })
    link: string;

    @Field({ nullable: true })
    previewLine: string;

    @Field(() => UseEmailOption)
    emailOption: UseEmailOption;
}
@InputType()
export class AddEmailTemplateInput {
    @Field(() => EmailTemplateTypes)
    type: EmailTemplateTypes;

    @Field()
    sendEmail: boolean;

    @Field(() => UseEmailOption)
    emailOption: UseEmailOption;

    @Field()
    subject: string;

    @Field({ nullable: true })
    previewLine: string;

    @Field()
    senderName: string;

    @Field()
    senderEmail: string;

    @Field({ nullable: true })
    heading: string;

    @Field({ nullable: true })
    bodyText: string;

    @Field({ nullable: true })
    linkText: string;

    @Field({ nullable: true })
    link: string;

    @Field({ nullable: true })
    wholeEmailContent: string;

    @Field()
    multipleSection: boolean;

    @Field({ nullable: true })
    multipleSectionContent: string;

    @Field()
    sendSms: boolean;

    @Field({ nullable: true })
    smsContent: string;

    @Field()
    sendPhoneNotification: boolean;

    @Field({ nullable: true })
    notificationTitle: string;

    @Field({ nullable: true })
    notificationDescription: string;

    @Field({ nullable: true })
    notificationUrl: string;

    @Field(() => EmailTemplateStatus)
    status: EmailTemplateStatus;
}

@InputType()
export class UpdateEmailTemplateInput {
    @Field()
    id: string;

    @Field(() => EmailTemplateTypes)
    type: EmailTemplateTypes;

    @Field({ nullable: true })
    subject: string;

    @Field({ nullable: true })
    senderName: string;

    @Field({ nullable: true })
    senderEmail: string;

    @Field()
    sendEmail: boolean;

    @Field(() => UseEmailOption)
    emailOption: UseEmailOption;

    @Field({ nullable: true })
    previewLine: string;

    @Field({ nullable: true })
    heading: string;

    @Field({ nullable: true })
    bodyText: string;

    @Field({ nullable: true })
    linkText: string;

    @Field({ nullable: true })
    link: string;

    @Field({ nullable: true })
    wholeEmailContent: string;

    @Field()
    multipleSection: boolean;

    @Field({ nullable: true })
    multipleSectionContent: string;

    @Field()
    sendSms: boolean;

    @Field({ nullable: true })
    smsContent: string;

    @Field()
    sendPhoneNotification: boolean;

    @Field({ nullable: true })
    notificationTitle: string;

    @Field({ nullable: true })
    notificationDescription: string;

    @Field({ nullable: true })
    notificationUrl: string;

    @Field(() => EmailTemplateStatus)
    status: EmailTemplateStatus;
}

@InputType()
export class EmailContactData {
    @Field()
    name: string;

    @Field()
    email: string;
}
@InputType()
export class UpdateFeatureInput {
    @Field()
    id: string;

    @Field()
    includeSchoolsWithTags: boolean;

    @Field(() => FeatureStatus)
    status: FeatureStatus;

    @Field({ nullable: true })
    description: string;

    @Field(() => [String])
    schoolTagIds: string[];
}

@InputType()
export class MailData {
    @Field(() => EmailContactData)
    to: EmailContactData;

    @Field(() => EmailContactData)
    replyTo: EmailContactData;
}

@ObjectType()
export class PupilPreviousMathscotsOutput {
    @Field()
    @AuthorizeField(UnrestrictedField)
    period: string;

    @Field()
    @AuthorizeField(UnrestrictedField)
    thumbnailImage: string;

    @Field()
    @AuthorizeField(UnrestrictedField)
    bigImage: string;
}

@ObjectType()
export class EmailTemplateOutput {
    @Field()
    subject: string;

    @Field()
    htmlContent: string;

    @Field()
    senderEmail: string;

    @Field()
    sendEmail: boolean;

    @Field()
    senderName: string;

    @Field({ nullable: true })
    templateId: string;

    @Field(() => [String])
    emailParams: string[];
}
@ObjectType()
export class SMSDataOutput {
    @Field()
    content: string;

    @Field()
    sender: string;

    @Field()
    sendSms: boolean;

    @Field({ nullable: true })
    templateId: string;

    @Field(() => [String])
    smsParams: string[];
}

@ObjectType()
export class NotProductionIndicatorOutput {
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    buildType: LwpBuildType;

    @Field()
    @AuthorizeField(UnrestrictedField)
    serverUptime: string;
}

@ObjectType()
export class PupilActivitiesOfPupilTopicOutput {
    @Field()
    id: string;

    @Field()
    earnedStar: boolean;

    @Field({ nullable: true })
    rating: number;
}

@ObjectType()
export class SendTestEmailOutput {
    @Field()
    response: string;

    @Field()
    status: number;
}

export enum MailgunEventType {
    clicked = 'clicked',
    opened = 'opened',
    accepted = 'accepted',
    delivered = 'delivered',
    permanent_fail = 'permanent_fail'
}
registerEnumType(MailgunEventType, { name: 'MailgunEventType' });

export enum TwilioMessageStatus {
    queued = 'queued',
    sending = 'sending',
    sent = 'sent',
    failed = 'failed',
    delivered = 'delivered',
    undelivered = 'undelivered'
}
registerEnumType(TwilioMessageStatus, { name: 'TwilioMessageStatus' });

export enum LwpNotificationStatus {
    WAITING = 'WAITING',
    SENT = 'SENT',
    QUEUED = 'QUEUED',
    DELIVERED = 'DELIVERED',
    OPENED = 'OPENED',
    CLICKED = 'CLICKED',
    REJECTED = 'REJECTED',
    FAILED = 'FAILED'
}

registerEnumType(LwpNotificationStatus, { name: 'LwpNotificationStatus' });

export enum MessageType {
    EMAIL = 'EMAIL',
    SMS = 'SMS',
    BOTH = 'BOTH'
}

registerEnumType(MessageType, {
    name: 'MessageType'
});

@InputType()
export class MessageLogFilterInput {
    @Field(() => [String], { nullable: true })
    recipient?: string[];

    @Field(() => [LwpNotificationStatus], { nullable: true })
    statuses?: LwpNotificationStatus[];

    @Field(() => EmailTemplateTypes, { nullable: true })
    emailType?: EmailTemplateTypes;

    @Field(() => MessageType, { nullable: true })
    messageType?: MessageType;

    @Field({ nullable: true })
    search?: string;

    @Field({ nullable: true })
    from?: Date;

    @Field({ nullable: true })
    until?: Date;
}

@ObjectType()
export class MessageLogsCountOutput {
    @Field(() => Int, { defaultValue: 0, nullable: true })
    clickedCount?: number;

    @Field(() => Int, { defaultValue: 0, nullable: true })
    deliveredCount?: number;

    @Field(() => Int, { defaultValue: 0, nullable: true })
    sentCount?: number;

    @Field(() => Int, { defaultValue: 0, nullable: true })
    openedCount?: number;

    @Field(() => Int, { defaultValue: 0, nullable: true })
    waitingQueuedCount?: number;

    @Field(() => Int, { defaultValue: 0, nullable: true })
    failedRejectedCount?: number;

    @Field(() => Int, { defaultValue: 0, nullable: true })
    totalMessage?: number;
}

@ObjectType()
export class AwaitingInvitedParents {
    @Field()
    id: string;

    @Field()
    firstname: string;

    @Field()
    lastname: string;

    @Field(() => [PupilGroupAndClassOutput])
    parents: PupilGroupAndClassOutput[];

    @Field(() => [PupilGroupAndClassOutput])
    classes: PupilGroupAndClassOutput[];
}

@ObjectType()
export class AwaitingInvitedParentOutput {
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field()
    @AuthorizeField(TeacherField)
    firstname: string;

    @Field()
    @AuthorizeField(TeacherField)
    lastname: string;

    @Field(() => [LwpPupilParent])
    @AuthorizeField(TeacherField)
    parents: LwpPupilParent[];
}

export enum LwpStaticDataQueryType {
    ADMIN = 'ADMIN',
    LEADER = 'LEADER'
}

registerEnumType(LwpStaticDataQueryType, {
    name: 'LwpStaticDataQueryType'
});

export enum LwpStaticQueryCatergory {
    READING = 'READING',
    TOPICS = 'TOPICS',
    BOTH = 'BOTH'
}

registerEnumType(LwpStaticQueryCatergory, {
    name: 'LwpStaticQueryCatergory'
});

export enum LwpStaticQueryStatus {
    HIDDEN = 'HIDDEN',
    PUBLISHED = 'PUBLISHED'
}

registerEnumType(LwpStaticQueryStatus, {
    name: 'LwpStaticQueryStatus'
});

export enum SchoolSubjectType {
    BOTH = 'BOTH',
    TOPIC = 'TOPIC',
    READING = 'READING'
}

registerEnumType(SchoolSubjectType, {
    name: 'SchoolSubjectType'
});

@InputType()
export class CreateLwpSchoolTagInput {
    @Field()
    name: string;

    @Field()
    color: string;

    @Field(() => [String])
    schoolIds: string[];
}

@InputType()
export class UpdateLwpSchoolTagInput extends CreateLwpSchoolTagInput {
    @Field()
    id: string;
}

@ObjectType()
export class AllTagsOutput {
    @Field()
    category: string;

    @Field()
    id: string;

    @Field()
    name: string;

    @Field()
    color: string;

    @Field({ nullable: true, defaultValue: 0 })
    count: number;
}

@ObjectType()
export class PupilHistoryOutput {
    @Field()
    @AuthorizeField(UnrestrictedField)
    id: string;

    @Field()
    @AuthorizeField(UnrestrictedField)
    logCreatedAt: Date;

    @Field()
    @AuthorizeField(UnrestrictedField)
    userName: string;
}

@ObjectType()
export class LastPupilHistoryOutput {
    @Field()
    @AuthorizeField(UnrestrictedField)
    userName: string;

    @Field()
    @AuthorizeField(UnrestrictedField)
    updatedAt: Date;
}

export enum TagsCategoryType {
    TOPIC_TAG = 'TOPIC_TAG',
    SCHOOL_TAG = 'SCHOOL_TAG',
    ACTIVITY_TAG = 'ACTIVITY_TAG',
    PUPIL_TAG = 'PUPIL_TAG'
}

registerEnumType(TagsCategoryType, {
    name: 'TagsCategoryType'
});

@ObjectType()
export class TagsColorOutput {
    @Field()
    @AuthorizeField(TeacherField)
    name: string;

    @Field()
    @AuthorizeField(TeacherField)
    color: string;

    @Field()
    @AuthorizeField(TeacherField)
    id: string;
}

@ObjectType()
export class SchoolImpactReportForMagicLinkOutput {
    @Field()
    @AuthorizeField(UnrestrictedField)
    schoolName: string;

    @Field(() => SchoolImpactReportType, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    reportType?: SchoolImpactReportType;

    @AuthorizeField(UnrestrictedField)
    @Field(() => LwpSchoolImpactReportV1Output, { nullable: true })
    topicsVersion?: LwpSchoolImpactReportV1Output;

    @AuthorizeField(UnrestrictedField)
    @Field(() => LwpSchoolImpactReportV1Output, { nullable: true })
    readingVersion?: LwpSchoolImpactReportV1Output;

    @AuthorizeField(UnrestrictedField)
    @Field(() => ImpactReportVersion)
    impactReportVersion: ImpactReportVersion;

    @AuthorizeField(UnrestrictedField)
    @Field(() => LwpSchoolImpactReport, { nullable: true })
    impactReportV2?: LwpSchoolImpactReport;
}

export enum BookReadAt {
    HOME = 'HOME',
    SCHOOL = 'SCHOOL',
    GROUP = 'GROUP'
}

registerEnumType(BookReadAt, {
    name: 'BookReadAt'
});

export enum PupilBookHistoryFilter {
    All = 'ALL',
    FINISHED = 'FINISHED',
    NOT_FINISHED = 'NOT_FINISHED'
}

registerEnumType(PupilBookHistoryFilter, {
    name: 'PupilBookHistoryFilter'
});

@InputType()
export class PupilBookHistoryInput {
    @Field({ nullable: true })
    bookName: string;

    @Field({ defaultValue: false })
    isSchoolBooksOnly: boolean;

    @Field({ defaultValue: false })
    isCurrentYearOnly: boolean;

    @Field(() => [BookReadAt], { nullable: true })
    readAt: BookReadAt[];

    @Field()
    pupilId: string;
}

@InputType()
export class PupilBookHistoryForParentInput {
    @Field()
    pupilId: string;

    @Field(() => PupilBookHistoryFilter)
    type: PupilBookHistoryFilter;

    @Field({ nullable: true })
    limit: number;

    @Field({ nullable: true })
    offset: number;
}
@InputType()
export class CreateFeedbackReplyInput {
    @Field({ nullable: true })
    reply: string;

    @Field({ nullable: true })
    stickerId: string;

    @Field()
    feedbackId: string;
}
@InputType()
export class UpdateFeedbackReplyInput {
    @Field({ nullable: true })
    reply: string;

    @Field({ nullable: true })
    stickerId: string;

    @Field()
    id: string;
}

@InputType()
export class UpdateParentFeedbackFeatureForSchoolInput {
    @Field({ defaultValue: false })
    enableTick: boolean;

    @Field({ defaultValue: false })
    enableComments: boolean;

    @Field({ defaultValue: false })
    enableStickers: boolean;

    @Field()
    schoolId: string;
}

@ObjectType()
export class AllStickersOutput {
    @Field(() => [LwpSticker])
    @AuthorizeField(TeacherField)
    active: LwpSticker[];

    @Field(() => [LwpSticker])
    @AuthorizeField(TeacherField)
    inActive: LwpSticker[];
}

@InputType()
export class UpdateStickerInput {
    @Field()
    alt: string;

    @Field()
    id: string;
}

@InputType()
export class UpdateNotificationStatusInputForTesting {
    @Field()
    recipient: string;

    @Field(() => TwilioMessageStatus, { nullable: true })
    twilioStatus: TwilioMessageStatus;

    @Field(() => MailgunEventType, { nullable: true })
    mailgunStatus: MailgunEventType;
}

@InputType()
export class PupilRecentBookLogsInput {
    @Field()
    pupilId: string;

    @Field(() => ReadingType, { nullable: true })
    readingType: ReadingType;

    @Field({ nullable: true })
    bookName: string;
}

@ObjectType()
export class ClassTopicContextOutput {
    @Field()
    @AuthorizeField(TeacherField)
    hasReadingTopic: boolean;

    @Field()
    @AuthorizeField(TeacherField)
    hasTopics: boolean;
}
export enum StickerCharacterItemType {
    CHARACTER = 'CHARACTER',
    ITEM = 'ITEM'
}

registerEnumType(StickerCharacterItemType, {
    name: 'StickerCharacterItemType'
});

@InputType()
export class CreateStickerCharacterItemInput {
    @Field()
    alt: string;

    @Field(() => StickerCharacterItemType)
    type: StickerCharacterItemType;
}

@InputType()
export class UpdateStickerCharacterItemInput {
    @Field()
    alt: string;

    @Field()
    id: string;
}

@InputType()
export class CreateStickerInput {
    @Field()
    label: string;

    @Field()
    textColor: string;

    @Field()
    borderColor: string;

    @Field({ nullable: true })
    itemId: string;

    @Field({ nullable: true })
    characterId: string;

    @Field({ nullable: true })
    schoolId: string;
}

@InputType()
export class EditCreatedStickerInput extends CreateStickerInput {
    @Field()
    stickerId: string;
}

@InputType()
export class CreateNewProgramInput {
    @Field()
    name: string;

    @Field({ nullable: true })
    schoolTagId: string;
}

@InputType()
export class UpdateProgramInput extends CreateNewProgramInput {
    @Field()
    id: string;

    @Field({ nullable: true })
    removeLogo: boolean;

    @Field({ nullable: true })
    removeCharacter: boolean;
}

@InputType()
export class CreateLwpSchoolPupilTagInput {
    @Field()
    name: string;

    @Field()
    color: string;

    @Field(() => [String], { nullable: true })
    pupilIds: string[];

    @Field()
    schoolId: string;
}

@InputType()
export class UpdateLwpSchoolPupilTagInput {
    @Field()
    id: string;

    @Field()
    name: string;

    @Field()
    color: string;

    @Field(() => [String], { nullable: true })
    pupilIds: string[];
}

@InputType()
export class AddPupilTagsInPupilInput {
    @Field(() => [String], { nullable: true })
    tagIds: string[];

    @Field({ nullable: true })
    color: string;

    @Field({ nullable: true })
    name: string;

    @Field()
    schoolId: string;

    @Field(() => [String])
    pupilIds: string[];
}

@InputType()
export class GetTagsByColorInput {
    @Field(() => TagsCategoryType)
    category: TagsCategoryType;

    @Field()
    color: string;

    @Field({ nullable: true })
    schoolId: string;
}

registerEnumType(SchoolImpactReportType, {
    name: 'SchoolImpactReportType'
});
@InputType()
export class GenrateSchoolImpactReportInput {
    @Field()
    schoolId: string;

    @Field()
    termId: string;
}

@InputType()
export class UpdateSchoolImpactReportInput {
    @Field()
    id: string;

    @Field({ nullable: true })
    spmNote: string;

    @Field({ nullable: true })
    spmNextStepsProgram: string;
}

registerEnumType(SchoolAnalyticsGraphType, {
    name: 'SchoolAnalyticsGraphType'
});

registerEnumType(FeedbackReplyType, {
    name: 'FeedbackReplyType'
});

@InputType()
export class SchoolAnalyticsDataQueryInput {
    @Field()
    schoolId: string;

    @Field(() => SchoolAnalyticsGraphType)
    graphType: SchoolAnalyticsGraphType;

    @Field(() => SchoolImpactReportType)
    reportType: SchoolImpactReportType;

    @Field(() => [String], { nullable: true })
    subjectIds: string[];
}

@InputType()
export class UpdateSchoolClassLicenceInput {
    @Field()
    schoolId: string;

    @Field()
    fullProgrammedClassesAllowed: number;

    @Field()
    classesAllowed: number;
}

@ObjectType()
export class UninvitedStaff {
    @AuthorizeField(AdminField)
    @Field()
    userId: string;

    @AuthorizeField(AdminField)
    @Field()
    firstname: string;

    @AuthorizeField(AdminField)
    @Field()
    lastname: string;

    @AuthorizeField(AdminField)
    @Field()
    isSchoolLeader: boolean;

    /**
     * Why this person is still uninvited. Drives the per-row label in the admin "Send invites" modal and
     * which rows are ticked by default (DO_NOT_SEND starts unticked).
     */
    @AuthorizeField(AdminField)
    @Field(() => InviteMode)
    inviteMode: InviteMode;

    @AuthorizeField(AdminField)
    @Field()
    schoolId: string;

    @AuthorizeField(AdminField)
    @Field()
    schoolName: string;
}

@ObjectType()
export class PupilWithoutClassCounts {
    @AuthorizeField(TeacherField)
    @Field(() => Int)
    currentYear: number; // Total pupils for the current year

    @AuthorizeField(TeacherField)
    @Field(() => Int)
    nextYearTotalPupils: number; // Total pupils (ignored + non-ignored) for next year

    @AuthorizeField(TeacherField)
    @Field(() => Int)
    nextYearNonIgnoredPupils: number; // Non-ignored pupils for next year
}

@InputType()
export class AssignPupilToNewOrExistingClassInput {
    @Field()
    schoolId: string;

    @Field({ nullable: true })
    existingClassId: string;

    @Field(() => [String])
    pupilIds: string[];

    @Field({ nullable: true })
    className: string;

    @Field({ nullable: true })
    yearGroup: string;
}

registerEnumType(SubjectProgrammeType, {
    name: 'SubjectProgrammeType'
});

// Topic sequencing enums live in the shared package (shared by FE + BE); registered here for GraphQL.
registerEnumType(SequenceTimingMode, {
    name: 'SequenceTimingMode'
});

registerEnumType(SequenceAssignmentStatus, {
    name: 'SequenceAssignmentStatus'
});

registerEnumType(SequenceItemSkipReason, {
    name: 'SequenceItemSkipReason'
});

registerEnumType(WholeSchoolSequenceStatus, {
    name: 'WholeSchoolSequenceStatus'
});

registerEnumType(WholeSchoolYearGroupSkipReason, {
    name: 'WholeSchoolYearGroupSkipReason'
});

@InputType()
export class UpdateSubjectInput {
    @Field()
    id: string;

    @Field()
    subjectName: string;

    @Field(() => SubjectProgrammeType)
    programmeType: SubjectProgrammeType;
}
