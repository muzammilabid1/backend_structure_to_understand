import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { LwpSchool } from '../entities/school';
import { LastPupilHistoryOutput } from '../model';
import { LwpPupilFeedbackService } from '../service/lwp_pupil_feedback.service';

@Injectable()
export class LwpPupilFeedbackLoader implements NestDataLoader<string, LwpPupilFeedback[]> {
    constructor(private readonly pupilFeedbackService: LwpPupilFeedbackService) {}

    generateDataLoader(): DataLoader<string, LwpPupilFeedback[]> {
        return new DataLoader<string, LwpPupilFeedback[]>((keys) => this.pupilFeedbackService.getReadingLogFeedbacksByTopicIds(keys));
    }
}

@Injectable()
export class LwpPupilFeedbackLastActionLoader implements NestDataLoader<string, LastPupilHistoryOutput | null> {
    constructor(private readonly pupilFeedbackService: LwpPupilFeedbackService) {}

    generateDataLoader(): DataLoader<string, LastPupilHistoryOutput | null> {
        return new DataLoader<string, LastPupilHistoryOutput | null>((keys) =>
            this.pupilFeedbackService.getLastActionOfFeedbackByIds(keys)
        );
    }
}

@Injectable()
export class LwpPupilFeedbackSchoolLoader implements NestDataLoader<string, LwpSchool | null> {
    constructor(private readonly pupilFeedbackService: LwpPupilFeedbackService) {}

    generateDataLoader(): DataLoader<string, LwpSchool | null> {
        return new DataLoader<string, LwpSchool | null>((keys) => this.pupilFeedbackService.getSchoolsByFeedbackIds(keys));
    }
}
