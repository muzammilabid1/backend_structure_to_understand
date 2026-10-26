import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { NestDataLoader } from 'nestjs-dataloader';

import { WholeSchoolSequenceService } from '../service/whole_school_sequence.service';

/**
 * Batched so the admin whole-school list, which renders every one there is, asks whether a sequence
 * has been scheduled once for the whole page rather than once per row.
 *
 * The sibling of `SequenceAssignmentUsageBySequenceIdLoader`, which does the same job for a
 * class-level sequence's academic year lock (LEA-6585). Two loaders rather than one because the two
 * questions read different tables: a class sequence is assigned to classes, a whole-school sequence
 * is scheduled by schools.
 */
@Injectable()
export class WholeSchoolAssignmentUsageBySequenceIdLoader implements NestDataLoader<string, boolean> {
    constructor(private readonly wholeSchoolSequenceService: WholeSchoolSequenceService) {}

    generateDataLoader(): DataLoader<string, boolean> {
        return new DataLoader<string, boolean>((wholeSchoolSequenceIds) =>
            this.wholeSchoolSequenceService.getWholeSchoolAssignmentUsage(wholeSchoolSequenceIds)
        );
    }
}
