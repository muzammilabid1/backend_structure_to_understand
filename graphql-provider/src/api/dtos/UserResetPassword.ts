import { Field, ObjectType } from '@nestjs/graphql';

import { LwpUser } from '../entities/user';

@ObjectType()
export class UserResetPassword {
    @Field(() => LwpUser)
    user: LwpUser;

    @Field()
    link: string;
}
