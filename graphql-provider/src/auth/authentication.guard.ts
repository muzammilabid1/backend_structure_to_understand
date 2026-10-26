import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { IncomingMessage, ServerResponse } from 'http';
import newrelic from 'newrelic/index';
import { LogLwpAccessService } from 'src/api/service/log_lwp_access.service';

import { IS_PUBLIC_KEY } from './auth.object.decorators';
import { AuthenticationService } from './service/authentication.service';
import { AuthToken, AuthTokenJWT } from './types/AuthToken';

type ContextAuthenticationBase = {
    auth: AuthTokenJWT;
    fieldAuthorizations?: Record<string, Record<string | number, unknown>>;
};

// God only knows what concrete type this actually is. I spent about 40 minutes trying to work it out.
// By all means take a look yourself too, dear reader - but best of luck...
type ApolloGraphQLBaseContext = { req: IncomingMessage; res: ServerResponse };

export type AuthenticatedContext = ApolloGraphQLBaseContext & ContextAuthenticationBase;

@Injectable()
export class AuthenticationGuard implements CanActivate {
    constructor(
        private readonly auth: AuthenticationService,
        private reflector: Reflector,
        private logLwpAccessService: LogLwpAccessService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);

        if (isPublic) {
            return true;
        }

        // Get the header
        const gqlContext = GqlExecutionContext.create(context);

        const apolloContext = gqlContext.getContext<ApolloGraphQLBaseContext & Partial<ContextAuthenticationBase>>();

        const authHeader = apolloContext?.req?.headers?.authorization;

        if (!authHeader) {
            throw new UnauthorizedException('Authorization header not found.');
        }

        const [type, token] = authHeader.split(' ');

        if (type !== 'Bearer') {
            throw new UnauthorizedException(`Authentication type 'Bearer' required. Found '${type}'`);
        }

        const validationResult = await this.auth.validate(token, AuthToken);

        newrelic.setUserID(validationResult.sub.toString());

        const ctx = GqlExecutionContext.create(context);

        await this.logLwpAccessService.addLogLwpAccess({
            info: ctx?.getArgByIndex(3)?.variableValues,
            mutationOrQueryName: ctx?.getArgByIndex(3)?.fieldName,
            page: ctx?.getContext()?.headers?.requestedurl,
            userId: validationResult.sub
        });

        apolloContext.auth = validationResult;

        return true;
    }
}
