import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { LwpPupilTopic } from '../entities/pupil_topic';
import { PupilTopicService } from '../service/pupil_topic.service';

@Injectable()
export class PupilCurrentRTTopicLoader implements NestDataLoader<string, LwpPupilTopic | null> {
    constructor(private readonly pupilTopicService: PupilTopicService) {}

    generateDataLoader(): DataLoader<string, LwpPupilTopic | null> {
        return new DataLoader<string, LwpPupilTopic | null>((pupilIds) => this.pupilTopicService.getCurrentRTTopicsForPupils(pupilIds));
    }
}
