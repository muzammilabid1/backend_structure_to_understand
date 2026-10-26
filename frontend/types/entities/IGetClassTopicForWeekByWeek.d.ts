// Define interfaces similar to the example you provided

import { IPupil } from './IPupil';

export interface IStatistics {
    completed: number;
    notStarted: number;
    inProgress: number;
}

export interface ITopicWillReleasedFor {
    fullname: string;
}

export interface ITopicNotSetFor {
    fullname: string;
}

export interface IPupilSchool {
    id: string;
}

export interface IPupilClass {
    id: string;
}

export interface IActivity {
    id: string;
    earnedStar: number;
}

export interface IPupilTopics {
    id: string;
    watchedVideo: boolean;
    activities: IActivity[];
    pupil: IPupil;
}

export interface IGetClassTopicForWeekByWeek {
    topicId: string;
    nextTopicId: string;
    previousTopicId: string;
    teacherTopicName: string;
    releaseDate: string;
    dueDate: string;
    teacherMessage: string;
    isReleased: boolean;
    isRegisterationClassTopic: boolean;
    teacherPdf: string | null;
    schoolClassName: string;
    staticTopicId: string;
    statistics: IStatistics;
    topicWillReleasedFor: ITopicWillReleasedFor[];
    topicNotSetFor: ITopicNotSetFor[];
    pupilTopics: IPupilTopics[];
}
