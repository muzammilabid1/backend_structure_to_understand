import { Field, ObjectType } from '@nestjs/graphql';

import { AdminAllFeedsFilterOutput } from '../model';
import { PupilFeedbackOutput } from './PupilFeedbackOutput';

@ObjectType()
export class AllFeedsOutput {
    @Field()
    feed: PupilFeedbackOutput;

    @Field()
    filter: AdminAllFeedsFilterOutput;
}
