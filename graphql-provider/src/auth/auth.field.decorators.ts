import { Extensions } from '@nestjs/graphql';
import { UserType } from 'src/auth/types/UserType';

import { AuthTokenJWT } from './types/AuthToken';
import { UserTrustLevel } from './types/UserTrustLevel';

/**
 * A FieldAuthorizer is a function that returns true if a user is allowed to
 * access a field on a class.
 *
 * @export
 * @param {ObjectType} object the object being authorised
 * @param {AuthTokenJWT} token the token of the user involved
 * @template ObjectType the type of object against which an authorization decision is being made
 * @template FieldType the type of this field on the object
 * @return { boolean | ((thing: ObjectType) => ObjectType) } whether the field is allowed for access, or a transform to perform on it to make it allowed
 */
export interface FieldAuthorizer<ObjectType, FieldType = unknown> {
    (authOptions: { object: ObjectType; token?: AuthTokenJWT }): boolean | ((thing: FieldType) => FieldType);
}

/**
 * AuthorizeField specifies the authentication requirements for a
 * Field in the GraphQL API.
 *
 * @template T the type of object
 * @param {FieldAuthorizer<T>} fieldAuthorizer an authorizer for the field
 * @return {ReturnType<typeof Extensions>} the decorator
 */
export function AuthorizeField<T>(fieldAuthorizer: FieldAuthorizer<T>): PropertyDecorator {
    return (target: T, propertyKey?: string | symbol): void => {
        return Extensions({ authorizer: fieldAuthorizer })(target, propertyKey);
    };
}

// Field types.

export const UnrestrictedField: FieldAuthorizer<unknown> = () => true;
export const TeacherField: FieldAuthorizer<unknown> = ({ token }) => token?.userType === UserType.TEACHER;
export const AdminField: FieldAuthorizer<unknown> = ({ token }) => token?.userType === UserType.ADMIN;
export const TrustedUserField: FieldAuthorizer<unknown> = ({ token }) => token?.userTrustLevel == UserTrustLevel.Full;
