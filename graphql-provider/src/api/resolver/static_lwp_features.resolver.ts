import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';

import { StaticLwpFeatures } from '../entities/static_lwp_features';
import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { UpdateFeatureInput } from '../model';
import { StaticLwpFeaturesService } from '../service/static_lwp_features.service';

@Resolver(() => StaticLwpFeatures)
export class StaticLwpFeaturesResolver {
    constructor(private featuresService: StaticLwpFeaturesService) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpFeatures])
    async allFeatures(): Promise<StaticLwpFeatures[]> {
        return await this.featuresService.allFeatures();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpSchoolTag])
    async getFeatureSchoolTags(@Args('featureId') featureId: string): Promise<StaticLwpSchoolTag[]> {
        return await this.featuresService.getFeatureSchoolTags(featureId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async updateFeature(
        @Args({ name: 'input', type: () => UpdateFeatureInput }) input: UpdateFeatureInput,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        await this.featuresService.updateFeature(input, userId);

        return true;
    }

    @ResolveField(() => [StaticLwpSchoolTag], { nullable: true })
    async schoolTags(@Parent() feature: StaticLwpFeatures): Promise<StaticLwpSchoolTag[]> {
        return await this.featuresService.getFeatureSchoolTags(feature.id);
    }
}
