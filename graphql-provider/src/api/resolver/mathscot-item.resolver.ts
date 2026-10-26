import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { OpType } from 'src/auth/types/OpType';

import { StaticLwpMathscotItem } from '../entities/mathscot_item';
import { LwpPupil } from '../entities/pupil';
import { MergeMathscotItems, MergeMathscotItemsInput, MergeMathscotItemsLogInput } from '../model';
import { MathscotItemService } from '../service/mathscot-item.service';

@Resolver(() => StaticLwpMathscotItem)
export class MathscotItemResolver {
    constructor(private mathscotItemService: MathscotItemService) {}

    @AuthorizeEndpoint([StaticLwpMathscotItem, OpType.Read, null])
    @Query(() => [StaticLwpMathscotItem])
    async allMathscotItem(): Promise<StaticLwpMathscotItem[]> {
        return this.mathscotItemService.allMathscotItem();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [String])
    async allMathscotThemes(): Promise<string[]> {
        return this.mathscotItemService.allMathscotThemes();
    }

    @AuthorizeEndpoint([StaticLwpMathscotItem, OpType.Read, null])
    @Query(() => StaticLwpMathscotItem)
    async getMathscotItem(@Args({ name: 'itemName', type: () => String }) itemName: string): Promise<StaticLwpMathscotItem> {
        return this.mathscotItemService.getMathscotItem(itemName);
    }

    // any logged-in user can access
    @AuthorizeEndpoint()
    @Query(() => [StaticLwpMathscotItem])
    async getTshirts(): Promise<StaticLwpMathscotItem[]> {
        return this.mathscotItemService.getTshirts();
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Write, 'input.pupilId'])
    @Mutation(() => MergeMathscotItems)
    async mergeMathscotItems(
        @Args({ name: 'input', type: () => MergeMathscotItemsInput }) input: MergeMathscotItemsInput,
        @Args({ name: 'logInput', type: () => MergeMathscotItemsLogInput }) logInput: MergeMathscotItemsLogInput,
        @Args({ name: 'periodIndex', type: () => Number, nullable: true }) periodIndex: number,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<MergeMathscotItems> {
        return await this.mathscotItemService.getMathscotUrlsByInput(input, authInfo.sub, authInfo.userType, logInput, periodIndex);
    }
}
