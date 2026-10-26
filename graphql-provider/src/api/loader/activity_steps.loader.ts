import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { StaticLwpActivityLegacy } from '../dtos/StaticLwpActivityLegacy';
import { ActivityService } from '../service/activity.service';

@Injectable()
export class ActivityStepsLoader implements NestDataLoader<string, StaticLwpActivityLegacy> {
    constructor(private readonly activityService: ActivityService) {}

    generateDataLoader(): DataLoader<string, StaticLwpActivityLegacy> {
        return new DataLoader<string, StaticLwpActivityLegacy>((activityIds) => this.activityService.getStepsByActivityIds(activityIds));
    }
}
