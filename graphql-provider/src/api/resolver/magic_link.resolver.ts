import { ExecutionContext } from '@nestjs/common';
import { Args, Context, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizeEndpoint, Public } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { UsersService } from 'src/auth/service/user.service';

import { LwpBuildType } from '../dtos/LwpBuildType';
import { LwpMagicLink } from '../entities/magic_link';
import { LwpPupil } from '../entities/pupil';
import { LwpUser } from '../entities/user';
import { MagicLinkType, RejectMagicLinkOutput, ResetPasswordInput, UndoRejectConfirmationOutput } from '../model';
import { MagicLinkService } from '../service/magic_link.service';
@Resolver(() => LwpMagicLink)
export class MagicLinkResolver {
    constructor(
        private magicLinkService: MagicLinkService,
        private usersService: UsersService
    ) {}

    /*
     * Unauthenticated queries and mutations here are protected by the unique token that needs to be presented by the
     * user. The magic link service validates that tokens are not expired/used up.
     */

    @Public()
    @Query(() => LwpUser)
    async getUserFromMagicLink(@Args('token') token: string, @Context() context: ExecutionContext): Promise<LwpUser> {
        const user = await this.magicLinkService.getUserFromMagicLink(token);

        await this.impersonateUser(user, context);

        return user;
    }

    @Public()
    @Query(() => LwpMagicLink)
    async getMagicLink(@Args('token') token: string, @Context() context): Promise<LwpMagicLink> {
        const magicLink = await this.magicLinkService.getMagicLink(token);

        await this.magicLinkService.verifyMagicLink(token);

        await this.impersonateUser(magicLink.user, context);

        return magicLink;
    }

    @Public()
    @Query(() => RejectMagicLinkOutput)
    async getRejectMagicLink(@Args('token') token: string): Promise<RejectMagicLinkOutput> {
        const magicLink = await this.magicLinkService.getRejectMagicLink(token);

        return magicLink;
    }

    /**
     * getDefaultDemoTopicMagicLinkExpiry returns the expiry a demo topic link generated
     * right now would be given. The admin topic page offers this as the default when
     * generating a link, and as the earliest expiry that may be chosen.
     */
    @Query(() => Date)
    @AuthorizeEndpoint(AdminOnly)
    async getDefaultDemoTopicMagicLinkExpiry(): Promise<Date> {
        return await this.magicLinkService.getDefaultExpiryTime(MagicLinkType.DEMOTOPIC);
    }

    @Mutation(() => LwpMagicLink)
    @AuthorizeEndpoint(AdminOnly)
    async generateDemoTopicMagicLink(
        @Args('topicId') topicId: string,
        @Args('expiryTime', { nullable: true }) expiryTime?: Date
    ): Promise<LwpMagicLink> {
        return await this.magicLinkService.generateMagicLink({
            type: MagicLinkType.DEMOTOPIC,
            topicId,
            expiryTime,
            pupilId: null,
            pupilTopicId: null,
            schoolId: null,
            reportType: null,
            termId: null,
            trophyId: null,
            userId: null
        });
    }

    @Public()
    @Mutation(() => LwpMagicLink)
    async reGenerateMagicLink(@Args('token') token: string): Promise<LwpMagicLink> {
        return this.magicLinkService.reGenerateMagicLink(token);
    }

    @Public()
    @Mutation(() => LwpUser)
    async resetPasswordByToken(@Args({ name: 'input', type: () => ResetPasswordInput }) input: ResetPasswordInput): Promise<LwpUser> {
        return this.usersService.resetPasswordByToken(input);
    }

    @Query(() => String, { nullable: true })
    @AuthorizeEndpoint(AdminOnly)
    async expireMagicLinkByToken(@Args({ name: 'token', type: () => String }) token: string): Promise<string> {
        if (process.env.LWP_ENV === LwpBuildType.LOCAL || process.env.LWP_ENV === LwpBuildType.DEV) {
            return await this.magicLinkService.expireMagicLinkByToken(token);
        }

        return null;
    }

    @Mutation(() => Boolean)
    @Public()
    async rejectInviteConfirmation(@Args({ name: 'token', type: () => String }) token: string): Promise<boolean> {
        return this.magicLinkService.rejectInviteConfirmation(token);
    }

    @Mutation(() => UndoRejectConfirmationOutput)
    @Public()
    async undoRejectInviteConfirmation(@Args({ name: 'token', type: () => String }) token: string): Promise<UndoRejectConfirmationOutput> {
        return this.magicLinkService.undoRejectInviteConfirmation(token);
    }

    @ResolveField()
    async pupil(@Parent() magicLink: LwpMagicLink): Promise<LwpPupil> {
        return this.magicLinkService.getPupilOfMagicLink(magicLink?.pupilId);
    }

    /**
     * Write the user's auth token for the context of _this request only_.
     * n.b. generally speaking, THIS IS AN UNSAFE OPERATION.
     * we are ONLY doing this here because we know that the user has authenticated via a magic link.
     * DO NOT COPY THIS CODE ELSEWHERE.
     *
     * @private
     * @param {LwpUser} user
     * @param {ExecutionContext} context
     * @memberof MagicLinkResolver
     */
    private async impersonateUser(user: LwpUser, context: ExecutionContext): Promise<void> {
        if (user) {
            context['auth'] = {
                sub: user.id,
                exp: Date.now(),
                ...(await this.usersService.getAuthTokenForUser(user))
            };
        }
    }
}
