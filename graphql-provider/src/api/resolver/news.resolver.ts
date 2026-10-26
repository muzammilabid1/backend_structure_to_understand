import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';

import { StaticLwpNews } from '../entities/news';
import { NewsInput, OperationStatus, UpdateNewsInput } from '../model';
import { NewsService } from '../service/news.service';

@Resolver(() => StaticLwpNews)
export class NewsResolver {
    constructor(private newsService: NewsService) {}

    @AuthorizeEndpoint([StaticLwpNews, OpType.Read, null])
    @Query(() => [StaticLwpNews])
    async allNews(@Args('userId', { nullable: true }) userId: string, @AuthInfo() authInfo: AuthTokenJWT): Promise<StaticLwpNews[]> {
        return await this.newsService.allNews(authInfo.userType === UserType.ADMIN && userId ? userId : authInfo.sub);
    }

    @AuthorizeEndpoint([StaticLwpNews, OpType.Write, null])
    @Mutation(() => StaticLwpNews)
    async addNews(
        @Args({ name: 'input', type: () => NewsInput }) input: NewsInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpNews> {
        return await this.newsService.addNews(input, userId);
    }

    @AuthorizeEndpoint([StaticLwpNews, OpType.Write, 'input.id'])
    @Mutation(() => StaticLwpNews)
    async updateNews(
        @Args({ name: 'input', type: () => UpdateNewsInput }) input: UpdateNewsInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpNews> {
        return await this.newsService.updateNews(input, userId);
    }

    @AuthorizeEndpoint([StaticLwpNews, OpType.Write, 'id'])
    @Mutation(() => OperationStatus)
    async deleteNews(@Args('id') id: string): Promise<OperationStatus> {
        return await this.newsService.deleteNews(id);
    }
}
