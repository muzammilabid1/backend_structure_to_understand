import { ForbiddenException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import newrelic from 'newrelic/index';
import { LwpUser } from 'src/api/entities/user';
import { AcceptUserInvitationInput, MagicLinkOutput, UserAssociatedLoginType } from 'src/api/model';
import { HelperService } from 'src/api/service/helper.service';
import { GqlThrottlerGuard } from 'src/auth/guards/gql-throttler.guard';

import { AuthInfo, AuthorizeEndpoint, Public } from './auth.object.decorators';
import { AuthenticationService } from './service/authentication.service';
import { UsersService } from './service/user.service';
import { AuthMethod } from './types/AuthMethod';
import { JwtPayloadWithRequiredProps } from './types/LwpJwt';
import { PreLoginResponse } from './types/PreLoginResponse';
import { RefreshToken } from './types/RefreshToken';
import { SessionLength } from './types/SessionLength';
import { TokenPair } from './types/TokenPair';
import { UserTrustLevel } from './types/UserTrustLevel';

@Resolver(() => LwpUser)
export class AuthResolver {
    constructor(
        private authService: AuthenticationService,
        private usersService: UsersService,
        private helperService: HelperService
    ) {}

    @Public()
    @Query(() => PreLoginResponse)
    @UseGuards(GqlThrottlerGuard)
    async preLogin(@Args({ name: 'emailOrPhone', type: () => String }) emailOrPhone: string): Promise<PreLoginResponse> {
        return await this.authService.preLogin(emailOrPhone);
    }

    @Public()
    @Mutation(() => TokenPair)
    @UseGuards(GqlThrottlerGuard)
    async login(
        @Args({ name: 'emailOrPhone', type: () => String }) emailOrPhone: string,
        @Args({ name: 'authToken', type: () => String }) authToken: string,
        @Args({ name: 'provider', type: () => AuthMethod }) provider: AuthMethod,
        @Args({ name: 'remember', type: () => Boolean, nullable: true }) remember: boolean,
        @Context() context
    ): Promise<TokenPair> {
        if (provider === AuthMethod.MagicLink) throw new GraphQLError('Wrong endpoint for magic links');

        return await this.authService.login(
            emailOrPhone,
            authToken,
            provider,
            remember,
            this.helperService.extractUserAgentFromContext(context),
            context?.req?.ip ?? 'unknown'
        );
    }

    @Public()
    @Mutation(() => TokenPair)
    async refreshSession(@Args({ name: 'refreshToken', type: () => String }) refreshToken: string): Promise<TokenPair> {
        return await this.withRefreshToken(refreshToken, async (tokenObj) => {
            return await this.authService.refreshSession(tokenObj.sub, tokenObj.jti);
        });
    }

    @Public()
    @Mutation(() => TokenPair)
    async upgradeSession(@Args({ name: 'refreshToken', type: () => String }) refreshToken: string): Promise<TokenPair> {
        return await this.withRefreshToken(refreshToken, async (tokenObj) => {
            return await this.authService.upgradeSession(tokenObj.sub, tokenObj.jti);
        });
    }

    @Public()
    @Mutation(() => MagicLinkOutput)
    @UseGuards(GqlThrottlerGuard)
    async redeemMagicLink(
        @Args({ name: 'token', type: () => String }) token: string,
        @Args({ name: 'isPwa', type: () => Boolean, nullable: true }) isPwa: boolean = false,
        @Context() context
    ): Promise<MagicLinkOutput> {
        return await this.authService.redeemMagicLink(
            token,
            this.helperService.extractUserAgentFromContext(context),
            context?.req?.ip ?? 'unknown',
            isPwa
        );
    }

    @Public()
    @Mutation(() => TokenPair)
    @UseGuards(GqlThrottlerGuard)
    async acceptUserInvitation(
        @Args({ name: 'input', type: () => AcceptUserInvitationInput }) input: AcceptUserInvitationInput,
        @Context() context
    ): Promise<TokenPair> {
        // acceptUserInvitation validates that the magic link used is valid and of INVITATION type
        const user = await this.usersService.acceptUserInvitation(input);

        // The session records the credential the user just set up rather than the invitation link, so
        // refreshed tokens keep full trust (LEA-6680). With no credential, the link is all they proved.
        let authMethod = AuthMethod.MagicLink;

        if (input.socialLoginProvider && input.socialLoginJwt) {
            // An unhandled provider keeps the MagicLink default rather than claiming a credential we didn't check.
            switch (input.socialLoginProvider) {
                case UserAssociatedLoginType.GOOGLE:
                    authMethod = AuthMethod.Google;
                    break;

                case UserAssociatedLoginType.MICROSOFT:
                    authMethod = AuthMethod.Microsoft;
                    break;
            }
        } else if (input.password) {
            authMethod = AuthMethod.Password;
        }

        return this.authService.signInUser(
            user.id,
            SessionLength.Short,
            authMethod,
            this.helperService.extractUserAgentFromContext(context),
            context?.req?.ip ?? 'unknown',
            null,
            UserTrustLevel.Full
        );
    }

    @AuthorizeEndpoint()
    @Mutation(() => Boolean)
    async connectSocialAccount(
        @Args({ name: 'provider', type: () => UserAssociatedLoginType }) provider: UserAssociatedLoginType,
        @Args({ name: 'idToken', type: () => String }) idToken: string,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        return await this.authService.connectSocialAccount(userId, provider, idToken);
    }

    @AuthorizeEndpoint()
    @Mutation(() => Boolean)
    async logout(
        @Args({ name: 'refreshToken', type: () => String }) refreshToken: string,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        return this.withRefreshToken(refreshToken, async (tokenObj) => {
            if (userId !== tokenObj.sub) throw new ForbiddenException("that refresh token isn't yours!");

            await this.authService.logout(tokenObj.sub, tokenObj.jti);

            return true;
        });
    }

    @Public()
    @Mutation(() => Boolean)
    @UseGuards(GqlThrottlerGuard)
    async forgotPassword(
        @Args({ name: 'email', nullable: true }) email: string,
        @Args({ name: 'phoneNumber', nullable: true }) phoneNumber: string,
        @Context() context
    ): Promise<boolean> {
        return this.usersService.forgotPassword(
            email,
            phoneNumber,
            this.helperService.extractUserAgentFromContext(context),
            context?.req?.ip ?? 'unknown'
        );
    }

    private async withRefreshToken<T>(
        refreshToken: string,
        callback: (tokenObj: RefreshToken & JwtPayloadWithRequiredProps) => Promise<T>
    ): Promise<T> {
        return await this.authService.validate(refreshToken, RefreshToken).then(callback, (e) => {
            if (e?.name == 'TokenExpiredError') throw e;

            newrelic.noticeError(e, { caught: false, handled: false, refreshToken }, false);

            throw new UnauthorizedException('invalid refresh token');
        });
    }
}
