import { InterstitialLastActionType } from 'lwp-shared';
import { IStaticLwpSubject } from './IStaticLwpSubject';
import { IStaticLwpSchoolTag } from './IStaticLwpSchoolTag';

export interface InterstitialForm {
    id: string;
    name: string;
    heading: string;
    text?: string;
    typeformId: string;
    userOptions: string[];
    lastAction: InterstitialLastActionType;
    lastActionAt: Date;
    averageTime: number;
    showQuestion: boolean;
    subject?: IStaticLwpSubject;
    schoolTags?: IStaticLwpSchoolTag[];
}
