import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PupilParentStatus } from 'lwp-shared';
import { AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { UsersService } from 'src/auth/service/user.service';
import { OpType } from 'src/auth/types/OpType';

import { LogLwpEntityStatusChange } from '../entities/log_lwp_entity_status_change';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilParent } from '../entities/pupil_parent';
import { LwpUser } from '../entities/user';
import { LogLwpEntityStatusChangeService } from '../service/log_lwp_user_status_change.service';
import { MagicLinkService } from '../service/magic_link.service';
import { PupilService } from '../service/pupil.service';
import { PupilParentService } from '../service/pupil_parent.service';

@Resolver(() => LwpPupilParent)
export class PupilParentResolver {
    constructor(
        private pupilService: PupilService,
        private usersService: UsersService,
        private pupilParentService: PupilParentService,
        private logEntityStatusService: LogLwpEntityStatusChangeService,
        private magicLinkService: MagicLinkService
    ) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpPupilParent])
    async getPupilParents(@Args('pupilId') pupilId: string): Promise<LwpPupilParent[]> {
        return await this.pupilParentService.getPupilAllParents(pupilId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupilParent, OpType.Read, 'pupilParentIds'])
    @Mutation(() => Boolean)
    async sendPupilParentInvitationImmediate(@Args('pupilParentIds', { type: () => [String] }) pupilParentIds: string[]): Promise<boolean> {
        return await this.pupilParentService.sendPupilParentInvitationImmediate(pupilParentIds);
    }

    @AuthorizeEndpoint([LwpPupilParent, OpType.Read, 'pupilParentId'])
    @Query(() => LwpPupilParent)
    async getPupilParent(@Args('pupilParentId') pupilParentId: string): Promise<LwpPupilParent> {
        return await this.pupilParentService.getPupilParent(pupilParentId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpUser, OpType.Read, 'parentId'], [LwpPupil, OpType.Read, 'pupilId'])
    @Query(() => Date, { nullable: true })
    async getLastAccess(@Args('parentId') parentId: string, @Args('pupilId') pupilId: string): Promise<Date | null> {
        return await this.pupilParentService.getLastAccess(parentId, pupilId);
    }

    @ResolveField(() => LwpPupil)
    async pupil(@Parent() parent: LwpPupilParent): Promise<LwpPupil> {
        return await this.pupilService.getPupilById(parent.pupilId);
    }

    @ResolveField(() => LwpUser)
    async parent(@Parent() parent: LwpPupilParent): Promise<LwpUser> {
        return await this.usersService.findById(parent.parentId);
    }

    @ResolveField(() => Date)
    async lastAccess(@Parent() parent: LwpPupilParent): Promise<Date> {
        return await this.pupilParentService.getLastAccess(parent?.parentId, parent?.pupilId);
    }

    @ResolveField(() => LwpUser)
    async invitedBy(@Parent() parent: LwpPupilParent): Promise<LwpUser> {
        return await this.usersService.findById(parent.invitedById);
    }

    @ResolveField(() => Date)
    async logLastStatusChange(@Parent() parent: LwpPupilParent): Promise<Date> {
        return (await this.logEntityStatusService.getLastStatusChange(parent))?.logCreatedAt || null;
    }

    @ResolveField(() => [LogLwpEntityStatusChange])
    async logStatusChange(@Parent() parent: LwpPupilParent): Promise<LogLwpEntityStatusChange[]> {
        return await this.logEntityStatusService.getStatusChange(parent?.id, 'lwp_pupil_parent');
    }

    @ResolveField(() => String)
    async rejectMagicLink(@Parent() pp: LwpPupilParent): Promise<string | null> {
        if (pp.status !== PupilParentStatus.INVITED) return null;

        return await this.magicLinkService.getRejectMagicLinkForPupilParent(pp);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async adminRejectPupilParentInvite(@Args('pupilParentId') pupilParentId: string): Promise<boolean> {
        return await this.pupilParentService.rejectInviteConfirmation(pupilParentId);
    }
}
