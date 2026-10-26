import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { LwpPupilActivity } from '../entities/pupil-activity';
import { PupilActivityService } from '../service/pupil_activity.service';

@Injectable()
export class PupilActivitiesLoader implements NestDataLoader<string, LwpPupilActivity[]> {
    constructor(private readonly pupilActivityService: PupilActivityService) {}

    generateDataLoader(): DataLoader<string, LwpPupilActivity[]> {
        return new DataLoader<string, LwpPupilActivity[]>((keys) => this.pupilActivityService.getPupilActivitiesByPupilTopicIds(keys));
    }
}
