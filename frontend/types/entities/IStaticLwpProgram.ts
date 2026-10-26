import { IStaticLwpSchoolTag } from './IStaticLwpSchoolTag';

export interface IStaticLwpProgram {
    id: string;
    name: string;
    logoUrl: string | null;
    characterUrl: string | null;
    schoolTag: IStaticLwpSchoolTag;
}
