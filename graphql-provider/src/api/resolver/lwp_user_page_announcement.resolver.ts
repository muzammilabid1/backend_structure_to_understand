import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { OpType } from 'src/auth/types/OpType';

import { LwpUserPageAnnouncement } from '../entities/lwp_user_page_announcement';
import { HelperService } from '../service/helper.service';
import { LwpUserPageAnnouncementService } from '../service/lwp_user_page_announcement.service';

@Resolver(() => LwpUserPageAnnouncement)
export class LwpUserPageAnnouncementResolver {
    constructor(
        private pageAnnouncementService: LwpUserPageAnnouncementService,
        private helperService: HelperService
    ) {}

    /**
     * @param id The id of the static lwp page announcement
     * @param userId The id of the user
     */
    @AuthorizeEndpoint([LwpUserPageAnnouncement, OpType.Write, null, { parentId: 'seenById' }])
    @Mutation(() => Boolean)
    async seenPageAnnouncement(@Args('id') id: string, @Args('seenById') seenById: string): Promise<boolean> {
        return await this.pageAnnouncementService.seenPageAnnouncement(id, seenById);
    }
}
