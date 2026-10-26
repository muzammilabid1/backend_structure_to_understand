import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint, Public } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { OpType } from 'src/auth/types/OpType';

import { StaticLwpFAQ } from '../entities/faq';
import { FAQInput, OperationStatus, UpdateFAQInput } from '../model';
import { FAQService } from '../service/faq.service';
@Resolver(() => StaticLwpFAQ)
export class FAQResolver {
    constructor(private faqService: FAQService) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpFAQ])
    async allFAQs(): Promise<StaticLwpFAQ[]> {
        return await this.faqService.allFAQs();
    }

    @AuthorizeEndpoint([StaticLwpFAQ, OpType.Read, null]) // n.b. this doesn't separately enforce teachers
    @Query(() => [StaticLwpFAQ])
    async getTeacherFAQs(@Args('forSchoolLeader', { nullable: true }) forSchoolLeader: boolean): Promise<StaticLwpFAQ[]> {
        return await this.faqService.getTeacherFAQs(forSchoolLeader);
    }

    @AuthorizeEndpoint([StaticLwpFAQ, OpType.Read, null])
    @Query(() => [StaticLwpFAQ])
    async getParentFAQs(): Promise<StaticLwpFAQ[]> {
        return await this.faqService.getParentFAQs();
    }

    @Query(() => [StaticLwpFAQ])
    @Public()
    async getBeforeLoginFAQs(): Promise<StaticLwpFAQ[]> {
        return await this.faqService.getBeforeLoginFAQs();
    }

    @AuthorizeEndpoint([StaticLwpFAQ, OpType.Write, null])
    @Mutation(() => StaticLwpFAQ)
    async addFAQ(@Args({ name: 'input', type: () => FAQInput }) input: FAQInput, @AuthInfo('sub') userId: string): Promise<StaticLwpFAQ> {
        return await this.faqService.addFAQ(input, userId);
    }

    @AuthorizeEndpoint([StaticLwpFAQ, OpType.Write, 'input.id'])
    @Mutation(() => StaticLwpFAQ)
    async updateFAQ(
        @Args({ name: 'input', type: () => UpdateFAQInput }) input: UpdateFAQInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpFAQ> {
        return await this.faqService.updateFAQ(input, userId);
    }

    @AuthorizeEndpoint([StaticLwpFAQ, OpType.Write, 'id'])
    @Mutation(() => OperationStatus)
    async deleteFAQ(@Args('id') id: string): Promise<OperationStatus> {
        return await this.faqService.deleteFAQ(id);
    }
}
