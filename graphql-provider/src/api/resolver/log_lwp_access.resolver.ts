import { Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';

import { LogLwpAccess } from '../entities/log_lwp_access';
import { LogLwpAccessService } from '../service/log_lwp_access.service';

@Resolver(() => LogLwpAccess)
export class LogLwpAccessResolver {
    constructor(private logLwpAccessService: LogLwpAccessService) {}

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async adminlogsCleanUp(): Promise<boolean> {
        await this.logLwpAccessService.logsCleanUp();

        return true;
    }
}
