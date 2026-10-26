import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { ClassSequenceAssignmentService } from '../service/class_sequence_assignment.service';

/**
 * Batched so the school overview, which lists every class in the school, asks the question once
 * rather than once per class.
 */
@Injectable()
export class MoneySkillsAutoScheduleByClassIdLoader implements NestDataLoader<string, boolean> {
    constructor(private readonly classSequenceAssignmentService: ClassSequenceAssignmentService) {}

    generateDataLoader(): DataLoader<string, boolean> {
        return new DataLoader<string, boolean>((classIds) =>
            this.classSequenceAssignmentService.getMoneySkillsAutoScheduleAvailability(classIds)
        );
    }
}
