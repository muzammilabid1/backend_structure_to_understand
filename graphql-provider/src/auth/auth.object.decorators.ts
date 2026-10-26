import { createParamDecorator, CustomDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { BaseEntity } from 'typeorm';

import { AuthenticatedContext } from './authentication.guard';
import { AuthTokenJWT } from './types/AuthToken';
import { OpType } from './types/OpType';
import { UserTrustLevel } from './types/UserTrustLevel';

export const REQUIRE_ACCESS_TO = 'requireAccessTo';

/**
 * The result of the authorization decision - either false if unauthorized,
 * or a list of authorized fields if authorized. The literal '*' can be taken
 * to authorize all fields.
 */
export type AuthResult<ObjectType> = '*' | (keyof ObjectType)[] | false;

/**
 * An ObjectAuthorizer is a function that returns true if a user is allowed to perform an
 * {@link opType} action against the class.
 *
 * @export
 * @param {number | null} id the ID of the instance to authorise, or null if this is a generic check
 * @param {[number | null]} parentId the ID of the parent object if a child is being created, or null if not
 * @param {OpType} opType the type of action
 * @param {AuthTokenJWT} token the token of the user involved
 * @template ObjectType the type of object against which an authorization decision is being made
 * @return {AuthResult<ObjectType> | Promise<AuthResult<ObjectType>>} a list of fields access is allowed to if authorized, or false if not
 */
export interface ObjectAuthorizer<ObjectType> {
    (authOptions: {
        id: string | null;
        parentId?: string | null;
        opType: OpType;
        token: AuthTokenJWT;
    }): AuthResult<ObjectType> | Promise<AuthResult<ObjectType>>;
}

/**
 * An AuthorizingClass is a class that has an {@link ObjectAuthorizer}
 * function.
 *
 * @export
 * @interface AuthorizingClass
 */
export interface AuthorizingClass<T> {
    authorize: ObjectAuthorizer<T>;
}

/**
 * ActsAsAuthorizer marks a class as being capable of "authorizing" -
 * making security decisions on behalf of the app. Its argument is an authorizer
 * function for that class.
 *
 * @export
 * @template IDType the type of the ID variable for this class
 * @template AuthorizerEntity the actual entity type that we're authorising here
 * @template ConstructorRef a reference to the constructor of the authorizer entity - this is just for typing purposes.
 * @param {ObjectAuthorizer} authorizer the authorizer to use for the class
 */
export function ActsAsAuthorizer<
    AuthorizerEntity extends BaseEntity,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any is allowed for constructor references
    ConstructorRef extends { new (...args: any[]): AuthorizerEntity }
>(
    _klass: ConstructorRef,

    authorizer: ObjectAuthorizer<InstanceType<ConstructorRef>>
) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any is allowed for constructor references
    return <U extends { new (...args: any[]): AuthorizerEntity }>(constructor: U): U & AuthorizingClass<InstanceType<ConstructorRef>> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const authorize = function (...args: any[]): ReturnType<typeof authorizer> {
            return Reflect.apply(authorizer, constructor, args);
        };

        // defined as writable for jest purposes
        Object.defineProperty(constructor, 'authorize', { value: authorize, writable: true });

        return constructor as U & AuthorizingClass<InstanceType<ConstructorRef>>;
    };
}

export type AccessRequirementContext = {
    /**
     * The parameter name that contains the parent ID
     * relevant to this object, or null when not
     * applicable.
     *
     * @type {string}
     */
    parentId?: string;

    /**
     * Sets a required trust level to be able to
     * run this endpoint.
     *
     * @type {UserTrustLevel}
     */
    requiredTrust?: UserTrustLevel;

    /**
     * Allows the requirement to be optional: that is,
     * if the ID is not specified, it will *pass* rather
     * than failing.
     *
     * @type {boolean}
     */
    optional?: boolean;
};

/**
 * An array of format [the class to require access to,
 * the operation to do on that class, the parameter name
 * containing the ID(s) that this applies to (or a function that returns the relevant param)
 * or null when not applicable, and an optional extra context object.
 *
 * Or, alternatively, an authorizer that takes no ID parameter: i.e. one that can
 * always be used just based on the contents of a JWT (like AdminOnly).
 */
export type AccessRequirement<T extends BaseEntity> =
    | [AuthorizingClass<T>, OpType, string | ((args: Record<string, unknown>) => unknown) | null, AccessRequirementContext?]
    | ObjectAuthorizer<T>
    | OrAccess<T>;

/**
 * OrAccess permits specifying that one of two {@link AccessRequirement}s must be true.
 *
 * @export
 * @class OrAccess
 * @template T the entity to permit access to
 */
export class OrAccess<T extends BaseEntity> {
    private left: AccessRequirement<T>;
    private right: AccessRequirement<T>;

    constructor(left: AccessRequirement<T>, right: AccessRequirement<T>) {
        this.left = left;
        this.right = right;
    }

    /**
     * Evaluates a callback for each side of the or, and determines whether either
     * are true.
     *
     * @param {(ar: AccessRequirement<T>) => boolean} cb a callback to run for each side
     * @return {boolean} whether it is true for either side of the or
     * @memberof OrAccess
     */
    public async either(cb: (ar: AccessRequirement<T>) => Promise<boolean>): Promise<boolean> {
        return (await cb(this.left)) || (await cb(this.right));
    }
}

/**
 * @see {@link OrAccess}
 */
export function Or<T extends BaseEntity>(left: AccessRequirement<T>, right: AccessRequirement<T>): OrAccess<T> {
    return new OrAccess(left, right);
}

/**
 * AuthorizeEndpoint specifies the authentication requirements for a
 * Query or Mutation in the GraphQL API.
 *
 * @param {...[AccessRequirement]} requireAccessTo the classes to require access to, and the levels of access
 * @return {ReturnType<typeof SetMetadata>} the decorator
 */
export function AuthorizeEndpoint<T extends BaseEntity>(...requireAccessTo: AccessRequirement<T>[]): ReturnType<typeof SetMetadata> {
    return SetMetadata(REQUIRE_ACCESS_TO, requireAccessTo);
}

/**
 * AuthInfo injects authentication information to a parameter from context.
 */
export const AuthInfo = createParamDecorator((data: keyof AuthTokenJWT, ctx: ExecutionContext) => {
    const token = getAuthInfo(ctx);

    return data ? token?.[data] : token;
});

/**
 * getAuthInfo extracts an {@link AuthTokenJWT} from the
 * {@link ctx}.
 *
 * @param {ExecutionContext} ctx the context
 * @return {AuthTokenJWT} the current auth token
 */
export function getAuthInfo(ctx: ExecutionContext): AuthTokenJWT {
    return GqlExecutionContext.create(ctx).getContext<AuthenticatedContext>()?.auth;
}

export const IS_PUBLIC_KEY = 'isPublic';

export const Public = (): CustomDecorator<string> => SetMetadata(IS_PUBLIC_KEY, true);
