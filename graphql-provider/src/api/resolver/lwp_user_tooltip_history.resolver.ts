import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { OpType } from 'src/auth/types/OpType';

import { LwpUserTooltipHistory } from '../entities/lwp_user_tooltip_history';
import { LwpUserTooltipHistoryService } from '../service/lwp_user_tooltip_history.service';

@Resolver(() => LwpUserTooltipHistory)
export class LwpUserTooltipHistoryResolver {
    constructor(private lwpUserTooltipHistoryService: LwpUserTooltipHistoryService) {}

    @AuthorizeEndpoint([LwpUserTooltipHistory, OpType.Write, null])
    @Mutation(() => Boolean)
    async logTooltipAction(@Args('tooltipId') tooltipId: string, @AuthInfo('sub') userId: string): Promise<boolean> {
        await this.lwpUserTooltipHistoryService.addUserTooltipHistory(tooltipId, userId);

        return true;
    }
}
