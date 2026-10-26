import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { SchoolService } from '../service/school.service';

@Injectable()
export class HasSchoolLeadersAwaitingWelcomeBySchoolIdLoader implements NestDataLoader<string, boolean> {
    constructor(private readonly schoolService: SchoolService) {}

    generateDataLoader(): DataLoader<string, boolean> {
        return new DataLoader<string, boolean>((schoolIds) => this.schoolService.getHasSchoolLeadersAwaitingWelcomeBySchoolIds(schoolIds));
    }
}
