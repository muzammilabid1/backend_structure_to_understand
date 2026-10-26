import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { TopicService } from '../service/topic.service';

@Injectable()
export class ReadyTeddyLoader implements NestDataLoader<string, boolean> {
    constructor(private readonly topicService: TopicService) {}

    generateDataLoader(): DataLoader<string, boolean> {
        return new DataLoader<string, boolean>((topicIds) => this.topicService.areReadyTeddyTopics(topicIds));
    }
}
