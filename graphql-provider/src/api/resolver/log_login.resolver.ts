import { Args, Query, Resolver } from '@nestjs/graphql';
import { AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { OpType } from 'src/auth/types/OpType';
import { Pagination } from 'src/paginate';

import { LogLwpLoginOutput } from '../dtos/LogLwpLoginOutput';
import { LogLwpLogin } from '../entities/log_login';
import { LogLoginService } from '../service/log_login.service';

@Resolver(() => LogLwpLogin)
export class LogLwpLoginResolver {
    constructor(private logLwpLoginService: LogLoginService) {}

    @AuthorizeEndpoint([LogLwpLogin, OpType.Read, null])
    @Query(() => LogLwpLoginOutput)
    async getLogLwpLoginHistory(
        @Args({ name: 'userEmail' }) userEmail: string,
        @Args({ name: 'limit', nullable: true }) limit: number,
        @Args({ name: 'offset', nullable: true }) offset: number
    ): Promise<Pagination<LogLwpLogin>> {
        return await this.logLwpLoginService.getLogLwpLoginHistory(userEmail, limit, offset);
    }
}
