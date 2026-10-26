import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';

import { StaticLwpFiles } from '../entities/static_lwp_files';
import { OperationStatus } from '../model';
import { StaticLwpFileService } from '../service/static_lwp_files.service';

@Resolver(() => StaticLwpFiles)
export class StaticLwpFileResolver {
    constructor(private staticLwpFilesService: StaticLwpFileService) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpFiles])
    public async getAllFiles(): Promise<StaticLwpFiles[]> {
        return await this.staticLwpFilesService.getAllFiles();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => StaticLwpFiles)
    public async getAFile(@Args({ name: 'id' }) id: string): Promise<StaticLwpFiles> {
        return await this.staticLwpFilesService.getAFile(id);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => String)
    public async addAFile(
        @Args({ name: 'download' }) download: boolean,
        @Args({ name: 'file', type: () => [GraphQLUpload] }) file: FileUpload[],
        @Context() context
    ): Promise<string> {
        return await this.staticLwpFilesService.addAFile(download, file, context);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deleteAFile(@Args('id') id: string): Promise<OperationStatus> {
        return this.staticLwpFilesService.deleteAFile(id);
    }
}
