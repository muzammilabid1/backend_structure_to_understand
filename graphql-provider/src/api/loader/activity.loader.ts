import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { StaticLwpActivity } from '../entities/activity';
import { ActivityService } from '../service/activity.service';

@Injectable()
export class ActivityLoader implements NestDataLoader<string, StaticLwpActivity[]> {
    constructor(private readonly activityService: ActivityService) {}

    generateDataLoader(): DataLoader<string, StaticLwpActivity[]> {
        return new DataLoader<string, StaticLwpActivity[]>((topicIds) => this.activityService.getActivitiesByTopicIds(topicIds));
    }
}
