import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { StaticLwpModal } from '../entities/modal';
import { ActivityService } from '../service/activity.service';

@Injectable()
export class ActivityRationaleModalLoader implements NestDataLoader<string, StaticLwpModal> {
    constructor(private readonly activityService: ActivityService) {}

    generateDataLoader(): DataLoader<string, StaticLwpModal> {
        return new DataLoader<string, StaticLwpModal>(async (keys: readonly string[]) =>
            this.activityService.getRationaleModalsByActivityIds(keys)
        );
    }
}
