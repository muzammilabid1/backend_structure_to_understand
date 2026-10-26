import { FeatureCode } from 'lwp-shared';
import { IStaticLwpSchoolTag } from './IStaticLwpSchoolTag';

export interface IStaticLwpFeatures {
    id: string;
    name: string;
    description?: string;
    status: string;
    code: FeatureCode;
    includeSchoolsWithTags: boolean;
    schoolTags?: IStaticLwpSchoolTag[];
}
