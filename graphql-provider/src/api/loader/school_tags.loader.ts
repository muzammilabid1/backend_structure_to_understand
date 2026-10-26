import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { TopicService } from '../service/topic.service';

@Injectable()
export class SchoolTagsLoader implements NestDataLoader<string, StaticLwpSchoolTag[]> {
    constructor(private readonly topicService: TopicService) {}

    generateDataLoader(): DataLoader<string, StaticLwpSchoolTag[]> {
        return new DataLoader<string, StaticLwpSchoolTag[]>((topicIds) => this.topicService.getSchoolTagsByTopicIds(topicIds));
    }
}
