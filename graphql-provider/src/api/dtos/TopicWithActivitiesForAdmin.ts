import { Field, ObjectType } from '@nestjs/graphql';

import { StaticLwpActivity } from '../entities/activity';

@ObjectType()
export class TopicWithActivitiesForAdmin {
    @Field()
    id: string;

    @Field()
    teacherTopicName: string;

    @Field(() => [StaticLwpActivity])
    activities: StaticLwpActivity[];
}
