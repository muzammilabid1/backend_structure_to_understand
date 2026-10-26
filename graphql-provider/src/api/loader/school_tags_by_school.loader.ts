import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { SchoolService } from '../service/school.service';

@Injectable()
export class SchoolTagsBySchoolIdLoader implements NestDataLoader<string, StaticLwpSchoolTag[]> {
    constructor(private readonly schoolService: SchoolService) {}

    generateDataLoader(): DataLoader<string, StaticLwpSchoolTag[]> {
        return new DataLoader<string, StaticLwpSchoolTag[]>((schoolIds) => this.schoolService.getSchoolTagsBySchoolIds(schoolIds));
    }
}
