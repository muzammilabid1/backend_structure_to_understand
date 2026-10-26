import { Field, InputType } from '@nestjs/graphql';
import { ContentStatus } from 'lwp-shared';
import { UserType } from 'src/auth/types/UserType';

@InputType()
export class UpdateStaticLwpFeatureTooltipInput {
    @Field()
    id: string;

    @Field()
    name: string;

    @Field()
    targetId: string;

    @Field()
    order: number;

    @Field(() => [UserType])
    userTypes: UserType[];

    @Field()
    message: string;

    @Field()
    hasImage: boolean;

    @Field(() => ContentStatus)
    status: ContentStatus;
}
