import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { OpType } from 'src/auth/types/OpType';
import { Pagination } from 'src/paginate';

import { LogParentPupilAction } from '../entities/log_parent_pupil_action';
import { AdminUserHistoryOutput, LogParentPupilActionOutput, LogWatchedVideoStateInput } from '../model';
import { LogParentPupilActionService } from '../service/log_parent_pupil_action.service';

@Resolver(() => LogParentPupilAction)
export class LogParentPupilActionResolver {
    constructor(private logParentPupilActionService: LogParentPupilActionService) {}

    @AuthorizeEndpoint([LogParentPupilAction, OpType.Write, null, { parentId: 'input.parentId' }])
    @Mutation(() => LogParentPupilAction)
    async logWatchedVideoState(
        @Args({ name: 'input', type: () => LogWatchedVideoStateInput }) input: LogWatchedVideoStateInput,
        @AuthInfo('sub') userId: string
    ): Promise<LogParentPupilAction> {
        return await this.logParentPupilActionService.addLogParentPupilAction(
            {
                ...input,
                actionId: input.videoDone ? 8 : 7,
                userId,
                parentId: input.parentId
            },
            userId
        );
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => AdminUserHistoryOutput)
    async getLogParentPupilActionHistory(
        @Args({ name: 'userId' }) userId: string,
        @Args({ name: 'limit', nullable: true }) limit: number,
        @Args({ name: 'offset', nullable: true }) offset: number
    ): Promise<Pagination<LogParentPupilActionOutput>> {
        return await this.logParentPupilActionService.getLogParentPupilActionHistory(userId, limit, offset);
    }
}
