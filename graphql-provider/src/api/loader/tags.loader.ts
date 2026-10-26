import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { StaticLwpTopicTag } from '../entities/static_lwp_topic_tag';
import { StaticLwpTopicTagService } from '../service/static_lwp_topic_tag.service';

@Injectable()
export class TagsLoader implements NestDataLoader<string, StaticLwpTopicTag[]> {
    constructor(private readonly service: StaticLwpTopicTagService) {}

    generateDataLoader(): DataLoader<string, StaticLwpTopicTag[]> {
        return new DataLoader<string, StaticLwpTopicTag[]>((topicIds) => this.service.getTopicTagsByTopicIds(topicIds));
    }
}
