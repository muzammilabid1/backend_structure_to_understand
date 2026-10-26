import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { SchoolService } from '../service/school.service';

@Injectable()
export class SchoolCommentsAndPhotosLoader implements NestDataLoader<string, number> {
    constructor(private readonly schoolService: SchoolService) {}

    generateDataLoader(): DataLoader<string, number> {
        return new DataLoader<string, number>((schoolIds) => this.schoolService.getCommentsAndPhotosBySchoolIds(schoolIds));
    }
}
