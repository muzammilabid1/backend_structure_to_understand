import { CanActivate, ExecutionContext, Injectable, NotImplementedException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FieldMiddleware, GqlExecutionContext, MiddlewareContext, NextFn } from '@nestjs/graphql';
import { type GraphQLResolveInfo } from 'graphql';
import _ from 'lodash';
import newrelic from 'newrelic/index';
import { LwpBuildType } from 'src/api/dtos/LwpBuildType';
import { UserType } from 'src/auth/types/UserType';

import { type FieldAuthorizer } from './auth.field.decorators';
import {
    AccessRequirement,
    type AuthResult,
    getAuthInfo,
    IS_PUBLIC_KEY,
    ObjectAuthorizer,
    OrAccess,
    REQUIRE_ACCESS_TO
} from './auth.object.decorators';
import { AuthenticatedContext } from './authentication.guard';

export const NO_AUTHORIZATION_REQUIREMENTS_SPECIFIED = `Authorization requirements must be specified for non-Public() endpoints.

If this endpoint is intended to not require any authentication or authorisation, use the @Public() decorator on the endpoint.

Exceptionally, if this endpoint genuinely needs authentication but no authorisation - i.e. any logged-in user of any user type
can access it - you may use @Authorize() with an empty list of authorizers.`;

@Injectable()
export class AuthorizationGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    static authorizeField: FieldMiddleware = async (ctx: MiddlewareContext, next: NextFn) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { info, source, context }: { info: GraphQLResolveInfo; source: any; context: AuthenticatedContext } = ctx;
        const { extensions } = info.parentType.getFields()[info.fieldName];

        if (context.auth?.userType === UserType.ADMIN) return next();

        if (extensions.authorizer && typeof extensions.authorizer === 'function') {
            const authDecision = (extensions.authorizer as FieldAuthorizer<typeof source>)({ object: source, token: context.auth });

            if (authDecision == true) {
                return next();
            } else if (authDecision) {
                return authDecision(await next());
            }
        } else {
            const message = `Unauthorised access to field ${info.fieldName} on operation ${info.operation.name.value}`;

            if (process.env.LWP_ENV === LwpBuildType.LOCAL) {
                console.error(message);
            } else {
                newrelic.noticeError(
                    new Error(message),
                    {
                        caught: true,
                        handled: false
                    },
                    false
                );
            }

            return null;
        }
    };

    /**
     * canAccessField checks whether a user can access a given field on an object
     * based on an AuthResult for that user.
     *
     * @static
     * @param {string} fieldName the field name to access
     * @param {AuthResult<unknown>} fieldsAllowed the auth result for the user
     * @return {boolean} the field auth decision
     * @memberof AuthorizationGuard
     */
    static canAccessField(fieldName: string, fieldsAllowed: AuthResult<never>): boolean {
        if (fieldsAllowed === '*') return true;
        if (!fieldsAllowed) return false;

        return fieldsAllowed.includes(fieldName);
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);

        if (isPublic) {
            return true;
        }

        const requireAccessTo = Reflect.getMetadata(REQUIRE_ACCESS_TO, context.getHandler()) as [AccessRequirement<never>];

        if (!requireAccessTo) throw new NotImplementedException(NO_AUTHORIZATION_REQUIREMENTS_SPECIFIED);

        const gqlContext = GqlExecutionContext.create(context);
        const apolloContext = gqlContext.getContext<AuthenticatedContext>();

        const makeAndStoreAuthDecision = async (
            authorize: ObjectAuthorizer<never>,
            id: string,
            authInfo: Omit<Parameters<ObjectAuthorizer<unknown>>['0'], 'id'>
        ): Promise<boolean> => {
            const authDecision = await authorize({ id, ...authInfo });

            if (!authDecision) return false;

            apolloContext.fieldAuthorizations ||= {};
            apolloContext.fieldAuthorizations[gqlContext.getInfo().parentType.name] ||= {};
            apolloContext.fieldAuthorizations[gqlContext.getInfo().parentType.name][id] = authDecision;

            return true;
        };

        const token = getAuthInfo(context);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const authorizeAccess = async (accessRequirement: AccessRequirement<never>): Promise<any> => {
            if (accessRequirement instanceof OrAccess) {
                return await accessRequirement.either(async (ar) => await authorizeAccess(ar));
            } else if (Array.isArray(accessRequirement)) {
                const [authorizer, op, idArgument, authContext] = accessRequirement;

                const baseAuthInfo = { opType: op, token, parentId: null as string };

                const authorizeForBase = async (authInfo: typeof baseAuthInfo): Promise<boolean> => {
                    if (!idArgument) return await makeAndStoreAuthDecision(authorizer.authorize, null, authInfo);

                    const args = gqlContext.getArgs<Record<string, unknown>>();

                    let id: unknown;

                    if (typeof idArgument === 'string') {
                        id = _.get(args, idArgument);
                    } else {
                        id = idArgument(args);
                    }

                    const validateId = async (id: unknown): Promise<boolean> => {
                        if (authContext?.optional && id == null) return true;

                        if (typeof id === 'number') id = id.toString();

                        if (!this.checkIDType(id))
                            throw new Error(
                                `Authorizer ID argument ${idArgument} must be an ID string in ${gqlContext.getInfo().fieldName}`
                            );

                        return await makeAndStoreAuthDecision(authorizer.authorize, id, authInfo);
                    };

                    return this.asyncEvery(Array.isArray(id) ? id : [id], validateId);
                };

                if (authContext) {
                    if (authContext.requiredTrust) {
                        if (!(token.userTrustLevel >= authContext.requiredTrust))
                            throw new UnauthorizedException('User has insufficient trust level for this operation');
                    }

                    if (authContext.parentId) {
                        const parentId = _.get(gqlContext.getArgs<Record<string, unknown>>(), authContext.parentId);

                        return this.asyncEvery(Array.isArray(parentId) ? parentId : [parentId], (p: unknown) => {
                            if (!this.checkIDType(p)) throw new Error('Authorizer parent ID argument must be a number if it is specified');

                            baseAuthInfo.parentId = p;

                            return authorizeForBase(baseAuthInfo);
                        });
                    }
                }

                return authorizeForBase(baseAuthInfo);
            }

            return await makeAndStoreAuthDecision(accessRequirement, null, { opType: null, token });
        };

        return this.asyncEvery(requireAccessTo, authorizeAccess);
    }

    /**
     * checkIdType checks that the type of {@link id} is valid
     * for an ID in the app.
     *
     * @private
     * @param {unknown} id the maybe-ID?
     * @return {(id is string)} type-check
     * @memberof AuthorizationGuard
     */
    private checkIDType(id: unknown): id is string {
        if (typeof id === 'string' && id.length > 0) return true;

        return false;
    }

    /**
     * asyncEvery returns true if every element of {@link arr}
     * meets the async {@link predicate}, or false if not.
     *
     * @private
     * @template T the type of array elements
     * @param {T[]} arr the array
     * @param {(arg0: T) => Promise<boolean>} predicate the predicate
     * @return {Promise<boolean>} true if all match, otherwise false
     * @memberof AuthorizationGuard
     */
    private async asyncEvery<T>(arr: T[], predicate: (arg0: T) => Promise<boolean>): Promise<boolean> {
        for (const item of arr) {
            if (!(await predicate(item))) return false;
        }

        return true;
    }
}
