import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthInfo, AuthorizeEndpoint, Public } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { OpType } from 'src/auth/types/OpType';
import { UserTrustLevel } from 'src/auth/types/UserTrustLevel';
import { UserType } from 'src/auth/types/UserType';
import { Connection, EntityManager, Repository } from 'typeorm';

import { LogLwpEntityStatusChange } from '../entities/log_lwp_entity_status_change';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilParent } from '../entities/pupil_parent';
import { LwpSchoolClass } from '../entities/school_class';
import { LwpUser } from '../entities/user';
import {
    ConfirmParentDetailsInput,
    InviteParentForPupilInput,
    InviteParentsWithPupil,
    OperationStatus,
    TransferPupilParentInput,
    UpdateNonActiveParentInput,
    UpdateParentInput
} from '../model';
import { LogLwpEntityStatusChangeService } from '../service/log_lwp_user_status_change.service';
import { ParentService } from '../service/parent.service';
import { PupilService } from './../service/pupil.service';

@Resolver(() => LwpUser)
export class ParentResolver {
    constructor(
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        private pupilService: PupilService,
        private parentService: ParentService,
        private logUserStatusService: LogLwpEntityStatusChangeService,
        private connection: Connection
    ) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpUser])
    async allParent(): Promise<LwpUser[]> {
        return await this.userRepository.find({ where: { type: UserType.PARENT } });
    }

    @AuthorizeEndpoint([LwpUser, OpType.Read, 'id'])
    @Query(() => LwpUser)
    async parent(@Args('id') id: string): Promise<LwpUser> {
        return await this.userRepository.findOne({ where: { id } });
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Write, 'input.pupilId', { requiredTrust: UserTrustLevel.Full }])
    @Mutation(() => LwpUser)
    async inviteParentForPupil(
        @Args({ name: 'input', type: () => InviteParentForPupilInput }) input: InviteParentForPupilInput,
        @AuthInfo('sub') userId: string
    ): Promise<LwpUser> {
        return this.pupilService.inviteParentForPupil(input, userId);
    }

    @AuthorizeEndpoint([LwpUser, OpType.Write, 'parentId'])
    @Mutation(() => LwpUser)
    async reInviteParent(@Args({ name: 'parentId', type: () => String }) parentId: string): Promise<LwpUser> {
        return this.parentService.reInviteParent(parentId);
    }

    @Public()
    @Mutation(() => Boolean)
    async reInviteParentWithEmailOrPhone(
        @Args({ name: 'username' }) username: string,
        @Args({ name: 'preference' }) preference: string
    ): Promise<boolean> {
        return this.parentService.reInviteParentWithEmailOrPhone(username, preference);
    }

    @AuthorizeEndpoint() // this is the rare case where we don't need to check any authorization - any user can execute this safely
    @Query(() => Boolean)
    async haveMoreChildren(@AuthInfo('sub') userId: string): Promise<boolean> {
        return await this.parentService.haveMoreChildren(userId);
    }

    @AuthorizeEndpoint([LwpSchoolClass, OpType.Write, 'input.classId'])
    @Mutation(() => Boolean)
    async inviteParentsWithPupil(
        @Args({ name: 'input', type: () => InviteParentsWithPupil }) input: InviteParentsWithPupil,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        await this.connection.manager.transaction(async (manager: EntityManager) => {
            await this.pupilService.inviteParentsWithPupil(input, userId, manager);
        });

        return true;
    }

    @AuthorizeEndpoint([LwpUser, OpType.Write, 'input.id', { requiredTrust: UserTrustLevel.Full }])
    @Mutation(() => LwpUser)
    async updateParent(
        @Args({ name: 'input', type: () => UpdateParentInput }) input: UpdateParentInput,
        @AuthInfo('sub') userId: string
    ): Promise<LwpUser> {
        return await this.parentService.updateParent(input, userId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpUser, OpType.Write, 'input.id', { requiredTrust: UserTrustLevel.Full }])
    @Mutation(() => Boolean)
    async updateNonActiveParent(
        @Args({ name: 'input', type: () => UpdateNonActiveParentInput }) input: UpdateNonActiveParentInput,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        await this.parentService.updateNonActiveParent(input, userId);

        return true;
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupilParent, OpType.Read, 'input.pupilParentId', { requiredTrust: UserTrustLevel.Full }])
    @Mutation(() => Boolean)
    async transferPupilToNewParent(
        @Args({ name: 'input', type: () => TransferPupilParentInput }) input: TransferPupilParentInput,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        await this.pupilService.transferPupilToNewParent(input, userId);

        return true;
    }

    @AuthorizeEndpoint([LwpUser, OpType.Write, 'id', { requiredTrust: UserTrustLevel.Full }])
    @Mutation(() => OperationStatus)
    async deleteParent(@Args('id') id: string): Promise<OperationStatus> {
        const res = await this.userRepository.delete(id);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    @AuthorizeEndpoint([LwpUser, OpType.Write, 'id', { requiredTrust: UserTrustLevel.Full }])
    @Mutation(() => LwpUser)
    async savePhotoPermissions(
        @Args('id') id: string,
        @Args('sharingAllowed', { nullable: true }) sharingAllowed: boolean | null
    ): Promise<LwpUser> {
        const parent = await this.userRepository.findOne({ where: { id } });

        parent.sharingAllowed = sharingAllowed;

        return await this.userRepository.save(parent);
    }

    @AuthorizeEndpoint([LwpUser, OpType.Read, 'id', { requiredTrust: UserTrustLevel.Full }])
    @Query(() => LwpPupil, { nullable: true })
    async getLastPupilInvitation(@Args('id') id: string): Promise<LwpPupil> {
        return await this.pupilService.getLastPupilInvitation(id);
    }

    @AuthorizeEndpoint([LwpUser, OpType.Read, 'id', { requiredTrust: UserTrustLevel.Limited }])
    @Query(() => [LwpPupilParent], { nullable: true })
    async getPupilInvitations(@Args('id') id: string): Promise<LwpPupilParent[]> {
        return await this.pupilService.getPupilInvitations(id);
    }

    @AuthorizeEndpoint([LwpUser, OpType.Read, 'parentId'])
    @Query(() => LwpPupilParent)
    async getPupilInvitation(@Args('parentId') parentId: string, @Args('pupilId') pupilId: string): Promise<LwpPupilParent> {
        return await this.pupilService.getPupilInvitation(parentId, pupilId);
    }

    @AuthorizeEndpoint([LwpUser, OpType.Write, 'parentId'])
    @Mutation(() => Boolean)
    async parentWatchedIntroVideo(@Args('parentId') parentId: string): Promise<boolean> {
        return await this.pupilService.parentWatchedIntroVideo(parentId);
    }

    @AuthorizeEndpoint([LwpUser, OpType.Write, 'parentId'])
    @Mutation(() => LwpPupil)
    async acceptPupilInvitation(
        @Args('parentId') parentId: string,
        @Args('pupilId') pupilId: string,
        @Args('isTopicsSectionShown') isTopicsSectionShown: boolean,
        @Args('isReadingSectionShown') isReadingSectionShown: boolean,
        @AuthInfo('sub') userId: string
    ): Promise<LwpPupil> {
        return await this.pupilService.acceptPupilInvitation(parentId, pupilId, isTopicsSectionShown, isReadingSectionShown, userId);
    }

    @AuthorizeEndpoint([LwpUser, OpType.Write, 'parentId'])
    @Mutation(() => LwpUser)
    async rejectPupilInvitation(
        @Args('parentId') parentId: string,
        @Args('pupilId') pupilId: string,
        @Args('isTopicsSectionShown') isTopicsSectionShown: boolean,
        @Args('isReadingSectionShown') isReadingSectionShown: boolean,
        @AuthInfo('sub') userId: string
    ): Promise<LwpUser> {
        return await this.pupilService.rejectPupilInvitation(parentId, pupilId, isTopicsSectionShown, isReadingSectionShown, userId);
    }

    // What even is the difference between this method and the two above?!
    @AuthorizeEndpoint([LwpUser, OpType.Write, 'parentId', { requiredTrust: UserTrustLevel.Full }])
    @Mutation(() => LwpPupil)
    async acceptOrRejectPupilInvitation(
        @Args('parentId') parentId: string,
        @Args('pupilId') pupilId: string,
        @Args('rejected') rejected: boolean
    ): Promise<LwpPupil> {
        return await this.pupilService.acceptOrRejectPupilInvitation(pupilId, parentId, rejected);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupilParent, OpType.Write, 'input'])
    @Mutation(() => Boolean)
    async confirmAllParentDetails(
        @Args('input', { type: () => [String] }) input: string[],
        @Args('schoolId') _schoolId: string,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        return await this.pupilService.confirmAllParentDetails(input, userId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupilParent, OpType.Write, 'input.pupilParentId'])
    @Mutation(() => Boolean)
    async confirmParentDetails(
        @Args('input') input: ConfirmParentDetailsInput,
        @Args('schoolId') _schoolId: string,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        return await this.pupilService.confirmParentDetails(input, userId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupil, OpType.Write, 'input.pupilId'])
    @Mutation(() => LwpUser)
    async inviteParentOfPupil(
        @Args('parentId') parentId: string,
        @Args('pupilId') pupilId: string,
        @Args('sendOnPhone') sendOnPhone: boolean,
        @AuthInfo('sub') userId: string
    ): Promise<LwpUser> {
        return await this.pupilService.inviteParentOfPupil(parentId, pupilId, sendOnPhone, userId);
    }

    @ResolveField(() => [LwpPupilParent])
    async pupils(@Parent() parent: LwpUser): Promise<LwpPupilParent[]> {
        return await this.pupilService.getParentPupils(parent.id);
    }

    @ResolveField(() => Number)
    async numSchoolsWithPupils(@Parent() parent: LwpUser): Promise<number> {
        return await this.pupilService.numSchoolsWithPupils(parent.id);
    }

    @ResolveField(() => Date)
    async logLastStatusChange(@Parent() parent: LwpUser): Promise<Date> {
        return (await this.logUserStatusService.getLastStatusChange(parent)).logCreatedAt;
    }

    @ResolveField(() => String)
    async logPreviousStatus(@Parent() parent: LwpUser): Promise<string> {
        return (await this.logUserStatusService.getLastStatusChange(parent)).previousStatus;
    }

    @ResolveField(() => [LogLwpEntityStatusChange])
    async logStatusChange(@Parent() parent: LwpUser): Promise<LogLwpEntityStatusChange[]> {
        return await this.logUserStatusService.getStatusChange(parent?.id, 'lwp_user');
    }
}
