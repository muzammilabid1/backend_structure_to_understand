import { PupilClassActionType } from '../types/PupilClassActionType';

export class LogPupilClassChangeInput {
    pupilId: string;
    classId: string;
    action: PupilClassActionType;
    logCreatedById: string;
}
