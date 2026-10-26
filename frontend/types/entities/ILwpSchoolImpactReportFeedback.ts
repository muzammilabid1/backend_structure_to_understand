import { SchoolImpactReportFeedbackContentType } from 'lwp-shared';

export interface ILwpSchoolImpactReportFeedback {
    id: string;
    content: string;
    contentType: SchoolImpactReportFeedbackContentType;
    pupilFirstName: string;
    className: string;
    classYearGroup: string;
}
