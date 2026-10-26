import { IStaticLwpPeriod } from './IStaticLwpPeriod';
import { IStaticLwpYearGroup } from './IStaticLwpYearGroup';

export interface ILwpSchoolClass {
    id: string;
    name: string;
    period: IStaticLwpPeriod;
    yearGroup?: IStaticLwpYearGroup;
    isReadyTeddyEnabled: boolean;
    isFullProgramme: boolean;
    IsReadingLogsEnabled: boolean;
    isPreAdmissionClass?: boolean;
}
