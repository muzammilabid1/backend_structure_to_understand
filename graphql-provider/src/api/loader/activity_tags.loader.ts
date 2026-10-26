import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { StaticLwpActivityTag } from '../entities/static_lwp_activity_tag';
import { StaticLwpActivityTagService } from '../service/static_lwp_activity_tag.service';

@Injectable()
export class ActivityTagsLoader implements NestDataLoader<string, StaticLwpActivityTag[]> {
    constructor(private readonly activityTagService: StaticLwpActivityTagService) {}

    generateDataLoader(): DataLoader<string, StaticLwpActivityTag[]> {
        return new DataLoader<string, StaticLwpActivityTag[]>(async (keys: readonly string[]) =>
            this.activityTagService.getTagsByActivityIds(keys)
        );
    }
}
