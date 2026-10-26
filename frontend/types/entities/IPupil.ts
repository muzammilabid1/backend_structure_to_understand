import { IPupilClass, IPupilSchool } from './IGetClassTopicForWeekByWeek';
import { ILwpSchoolClass } from './ILwpSchoolClass';

type ITag = {
    id: string;
    name: string;
    color: string;
};

export interface ReadyTeddyTopicForScrapbook {
    id: string;
    scrapbookPrompt: string;
    haveScrapbookEntry: boolean;
}

export interface IPupil {
    id: string;
    fullname: string;
    pupilStatus: string;
    school: IPupilSchool;
    classes: IPupilClass[];
    tags: ITag[];
    importedStudent?: { id?: string };
    currentClass: ILwpSchoolClass;
    hasTopicsInCurrentAcademicYear?: boolean;
    isInSchoolClassOrGroupAcrossClasses?: boolean;
    isActiveInCurrentAcademicYear?: boolean;
    currentReadyTeddyTopicForScrapbook?: ReadyTeddyTopicForScrapbook;
}
