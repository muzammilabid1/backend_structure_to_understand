import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { StaticLwpYearGroup } from '../entities/year_group';
import { YearGroupService } from '../service/year_group.service';

@Injectable()
export class YearGroupsLoader implements NestDataLoader<string, StaticLwpYearGroup[]> {
    constructor(private readonly yearGroupService: YearGroupService) {}

    generateDataLoader(): DataLoader<string, StaticLwpYearGroup[]> {
        return new DataLoader<string, StaticLwpYearGroup[]>((topicIds) => this.yearGroupService.getTopicYearGroupsByTopicIds(topicIds));
    }
}
