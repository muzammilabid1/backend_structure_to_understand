import { ImpactReportVersion, SchoolImpactReportType } from 'lwp-shared';
import { ILwpSchoolImpactReportFeedback } from './ILwpSchoolImpactReportFeedback';
import { ILwpSchoolDates } from './ILwpSchoolDates';
import { IStaticLwpSubject } from './IStaticLwpSubject';

export interface IEngagementStatisticsOutput {
    name: string;
    activeFamiliesPercentage?: number;
    activePremiumFamiliesPercentage?: number;
    premiumPupilCount?: number;
    allPupilsCount?: number;
}

//  This is the Impact Report V1 interface.
export interface ILwpSchoolImpactReport {
    id: string;
    launchDate?: Date | null;
    isPublished?: boolean;
    activeFamiliesPercentage?: number | null;
    premiumPupilsCount?: number | null;
    pupilsCount?: number | null;
    activePremiumFamiliesPercentage?: number | null;
    activeFamiliesPercentageAllSchools?: number | null;
    activePremiumFamiliesPercentageAllSchools?: number | null;
    numberOfWeeks?: number | null;
    weeklyReadingTarget?: number | null;
    numberOfClasses?: number | null;
    yearGroupCoverage?: string | null;
    spmNote?: string | null;
    spmNextStepsProgram?: string | null;
    feedbacks?: ILwpSchoolImpactReportFeedback[];
    reportType?: SchoolImpactReportType;
    engagementByYearGroup: IEngagementStatisticsOutput[];
    engagementByClass: IEngagementStatisticsOutput[];
    avgWeeklyTargetMetByYearGroup: IEngagementStatisticsOutput[];
    avgWeeklyTargetMetByClass: IEngagementStatisticsOutput[];
    buildingEngagement: IEngagementStatisticsOutput[];
    avgTopicSetByYearGroup: IEngagementStatisticsOutput[];
    avgTopicSetByClass: IEngagementStatisticsOutput[];
    hasPublishedVersion?: boolean;
    logCreatedAt?: Date;
    term?: ILwpSchoolDates;
    version: ImpactReportVersion;
}

export interface ILwpSchoolImpactReportV2Graphs {
    avgTopicSetByClass: IEngagementStatisticsOutput[];
    engagementByYearGroup: IEngagementStatisticsOutput[];
    avgCompletionRateByYearGroup: IEngagementStatisticsOutput[];
    buildingEngagement: IEngagementStatisticsOutput[];
    premiumPupilsCount?: number | null;
    pupilsCount?: number | null;
    id: string;
    subject: IStaticLwpSubject | null;
}

export interface ILwpSchoolImpactReportV2 {
    id: string;
    launchDate?: Date | null;
    isPublished?: boolean;
    activeFamiliesPercentage?: number | null;
    activePremiumFamiliesPercentage?: number | null;
    activeFamiliesPercentageAllSchools?: number | null;
    activePremiumFamiliesPercentageAllSchools?: number | null;
    numberOfWeeks?: number | null;
    weeklyReadingTarget?: number | null;
    numberOfClasses?: number | null;
    yearGroupCoverage?: string | null;
    spmNote?: string | null;
    spmNextStepsProgram?: string | null;
    feedbacks?: ILwpSchoolImpactReportFeedback[];
    hasPublishedVersion?: boolean;
    logCreatedAt?: Date;
    term?: ILwpSchoolDates;
    version: ImpactReportVersion;
    graphs: Array<ILwpSchoolImpactReportV2Graphs>;
    showNationalDataAverage?: boolean;
}
