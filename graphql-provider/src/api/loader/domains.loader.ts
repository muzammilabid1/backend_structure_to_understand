import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { StaticLwpTopicDomain } from '../entities/topic_domain';
import { TopicDomainService } from '../service/topic_domain.service';

@Injectable()
export class DomainsLoader implements NestDataLoader<string, StaticLwpTopicDomain[]> {
    constructor(private readonly topicDomainService: TopicDomainService) {}

    generateDataLoader(): DataLoader<string, StaticLwpTopicDomain[]> {
        return new DataLoader<string, StaticLwpTopicDomain[]>((topicIds) => this.topicDomainService.getTopicDomainsByTopicIds(topicIds));
    }
}
