import { Field, ObjectType } from '@nestjs/graphql';

import { LogLwpLogin } from '../entities/log_login';
import { WithPagination } from './WithPagination';

@ObjectType()
export class LogLwpLoginOutput extends WithPagination {
    @Field(() => [LogLwpLogin])
    results: LogLwpLogin[];
}
