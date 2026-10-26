import { ImportStatus } from 'lwp-shared';
import { IPupil } from './IPupil';
import { IStaticLwpPeriod } from './IStaticLwpPeriod';

export interface IPupilsWithoutClassesCount {
    currentYear: number; // Number of pupils without classes in the current year
    nextYearNonIgnoredPupils: number; // Number of non-ignored pupils for the next year
    nextYearTotalPupils: number; // Total number of pupils for the next year
}

export interface IImportedSchool {
    id: string;
}

export interface ILwpSchool {
    id: string;
    schoolName?: string;
    misName: string | null;
    lastImportedAt: string | null;
    pupils: IPupil[];
    enableAddClasses: boolean;
    pupilsWithoutClassesCount: IPupilsWithoutClassesCount; // Number of pupils without classes in the current year and next year
    curentPeriod: IStaticLwpPeriod;
    isDownloadSchoolData: boolean;
    isDataQueryAvailableForSchool: boolean;
    enableBookNameOnlyReadingLog: boolean;
    isParentFeedbackReplyFeatureEnabled: boolean;
    isParentFeedbackStickerFeatureEnabled: boolean;
    parentFeedbackTickFeatureEnabledAt: Date | null;
    isMoneySkillsAvailable: boolean; // true: when the Money Skills enabled for the school
    schoolSubjectType: 'BOTH' | 'TOPICS' | 'READING';
    importStatus: ImportStatus;
    importedSchool: IImportedSchool | null; // The school that was imported, if applicable
    isDataImportReviewEnabledForSchool: boolean;
    isScrapbookEnabledForSchool?: boolean;
}
