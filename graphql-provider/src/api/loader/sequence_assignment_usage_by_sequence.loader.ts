import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { TopicSequenceService } from '../service/topic_sequence.service';

/**
 * Batched so the admin sequences list, which renders every sequence, asks whether a sequence has
 * been assigned once for the whole page rather than once per row.
 */
@Injectable()
export class SequenceAssignmentUsageBySequenceIdLoader implements NestDataLoader<string, boolean> {
    constructor(private readonly topicSequenceService: TopicSequenceService) {}

    generateDataLoader(): DataLoader<string, boolean> {
        return new DataLoader<string, boolean>((sequenceIds) => this.topicSequenceService.getSequenceAssignmentUsage(sequenceIds));
    }
}
