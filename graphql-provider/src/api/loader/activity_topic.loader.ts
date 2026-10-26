import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { StaticLwpTopic } from '../entities/static_topic';
import { TopicService } from '../service/topic.service';

@Injectable()
export class ActivityTopicLoader implements NestDataLoader<string, StaticLwpTopic> {
    constructor(private readonly topicService: TopicService) {}

    generateDataLoader(): DataLoader<string, StaticLwpTopic> {
        return new DataLoader<string, StaticLwpTopic>(async (keys: readonly string[]) => this.topicService.getTopicsByActivityIds(keys));
    }
}
