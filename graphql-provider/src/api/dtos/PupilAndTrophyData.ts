import { LwpPupil } from '../entities/pupil';
import { LwpPupilTrophy } from '../entities/pupil_trophy';
import { LwpSchoolClass } from '../entities/school_class';

export interface PupilAndTrophyData {
    pupil: LwpPupil;
    trophy: LwpPupilTrophy;
    lwpSchoolClass: LwpSchoolClass;
    pupilMathscotUrl?: string;
}
