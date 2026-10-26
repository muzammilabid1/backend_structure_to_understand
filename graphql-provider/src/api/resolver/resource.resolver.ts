import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { OpType } from 'src/auth/types/OpType';

import { StaticLwpResource } from '../entities/resource';
import { OperationStatus, ResourceInput, UpdateResourceInput } from '../model';
import { ResourceService } from '../service/resource.service';
@Resolver(() => StaticLwpResource)
export class ResourceResolver {
    constructor(private resourceService: ResourceService) {}

    @AuthorizeEndpoint([StaticLwpResource, OpType.Read, null])
    @Query(() => [StaticLwpResource])
    async allResources(): Promise<StaticLwpResource[]> {
        return await this.resourceService.allResources();
    }

    @AuthorizeEndpoint([StaticLwpResource, OpType.Write, null])
    @Mutation(() => StaticLwpResource)
    async addResource(
        @Args({ name: 'input', type: () => ResourceInput }) input: ResourceInput,
        @Args({ name: 'file', type: () => [GraphQLUpload] }) file: FileUpload[],
        @Context() context
    ): Promise<StaticLwpResource> {
        return await this.resourceService.addResource(input, file, context);
    }

    @AuthorizeEndpoint([StaticLwpResource, OpType.Write, 'input.id'])
    @Mutation(() => StaticLwpResource)
    async updateResource(
        @Args({ name: 'input', type: () => UpdateResourceInput }) input: UpdateResourceInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[],
        @Context() context
    ): Promise<StaticLwpResource> {
        return await this.resourceService.updateResource(input, file, context);
    }

    @AuthorizeEndpoint([StaticLwpResource, OpType.Write, 'input.id'])
    @Mutation(() => OperationStatus)
    async deleteResource(@Args('id') id: string): Promise<OperationStatus> {
        return await this.resourceService.deleteResource(id);
    }
}
