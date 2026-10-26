import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { LwpSetByTeacherStepMedia } from '../entities/lwp_set_by_teacher_step_media';
import { PupilTopicService } from '../service/pupil_topic.service';

@Injectable()
export class SbtStepMediaLoader implements NestDataLoader<string, LwpSetByTeacherStepMedia[]> {
    constructor(private readonly pupilTopicService: PupilTopicService) {}

    generateDataLoader(): DataLoader<string, LwpSetByTeacherStepMedia[]> {
        return new DataLoader<string, LwpSetByTeacherStepMedia[]>((pupilTopicIds) =>
            this.pupilTopicService.getSetByTeacherMediaForPupilTopicIds(pupilTopicIds)
        );
    }
}
