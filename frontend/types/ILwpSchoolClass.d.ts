import { IStaticLwpPeriod } from './entities/IStaticLwpPeriod';

export interface ILwpSubject {
    name?: string;
    id?: string;
}

export interface ILwpMainTeacher {
    id: string;
    firstname?: string;
    lastname?: string;
    nameForChildren?: string;
    userStatus?: 'INVITED' | 'ACTIVE' | 'INACTIVE' | 'IMPORTED' | 'DEACTIVATED' | 'ACCOUNTLESS' | 'REJECTED';
}

export interface ILwpSchool {
    id: string;
    schoolName?: string;
    misName?: string;
    parentFeedbackTickFeatureEnabledAt?: Date;
    isParentFeedbackStickerFeatureEnabled?: boolean;
    isParentFeedbackReplyFeatureEnabled?: boolean;
    remainingAllowedClassesInfo?: {
        fullProgramme: number;
        total: number;
    };
    curentPeriod?: IStaticLwpPeriod;
    isMoneySkillsAvailable?: boolean;
    isReadyTeddyAvailable?: boolean;
    isScrapbookEnabledForSchool?: boolean;
}

export interface ILwpClassTopicContext {
    hasReadingTopic?: boolean;
    hasTopics?: boolean;
}

export interface ILwpCurrentReadingWeek {
    id: string;
}

export interface ILwpImportedSchoolClass {
    id: string;
    name?: string;
}

export interface ILwpParentClass {
    id: string;
    name?: string;
    readingStartDay?: string;
    subjects?: ILwpSubject[];
}

export interface ILwpYearGroup {
    id: string;
    year: string;
}
export interface ILwpPupil {
    id: string;
    fullname?: string;
}
export interface IAcademicYearInfo {
    shortName: string;
    isInCurrentAcademicYear: boolean;
    isInPreviousAcademicYear: boolean;
}

export interface ILwpSchoolClassDetails {
    id: string;
    name: string;
    IsReadingLogsEnabled?: boolean;
    isFullProgramme?: boolean;
    isRegistrationClass?: boolean;
    subjects?: ILwpSubject[];
    status?: 'ACTIVE' | 'INACTIVE';
    schoolClassName?: string;
    attentionRequiredPupilsCount?: number;
    mainTeacher?: ILwpMainTeacher;
    teachers?: ILwpMainTeacher[];
    school?: ILwpSchool;
    classTopicContext?: ILwpClassTopicContext;
    currentReadingWeek?: ILwpCurrentReadingWeek;
    parentClass?: ILwpParentClass;
    isLocked?: boolean;
    readingTarget?: number;
    readingLaunchDate?: Date;
    readingStartDay?: string;
    importedSchoolClass?: ILwpImportedSchoolClass;
    yearGroup?: ILwpYearGroup;
    skipGroupPupils?: boolean;
    isGroupAcrossClasses?: boolean;
    pupils?: ILwpPupil[];
    isPreAdmissionClass?: boolean;
    isReadyTeddyEnabled?: boolean;
    period?: IStaticLwpPeriod;
    academicYearInfo?: IAcademicYearInfo;
}
