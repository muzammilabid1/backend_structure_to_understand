import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { AuthInfo, AuthorizeEndpoint, Public } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { OpType } from 'src/auth/types/OpType';

import { StaticLwpActivityLegacy } from '../dtos/StaticLwpActivityLegacy';
import { StaticLwpActivitySteps } from '../entities/activity';
import { StaticLwpModal } from '../entities/modal';
import { AddModalStepsInput, ModalInput, OperationStatus, UpdateActivityStepInput, UpdateModalInput, UpdateOpenCountInput } from '../model';
import { ModalService } from '../service/modal.service';

@Resolver(() => StaticLwpModal)
export class ModalResolver {
    constructor(private modalService: ModalService) {}

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpModal)
    async addModal(
        @Args({ name: 'input', type: () => ModalInput }) input: ModalInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[],
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpModal> {
        return await this.modalService.addModal(input, file, userId);
    }

    @Public()
    @Query(() => StaticLwpModal)
    async getModal(@Args('id') id: string): Promise<StaticLwpModal> {
        return await this.modalService.getModal(id);
    }

    // getModal is public, so the admin-only nameForContentDev always comes back null from it. The admin edit page reads it here.
    @AuthorizeEndpoint(AdminOnly)
    @Query(() => StaticLwpModal)
    async getModalForAdmin(@Args('id') id: string): Promise<StaticLwpModal> {
        return await this.modalService.getModal(id);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpModal])
    async getModals(): Promise<StaticLwpModal[]> {
        return await this.modalService.getModals();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deleteModal(@Args('id') id: string): Promise<OperationStatus> {
        return await this.modalService.deleteModal(id);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpModal)
    async updateModal(
        @Args({ name: 'input', type: () => UpdateModalInput }) input: UpdateModalInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[]
    ): Promise<StaticLwpModal> {
        return await this.modalService.updateModal(input, file);
    }

    @AuthorizeEndpoint([StaticLwpModal, OpType.Read, null])
    @Mutation(() => Boolean)
    async updateOpenCount(@Args({ name: 'input', type: () => UpdateOpenCountInput }) input: UpdateOpenCountInput): Promise<boolean> {
        return await this.modalService.updateOpenCount(input);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpModal)
    async duplicateModal(
        @Args('modalId') modalId: string,
        @Args({ name: 'nameForContentDev', nullable: true }) nameForContentDev: string,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpModal> {
        return await this.modalService.duplicateModal(modalId, userId, nameForContentDev);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpModal)
    async addModalSteps(@Args({ name: 'input', type: () => AddModalStepsInput }) input: AddModalStepsInput): Promise<StaticLwpModal> {
        return await this.modalService.addModalSteps(input);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpActivitySteps)
    async updateLegacyModalStep(
        @Args({ name: 'input', type: () => UpdateActivityStepInput }) input: UpdateActivityStepInput
    ): Promise<StaticLwpActivitySteps> {
        return await this.modalService.updateLegacyActivityStep(input);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deleteModalStep(@Args('id') id: string): Promise<OperationStatus> {
        return await this.modalService.deleteModalStep(id);
    }

    @ResolveField(() => StaticLwpActivityLegacy)
    async steps(@Parent() modal: StaticLwpModal): Promise<StaticLwpActivityLegacy> {
        return await this.modalService.steps(modal);
    }
}
