import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { StaticLwpPeriod } from '../entities/static_period';
import { StaticLwpPeriodService } from '../service/static_period.service';

@Injectable()
export class SchoolPeriodsLoader implements NestDataLoader<string, StaticLwpPeriod> {
    constructor(private readonly periodService: StaticLwpPeriodService) {}

    generateDataLoader(): DataLoader<string, StaticLwpPeriod> {
        return new DataLoader<string, StaticLwpPeriod>((schoolIds) => this.periodService.getSchoolPeriodsBySchoolIds(schoolIds));
    }
}
