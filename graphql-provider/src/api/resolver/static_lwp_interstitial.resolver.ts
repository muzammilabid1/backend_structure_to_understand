import { Args, Mutation, Parent as PParent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { OpType } from 'src/auth/types/OpType';

import { StaticLwpInterstitial } from '../entities/static_lwp_interstitial';
import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { LwpUser } from '../entities/user';
import { AddInterstitialInput, OperationStatus, SubmitInterstitialInput, TypeFormContext, UpdateInterstitialInput } from '../model';
import { StaticLwpInterstitialService } from '../service/static_lwp_interstitial.service';
@Resolver(() => StaticLwpInterstitial)
export class StaticLwpInterstitialResolver {
    constructor(private staticLwpInterstitialService: StaticLwpInterstitialService) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => StaticLwpInterstitial)
    async getInterstitialForm(@Args({ name: 'id' }) id: string): Promise<StaticLwpInterstitial> {
        return await this.staticLwpInterstitialService.getInterstitialForm(id);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpInterstitial])
    async getAllInterstitialForm(): Promise<StaticLwpInterstitial[]> {
        return await this.staticLwpInterstitialService.getAllInterstitialForm();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpInterstitial)
    async addInterstitialForm(
        @Args({ name: 'input', type: () => AddInterstitialInput }) input: AddInterstitialInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpInterstitial> {
        return await this.staticLwpInterstitialService.addInterstitialForm(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpInterstitial)
    async updateInterstitialForm(
        @Args({ name: 'input', type: () => UpdateInterstitialInput }) input: UpdateInterstitialInput
    ): Promise<StaticLwpInterstitial> {
        return await this.staticLwpInterstitialService.updateInterstitialForm(input);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deleteInterstitialForm(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        return await this.staticLwpInterstitialService.deleteInterstitialForm(id, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async releaseInterstitialForm(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<boolean> {
        return await this.staticLwpInterstitialService.releaseInterstitialForm(id, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async resetInterstitialForm(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<boolean> {
        return await this.staticLwpInterstitialService.resetInterstitialForm(id, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async updateAllInterstitialFormsContext(): Promise<boolean> {
        return await this.staticLwpInterstitialService.updateAllInterstitialFormsContext();
    }

    @AuthorizeEndpoint([LwpUser, OpType.Write, 'input.userId'])
    @Mutation(() => Boolean)
    async submittedInterstitialForm(
        @Args({ name: 'input', type: () => SubmitInterstitialInput }) input: SubmitInterstitialInput
    ): Promise<boolean> {
        return await this.staticLwpInterstitialService.submittedInterstitialForm(input);
    }

    @ResolveField(() => TypeFormContext)
    async context(@PParent() staticLwpInterstitialForm: StaticLwpInterstitial): Promise<TypeFormContext> {
        return await this.staticLwpInterstitialService.getInterstitialFormContext(
            staticLwpInterstitialForm.context,
            staticLwpInterstitialForm.averageTime
        );
    }

    @ResolveField(() => [StaticLwpSchoolTag])
    async schoolTags(@PParent() staticLwpInterstitialForm: StaticLwpInterstitial): Promise<StaticLwpSchoolTag[]> {
        return await this.staticLwpInterstitialService.getInterstitialSchoolTags(staticLwpInterstitialForm?.id);
    }
}
