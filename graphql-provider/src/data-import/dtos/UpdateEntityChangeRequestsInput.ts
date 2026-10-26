import { Field, InputType } from '@nestjs/graphql';

import { EntityType } from '../types/entity-type';

@InputType()
class AcceptOrRejectEntityChangeInput {
    @Field()
    id: string;

    @Field()
    accept: boolean;
}

@InputType()
export class UpdateEntityChangeRequestsInput {
    @Field(() => [AcceptOrRejectEntityChangeInput])
    actions: AcceptOrRejectEntityChangeInput[];

    @Field(() => EntityType)
    type: EntityType;
}
