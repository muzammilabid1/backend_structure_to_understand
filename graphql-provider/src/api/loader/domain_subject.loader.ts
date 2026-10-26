import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { TopicDomainService } from '../service/topic_domain.service';

@Injectable()
export class DomainSubjectLoader implements NestDataLoader<string, StaticLwpSubject> {
    constructor(private readonly topicDomainService: TopicDomainService) {}

    generateDataLoader(): DataLoader<string, StaticLwpSubject> {
        return new DataLoader<string, StaticLwpSubject>((domainIds) => this.topicDomainService.getSubjectsByDomainIds(domainIds));
    }
}
