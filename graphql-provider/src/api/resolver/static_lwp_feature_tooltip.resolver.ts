import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { UserType } from 'lwp-shared';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { OpType } from 'src/auth/types/OpType';
import { appConstants } from 'src/constants';

import { CreateStaticLwpFeatureTooltipInput } from '../dtos/CreateStaticLwpFeatureTooltipInput';
import { UpdateStaticLwpFeatureTooltipInput } from '../dtos/UpdateStaticLwpFeatureTooltipInput';
import { StaticLwpFeatureTooltip } from '../entities/static_lwp_feature_tooltip';
import { OperationStatus } from '../model';
import { HelperService } from '../service/helper.service';
import { StaticLwpFeatureTooltipService } from '../service/static_lwp_feature_tooltip.service';

@Resolver(() => StaticLwpFeatureTooltip)
export class StaticLwpFeatureTooltipResolver {
    constructor(
        private readonly tooltipService: StaticLwpFeatureTooltipService,
        private readonly helperService: HelperService
    ) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpFeatureTooltip])
    async allFeatureTooltips(): Promise<StaticLwpFeatureTooltip[]> {
        return await this.tooltipService.allFeatureTooltips();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => StaticLwpFeatureTooltip)
    async getFeatureTooltip(@Args('id') id: string): Promise<StaticLwpFeatureTooltip> {
        return await this.tooltipService.getFeatureTooltip(id);
    }

    @AuthorizeEndpoint([StaticLwpFeatureTooltip, OpType.Read, null])
    @Query(() => [StaticLwpFeatureTooltip])
    async getUnseenFeatureTooltips(
        @AuthInfo('sub') userId: string,
        @AuthInfo('userType') userType: UserType
    ): Promise<StaticLwpFeatureTooltip[]> {
        return await this.tooltipService.getUnseenFeatureTooltips(userId, userType);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpFeatureTooltip)
    async createFeatureTooltip(
        @Args('input') input: CreateStaticLwpFeatureTooltipInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[],
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpFeatureTooltip> {
        return await this.tooltipService.createFeatureTooltip(input, file, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpFeatureTooltip)
    async updateFeatureTooltip(
        @Args('input') input: UpdateStaticLwpFeatureTooltipInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[],
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpFeatureTooltip> {
        return await this.tooltipService.updateFeatureTooltip(input, file, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async softDeleteFeatureTooltip(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        return await this.tooltipService.softDeleteFeatureTooltip(id, userId);
    }

    @ResolveField(() => String, { nullable: true })
    imageUrl(@Parent() tooltip: StaticLwpFeatureTooltip): string {
        return tooltip.imageUrl
            ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.featureTooltipIcon}/${tooltip?.imageUrl}`)
            : null;
    }
}
